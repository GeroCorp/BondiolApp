import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/supabase';
import { ToastController } from '@ionic/angular';

interface Cliente {
  id_cliente?: number;
  nombre: string;
  apellido: string;
  dni?: string;
  email?: string | null;
  foto?: string | null;
  estado?: string;
  created_at?: string;
}

@Component({
  selector: 'app-home-cliente',
  templateUrl: './home-cliente.page.html',
  styleUrls: ['./home-cliente.page.scss'],
  standalone: false
})
export class HomeClientePage implements OnInit {
  cliente: Cliente | null = null;

  constructor(
    private router: Router,
    private authService: AuthService,
    private toastController: ToastController
  ) {}

  async ngOnInit() {
    await this.cargarDatosCliente();
  }

  async cargarDatosCliente() {
    try {
      const user = await this.authService.getCurrentUser();
      
      if (user) {
        this.cliente = await this.authService.getClienteByUserId(user.id);
        
        // Agregar el email del user si no está en el cliente
        if (this.cliente && !this.cliente.email) {
          this.cliente.email = user.email;
        }
      }
    } catch (error) {
      console.error('Error al cargar datos del cliente:', error);
      this.showToast('Error al cargar tus datos', 'danger');
    }
  }

  async logout() {
    await this.authService.logout();
    this.router.navigate(['/login'], { replaceUrl: true });
    this.showToast('Sesión cerrada correctamente', 'medium');
  }

  async showToast(message: string, color: 'success' | 'danger' | 'medium' = 'medium') {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}