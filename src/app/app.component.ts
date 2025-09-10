import { Component } from '@angular/core';
import { StatusBar, Style } from '@capacitor/status-bar';

import { Platform } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {

  constructor(private platform: Platform, public router: Router) {
    this.initializeApp();
  }

  initializeApp() {
    this.platform.ready().then(() => {
      this.configureStatusBar();
      //this.showSplash();
      this.router.navigateByUrl('splash');
    });
  }

  async configureStatusBar() {
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setBackgroundColor({ color: '#ffffffff' });
    await StatusBar.setStyle({ style: Style.Light });
  }

}
