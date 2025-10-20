import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
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

  // Metodos para manejo del pedido

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
    const mesaId = await this.getMesa(clienteId);
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
      const mesaId = await this.getMesa(clienteId);
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
      const mesaId = await this.getMesa(clienteId);
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
  const detalles = this._pedido();
  console.log('📋 Detalles del pedido:', detalles);

  const idCliente = await this.getClientId();
  const nroMesa = await this.getMesa(idCliente);
  
  // Calcular totales
  const subtotal = this.getSubtotal();
  const totalConDescuento = await this.getTotal();
  const descuento = await this.getDescuentoCliente(idCliente, nroMesa);
  
  console.log('💰 Subtotal:', subtotal);
  console.log('🎮 Descuento aplicado:', descuento + '%');
  console.log('💰 Total con descuento:', totalConDescuento);

  const cabecera = {
    mesa: nroMesa,
    id_cliente: idCliente,
    fecha: new Date(),
    estado: 'pendiente',
    total: Math.round(totalConDescuento) // Total CON descuento aplicado
  };

  const { data, error } = await this.supabase
    .from('pedidos')
    .insert([cabecera])
    .select();

  if (error) {
    console.error('❌ Error insertando pedido:', error);
    throw error;
  }

  const idPedido = data![0].id;
  console.log('✅ Pedido insertado con ID:', idPedido);

  await Promise.all(
    detalles.map(async (item) => {
      console.log(
        '🔄️ Item a insertar: \nProducto: ',
        item.nombre,
        '\nCantidad: ',
        item.quantity,
        '\nPrecio: $',
        item.precio
      );
      const { data, error } = await this.supabase
        .from('detalles_pedido')
        .insert([
          {
            id_pedido: idPedido,
            nombre_prod: item.nombre,
            cantidad: item.quantity,
            precio_unitario: item.precio,
            tipo: item.tipo,
          },
        ])
        .select();

      if (error) {
        console.error('❌ Error insertando detalle de pedido:', error);
      }
    })
  );
  
  console.log('✅ Pedido completo insertado con descuento aplicado');
}

  // Metodos del chat de consultas

  async getChatMessages() {
    const mesa = await this.getMesa(await this.getClientId());
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

  async sendMessage(content: string) {
    const idCliente = await this.getClientId();
    const nroMesa = await this.getMesa(idCliente);
    const nombre = this.getNombreCliente();

    const { error } = await this.supabase.from('mensajes').insert([
      {
        contenido: content,
        nombre_usuario: await nombre,
        date_sended: new Date().toISOString(),
        nroMesa,
      },
    ]);

    if (error) {
      console.error('❌ Error enviando mensaje:', error);
      throw new Error('Error enviando mensaje: ' + error.message);
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

  async getClientId() {
    const userid = (await this.supabase.auth.getUser()).data.user?.id;
    const { data, error } = await this.supabase
      .from('clientes')
      .select('id_cliente')
      .eq('user_id', userid);

    if (error)
      throw new Error('Error al obtener id del cliente: ' + error.message);

    return data[0].id_cliente ?? -1;
  }
  async getNombreCliente() {
    const userid = await this.getClientId();
    const { data, error } = await this.supabase
      .from('clientes')
      .select('nombre')
      .eq('id_cliente', userid);

    if (error)
      throw new Error('Error al obtener nombre del cliente: ' + error.message);

    return data[0].nombre ?? 'Cliente';
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
    const channels = this.supabase
      .channel('custom-update-channel')
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

  async isCLienteEnEspera() {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

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

  async getMesa(idCliente: number) {
    const { data, error } = await this.supabase
      .from('clientes')
      .select('mesa_asignada')
      .eq('id_cliente', idCliente);

    if (error)
      throw new Error(
        '❗❗Ocurrió un error al obtener mesa asignada: ' + error.message
      );

    console.log(data[0].mesa_asignada);
    return data[0].mesa_asignada;
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
      const mesaAsignada = await this.getMesa(clienteId);

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
  async getEstadoJuegos(mesaId: number, clienteId: number) {
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
    mesaId: number,
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

  async marcarPrimerIntentoUsado(mesaId: number, clienteId: number) {
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
    mesaId: number
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
}
