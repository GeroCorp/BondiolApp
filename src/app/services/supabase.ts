import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, AuthError } from '@supabase/supabase-js';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.SUPABASE_URL,
      environment.SUPABASE_ANON_KEY
    );
  }

  get client() {
    return this.supabase;
  }

  // 🔑 Iniciar sesión
  async login(email: string, password: string) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw new Error(this.mapAuthError(error));
      if (!data || !data.user)
        throw new Error('No se pudo obtener el usuario.');

      return data; // ✅ devuelve user y session
    } catch (err: any) {
      console.error('Error en login:', err);
      throw new Error(this.mapAuthError(err));
    }
  }

  // 🔑 Cerrar sesión
  async logout() {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) throw new Error(this.mapAuthError(error));
    } catch (err) {
      console.error('Error en logout:', err);
      throw new Error('No se pudo cerrar sesión.');
    }
  }

  // 🔑 Obtener usuario actual
  async getUser() {
    const { data, error } = await this.supabase.auth.getUser();
    if (error) throw new Error('No se pudo obtener el usuario actual.');
    return data.user;
  }
  
  async getUsuarioConPerfil() {
    const { data, error } = await this.supabase.auth.getUser();
    if (error || !data.user) {
      throw new Error('No se pudo obtener el usuario actual.');
    }
    
    const user = data.user;
    
    // Buscar en la tabla empleados
    const { data: empleados, error: errorEmpleado } = await this.supabase
    .from('empleados')
    .select('perfil')
    .eq('user_id', user.id)
    .maybeSingle();
    
    if (errorEmpleado) {
      console.error('Error al obtener perfil:', errorEmpleado.message);
      return { email: user.email ?? null, perfil: null };
    }

    return {
      email: user.email ?? null,
      perfil: empleados ? empleados.perfil : null,
    };
  }

  // // 🔑 Obtener empleado desde tabla empleados según user_id
  async getEmpleadoByUserId(userId: string) {
    console.log('Query a empleados con user_id:', userId);
    const { data, error } = await this.supabase
      .from('empleados')
      .select('*')
      .eq('user_id', userId);
      
      if (error) {
      console.error('Error al buscar empleado:', error.message);
      return [];
    }

    console.log('Resultado de empleados:', data); // Add this to see the raw data from Supabase
    console.log('Es array:', Array.isArray(data));
    console.log('Array length:', data ? data.length : 0);
    return Array.isArray(data) ? data : [];
  }
  
  // 🔑 Registro Cliente
  async registerCliente(email: string, password: string) {
    return await this.supabase.auth.signUp({ email, password });
  }

  // 🔑 Registro de nuevo empleado (sólo email y password)
  async registrarEmpleado(email: string, password: string) {
    return await this.supabase.auth.signUp({ email, password });
  }
  
  // 🔑 Insertar nuevo empleado
  async insertarEmpleado(empleado: any) {
    return await this.supabase.from('empleados').insert([empleado]);
  }
  
  // 🔑 Insertar nuevo plato
  async insertarPlato(producto: any) {
    return await this.supabase.from('platos').insert([producto]);
  }

  // 🔑 Insertar nueva bebida
  async insertarBebida(producto: any) {
    return await this.supabase.from('bebidas').insert([producto]);
  }
  
  // 🔑 Verificar existencia del plato en el menú
  async buscarPlatoPorNombre(nombre: string) {
    return await this.supabase
    .from('platos')
      .select('*')
      .ilike('nombre', nombre); // o .eq si querés exacto
  }

  // 🔑 Verificar existencia de la bebida en el menú
  async buscarBebidaPorNombre(nombre: string) {
    return await this.supabase
      .from('bebidas')
      .select('*')
      .ilike('nombre', nombre); // o .eq si querés exacto
  }

  async getPlatos() {
    const { data, error } = await this.supabase
      .from('platos')
      .select('*')
      .order('nombre', { ascending: true });
    if (error) {
      throw new Error('Error al obtener platos: ' + error.message);
    }
    return data ?? [];
  }
  
  async getBebidas() {
    const { data, error } = await this.supabase
      .from('bebidas')
      .select('*')
      .order('nombre', { ascending: true });
    if (error) {
      throw new Error('Error al obtener bebidas: ' + error.message);
    }
    return data ?? [];
  }



  // 🔑 Insertar nueva mesa
  async insertarMesa(mesa: any) {
    return await this.supabase.from('mesas').insert({
      numero: mesa.numero,
      cantidad: mesa.capacidad,
      tipo: mesa.tipo,
    });
  }
  // Obtener cliente loggeado
  

  

  // ✅ Insertar un cliente nuevo
  async getClientesPendientes() {
    const { data, error } = await this.supabase
      .from('clientes')
      .select('*')
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false });

    if (error)
      throw new Error('Error al obtener clientes pendientes: ' + error.message);
    return data ?? [];
  }

  // ✅ Obtener todos los clientes
  async getAllClientes(){
    return await this.supabase.from('clientes').select('*')
      .order('created_at', { ascending: false });
  }

  async actualizarEstadoCliente(id_cliente: number, estado: 'aprobado' | 'rechazado') {
    const { error } = await this.supabase
      .from('clientes')
      .update({ estado })
      .eq('id_cliente', id_cliente);

    if (error) throw new Error('Error al actualizar cliente: ' + error.message);
    return true;
  }

  // ✅ Insertar un cliente nuevo
  async insertarCliente(cliente: {
    nombre: string;
    apellido: string;
    dni: string;
    email?: string | null;
    foto?: string | null;
    user_id?: string | null;
  }) {
    console.log(cliente);
    const { data, error} = await this.supabase.from('clientes').insert([
      {
        nombre: cliente.nombre,
        apellido: cliente.apellido,
        dni: cliente.dni,
        email: cliente.email ?? null,
        foto: cliente.foto ?? null,
        user_id: cliente.user_id ?? null,
        estado: 'pendiente' // Nuevo cliente siempre inicia como pendiente
      }
    ]).select();

    if (error) {
      console.error('Error al insertar cliente:', error.message);
      
      throw new Error('Error al insertar cliente: ' + error.message);
    }
    return data ?? null;
  }

  // ✅ Eliminar cliente usando la PK real: id_cliente
  async eliminarCliente(id_cliente: number) {
    if (!id_cliente) throw new Error('Id de cliente inválido.');

    const { error } = await this.supabase
      .from('clientes')
      .delete()
      .eq('id_cliente', id_cliente);

    if (error) {
      throw new Error('Error al eliminar cliente: ' + error.message);
    }
    return true;
  }

  // 🔑 Registro de nuevo empleado (sólo email y password)
  async registrarCliente(email: string, password: string) {
    return await this.supabase.auth.signUp({ email, password });
  }

  async subirImagenCliente(userId: string, imageBlob: Blob) {

    const fileName = `${userId}_profile_${Date.now()}.jpeg`;
    const { data, error } = await this.supabase.storage
      .from('clientes-registrados')
      .upload(fileName, imageBlob, {
        cacheControl: '3600',
        upsert: false // No sobrescribir
      });

    if (error) {
      throw new Error(`Error al subir la imagen: ${error.message}`)
    }

    // Obtener la URL pública de la imagen
    const { data: publicUrlData } = this.supabase.storage
      .from('clientes-registrados')
      .getPublicUrl(fileName);

    // La URL pública es lo que guardarás en la base de datos
    return publicUrlData.publicUrl;
  }
  async subirImagenPlatos(platoId: string, imageBlob: Blob) {

    const fileName = `${platoId}_plato_${Date.now()}.jpeg`;
    const { data, error } = await this.supabase.storage
      .from('platos')
      .upload(fileName, imageBlob, {
        cacheControl: '3600',
        upsert: false // No sobrescribir
      });

    if (error) {
      throw new Error(`Error al subir la imagen: ${error.message}`)
    }

    // Obtener la URL pública de la imagen
    const { data: publicUrlData } = this.supabase.storage
      .from('clientes-registrados')
      .getPublicUrl(fileName);

    // La URL pública es lo que guardarás en la base de datos
    return publicUrlData.publicUrl;
  }

  async subirQRmesa(nroMesa: string, imageBlob: Blob) {

    const fileName = `mesa_${nroMesa}/qr.jpeg`;
    const { data, error } = await this.supabase.storage
      .from('mesas')
      .upload(fileName, imageBlob, {
        cacheControl: '3600',
        upsert: false // No sobrescribir
      });

    if (error) {
      throw new Error(`Error al subir la imagen: ${error.message}`)
    }

    // Obtener la URL pública de la imagen
    const { data: publicUrlData } = this.supabase.storage
      .from('clientes-registrados')
      .getPublicUrl(fileName);

    // La URL pública es lo que guardarás en la base de datos
    return publicUrlData.publicUrl;
  }

  // metodos del maitre
  async getClientesAnonimosEnEspera() {
    try {
      const { data, error } = await this.supabase
        .from('clientes_anonimos')
        .select('*')
        .is('mesa_asignada', null) // Filtra quienes no tengan mesa asignada
        .order('id_clienteanonimo', { ascending: false });

      if (error) {
        console.error('Error obteniendo clientes anónimos:', error);
        throw new Error(
          'Error al obtener clientes en espera: ' + error.message
        );
      }

      return data || []
      
      /* Cuando se le sacaba la mesa asignada no volvia a aparecer por alguna razón  */
      // // Filtrar solo los que no tienen mesa asignada (están en espera)
      // const clientesEnEspera = (data || []).filter(
      //   (cliente) => !cliente.mesa_asignada && cliente.en_espera !== false
      // );

      // console.log('Clientes en espera encontrados:', clientesEnEspera);
      // return clientesEnEspera;
    } catch (error: any) {
      console.error('Error en getClientesAnonimosEnEspera:', error);
      throw error;
    }
  }

  // 🔑 Obtener todas las mesas con su estado
  async getMesasConEstado() {
    try {
      const { data, error } = await this.supabase
        .from('mesas')
        .select('*')
        .order('numero', { ascending: true });

      if (error) {
        console.error('Error obteniendo mesas:', error);
        throw new Error('Error al obtener mesas: ' + error.message);
      }

      console.log('Mesas encontradas:', data);
      return data || [];
    } catch (error: any) {
      console.error('Error en getMesasConEstado:', error);
      throw error;
    }
  }

  // 🔑 Obtener solo mesas disponibles
  async getMesasDisponibles() {
    try {
      const { data, error } = await this.supabase
        .from('mesas')
        .select('*')
        .is('cliente_asignado', null) // Mesas sin cliente asignado
        .order('numero', { ascending: true });

      if (error) {
        console.error('Error obteniendo mesas disponibles:', error);
        throw new Error('Error al obtener mesas disponibles: ' + error.message);
      }

      console.log('Mesas disponibles:', data);
      return data || [];
    } catch (error: any) {
      console.error('Error en getMesasDisponibles:', error);
      throw error;
    }
  }

  // 🔑 Asignar mesa a cliente anónimo (PUNTO 10)
  async asignarMesaAClienteAnonimo(idCliente: number, numeroMesa: number) {
    try {
      console.log('Asignando mesa:', { idCliente, numeroMesa });

      // Primero verificar que la mesa existe y está disponible
      const { data: mesaData, error: mesaError } = await this.supabase
        .from('mesas')
        .select('*')
        .eq('id', numeroMesa)
        .is('cliente_asignado', null)
        .single();

      if (mesaError || !mesaData) {
        throw new Error('La mesa no está disponible o no existe');
      }

      // Actualizar la mesa como ocupada
      const { error: errorMesa } = await this.supabase
        .from('mesas')
        .update({
          cliente_asignado: idCliente,
          disponible: false,
        })
        .eq('id', numeroMesa);

      if (errorMesa) {
        console.error('Error actualizando mesa:', errorMesa);
        throw new Error('Error al asignar mesa: ' + errorMesa.message);
      }

      // Actualizar el cliente anónimo
      const { error: errorCliente } = await this.supabase
        .from('clientes_anonimos')
        .update({
          mesa_asignada: numeroMesa,
          en_espera: false,
        })
        .eq('id_clienteanonimo', idCliente);

      if (errorCliente) {
        console.error('Error actualizando cliente:', errorCliente);

        // Revertir cambios en mesa si falla la actualización del cliente
        await this.supabase
          .from('mesas')
          .update({
            cliente_asignado: null,
            disponible: true,
          })
          .eq('id', numeroMesa);

        throw new Error('Error al actualizar cliente: ' + errorCliente.message);
      }

      console.log('Mesa asignada exitosamente');
      return true;
    } catch (error: any) {
      console.error('Error en asignarMesaAClienteAnonimo:', error);
      throw error;
    }
  }

  // 🔑 Liberar mesa (para cuando el cliente se va)
  async liberarMesa(idMesa: number) {
    try {
      const { error } = await this.supabase
        .from('mesas')
        .update({
          cliente_asignado: null,
          disponible: true,
        })
        .eq('id', idMesa);

      if (error) {
        throw new Error('Error al liberar mesa: ' + error.message);
      }

      return true;
    } catch (error: any) {
      console.error('Error en liberarMesa:', error);
      throw error;
    }
  }

  // 🔑 Traducir errores de Supabase
  private mapAuthError(error: AuthError): string {
    switch (error.message) {
      case 'Invalid login credentials':
        return 'El correo y/o la contraseña son incorrectos.';
      case 'Email not confirmed':
        return 'Debes confirmar tu correo antes de iniciar sesión.';
      case 'missing email or phone':
        return 'Complete todos los campos antes de ingresar.';
      case 'User already registered':
      case 'duplicate key value violates unique constraint "users_email_key"':
        return 'El correo ya está registrado. Intente con otro.';
      default:
        return 'Error de autenticación: ' + error.message;
    }
  }



  dataURLtoBlob(dataurl: string): Blob {
    if (!dataurl || !dataurl.includes(',')) {
      throw new Error('dataURL inválido: ' + dataurl);
    }

    const [header, base64] = dataurl.split(',');

    // sacar MIME
    const mimeMatch = header.match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';

    // limpiar la cadena base64
    const cleanedBase64 = base64.replace(/\s/g, '');

    let bstr: string;
    try {
      bstr = atob(cleanedBase64);
    } catch (e) {
      console.error('⚠️ Base64 inválido en dataURLtoBlob:', cleanedBase64.slice(0, 50));
      throw new Error('La cadena base64 no es válida');
    }

    const u8arr = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) {
      u8arr[i] = bstr.charCodeAt(i);
    }

    return new Blob([u8arr], { type: mime });
  }


  // EMAIL
  /**
   * Obtiene el usuario actual autenticado
   */
  async getCurrentUser() {
    const { data: { user } } = await this.supabase.auth.getUser();
    return user;
  }

  /**
   * Obtiene datos de un usuario por su ID
   */
  async getUserById(userId: string) {
    const { data: { user }, error } = await this.supabase.auth.admin.getUserById(userId);
    
    if (error) {
      console.error('Error obteniendo usuario:', error);
      return null;
    }
    
    return user;
  }

  /**
   * Obtiene datos de cliente por user_id
   */
  async getClienteByUserId(userId: string) {
    const { data, error } = await this.supabase
      .from('clientes')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error obteniendo cliente:', error);
      return null;
    }

    return data;
  }

  /**
   * Confirma el email de un cliente (marca email_confirmed_at)
   * Esto permite que el cliente pueda loguearse
   */
  async confirmarEmailCliente(userId: string) {
    try {
      // Esto requiere permisos de admin en Supabase
      //
      const { data, error } = await this.supabase.auth.admin.updateUserById(
        userId,
        { email_confirm: true }
      );

      if (error) {
        console.error('Error confirmando email:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error en confirmarEmailCliente:', error);
      return false;
    }
  }


  // Carga de perfiles (admin-supervisor y empleados restantes)
  async cargarEmpleado(perfilBuscado: string){
    const { data, error } = await this.supabase
      .from('empleados')
      .select('*')
      .eq('perfil', perfilBuscado)
      // .order('created_at', { ascending: false });

    if (error)
      throw new Error('Error al obtener empleado: ' + error.message);
    return data;
  }


/**
 * Obtiene los items de un pedido específico
 */
async getItemsPedido(pedidoId: number) {
  try {
    const { data, error } = await this.supabase
      .from('items_pedido')
      .select(`
        *,
        producto:productos(
          nombre,
          descripcion,
          tipo,
          precio
        )
      `)
      .eq('pedido_id', pedidoId);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error al obtener items del pedido:', error);
    throw error;
  }
}

/**
 * Actualiza el estado de un pedido
 */
async actualizarEstadoPedido(pedidoId: number, nuevoEstado: string, observaciones?: string) {
  try {
    const updateData: any = {
      estado: nuevoEstado,
      updated_at: new Date().toISOString()
    };

    if (observaciones) {
      updateData.observaciones = observaciones;
    }

    const { data, error } = await this.supabase
      .from('pedidos')
      .update(updateData)
      .eq('id_pedido', pedidoId)
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error al actualizar estado del pedido:', error);
    throw error;
  }
}

/**
 * Envía pedido a un sector específico (cocina o bar)
 */
async enviarPedidoSector(pedidoId: number, sector: 'cocina' | 'bar', items: any[]) {
  try {
    const pedidoSector = {
      pedido_id: pedidoId,
      sector: sector,
      items: items,
      estado: 'pendiente',
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

/**
 * Envía notificación push al cliente
 */
async enviarNotificacionCliente(clienteId: number, titulo: string, mensaje: string) {
  try {
    // Obtener el token FCM del cliente
    const { data: cliente, error: clienteError } = await this.supabase
      .from('clientes')
      .select('fcm_token, user_id')
      .eq('id_cliente', clienteId)
      .single();

    if (clienteError) throw clienteError;

    if (!cliente?.fcm_token) {
      console.warn('Cliente sin token FCM');
      return null;
    }

    // Guardar notificación en la base de datos
    const { data, error } = await this.supabase
      .from('notificaciones')
      .insert({
        user_id: cliente.user_id,
        titulo: titulo,
        mensaje: mensaje,
        tipo: 'pedido',
        leida: false,
        created_at: new Date().toISOString()
      })
      .select();

    if (error) throw error;

    // TODO: Aquí deberías implementar el envío real de push notification
    // usando Firebase Cloud Messaging (FCM) o similar
    console.log('Notificación enviada al cliente:', titulo, mensaje);

    return data;
  } catch (error) {
    console.error('Error al enviar notificación al cliente:', error);
    throw error;
  }
}

/**
 * Envía notificación push a un sector (cocinero/bartender)
 */
async enviarNotificacionSector(perfil: string, titulo: string, mensaje: string) {
  try {
    // Obtener todos los empleados de ese perfil
    const { data: empleados, error: empleadosError } = await this.supabase
      .from('empleados')
      .select('user_id, fcm_token')
      .eq('perfil', perfil);

    if (empleadosError) throw empleadosError;

    if (!empleados || empleados.length === 0) {
      console.warn(`No se encontraron empleados con perfil ${perfil}`);
      return null;
    }

    // Crear notificaciones para todos los empleados del sector
    const notificaciones = empleados.map(emp => ({
      user_id: emp.user_id,
      titulo: titulo,
      mensaje: mensaje,
      tipo: 'pedido_sector',
      leida: false,
      created_at: new Date().toISOString()
    }));

    const { data, error } = await this.supabase
      .from('notificaciones')
      .insert(notificaciones)
      .select();

    if (error) throw error;

    // TODO: Implementar envío real de push notifications
    console.log(`Notificaciones enviadas al sector ${perfil}:`, titulo, mensaje);

    return data;
  } catch (error) {
    console.error('Error al enviar notificación al sector:', error);
    throw error;
  }
}

/**
 * Obtiene pedidos confirmados (para Tab 2)
 */
async getPedidosConfirmados() {
  try {
    const { data, error } = await this.supabase
      .from('pedidos')
      .select(`
        *,
        mesa:mesas(numero),
        cliente:clientes(nombre, apellido),
        pedidos_sector(sector, estado)
      `)
      .in('estado', ['confirmado', 'en_preparacion', 'listo'])
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error al obtener pedidos confirmados:', error);
    throw error;
  }
}

/**
 * Obtiene consultas de clientes pendientes de respuesta
 */
async getConsultasPendientes() {
  try {
    const { data, error } = await this.supabase
      .from('consultas')
      .select(`
        *,
        mesa:mesas(numero),
        cliente:clientes(nombre, apellido)
      `)
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error al obtener consultas pendientes:', error);
    throw error;
  }
}

/**
 * Obtiene el conteo de pedidos pendientes (para badge)
 */
async getPedidosPendientes() {
  try {
    const { data, error } = await this.supabase
      .from('pedidos')
      .select('id_pedido')
      .eq('estado', 'pendiente_confirmacion');

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error al obtener conteo de pedidos:', error);
    return [];
  }
}

async responderConsulta(consultaId: number, respuesta: string) {
  try {
    const { data, error } = await this.supabase
      .from('consultas')
      .update({
        respuesta: respuesta,
        estado: 'respondida',
        respondida_at: new Date().toISOString()
      })
      .eq('id_consulta', consultaId)
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error al responder consulta:', error);
    throw error;
  }
}

}