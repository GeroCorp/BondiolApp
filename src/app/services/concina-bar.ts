import { Injectable } from '@angular/core';
import { supabase } from './supabase';
import { Notification } from './notification';

@Injectable({
  providedIn: 'root'
})
export class ConcinaBar {
  private supabase = supabase;

  constructor(
    private notificationService: Notification
  ) {
  }

  async getPedidosPendientesSector(sector: 'cocina' | 'bar') {
    const { data, error } = await this.supabase
      .from('pedidos_sector')
      .select(`
        *,
        pedido_id,
        pedido:pedidos!pedido_id(
          id,
          estado,
          mesa:mesas!id(numero),
          fecha,
          total
        )
      `)
      .eq('sector', sector)

    
    if (error) {
      console.error('Error al obtener pedidos pendientes del sector:', error);
      return [];
    }
    return data;
  }

  async actualizarEstadoPedido(pedidoId: number, nuevoEstado: string) {
    const { data, error } = await this.supabase
      .from('pedidos')
      .update({ estado: nuevoEstado })
      .eq('id', pedidoId);
    if (error) {
      console.error('Error al actualizar el estado del pedido:', error);
      return null;
    }
    return data;
  }

  async actualizarEstadoPedidoSector(idItem: number, nuevoEstado: string) {
    const { data, error } = await this.supabase
      .from('pedidos_sector')
      .update({ estadoItem: nuevoEstado })
      .eq('id', idItem);

    if (error) {
      console.error('Error al actualizar el estado del pedido sector:', error);
      return null;
    }

    // Si se marcó como "listo", verificar si todos los items del pedido están listos
    if (nuevoEstado === 'listo' || nuevoEstado === 'en_preparación') {
      // Obtener el pedido_id del item que acabamos de actualizar
      const { data: itemActualizado, error: errorItem } = await this.supabase
        .from('pedidos_sector')
        .select('pedido_id')
        .eq('id', idItem)
        .single();

      if (!errorItem && itemActualizado) {
        const pedidoId = itemActualizado.pedido_id;
        
        // Verificar si todos los items de este pedido están listos
        const todosListos = await this.verificarTodosItemsListos(pedidoId);
        
        if (todosListos) {
          // Marcar el pedido general como "listo"
          await this.actualizarEstadoPedido(pedidoId, 'listo');
          console.log(`Pedido ${pedidoId} marcado como listo - todos los items completados`);
          this.notificationService.sendNotificationToPerfil(
            'mozo',
            `El pedido #${pedidoId} ha sido actualizado.`,
            `El pedido ya está listo para ser servido.`
          );

        } else {
          await this.actualizarEstadoPedido(pedidoId, 'en_preparación');
          console.log(`Pedido ${pedidoId} marcado como en preparación - algunos items aún pendientes`);
        }
      }
    }

    return data;
  }

  // Función auxiliar para verificar si todos los items de un pedido están listos
  private async verificarTodosItemsListos(pedidoId: number): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('pedidos_sector')
        .select('estadoItem')
        .eq('pedido_id', pedidoId);

      if (error) {
        console.error('Error al verificar items del pedido:', error);
        return false;
      }

      // Verificar que todos los items estén en estado "listo"
      return data?.every(item => item.estadoItem === 'listo') ?? false;
    } catch (error) {
      console.error('Error en verificarTodosItemsListos:', error);
      return false;
    }
  }

}
