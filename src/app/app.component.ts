import { Component, inject } from '@angular/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Platform } from '@ionic/angular';
import { Router } from '@angular/router';
import { Notification } from './services/notification';
import { AuthService } from './services/supabase'
import { Haptics } from '@capacitor/haptics';

import { HapticService } from 'src/app/services/haptic.service';
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  private notificationService: Notification = inject(Notification)

  constructor(
    private platform: Platform, 
    public router: Router,
    private authService: AuthService,
    private hapticService: HapticService
  ) {
    this.initializeApp();
    document.body.classList.add('dark');
  }
  initializeApp() {
    this.platform.ready().then(async () => {
      this.configureStatusBar();
      this.notificationService.init();
      
      // Solo navegar al splash - el splash se encargará de la verificación de sesión
      console.log('🚀 App inicializada - navegando a splash');
      this.router.navigateByUrl('/splash', { replaceUrl: true });
    });
  }

  async configureStatusBar() {
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setBackgroundColor({ color: '#000000ff' });
    await StatusBar.setStyle({ style: Style.Dark });
  }

}
