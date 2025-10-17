import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Platform } from '@ionic/angular';
import { NavController } from '@ionic/angular';
import { AuthService } from 'src/app/services/supabase';

@Component({
  selector: 'app-splash',
  templateUrl: './splash.page.html',
  styleUrls: ['./splash.page.scss'],
  standalone: false
})
export class SplashPage {

  constructor(
    public router: Router, 
    private platform: Platform, 
    private navCtrl: NavController,
    private authService: AuthService
  ) { 
    this.initializeSplash();
  }

  private async initializeSplash() {
    try {
      await this.platform.ready();
      console.log('🎬 Splash page iniciada');
      
      // Esperar tiempo de animación del splash
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log('🔍 Splash verificando sesión existente...');
      
      // Verificar si hay sesión activa
      const loginResult = await this.authService.autoLogin();
      
      if (loginResult.success && loginResult.redirectTo) {
        console.log('✅ Splash: Sesión válida encontrada, redirigiendo a:', loginResult.redirectTo);
        this.navCtrl.navigateRoot(loginResult.redirectTo, { animationDirection: 'forward' });
      } else {
        console.log('❌ Splash: No hay sesión válida, redirigiendo a login');
        this.navCtrl.navigateRoot('/login', { animationDirection: 'forward' });
      }
      
    } catch (error) {
      console.error('Error en splash initialization:', error);
      // En caso de error, ir al login por seguridad
      this.navCtrl.navigateRoot('/login', { animationDirection: 'forward' });
    }
  }
}
