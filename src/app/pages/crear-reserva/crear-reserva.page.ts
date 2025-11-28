import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastController, AlertController, IonModal } from '@ionic/angular';
import { ReservasService } from '../../services/reservas.service';
import { AuthService } from '../../services/supabase';
import { supabase } from '../../services/supabase';
import { environment } from 'src/environments/environment.prod';


@Component({
  selector: 'app-crear-reserva',
  templateUrl: './crear-reserva.page.html',
  styleUrls: ['./crear-reserva.page.scss'],
  standalone: false
})
export class CrearReservaPage implements OnInit {
  @ViewChild('modalFecha') modalFecha!: IonModal;
  @ViewChild('modalHora') modalHora!: IonModal;
  
  reservaForm: FormGroup;
  mesasDisponibles: any[] = [];
  mesasBuscadas = false;
  cargando = false;
  clienteId: number | null = null;
  totalReservasActuales: number = 0;

  // ✅ FECHA MÍNIMA: HOY (no mañana)
  fechaMinima: string;
  fechaMaxima: string;
  
  // ✅ Horarios dinámicos según fecha seleccionada
  horariosDisponibles: { hora: number; minuto: number }[] = [];

  // Variables para controlar los modales
  mostrarModalFecha = false;
  mostrarModalHora = false;
  
  // Variables para mostrar valores seleccionados
  fechaSeleccionadaTexto = '';
  horaSeleccionadaTexto = '';
  
  horaSeleccionada: { hora: number; minuto: number } | null = null;
  
  // Valores temporales mientras el usuario selecciona
  fechaTemporal: string | null = null;
  horaTemporal: string | null = null;

  // Información de modo testing
  // En el constructor, después de inicializar fechas:
  modoTesting = environment.reservas.testing;
  tiempoTolerancia = environment.reservas.tiempoToleranciaMinutos;
  tiempoExpiracion = environment.reservas.tiempoExpiracionMinutosDesdAprobacion; 
  anticipacionMinima = environment.reservas.testing ? 10 : environment.reservas.anticipacionMinimaMinutos;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private toastController: ToastController,
    private alertController: AlertController,
    private reservasService: ReservasService,
    private authService: AuthService
  ) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); 
    this.fechaMinima = hoy.toISOString();

    const maxima = new Date();
    maxima.setMonth(maxima.getMonth() + 3);
    this.fechaMaxima = maxima.toISOString();

  this.reservaForm = this.formBuilder.group({
    fecha: ['', Validators.required],
    hora: ['', Validators.required],
    cantidadPersonas: [2, [Validators.required, Validators.min(1), Validators.max(12)]],
    mesaId: ['', Validators.required]
  });
  }

  async ngOnInit() {
    console.log('📅 [CREAR-RESERVA] Página cargada');
    
    if (this.modoTesting) {
      console.log('🔴 MODO TESTING ACTIVADO', {
        tolerancia: this.tiempoTolerancia + ' min',
        anticipacionMinima: this.anticipacionMinima + ' minutos',
        permiteSameDayReservas: true
      });
      
      await this.showToast(
        `⚠️ TESTING: Anticipación ${this.anticipacionMinima} min`,
        'warning'
      );
    }
    
    await this.cargarClienteId();
    
    if (this.clienteId) {
      await this.cargarTotalReservas();
    }
  }

  // MÉTODOS PARA MANEJAR MODAL DE FECHA
  abrirModalFecha() {
    console.log('📅 Abriendo modal de fecha');
    this.mostrarModalFecha = true;
  }

  cerrarModalFecha() {
    console.log('📅 Cerrando modal de fecha');
    this.mostrarModalFecha = false;
  }

  onFechaChange(event: any) {
    console.log('📅 Fecha cambiada:', event.detail.value);
    this.fechaTemporal = event.detail.value;
  }

  confirmarFecha() {
    if (this.fechaTemporal) {
      const fecha = new Date(this.fechaTemporal);
      this.fechaSeleccionadaTexto = fecha.toLocaleDateString('es-AR', {
        weekday: 'short',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      this.reservaForm.patchValue({ fecha: this.fechaTemporal });
      console.log('✅ Fecha confirmada:', this.fechaTemporal);
      
      // ✅ ACTUALIZAR HORARIOS DISPONIBLES SEGÚN FECHA
      this.actualizarHorariosDisponibles(this.fechaTemporal);
      
      this.cerrarModalFecha();
      this.showToast('Fecha seleccionada correctamente', 'success');
    } else {
      this.showToast('Por favor selecciona una fecha', 'warning');
    }
  }

  /**
   * ✅ NUEVO: Calcular horarios disponibles según fecha seleccionada
   */
  actualizarHorariosDisponibles(fechaISO: string) {
  const fechaSeleccionada = new Date(fechaISO);
  const hoy = new Date();
  
  fechaSeleccionada.setHours(0, 0, 0, 0);
  hoy.setHours(0, 0, 0, 0);
  
  const esMismoDia = fechaSeleccionada.getTime() === hoy.getTime();
  
  console.log('🕐 Actualizando horarios:', {
    fechaSeleccionada: fechaSeleccionada.toISOString(),
    hoy: hoy.toISOString(),
    esMismoDia,
    anticipacionMinima: this.anticipacionMinima
  });

  const todosLosHorarios = this.generarTodosLosHorarios();
  
  if (!esMismoDia) {
    this.horariosDisponibles = todosLosHorarios;
    console.log('📅 Día futuro - Todos los horarios disponibles:', this.horariosDisponibles.length);
    return;
  }
  
  // 🔥 MISMO DÍA: Filtrar desde AHORA + anticipación
  const ahora = new Date();
  const tiempoMinimo = new Date(ahora.getTime() + (this.anticipacionMinima * 60 * 1000));
  
  console.log('⏰ Filtrado para hoy:', {
    ahora: `${ahora.getHours()}:${ahora.getMinutes()}`,
    minimoPermitido: `${tiempoMinimo.getHours()}:${tiempoMinimo.getMinutes()}`,
    anticipacionMinutos: this.anticipacionMinima
  });
  
  this.horariosDisponibles = todosLosHorarios.filter(horario => {
    const horaComparar = new Date();
    horaComparar.setHours(horario.hora, horario.minuto, 0, 0);
    
    return horaComparar >= tiempoMinimo;
  });
  
  console.log('✅ Horarios disponibles:', this.horariosDisponibles.length);
  
  if (this.horariosDisponibles.length === 0) {
    this.showToast('⚠️ No hay horarios disponibles. Prueba mañana.', 'warning');
  }
}

/**
 * ✅ Generar TODOS los horarios (incluyendo ahora)
 */
generarTodosLosHorarios(): { hora: number; minuto: number }[] {
  const horarios: { hora: number; minuto: number }[] = [];
  
  // 🔥 DESDE HORA 0 HASTA 23:30
  for (let hora = 0; hora <= 23; hora++) {
    horarios.push({ hora, minuto: 0 });
    horarios.push({ hora, minuto: 30 });
  }
  
  return horarios;
}

  // MÉTODOS PARA MANEJAR MODAL DE HORA
  abrirModalHora() {
    if (!this.reservaForm.get('fecha')?.value) {
      this.showToast('⚠️ Primero selecciona una fecha', 'warning');
      return;
    }
    
    if (this.horariosDisponibles.length === 0) {
      this.showToast('⚠️ No hay horarios disponibles para la fecha seleccionada', 'warning');
      return;
    }
    
    console.log('🕐 Abriendo modal de hora');
    this.horaSeleccionada = null;
    this.mostrarModalHora = true;
  }

  cerrarModalHora() {
    console.log('🕐 Cerrando modal de hora');
    this.mostrarModalHora = false;
  }

  /**
   * Formatear hora con minutos
   */
  formatearHoraDisplay(horario: { hora: number; minuto: number }): string {
    return `${horario.hora.toString().padStart(2, '0')}:${horario.minuto.toString().padStart(2, '0')}`;
  }

  /**
   * Confirmar hora seleccionada
   */
  confirmarHora() {
    if (this.horaSeleccionada !== null) {
      // Crear fecha con la hora y minutos seleccionados
      const ahora = new Date();
      ahora.setHours(this.horaSeleccionada.hora, this.horaSeleccionada.minuto, 0, 0);
      
      this.horaTemporal = ahora.toISOString();
      this.horaSeleccionadaTexto = this.formatearHoraDisplay(this.horaSeleccionada);
      
      this.reservaForm.patchValue({ hora: this.horaTemporal });
      
      console.log('✅ Hora confirmada:', {
        hora: this.horaSeleccionada.hora,
        minuto: this.horaSeleccionada.minuto,
        horaISO: this.horaTemporal,
        horaTexto: this.horaSeleccionadaTexto
      });
      
      this.cerrarModalHora();
      this.showToast(`Hora seleccionada: ${this.horaSeleccionadaTexto}`, 'success');
    } else {
      this.showToast('Por favor selecciona una hora', 'warning');
    }
  }

  async cargarClienteId() {
    try {
      const user = await this.authService.getCurrentUser();
      
      if (!user) {
        this.showToast('Debes iniciar sesión para hacer una reserva', 'danger');
        this.router.navigate(['/login']);
        return;
      }

      const cliente = await this.authService.getClienteByUserId(user.id);
      
      if (!cliente) {
        this.showToast('No se encontró información del cliente', 'danger');
        return;
      }

      this.clienteId = cliente.id_cliente;
      console.log('✅ Cliente ID cargado:', this.clienteId);

    } catch (error) {
      console.error('Error cargando cliente:', error);
      this.showToast('Error al cargar datos del usuario', 'danger');
    }
  }

  async cargarTotalReservas() {
    if (!this.clienteId) return;

    try {
      this.totalReservasActuales = await this.reservasService.contarReservasCliente(this.clienteId);
      console.log('📊 Total de reservas actuales:', this.totalReservasActuales);
    } catch (error) {
      console.error('Error cargando total de reservas:', error);
    }
  }

  async cargarMesasDisponibles() {
  try {
    const fecha = this.reservaForm.get('fecha')?.value;
    const hora = this.reservaForm.get('hora')?.value;
    const cantidadPersonas = this.reservaForm.get('cantidadPersonas')?.value;

    if (!fecha || !hora) {
      this.showToast('Selecciona fecha y hora primero', 'warning');
      return;
    }

    this.cargando = true;
    this.mesasBuscadas = true;

    const fechaDate = new Date(fecha);
    const horaDate = new Date(hora);
    
    const fechaStr = fechaDate.toISOString().split('T')[0];
    const horaStr = `${horaDate.getHours().toString().padStart(2, '0')}:${horaDate.getMinutes().toString().padStart(2, '0')}`;

    console.log('🔍 Buscando mesas para:', { fechaStr, horaStr, cantidadPersonas });

    // 1️⃣ Obtener TODAS las mesas con capacidad suficiente
    const { data: todasMesas, error: errorMesas } = await supabase
      .from('mesas')
      .select('*')
      .gte('cantidad', cantidadPersonas)
      .order('numero', { ascending: true });

    if (errorMesas) throw errorMesas;

    // 2️⃣ 🔥 NUEVO: Obtener reservas APROBADAS y ACTIVAS (tienen prioridad absoluta)
    const { data: reservasAprobadas, error: errorAprobadas } = await supabase
      .from('reservas')
      .select('*')
      .eq('fecha_reserva', fechaStr)
      .in('estado', ['aprobada', 'activa']);

    if (errorAprobadas) throw errorAprobadas;

    // 3️⃣ Obtener reservas PENDIENTES (también bloquean temporalmente)
    const { data: reservasPendientes, error: errorPendientes } = await supabase
      .from('reservas')
      .select('*')
      .eq('fecha_reserva', fechaStr)
      .eq('estado', 'pendiente');

    if (errorPendientes) throw errorPendientes;

    const todasReservasExistentes = [
      ...(reservasAprobadas || []),
      ...(reservasPendientes || [])
    ];

    console.log('📋 Reservas encontradas:', {
      aprobadas: reservasAprobadas?.length || 0,
      pendientes: reservasPendientes?.length || 0,
      total: todasReservasExistentes.length
    });

    // 4️⃣ Filtrar mesas disponibles
    this.mesasDisponibles = (todasMesas || []).filter(mesa => {
      // Verificar si esta mesa tiene conflictos
      const tieneConflicto = todasReservasExistentes.some(reserva => {
        if (reserva.mesa_id !== mesa.id) return false;

        const horaReserva = new Date(`${reserva.fecha_reserva}T${reserva.hora_reserva}`);
        const horaSolicitada = new Date(`${fechaStr}T${horaStr}`);
        
        const diferenciaHoras = Math.abs(
          (horaSolicitada.getTime() - horaReserva.getTime()) / (1000 * 60 * 60)
        );

        const hayConflicto = diferenciaHoras < 2;
        
        if (hayConflicto) {
          console.log(`🚫 Mesa ${mesa.numero} tiene conflicto:`, {
            horaReserva: horaReserva.toLocaleString('es-AR'),
            horaSolicitada: horaSolicitada.toLocaleString('es-AR'),
            diferenciaHoras: diferenciaHoras.toFixed(2),
            estadoReserva: reserva.estado
          });
        }

        return hayConflicto;
      });

      return !tieneConflicto;
    });

    console.log('✅ Mesas disponibles después de filtrar:', {
      total: this.mesasDisponibles.length,
      mesas: this.mesasDisponibles.map(m => `Mesa ${m.numero}`)
    });

    if (this.mesasDisponibles.length === 0) {
      this.showToast('❌ No hay mesas disponibles para este horario', 'warning');
    } else {
      this.showToast(`✅ ${this.mesasDisponibles.length} mesa(s) disponible(s)`, 'success');
    }

  } catch (error) {
    console.error('Error cargando mesas:', error);
    this.showToast('Error al buscar mesas disponibles', 'danger');
  } finally {
    this.cargando = false;
  }
}

  async crearReserva() {
    if (this.reservaForm.invalid) {
      this.showToast('Completa todos los campos', 'warning');
      return;
    }

    if (!this.clienteId) {
      this.showToast('Error: No se pudo identificar al cliente', 'danger');
      return;
    }

    const esRegistrado = await this.reservasService.verificarClienteRegistrado(this.clienteId);
    
    if (!esRegistrado) {
      await this.showAlertError(
        'Solo Clientes Registrados',
        'Las reservas solo están disponibles para clientes registrados.'
      );
      return;
    }

    let mensajeAdicional = '';
    if (this.modoTesting) {
      mensajeAdicional = `⚠️ MODO TESTING Tolerancia: ${this.tiempoTolerancia} minutos`;
    }

    const htmlMessage = `
        ¿Deseas solicitar esta reserva?
        Fecha: ${this.fechaSeleccionadaTexto}
        Hora: ${this.horaSeleccionadaTexto}
        Mesa: ${this.getMesaSeleccionada()?.numero}
        Personas: ${this.reservaForm.value.cantidadPersonas}
        Recuerda: Debes hacer al menos 2 reservas en días y horarios diferentes.
        ${mensajeAdicional}
      `

    const alert = await this.alertController.create({
      header: 'Confirmar Reserva',
      message: htmlMessage,
      cssClass: 'custom-html-alert',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Confirmar',
          handler: async () => {
            await this.procesarReserva();
          }
        }
      ]
    });

    await alert.present();
  }

  private async procesarReserva() {
    try {
      this.cargando = true;

      const formValue = this.reservaForm.value;
      
      const fechaDate = new Date(formValue.fecha);
      const horaDate = new Date(formValue.hora);
      
      const fechaStr = fechaDate.toISOString().split('T')[0];
      const horaStr = `${horaDate.getHours().toString().padStart(2, '0')}:${horaDate.getMinutes().toString().padStart(2, '0')}`;
      
      console.log('⏰ Hora formateada:', horaStr);

      const nuevaReserva = {
        cliente_id: this.clienteId!,
        mesa_id: formValue.mesaId,
        fecha_reserva: fechaStr,
        hora_reserva: horaStr,
        cantidad_personas: formValue.cantidadPersonas,
        estado: 'pendiente' as const,
        tiempo_espera_minutos: this.tiempoTolerancia
      };

      console.log('📝 Creando reserva:', nuevaReserva);

      const resultado = await this.reservasService.crearReserva(nuevaReserva);

      if (resultado.success) {
        const totalReservas = resultado.data.totalReservas || 0;
        const cumpleRequisito = totalReservas >= 2;

        this.showToast('✅ Reserva solicitada correctamente', 'success');
        
        let mensajeTesting = '';
        if (this.modoTesting) {
          mensajeTesting = `⚠️ TESTING: Tolerancia ${this.tiempoTolerancia} min`;
        }

        const mensajeReservas = cumpleRequisito
          ? `Ya tienes ${totalReservas} reservas. ¡Cumples con el requisito!`
          : `Tienes ${totalReservas} reserva(s). Necesitas al menos 2 reservas en días y horarios diferentes.`;

        const alert = await this.alertController.create({
          header: cumpleRequisito ? '✅ Reserva Completada' : '⏳ Reserva Registrada',
          message: `
            Tu reserva ha sido registrada correctamente.
            ${mensajeReservas}
            El personal del restaurante revisará y aprobará tu reserva. Recibirás un email de confirmación.
            ${mensajeTesting}
          `,
          cssClass: 'custom-html-alert',
          buttons: ['Entendido']
        });
        await alert.present();

        setTimeout(() => {
          this.router.navigate(['/home-cliente']);
        }, 2000);

      } else {
        await this.showAlertError('Error en la Reserva', resultado.error || 'Error desconocido');
      }

    } catch (error) {
      console.error('Error procesando reserva:', error);
      this.showToast('Error al procesar la reserva', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  private getMesaSeleccionada() {
    const mesaId = this.reservaForm.get('mesaId')?.value;
    return this.mesasDisponibles.find(m => m.id === mesaId);
  }

  private async showAlertError(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['Entendido'],
      cssClass: 'alert-danger'
    });
    await alert.present();
  }

  cancelar() {
    this.router.navigate(['/home-cliente']);
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning' | 'medium') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}