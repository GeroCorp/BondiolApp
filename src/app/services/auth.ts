import { Injectable } from '@angular/core';
import { AuthError, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabase';

// ✅ Reusar la misma instancia de Supabase que el resto de la app
export const supabaseClient: SupabaseClient = supabase;

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  public client: SupabaseClient;

  constructor() {
    this.client = supabaseClient; // ✅ Usar instancia única con persistencia
  }

  // ✅ Iniciar sesión con email y contraseña
  async login(email: string, password: string) {
    try {
      const { data, error } = await this.client.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw new Error(this.mapAuthError(error));
      if (!data || !data.user) {
        throw new Error(
          'No se pudo obtener el usuario después de iniciar sesión.'
        );
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
      const { error } = await this.client.auth.signOut();
      if (error) throw new Error(this.mapAuthError(error));
    } catch (err) {
      console.error('Error en logout:', err);
      throw new Error('No se pudo cerrar sesión.');
    }
  }

  // ✅ Obtener usuario actual
  async getUser() {
    const { data, error } = await this.client.auth.getUser();
    if (error) throw new Error('No se pudo obtener el usuario actual.');
    return data.user;
  }

  // ✅ Obtener empleado (perfil) desde la tabla según user_id
  async getEmpleadoByUserId(userId: string) {
    const { data, error } = await this.client
      .from('empleados')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error al buscar empleado:', error.message);
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
