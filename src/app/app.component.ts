import { Component, inject } from '@angular/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Platform } from '@ionic/angular';
import { Router } from '@angular/router';
import { Notification } from './services/notification';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  private notificationService: Notification = inject(Notification)

  constructor(private platform: Platform, public router: Router) {
    this.initializeApp();
    document.body.classList.add('dark');
  }

  initializeApp() {
    this.platform.ready().then(() => {
      this.configureStatusBar();
      this.router.navigateByUrl('splash');
      this.notificationService.init();
    });
  }

  async configureStatusBar() {
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setBackgroundColor({ color: '#000000ff' });
    await StatusBar.setStyle({ style: Style.Dark });
  }

}
