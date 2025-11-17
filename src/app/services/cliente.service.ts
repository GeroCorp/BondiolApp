import { inject, Injectable, Injector, signal } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from 'src/environments/environment';
import { Notification } from './notification';
import { TipoClienteService } from './tipo-cliente.service';

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
  private supabase: SupabaseClient;
  
  private injector = inject(Injector);


  constructor(private tipoClienteService: TipoClienteService) {
    this.supabase = createClient(
      environment.SUPABASE_URL,
      environment.SUPABASE_ANON_KEY
    );
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

  // Metodos para manejo del pedido

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
      console.log("✅ No se obtuvieron pedidos rechazados");
      return null;
    }

    // Tomar el pedido rechazado más reciente
    const pedidoRechazado = rejectedOrders[0];
    console.log("📋 Pedido rechazado encontrado:", pedidoRechazado);

    try {
      // Obtener los detalles del pedido rechazado
      const detalles = await this.getDetallesPedido(pedidoRechazado.id);
      
      if (detalles.length === 0) {
        console.log("⚠️ No se encontraron detalles para el pedido rechazado");
        return null;
      }

      // Convertir los detalles al formato esperado por _pedido
      const itemsParaPedido = detalles.map(detalle => ({
        id: `${detalle.nombre_prod}_${Date.now()}`, // ID único temporal
        nombre: detalle.nombre_prod,
        precio: detalle.precio_unitario,
        quantity: detalle.cantidad,
        subtotal: detalle.precio_unitario * detalle.cantidad,
        tipo: detalle.tipo
      }));

      // Limpiar el pedido actual y cargar los items del pedido rechazado
      this._pedido.set(itemsParaPedido);
      
      console.log("✅ Detalles del pedido rechazado cargados en _pedido:", itemsParaPedido);
      return {
        pedido: pedidoRechazado,
        detalles: itemsParaPedido
      };

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
  }
  // Actualizar direccionDelivery
  setDireccionDelivery(direccion: string) {
    this._direccionDelivery.set(direccion);
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
      const newQuantity =
        updatedPedido[existingItemIndex].quantity + (item.quantity || 1);
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
async getTotal(): Promise<number> {
  const subtotal = this._pedido().reduce((total, item) => {
    const itemTotal = item.subtotal || item.precio * (item.quantity || 1);
    return total + itemTotal;
  }, 0);

  try {
    const clienteId = await this.getClientId();
    const mesaId = await this.getNroMesa(clienteId);
    const descuento = await this.getDescuentoCliente(clienteId, mesaId);
    
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

  async getMontoDescuento(): Promise<number> {
    const subtotal = this.getSubtotal();

    try {
      const clienteId = await this.getClientId();
      const mesaId = await this.getNroMesa(clienteId);
      const descuento = await this.getDescuentoCliente(clienteId, mesaId);

      if (descuento > 0) {
        return subtotal * (descuento / 100);
      }

      return 0;
    } catch (error) {
      console.error('Error calculando monto descuento:', error);
      return 0;
    }
  }

  async getPorcentajeDescuento(): Promise<number> {
    try {
      const clienteId = await this.getClientId();
      const mesaId = await this.getNroMesa(clienteId);
      return await this.getDescuentoCliente(clienteId, mesaId);
    } catch (error) {
      console.error('Error obteniendo porcentaje descuento:', error);
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
  try {
    const detalles = this._pedido();
    console.log('📋 Detalles del pedido:', detalles);

    if (!detalles || detalles.length === 0) {
      throw new Error('No hay items en el pedido');
    }

    const isAnonimo = this.tipoClienteService.isAnonimo();
    console.log('🎭 Es anónimo:', isAnonimo);

    let idCliente: number | null = null;
    let mesaId: number;
    let nroMesa: number | null;

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

    } else {
      // ✅ CLIENTE REGISTRADO
      console.log('👥 Procesando pedido de cliente registrado');
      
      idCliente = await this.getClientId();
      console.log('👤 ID Cliente registrado:', idCliente);

      const { data: clienteData, error: clienteError } = await this.supabase
        .from('clientes')
        .select('mesa_asignada')
        .eq('id_cliente', idCliente)
        .single();

      if (clienteError || !clienteData?.mesa_asignada) {
        console.error('❌ Error obteniendo mesa del cliente:', clienteError);
        throw new Error('No se pudo obtener el ID de la mesa asignada');
      }

      mesaId = clienteData.mesa_asignada;
      
      // Obtener número de mesa
      const { data: mesaData } = await this.supabase
        .from('mesas')
        .select('numero')
        .eq('id', mesaId)
        .single();
      
      nroMesa = mesaData?.numero || mesaId;

      console.log('✅ Datos para pedido registrado:', {
        idCliente,
        mesaId,
        nroMesa
      });
    }
    
    // Calcular totales
    const subtotal = this.getSubtotal();
    const totalConDescuento = await this.getTotal();
    const descuento = idCliente ? await this.getDescuentoCliente(idCliente, mesaId) : 0;
    
    console.log('💰 Cálculos del pedido:', {
      subtotal,
      descuento: descuento + '%',
      totalConDescuento,
      mesaId,
      nroMesa
    });

    // ✅ CABECERA: id_cliente puede ser NULL para anónimos
    const cabecera: any = {
      mesa: mesaId,
      id_cliente: idCliente, // NULL para anónimos, número para registrados
      fecha: new Date().toISOString(),
      estado: 'pendiente',
      total: Math.round(totalConDescuento)
    };

    console.log('📤 Insertando cabecera del pedido:', cabecera);

    const { data, error } = await this.supabase
      .from('pedidos')
      .insert([cabecera])
      .select();

    if (error) {
      console.error('❌ Error insertando pedido:', error);
      console.error('📋 Detalles del error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        cabeceraEnviada: cabecera
      });
      
      if (error.code === '23503') {
        throw new Error('Error de referencia: El cliente o mesa no existe en la base de datos');
      }
      
      throw new Error('Error al crear el pedido: ' + error.message);
    }

    if (!data || data.length === 0) {
      throw new Error('No se pudo obtener el ID del pedido');
    }

    const idPedido = data[0].id;
    console.log('✅ Pedido insertado con ID:', idPedido);

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
        id_pedido: idPedido,
        nombre_prod: item.nombre,
        cantidad: item.quantity,
        precio_unitario: item.precio,
        tipo: item.tipo,
      };

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
      await this.notificationService.sendNotificationToPerfil(
        'mozo',
        '🍽️ Nuevo pedido',
        `Mesa ${nroMesa} - Pedido #${idPedido}${isAnonimo ? ' (Cliente anónimo)' : ''}`
      );
      console.log('✅ Notificación enviada al mozo');
    } catch (notifError) {
      console.error('⚠️ Error enviando notificación:', notifError);
      // No fallar el pedido si falla la notificación
    }

    // Limpiar el pedido después de insertarlo
    this.clearPedido();
    
    return idPedido;
  } catch (error: any) {
    console.error('❌ Error completo en insertPedido:', error);
    console.error('📋 Stack trace:', error.stack);
    throw error;
  }
}

  // Metodos del chat de consultas

  get client() {
  return this.supabase;
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

async sendMessage(content: string) {
  try {
    const isAnonimo = this.tipoClienteService.isAnonimo();
    const clienteData = this.tipoClienteService.getClienteData();
    
    let nroMesa: number | null = null;
    let nombre: string;

    if (isAnonimo) {
      const mesaId = clienteData?.mesa_asignada || null;
      
      if (!mesaId) {
        throw new Error('No tienes una mesa asignada');
      }

      const { data: mesaData, error: mesaError } = await this.supabase
        .from('mesas')
        .select('numero')
        .eq('id', mesaId)
        .single();

      if (mesaError || !mesaData) {
        console.error('❌ Error obteniendo número de mesa:', mesaError);
        throw new Error('Error al obtener número de mesa');
      }

      nroMesa = mesaData.numero;
      nombre = clienteData?.nombre || 'Cliente Anónimo';
      
      console.log('🎭 Enviando mensaje de anónimo:', {
        nombre,
        mesaId,
        nroMesa
      });
    } else {
      const idCliente = await this.getClientId();
      nroMesa = await this.getNroMesa(idCliente);
      nombre = await this.getNombreCliente();
      
      console.log('👤 Enviando mensaje de registrado:', {
        nombre,
        nroMesa
      });
    }

    if (!nroMesa) {
      throw new Error('No se pudo obtener el número de mesa');
    }

    const { data, error } = await this.supabase
      .from('mensajes')
      .insert([
        {
          contenido: content,
          nombre_usuario: nombre,
          date_sended: new Date().toISOString(),
          nroMesa
        }
      ])
      .select();

    if (error) {
      console.error('❌ Error enviando mensaje:', error);
      throw new Error('Error enviando mensaje: ' + error.message);
    }

    if (data) {
      console.log('✅ Mensaje enviado correctamente a mesa', nroMesa);
      
      try {
        await this.notificationService.sendNotificationToPerfil(
          'mozo',
          `Nueva consulta de la mesa ${nroMesa}`,
          `${nombre}: ${content}`
        );
      } catch (notifError) {
        console.error('⚠️ Error enviando notificación:', notifError);
      }
    }
  } catch (error) {
    console.error('❌ Error en sendMessage:', error);
    throw error;
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
  
  // ✅ Si es registrado, usar el método original
  const userid = (await this.supabase.auth.getUser()).data.user?.id;
  if (!userid) {
    throw new Error('Usuario no autenticado');
  }
  
  const { data, error } = await this.supabase
    .from('clientes')
    .select('id_cliente')
    .eq('user_id', userid)
    .single();

  if (error) {
    throw new Error('Error al obtener id del cliente: ' + error.message);
  }

  console.log('✅ ID Cliente Registrado:', data.id_cliente);
  return data.id_cliente ?? -1;
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
        const currentUserId = (await this.supabase.auth.getUser()).data.user?.id;
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

  const {
    data: { user },
  } = await this.supabase.auth.getUser();

  const { data, error } = await this.supabase
    .from('clientes')
    .select('mesa_asignada')
    .eq('user_id', user?.id)
    .single();

  if (error) {
    console.error('❌ Error al verificar cliente en espera:', error);
    return false;
  }

  // Si mesa_asignada es null, el cliente está en espera
  const bool = data?.mesa_asignada === null;

  console.log('👤 Cliente registrado en espera:', bool);
  return bool;
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

  /**
   * Verifica que el QR escaneado corresponda a la mesa del cliente
   */
  async verificarQRMesa(
    numeroMesaQR: number
  ): Promise<{ valido: boolean; mensaje: string }> {
    try {
      const clienteId = await this.getClientId();
      const mesaAsignada = await this.getNroMesa(clienteId);

      // Verificar que el cliente tenga mesa asignada
      if (!mesaAsignada) {
        return {
          valido: false,
          mensaje:
            'No tienes una mesa asignada. Espera a que el maître te asigne una.',
        };
      }

      // Verificar que el QR coincida con la mesa asignada
      if (numeroMesaQR !== mesaAsignada) {
        return {
          valido: false,
          mensaje: `Este es el QR de la Mesa ${numeroMesaQR}, pero tu mesa asignada es la ${mesaAsignada}.`,
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
          mensaje: 'Error al verificar la mesa en la base de datos.',
        };
      }

      // Verificar que la mesa no esté disponible (debe estar ocupada por este cliente)
      if (mesa.disponible) {
        return {
          valido: false,
          mensaje: 'Inconsistencia: la mesa aparece como disponible.',
        };
      }

      return {
        valido: true,
        mensaje: `Mesa ${numeroMesaQR} verificada correctamente.`,
      };
    } catch (error) {
      console.error('Error verificando QR de mesa:', error);
      return {
        valido: false,
        mensaje: 'Error al verificar el código QR.',
      };
    }
  }
  async liberarMesaCliente(nroMesa?: number, clientId?: number) {
    try {
      const clienteId = clientId || (await this.getClientId());
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
          },
          {
            onConflict: 'mesa_id,cliente_id',
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
          },
          {
            onConflict: 'mesa_id,cliente_id',
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

  async getDescuentoCliente(
    clienteId: number,
    mesaId: number | null
  ): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('juegos_descuentos')
        .select('descuento_obtenido')
        .eq('mesa_id', mesaId)
        .eq('cliente_id', clienteId)
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

    if (isAnonimo) {
      mesaId = clienteData?.mesa_asignada || null;
      
      if (!mesaId) {
        console.warn('⚠️ Cliente anónimo sin mesa asignada');
        this._historialPedidos.set([]);
        return [];
      }

      console.log('🎭 Buscando pedidos de cliente anónimo en mesa:', mesaId);

      // ✅ QUERY PARA ANÓNIMOS
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
        .eq('mesa', mesaId)
        .is('id_cliente', null)  // ✅ Solo anónimos
        .order('fecha', { ascending: false });

      if (error) {
        console.error('❌ Error obteniendo historial anónimo:', error);
        throw new Error('Error al obtener historial: ' + error.message);
      }

      console.log('✅ Historial anónimo obtenido:', data?.length || 0, 'pedidos');
      console.log('📦 Datos completos:', data);
      
      this._historialPedidos.set(data || []);
      return data || [];

    } else {
      const clienteId = await this.getClientId();
      
      console.log('👤 Buscando pedidos de cliente registrado:', clienteId);

      // ✅ QUERY PARA REGISTRADOS
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
        console.error('❌ Error obteniendo historial registrado:', error);
        throw new Error('Error al obtener historial: ' + error.message);
      }

      console.log('✅ Historial registrado obtenido:', data?.length || 0, 'pedidos');
      console.log('📦 Datos completos:', data);
      
      this._historialPedidos.set(data || []);
      return data || [];
    }
  } catch (error) {
    console.error('❌ Error en getHistorialPedidos:', error);
    throw error;
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
   * Obtiene el pedido entregado actual del cliente
   */
  async getPedidoEntregadoActual(): Promise<any | null> {
  try {
    const isAnonimo = this.tipoClienteService.isAnonimo();
    const clienteData = this.tipoClienteService.getClienteData();

    if (isAnonimo) {
      // ✅ ANÓNIMO: Buscar por mesa
      const mesaId = clienteData?.mesa_asignada;
      
      if (!mesaId) {
        console.warn('⚠️ Cliente anónimo sin mesa');
        return null;
      }

      const { data, error } = await this.supabase
        .from('pedidos')
        .select(`
          *,
          mesa:mesas(numero, id),
          detalles_pedido(*)
        `)
        .eq('mesa', mesaId)
        .is('id_cliente', null)
        .eq('estado', 'entregado')
        .order('fecha', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      return data;

    } else {
      // ✅ REGISTRADO: Buscar por id_cliente
      const clienteId = await this.getClientId();
      const mesaId = await this.getNroMesa(clienteId);

      if (!mesaId) return null;

      const { data, error } = await this.supabase
        .from('pedidos')
        .select(`
          *,
          mesa:mesas(numero, id),
          detalles_pedido(*)
        `)
        .eq('id_cliente', clienteId)
        .eq('mesa', mesaId)
        .eq('estado', 'entregado')
        .order('fecha', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      return data;
    }
  } catch (error) {
    console.error('❌ Error obteniendo pedido entregado:', error);
    return null;
  }
}

/**
 * Suscripción en tiempo real a cambios en los pedidos del cliente
 */
async subscribeToHistorialPedidos() {
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
