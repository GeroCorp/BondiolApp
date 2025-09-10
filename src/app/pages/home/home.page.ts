import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from 'src/app/services/supabase';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false
})
export class HomePage {
  email: string | null = null;

  constructor(private router: Router, private authService: AuthService, private toastController: ToastController) {
    this.email = history.state['email'] ?? null;
  }

  async logout() {
    await this.authService.logout();

    this.router.navigate(['/login']); // redirigir al login
    this.showToast('Sesión cerrada correctamente');
  }

  async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      color: 'medium',
      position: 'bottom',
    });
    await toast.present();
  }
}
