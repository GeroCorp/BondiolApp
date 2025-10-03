import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ClienteService {
  // Signal compartido para el pedido
  private _pedido = signal<any[]>([]);
  // Signal para el estado de espera del cliente
  private _clienteEnEspera = signal<boolean>(false);
  private supabase: SupabaseClient;
  
  constructor() {
    this.supabase = createClient(
      environment.SUPABASE_URL,
      environment.SUPABASE_ANON_KEY
    );
   }

  // Getter para acceder al signal desde los componentes
  get pedido() {
    return this._pedido;
  }

  // Getter para el estado de espera del cliente
  get clienteEnEspera() {
    return this._clienteEnEspera;
  }

  // Agregar un item al pedido
  addItem(item: any) {
    const currentPedido = this._pedido();
    
    // Buscar si el item ya existe en el pedido (mismo id)
    const existingItemIndex = currentPedido.findIndex(pedidoItem => pedidoItem.id === item.id);
    
    if (existingItemIndex !== -1) {
      // Si existe, actualizar la cantidad y subtotal
      const updatedPedido = [...currentPedido];
      updatedPedido[existingItemIndex] = {
        ...updatedPedido[existingItemIndex],
        quantity: updatedPedido[existingItemIndex].quantity + item.quantity,
        subtotal: updatedPedido[existingItemIndex].precio * (updatedPedido[existingItemIndex].quantity + item.quantity)
      };
      this._pedido.set(updatedPedido);
    } else {
      // Si no existe, agregarlo como nuevo item
      this._pedido.set([...currentPedido, item]);
    }
  }

  // Remover un item del pedido
  removeItem(index: number) {
    const currentPedido = this._pedido();
    const newPedido = currentPedido.filter((_, i) => i !== index);
    this._pedido.set(newPedido);
  }

  // Limpiar el pedido
  clearPedido() {
    this._pedido.set([]);
  }

  // Obtener el total del pedido
  getTotal(): number {
    return this._pedido().reduce((total, item) => total + (item.subtotal || item.precio || 0), 0);
  }

  // Obtener la cantidad total de items en el pedido
  getItemCount(): number {
    return this._pedido().reduce((count, item) => count + (item.quantity || 1), 0);
  }

  // Actualizar la cantidad de un item específico
  updateItemQuantity(index: number, newQuantity: number) {
    if (newQuantity <= 0) {
      this.removeItem(index);
      return;
    }
    
    const currentPedido = this._pedido();
    const updatedPedido = [...currentPedido];
    updatedPedido[index] = {
      ...updatedPedido[index],
      quantity: newQuantity,
      subtotal: updatedPedido[index].precio * newQuantity
    };
    this._pedido.set(updatedPedido);
  }

  async getClientesEnEspera(){
    try{
      const { data, error} = await this.supabase
      .from('clientes')
      .select('*')
      .is('mesa_asignada', null);
      

      if (error){
        throw new Error ('Error al obtener clientes en espera: ' + error.message)
      }

      console.log('clientes en espera:', data);

      return data ?? []
    }catch (err: any){
      console.error('Error en getClientesEnEspera:', err);
      throw new Error(err.message || 'Error desconocido');
    }
  }

  async detectarUpdate(callback?: (enEspera: boolean) => void){
    const channels = this.supabase.channel('custom-update-channel')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'clientes' },
      async (payload) => {
        console.log('🔄 Update detectado en clientes:', payload);
        
        try {
          // Llamar a la función y esperar el resultado
          const enEspera = await this.isCLienteEnEspera();
          console.log('✅ Cliente en espera actualizado:', enEspera);
          
          // Actualizar el signal
          this._clienteEnEspera.set(enEspera);
          
          // Ejecutar callback si se proporciona
          if (callback) {
            callback(enEspera);
          }
        } catch (error) {
          console.error('❌ Error verificando cliente en espera:', error);
        }
      }
    )
    .subscribe();

    // Inicializar el estado actual
    try {
      const estadoInicial = await this.isCLienteEnEspera();
      this._clienteEnEspera.set(estadoInicial);
    } catch (error) {
      console.error('❌ Error obteniendo estado inicial:', error);
    }

    return channels;
  }


  async isCLienteEnEspera(){
    const { data: { user } } = await this.supabase.auth.getUser()
    
    const { data, error } = await this.supabase
    .from('clientes')
    .select('mesa_asignada')
    .eq('user_id', user?.id)
    .single();

    if (error) {
      console.error('Error al verificar cliente en espera:', error);
      return false;
    }

    // Si mesa_asignada es null, el cliente está en espera
    const bool = data?.mesa_asignada === null;
    
    console.log('Cliente en espera:', bool);
    return bool;
  }

  async isMesaDisponible(nro: number) {
    const { data, error} = await this.supabase
    .from('clientes')
    .select('*')
    .eq('mesa_asignada', nro);

    if (error) {
      console.error('Error verificando mesa:', error);
      throw new Error('Error al verificar disponibilidad: ' + error.message);
    }

    // Si hay datos, significa que la mesa está ocupada
    if (data && data.length > 0) {
      throw new Error('Mesa ocupada');
    }

    console.log('Mesa disponible:', nro);
    return true;
  }

  async actualizarMesa(cliente_id:number, mesa_id: number){
    console.log('🔄 Actualizando mesa:', { cliente_id, mesa_id });
    
    const { data, error } = await this.supabase
    .from('mesas')
    .update({cliente_asignado: cliente_id})
    .eq('id', mesa_id)
    .select();

    if (error) {
      console.error('❌ Error actualizando mesa:', error);
      throw new Error('Error actualizando la mesa: ' + error.message);
    }
    
    console.log('✅ Mesa actualizada:', data);
    return data;
  }


  
  async setMesa(id: number, nroMesa: number){
    try {
      console.log('🔄 Iniciando asignación de mesa:', { clienteId: id, mesaId: nroMesa });
      
      // Comprobar disponibilidad (con await)
      await this.isMesaDisponible(nroMesa);
      console.log('✅ Mesa disponible verificada');

      // Actualizar cliente
      const { data, error } = await this.supabase
      .from('clientes')
      .update({mesa_asignada: nroMesa})
      .eq('id_cliente', id)
      .select();

      if (error) {
        console.error('❌ Error asignando mesa al cliente:', error);
        throw new Error('Error al asignar mesa: ' + error.message);
      }
      
      console.log('✅ Cliente actualizado:', data);

      // Actualizar disponibilidad de la mesa
      await this.actualizarMesa(id, nroMesa);
      
      console.log('✅ Mesa asignada correctamente:', data);
      return data;
      
    } catch (error: any) {
      console.error('❌ Error en setMesa:', error);
      throw error;
    }
  }
}
