import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, AuthError } from '@supabase/supabase-js';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

let supabaseInstance: SupabaseClient | null = null;

export const supabase = (() => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(
      environment.SUPABASE_URL,
      environment.SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          storage: localStorage,
          storageKey: 'restoapp-auth' 
        }
      }
    );
  }
  return supabaseInstance;
})();


@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private supabase: SupabaseClient;
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private isCheckingSession = false; // ✅ Flag para evitar verificaciones múltiples
  private isAutoLoginInProgress = false; // ✅ Flag para evitar interferencia del auth listener durante auto-login
  private static authListenerInitialized = false; // ✅ Flag para evitar múltiples listeners
  private authStateSubscription: any = null; // ✅ Para poder desuscribirse
  private lastProcessedEvent: string = ''; // ✅ Para evitar procesar el mismo evento múltiples veces
  private lastProcessedUserId: string = ''; // ✅ Para evitar guardar sesión múltiples veces para el mismo usuario

  constructor(private router: Router) {
    this.supabase = supabase; // Usa la instancia única
    this.initAuthListener(); // ✅ Inicializa el listener de autenticación
  }

  // ✅ Verifica si localStorage está disponible (importante para Android WebView)
  private isLocalStorageAvailable(): boolean {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      console.warn('localStorage no disponible:', e);
      return false;
    }
  }

  // ✅ Inicializa el listener de cambios de autenticación
  private initAuthListener() {
    // ✅ Evitar múltiples listeners registrados
    if (AuthService.authListenerInitialized) {
      console.log('⚠️ Auth listener ya inicializado - saltando');
      return;
    }

    console.log('🔧 Inicializando auth listener único');
    AuthService.authListenerInitialized = true;

    this.authStateSubscription = this.supabase.auth.onAuthStateChange((event, session) => {
      // ✅ Evitar procesar eventos duplicados
      const eventKey = `${event}_${session?.user?.id || 'none'}`;
      if (this.lastProcessedEvent === eventKey) {
        return;
      }
      this.lastProcessedEvent = eventKey;

      // Reducir logs - solo mostrar en eventos importantes
      if (event !== 'TOKEN_REFRESHED') {
        console.log('Auth state:', event, session?.user?.email);
      }
      
      this.currentUserSubject.next(session?.user || null);
      
      // ✅ NO hacer nada si estamos en proceso de auto-login
      if (this.isAutoLoginInProgress) {
        return;
      }
      
      // Solo manejar eventos específicos
      if (event === 'SIGNED_IN') {
        if (session?.user && this.lastProcessedUserId !== session.user.id) {
          this.lastProcessedUserId = session.user.id;
          this.saveUserSession(session.user);
        }
      } else if (event === 'SIGNED_OUT') {
        this.lastProcessedUserId = '';
        this.clearUserSession();
        
        // Solo redirigir si no estamos en páginas de auth
        const currentUrl = this.router?.url || '';
        const isInAuthFlow = currentUrl.includes('/login') || 
                            currentUrl.includes('/splash') || 
                            currentUrl.includes('/register') ||
                            currentUrl === '/';
                            
        if (this.router && !isInAuthFlow) {
          setTimeout(() => {
            this.router.navigate(['/login'], { replaceUrl: true });
          }, 1000);
        }
      }
      // TOKEN_REFRESHED - no hacer nada (eliminar logs)
    });
  }

  // ✅ Guarda información de sesión en localStorage
 private async saveUserSession(user: any) {
  try {
    // Verificar si localStorage está disponible
    if (!this.isLocalStorageAvailable()) {
      console.log('⚠️ localStorage no disponible - usando memoria');
      return;
    }
    
    // Verificar si ya existe sesión guardada para evitar queries innecesarias
    const existingSession = this.getSavedSession();
    if (existingSession && existingSession.id === user.id) {
      console.log('ℹ️ Sesión ya guardada para:', user.email);
      return;
    }
    
    console.log('💾 Guardando nueva sesión para:', user.email);
    
    let userType = 'unknown';
    let profile = null;
    let clientData = null;

    try {
      // ✅ PRIMERO: Verificar si es empleado
      const { data: empleado, error: empError } = await this.supabase
        .from('empleados')
        .select('perfil, nombre')
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('🔍 Búsqueda empleado:', { data: empleado, error: empError });

      if (empleado) {
        userType = 'empleado';
        profile = empleado.perfil;
        console.log('👔 Usuario es empleado:', profile);
      } else {
        // ✅ SEGUNDO: Verificar si es cliente
        const { data: cliente, error: cliError } = await this.supabase
          .from('clientes')
          .select('estado, id_cliente, nombre, apellido')
          .eq('user_id', user.id)
          .maybeSingle();

        console.log('🔍 Búsqueda cliente:', { data: cliente, error: cliError });

        if (cliente) {
          userType = 'cliente';
          profile = cliente.estado;
          clientData = cliente;
          console.log('👤 Usuario es cliente:', profile);
        } else {
          console.log('⚠️ Usuario no encontrado en empleados ni clientes');
        }
      }
    } catch (queryError) {
      console.error('⚠️ Error consultando tipo de usuario:', queryError);
    }
    
    const userSession = {
      id: user.id,
      email: user.email,
      lastLogin: new Date().toISOString(),
      userType: userType,
      profile: profile,
      clientData: clientData
    };
    
    localStorage.setItem('userSession', JSON.stringify(userSession));
    console.log('✅ Sesión guardada:', { userType, profile });
    
  } catch (error) {
    console.error('Error guardando sesión:', error);
  }
}

  // ✅ Limpia la información de sesión
  private clearUserSession() {
    try {
      if (this.isLocalStorageAvailable()) {
        localStorage.removeItem('userSession');
      }
    } catch (error) {
      console.warn('Error limpiando sesión:', error);
    }
  }

  // ✅ Obtiene la sesión guardada
  getSavedSession() {
    try {
      if (!this.isLocalStorageAvailable()) {
        return null;
      }
      const saved = localStorage.getItem('userSession');
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.warn('Error obteniendo sesión guardada:', error);
      return null;
    }
  }

  // ✅ Verifica si hay una sesión activa y válida
  async checkSession(): Promise<{isValid: boolean, user?: any, userType?: string, profile?: string}> {
    try {
      // Primero verificar localStorage para evitar llamadas innecesarias
      const savedSession = this.getSavedSession();
      
      const { data: { session }, error } = await this.supabase.auth.getSession();
      
      if (error || !session) {
        // Limpiar localStorage si no hay sesión en Supabase
        if (savedSession) {
          this.clearUserSession();
        }
        return { isValid: false };
      }

      // Verificar que el usuario del localStorage coincide con el de Supabase
      if (savedSession && savedSession.id !== session.user.id) {
        this.clearUserSession();
        return { isValid: false };
      }
      
      // Si hay sesión guardada y coincide, usar esos datos para evitar queries adicionales
      if (savedSession && savedSession.id === session.user.id) {
        return {
          isValid: true,
          user: session.user,
          userType: savedSession.userType,
          profile: savedSession.profile
          };
      }

      return { isValid: true, user: session.user, userType: 'desconocido', profile: 'desconocido' };

    } catch (error) {
      console.error('Error verificando sesión:', error);
      return { isValid: false };
    }
  }

  // ✅ Auto-login optimizado y más rápido para splash
  async quickAutoLogin(): Promise<{success: boolean, redirectTo?: string}> {
  try {
    console.log('🔍 Ejecutando quickAutoLogin...');
    
    const { data: { session }, error } = await this.supabase.auth.getSession();
    
    if (error || !session) {
      console.log('❌ No hay sesión activa');
      return { success: false };
    }

    console.log('✅ Sesión encontrada para:', session.user.email);
    console.log('📋 User ID:', session.user.id);

    // ✅ VERIFICAR SI VIENE DE OAUTH CALLBACK
    const isFromOAuthCallback = window.location.pathname === '/auth/callback';
    if (isFromOAuthCallback) {
      console.log('🔄 Viene de OAuth callback, dejando que auth-callback.page maneje la redirección');
      return { success: false };
    }

    // Verificar localStorage
    const savedSession = this.getSavedSession();
    
    if (savedSession && savedSession.id === session.user.id) {
      console.log('📋 Usando datos guardados:', savedSession);
      
      const { userType, profile } = savedSession;
      let redirectTo = '/login';
      
      if (userType === 'empleado') {
        redirectTo = '/home';
      } else if (userType === 'cliente') {
        if (profile === 'aprobado') {
          redirectTo = '/home-cliente';
        } else if (profile === 'pendiente') {
          redirectTo = '/pre-sala';
        } else if (profile === 'rechazado') {
          await this.logout();
          return { success: false };
        }
      }
      
      return { success: true, redirectTo };
    }

    // Consultar BD
    console.log('🔍 Consultando BD...');
    
    const { data: empleado } = await this.supabase
      .from('empleados')
      .select('perfil')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (empleado) {
      console.log('✅ Es empleado');
      return { success: true, redirectTo: '/home' };
    }

    const { data: cliente } = await this.supabase
      .from('clientes')
      .select('estado, id_cliente, nombre, user_id')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (cliente) {
      console.log('✅ Es cliente con estado:', cliente.estado);
      
      if (cliente.estado === 'aprobado') {
        return { success: true, redirectTo: '/home-cliente' };
      } else if (cliente.estado === 'pendiente') {
        return { success: true, redirectTo: '/pre-sala' };
      } else if (cliente.estado === 'rechazado') {
        await this.logout();
        return { success: false };
      }
    }

    console.log('⚠️ Usuario sin tipo definido');
    return { success: false };
    
  } catch (error) {
    console.error('❌ Error en quickAutoLogin:', error);
    return { success: false };
  }
}

  // ✅ Auto-login basado en sesión guardada
  async autoLogin(): Promise<{success: boolean, redirectTo?: string}> {
    if (this.isCheckingSession) {
      console.log('⏳ Ya hay una verificación de sesión en progreso');
      return { success: false };
    }

    this.isCheckingSession = true;
    this.isAutoLoginInProgress = true; // ✅ Bloquear auth listener durante auto-login
    
    try {
      console.log('🔍 Iniciando autoLogin completo...');
      
      // Verificar si hay sesión activa primero
      const { data: { session }, error } = await this.supabase.auth.getSession();
      
      if (error || !session) {
        return { success: false };
      }
      
      // Verificar información adicional del usuario
      const sessionCheck = await this.checkSession();
      
      if (!sessionCheck.isValid) {
        return { success: false };
      }

      const { user, userType, profile } = sessionCheck;
      
      // Determinar redirección según el tipo de usuario
      let redirectTo = '/login';
      
      if (userType === 'empleado') {
        redirectTo = '/home';
      } else if (userType === 'cliente') {
        if (profile === 'pendiente') {
          redirectTo = '/pre-sala';
        } else if (profile === 'aprobado') {
          redirectTo = '/home-cliente';
        } else if (profile === 'rechazado') {
          await this.logout();
          return { success: false };
        } else {
          redirectTo = '/pre-sala';
        }
      } else {
        return { success: false };
      }
      
      console.log('🎯 AutoLogin completo - redirigiendo a:', redirectTo);
      
      // Esperar antes de completar
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return {
        success: true,
        redirectTo
      };
      
    } catch (error) {
      console.error('Error en autoLogin:', error);
      return { success: false };
    } finally {
      this.isCheckingSession = false;
      // ✅ Reactivar auth listener después de un delay adicional
      setTimeout(() => {
        this.isAutoLoginInProgress = false;
        console.log('🔓 Auth listener reactivado');
      }, 2000);
    }
  }

  // ✅ Verifica si el usuario está autenticado
  isAuthenticated(): boolean {
    const session = this.getSavedSession();
    return !!session && !!session.id;
  }

  // ✅ Obtiene el tipo de usuario actual
  getCurrentUserType(): string | null {
    const session = this.getSavedSession();
    return session?.userType || null;
  }

  // ✅ Obtiene el perfil del usuario actual
  getCurrentUserProfile(): string | null {
    const session = this.getSavedSession();
    return session?.profile || null;
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
      
      // ✅ Limpiar datos locales
      this.clearUserSession();
      this.currentUserSubject.next(null);
      
      console.log('✅ Sesión cerrada correctamente');
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
    const { data, error } = await this.supabase
      .from('empleados')
      .select('*')
      .eq('user_id', userId);
      
    if (error) {
      console.error('Error al buscar empleado:', error.message);
      return [];
    }

    return Array.isArray(data) ? data : [];
  }
  
// Verificar existencia del DNI en la base de datos
 async existsDni(dni: number, tabla: 'clientes' | 'empleados') {
    const { data, error } = await this.supabase.from(tabla)
    .select('*')
    .eq('dni', dni)

    if (error){
      throw new Error('Error al verificar DNI: ' + error.message);
    }
    return data && data.length > 0; // Si el array tiene elementos, el DNI existe
 }

  // 🔑 Registro Cliente
  async registerCliente(email: string, password: string, dni: number) {
    const dniExists = await this.existsDni(dni, 'clientes');
    if (dniExists) {
      throw new Error('El DNI ya está registrado.');
    }
    return await this.supabase.auth.signUp({ email, password });
  }

  // Primero debe verificar si existe el dni en la tabla clientes
  async registrarEmpleado(email: string, password: string, dni: number) {
    const dniExists = await this.existsDni(dni, 'empleados');
    if (dniExists) {
      throw new Error('El DNI ya está registrado.');
    }
    return await this.supabase.auth.signUp({ email, password });
  }
  
  // 🔑 Insertar nuevo empleado
  async insertarEmpleado(empleado: any) {
    return await this.supabase.from('empleados').insert([empleado]);
  }
  
  // 🔑 Insertar nuevo plato
  async insertarPlato(producto: any) {
    const {data , error} = await this.supabase.from('platos').insert([producto]);
    if (error) throw new Error('Error al insertar plato: ' + error.message);
    return {data, error};
  }

  // eliminar un plato 
  async eliminarPlato(id: number) {
  const { data, error } = await this.supabase
    .from('platos')
    .delete()
    .eq('id', id);

  if (error) throw new Error('Error al eliminar plato: ' + error.message);

  return { data, error };
}

// Eliminar una bebida
async eliminarBebida(id: number) {
  const { data, error } = await this.supabase
    .from('bebidas') // Asegúrate de que el nombre de la tabla sea 'bebidas'
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error('Error al eliminar bebida: ' + error.message);
  }

  return { data, error };
}
  // 🔑 Insertar nueva bebida
  async insertarBebida(producto: any) {
    return await this.supabase.from('bebidas').insert([producto]);
  }
  
  // 🔑 Verificar existencia del plato en el menú
  async buscarPlatoPorNombre(nombre: string) {
    const normalizado = nombre.trim().toLowerCase();
    return await this.supabase
      .from('platos')
      .select('*')
      .eq('nombre', normalizado);
  }

  // 🔑 Verificar existencia de la bebida en el menú
  async buscarBebidaPorNombre(nombre: string) {
    const normalizado = nombre.trim().toLowerCase();
    return await this.supabase
      .from('bebidas')
      .select('*')
      .eq('nombre', normalizado);
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
      qr_url: mesa.qr_url,
      foto: mesa.foto_url
    });
  }
  // Obtener cliente loggeado
  

  

  // ✅ Insertar un cliente nuevo
  async getClientesPendientes() {
  console.log('🔍 [SUPABASE] Obteniendo clientes pendientes...');
  
  const { data, error } = await this.supabase
    .from('clientes')
    .select('*')
    .eq('estado', 'pendiente')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ [SUPABASE] Error obteniendo clientes pendientes:', error);
    throw new Error('Error al obtener clientes pendientes: ' + error.message);
  }
  
  console.log('✅ [SUPABASE] Clientes pendientes obtenidos:', {
    cantidad: data?.length || 0,
    clientes: data?.map(c => ({
      id: c.id_cliente,
      nombre: `${c.nombre} ${c.apellido}`,
      dni: c.dni
    }))
  });
  
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
      throw new Error('Error al insertar cliente: ' + error.message);
    }
    console.log("✅ Cliente insertado con exito: ", data);
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
  async subirImagenPlatos(imageBlob: Blob, fileName:string, bucket: string) {
    console.log('📤 Subiendo imagen a bucket:', bucket, 'archivo:', fileName);
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(fileName, imageBlob, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('❌ Error de storage:', error.message);
      throw new Error(`Error al subir la imagen: ${error.message}`)
    }

    // Obtener la URL pública de la imagen
    const { data: publicUrlData } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    console.log('✅ Imagen subida: ', publicUrlData.publicUrl);
    return publicUrlData.publicUrl;
  }

  async subirQRmesa(nroMesa: string, imageBlob: Blob) {

    const fileName = `mesa_${nroMesa}/qr.jpeg`;
    const { data, error } = await this.supabase.storage
      .from('mesas')
      .upload(fileName, imageBlob, {
        cacheControl: '3600',
        upsert: true
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

  // 🔑 Obtener todas las mesas con su estado y cliente asignado
  async getMesasConEstado() {
    try {
      // Intentar query con JOIN primero
      const { data, error } = await this.supabase
        .from('mesas')
        .select(`
          id,
          numero,
          cantidad,
          tipo,
          foto,
          disponible,
          cliente_asignado,
          clientes:cliente_asignado (
            id_cliente,
            nombre,
            apellido,
            email,
            estado
          )
        `)
        .order('numero', { ascending: true });

      if (error) {
        console.error('❌ Error en query con JOIN:', error);
        
        // Fallback: query simple
        const { data: simpleData, error: simpleError } = await this.supabase
          .from('mesas')
          .select('*')
          .order('numero', { ascending: true });
          
        if (simpleError) {
          throw new Error('Error al obtener mesas: ' + simpleError.message);
        }
        
        console.log('✅ Usando query simple, mesas encontradas:', simpleData?.length);
        return simpleData || [];
      }

      // ✅ FIX: Para mesas con cliente_asignado pero sin JOIN a clientes registrados,
      // buscar en clientes_anonimos
      const mesasSinCliente = (data || []).filter(
        (m: any) => m.cliente_asignado && !m.clientes
      );

      if (mesasSinCliente.length > 0) {
        const idsAnonimos = mesasSinCliente.map((m: any) => m.cliente_asignado);

        const { data: anonimos } = await this.supabase
          .from('clientes_anonimos')
          .select('id_clienteanonimo, nombre')
          .in('id_clienteanonimo', idsAnonimos);

        if (anonimos && anonimos.length > 0) {
          const mapAnonimos = new Map(anonimos.map((a: any) => [a.id_clienteanonimo, a]));

          (data || []).forEach((mesa: any) => {
            if (mesa.cliente_asignado && !mesa.clientes) {
              const anon = mapAnonimos.get(mesa.cliente_asignado);
              if (anon) {
                mesa.clientes = {
                  id_cliente: anon.id_clienteanonimo,
                  nombre: anon.nombre,
                  apellido: '',
                  esAnonimo: true
                };
              }
            }
          });
        }
      }

      console.log('✅ Query con JOIN exitosa, mesas encontradas:', data?.length);
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
      // Intentar sin .single() para ver si hay múltiples resultados
      const { data: allData, error: allError } = await this.supabase
        .from('clientes')
        .select('*')
        .eq('user_id', userId);
        
      if (allError) {
        return null;
      }
      
      return allData?.length > 0 ? allData[0] : null;
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
  async cargarEmpleado(){
    const user = await this.getCurrentUser();
    const { data, error } = await this.supabase
      .from('empleados')
      .select('*')
      .eq('user_id', user?.id)
      .single()
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
    };

    if (observaciones) {
      updateData.observaciones = observaciones;
    }

    const { data, error } = await this.supabase
      .from('pedidos')
      .update(updateData)
      .eq('id', pedidoId) // <-- CORREGIDO
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
      estadoItem: 'confirmado',
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

async enviarNotificacionPagoConfirmado(idPedido: number) {
  const { data: empleados } = await this.supabase
    .from('empleados')
    .select('user_id, perfil')
    .in('perfil', ['dueño', 'supervisor']);

  if (empleados && Array.isArray(empleados)) {
    for (const emp of empleados) {
      await this.supabase
        .from('notificaciones')
        .insert({
          destinatario_id: emp.user_id,
          tipo_destinatario: 'empleado',
          titulo: 'Pago confirmado',
          mensaje: `El pedido #${idPedido} fue pagado y la mesa está libre.`,
          tipo_notificacion: 'pago_confirmado',
          enviada: false
        });
    }
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
async getPedidosPendientesSector(sector: 'cocina' | 'bar') {
  try {
    // Obtiene todos los pedidos pendientes
    const { data: pedidos, error } = await this.supabase
      .from('pedidos')
      .select('id, mesa, fecha, estado')
      .eq('estado', 'pendiente')
      .order('fecha', { ascending: false });

    if (error) throw error;

    const pedidosConItems = [];

    for (const pedido of pedidos) {
      // Obtiene los items del pedido
      const { data: detalles, error: errorDetalles } = await this.supabase
        .from('detalles_pedido')
        .select('producto, cantidad, precio_unitario')
        .eq('id_pedido', pedido.id);

      if (errorDetalles) continue;

      let itemsFiltrados: any[] = [];

      if (sector === 'cocina') {
        // Filtra solo los productos que están en la tabla platos
        for (const item of detalles) {
          const { data: plato } = await this.supabase
            .from('platos')
            .select('nombre')
            .eq('nombre', item.producto)
            .maybeSingle();
          if (plato) itemsFiltrados.push(item);
        }
      } else if (sector === 'bar') {
        // Filtra solo los productos que están en la tabla bebidas
        for (const item of detalles) {
          const { data: bebida } = await this.supabase
            .from('bebidas')
            .select('nombre')
            .eq('nombre', item.producto)
            .maybeSingle();
          if (bebida) itemsFiltrados.push(item);
        }
      }

      // Solo agrega el pedido si tiene items para ese sector
      if (itemsFiltrados.length > 0) {
        pedidosConItems.push({
          ...pedido,
          items: itemsFiltrados,
        });
      }
    }

    return { data: pedidosConItems, error: null };
  } catch (error) {
    console.error('Error al obtener pedidos pendientes del sector:', error);
    return { data: [], error };
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

// ✅ Método de limpieza para desuscribirse del auth listener si es necesario
ngOnDestroy() {
  if (this.authStateSubscription) {
    this.authStateSubscription.data?.subscription?.unsubscribe();
  }
}

// ✅ Método para resetear el flag del listener (útil para testing)
static resetAuthListener() {
  AuthService.authListenerInitialized = false;
}

async subirImagenMesa(numero: number, file: Blob): Promise<string> {
  try {
    const filePath = `mesas/mesa_${numero}_${Date.now()}.jpg`;

    const { error } = await this.supabase.storage
      .from('mesas') // 👈 nombre del bucket
      .upload(filePath, file, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) {
      console.error('Error subiendo imagen:', error);
      throw error;
    }

    // Obtener URL pública
    const { data } = this.supabase.storage
      .from('mesas')
      .getPublicUrl(filePath);

    return data.publicUrl;

  } catch (err) {
    console.error('Error en subirImagenMesa:', err);
    throw err;
  }
}

}

