import { Injectable, inject} from '@angular/core';

import { Notification } from './notification';
import { supabaseClient } from './auth'; // ✅ Importar instancia centralizada
import { EmailService } from './email';

export interface Pedido {
  id: number;
  cliente: Cliente;
  direccion: string;
  estado: string;
  subtotal: number;
  created_at: string;
  items?: any[];
  porcentaje_propina: number;
}

export interface Cliente {
  id_cliente:number;
  nombre: string;
  apellido: string;
  email: string;
  dni?: number | string;
}

@Injectable({
  providedIn: 'root'
})
export class Delivery {
  
  private supabase;
  private notificationService: Notification = inject(Notification);

  constructor(
    private emailService: EmailService
  ) {
    this.supabase = supabaseClient;
    }


  async getPedidosDelivery(): Promise<Pedido[]> {
    const { data, error } = await this.supabase
      .from('pedidos_delivery')
      .select('*, cliente:id_cliente(nombre, apellido, id_cliente)');
    
    if (error) {
      throw new Error('Error al obtener pedidos delivery: ' + error.message);
    }
    return data as Pedido[];
  }

  async getPedidoById(pedidoId: number){
    const { data, error } = await this.supabase
      .from('pedidos_delivery')
      .select('*, cliente:id_cliente(nombre, apellido, id_cliente, dni, email)')
      .eq('id', pedidoId)
      .single();
      if (error) {
        throw new Error('Error al obtener pedido por ID: ' + error.message);
      }
      return data as Pedido;
  }

  async getDireccionDePedido(id_pedido: number) {
    const { data, error } = await this.supabase
      .from('pedidos_delivery')
      .select('direccion')
      .eq('id', id_pedido)
      .single();
      if (error) {
        throw new Error('Error al obtener dirección del pedido: ' + error.message);
      }
      return data?.direccion;
  }

  async getPedidosConDetalles(){
    const pedidos = await this.getPedidosDelivery();
    for (let pedido of pedidos) {
      const items = await this.getDetallesPedido(pedido.id);
      pedido['items'] = items;
    }
    return pedidos as any[];
  }

  async getPedidosPendientes() {
    const { data, error } = await this.supabase
      .from('pedidos_delivery')
      .select('*, cliente:id_cliente(nombre, apellido, id_cliente)')
      .eq('estado', 'pendiente');
    if (error) {
      throw new Error('Error al obtener pedidos pendientes: ' + error.message);
    }
    return data as Pedido[];
  }

  async getClientePedidos(userId: number): Promise<Pedido[]> {

    const { data, error } = await this.supabase
      .from('pedidos_delivery')
      .select('*')
      .eq('id_cliente', userId)
    
    if (error) {
      throw new Error('Error al obtener pedidos delivery: ' + error.message);
    }

    let pedidos= data as any[];

    for (let pedido of pedidos) {
      const { data: detallesData, error: detallesError } = await this.supabase
        .from('detalles_pedido')
        .select('*')
        .eq('id_pedido', pedido.id)
        .eq('es_delivery', true);

      pedido.detalles = detallesData?.filter(det => det.id_pedido === pedido.id);
      console.log(pedido);
    }

    return pedidos;
  }

  async getDetallesPedido(pedidoId: number): Promise<any[]>{

    console.log(pedidoId);

    const { data, error } = await this.supabase
    .from('detalles_pedido')
    .select('*')
    .eq('id_pedido', pedidoId)
    .eq('es_delivery', true);
    
    if (error) {
      throw new Error('Error al obtener detalles del pedido: ' + error.message);
    }
    console.log(data);
    return data as any[];
  }


  async updateEstadoPedido(idPedido: number, nuevoEstado: string) {
    const { error } = await this.supabase
      .from('pedidos_delivery')
      .update({ estado: nuevoEstado })
      .eq('id', idPedido)
    if (error) {
      throw new Error('Error al actualizar el estado del pedido: ' + error.message);
    }

    if (nuevoEstado === 'en_camino'){
      try {
        const pedido = await this.getPedidoById(idPedido);  
        if (pedido) {
          const clienteId = pedido.cliente.id_cliente;
          this.notificationService.sendNotificationToCliente(
            '🛵 Tu pedido está en camino!',
            `¡Buenas noticias! Tu pedido #${idPedido} está en camino. Prepárate para disfrutar de tu comida pronto.`,
            '',
            clienteId
          );
        }
      } catch (error) {
        console.error('Error al enviar notificación:', error);
        throw new Error('Error al enviar notificación de en camino: ' + error);
      }
    }

    if (nuevoEstado === 'pagado'){
      try {
        const pedido = await this.getPedidoById(idPedido);
        if (pedido) {
          const clienteId = pedido.cliente.id_cliente;
          this.notificationService.sendNotificationToCliente(
            'Tu pago ha sido recibido con éxito.',
            `Gracias por pagar tu pedido #${idPedido}. ¡Esperamos que disfrutes tu comida!`,
            '',
            clienteId
          );
        }
        const descuento = await this.getDescuento(pedido.cliente.id_cliente);
        const detalles = await this.getDetallesPedido(idPedido);
        this.emailService.enviarEmailFactura(
          pedido.id,
          pedido.subtotal,
          pedido.cliente,
          pedido.porcentaje_propina,
          descuento?.descuento_obtenido || 0,
          detalles

        )
      } catch (error) {
        console.error('Error al enviar notificación:', error);
        throw new Error('Error al enviar notificación de pago: ' + error);
      }

    }
  }

  async getDescuento(id_cliente: number){
    const fechaHoy = new Date().toISOString().split('T')[0];
    const { data, error } = await this.supabase
      .from('juegos_descuentos')
      .select('*')
      .eq('cliente_id', id_cliente)
      .gte('fecha', fechaHoy + 'T00:00:00') // Mayor o igual a las 00:00:00 de hoy
      .lt('fecha', new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0] + 'T00:00:00')
      .order('fecha', { ascending: false })
      .maybeSingle(); // Menor que las 00:00:00 de mañana
    if (error) {
      throw new Error('Error al obtener descuento: ' + error.message);
    }
    return data || 0;
  }

  async getPedidoPorPagar() {
    const { data, error } = await this.supabase
      .from('pedidos_delivery')
      .select('*, cliente:id_cliente(nombre, apellido, id_cliente, email, dni)')
      .eq('estado', 'entregado')
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) {
      throw new Error('Error al obtener pedido por pagar: ' + error.message);
    }
    return data ? data[0] : null;
  }

  async rechazarPedido(idPedido: number, clienteId: number) {
    const data = await this.updateEstadoPedido(idPedido, 'rechazado');
      try {
        this.notificationService.sendNotificationToCliente(
          'Tu pedido de delivery ha sido rechazado.',
          'Puede cambiar el contenido de su pedido e intentar nuevamente.',
          '',
          clienteId
        )
      } catch (error) {
        console.error('Error al enviar notificación:', error);
        throw new Error('Error al enviar notificación de rechazo: ' + error);
      }
    return data;
    
  }

  async confirmarPedido(idPedido: number, clienteId: number) {
    const data = await this.updateEstadoPedido(idPedido, 'confirmado');
    try{
      this.notificationService.sendNotificationToCliente(
          'Tu pedido de delivery ha sido confirmado.',
          'Tiempo estimado de entrega: 40 minutos.',
          '',
          clienteId
        )
    } catch(error){
      console.error('Error al enviar notificación:', error);
      throw new Error('Error al enviar notificación de confirmación: ' + error);
    }
    const items = await this.getDetallesPedido(idPedido);
    const cocina = items.filter(item => item.tipo === 'plato');
    const barra = items.filter(item => item.tipo === 'bebida');

    if (cocina.length > 0) {
      const nombresCocina = cocina.map(item => `${item.cantidad}x ${item.nombre_prod}`).join(',');
      await this.sendPedidoSectores(idPedido, 'cocina', nombresCocina);
    }

    if (barra.length > 0) {
      const nombresBar = barra.map(item => `${item.cantidad}x ${item.nombre_prod}`).join(',');
      await this.sendPedidoSectores(idPedido, 'bar', nombresBar);
    }

    return data;
  }


  private async sendPedidoSectores(idPedido: number, sector: string, items: any){
    try {
      const perfil = sector === 'cocina' ? 'cocinero' : 'barra';
      const pedido = {
        pedido_id: idPedido,
        sector: sector,
        items: items,
        created_at: new Date().toISOString(),
        es_delivery: true,
        estadoItem: 'confirmado' // default state
      };

      const { data, error } = await this.supabase
        .from('pedidos_sector')
        .insert(pedido)
        .select();
      if (error) {
        throw new Error('Error al enviar pedido a sectores: ' + error.message);
      }

      if (sector === 'cocina') {
        this.notificationService.sendNotificationToPerfil(
          perfil,
          `🍳 Nuevo pedido para cocina`,
          `Nuevo pedido #${idPedido}. Puedes ver los detalles en la sección de Pedidos de Cocina.`,
          ''
        );
      } else {
        this.notificationService.sendNotificationToPerfil(
          perfil,
          '🍹 Nuevo pedido para bar',
          `Tienes un nuevo pedido #${idPedido} para preparar. Accede para ver los detalles.`,
          ''
        );
      }

      return data;

    } catch (error) {
      console.error('Error al enviar pedido a sectores:', error);
      throw new Error('Error al enviar pedido a sectores: ' + error);
    }

  }

  // Funcion para avisar al delivery que el pedido esta listo
  async subscribeToChanges(){
    const channels = this.supabase.channel('custom-update-channel')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pedidos_delivery' },
        (payload: any) => {
          if (payload.new.estado === 'listo') {
            this.notificationService.sendNotificationToPerfil(
              'delivery',
              `El pedido ${payload.new.id} está listo para ser entregado.`,
              'Dirigete al mostrador para poder recoger y entregar el pedido.',
              '',
            ) 
          }
        }
      )
      .subscribe()
  }

  // Suscribirse a nuevos mensajes en el chat de delivery
  subscribeToMessages(filter: number, update: any){
    try {
      const channels = this.supabase.channel(`custom-insert-channel-${filter}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', 
          schema: 'public', 
          table: 'chats_delivery',
          filter: `id_pedido=eq.${filter}`,
          },
        (payload) => {
          console.log('Nuevo mensaje', payload)
          update(payload.new);
        }
      )
      .subscribe((status) => {
        console.log('Estado suscripción mensajes delivery:', status);
      })
      
      return channels; // ✅ Retornar el canal para poder desuscribirse
    } catch (error) {
      throw new Error('Error al suscribirse a mensajes: ' + error);
    }
  }

  // Desuscribirse de los mensajes
  unsubscribeFromMessages(channel: any) {
    if (channel) {
      channel.unsubscribe();
      console.log('Desuscrito de mensajes');
    }
  }

  async sendMessage(pedido_id: number, contenido: string, cliente_id?: number){
    const id_delivery = await this.getDeliveryId();
    const { error } = await this.supabase
    .from('chats_delivery')
    .insert([{
      id_pedido: pedido_id,
      mensaje: contenido,
      created_at: new Date().toISOString(),
      id_delivery: id_delivery
    }])    
    if (error) {
      throw new Error('Error al enviar mensaje: ' + error.message);
    }

    try {
      this.notificationService.sendNotificationToCliente(
        '💬 Nuevo mensaje del delivery',
        `${contenido}`,
        '',
        cliente_id!
      )
    } catch (error) {
      console.error('Error al enviar notificación al cliente:', error);
    }

  }

  async getMessages(pedidoId: number): Promise<any[]>{
    const { data, error } = await this.supabase
      .from('chats_delivery')
      .select('*')
      .eq('id_pedido', pedidoId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error('Error al obtener mensajes: ' + error.message);
    }

    return data || [];
  }


  async getDeliveryId(): Promise<number> {
    const user = this.supabase.auth.getUser();
    const userId = (await user).data.user?.id;
    const { data, error } = await this.supabase
      .from('empleados')
      .select('id_empleado')
      .eq('user_id', userId)
      .single();
      if (error) {
        throw new Error('Error al obtener ID de delivery: ' + error.message);
      }
      return data?.id_empleado;
  }

}
