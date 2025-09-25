import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AlertController, IonicModule, ToastController } from '@ionic/angular';
import { AuthService } from 'src/app/services/supabase';

@Component({
  selector: 'app-tab2-mesas',
  standalone: false,
  templateUrl: './tab2-mesas.page.html',
  styleUrls: ['./tab2-mesas.page.scss'],
})
export class Tab2Mesas implements OnInit {
  mesas: any[] = [];
  isLoading = false;

  constructor(
    private supabaseService: AuthService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {}

  async ngOnInit() {
    await this.cargarMesas();
  }

  async ionViewWillEnter() {
    await this.cargarMesas();
  }

  // 🔹 Cargar todas las mesas con su estado
  async cargarMesas() {
    this.isLoading = true;
    try {
      console.log('🔄 Cargando todas las mesas...');
      this.mesas = await this.supabaseService.getMesasConEstado();
      console.log('✅ Mesas cargadas:', this.mesas.length);
    } catch (err) {
      console.error('❌ Error cargando mesas:', err);
      
      const toast = await this.toastCtrl.create({
        message: 'Error al cargar las mesas',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    } finally {
      this.isLoading = false;
    }
  }

  // 🔹 Determinar el estado de una mesa
  getEstadoMesa(mesa: any): { texto: string; color: string; icon: string } {
    if (mesa.cliente_asignado) {
      return {
        texto: 'Ocupada',
        color: 'danger',
        icon: 'person'
      };
    } else if (mesa.disponible) {
      return {
        texto: 'Disponible',
        color: 'success',
        icon: 'checkmark-circle'
      };
    } else {
      return {
        texto: 'No disponible',
        color: 'warning',
        icon: 'warning'
      };
    }
  }

  // 🔹 Obtener información del tipo de cliente
  getTipoCliente(mesa: any): string {
    if (!mesa.cliente_asignado) return '';
    
    switch (mesa.tipo_cliente) {
      case 'anonimo':
        return 'Cliente anónimo';
      case 'registrado':
        return 'Cliente registrado';
      default:
        return 'Cliente';
    }
  }

  // 🔹 Liberar mesa con confirmación
  async liberarMesa(mesa: any) {
    const alert = await this.alertCtrl.create({
      header: 'Confirmar liberación',
      message: `¿Está seguro de que desea liberar la Mesa ${mesa.numero}?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Liberar',
          cssClass: 'danger',
          handler: async () => {
            await this.procesarLiberacion(mesa);
          }
        }
      ]
    });

    await alert.present();
  }

  // 🔹 Procesar la liberación de mesa
  private async procesarLiberacion(mesa: any) {
    const loading = await this.toastCtrl.create({
      message: 'Liberando mesa...',
      duration: 0
    });
    await loading.present();

    try {
      console.log('🔄 Liberando mesa:', mesa.id);
      
      await this.supabaseService.liberarMesa(mesa.id);
      
      await loading.dismiss();

      const toast = await this.toastCtrl.create({
        message: `Mesa ${mesa.numero} liberada exitosamente`,
        duration: 3000,
        color: 'success'
      });
      await toast.present();

      // Recargar las mesas
      await this.cargarMesas();

    } catch (err: any) {
      await loading.dismiss();
      
      console.error('❌ Error liberando mesa:', err);
      
      const toast = await this.toastCtrl.create({
        message: err.message || 'Error al liberar la mesa',
        duration: 4000,
        color: 'danger'
      });
      await toast.present();
    }
  }

  // 🔹 Método para refrescar datos
  async refrescarDatos(event: any) {
    await this.cargarMesas();
    event.target.complete();
  }

  // 🔹 Contar mesas por estado
  get mesasDisponibles(): number {
    return this.mesas.filter(m => m.disponible && !m.cliente_asignado).length;
  }

  get mesasOcupadas(): number {
    return this.mesas.filter(m => m.cliente_asignado).length;
  }

  get mesasNoDisponibles(): number {
    return this.mesas.filter(m => !m.disponible && !m.cliente_asignado).length;
  }
}
