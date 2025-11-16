import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { supabase } from './supabase';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class SocialAuthService {

  constructor(
    private platform: Platform,
    private router: Router,
    private toastController: ToastController
  ) {}

  async loginWithGoogle() {
    try {
      console.log('🔐 Iniciando login con Google...');
      
      if (this.platform.is('capacitor')) {
        await this.loginGoogleNativo();
      } else {
        await this.loginGoogleOAuth();
      }

    } catch (error: any) {
      console.error('❌ Error:', error);
      this.showToast('Error al iniciar sesión con Google', 'danger');
    }
  }

  private async loginGoogleNativo() {
    try {
      console.log('📱 Login nativo...');

      await SocialLogin.initialize({
        google: {
          webClientId: '143351493481-fba5rkk25jstfus8okff8ndud3djh5kf.apps.googleusercontent.com'
        }
      });

      const result = await SocialLogin.login({
        provider: 'google',
        options: {
          scopes: ['email', 'profile']
        }
      });

      const googleToken = (result.result as any)?.idToken || (result.result as any)?.accessToken;

      if (!googleToken) {
        throw new Error('No se pudo obtener el token de Google');
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: googleToken
      });

      if (error) throw error;

      await this.procesarUsuario(data.user);

    } catch (error) {
      console.error('❌ Error en login nativo:', error);
      throw error;
    }
  }

  private async loginGoogleOAuth() {
    try {
      console.log('🌐 Iniciando OAuth con Google...');
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account'
          }
        }
      });

      if (error) throw error;

    } catch (error) {
      console.error('❌ Error en OAuth:', error);
      throw error;
    }
  }

  private async procesarUsuario(user: any) {
    try {
      const { data: cliente } = await supabase
        .from('clientes')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cliente) {
        if (cliente.estado === 'aprobado') {
          await this.router.navigate(['/home-cliente'], { replaceUrl: true });
          this.showToast(`¡Bienvenido ${cliente.nombre}!`, 'success');
          return;
        }
        
        if (cliente.estado === 'pendiente') {
          await this.router.navigate(['/pre-sala'], { replaceUrl: true });
          this.showToast('Tu cuenta está en proceso de aprobación', 'warning');
          return;
        }
      }

      await this.crearCliente(user);
      await this.router.navigate(['/pre-sala'], { replaceUrl: true });
      this.showToast('Cuenta creada. Esperando aprobación.', 'success');

    } catch (error: any) {
      console.error('❌ Error:', error);
      this.showToast('Error: ' + error.message, 'danger');
      await this.router.navigate(['/login'], { replaceUrl: true });
    }
  }

  private async crearCliente(user: any) {
    const nombreCompleto = user.user_metadata?.full_name || 
                          user.user_metadata?.name ||
                          user.email?.split('@')[0] || 
                          'Usuario';
    
    const partes = nombreCompleto.split(' ');

    const nuevoCliente = {
      user_id: user.id,
      nombre: partes[0] || 'Usuario',
      apellido: partes.slice(1).join(' ') || 'Google',
      dni: `OAUTH-${Date.now()}`,
      email: user.email,
      foto: user.user_metadata?.picture || user.user_metadata?.avatar_url || null,
      estado: 'pendiente',
      email_confirmado: true
    };

    const { error } = await supabase
      .from('clientes')
      .insert([nuevoCliente]);

    if (error) throw error;
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}