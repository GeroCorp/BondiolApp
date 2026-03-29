import { Injectable } from '@angular/core';
import { supabase } from './supabase';
import { Notification } from './notification';
import { ClienteService } from './cliente.service';

@Injectable({
  providedIn: 'root'
})
export class ConcinaBar {
  private supabase = supabase;

  constructor(
    private notificationService: Notification,
    private clienteService: ClienteService
  ) {
  }

  async getPedidosPendientesSector(sector: 'cocina' | 'bar') {
  
  // 1. Obtener todos los ítems del sector (incluyendo los IDs de pedido y el flag 'es_delivery')
  const { data: sectorItems, error: sectorError } = await this.supabase
    .from('pedidos_sector')
    .select('*') // Seleccionar todo, incluyendo pedido_id, id, es_delivery, etc.
    .eq('sector', sector);

  if (sectorError) {
    console.error('Error al obtener ítems de sector:', sectorError);
    return [];
  }

  if (!sectorItems || sectorItems.length === 0) {
      return [];
  }
  
  // 2. Separar los IDs según el tipo de pedido
  const pedidoIdsMesa = sectorItems
    .filter(item => item.es_delivery !== true)
    .map(item => item.pedido_id);
    
  const pedidoIdsDelivery = sectorItems
    .filter(item => item.es_delivery === true)
    .map(item => item.pedido_id);

  // 3. Consultar la tabla 'pedidos' (pedidos en mesa) - SOLO ESTADOS ACTIVOS
  const estadosActivos = ['confirmado', 'en_preparación', 'listo'];
  
  const pedidosMesaPromise = pedidoIdsMesa.length > 0
    ? this.supabase
        .from('pedidos')
        .select(`
          id, estado, fecha, total,
          mesa:mesas!id(numero)
        `)
        .in('id', pedidoIdsMesa)
        .in('estado', estadosActivos)
    : Promise.resolve({ data: [], error: null });

  const pedidosDeliveryPromise = pedidoIdsDelivery.length > 0
    ? this.supabase
        .from('pedidos_delivery')
        .select(`
          id, estado, created_at, subtotal,
          direccion, clientes:id_cliente(nombre)
        `)
        .in('id', pedidoIdsDelivery)
        .in('estado', estadosActivos)
    : Promise.resolve({ data: [], error: null });

  const [pedidosMesa, pedidosDelivery] = await Promise.all([
    pedidosMesaPromise,
    pedidosDeliveryPromise
  ]);
  
  if (pedidosMesa.error || pedidosDelivery.error) {
    console.error('Error al obtener pedidos relacionados:', pedidosMesa.error || pedidosDelivery.error);
    return [];
  }

  // 4. Unificar y Normalizar los datos
  
  const dataMesa = (pedidosMesa.data || []) as any[]; // Forzar el tipo a Array
  const dataDelivery = (pedidosDelivery.data || []) as any[]; // Forzar el tipo a Array

  // Crear un mapa para buscar rápidamente los datos del pedido (base o delivery)
  const pedidosMap = new Map();

  // Ahora el error debería desaparecer porque 'dataMesa' y 'dataDelivery' son arrays.
  dataMesa.forEach((p: any) => pedidosMap.set(p.id, { ...p, tipo: 'mesa' }));
  dataDelivery.forEach((p: any) => pedidosMap.set(p.id, { ...p, tipo: 'delivery' }));
  // Reconstruir la estructura final deseada
  const dataFinal = sectorItems.map(item => {
      const pedidoRelacionado = pedidosMap.get(item.pedido_id);

      if (!pedidoRelacionado) return null;

      // Normalizar la información del pedido para el frontend
      const infoPedido = {
          id: pedidoRelacionado.id,
          estado: pedidoRelacionado.estado,
          fecha: pedidoRelacionado.fecha,
          total: pedidoRelacionado.total,
          es_delivery: pedidoRelacionado.tipo === 'delivery',
          // Determinar la ubicación
          ubicacion: pedidoRelacionado.tipo === 'mesa' 
                      ? pedidoRelacionado.mesa.numero 
                      : pedidoRelacionado.direccion_entrega || 'N/A' 
      };

      return {
          ...item, // Datos del sector (id, sector, items, etc.)
          pedido: infoPedido // El objeto de pedido unificado
      };
  }).filter(item => item !== null);

  return dataFinal;
}

  async actualizarEstadoPedido(pedidoId: number, nuevoEstado: string, esDelivery: boolean) {
    if (!esDelivery) {
      const { data, error } = await this.supabase
        .from('pedidos')
        .update({ estado: nuevoEstado })
        .eq('id', pedidoId);
      if (error) {
        console.error('Error al actualizar el estado del pedido:', error);
        return null;
      }
      return data;
    } else {
      const { data, error } = await this.supabase
        .from('pedidos_delivery')
        .update({ estado: nuevoEstado })
        .eq('id', pedidoId);
      if (error) {
        console.error('Error al actualizar el estado del pedido:', error);
        return null;
      }
      return data;

    }
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
      
      let pedidoId: number = 0;
      let delivery: boolean = false;
      const { data: itemActualizado, error: errorItem } = await this.supabase
      .from('pedidos_sector')
      .select('pedido_id, es_delivery')
          .eq('id', idItem)
          .maybeSingle();
  
        if (!errorItem && itemActualizado) {

          pedidoId = itemActualizado.pedido_id;
          delivery = itemActualizado.es_delivery;
          console.log("Id del pedido a actualizarasdasdas: ", pedidoId);
        }
        
        // Verificar si todos los items de este pedido están listos
        const todosListos = await this.verificarTodosItemsListos(pedidoId, delivery);
        
        if (todosListos) {
          // Marcar el pedido general como "listo"
          await this.actualizarEstadoPedido(pedidoId, 'listo', delivery);
          console.log(`Pedido ${pedidoId} marcado como listo - todos los items completados`);
          if (delivery){
            this.notificationService.sendNotificationToPerfil(
              'delivery',
              `El pedido #${pedidoId} ha sido actualizado.`,
              `El pedido ya está listo para ser servido.`
            );
          }else{
            this.notificationService.sendNotificationToPerfil(
              'mozo',
              `El pedido #${pedidoId} ha sido actualizado.`,
              `El pedido ya está listo para ser servido.`
            );
          }
        } else {
          await this.actualizarEstadoPedido(pedidoId, 'en_preparación', delivery);
          console.log(`Pedido ${pedidoId} marcado como en preparación - algunos items aún pendientes`);
        }
        if (errorItem) {
          console.error('Error al obtener el item actualizado:', errorItem);
        }

      }
      return data;
    }

  

  // Función auxiliar para verificar si todos los items de un pedido están listos
  private async verificarTodosItemsListos(pedidoId: number, delivery: boolean | null): Promise<boolean> {
    try {
      const dataArray: any[] = [];
      let query = this.supabase
        .from('pedidos_sector')
        .select('estadoItem')
        .eq('pedido_id', pedidoId);

      if (delivery !== null) {
        query = query.eq('es_delivery', delivery);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error al verificar items del pedido:', error);
        return false;
      }

      dataArray.push(...(data || []));

      if (dataArray.length === 0) {
        console.warn(`No se encontraron items de pedidos sector para pedido ${pedidoId}`);
        return false;
      }

      return dataArray.every(item => item.estadoItem === 'listo');
    } catch (error) {
      console.error('Error en verificarTodosItemsListos:', error);
      return false;
    }
  }

}
