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

  // 🔑 Insertar nueva mesa
  async insertarMesa(mesa: any) {
    return await this.supabase.from('mesas').insert({
      numero: mesa.numero,
      cantidad: mesa.capacidad,
      tipo: mesa.tipo,
    });
  }

  // ✅ Insertar un cliente nuevo
  async getClientesPendientes() {
    const { data, error } = await this.supabase
      .from('clientes')
      .select('id_cliente, nombre, apellido, email, foto, estado, created_at')
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false });

    if (error)
      throw new Error('Error al obtener clientes pendientes: ' + error.message);
    return data ?? [];
  }

  async actualizarEstadoCliente(
    id_cliente: number,
    estado: 'aprobado' | 'rechazado'
  ) {
    const { error } = await this.supabase
      .from('clientes')
      .update({ estado })
      .eq('id_cliente', id_cliente);

    if (error) throw new Error('Error al actualizar cliente: ' + error.message);
    return true;
  }

  // ✅ Insertar un cliente nuevo (valida mínimos)
  async insertarCliente(cliente: {
    nombre: string;
    apellido: string;
    dni: string;
    email?: string | null;
    foto?: string | null;
    user_id?: string | null;
  }) {
    // validaciones mínimas en backend también son recomendadas
    if (!cliente.nombre || !cliente.apellido || !cliente.dni) {
      throw new Error('Faltan campos obligatorios: nombre, apellido o dni.');
    }

    const payload = {
      nombre: cliente.nombre.trim(),
      apellido: cliente.apellido.trim(),
      dni: cliente.dni.trim(),
      email: cliente.email ? cliente.email.trim() : null,
      foto: cliente.foto ?? null,
      user_id: cliente.user_id ?? null,
      // estado y created_at los maneja la BD por defecto
    };

    const { data, error } = await this.supabase
      .from('clientes')
      .insert([payload])
      .select(); // pedimos que nos devuelva la fila insertada

    if (error) {
      // mapear errores comunes de constraints
      const msg = (error.message ?? '').toLowerCase();
      if (
        msg.includes('clientes_dni_key') ||
        (msg.includes('duplicate') && msg.includes('dni'))
      ) {
        throw new Error('El DNI ya existe en el sistema.');
      }
      if (
        msg.includes('clientes_email_key') ||
        (msg.includes('duplicate') && msg.includes('email'))
      ) {
        throw new Error('El email ya está registrado.');
      }
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

  // 🔑 Obtener todas las mesas
  async obtenerMesas() {
    return await this.supabase.from('mesas').select('*');
  }

  // 🔑 Eliminar mesa por ID
  async eliminarMesa(id: number) {
    return await this.supabase.from('mesas').delete().eq('id', id);
  }

  actualizacionesMesas(callback: (payload: any) => void) {
  return this.supabase
    .channel('mesas-realtime')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'mesas'
    }, callback)
    .subscribe();
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
      default:
        return 'Error de autenticación: ' + error.message;
    }
  }
}
