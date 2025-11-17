import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Platform, NavController } from '@ionic/angular';
import { AuthService, supabase } from 'src/app/services/supabase';

@Component({
  selector: 'app-splash',
  templateUrl: './splash.page.html',
  styleUrls: ['./splash.page.scss'],
  standalone: false
})
export class SplashPage implements OnInit, OnDestroy {
  private navigating = false;

  constructor(
    public router: Router, 
    private platform: Platform, 
    private navCtrl: NavController,
    private authService: AuthService
  ) { }

   async ngOnInit() {
    // ✅ Evitar múltiples ejecuciones
    if (this.navigating) {
      console.log('⚠️ Ya hay una navegación en curso');
      return;
    }

    console.log('🎬 Splash iniciado');
    console.log('📍 URL completa:', window.location.href);
    console.log('📍 Router URL actual:', this.router.url);

    try {
      this.navigating = true;

      // Esperar un momento para que la UI se cargue
      await new Promise(resolve => setTimeout(resolve, 1500));

      const sessionCheck = await this.authService.quickAutoLogin();

      if (sessionCheck.success && sessionCheck.redirectTo) {
        console.log('✅ Sesión detectada - redirigiendo a:', sessionCheck.redirectTo);
        await this.router.navigate([sessionCheck.redirectTo], { 
          replaceUrl: true // ✅ IMPORTANTE: reemplazar en historial
        });
      } else {
        console.log('⚠️ No hay sesión - ir a login');
        await this.router.navigate(['/login'], { 
          replaceUrl: true 
        });
      }

    } catch (error) {
      console.error('❌ Error en splash:', error);
      await this.router.navigate(['/login'], { 
        replaceUrl: true 
      });
    } finally {
      this.navigating = false;
    }
  }

  private async mostrarSplash() {
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const resultado = await this.authService.quickAutoLogin();
    console.log('📊 Resultado de quickAutoLogin:', resultado);

    if (resultado.success && resultado.redirectTo) {
      console.log('🎯 Auto-login exitoso - redirigiendo a:', resultado.redirectTo);
      await this.router.navigate([resultado.redirectTo], { replaceUrl: true });
    } else {
      console.log('⚠️ quickAutoLogin falló, redirigiendo a login');
      console.log('➡️ Redirigiendo a login');
      await this.router.navigate(['/login'], { replaceUrl: true });
    }
  }

  ngOnDestroy() {
    // Limpiar cualquier referencia si es necesario
  }

  // ✅ Versión ultra-simplificada para evitar crashes del WebView
  private async initializeSplashSimple() {
    try {
      console.log('🔄 SPLASH: Iniciando versión simple...');
      
      // ✅ Esperar a que la plataforma esté lista
      await this.platform.ready();
      console.log('✅ SPLASH: Platform ready');
      
      // ✅ Tiempo de espera más largo para que todo cargue
      await this.delay(3000);
      console.log('✅ SPLASH: Timeout completado');
      
      // ✅ Verificación usando tanto localStorage como AuthService
      await this.checkAuthWithService();
      
    } catch (error) {
      console.error('❌ SPLASH: Error crítico:', this.safeStringify(error));
      // ✅ Fallback directo a login
      this.goToLogin();
    }
  }

  // ✅ Método simple para delay sin Promises complejas
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ✅ Verificación mejorada usando AuthService
  private async checkAuthWithService() {
    try {
      console.log('🔄 SPLASH: Verificando auth con service...');
      
      // ✅ Verificar también la sesión de Supabase
      const authStatus = await this.authService.checkSession();
      console.log('🔍 SPLASH: Session check:', authStatus.isValid ? 'válida' : 'inválida');

      if (authStatus.isValid) {
          console.log('✅ SPLASH: Sesión válida, redirigiendo a home');
          this.goToHome(authStatus.userType, authStatus.profile);
      } else {
          console.log('➡️ SPLASH: Sin sesión, redirigiendo a login');
          this.goToLogin();
      }
      
    } catch (error) {
      console.error('❌ SPLASH: Error en verificación con service:', this.safeStringify(error));
      // ✅ Fallback a verificación simple
    }
  }

  // ✅ Navegación simple a login
  private goToLogin() {
    try {
      console.log('🔄 SPLASH: Navegando a login...');
      this.router.navigate(['/login'], { replaceUrl: true });
    } catch (error) {
      console.error('❌ SPLASH: Error navegando a login:', this.safeStringify(error));
      // ✅ Fallback: recargar página
      window.location.href = '/login';
    }
  }

  // ✅ Navegación inteligente basada en tipo de usuario
  private goToHome(userType?: string, profile?: string) {
    try {
      console.log(`SPLASH: Usuario tipo: ${userType}, perfil: ${profile}`);
        
        let targetRoute = '/login'; // fallback
        
        if (userType == 'cliente') {
            targetRoute = (profile == 'aprobado') ? '/home-cliente' : '/home-anonimo';
        } else if (userType == 'empleado') {
            targetRoute = "/home";
        }
        
        if (targetRoute !== '/login') {
            this.router.navigate([targetRoute], { replaceUrl: true });
        } else {
            console.warn('⚠️ SPLASH: Tipo de usuario no reconocido');
            this.goToLogin();
        }
      
    } catch (error) {
      console.error('❌ SPLASH: Error navegando a home:', this.safeStringify(error));
      // ✅ Fallback: ir a login
      this.goToLogin();
    }
  }

  // ✅ Stringify seguro para evitar circular references
  private safeStringify(obj: any): string {
    try {
      return JSON.stringify(obj);
    } catch (error) {
      return String(obj);
    }
  }
}