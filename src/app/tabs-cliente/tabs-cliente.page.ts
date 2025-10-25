import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/supabase';
import { ClienteAnonimoService } from '../services/cliente-anonimo.service';
import { AlertController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-tabs-cliente',
  templateUrl: './tabs-cliente.page.html',
  styleUrls: ['./tabs-cliente.page.scss'],
  standalone: false
})
export class TabsClientePage implements OnInit, OnDestroy {
  cantidadItems: number = 0;
  private pedidoSubscription: any;

  constructor(
    private router: Router,
    private supabase: AuthService,
    private clienteService: ClienteAnonimoService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    console.log('🔄 Tabs-cliente inicializado');
    
    // Suscribirse a cambios en el pedido
    this.pedidoSubscription = this.clienteService.pedido$.subscribe(pedido => {
      this.cantidadItems = pedido.reduce((sum, item) => sum + item.quantity, 0);
    });
  }

  ngOnDestroy() {
    console.log('🔄 Tabs-cliente destruido');
    
    // Solo desuscribirse del observable, NO limpiar la sesión
    if (this.pedidoSubscription) {
      this.pedidoSubscription.unsubscribe();
    }
  }

  /**
   * ✅ ÚNICO método que cierra sesión - Se ejecuta al presionar el botón de salir
   */
  async salir() {
    const alert = await this.alertCtrl.create({
      header: 'Cerrar Sesión',
      message: '¿Deseas salir? Tu mesa será liberada y deberás registrarte nuevamente.',
      buttons: [
        { 
          text: 'Cancelar', 
          role: 'cancel' 
        },
        {
          text: 'Salir',
          handler: async () => await this.cerrarSesion()
        }
      ]
    });

    await alert.present();
  }

  /**
   * ✅ Cierra la sesión, libera la mesa y limpia los datos
   */
  private async cerrarSesion() {
    try {
      console.log('🔐 Cerrando sesión desde tabs-cliente...');

      // Usar el servicio para liberar la mesa correctamente
      // Esto:
      // 1. Limpia los mensajes del chat
      // 2. Libera la mesa en la BD
      // 3. Actualiza el cliente anónimo
      // 4. Limpia el storage local
      await this.clienteService.cerrarSesionYLiberarMesa();

      await this.showToast('Sesión cerrada correctamente', 'success');
      
      // Navegar a ingreso anónimo
      await this.router.navigate(['/ingreso-anonimo'], { replaceUrl: true });
      
    } catch (error: any) {
      console.error('❌ Error al cerrar sesión:', error);
      await this.showToast('Error al cerrar sesión: ' + error.message, 'danger');
      
      // Navegar de todas formas para que no quede atascado
      await this.router.navigate(['/ingreso-anonimo'], { replaceUrl: true });
    }
  }

  /**
   * ✅ Helper para mostrar toasts
   */
  private async showToast(message: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}