import { Injectable } from '@angular/core';
import { supabase } from './supabase';
import { Notification } from './notification';
import { EmailService } from './email';
import { environment } from 'src/environments/environment.prod';

export interface Reserva {
  id?: number;
  cliente_id: number;
  mesa_id: number;
  fecha_reserva: string;
  hora_reserva: string;
  cantidad_personas: number;
  estado: 'pendiente' | 'aprobada' | 'rechazada' | 'expirada' | 'completada' | 'activa';
  motivo_rechazo?: string;
  created_at?: string;
  tiempo_espera_minutos?: number;
  hora_llegada?: string;
  fecha_expiracion?: string;
  fecha_aprobacion?: string;
  mesa?: {
    numero: number;
    tipo: string;
    cantidad: number;
    id: number;
  };
  cliente?: {
    nombre: string;
    apellido: string;
    email: string;
    dni: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ReservasService {
  
  private readonly TESTING_MODE = environment.reservas.testing;
  private readonly EXPIRACION_TESTING_MINUTOS = environment.reservas.tiempoExpiracionMinutosDesdAprobacion || 1;
  private readonly ANTICIPACION_MINIMA_PRODUCCION = environment.reservas.anticipacionMinimaMinutos || 60;
  private readonly ANTICIPACION_MINIMA_TESTING = 10;
  private readonly TOLERANCIA_MINUTOS = environment.reservas.tiempoToleranciaMinutos || 45;
  private readonly VENTANA_ACTIVACION_HORAS = environment.reservas.ventanaActivacionHorasAntes || 1;

  private get ANTICIPACION_MINIMA(): number {
    return this.TESTING_MODE ? this.ANTICIPACION_MINIMA_TESTING : this.ANTICIPACION_MINIMA_PRODUCCION;
  }

  constructor(
    private notificationService: Notification, 
    private emailService: EmailService
  ) {
    console.log('🔧 ReservasService inicializado:', {
      modoTesting: this.TESTING_MODE,
      expiracionTestingMinutos: this.EXPIRACION_TESTING_MINUTOS,
      anticipacionMinima: this.ANTICIPACION_MINIMA + ' min',
      tolerancia: this.TOLERANCIA_MINUTOS + ' min',
      ventanaActivacion: this.VENTANA_ACTIVACION_HORAS + ' horas'
    });
  }

  /**
   * 🔍 Verificar que el usuario sea cliente registrado
   */
  async verificarClienteRegistrado(clienteId: number): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id_cliente, estado, user_id')
        .eq('id_cliente', clienteId)
        .single();

      if (error || !data) return false;
      return !!data.user_id && data.estado === 'aprobado';
    } catch (error) {
      console.error('Error verificando cliente registrado:', error);
      return false;
    }
  }

  /**
   * 📊 Contar reservas del cliente
   */
  async contarReservasCliente(clienteId: number): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('reservas')
        .select('*', { count: 'exact', head: true })
        .eq('cliente_id', clienteId)
        .in('estado', ['pendiente', 'aprobada', 'activa']);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error contando reservas:', error);
      return 0;
    }
  }

  /**
   * 📅 Validar que sea en tiempo futuro
   */
  private validarTiempoFuturo(fecha: string, hora: string): boolean {
    const [year, month, day] = fecha.split('-').map(Number);
    const [hours, minutes] = hora.split(':').map(Number);
    const fechaReserva = new Date(year, month - 1, day, hours, minutes, 0);
    
    const ahora = new Date();
    const minimoTiempo = new Date(ahora.getTime() + (this.ANTICIPACION_MINIMA * 60 * 1000));
    
    const esValido = fechaReserva >= minimoTiempo;
    
    if (!esValido || this.TESTING_MODE) {
      console.log('⏰ Validación tiempo futuro:', {
        modo: this.TESTING_MODE ? 'TESTING' : 'PRODUCCIÓN',
        fechaReserva: fechaReserva.toLocaleString('es-AR'),
        ahora: ahora.toLocaleString('es-AR'),
        minimoRequerido: minimoTiempo.toLocaleString('es-AR'),
        anticipacionMinutos: this.ANTICIPACION_MINIMA,
        esValido
      });
    }
    
    return esValido;
  }

  /**
   * 🔍 Validar diferentes días y horarios
   */
  async validarDiferenciaDiasHorarios(
    clienteId: number, 
    nuevaFecha: string, 
    nuevaHora: string
  ): Promise<{valido: boolean, mensaje?: string}> {
    if (this.TESTING_MODE) {
      console.log('🔥 TESTING: Saltando validación de días/horarios diferentes');
      return { valido: true };
    }
    
    try {
      const { data: reservasExistentes, error } = await supabase
        .from('reservas')
        .select('fecha_reserva, hora_reserva')
        .eq('cliente_id', clienteId)
        .in('estado', ['pendiente', 'aprobada']);

      if (error) throw error;

      if (!reservasExistentes || reservasExistentes.length === 0) {
        return { valido: true };
      }

      for (const reserva of reservasExistentes) {
        if (reserva.fecha_reserva === nuevaFecha) {
          return {
            valido: false,
            mensaje: 'Ya tienes una reserva en esta fecha. Debe ser en un día diferente.'
          };
        }

        if (reserva.hora_reserva === nuevaHora) {
          return {
            valido: false,
            mensaje: 'Ya tienes una reserva a esta hora. Debe ser en un horario diferente.'
          };
        }
      }

      return { valido: true };
    } catch (error) {
      console.error('Error validando diferencia:', error);
      return { valido: false, mensaje: 'Error al validar la reserva' };
    }
  }

  /**
   * ✅ PUNTO 24: Crear reserva con validaciones
   */
  async crearReserva(reserva: Reserva): Promise<{success: boolean, data?: any, error?: string}> {
    try {
      console.log('🔍 Validando reserva para cliente:', reserva.cliente_id);

      const esRegistrado = await this.verificarClienteRegistrado(reserva.cliente_id);
      if (!esRegistrado) {
        return { success: false, error: '❌ Solo clientes registrados pueden hacer reservas' };
      }

      if (!this.validarTiempoFuturo(reserva.fecha_reserva, reserva.hora_reserva)) {
        return {
          success: false,
          error: `❌ La reserva debe ser con mínimo ${this.ANTICIPACION_MINIMA} minutos de anticipación`
        };
      }

      const validacionDiferencia = await this.validarDiferenciaDiasHorarios(
        reserva.cliente_id,
        reserva.fecha_reserva,
        reserva.hora_reserva
      );

      if (!validacionDiferencia.valido) {
        return { success: false, error: validacionDiferencia.mensaje || 'Error de validación' };
      }

      const { data: reservasAprobadas, error: errorAprobadas } = await supabase
        .from('reservas')
        .select('*')
        .eq('mesa_id', reserva.mesa_id)
        .eq('fecha_reserva', reserva.fecha_reserva)
        .in('estado', ['aprobada', 'activa']);

      if (errorAprobadas) throw errorAprobadas;

      if (reservasAprobadas && reservasAprobadas.length > 0) {
        const [yearR, monthR, dayR] = reserva.fecha_reserva.split('-').map(Number);
        const [hoursR, minutesR] = reserva.hora_reserva.split(':').map(Number);
        const fechaReserva = new Date(yearR, monthR - 1, dayR, hoursR, minutesR, 0);
        
        for (const conflicto of reservasAprobadas) {
          const [yearC, monthC, dayC] = conflicto.fecha_reserva.split('-').map(Number);
          const [hoursC, minutesC] = conflicto.hora_reserva.split(':').map(Number);
          const horaExistente = new Date(yearC, monthC - 1, dayC, hoursC, minutesC, 0);
          
          const diferenciaHoras = Math.abs(
            (fechaReserva.getTime() - horaExistente.getTime()) / (1000 * 60 * 60)
          );
          
          if (diferenciaHoras < 2) {
            return {
              success: false,
              error: '❌ Esta mesa ya tiene una reserva APROBADA en horario cercano (menos de 2 horas)'
            };
          }
        }
      }

      const { data: conflictos, error: errorCheck } = await supabase
        .from('reservas')
        .select('*')
        .eq('mesa_id', reserva.mesa_id)
        .eq('fecha_reserva', reserva.fecha_reserva)
        .in('estado', ['pendiente']);

      if (errorCheck) throw errorCheck;

      if (conflictos && conflictos.length > 0) {
        const [yearR, monthR, dayR] = reserva.fecha_reserva.split('-').map(Number);
        const [hoursR, minutesR] = reserva.hora_reserva.split(':').map(Number);
        const fechaReserva = new Date(yearR, monthR - 1, dayR, hoursR, minutesR, 0);
        
        for (const conflicto of conflictos) {
          const [yearC, monthC, dayC] = conflicto.fecha_reserva.split('-').map(Number);
          const [hoursC, minutesC] = conflicto.hora_reserva.split(':').map(Number);
          const horaExistente = new Date(yearC, monthC - 1, dayC, hoursC, minutesC, 0);
          
          const diferenciaHoras = Math.abs(
            (fechaReserva.getTime() - horaExistente.getTime()) / (1000 * 60 * 60)
          );
          
          if (diferenciaHoras < 2) {
            return {
              success: false,
              error: '❌ Mesa con otra reserva pendiente en horario cercano (menos de 2 horas)'
            };
          }
        }
      }

      const nuevaReserva = {
        cliente_id: reserva.cliente_id,
        mesa_id: reserva.mesa_id,
        fecha_reserva: reserva.fecha_reserva,
        hora_reserva: reserva.hora_reserva,
        cantidad_personas: reserva.cantidad_personas,
        estado: 'pendiente' as const,
        tiempo_espera_minutos: this.TOLERANCIA_MINUTOS,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('reservas')
        .insert([nuevaReserva])
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Reserva creada:', data.id);
      await this.notificarNuevaReserva(data);

      const totalReservas = await this.contarReservasCliente(reserva.cliente_id);
      
      return { 
        success: true, 
        data: {
          ...data,
          totalReservas,
          cumpleRequisito: totalReservas >= 2
        }
      };
    } catch (error: any) {
      console.error('❌ Error creando reserva:', error);
      return { success: false, error: error.message || 'Error al crear la reserva' };
    }
  }

  /**
   * 📢 Notificar nueva reserva
   */
  private async notificarNuevaReserva(reserva: any) {
    try {
      const { data: cliente } = await supabase
        .from('clientes')
        .select('nombre, apellido')
        .eq('id_cliente', reserva.cliente_id)
        .single();

      const { data: mesa } = await supabase
        .from('mesas')
        .select('numero')
        .eq('id', reserva.mesa_id)
        .single();

      const mensaje = `${cliente?.nombre} ${cliente?.apellido} solicita Mesa ${mesa?.numero} para ${reserva.fecha_reserva} a las ${reserva.hora_reserva}`;

      await this.notificationService.sendNotificationToPerfil('dueño', '📅 Nueva Solicitud de Reserva', mensaje);
      await this.notificationService.sendNotificationToPerfil('supervisor', '📅 Nueva Solicitud de Reserva', mensaje);

      console.log('✅ Notificaciones push enviadas');
    } catch (error) {
      console.error('Error enviando notificaciones:', error);
    }
  }

  /**
   * ✅ PUNTO 25: Aprobar reserva - CORREGIDO DEFINITIVO
   */
  async aprobarReserva(reservaId: number): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const { data: reservaData } = await supabase
      .from('reservas')
      .select('*, cliente:clientes(nombre, apellido, email), mesa:mesas(numero)')
      .eq('id', reservaId)
      .single();

    if (!reservaData) {
      return { success: false, error: 'Reserva no encontrada' };
    }

    const ahora = new Date();
    let fechaExpiracion: Date;

    console.log('🔍 CALCULANDO EXPIRACIÓN:', {
      TESTING_MODE: this.TESTING_MODE,
      fecha_reserva: reservaData.fecha_reserva,
      hora_reserva: reservaData.hora_reserva,
      ahora: ahora.toLocaleString('es-AR')
    });

    if (this.TESTING_MODE) {
      // 🔥 TESTING: expira 1-2 minutos desde AHORA
      const minutos = this.EXPIRACION_TESTING_MINUTOS || 2;
      fechaExpiracion = new Date(ahora.getTime() + minutos * 60 * 1000);

      console.log('🔥 TESTING MODE: Expira desde AHORA', {
        ahora: ahora.toLocaleString('es-AR'),
        expiraEn: minutos + ' minutos',
        expira: fechaExpiracion.toLocaleString('es-AR'),
        expiraISO: fechaExpiracion.toISOString()
      });
    } else {
      // 🔒 PRODUCCIÓN: expira desde HORA DE RESERVA + 45 min
      const [fecha, hora] = [reservaData.fecha_reserva, reservaData.hora_reserva];
      
      // Parsear fecha YYYY-MM-DD
      const [year, month, day] = fecha.split('-').map(Number);
      
      // Parsear hora HH:MM:SS
      const horaParts = hora.split(':');
      const hours = parseInt(horaParts[0], 10);
      const minutes = parseInt(horaParts[1], 10);
      
      // 🔥 CREAR FECHA/HORA DE RESERVA EN ZONA LOCAL
      const fechaHoraReserva = new Date(year, month - 1, day, hours, minutes, 0);
      
      // 🔥 CALCULAR EXPIRACIÓN: hora_reserva + 45 minutos
      fechaExpiracion = new Date(fechaHoraReserva.getTime() + this.TOLERANCIA_MINUTOS * 60 * 1000);

      console.log('🔒 PRODUCCIÓN: Expira desde HORA RESERVA + 45 min', {
        fechaISO: fecha,
        horaISO: hora,
        fechaHoraReservaLocal: fechaHoraReserva.toLocaleString('es-AR'),
        toleranciaMinutos: this.TOLERANCIA_MINUTOS,
        expiraLocal: fechaExpiracion.toLocaleString('es-AR'),
        expiraISO: fechaExpiracion.toISOString()
      });
    }

    // Guardar en BD (se convierte automáticamente a UTC)
    const { data, error } = await supabase
      .from('reservas')
      .update({
        estado: 'aprobada',
        fecha_aprobacion: ahora.toISOString(),
        fecha_expiracion: fechaExpiracion.toISOString(),
      })
      .eq('id', reservaId)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Reserva aprobada:', reservaId);
    console.log('📅 Guardado en BD:', {
      fecha_aprobacion: ahora.toISOString(),
      fecha_expiracion: fechaExpiracion.toISOString()
    });

    // Email
    const emailEnviado = await this.emailService.enviarEmailReservaAprobada(
      {
        nombre: reservaData.cliente.nombre,
        apellido: reservaData.cliente.apellido,
        email: reservaData.cliente.email,
      },
      {
        fecha: reservaData.fecha_reserva,
        hora: reservaData.hora_reserva,
        mesa: reservaData.mesa.numero,
        personas: reservaData.cantidad_personas,
      }
    );

    console.log(emailEnviado ? '✅ Email enviado' : '❌ Email NO enviado');

    // Notificación
    const mensajeNotif = this.TESTING_MODE
      ? `[TESTING] Tu reserva expira en ${this.EXPIRACION_TESTING_MINUTOS} minuto(s)`
      : `Tu reserva para el ${reservaData.fecha_reserva} a las ${reservaData.hora_reserva} ha sido aprobada`;

    await this.notificationService.sendNotificationToCliente(
      '✅ Reserva Aprobada',
      mensajeNotif,
      '',
      reservaData.cliente_id
    );

    return { success: true, data };
  } catch (error: any) {
    console.error('❌ Error aprobando reserva:', error);
    return { success: false, error: error.message };
  }
}

  /**
   * ❌ Rechazar reserva
   */
  async rechazarReserva(reservaId: number, motivo: string): Promise<{success: boolean, error?: string}> {
    try {
      const { data: reservaData } = await supabase
        .from('reservas')
        .select('*, cliente:clientes(nombre, apellido, email), mesa:mesas(numero)')
        .eq('id', reservaId)
        .single();

      if (!reservaData) {
        return { success: false, error: 'Reserva no encontrada' };
      }

      const { error } = await supabase
        .from('reservas')
        .update({ estado: 'rechazada', motivo_rechazo: motivo })
        .eq('id', reservaId);

      if (error) throw error;

      try {
        await this.emailService.enviarEmailReservaRechazada(
          {
            nombre: reservaData.cliente.nombre,
            apellido: reservaData.cliente.apellido,
            email: reservaData.cliente.email
          },
          {
            fecha: reservaData.fecha_reserva,
            hora: reservaData.hora_reserva,
            mesa: reservaData.mesa.numero,
            personas: reservaData.cantidad_personas
          },
          motivo
        );
        console.log('📧 Email de rechazo enviado');
      } catch (emailError) {
        console.error('❌ Error enviando email:', emailError);
      }

      await this.notificationService.sendNotificationToCliente(
        '❌ Reserva Rechazada',
        `Tu reserva fue rechazada. Motivo: ${motivo}`,
        '',
        reservaData.cliente_id
      );

      return { success: true };
    } catch (error: any) {
      console.error('Error rechazando reserva:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 🎯 Obtener reserva activa - CORREGIDO ZONA HORARIA
   */
  async getReservaActivaHoy(clienteId: number): Promise<Reserva | null> {
    try {
      const ahora = new Date();
      const year = ahora.getFullYear();
      const month = String(ahora.getMonth() + 1).padStart(2, '0');
      const day = String(ahora.getDate()).padStart(2, '0');
      const hoy = `${year}-${month}-${day}`;
      
      console.log('🔍 Buscando reserva activa:', {
        clienteId,
        fechaCalculada: hoy,
        fechaHoraCompleta: ahora.toLocaleString('es-AR'),
        modo: this.TESTING_MODE ? 'TESTING' : 'PRODUCCIÓN'
      });

      let query = supabase
        .from('reservas')
        .select(`*, mesa:mesas(numero, tipo, cantidad, id)`)
        .eq('cliente_id', clienteId)
        .eq('estado', 'aprobada')
        .order('fecha_aprobacion', { ascending: false });
      
      if (!this.TESTING_MODE) {
        query = query.eq('fecha_reserva', hoy);
        console.log('🔒 PRODUCCIÓN: Filtrando reservas de hoy:', hoy);
      } else {
        console.log('🔥 TESTING: Buscando reservas de cualquier día');
      }
      
      const { data, error } = await query.limit(1).maybeSingle();

      if (error) {
        console.error('❌ Error buscando reserva activa:', error);
        return null;
      }

      if (!data) {
        console.log('❌ No hay reserva activa para la fecha:', hoy);
        return null;
      }

      const numeroMesa = data.mesa?.numero || data.mesa_id || 'N/A';
      
      console.log('✅ Reserva encontrada:', {
        id: data.id,
        fecha_reserva: data.fecha_reserva,
        hora_reserva: data.hora_reserva,
        mesa_id: data.mesa_id,
        mesa_numero: numeroMesa
      });

      if (data.fecha_expiracion) {
        const fechaExpiracion = new Date(data.fecha_expiracion);
        const tiempoRestanteMs = fechaExpiracion.getTime() - ahora.getTime();
        const tiempoRestanteSeg = Math.round(tiempoRestanteMs / 1000);
        
        console.log('⏰ Validando expiración:', {
          ahora: ahora.toLocaleString('es-AR'),
          fechaExpiracion: fechaExpiracion.toLocaleString('es-AR'),
          tiempoRestanteSegundos: tiempoRestanteSeg,
          tiempoRestanteMinutos: Math.round(tiempoRestanteSeg / 60),
          expirada: tiempoRestanteMs <= 0
        });
        
        if (tiempoRestanteMs <= 0) {
          console.log('⏰ Reserva expirada, auto-expirando...');
          await this.expirarReserva(data.id);
          return null;
        }
        
        console.log(`✅ Reserva válida - ${Math.round(tiempoRestanteSeg / 60)} minuto(s) restantes`);
      }

      return data;
    } catch (error) {
      console.error('❌ Error en getReservaActivaHoy:', error);
      return null;
    }
  }

  /**
   * 🔔 Activar reserva y asignar mesa
   */
  async activarReservaYAsignarMesa(reservaId: number): Promise<{success: boolean, data?: any, error?: string}> {
    try {
      const { data: reserva, error: errorReserva } = await supabase
        .from('reservas')
        .select('*')
        .eq('id', reservaId)
        .single();

      if (errorReserva || !reserva) {
        return { success: false, error: 'Reserva no encontrada' };
      }

      if (reserva.estado !== 'aprobada') {
        return { success: false, error: 'La reserva debe estar aprobada' };
      }

      if (reserva.fecha_expiracion) {
        const ahora = new Date();
        const fechaExpiracion = new Date(reserva.fecha_expiracion);
        const tiempoRestanteMs = fechaExpiracion.getTime() - ahora.getTime();
        
        if (tiempoRestanteMs <= 0) {
          await this.expirarReserva(reservaId);
          return { success: false, error: `Reserva expirada` };
        }
      }

      const { error: errorUpdate } = await supabase
        .from('reservas')
        .update({ estado: 'activa', hora_llegada: new Date().toISOString() })
        .eq('id', reservaId);

      if (errorUpdate) throw errorUpdate;

      const { error: errorCliente } = await supabase
        .from('clientes')
        .update({ mesa_asignada: reserva.mesa_id })
        .eq('id_cliente', reserva.cliente_id);

      if (errorCliente) throw errorCliente;

      const { error: errorMesa } = await supabase
        .from('mesas')
        .update({ cliente_asignado: reserva.cliente_id, disponible: false })
        .eq('id', reserva.mesa_id);

      if (errorMesa) throw errorMesa;

      console.log('✅ Reserva activada y mesa asignada');

      return { 
        success: true, 
        data: {
          reserva_id: reservaId,
          mesa_id: reserva.mesa_id,
          cliente_id: reserva.cliente_id,
          mesa_verificada: true
        }
      };
    } catch (error: any) {
      console.error('❌ Error activando reserva:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ⏰ Expirar reserva
   */
  async expirarReserva(reservaId: number) {
    try {
      const { error } = await supabase
        .from('reservas')
        .update({ estado: 'expirada' })
        .eq('id', reservaId);

      if (error) throw error;
      console.log(`🕐 Reserva ${reservaId} marcada como expirada`);
      return { success: true };
    } catch (error) {
      console.error(`Error expirando reserva ${reservaId}:`, error);
      return { success: false };
    }
  }

  /**
   * 🔄 Verificar y expirar reservas vencidas
   */
  async verificarReservasExpiradas(): Promise<number> {
    try {
      const ahora = new Date();
      
      const { data: reservas, error } = await supabase
        .from('reservas')
        .select('*')
        .eq('estado', 'aprobada');

      if (error) throw error;

      let expiradas = 0;

      for (const reserva of reservas || []) {
        if (reserva.fecha_expiracion) {
          const fechaExpiracion = new Date(reserva.fecha_expiracion);
          const tiempoRestanteMs = fechaExpiracion.getTime() - ahora.getTime();
          const tiempoRestanteMin = Math.round(tiempoRestanteMs / (1000 * 60));
              
          if (tiempoRestanteMs <= 0) {
            console.log(`⏰ Expirando reserva ${reserva.id} (expirada hace ${Math.abs(tiempoRestanteMin)} min)`);
            await this.expirarReserva(reserva.id);
            expiradas++;
          }
        }
      }

      if (expiradas > 0) {
        console.log(`✅ ${expiradas} reserva(s) expirada(s)`);
      }

      return expiradas;
    } catch (error) {
      console.error('Error verificando reservas expiradas:', error);
      return 0;
    }
  }

  async verificarMesaReservada(mesaId: number, fecha: string, hora: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('reservas')
        .select('*')
        .eq('mesa_id', mesaId)
        .eq('fecha_reserva', fecha)
        .in('estado', ['aprobada', 'activa']);

      if (error) throw error;
      if (!data || data.length === 0) return false;

      const [yearR, monthR, dayR] = fecha.split('-').map(Number);
      const [hoursR, minutesR] = hora.split(':').map(Number);
      const horaRequerida = new Date(yearR, monthR - 1, dayR, hoursR, minutesR, 0);
      
      for (const reserva of data) {
        const [yearC, monthC, dayC] = reserva.fecha_reserva.split('-').map(Number);
        const [hoursC, minutesC] = reserva.hora_reserva.split(':').map(Number);
        const horaReserva = new Date(yearC, monthC - 1, dayC, hoursC, minutesC, 0);
        
        const diferenciaHoras = Math.abs(
          (horaRequerida.getTime() - horaReserva.getTime()) / (1000 * 60 * 60)
        );
        
        if (diferenciaHoras < 2) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error verificando mesa reservada:', error);
      return false;
    }
  }
  /**
   * 📋 Obtener reservas del cliente
   */
  async getReservasCliente(clienteId: number) {
    try {
      const { data, error } = await supabase
        .from('reservas')
        .select(`*, mesa:mesas(numero, tipo, cantidad)`)
        .eq('cliente_id', clienteId)
        .order('fecha_reserva', { ascending: false })
        .order('hora_reserva', { ascending: false });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error: any) {
      console.error('Error obteniendo reservas:', error);
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * 📊 Obtener todas las reservas (Admin)
   */
  async getAllReservas() {
    try {
      const { data, error } = await supabase
        .from('reservas')
        .select(`*, mesa:mesas(numero, tipo, cantidad), cliente:clientes(nombre, apellido, email, dni)`)
        .order('fecha_reserva', { ascending: false })
        .order('hora_reserva', { ascending: false });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error: any) {
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * 📊 Obtener reservas pendientes
   */
  async getReservasPendientes() {
    try {
      const { data, error } = await supabase
        .from('reservas')
        .select(`*, mesa:mesas(numero, tipo, cantidad), cliente:clientes(nombre, apellido, email, dni)`)
        .eq('estado', 'pendiente')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error: any) {
      return { success: false, error: error.message, data: [] };
    }
  }
}