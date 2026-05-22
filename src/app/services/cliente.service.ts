import { inject, Injectable, Injector, signal } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { Notification } from './notification';
import { TipoClienteService } from './tipo-cliente.service';
import { supabaseClient } from './auth'; // ✅ Importar instancia centralizada

@Injectable({
  providedIn: 'root',
})
export class ClienteService {
  // Signal compartido para el pedido
  private _pedido = signal<any[]>([]);
  // Signal para el estado de espera del cliente
  private _clienteEnEspera = signal<boolean>(false);
  // Signal para el historial de pedidos del cliente
  private _historialPedidos = signal<any[]>([]);
  // Signal para saber si es delivery
  private _esDelivery = signal<boolean>(false);
  // Siganl para direccion de delivery
  private _direccionDelivery = signal<string>('');

  private _mesaAsignada: number | null = null;

  private _juegosAccess = signal<boolean>(false);

  private _canPay = signal<boolean>(false);

  private supabase: SupabaseClient;
  
  private injector = inject(Injector);


  constructor(private tipoClienteService: TipoClienteService) {
    this.supabase = supabaseClient; // ✅ Usar instancia centralizada con persistencia
   }

  // Getter para acceso lazy al servicio de notificaciones
  private get notificationService(): Notification {
    return this.injector.get(Notification);
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

  // Getter para esDelivery
  get esDelivery() {
    return this._esDelivery;
  }

  // Getter para direccionDelivery
  get direccionDelivery() {
    return this._direccionDelivery;
  }

  get mesaAsignada() {
    return this._mesaAsignada;
  }

  get juegosAccess() {
    return this._juegosAccess;
  }

  get canPay() {
    return this._canPay;
  }


  setMesaAsignada(mesaId: number | null) {
    this._mesaAsignada = mesaId;
  }

  setJuegosAccess(accessed: boolean) {
    this._juegosAccess.set(accessed);
    if (accessed){
      localStorage.setItem('juegosAccess', 'true');
    }else{
      localStorage.setItem('juegosAccess', 'false');
    }
  }

  setCanPay(canPay: boolean) {
    this._canPay.set(canPay);
    if (canPay){
      localStorage.setItem('canPay', 'true');
    }else{
      localStorage.setItem('canPay', 'false');
    }
  }

  // Metodos para manejo del pedido

  // Flag para evitar que getRejectedOrder se ejecute más de una vez por sesión
  private _rejectedOrderChecked = false;

  async getCliente(userId: any) {
    const { data, error } = await this.supabase
      .from('clientes')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error('Error al obtener cliente: ' + error.message);
    }
    console.log("Usuario encontrado: ", data);
    return data;
  }

  async checkRejected(){
    const clienteId = await this.getClientId();
    const { data, error } = await this.supabase
    .from('pedidos')
    .select('*')
    .eq('id_cliente', clienteId)
    .eq('estado', 'rechazado');
    if (error) {
      throw new Error('Error al verificar pedidos rechazados: ' + error.message);
    }
    return data;
  }

  async getRejectedOrder(){
    const rejectedOrders = await this.checkRejected();
    if (rejectedOrders.length === 0) {
      return null;
    }

    const pedidoRechazado = rejectedOrders[0];

    try {
      const detalles = await this.getDetallesPedido(pedidoRechazado.id);

      if (detalles.length === 0) {
        await this.eliminarPedidoRechazado(pedidoRechazado.id);
        return null;
      }

      // Cargar items en el carrito PRIMERO
      const itemsParaPedido = detalles.map(detalle => ({
        id: detalle.id_item ?? detalle.id,
        nombre: detalle.nombre_prod,
        precio: detalle.precio_unitario,
        quantity: detalle.cantidad,
        subtotal: detalle.precio_unitario * detalle.cantidad,
        tipo: detalle.tipo
      }));

      this._pedido.set(itemsParaPedido);

      // Eliminar de la BD DESPUÉS de tener los items en memoria
      await this.eliminarPedidoRechazado(pedidoRechazado.id);

      return { pedido: pedidoRechazado, detalles: itemsParaPedido };

    } catch (error) {
      console.error("❌ Error al obtener detalles del pedido rechazado:", error);
      return null;
    }
  }

  async eliminarPedidoRechazado(pedidoId?: number) {
    try {
      let idPedido = pedidoId;
      
      // Si no se proporciona ID, obtener el pedido rechazado más reciente
      if (!idPedido) {
        const rejectedOrders = await this.checkRejected();
        if (rejectedOrders.length === 0) {
          console.log("✅ No hay pedidos rechazados para eliminar");
          return true;
        }
        idPedido = rejectedOrders[0].id;
      }

      // Primero eliminar los detalles del pedido
      const { data , error: errorDetalles } = await this.supabase
        .from('detalles_pedido')
        .delete()
        .eq('id_pedido', idPedido)
        .select();

      if (errorDetalles) {
        console.error('❌ Error eliminando detalles del pedido:', errorDetalles);
        throw errorDetalles;
      }
      console.log(data);

      // Luego eliminar el pedido principal
      const { error: errorPedido } = await this.supabase
        .from('pedidos')
        .delete()
        .eq('id', idPedido);

      if (errorPedido) {
        console.error('❌ Error eliminando pedido:', errorPedido);
        throw errorPedido;
      }

      console.log('✅ Pedido rechazado eliminado exitosamente:', idPedido);
      return true;
      
    } catch (error) {
      console.error('❌ Error al eliminar pedido rechazado:', error);
      return false;
    }
  }

  // Método auxiliar para verificar si hay pedidos rechazados pendientes
  async tienePedidoRechazado(): Promise<boolean> {
    try {
      const rejectedOrders = await this.checkRejected();
      return rejectedOrders.length > 0;
    } catch (error) {
      console.error('Error verificando pedidos rechazados:', error);
      return false;
    }
  }

  // Actualizar isDelivery
  setIsDelivery(esDelivery: boolean) {
    this._esDelivery.set(esDelivery);
    if (esDelivery) {
      localStorage.setItem('esDelivery', 'true');
    } else {
      localStorage.removeItem('esDelivery');
      this._direccionDelivery.set('');
      localStorage.removeItem('direccionDelivery');
    }
  }
  // Actualizar direccionDelivery
  setDireccionDelivery(direccion: string) {
    this._direccionDelivery.set(direccion);
    if (direccion) {
      localStorage.setItem('direccionDelivery', direccion);
    } else {
      localStorage.removeItem('direccionDelivery');
    }
  }

  // Agregar un item al pedido
  addItem(item: any) {
    const currentPedido = this._pedido();

    // Asegurar que el item tenga cantidad y subtotal
    const itemConSubtotal = {
      ...item,
      quantity: item.quantity || 1,
      subtotal: item.precio * (item.quantity || 1),
    };

    // Buscar si el item ya existe en el pedido (mismo id)
    const existingItemIndex = currentPedido.findIndex(
      (pedidoItem) => pedidoItem.id === item.id
    );

    if (existingItemIndex !== -1) {
      // Si existe, actualizar la cantidad y subtotal
      const updatedPedido = [...currentPedido];
      const newQuantity = updatedPedido[existingItemIndex].quantity + (item.quantity || 1);

      updatedPedido[existingItemIndex] = {
        ...updatedPedido[existingItemIndex],
        quantity: newQuantity,
        subtotal: updatedPedido[existingItemIndex].precio * newQuantity,
      };
      this._pedido.set(updatedPedido);
    } else {
      // Si no existe, agregarlo como nuevo item
      this._pedido.set([...currentPedido, itemConSubtotal]);
    }
  }

  exctractItem(item: any){
    const currentPedido = this._pedido();
    const itemIndex = currentPedido.findIndex(pedidoItem => pedidoItem.id === item.id);
    
    if (itemIndex !== -1) {
      const updatedPedido = [...currentPedido];
      const itemActual = updatedPedido[itemIndex];
      
      // Decrementar cantidad en 1
      const newQuantity = (itemActual.quantity || 1) - 1;
      
      if (newQuantity <= 0) {
        // Si la cantidad llega a 0, eliminar el item
        updatedPedido.splice(itemIndex, 1);
      } else {
        // Si no, actualizar la cantidad y subtotal
        updatedPedido[itemIndex] = {
          ...itemActual,
          quantity: newQuantity,
          subtotal: itemActual.precio * newQuantity
        };
      }
      
      this._pedido.set(updatedPedido);
    }else{
      console.log("No se encontro item");
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

  // Obtener el total del pedido CON descuento aplicado
async getTotal(id_pedido: number): Promise<number> {
  const subtotal = this._pedido().reduce((total, item) => {
    const itemTotal = item.subtotal || item.precio * (item.quantity || 1);
    return total + itemTotal;
  }, 0);

  try {
    const descuento = await this.getDescuentoCliente(id_pedido);
    
    if (descuento > 0) {
      const montoDescuento = subtotal * (descuento / 100);
      return subtotal - montoDescuento;
    }
    
    return subtotal;
  } catch (error) {
    console.error('Error calculando descuento:', error);
    return subtotal;
  }
}

// Método auxiliar para obtener solo el subtotal sin descuento
getSubtotal(): number {
  return this._pedido().reduce((total, item) => {
    const itemTotal = item.subtotal || item.precio * (item.quantity || 1);
    return total + itemTotal;
  }, 0);
}

  async getMontoDescuento(id_pedido: number): Promise<number> {
    const subtotal = this.getSubtotal();

    try {
      const descuento = await this.getDescuentoCliente(id_pedido);

      if (descuento > 0) {
        return subtotal * (descuento / 100);
      }

      return 0;
    } catch (error) {
      console.error('Error calculando monto descuento:', error);
      return 0;
    }
  }



  // Obtener la cantidad total de items en el pedido
  getItemCount(): number {
    return this._pedido().reduce(
      (count, item) => count + (item.quantity || 1),
      0
    );
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
      subtotal: updatedPedido[index].precio * newQuantity,
    };
    this._pedido.set(updatedPedido);
  }

  async insertPedido() {
    
    const esDelivery = this._esDelivery();
    const detalles = this._pedido();
    let idPedido: number | null = null;
    
    console.log('📋 Detalles del pedido:', detalles);

    if (!detalles || detalles.length === 0) {
      throw new Error('No hay items en el pedido');
    }

    const isAnonimo = this.tipoClienteService.isAnonimo();
    console.log('🎭 Es anónimo:', isAnonimo);

    let idCliente: number | null = null;
    let mesaId: number = this._mesaAsignada!;
    let nroMesa: number | null = null;

    if (isAnonimo) {
      // ✅ CLIENTE ANÓNIMO
      console.log('🎭 Procesando pedido de cliente anónimo');
      
      const clienteData = this.tipoClienteService.getClienteData();
      const idAnon = clienteData?.id_clienteanonimo ?? clienteData?.id_cliente;
      
      console.log('📊 Datos cliente anónimo:', {
        id_clienteanonimo: idAnon,
        mesa_asignada: clienteData?.mesa_asignada,
        nombre: clienteData?.nombre
      });

      if (!idAnon) {
        throw new Error('No se pudo obtener el ID del cliente anónimo');
      }

      mesaId = clienteData?.mesa_asignada;
      
      if (!mesaId) {
        throw new Error('Cliente anónimo sin mesa asignada');
      }

      // ✅ CRÍTICO: Para anónimos, id_cliente = NULL en tabla pedidos
      idCliente = null;
      
      // Obtener número de mesa para logs
      const { data: mesaData } = await this.supabase
        .from('mesas')
        .select('numero')
        .eq('id', mesaId)
        .single();
      
      nroMesa = mesaData?.numero || mesaId;
      
      console.log('✅ Datos para pedido anónimo:', {
        idCliente: 'NULL (anónimo)',
        idAnonimoReal: idAnon,
        mesaId,
        nroMesa
      });

      // ✅ CABECERA: id_cliente puede ser NULL para anónimos
      const cabecera: any = {
        mesa: mesaId,
        id_cliente: idCliente, // NULL para anónimos
        fecha: new Date().toISOString(),
        estado: 'pendiente',
        total: Math.round(this.getSubtotal())
      };
      
      const { data, error } = await this.supabase
        .from('pedidos')
        .insert([cabecera])
        .select();
      
      if (error) {
        throw new Error('Error al crear el pedido: ' + error.message);
      }
      
      if (!data || data.length === 0) {
        throw new Error('No se pudo obtener el ID del pedido');
      }
      
      idPedido = data[0].id;
      console.log('✅ Pedido anónimo insertado con ID:', idPedido);
    } 
    else if (isAnonimo === false && esDelivery === true) {
      // ✅ CLIENTE REGISTRADO - DELIVERY
      console.log('🚚 Procesando pedido de DELIVERY - cliente registrado');
      
      idCliente = await this.getClientId();
      const subtotal = this.getSubtotal();

      const deliveryValues = {
        id_cliente: idCliente,
        direccion: this._direccionDelivery(),
        estado: 'pendiente',
        subtotal: subtotal
      };

      const { data: deliveryData, error: deliveryError } = await this.supabase
        .from('pedidos_delivery')
        .insert([deliveryValues])
        .select();

      if (deliveryError) {
        throw new Error('Error al crear pedido de delivery: ' + deliveryError.message);
      }
      
      console.log('✅ Pedido de delivery creado:', deliveryData);
      idPedido = deliveryData[0].id;
      nroMesa = null; // No hay número de mesa en delivery
      
    } else if (isAnonimo === false && esDelivery === false) {
      // ✅ CLIENTE REGISTRADO - PEDIDO EN MESA
      console.log('👥 Procesando pedido en MESA - cliente registrado');
      
      idCliente = await this.getClientId();
      const subtotal = this.getSubtotal();

      // Obtener número de mesa
      const { data: mesaData } = await this.supabase
        .from('mesas')
        .select('numero')
        .eq('id', mesaId)
        .single();
      
      nroMesa = mesaData?.numero || mesaId;
      
      const cabecera: any = {
        mesa: mesaId,
        id_cliente: idCliente,
        fecha: new Date().toISOString(),
        estado: 'pendiente',
        total: Math.round(subtotal)
      };
      
      const { data, error } = await this.supabase
        .from('pedidos')
        .insert([cabecera])
        .select();
      
      if (error) {
        throw new Error('Error al crear el pedido: ' + error.message);
      }
      
      if (!data || data.length === 0) {
        throw new Error('No se pudo obtener el ID del pedido');
      }
      
      idPedido = data[0].id;
      console.log('✅ Pedido en mesa insertado con ID:', idPedido);
    } else {
      throw new Error('Configuración de pedido inválida: cliente no identificado correctamente');
    }
    
      

    // Insertar detalles del pedido
    const detallesPromises = detalles.map(async (item) => {
      console.log('🔄️ Insertando item:', {
      nombre: item.nombre,
      cantidad: item.quantity,
      precio: item.precio,
      tipo: item.tipo
    });

    if (!item.nombre || !item.quantity || !item.precio || !item.tipo) {
      console.error('❌ Item inválido:', item);
      throw new Error('Item con datos incompletos: ' + item.nombre);
    }

    const detalle = {
      id_pedido: idPedido!,
      nombre_prod: item.nombre,
      cantidad: item.quantity,
      precio_unitario: item.precio,
      tipo: item.tipo,
      es_delivery: esDelivery
    };

    console.log(detalle);

    const { data: detalleData, error: detalleError } = await this.supabase
      .from('detalles_pedido')
      .insert([detalle])
      .select();

    if (detalleError) {
      console.error('❌ Error insertando detalle:', detalleError);
      throw new Error('Error al insertar detalle: ' + detalleError.message);
    }

    console.log('✅ Detalle insertado correctamente');
    return detalleData;
    });

    await Promise.all(detallesPromises);

    console.log('✅ Todos los detalles insertados correctamente');

    // ✅ ENVIAR NOTIFICACIÓN AL MOZO
    try {
      if (!esDelivery){
        await this.notificationService.sendNotificationToPerfil(
          'mozo',
          '🍽️ Nuevo pedido',
          `Mesa ${nroMesa} - Pedido #${idPedido}${isAnonimo ? ' (Cliente anónimo)' : ''}`
        );
        console.log('✅ Notificación enviada al mozo');
      } else{
        await this.notificationService.sendNotificationToAdmins(
          '🍽️ Nuevo pedido de delivery',
          `Pedido #${idPedido} - Cliente ID: ${idCliente}`
        );
        console.log('✅ Notificación enviada a administradores');
      }
    } catch (notifError) {
      console.error('⚠️ Error enviando notificación:', notifError);
      // No fallar el pedido si falla la notificación
    }

    // Limpiar el pedido después de insertarlo
    this.clearPedido();
    
    if (!idPedido) {
      throw new Error('No se pudo crear el pedido');
    }
    
    return idPedido;
  }

  async   estadoUltimoPedido() {
    let pedido = null;
    const clienteId = await this.getClientId();
    if (this.tipoClienteService.isAnonimo()) {
      // ✅ CORRECCIÓN: Obtener mesa desde los datos del cliente, no de la variable privada
      const clienteData = this.tipoClienteService.getClienteData();
      const mesaAsignada = clienteData?.mesa_asignada;
      console.log("Mesa del cliente anonimo: ", mesaAsignada);
      
      if (!mesaAsignada) {
        console.log('Cliente anónimo sin mesa asignada');
        return null;
      }
      
      try {
        const { data } = await this.supabase
        .from('pedidos')
        .select('*')
        .eq('mesa', mesaAsignada)
        .order('fecha', { ascending: false })
        
        if (data?.length === 0 || !data) {
          console.log('No hay pedidos para esta mesa');
          return null;
        }

        pedido = data[0];

      } catch (e) {
        console.error('Error al verificar pedidos activos: ' + e);
      }
    } else {
      try {
        const { data } = await this.supabase
          .from('pedidos')
          .select('*')
          .eq('id_cliente', clienteId)
          .order('fecha', { ascending: false })
        
          if (data?.length === 0 || !data) {
            console.log('No hay pedidos para este cliente');
            return null;
          }
          // Verificar que sea del mismo día
          const hoy = new Date();
          const fechaPedido = new Date(data[0].fecha);
          const esMismoDia = hoy.toDateString() === fechaPedido.toDateString();
          
          if (esMismoDia){
            pedido = data[0];
          }else{
            console.log('No hay pedidos activos del día para este cliente');
          } 
  
        }catch ( e ){
          console.error('Error al verificar pedidos activos: ' + e);
        }
    }
    return pedido ? pedido.estado : null;
  }


  // Metodos del chat de consultas

  get client() {
  return this.supabase;
  }

  async getLastPedidoConDetalles(id_cliente:number) {
    const { data: pedido, error } = await this.supabase
    .from('pedidos')
    .select('*')
    .eq('id_cliente', id_cliente)
    .order('fecha', { ascending: false })
    .limit(1)
    .single();
    if (error) {
      throw new Error('Error al obtener el pedido: ' + error.message);
    }

    pedido.detalles_pedido = await this.getDetallesPedido(pedido.id);
    pedido.estado = this.normalizeEstado(pedido.estado);

    return pedido;
  }
  
  async getChatMessages() {
  try {
    const isAnonimo = this.tipoClienteService.isAnonimo();
    const clienteData = this.tipoClienteService.getClienteData();
    
    let nroMesa: number | null = null;

    if (isAnonimo) {
      const mesaId = clienteData?.mesa_asignada || null;
      
      if (!mesaId) {
        console.warn('⚠️ Cliente anónimo sin mesa');
        return [];
      }

      // ✅ CRÍTICO: Obtener el NÚMERO de mesa desde la tabla mesas
      const { data: mesaData, error: mesaError } = await this.supabase
        .from('mesas')
        .select('numero')
        .eq('id', mesaId)
        .single();

      if (mesaError || !mesaData) {
        console.error('❌ Error obteniendo número de mesa:', mesaError);
        return [];
      }

      nroMesa = mesaData.numero;
      console.log('🎭 Cliente anónimo - Mesa ID:', mesaId, '→ Número:', nroMesa);
      
    } else {
      const clienteId = await this.getClientId();
      nroMesa = await this.getNroMesa(clienteId);
      
      console.log('👤 Cliente registrado - Mesa número:', nroMesa);
    }
    
    if (!nroMesa) {
      console.warn('⚠️ No se pudo obtener número de mesa');
      return [];
    }

    const nombreCliente = isAnonimo 
      ? clienteData?.nombre 
      : await this.getNombreCliente();
    
    console.log('📋 Cargando mensajes para:', {
      cliente: nombreCliente,
      nroMesa: nroMesa,
      isAnonimo
    });
    
    const { data, error } = await this.supabase
      .from('mensajes')
      .select('*')
      .eq('nroMesa', nroMesa)
      .order('date_sended', { ascending: true });

    if (error) {
      console.error('❌ Error obteniendo mensajes:', error);
      return [];
    }

    console.log('✅ Mensajes obtenidos de la mesa', nroMesa, ':', data?.length || 0);
    
    if (data && data.length > 0) {
      console.log('📝 Primeros mensajes:', data.slice(0, 3));
    }
    
    return data || [];
  } catch (error) {
    console.error('❌ Error en getChatMessages:', error);
    return [];
  }
}

async sendMessage(contenido: string): Promise<void> {
  try {
    const isAnonimo = this.tipoClienteService.isAnonimo();
    const clienteData = this.tipoClienteService.getClienteData();

    let nombreUsuario = '';
    let nroMesa: number | null = null;

    if (isAnonimo) {
      nombreUsuario = clienteData?.nombre || 'Cliente Anónimo';
      const mesaId = clienteData?.mesa_asignada || null;

      if (!mesaId) {
        console.error('❌ No se puede enviar mensaje: el cliente anónimo no tiene mesa asignada');
        return;
      }

      const { data: mesaData, error: mesaError } = await this.supabase
        .from('mesas')
        .select('numero')
        .eq('id', mesaId)
        .single();

      if (mesaError || !mesaData) {
        console.error('❌ No se pudo obtener el número de mesa para el cliente anónimo:', mesaError);
        return;
      }

      nroMesa = mesaData.numero;
    } else {
      nombreUsuario = await this.getNombreCliente();
      const clienteId = await this.getClientId();
      nroMesa = await this.getNroMesa(clienteId);
    }

    if (!nroMesa) {
      console.error('❌ No se puede enviar mensaje: el cliente no tiene mesa asignada');
      return;
    }

    const { error } = await this.supabase
      .from('mensajes')
      .insert({
        contenido,
        nombre_usuario: nombreUsuario,
        nroMesa,
        date_sended: new Date().toISOString()
      });

    if (error) {
      console.error('❌ Error insertando mensaje:', error);
      throw error;
    }

    console.log(`✅ Mensaje enviado correctamente por ${isAnonimo ? 'cliente anónimo' : 'cliente registrado'} a mesa ${nroMesa}`);
  } catch (err) {
    console.error('❌ Error en sendMessage():', err);
    throw err;
  }
}


  async subscribeToNewMessages(signal: any) {
    try {
      this.supabase
        .channel('custom-messages-channel')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'mensajes' },
          (payload) => {
            console.log('Nuevo mensaje recibido:', payload);
            const newRow = payload.new;
            signal.update((arr: any) => {
              return [...arr, newRow];
            });
          }
        )
        .subscribe();
    } catch (error) {
      console.error('Error al suscribirse a nuevos mensajes: ' + error);
    }
  }

  // Buscar el id del ultimo pedido realizado por delivery (para el chat)
  async getIdLastPedido() {
    const clienteId = await this.getClientId();
    const { data, error } = await this.supabase
      .from('pedidos_delivery')
      .select('id')
      .eq('id_cliente', clienteId)
      .order('id', { ascending: false })
      .limit(1)
      .single();
    if (error) {
      throw new Error('Error al obtener el último pedido: ' + error.message);
    }

    console.log("ID del ultimo pedido a delivery: ", data);

    return data.id as number;
  }

  async sendMessageToDelivery(contenido: string, idPedido: number) {
    try {
      const clienteId = await this.getClientId();
      const toInsert = {
        mensaje: contenido,
        id_pedido: idPedido,
        id_cliente: clienteId,
        created_at: new Date().toISOString()
      }
      const { error } = await this.supabase
        .from('chats_delivery')
        .insert([toInsert]);
      if (error) {
        throw new Error('Error al enviar mensaje: ' + error.message);
      }     

      this.notificationService.sendNotificationToPerfil(
        'delivery',
        `💬 Nuevo mensaje del pedido ${idPedido}`,
        contenido,
        ''
      )

    }catch(e){
      throw new Error('Error al enviar mensaje: ' + e);
    }
  }


  // Metodos para manejo de clientes

  async getClientId(): Promise<number> {
    // ✅ Verificar si es anónimo
    if (this.tipoClienteService.isAnonimo()) {
      const clienteData = this.tipoClienteService.getClienteData();
      const idAnonimo = clienteData?.id_clienteanonimo ?? clienteData?.id_cliente;
      
      if (idAnonimo) {
        console.log('✅ ID Cliente Anónimo:', idAnonimo);
        return idAnonimo;
      }
      
      throw new Error('No se pudo obtener el ID del cliente anónimo');
    }
    
    // ✅ Si es registrado, usar getSession() para mayor confiabilidad
    const { data: sessionData, error: sessionError } = await this.supabase.auth.getSession();
    
    if (sessionError || !sessionData?.session?.user?.id) {
      console.error('❌ Error obteniendo sesión:', sessionError);
      throw new Error('Usuario no autenticado o sesión expirada');
    }
    
    const userid = sessionData.session.user.id;
    console.log('✅ User ID:', userid);
    
    const { data: clientes, error } = await this.supabase
      .from('clientes')
      .select('id_cliente')
      .eq('user_id', userid);

    if (error) {
      throw new Error('Error al obtener id del cliente: ' + error.message);
    }

    if (!clientes || clientes.length === 0) {
      throw new Error('No se encontró cliente registrado con este usuario');
    }

    const id = clientes[0].id_cliente;
    console.log('✅ ID Cliente Registrado:', id);
    return id ?? -1;
  }

  async getNombreCliente(): Promise<string> {
  try {
    if (this.tipoClienteService.isAnonimo()) {
      const clienteData = this.tipoClienteService.getClienteData();
      const nombre = clienteData?.nombre || 'Cliente Anónimo';
      console.log('✅ Nombre Cliente Anónimo:', nombre);
      return nombre;
    }

    const userid = await this.getClientId();
    const { data, error } = await this.supabase
      .from('clientes')
      .select('nombre')
      .eq('id_cliente', userid)
      .single();

    if (error) {
      throw new Error('Error al obtener nombre del cliente: ' + error.message);
    }

    console.log('✅ Nombre Cliente Registrado:', data.nombre);
    return data.nombre ?? 'Cliente';
  } catch (error) {
    console.error('❌ Error en getNombreCliente:', error);
    return 'Cliente';
  }
}

  async getClientesEnEspera() {
    try {
      const { data, error } = await this.supabase
        .from('clientes')
        .select('*')
        .is('mesa_asignada', null);

      if (error) {
        throw new Error(
          'Error al obtener clientes en espera: ' + error.message
        );
      }

      console.log('clientes en espera:', data);

      return data ?? [];
    } catch (err: any) {
      console.error('Error en getClientesEnEspera:', err);
      throw new Error(err.message || 'Error desconocido');
    }
  }

  async detectarUpdate(callback?: (enEspera: boolean) => void) {
  // ✅ VERIFICAR: Solo para clientes registrados
  if (this.tipoClienteService.isAnonimo()) {
    console.log('🎭 Cliente anónimo - detectarUpdate no necesario');
    return null;
  }

  const channels = this.supabase.channel('custom-update-channel')
  .on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'clientes' },
    async (payload) => {
      console.log('🔄 Update detectado en clientes:', payload);
      
      try {
        const oldRecord = payload.old as any;
        const newRecord = payload.new as any;
        
        // Verificar si este cambio es para el cliente actual
        const { data: sessionData, error: sessionError } = await this.supabase.auth.getSession();
        
        if (sessionError || !sessionData?.session?.user?.id) {
          console.error('❌ Error obteniendo sesión:', sessionError);
          return;
        }
        
        const currentUserId = sessionData.session.user.id;
        if (newRecord?.user_id === currentUserId) {
          
          // Verificar si se asignó una mesa (de null a un número)
          if (oldRecord?.mesa_asignada === null && newRecord?.mesa_asignada !== null) {
            try {
              const numeroMesa = await this.getNroMesa(newRecord.id_cliente);
              await this.notificationService.sendNotificationToCliente(
                '🎉 ¡Mesa asignada!',
                `Te hemos asignado la mesa ${numeroMesa}. ¡Ya puedes realizar tu pedido!`,
                ''
              );
              console.log('✅ Notificación de mesa asignada enviada');
            } catch (error) {
              console.error('❌ Error enviando notificación de mesa:', error);
            }
          }
          
          // Verificar si se liberó una mesa (de un número a null)
          if (oldRecord?.mesa_asignada !== null && newRecord?.mesa_asignada === null) {
            try {
              await this.notificationService.sendNotificationToCliente(
                'Mesa liberada',
                'Tu mesa ha sido liberada. Gracias por visitarnos.',
                ''
              );
              console.log('✅ Notificación de mesa liberada enviada');
            } catch (error) {
              console.error('❌ Error enviando notificación de liberación:', error);
            }
          }
        }
        
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

  async isCLienteEnEspera() {
  // ✅ VERIFICAR: Solo para clientes registrados
  if (this.tipoClienteService.isAnonimo()) {
    console.log('🎭 Cliente anónimo - no usar isCLienteEnEspera');
    return false;
  }

  const { data: sessionData, error: sessionError } = await this.supabase.auth.getSession();
  
  if (sessionError || !sessionData?.session?.user?.id) {
    console.error('❌ Error obteniendo sesión:', sessionError);
    return false;
  }
  const cliente = await this.getCliente(sessionData.session.user.id);
  const { data, error } = await this.supabase
    .from('lista_espera')
    .select('*')
    .eq('estado', 'esperando')

  if (error) {
    console.error('❌ Error al verificar cliente en espera:', error);
    return false;
  }
  // Inicialmente asumir que no está en espera
  let bool = false;
  // Si hay datos verificar que el cliente esté en la lista de espera
  if (data && data.length > 0) {
    // Si encuentra un item con el nombre del cliente, entonces está en espera
    bool = data.some((item) => item.nombre_cliente === `${cliente.nombre} ${cliente.apellido}`);
  }
  console.log('👤 Cliente registrado en espera:', bool);
  this._clienteEnEspera.set(bool);

  return bool;
}

  async subscribeToClienteEnEspera(signal: any) {
    // ✅ VERIFICAR: Solo para clientes registrados
    if (this.tipoClienteService.isAnonimo()) {
      console.log('🎭 Cliente anónimo - subscribeToClienteEnEspera no necesario');
      return null;
    }

    try {
      const { data: { session }, error: sessionError } = await this.supabase.auth.getSession();
      if (sessionError || !session?.user?.id) {
        console.error('❌ No se pudo obtener sesión para suscripción de cliente en espera:', sessionError);
        return null;
      }

      const cliente = await this.getCliente(session.user.id);
      const nombreCompleto = `${cliente.nombre} ${cliente.apellido}`;
      
      // ✅ Crear filter con nombre correctamente escapado
      const filtro = `nombre_cliente=eq.${encodeURIComponent(nombreCompleto)}`;
      
      const channel = this.supabase
        .channel(`cliente-en-espera-${cliente.id_cliente}`)
        // ✅ ESCUCHAR INSERT: Cuando se agrega a la lista de espera
        .on(
          'postgres_changes',
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'lista_espera', 
            // filter: filtro
          },
          (payload) => {
            console.log('✅ INSERT detectado en lista_espera - Cliente agregado a la lista:', payload);
            const estado = payload.new?.['estado'];
            // Cuando se inserta, asumir que está en espera
            const enEspera = estado === 'esperando' || true;
            console.log('🎯 Cliente en espera actualizado a:', enEspera);
            signal.set(enEspera);
          }
        )
        // ✅ ESCUCHAR UPDATE: Cuando cambia el estado
        .on(
          'postgres_changes',
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'lista_espera', 
            // filter: filtro
          },
          (payload) => {
            console.log('🔄 UPDATE detectado en lista_espera - Estado cambiado:', payload);
            const estadoAnterior = payload.old?.['estado'];
            const estadoNuevo = payload.new?.['estado'];
            const enEspera = estadoNuevo === 'esperando';
            
            console.log('📊 Cambio de estado:', {
              anterior: estadoAnterior,
              nuevo: estadoNuevo,
              enEsperaAhora: enEspera
            });
            
            signal.set(enEspera);
          }
        )
        .subscribe();
      
      console.log('✅ Suscripción a cliente en espera iniciada para:', nombreCompleto);
      console.log('📡 Escuchando: INSERT y UPDATE en tabla lista_espera');
      return channel;
    } catch (error) {
      console.error('❌ Error subscribing to cliente en espera:', error);
      return null;
    }
  }

  // Metodos para manejo de mesas

  async isMesaDisponible(nro: number) {
    const { data, error } = await this.supabase
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

  async actualizarMesa(cliente_id: number, mesa_numero: number) {
    console.log('🔄 Actualizando mesa:', { cliente_id, mesa_numero });

    const { data, error } = await this.supabase
      .from('mesas')
      .update({
        cliente_asignado: cliente_id,
        disponible: false,
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

 async getMesaID(idCliente: number): Promise<number | null> {
  try {
    console.log('🔍 getMesaID para cliente:', idCliente);
    
    if (this.tipoClienteService.isAnonimo()) {
      console.log('🎭 Buscando mesa para cliente anónimo');
      
      const { data, error } = await this.supabase
        .from('clientes_anonimos')
        .select('mesa_asignada')
        .eq('id_clienteanonimo', idCliente)
        .single();

      if (error) {
        console.error('❌ Error obteniendo mesa de anónimo:', error);
        return null;
      }

      console.log('✅ Mesa ID (anónimo):', data?.mesa_asignada);
      return data?.mesa_asignada ?? null;
    }

    // Cliente registrado
    console.log('👥 Buscando mesa para cliente registrado');
    
    const { data, error } = await this.supabase
      .from('clientes')
      .select('mesa_asignada')
      .eq('id_cliente', idCliente)
      .single();

    if (error) {
      console.error('❌ Error obteniendo mesa de registrado:', error);
      throw new Error('Error al obtener mesa asignada: ' + error.message);
    }

    console.log('✅ Mesa ID (registrado):', data?.mesa_asignada);
    return data?.mesa_asignada ?? null;
  } catch (error) {
    console.error('❌ Error en getMesaID:', error);
    return null;
  }
}


  async getNroMesa(idCliente: number): Promise<number | null> {
  try {
    const mesaId = await this.getMesaID(idCliente);
    
    if (!mesaId) {
      console.log('⚠️ Cliente sin mesa asignada');
      return null;
    }

    // Obtener número de mesa desde tabla mesas
    const { data: mesaData, error: mesaError } = await this.supabase
      .from('mesas')
      .select('numero')
      .eq('id', mesaId)
      .single();

    if (mesaError) {
      console.log('⚠️ Error obteniendo número de mesa, usando ID:', mesaId);
      return mesaId;
    }

    const numeroMesa = mesaData?.numero || mesaId;
    console.log('✅ Número de mesa:', numeroMesa);
    return numeroMesa;
  } catch (error) {
    console.error('❌ Error en getNroMesa:', error);
    return null;
  }
}

  async setMesa(id: number, nroMesa: number) {
    try {
      console.log('🔄 Iniciando asignación de mesa:', {
        clienteId: id,
        mesaId: nroMesa,
      });

      // Comprobar disponibilidad (con await)
      await this.isMesaDisponible(nroMesa);
      console.log('✅ Mesa disponible verificada');

      // Actualizar cliente
      const { data, error } = await this.supabase
        .from('clientes')
        .update({ mesa_asignada: nroMesa })
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
  async liberarMesaCliente(nroMesa?: number, clientId?: number) {
    try {
      const clienteId = clientId || (await this.getClientId());
      const mesaId = await this.getMesaID(clienteId);
      const numeroMesa = nroMesa || (await this.getNroMesa(clienteId));

      if (!numeroMesa) {
        console.log('No hay mesa para liberar');
        return true;
      }

      // Actualizar la mesa
      const { error: errorMesa } = await this.supabase
        .from('mesas')
        .update({
          cliente_asignado: null,
          disponible: true,
        })
        .eq('numero', numeroMesa);

      if (errorMesa) throw errorMesa;

      // Actualizar el cliente
      const { error: errorCliente } = await this.supabase
        .from('clientes')
        .update({ mesa_asignada: null })
        .eq('id_cliente', clienteId);

      if (errorCliente) throw errorCliente;

      // Resetear descuento obtenido en juegos al liberar la mesa
      if (mesaId) {
        const { error: errorDescuento } = await this.supabase
          .from('juegos_descuentos')
          .delete()
          .eq('mesa_id', mesaId)
          .eq('cliente_id', clienteId);

        if (errorDescuento) {
          console.error('Error reseteando descuento de juegos:', errorDescuento);
        } else {
          console.log('✅ Descuento de juegos reseteado');
        }
      }

      console.log('Mesa liberada exitosamente');
      return true;
    } catch (error) {
      console.error('Error liberando mesa:', error);
      throw error;
    }
  }

  // seccion juegos descuentos
  async getEstadoJuegos(mesaId: number | null, clienteId: number) {
    try {
      const { data, error } = await this.supabase
        .from('juegos_descuentos')
        .select('*')
        .eq('mesa_id', mesaId)
        .eq('cliente_id', clienteId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 es "no rows returned"
        console.error('Error obteniendo estado de juegos:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error en getEstadoJuegos:', error);
      return null;
    }
  }

  async guardarDescuentoJuego(
    mesaId: number | null,
    clienteId: number,
    descuento: number
  ) {
    try {
      const { data, error } = await this.supabase
        .from('juegos_descuentos')
        .upsert(
          {
            mesa_id: mesaId,
            cliente_id: clienteId,
            descuento_obtenido: descuento,
            primer_intento_usado: true,
            fecha: new Date().toISOString(),
          }
        )
        .select();

      if (error) {
        console.error('Error guardando descuento:', error);
        throw error;
      }

      console.log('✅ Descuento guardado correctamente:', data);
      return data;
    } catch (error) {
      console.error('Error en guardarDescuentoJuego:', error);
      throw error;
    }
  }

  async marcarPrimerIntentoUsado(mesaId: number | null, clienteId: number) {
    try {
      const { data, error } = await this.supabase
        .from('juegos_descuentos')
        .upsert(
          {
            mesa_id: mesaId,
            cliente_id: clienteId,
            descuento_obtenido: 0,
            primer_intento_usado: true,
            fecha: new Date().toISOString(),
          }
        )
        .select();

      if (error) {
        console.error('Error marcando primer intento usado:', error);
        throw error;
      }

      console.log('✅ Primer intento marcado como usado');
      return data;
    } catch (error) {
      console.error('Error en marcarPrimerIntentoUsado:', error);
      throw error;
    }
  }

  // Buscar descuento por PEDIDO (para aplicar al total del pedido)
  async getDescuentoCliente(pedido_id: number): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('juegos_descuentos')
        .select('descuento_obtenido')
        .eq('id_pedido', pedido_id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error obteniendo descuento del cliente:', error);
        return 0;
      }

      return data?.descuento_obtenido || 0;
    } catch (error) {
      console.error('Error en getDescuentoCliente:', error);
      return 0;
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
    const isAnonimo = this.tipoClienteService.isAnonimo();
    const clienteData = this.tipoClienteService.getClienteData();
    
    console.log('📋 getHistorialPedidos llamado:', {
      isAnonimo,
      clienteData
    });

    let mesaId: number | null = null;
    let pedidos: any[] = [];

    if (isAnonimo) {
      mesaId = clienteData?.mesa_asignada || null;
      
      if (!mesaId) {
        console.warn('⚠️ Cliente anónimo sin mesa asignada');
        this._historialPedidos.set([]);
        return [];
      }

      console.log('🎭 Buscando pedidos de cliente anónimo en mesa:', mesaId);

      const { data, error } = await this.supabase
        .from('pedidos')
        .select(`
          *,
          mesa:mesas(numero, id)
        `)
        .eq('mesa', mesaId)
        .is('id_cliente', null)
        .neq('estado', 'rechazado')
        .order('fecha', { ascending: false });

      if (error) {
        console.error('❌ Error obteniendo historial anónimo:', error);
        throw new Error('Error al obtener historial: ' + error.message);
      }

      pedidos = data || [];
    } else {
      const clienteId = await this.getClientId();
      console.log('👤 Buscando pedidos de cliente registrado:', clienteId);

      const { data: pedidosData, error } = await this.supabase
        .from('pedidos')
        .select(`
          *,
          mesa:mesas(numero, id)
        `)
        .eq('id_cliente', clienteId)
        .neq('estado', 'rechazado')
        .order('fecha', { ascending: false });

      if (error) {
        console.error('❌ Error obteniendo historial registrado:', error);
        throw new Error('Error al obtener historial: ' + error.message);
      }

      pedidos = pedidosData || [];
    }

    if (pedidos.length > 0) {
      await Promise.all(pedidos.map(async pedido => {
        pedido.estado = this.normalizeEstado(pedido.estado);
        pedido.detalles_pedido = await this.getDetallesPedido(pedido.id);
      }));
    }

    console.log('✅ Historial obtenido:', pedidos.length, 'pedidos');
    console.log('📦 Datos completos:', pedidos);

    this._historialPedidos.set(pedidos);
    return pedidos;
  } catch (error) {
    console.error('❌ Error en getHistorialPedidos:', error);
    throw error;
  }
}

async getPedidoActivo(){
  try {
    const isAnonimo = this.tipoClienteService.isAnonimo();
    const clienteData = this.tipoClienteService.getClienteData();
    let pedido: any = null;

    if (isAnonimo) {
      const mesaId = clienteData?.mesa_asignada || null;
      if (!mesaId) {
        console.warn('⚠️ Cliente anónimo sin mesa asignada');
        return null;
      }
    }
      const clienteId = await this.getClientId();
      const { data, error } = await this.supabase
        .from('pedidos')
        .select(
          `id, estado, fecha, total, tiempo_estimado,
            detalles_pedido:detalles_pedido(nombre_prod, cantidad, precio_unitario, tipo)
          `)
        .eq('id_cliente', clienteId)
        .neq('estado', 'rechazado')
        .order('fecha', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        throw new Error('Error al obtener pedido activo: ' + error.message);
      }
      if (!data) {
        console.log('⚠️ No se encontró pedido activo para el cliente');
        return null;
      }

      pedido = data || null;
      console.log("Pedido recuperado: ", pedido);

      // Agregar las imagenes a detalles del pedido
      if (pedido.detalles_pedido && pedido.detalles_pedido.length > 0) {
        await Promise.all(pedido.detalles_pedido.map(async (detalle: any) => {
          detalle.imagen = await this.getImagenDetalles(detalle.tipo, detalle.nombre_prod);
        }));
      }
      return pedido;
    }catch ( e ){
      console.error('❌ Error en getPedidoActivo:', e);
      return null;
    }

}

async confirmarPedido(){
  try {
    const pedido = await this.getPedidoActivo();

    if (!pedido) {
      console.warn('⚠️ No hay pedido activo para confirmar');
      return;
    }

    if (pedido.estado == 'entregado') {
      const { data, error } = await this.supabase
        .from('pedidos')
        .update({ estado: 'entrega_confirmada' })
        .eq('id', pedido.id)
        .select();
      if (error) {
        throw new Error('Error al confirmar entrega: ' + error.message);
      }
      console.log('✅ Pedido', data[0].id, ' confirmado:', data[0].estado);
    }

  } catch (e) {
    console.error('❌ Error en confirmarPedido:', e);
  }
}

async getImagenDetalles(tipo: 'plato' | 'bebida', nombre_prod: string) {
  try {
    const sector = tipo === 'plato' ? 'platos' : 'bebidas';
    const { data, error } = await this.supabase
      .from(sector)
      .select('imagenes')
      .eq('nombre', nombre_prod)

    if (error) {
      console.error(`❌ Error obteniendo imagen para ${tipo} "${nombre_prod}":`, error);
      return null;
    }
    if (!data || data.length === 0) {
      console.warn(`⚠️ No se encontró ${tipo} con nombre "${nombre_prod}"`);
      return null;
    }
    let imagenes = data;

    imagenes = imagenes[0]?.imagenes.split(',')[0].trim() || null; 

    console.log(`✅ Imagen obtenida para ${tipo} "${nombre_prod}":`, imagenes[0]);
    return imagenes;
  } catch (e) {
    console.error('❌ Error en getImagenDetalles:', e);
    return null;
  }
}

/**
   * Solicita la cuenta para el pedido actual
   */
  async solicitarCuenta(pedidoId: number) {
    try {
      const { data, error } = await this.supabase
        .from('pedidos')
        .update({ estado: 'cuenta_solicitada' })
        .eq('id', pedidoId)
        .select();

      if (error) throw error;

      console.log('✅ Cuenta solicitada:', data);
      return data;
    } catch (error) {
      console.error('❌ Error solicitando cuenta:', error);
      throw error;
    }
  }


/**
 * Suscripción en tiempo real a cambios en los pedidos del cliente
 * @param onPedidosChanged Callback a ejecutar cuando hay cambios en pedidos
 */
async subscribeToHistorialPedidos(onPedidosChanged?: () => Promise<void>) {
  try {
    const isAnonimo = this.tipoClienteService.isAnonimo();
    const clienteData = this.tipoClienteService.getClienteData();
    
    let filtro: string;
    let canalNombre: string;

    if (isAnonimo) {
      // ✅ ANÓNIMO: Suscribirse a cambios por MESA
      const mesaId = clienteData?.mesa_asignada;
      
      if (!mesaId) {
        console.warn('⚠️ Cliente anónimo sin mesa, no se puede suscribir');
        return null;
      }

      filtro = `mesa=eq.${mesaId}`;
      canalNombre = `historial-pedidos-anonimo-mesa-${mesaId}`;
      
      console.log('🎭 Suscripción anónimo por mesa:', mesaId);

    } else {
      // ✅ REGISTRADO: Suscribirse a cambios por ID_CLIENTE
      const clienteId = await this.getClientId();
      
      filtro = `id_cliente=eq.${clienteId}`;
      canalNombre = `historial-pedidos-cliente-${clienteId}`;
      
      console.log('👤 Suscripción registrado por cliente:', clienteId);
    }
    
    const channel = this.supabase
      .channel(canalNombre)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'pedidos',
          filter: filtro
        },
        async (payload) => {
          console.log('🔄 Cambio en pedidos detectado:', payload);
          
          const oldRecord = payload.old as any;
          const newRecord = payload.new as any;
          
          // Verificar si cambió el estado
          if (oldRecord?.estado !== newRecord?.estado) {
            const estadoTexto = this.getTextoEstado(newRecord.estado);
            
            // Enviar notificación
            try {
              const mesaNumero = isAnonimo 
                ? clienteData?.mesa_asignada 
                : await this.getNroMesa(await this.getClientId());

              await this.notificationService.sendNotificationToCliente(
                `Estado de tu pedido`,
                `Tu pedido #${newRecord.id} cambió a: ${estadoTexto}`,
                ''
              );
              console.log('✅ Notificación de cambio de estado enviada');
            } catch (error) {
              console.error('❌ Error enviando notificación:', error);
            }
          }
          
          // Recargar historial
          await this.getHistorialPedidos();
          
          // ✅ Ejecutar callback si se proporciona para recalcular accesos
          if (onPedidosChanged) {
            try {
              await onPedidosChanged();
              console.log('✅ Callback de cambio de pedidos ejecutado');
            } catch (error) {
              console.error('❌ Error en callback de cambio de pedidos:', error);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pedidos', filter:filtro },
        async (payload) => {
          console.log('🆕 Nuevo pedido detectado:', payload);
          // Recargar historial
          
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
    const { data: detalles, error } = await this.supabase
      .from('detalles_pedido')
      .select('*')
      .eq('id_pedido', pedidoId)
      .eq('es_delivery', false)
      .order('id', { ascending: true })

    if (error) {
      console.error('❌ Error obteniendo detalles del pedido:', error);
      throw new Error('Error al obtener detalles: ' + error.message);
    }

    return detalles || [];
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
    estado = this.normalizeEstado(estado);
    const colores: any = {
      pendiente: 'warning',
      confirmado: 'tertiary',
      en_preparacion: 'secondary',
      listo: 'success',
      entregado: 'primary',
      cuenta_solicitada: 'medium',
      pago_pendiente: 'warning',
      pagado: 'success',
      cancelado: 'danger'
    };
    return colores[estado] || 'medium';
  }

/**
 * Obtiene el texto formateado del estado
 */
getTextoEstado(estado: string): string {
    estado = this.normalizeEstado(estado);
    const textos: any = {
      pendiente: 'Pendiente',
      confirmado: 'Confirmado',
      en_preparacion: 'En preparación',
      listo: 'Listo para servir',
      entregado: 'Entregado',
      cuenta_solicitada: 'Cuenta solicitada',
      pago_pendiente: 'Pago pendiente',
      pagado: 'Pagado',
      cancelado: 'Cancelado'
    };
    return textos[estado] || estado;
  }

normalizeEstado(estado: string): string {
    if (!estado) return '';
    return String(estado)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ñ/g, 'n')
      .replace(/\s+/g, '_')
      .toLowerCase();
  }

  async debugPedidoData() {
  try {
    const idCliente = await this.getClientId();
    const mesaId = await this.getMesaID(idCliente);
    const nroMesa = await this.getNroMesa(idCliente);
    const nombre = await this.getNombreCliente();
    const esAnonimo = this.tipoClienteService.isAnonimo();
    
    console.log('🐛 DEBUG - Datos del pedido:', {
      idCliente,
      mesaId,
      nroMesa,
      nombre,
      esAnonimo,
      pedido: this._pedido()
    });
    
    // Verificar que la mesa existe en la BD
    if (mesaId) {
      const { data: mesa, error } = await this.supabase
        .from('mesas')
        .select('*')
        .eq('id', mesaId)
        .single();
        
      console.log('🐛 Mesa en BD:', mesa);
      console.log('🐛 Error (si existe):', error);
    }
    
  } catch (error) {
    console.error('🐛 Error en debug:', error);
  }
}
}