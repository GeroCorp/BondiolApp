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
  perfil: string | null = null;

  constructor(private router: Router, private authService: AuthService, private toastController: ToastController) {
    this.email = history.state['email'] ?? null;
    this.perfil = history.state['perfil'] ?? null;
    console.log('Perfil recibido en Home:', this.perfil);  // Verificar que perfil esta ingresando a home
  }

  async logout() {
    await this.authService.logout();

    this.router.navigate(['/login'], {replaceUrl: true}); // redirigir al login
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
    this.router.navigate(['/tabs-admin/tab1-carga-empleado'], {replaceUrl: true}); // redirigir a tabs empleado
  }
  agregarMesa() {
    this.router.navigate(['/tabs-admin/tab2-carga-mesas'], {replaceUrl: true}); // redirigir a tabs mesas
  }
  adminCliente() {
    this.router.navigate(['/tabs-admin/tab3-admin-cliente'], {replaceUrl: true}); // Redirigir a tabs cliente
  }


  
  // Seccion de todos los empleados
  // agregarPlato() {

  // }
  // prepararPedido() {

  // }

  //Seccion clientes
  // Para empleados y clientes quiza seria conveniente crear un 2 nuevos componentes home para tener mas modularizado todo, ademas de que el html va a ser muy largo

}
