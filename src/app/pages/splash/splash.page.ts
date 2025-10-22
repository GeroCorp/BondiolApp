import { Component, OnInit, OnDestroy } from '@angular/core';
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
      this.initializeSplash();
    }
  }

  ngOnDestroy() {
    // Limpiar cualquier referencia si es necesario
  }

  private async initializeSplash() {
    try {
      await this.platform.ready();
      
      // Reducir tiempo de splash a 1.5 segundos
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Verificar sesión de forma más eficiente
      const loginResult = await this.authService.quickAutoLogin();
      
      if (loginResult.success && loginResult.redirectTo) {
        console.log('✅ Sesión activa - redirigiendo a:', loginResult.redirectTo);
        this.navCtrl.navigateRoot(loginResult.redirectTo, { animationDirection: 'forward' });
      } else {
        console.log('➡️ Sin sesión - redirigiendo a login');
        this.navCtrl.navigateRoot('/login', { animationDirection: 'forward' });
      }
      
    } catch (error) {
      console.error('Error en splash:', error);
      this.navCtrl.navigateRoot('/login', { animationDirection: 'forward' });
    }
  }
}
