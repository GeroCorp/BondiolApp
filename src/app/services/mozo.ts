import { Injectable, signal } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { Notification } from './notification';
import { supabaseClient } from './auth'; // ✅ Importar instancia centralizada

export enum ESTADO {
  PENDIENTE = 'pendiente',
  CONFIRMADO = 'confirmado',
  EN_PREPARACION = 'en_preparación',
  ENTREGADO = 'entregado',
  RECHAZADO = 'rechazado',
  PAGADO = 'pagado',
}

@Injectable({
  providedIn: 'root'
})
export class Mozo {
  private supabase: SupabaseClient;

  constructor(
    private notificationService: Notification
  ) {
    this.supabase = supabaseClient; // ✅ Usar instancia centralizada
  }
  
  async getChatsMesas(id_mesa: number){
    const mesaNumero = Number(id_mesa);
    if (Number.isNaN(mesaNumero)) {
      console.error('❌ getChatsMesas recibió un id_mesa inválido:', id_mesa);
      return [];
    }

    const { data, error } = await this.supabase
    .from('mensajes')
    .select(`*`)
    .eq('nroMesa', mesaNumero)
    .order('date_sended', { ascending: true });

    if (error) {
      console.error('Error al obtener los mensajes del chat:', error);
      return [];
    }
    return data;
  }

  async sendMessage(id_mesa: number, contenido: string, nombre_usuario: string = 'Mozo') {
    const { error } = await this.supabase
    .from('mensajes')
    .insert([
      {
        contenido: contenido,
        nombre_usuario: nombre_usuario,
        date_sended: new Date().toISOString(),
        nroMesa: id_mesa
      }
    ]);

    if (error) {
      console.error('❌ Error enviando mensaje:', error);
      throw new Error('Error enviando mensaje: ' + error.message);
    }

    console.log('✅ Mensaje enviado correctamente a mesa:', id_mesa);

    // Enviar notificación al cliente de esa mesa
    try {
      let clienteId = await this.getClienteByMesa(id_mesa);
      if (!clienteId) {
        console.log('⚠️ No se encontró cliente asignado a la mesa:', id_mesa);
        return;
      }
      console.log("Id del cliente. ", clienteId);
      await this.notificationService.sendNotificationToCliente(
          '💬 Nuevo mensaje del mozo',
          `Tienes un nuevo mensaje en la mesa ${id_mesa}: "${contenido}"`,
          '', // URL opcional
          clienteId // Pasar el ID del cliente específico
        )

    } catch (error) {
      console.error('❌ Error enviando notificación al cliente:', error);
      // No lanzamos el error para que no afecte el envío del mensaje
    }
  }

  async subscribeToNewMessages(signal: any){
    try{
      this.supabase.channel('custom-messages-channel')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'mensajes' },
          (payload) => {
            console.log('Nuevo mensaje recibido:', payload);
            const newRow = payload.new;
            signal.update((arr: any) =>{
              return [...arr, newRow]
            })
        }
      )
      .subscribe();
    }catch (error){
      console.error('Error al suscribirse a nuevos mensajes: ' + error);
    }
  }

  /**
   * Obtiene el ID del cliente que tiene asignada una mesa específica
   */
  async getClienteByMesa(mesaId: number): Promise<number | null> {
    try {
      // Primero obtenemos el ID de la mesa por su número
      const { data: mesaData, error: mesaError } = await this.supabase
        .from('mesas')
        .select('id, cliente_asignado')
        .eq('id', mesaId)
        .single();

      if (mesaError || !mesaData) {
        console.error('❌ Error obteniendo mesa:', mesaError);
        return null;
      }

      // Si no hay cliente asignado, retornamos null
      if (!mesaData.cliente_asignado) {
        console.log('ℹ️ Mesa sin cliente asignado:', mesaId);
        return null;
      }

      // Retornamos directamente el id_cliente
      return mesaData.cliente_asignado;
    } catch (error) {
      console.error('❌ Error en getClienteByMesa:', error);
      return null;
    }
  }

  async getNombreMozo(){
  
    const user = this.supabase.auth.getUser();
    const id = (await user).data.user?.id;

    const { data, error } = await this.supabase
    .from('empleados')
    .select('nombre')
    .eq('perfil', 'mozo')
    .eq('user_id', id)
    
    if (error) throw new Error('Error obteniendo nombre de mozo: ' + error.message);
    return data ? data[0].nombre : null;
  }

  /////////////////////
  // Handle pedidos //

  async getPedidosPendientes() {
  const { data, error } = await this.supabase
    .from('pedidos')
    .select(`
      *,
      mesa:mesas(numero, id),
      cliente:clientes(nombre, apellido)
    `)
    .eq('estado', 'pendiente');

  if (error) {
    console.error('❌ Error obteniendo pedidos:', error);
    throw new Error('Error obteniendo pedidos pendientes: ' + error.message);
  }

  console.log('📋 Pedidos pendientes obtenidos:', data?.length || 0);

  if (data) {
    const pedidosConCliente = await Promise.all(
      data.map(async (pedido) => {
        if (!pedido.cliente && pedido.mesa) {
          const mesaId = pedido.mesa.id || pedido.mesa;
          
          console.log('🔍 Buscando cliente anónimo para mesa:', mesaId);
          
          const { data: mesaData } = await this.supabase
            .from('mesas')
            .select('cliente_asignado, numero')
            .eq('id', mesaId)
            .single();

          if (mesaData?.cliente_asignado) {
            const { data: anonimo } = await this.supabase
              .from('clientes_anonimos')
              .select('nombre')
              .eq('id_clienteanonimo', mesaData.cliente_asignado)
              .single();

            if (anonimo) {
              pedido.cliente = {
                nombre: anonimo.nombre,
                apellido: '(Anónimo)'
              };
              console.log('✅ Cliente anónimo encontrado:', anonimo.nombre);
            } else {
              console.log('⚠️ No se encontró cliente anónimo con ID:', mesaData.cliente_asignado);
            }
          }
        }
        return pedido;
      })
    );
    
    return pedidosConCliente;
  }

  return [];
}

  async getPedidosConfirmados() {
  const { data, error } = await this.supabase
    .from('pedidos')
    .select(`
      *,
      mesa:mesas(numero, id),
      cliente:clientes(nombre, apellido)
    `)
    .in('estado', ['confirmado', 'en_preparación', 'listo', 'entregado', 'pago_pendiente'])
    .order('fecha', { ascending: false })
    .limit(20);

  if (error) {
    console.error('❌ Error obteniendo pedidos:', error);
    throw new Error('Error obteniendo pedidos confirmados: ' + error.message);
  }

  console.log('📋 Pedidos confirmados obtenidos:', data?.length || 0);

  if (data) {
    const pedidosConCliente = await Promise.all(
      data.map(async (pedido) => {
        if (!pedido.cliente && pedido.mesa) {
          const mesaId = pedido.mesa.id || pedido.mesa;
          
          const { data: mesaData } = await this.supabase
            .from('mesas')
            .select('cliente_asignado')
            .eq('id', mesaId)
            .single();

          if (mesaData?.cliente_asignado) {
            const { data: anonimo } = await this.supabase
              .from('clientes_anonimos')
              .select('nombre')
              .eq('id_clienteanonimo', mesaData.cliente_asignado)
              .single();

            if (anonimo) {
              pedido.cliente = {
                nombre: anonimo.nombre,
                apellido: '(Anónimo)'
              };
            }
          }
        }
        return pedido;
      })
    );
    
    return pedidosConCliente;
  }

  return [];
}

  /**
 * Actualiza el estado de un pedido
 */
  async actualizarEstadoPedido(id_pedido: number, nuevoEstado: ESTADO) {

    const { data, error } = await this.supabase
    .from('pedidos')
    .update({ estado: nuevoEstado })
    .eq('id', id_pedido)
    .select();

    if (error) throw new Error('Error actualizando estado del pedido: ' + error.message);

    console.log("✅ Estado del pedido actualizado:", data);

    return data ? data[0] : null;
  }

  async enviarPedidoSector (pedidoId: number, sector: 'cocina' | 'bar', items: string){
    try {
      const perfil = sector === 'cocina' ? 'cocinero' : 'bartender';
      const pedidoSector = {
      pedido_id: pedidoId,
      sector: sector,
      items: items,
      created_at: new Date().toISOString()
    };

    const { data, error } = await this.supabase
      .from('pedidos_sector')
      .insert(pedidoSector)
      .select();

    if (error) throw error;

    if (sector === 'cocina') {

    this.notificationService.sendNotificationToPerfil(
      perfil,
      '🍳 Nuevo pedido para cocina',
      `Tienes un nuevo pedido #${pedidoId} para preparar. Accede para ver los detalles.`,
      ''
    )} else {
      this.notificationService.sendNotificationToPerfil(
        perfil,
        '🍹 Nuevo pedido para bar',
        `Tienes un nuevo pedido #${pedidoId} para preparar. Accede para ver los detalles.`,
        ''
      );
    }

    return data;
  } catch (error) {
    console.error(`Error al enviar pedido a ${sector}:`, error);
    throw error;
  }
  }

  async getDetallesPedido(id_pedido: number) {
    const { data, error } = await this.supabase
    .from('detalles_pedido')
    .select(`*`)
    .eq('id_pedido', id_pedido)
    .eq('es_delivery', false);

    if (error) throw new Error('Error obteniendo detalles del pedido: ' + error.message);
    
    console.log(data);

    return data || [];
  }

  async getdatosCliente(cliente_id: number) {
    try { 
      const { data, error } = await this.supabase
        .from('clientes')
        .select(`*`)
        .eq('id_cliente', cliente_id);

      if (error) throw new Error('Error obteniendo datos del cliente: ' + error.message);

      console.log("CLIENTE OBTENIDO ",  data[0]);

      return data[0] || null;
    } catch (error) {
      console.error('❌ Error al obtener datos del cliente:', error);
      throw error;
    }
  }

  async getDatosAnon(mesaId: number) {
    try {
      const { data } = await this.supabase
        .from('clientes_anonimos')
        .select('*')
        .eq('mesa_asignada', mesaId)
        .single();

        return data || null;
    } catch (error) {
      console.error('❌ Error al obtener datos del cliente anónimo:', error);
      throw error;
    }
  }
}