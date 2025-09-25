import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from 'src/app/services/supabase';
import { ToastController } from '@ionic/angular';
import { PerfilService } from 'src/app/services/perfilService';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false,
})
export class HomePage {
  email: string | null = null;
  perfil: string | null = null;

  constructor(
    private router: Router,
    private authService: AuthService,
    private toastController: ToastController,
    private perfilService: PerfilService
  ) {
    this.email = history.state['email'] ?? null;
    this.perfil = history.state['perfil'] ?? null;
    if (this.perfil) {
      this.perfilService.setPerfil(this.perfil); // guarda el perfil
    }
    console.log('Perfil recibido en Home:', this.perfil); // Verificar que perfil esta ingresando a home
  }

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

  // Seccion de dueño y supervisor
  agregarEmpleado() {
    this.router.navigate(['/tabs-admin/tab1-carga-empleado'], {
      replaceUrl: true,
    }); // redirigir a tabs empleado
  }
  agregarMesa() {
    this.router.navigate(['/tabs-admin/tab2-carga-mesas'], {
      replaceUrl: true,
    }); // redirigir a tabs mesas
  }
  adminCliente() {
    this.router.navigate(['/tabs-admin/tab3-admin-cliente'], {
      replaceUrl: true,
    }); // Redirigir a tabs cliente
  }
  adminMesa() {
    this.router.navigate(['/tabs-admin/tab4-admin-mesa'], {replaceUrl: true}); // Redirigir a tabs mesa
  }
  // Seccion de cocinero y bartender
  agregarProducto() {
    this.router.navigate(['/tabs-cocinero-bartender/tab1-agregar-producto'], {
      replaceUrl: true,
    }); // redirigir a tabs producto
  }
  verMenu() {
    this.router.navigate(['/tabs-cocinero-bartender/tab3-menu'], {
      replaceUrl: true,
    }); // redirigir a tabs producto
  }
  recibirPedidos() {
    this.router.navigate(['/tabs-cocinero-bartender/tab2-recibir-pedido'], {
      replaceUrl: true,
    }); // redirigir a tabs pedidos
  }

  listaEspera() {
    this.router.navigate(['/tabs-maitre/tab1-espera'], { replaceUrl: true });
  }

  verMesas() {
    this.router.navigate(['/tabs-maitre/tab2-mesas'], { replaceUrl: true });
  }

  registrarCliente() {
    this.router.navigate(['/tabs-maitre/tab3-regCliente'], { replaceUrl: true });
  }
}
