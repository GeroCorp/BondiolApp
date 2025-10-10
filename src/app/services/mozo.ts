import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from 'src/environments/environment';

export enum ESTADO {
  PENDIENTE = 'pendiente',
  CONFIRMADO = 'confirmado',
  EN_PREPARACION = 'en_preparación',
  ENTREGADO = 'entregado',
  RECHAZADO = 'rechazado'
}

@Injectable({
  providedIn: 'root'
})
export class Mozo {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.SUPABASE_URL, environment.SUPABASE_ANON_KEY);
  }
  
  async getChatsMesas(id_mesa: number){
    const { data, error } = await this.supabase
    .from('mensajes')
    .select(`*`)
    .eq('nroMesa', id_mesa)
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

  async getPedidosPendientes(){
    const { data, error } = await this.supabase
    .from('pedidos')
    .select(`*,
      mesa:mesas(numero),
      cliente:clientes(nombre, apellido)`)
    .eq('estado', 'pendiente');

    if (error) throw new Error('Error obteniendo pedidos pendientes: ' + error.message);
    
    console.log(data);

    return data || []; 
  }

  async getPedidosConfirmados(){
    const { data, error } = await this.supabase
    .from('pedidos')
    .select(`*,
      mesa:mesas(numero),
      cliente:clientes(nombre, apellido)`)
    .in('estado', ['confirmado', 'en_preparación', 'listo'])
    .order('fecha', { ascending: false })
    .limit(20);
    if (error) throw new Error('Error obteniendo pedidos confirmados: ' + error.message);
    
    console.log(data);
    return data || [];
  }

  /**
 * Actualiza el estado de un pedido
 */
  async actualizarEstadoPedido(id_pedido: number, nuevoEstado: ESTADO) {
    
    if (nuevoEstado !== ESTADO.PENDIENTE &&
        nuevoEstado !== ESTADO.CONFIRMADO &&
        nuevoEstado !== ESTADO.EN_PREPARACION &&
        nuevoEstado !== ESTADO.ENTREGADO) {
      throw new Error('Estado inválido: ' + nuevoEstado);
    }

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
    .eq('id_pedido', id_pedido);

    if (error) throw new Error('Error obteniendo detalles del pedido: ' + error.message);
    
    console.log(data);

    return data || [];
  }

}
