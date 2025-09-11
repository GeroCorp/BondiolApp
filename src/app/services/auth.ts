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

  // ✅ Iniciar sesión con email y contraseña
  async login(email: string, password: string) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw new Error(this.mapAuthError(error));
      if (!data || !data.user) {
        throw new Error('No se pudo obtener el usuario después de iniciar sesión.');
      }

      return data; // ✅ garantizado que tiene user
    } catch (err: any) {
      console.error('Error en login:', err);
      throw new Error(this.mapAuthError(err));
    }
  }

  // ✅ Cerrar sesión
  async logout() {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) throw new Error(this.mapAuthError(error));
    } catch (err) {
      console.error('Error en logout:', err);
      throw new Error('No se pudo cerrar sesión.');
    }
  }

  // ✅ Obtener usuario actual
  async getUser() {
    const { data, error } = await this.supabase.auth.getUser();
    if (error) throw new Error('No se pudo obtener el usuario actual.');
    return data.user;
  }

  // ✅ Obtener empleado (perfil) desde la tabla según user_id
  async getEmpleadoByUserId(userId: string) {
    const { data, error } = await this.supabase
      .from('empleados')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error("Error al buscar empleado:", error.message);
      return []; // devolvemos array vacío
    }

    return Array.isArray(data) ? data : [];
  }

  // ✅ Mapear errores de Supabase
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
