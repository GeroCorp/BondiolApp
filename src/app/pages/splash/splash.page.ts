import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Platform } from '@ionic/angular';

import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-splash',
  templateUrl: './splash.page.html',
  styleUrls: ['./splash.page.scss'],
  standalone: false
})
export class SplashPage {

  constructor(public router:Router, private platform: Platform, private navCtrl: NavController) { 
    this.platform.ready().then(() => {
      // Esperamos a que la plataforma esté lista
      setTimeout(() => {
        this.navCtrl.navigateRoot('/login', { animationDirection: 'forward' });
      }, 0); // 4 segundos de animación
    });
  }
}
