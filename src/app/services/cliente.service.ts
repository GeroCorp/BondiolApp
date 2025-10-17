import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from 'src/environments/environment';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ClienteService {
  // Signal compartido para el pedido
  private _pedido = signal<any[]>([]);
  // Signal para el estado de espera del cliente
  private _clienteEnEspera = signal<boolean>(false);
  // Signal para el historial de pedidos del cliente
  private _historialPedidos = signal<any[]>([]);
  
  // Subject para emitir eventos de cambios en pedidos
  private _pedidoEventos = new Subject<{tipo: string, pedido: any, payload?: any}>();
  
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

  // Getter para el historial de pedidos
  get historialPedidos() {
    return this._historialPedidos;
  }

  // Getter para eventos de pedidos (notificaciones)
  get pedidoEventos$() {
    return this._pedidoEventos.asObservable();
  }

  // Metodos para manejo del pedido

  // Agregar un item al pedido
  addItem(item: any) {
    const currentPedido = this._pedido();
    
    // Asegurar que el item tenga cantidad y subtotal
    const itemConSubtotal = {
      ...item,
      quantity: item.quantity || 1,
      subtotal: item.precio * (item.quantity || 1)
    };
    
    // Buscar si el item ya existe en el pedido (mismo id)
    const existingItemIndex = currentPedido.findIndex(pedidoItem => pedidoItem.id === item.id);
    
    if (existingItemIndex !== -1) {
      // Si existe, actualizar la cantidad y subtotal
      const updatedPedido = [...currentPedido];
      const newQuantity = updatedPedido[existingItemIndex].quantity + (item.quantity || 1);
      updatedPedido[existingItemIndex] = {
        ...updatedPedido[existingItemIndex],
        quantity: newQuantity,
        subtotal: updatedPedido[existingItemIndex].precio * newQuantity
      };
      this._pedido.set(updatedPedido);
    } else {
      // Si no existe, agregarlo como nuevo item
      this._pedido.set([...currentPedido, itemConSubtotal]);
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
    return this._pedido().reduce((total, item) => {
      // Priorizar subtotal si existe, sino calcular precio * cantidad
      const itemTotal = item.subtotal || (item.precio * (item.quantity || 1));
      return total + itemTotal;
    }, 0);
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


  async insertPedido() {
    
    const detalles = this._pedido()
    console.log('🔍 Detalles del pedido:', detalles);
    
    // Calcular total manualmente para debug
    const totalCalculado = detalles.reduce((total, item) => {
      const itemTotal = item.subtotal || (item.precio * (item.quantity || 1));
      console.log(`Item: ${item.nombre}, Precio: ${item.precio}, Cantidad: ${item.quantity || 1}, Subtotal: ${itemTotal}`);
      return total + itemTotal;
    }, 0);
    
    console.log('💰 Total calculado manualmente:', totalCalculado);
    console.log('💰 Total del método getTotal():', this.getTotal());
    
    const idCliente = await this.getClientId()
    const nroMesa = await this.getMesa(idCliente)
    const cabecera = {
      mesa: nroMesa, 
      id_cliente: idCliente,
      fecha: new Date(),
      estado: "pendiente",
      total: totalCalculado // Usar el total calculado manualmente
    }

    const { data, error } = await this.supabase
    .from('pedidos')
    .insert([cabecera])
    .select()

    const idPedido = data![0].id;

    console.log(data);
     await Promise.all(detalles.map(async item => {
       console.log("🔄️Item a insertar: \nProducto: ", item.nombre, "\nCantidad: ", item.quantity, "\nPrecio: $", item.precio);
       const { data, error } = await this.supabase
       .from('detalles_pedido')
       .insert([
         {
          id_pedido: idPedido,
          nombre_prod: item.nombre,
          cantidad: item.quantity,
          precio_unitario: item.precio,
          tipo: item.tipo
         }
       ]).select();

       if (error) {
         console.error('❌ Error insertando detalle de pedido:', error);
       }
     }));

    // Emitir evento de pedido creado
    this._pedidoEventos.next({
      tipo: 'PEDIDO_CREADO',
      pedido: {
        id: idPedido,
        total: totalCalculado,
        cantidadItems: detalles.length
      }
    });

    // Limpiar el pedido después de insertarlo
    this.clearPedido();
    
    return idPedido;
  }

  // Metodos del chat de consultas


  
  async getChatMessages(){
    const mesa = await this.getMesa(await this.getClientId())
    const { data, error } = await this.supabase
    .from('mensajes')
    .select('*')
    .eq('nroMesa', mesa)
    .order('date_sended', { ascending: true });

    if (error) {
      console.error('❌ Error obteniendo mensajes:', error);
      return [];
    }

    return data;
  }

  async sendMessage(content: string){
    const idCliente = await this.getClientId()
    const nroMesa = await this.getMesa(idCliente)
    const nombre = this.getNombreCliente()

    const { error } = await this.supabase
    .from('mensajes')
    .insert([
      {
        contenido: content,
        nombre_usuario: await nombre,
        date_sended: new Date().toISOString(),
        nroMesa
      }
    ]);

    if (error) {
      console.error('❌ Error enviando mensaje:', error);
      throw new Error('Error enviando mensaje: ' + error.message);
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
  // Metodos para manejo de clientes

  async getClientId(){
    const userid = (await this.supabase.auth.getUser()).data.user?.id
    const { data , error } = await this.supabase
    .from('clientes')
    .select('id_cliente')
    .eq('user_id', userid)

    if (error) throw new Error("Error al obtener id del cliente: " + error.message)
  
    return data[0].id_cliente ?? -1;
  }
  async getNombreCliente(){
    const userid = await this.getClientId()
    const { data , error } = await this.supabase
    .from('clientes')
    .select('nombre')
    .eq('id_cliente', userid)

    if (error) throw new Error("Error al obtener nombre del cliente: " + error.message)
      

    return data[0].nombre ?? 'Cliente';
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

  // Metodos para manejo de mesas

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

  async actualizarMesa(cliente_id:number, mesa_numero: number){
    console.log('🔄 Actualizando mesa:', { cliente_id, mesa_numero });
    
    const { data, error } = await this.supabase
    .from('mesas')
    .update({
      cliente_asignado: cliente_id,
      disponible: false
    })
    .eq('id', mesa_numero) 
    .select();

    if (error) {
      console.error('❌ Error actualizando mesa:', error);
      throw new Error('Error actualizando la mesa: ' + error.message);
    }
    
    console.log('✅ Mesa actualizada:', data);

    return data;
  }

  async getMesa(idCliente: number){
    // Primero obtenemos el ID de la mesa asignada
    const { data: clienteData, error: clienteError } = await this.supabase
    .from('clientes')
    .select('mesa_asignada')
    .eq('id_cliente', idCliente)
    .single();

    if (clienteError) throw new Error("❗❗Ocurrió un error al obtener mesa asignada: " + clienteError.message)

    const mesaId = clienteData?.mesa_asignada;
    
    // Si no tiene mesa asignada, retornamos null
    if (!mesaId) {
      console.log('Cliente sin mesa asignada');
      return null;
    }

    // Luego obtenemos el número de la mesa
    const { data: mesaData, error: mesaError } = await this.supabase
    .from('mesas')
    .select('numero')
    .eq('id', mesaId)
    .single();

    if (mesaError) {
      console.log('Error obteniendo número de mesa, usando ID:', mesaId);
      return mesaId; // Fallback al ID si no se puede obtener el número
    }

    const numeroMesa = mesaData?.numero || mesaId;
    console.log(numeroMesa);
    return numeroMesa;
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

  /**
 * Verifica que el QR escaneado corresponda a la mesa del cliente
 */
async verificarQRMesa(numeroMesaQR: number): Promise<{ valido: boolean, mensaje: string }> {
  try {
    const clienteId = await this.getClientId();
    const mesaAsignada = await this.getMesa(clienteId);

    // Verificar que el cliente tenga mesa asignada
    if (!mesaAsignada) {
      return {
        valido: false,
        mensaje: 'No tienes una mesa asignada. Espera a que el maître te asigne una.'
      };
    }

    // Verificar que el QR coincida con la mesa asignada
    if (numeroMesaQR !== mesaAsignada) {
      return {
        valido: false,
        mensaje: `Este es el QR de la Mesa ${numeroMesaQR}, pero tu mesa asignada es la ${mesaAsignada}.`
      };
    }

    // Verificar en la BD que todo esté correcto
    const { data: mesa, error } = await this.supabase
      .from('mesas')
      .select('*')
      .eq('numero', numeroMesaQR)
      .eq('cliente_asignado', clienteId)
      .maybeSingle();

    if (error || !mesa) {
      return {
        valido: false,
        mensaje: 'Error al verificar la mesa en la base de datos.'
      };
    }

    // Verificar que la mesa no esté disponible (debe estar ocupada por este cliente)
    if (mesa.disponible) {
      return {
        valido: false,
        mensaje: 'Inconsistencia: la mesa aparece como disponible.'
      };
    }

    return {
      valido: true,
      mensaje: `Mesa ${numeroMesaQR} verificada correctamente.`
    };

  } catch (error) {
    console.error('Error verificando QR de mesa:', error);
    return {
      valido: false,
      mensaje: 'Error al verificar el código QR.'
    };
  }
}
async liberarMesaCliente() {
  try {
    const clienteId = await this.getClientId();
    const numeroMesa = await this.getMesa(clienteId);

    if (!numeroMesa) {
      console.log('No hay mesa para liberar');
      return true;
    }

    // Actualizar la mesa
    const { error: errorMesa } = await this.supabase
      .from('mesas')
      .update({
        cliente_asignado: null,
        disponible: true
      })
      .eq('numero', numeroMesa);

    if (errorMesa) throw errorMesa;

    // Actualizar el cliente
    const { error: errorCliente } = await this.supabase
      .from('clientes')
      .update({ mesa_asignada: null })
      .eq('id_cliente', clienteId);

    if (errorCliente) throw errorCliente;

    console.log('Mesa liberada exitosamente');
    return true;
  } catch (error) {
    console.error('Error liberando mesa:', error);
    throw error;
  }
}

// =====================================
// MÉTODOS PARA HISTORIAL DE PEDIDOS
// =====================================

/**
 * Obtiene el historial de pedidos del cliente actual
 */
async getHistorialPedidos() {
  try {
    const clienteId = await this.getClientId();
    
    const { data, error } = await this.supabase
      .from('pedidos')
      .select(`
        *,
        mesa:mesas(numero, id),
        detalles_pedido(
          id,
          nombre_prod,
          cantidad,
          precio_unitario,
          tipo
        )
      `)
      .eq('id_cliente', clienteId)
      .order('fecha', { ascending: false });

    if (error) {
      console.error('❌ Error obteniendo historial de pedidos:', error);
      throw new Error('Error al obtener historial: ' + error.message);
    }

    console.log('✅ Historial de pedidos obtenido:', data);
    this._historialPedidos.set(data || []);
    return data || [];
  } catch (error) {
    console.error('Error en getHistorialPedidos:', error);
    throw error;
  }
}

/**
 * Suscripción en tiempo real a cambios en los pedidos del cliente
 */
async subscribeToHistorialPedidos() {
  try {
    const clienteId = await this.getClientId();
    
    const channel = this.supabase
      .channel('historial-pedidos-channel')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'pedidos',
          filter: `id_cliente=eq.${clienteId}`
        },
        async (payload) => {
          console.log('🔄 Cambio en pedidos detectado:', payload);
          
          // Emitir evento de cambio de pedido
          this.emitirEventoCambioPedido(payload);
          
          // Recargar todo el historial cuando hay cambios
          await this.getHistorialPedidos();
        }
      )
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'detalles_pedido'
        },
        async (payload) => {
          console.log('🔄 Cambio en detalles de pedido detectado:', payload);
          
          // Verificar si el cambio corresponde a un pedido del cliente
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          const pedidoId = newRecord?.id_pedido || oldRecord?.id_pedido;
          
          if (pedidoId) {
            const { data: pedido } = await this.supabase
              .from('pedidos')
              .select('id_cliente')
              .eq('id', pedidoId)
              .single();

            if (pedido?.id_cliente === clienteId) {
              await this.getHistorialPedidos();
            }
          }
        }
      )
      .subscribe();

    console.log('✅ Suscripción a historial de pedidos iniciada');
    return channel;
  } catch (error) {
    console.error('❌ Error suscribiéndose al historial:', error);
    throw error;
  }
}

/**
 * Obtiene los detalles de un pedido específico
 */
async getDetallesPedido(pedidoId: number) {
  try {
    const { data, error } = await this.supabase
      .from('detalles_pedido')
      .select('*')
      .eq('id_pedido', pedidoId)
      .order('id', { ascending: true });

    if (error) {
      console.error('❌ Error obteniendo detalles del pedido:', error);
      throw new Error('Error al obtener detalles: ' + error.message);
    }

    return data || [];
  } catch (error) {
    console.error('Error en getDetallesPedido:', error);
    throw error;
  }
}

/**
 * Formatea la fecha para mostrar en el historial
 */
formatearFecha(fecha: string): string {
  const date = new Date(fecha);
  const hoy = new Date();
  
  const opciones: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
  };

  const hora = date.toLocaleTimeString('es-AR', opciones);

  if (date.toDateString() === hoy.toDateString()) {
    return `Hoy ${hora}`;
  } else {
    return `${date.toLocaleDateString('es-AR')} ${hora}`;
  }
}

/**
 * Obtiene el color según el estado del pedido
 */
getColorEstado(estado: string): string {
  const colores: any = {
    pendiente: 'warning',
    confirmado: 'tertiary',
    en_preparacion: 'secondary',
    listo: 'success',
    entregado: 'primary',
    pagado: 'medium',
    cancelado: 'danger'
  };
  return colores[estado] || 'medium';
}

/**
 * Obtiene el texto formateado del estado
 */
getTextoEstado(estado: string): string {
  const textos: any = {
    pendiente: 'Pendiente',
    confirmado: 'Confirmado',
    en_preparacion: 'En preparación',
    listo: 'Listo para servir',
    entregado: 'Entregado',
    pagado: 'Pagado',
    cancelado: 'Cancelado'
  };
  return textos[estado] || estado;
}

/**
 * Emite evento de cambio de pedido para que los componentes puedan manejar notificaciones
 */
private emitirEventoCambioPedido(payload: any) {
  try {
    const evento = payload.eventType;
    const pedidoNuevo = payload.new;
    const pedidoAnterior = payload.old;

    let datosEvento = {
      tipo: 'PEDIDO_ACTUALIZADO',
      pedido: pedidoNuevo || pedidoAnterior,
      payload: payload,
      evento: evento,
      mensaje: this.generarMensajeNotificacion(evento, pedidoNuevo, pedidoAnterior)
    };

    // Emitir el evento
    this._pedidoEventos.next(datosEvento);
    console.log('📤 Evento de pedido emitido:', datosEvento);

  } catch (error) {
    console.error('❌ Error emitiendo evento de cambio de pedido:', error);
  }
}

/**
 * Genera el mensaje de notificación según el tipo de cambio
 */
private generarMensajeNotificacion(evento: string, pedidoNuevo: any, pedidoAnterior: any) {
  let titulo = '';
  let mensaje = '';

  switch (evento) {
    case 'INSERT':
      titulo = '🎉 ¡Nuevo Pedido Creado!';
      mensaje = `Tu pedido #${pedidoNuevo.id} ha sido registrado exitosamente.`;
      break;

    case 'UPDATE':
      const estadoAnterior = pedidoAnterior?.estado;
      const estadoNuevo = pedidoNuevo?.estado;

      if (estadoAnterior !== estadoNuevo) {
        switch (estadoNuevo) {
          case 'confirmado':
            titulo = '✅ Pedido Confirmado';
            mensaje = `Tu pedido #${pedidoNuevo.id} ha sido confirmado por el restaurante.`;
            break;
          case 'en_preparacion':
            titulo = '👨‍🍳 Preparando tu Pedido';
            mensaje = `Tu pedido #${pedidoNuevo.id} está siendo preparado en la cocina.`;
            break;
          case 'listo':
            titulo = '🍽️ ¡Pedido Listo!';
            mensaje = `Tu pedido #${pedidoNuevo.id} está listo para ser servido.`;
            break;
          case 'entregado':
            titulo = '🎊 Pedido Entregado';
            mensaje = `Tu pedido #${pedidoNuevo.id} ha sido entregado. ¡Que lo disfrutes!`;
            break;
          case 'pagado':
            titulo = '💳 Pago Registrado';
            mensaje = `El pago de tu pedido #${pedidoNuevo.id} ha sido procesado correctamente.`;
            break;
          case 'cancelado':
            titulo = '❌ Pedido Cancelado';
            mensaje = `Tu pedido #${pedidoNuevo.id} ha sido cancelado.`;
            break;
          default:
            titulo = '🔄 Pedido Actualizado';
            mensaje = `Tu pedido #${pedidoNuevo.id} ha sido actualizado.`;
        }
      } else {
        titulo = '🔄 Pedido Actualizado';
        mensaje = `Se han actualizado los detalles de tu pedido #${pedidoNuevo.id}.`;
      }
      break;

    case 'DELETE':
      titulo = '🗑️ Pedido Eliminado';
      mensaje = `Tu pedido #${pedidoAnterior.id} ha sido eliminado del sistema.`;
      break;

    default:
      titulo = '🔔 Actualización de Pedido';
      mensaje = 'Ha habido cambios en uno de tus pedidos.';
  }

  return { titulo, mensaje };
}
}
