import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from 'src/app/services/supabase';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  email: string | null = null;
  perfil: string | null = null;

  constructor(
    private router: Router,
    private authService: AuthService,
    private toastController: ToastController
  ) {}

  async logout() {
    await this.authService.logout();

    this.router.navigate(['/login'], { replaceUrl: true }); // redirigir al login
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

  async ngOnInit() {
    try {
      const usuario = await this.authService.getUsuarioConPerfil();
      this.email = usuario.email;
      this.perfil = usuario.perfil;

      // 🚨 Redirigir a admin si corresponde
      if (this.perfil === 'dueño' || this.perfil === 'supervisor') {
        this.router.navigate(['/admin']);
      }
    } catch (err) {
      console.error('Error al obtener usuario:', err);
    }
  }
}
