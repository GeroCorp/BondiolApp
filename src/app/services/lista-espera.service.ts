import { Injectable } from '@angular/core';
import { supabase } from './supabase';
import { ClienteService } from './cliente.service';
import { Notification } from './notification';
import { TipoClienteService } from './tipo-cliente.service';

export interface ClienteEspera {
  id?: number;
  nombre_cliente: string;
  estado: 'esperando' | 'llamado' | 'asignado' | 'ausente' | 'cancelado';
  cantidad_personas: number;
  mesa_asignada?: number;
  created_at?: string;
}

interface ListaEsperaEntry {
  id: number;
  nombre_cliente: string;
  estado: string;
  cantidad_personas: number;
  mesa_asignada?: number;
  created_at: string;
  id_cliente: number | null;
  id_invitado: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class ListaEsperaService {

  constructor(
    private clienteService: ClienteService,
    private notificationService: Notification,
    private tipoClienteService: TipoClienteService
  ) { }

  /**
   * Agregar cliente a la lista de espera
   */
  async agregarClienteEspera(datosCliente: {
    nombre_cliente: string; // Cambiar de 'nombre' a 'nombre_cliente'
    cantidad_personas: number;
  }) {
    const isAnonimo = this.tipoClienteService.isAnonimo();
    let clientId  = await this.tipoClienteService.getClienteId();
    console.log('Cliente ID:', clientId, "Es anonimo?", isAnonimo);
    
    try {
      const columna_id = isAnonimo ? 'id_invitado' : 'id_cliente'; 
      const nuevoCliente = {
        nombre_cliente: datosCliente.nombre_cliente,
        cantidad_personas: datosCliente.cantidad_personas,
        estado: 'esperando',
        created_at: new Date().toISOString(),
        [columna_id]: clientId
      };

      const { data, error } = await supabase
        .from('lista_espera')
        .insert([nuevoCliente])
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: data,
        mensaje: `Cliente agregado a la lista de espera.`,
      };
    } catch (error) {
      console.error('Error al agregar cliente a lista de espera:', error);
      return {
        success: false,
        error: error,
        mensaje: 'Error al agregar cliente a la lista de espera'
      };
    }
  }

  /**
   * Obtener lista de espera actual
   */
  async getListaEspera(): Promise<ClienteEspera[]> {
    try {
      const { data, error } = await supabase
        .from('lista_espera')
        .select('*')
        .in('estado', ['esperando', 'llamado'])
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];

    } catch (error) {
      console.error('Error al obtener lista de espera:', error);
      return [];
    }
  }

  /**
   * Llamar al siguiente cliente
   */
  async llamarSiguienteCliente(): Promise<ClienteEspera | null> {
    try {
      // Buscar el primer cliente en espera
      const { data: clienteEspera, error } = await supabase
        .from('lista_espera')
        .select('*')
        .eq('estado', 'esperando')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error || !clienteEspera) return null;

      // Actualizar estado a 'llamado'
      const { data: clienteActualizado, error: errorUpdate } = await supabase
        .from('lista_espera')
        .update({ 
          estado: 'llamado'
        })
        .eq('id', clienteEspera.id)
        .select()
        .single();

      if (errorUpdate) throw errorUpdate;

      return clienteActualizado;

    } catch (error) {
      console.error('Error al llamar siguiente cliente:', error);
      return null;
    }
  }

  /**
   * Asignar mesa a cliente de lista de espera
   */
  async asignarMesaListaEspera(clienteId: number, mesaId: number): Promise<boolean> {
  try {
    // Obtener datos del cliente de la lista de espera
    const clienteEspera = await this.getClientePorId(clienteId);
    if (!clienteEspera) {
      console.error('Cliente no encontrado en lista de espera');
      return false;
    }
        // Obtener número de mesa
    const { data: mesa, error: mesaError } = await supabase
      .from('mesas')
      .select('numero')
      .eq('id', mesaId)
      .single();

    if (mesaError) throw mesaError;

    // Actualizar la lista de espera
    const { error } = await supabase
      .from('lista_espera')
      .update({ 
        estado: 'asignado',
        mesa_asignada: mesa.numero
      })
      .eq('id', clienteId);

    if (error) throw error;

    // ✅ NUEVO: Buscar si es un cliente anónimo
    const { data: clienteAnonimo, error: errorAnonimo } = await supabase
      .from('clientes_anonimos')
      .select('id_clienteanonimo')
      .ilike('nombre', clienteEspera.nombre_cliente.trim())
      .eq('en_espera', true)
      .is('mesa_asignada', null)
      .maybeSingle();

    if (!errorAnonimo && clienteAnonimo) {
      console.log('✅ Cliente anónimo encontrado:', clienteAnonimo.id_clienteanonimo);
      
      // Actualizar clientes_anonimos
      const { error: errorUpdateAnonimo } = await supabase
        .from('clientes_anonimos')
        .update({
          mesa_asignada: mesa.numero,
          en_espera: false,
          fecha_asignacion: new Date().toISOString()
        })
        .eq('id_clienteanonimo', clienteAnonimo.id_clienteanonimo);

      if (errorUpdateAnonimo) {
        console.error('Error actualizando cliente anónimo:', errorUpdateAnonimo);
      } else {
        console.log('✅ Cliente anónimo actualizado con mesa asignada');
      }

      // Actualizar la mesa
      const { error: errorMesa } = await supabase
        .from('mesas')
        .update({
          cliente_asignado: clienteAnonimo.id_clienteanonimo,
          disponible: false
        })
        .eq('id', mesaId);

      if (errorMesa) {
        console.error('Error actualizando mesa:', errorMesa);
      } else {
        console.log('✅ Mesa actualizada como ocupada');
      }

      return true;
    }

    // Si no es anónimo, buscar cliente registrado (código original)
    const nombreCompleto = clienteEspera.nombre_cliente.trim();
    const partesNombre = nombreCompleto.split(' ');
    
    let clientesEncontrados: any[] = [];

    if (partesNombre.length >= 2) {
      const { data } = await supabase
        .from('clientes')
        .select('id_cliente, nombre, apellido')
        .ilike('nombre', partesNombre[0])
        .ilike('apellido', partesNombre[1]);
      
      if (data && data.length > 0) {
        clientesEncontrados = data;
      }
    }

    if (clientesEncontrados.length === 0) {
      const { data } = await supabase
        .from('clientes')
        .select('id_cliente, nombre, apellido')
        .ilike('nombre', `%${partesNombre[0]}%`);
      
      clientesEncontrados = data || [];
    }

    if (clientesEncontrados && clientesEncontrados.length > 0) {
      const clienteEncontrado = clientesEncontrados[0];
      
      try {
        await this.clienteService.setMesa(clienteEncontrado.id_cliente, mesaId);
        console.log(`✅ Mesa ${mesa.numero} asignada a cliente registrado: ${clienteEncontrado.nombre} ${clienteEncontrado.apellido}`);
      } catch (errorAsignacion) {
        console.error('❌ Error al asignar mesa en tabla clientes:', errorAsignacion);
      }
    } else {
      console.warn(`⚠️ No se encontró cliente registrado ni anónimo con nombre: "${clienteEspera.nombre_cliente}"`);
    }

    return true;

  } catch (error) {
    console.error('Error al asignar mesa:', error);
    return false;
  }
}

  /**
   * Marcar cliente como ausente
   */
  async marcarClienteAusente(clienteId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('lista_espera')
        .update({ 
          estado: 'ausente'
        })
        .eq('id', clienteId);

      if (error) throw error;
      return true;

    } catch (error) {
      console.error('Error al marcar cliente ausente:', error);
      return false;
    }
  }

  /**
   * Consultar estado por ID
   */
  async consultarEstadoPorId(clienteId: number): Promise<{
    success: boolean;
    data?: ClienteEspera;
    posicion?: number;
    mensaje?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('lista_espera')
        .select('*')
        .eq('id', clienteId)
        .single();

      if (error) {
        return {
          success: false,
          mensaje: 'Cliente no encontrado'
        };
      }

      // Obtener posición en la cola contando clientes anteriores
      const { count: posicion, error: posError } = await supabase
        .from('lista_espera')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'esperando')
        .lt('created_at', data.created_at);

      return {
        success: true,
        data: data,
        posicion: posError ? 0 : (posicion || 0) + 1,
        mensaje: `Estado: ${data.estado}. ID: ${data.id}`
      };

    } catch (error) {
      console.error('Error al consultar estado por ID:', error);
      return {
        success: false,
        mensaje: 'Error al consultar el estado'
      };
    }
  }

  /**
   * Cancelar turno
   */
  async cancelarTurno(clienteId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('lista_espera')
        .update({ estado: 'cancelado' })
        .eq('id', clienteId);

      if (error) throw error;
      return true;

    } catch (error) {
      console.error('Error al cancelar turno:', error);
      return false;
    }
  }


  /**
   * Limpiar registros antiguos (más de 1 día)
   */
  async limpiarRegistrosAntiguos(): Promise<number> {
    try {
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() - 1);

      const { data, error } = await supabase
        .from('lista_espera')
        .delete()
        .lt('created_at', fechaLimite.toISOString())
        .select('id');

      if (error) throw error;
      return data?.length || 0;

    } catch (error) {
      console.error('Error al limpiar registros antiguos:', error);
      return 0;
    }
  }

  /**
   * Obtener cliente por ID
   */
  async getClientePorId(id: number): Promise<ClienteEspera | null> {
    try {
      const { data, error } = await supabase
        .from('lista_espera')
        .select('*')
        .eq('id', id)
        .single();

      if (error) return null;
      return data;

    } catch (error) {
      console.error('Error al obtener cliente por ID:', error);
      return null;
    }
  }

  /**
   * Obtener todos los clientes (para administración)
   */
  async getTodosLosClientes(): Promise<ClienteEspera[]> {
    try {
      const { data, error } = await supabase
        .from('lista_espera')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];

    } catch (error) {
      console.error('Error al obtener todos los clientes:', error);
      return [];
    }
  }

  /**
   * Buscar si el cliente está en la lista de espera y obtener su estado
   * @returns Datos del cliente si está en la lista, null si no está
   */
  async buscarClienteEnLista(id_cliente: number, isAnonimo?: boolean){
    const columna_id = isAnonimo ? 'id_invitado' : 'id_cliente';
    try {
      const { data, error } = await supabase  
        .from('lista_espera')
        .select('*')
        .in('estado', ['esperando', 'llamado'])
        .eq(columna_id, id_cliente)
        .single();
      if (error) throw error;
      if (!data){
        console.log('Cliente no encontrado en lista de espera');
        return null;
      }
      return data;

    } catch (error) {
      console.error('Error al buscar cliente en lista:', error);
      return null;
    }
  }
  async getListaDelDia(){
    try {
      const hoy = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('lista_espera')
        .select('*')
        .gte('created_at', `${hoy}T00:00:00.000Z`)
        .lt('created_at', `${hoy}T23:59:59.999Z`)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error al obtener lista del día:', error);
      return [];
    }
  }

  /**
   * Actualizar información del cliente
   */
  async actualizarCliente(id: number, datosActualizados: Partial<ClienteEspera>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('lista_espera')
        .update(datosActualizados)
        .eq('id', id);

      if (error) throw error;
      return true;

    } catch (error) {
      console.error('Error al actualizar cliente:', error);
      return false;
    }
  }

  /**
   * Sincronizar manualmente un cliente de lista de espera con tabla clientes
   * Útil cuando la sincronización automática falla
   */
  async sincronizarClienteManual(clienteEsperaId: number, clienteRegistradoId: number, mesaId?: number): Promise<boolean> {
    try {
      const clienteEspera = await this.getClientePorId(clienteEsperaId);
      if (!clienteEspera) {
        console.error('Cliente no encontrado en lista de espera');
        return false;
      }

      // Si el cliente de lista de espera ya tiene mesa asignada, usar esa mesa
      const mesaAsignar = mesaId || clienteEspera.mesa_asignada;
      
      if (!mesaAsignar) {
        console.error('No hay mesa para asignar');
        return false;
      }

      await this.clienteService.setMesa(clienteRegistradoId, mesaAsignar);
      console.log(`✅ Sincronización manual exitosa: Cliente ${clienteRegistradoId} -> Mesa ${mesaAsignar}`);
      
      return true;
    } catch (error) {
      console.error('Error en sincronización manual:', error);
      return false;
    }
  }

  /**
   * Buscar posibles coincidencias de cliente registrado para un cliente de lista de espera
   */
  async buscarClientesCoincidentes(clienteEsperaId: number): Promise<any[]> {
    try {
      const clienteEspera = await this.getClientePorId(clienteEsperaId);
      if (!clienteEspera) return [];

      const nombreCompleto = clienteEspera.nombre_cliente.trim();
      const partesNombre = nombreCompleto.split(' ');

      const { data, error } = await supabase
        .from('clientes')
        .select('id_cliente, nombre, apellido, email')
        .or(`nombre.ilike.%${partesNombre[0]}%,apellido.ilike.%${partesNombre[0]}%`);

      if (error) {
        console.error('Error buscando coincidencias:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error en búsqueda de coincidencias:', error);
      return [];
    }
  }

  /**
   * Suscribirse a cambios en tiempo real de la lista de espera
   * El callback se ejecutará cada vez que haya un cambio en la lista de espera 
   */
  suscribirCambios(signal: any, callback?: (payload: any) => void) {
    const isAnon = this.tipoClienteService.isAnonimo();
    const client = this.tipoClienteService.getClienteData()
    let idUser = client.id_cliente ? client.id_cliente : client.id_clienteanonimo;
    let columna_id = isAnon ? 'id_invitado' : 'id_cliente';
    const filter = `${columna_id}=eq.${idUser}`

    if (isAnon) {
      columna_id = 'id_invitado';
    } else {
      columna_id = 'id_cliente';
    }
    const channel  = supabase.channel('lista-espera-update')
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'lista_espera',
          filter: filter

        },
        (payload) => {
          const payData = payload.new as ListaEsperaEntry;
          console.log('Update en lista de espera:', payData);
          this.notificationService.sendNotificationToCliente(
            '¡Actualización en tu estado de espera!',
            `Tu estado ha cambiado a: ${payData.estado}`,)
          signal.set(payData.estado);
          console.log(signal());
          if(payData.estado === 'asignado' && payData.mesa_asignada){
            this.unsubscribirCambios(channel);
            callback && callback(payData);
          }
        }
      )
      .subscribe();
    
    return channel;
  }
  unsubscribirCambios(channel: any) {
    supabase.removeChannel(channel);
    console.log("❌ Subscripción cancelada");
  }
}