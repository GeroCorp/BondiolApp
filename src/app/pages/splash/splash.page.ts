import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Platform, NavController } from '@ionic/angular';
import { AuthService } from 'src/app/services/supabase';

@Component({
  selector: 'app-splash',
  templateUrl: './splash.page.html',
  styleUrls: ['./splash.page.scss'],
  standalone: false
})
export class SplashPage implements OnInit, OnDestroy {
  private isInitialized = false;

  constructor(
    public router: Router, 
    private platform: Platform, 
    private navCtrl: NavController,
    private authService: AuthService
  ) { }

  ngOnInit() {
    if (!this.isInitialized) {
      this.isInitialized = true;
      this.initializeSplashSimple();
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
      await this.delay(1500);
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
      
      // ✅ Primero verificar localStorage
      const savedData = this.getLocalStorageSafe('userSession');
      console.log('📦 SPLASH: LocalStorage data:', savedData ? 'encontrado' : 'vacío');
      
      // ✅ Verificar también la sesión de Supabase
      const sessionCheck = await this.authService.checkSession();
      console.log('🔐 SPLASH: Session check:', sessionCheck.isValid ? 'válida' : 'inválida');
      
      if (savedData && sessionCheck.isValid) {
        console.log('✅ SPLASH: Sesión válida encontrada');
        this.goToHome();
      } else if (savedData || sessionCheck.isValid) {
        console.log('⚠️ SPLASH: Sesión parcial, intentando recuperar...');
        // Si hay una sesión pero no está completa, intentar refrescar
        await this.delay(500);
        this.goToHome();
      } else {
        console.log('➡️ SPLASH: Sin sesión');
        this.goToLogin();
      }
      
    } catch (error) {
      console.error('❌ SPLASH: Error en verificación con service:', this.safeStringify(error));
      // ✅ Fallback a verificación simple
      this.checkSimpleAuth();
    }
  }

  // ✅ Verificación auth ultra-simplificada
  private checkSimpleAuth() {
    try {
      console.log('� SPLASH: Verificando auth simple...');
      
      // ✅ Acceso directo a localStorage sin métodos complejos
      const savedData = this.getLocalStorageSafe('userSession');
      
      if (savedData) {
        console.log('✅ SPLASH: Sesión encontrada');
        this.goToHome();
      } else {
        console.log('➡️ SPLASH: Sin sesión');
        this.goToLogin();
      }
      
    } catch (error) {
      console.error('❌ SPLASH: Error en verificación:', this.safeStringify(error));
      this.goToLogin();
    }
  }

  // ✅ Acceso seguro a localStorage
  private getLocalStorageSafe(key: string): any {
    try {
      if (typeof localStorage !== 'undefined') {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
      }
      return null;
    } catch (error) {
      console.warn('⚠️ SPLASH: localStorage no disponible');
      return null;
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
  private goToHome() {
    try {
      console.log('🔄 SPLASH: Navegando a home...');
      
      // ✅ Obtener datos del usuario para determinar el tipo correcto de home
      const savedData = this.getLocalStorageSafe('userSession');
      
      if (savedData && savedData.userType && savedData.profile) {
        const userType = savedData.userType;
        const profile = savedData.profile;
        
        console.log(`SPLASH: Usuario tipo: ${userType}, perfil: ${profile}`);
        
        // ✅ Determinar la ruta correcta basada en el tipo de usuario
        let targetRoute = '/login'; // fallback
        
        if (userType == 'cliente') {
          if (profile == 'aprobado') {
            targetRoute = '/home-cliente';
            console.log('🏠 SPLASH: Navegando a home-cliente (registrado)');
          } else{
            targetRoute = '/home-anonimo';
            console.log('🏠 SPLASH: Navegando a home-anonimo');
          }
        } else{
          targetRoute = "/home";
        }
        
        if (targetRoute !== '/login') {
          this.router.navigate([targetRoute], { replaceUrl: true });
        } else {
          console.warn('⚠️ SPLASH: Tipo de usuario no reconocido, navegando a login');
          this.goToLogin();
        }
        
      } else {
        console.warn('⚠️ SPLASH: No se encontraron datos de usuario, navegando a home genérico');
        this.router.navigate(['/home'], { replaceUrl: true });
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
