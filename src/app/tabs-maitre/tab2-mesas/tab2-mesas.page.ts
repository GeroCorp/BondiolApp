import { Component, OnInit, signal } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { AuthService } from '../../services/supabase';

@Component({
  selector: 'app-tab2-mesas',
  templateUrl: './tab2-mesas.page.html',
  styleUrls: ['./tab2-mesas.page.scss'],
  standalone: false,
})
export class Tab2MesasPage implements OnInit {

  mesas = signal<any[]>([]);
  isLoading = signal<boolean>(true);

  constructor(
    private supabase: AuthService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) { }

  ngOnInit() {
    this.loadMesas();
  }

  async loadMesas() {
    this.isLoading.set(true);

    try {
      const data = await this.supabase.getMesasConEstado();
      this.mesas.set(data);
    }catch (err){
      console.error('Error loading mesas:', err);
    }finally {
      this.isLoading.set(false);
    }
  }

  // Método para refrescar datos
  async handleRefresh(event: any) {
    await this.loadMesas();
    event.target.complete();
  }

  // TrackBy function para mejor rendimiento
  trackByMesa(index: number, mesa: any): any {
    return mesa.id || mesa.numero;
  }

  // Getters para estadísticas
  get mesasDisponibles(): number {
    return this.mesas().filter(m => m.disponible && !m.cliente_asignado).length;
  }

  get mesasOcupadas(): number {
    return this.mesas().filter(m => m.cliente_asignado).length;
  }

  get mesasNoDisponibles(): number {
    return this.mesas().filter(m => !m.disponible && !m.cliente_asignado).length;
  }

  // Métodos para obtener información de estado
  getEstadoColor(mesa: any): string {
    if (mesa.cliente_asignado) return 'danger';
    if (mesa.disponible) return 'success';
    return 'warning';
  }

  getEstadoTexto(mesa: any): string {
    if (mesa.cliente_asignado) return 'Ocupada';
    if (mesa.disponible) return 'Disponible';
    return 'No disponible';
  }

  // Métodos para información del cliente
  getClienteNombre(mesa: any): string {
    if (!mesa.cliente_asignado) return '';
    
    // Si tenemos información del cliente del JOIN
    if (mesa.clientes && typeof mesa.clientes === 'object') {
      const cliente = mesa.clientes;
      if (cliente.nombre && cliente.apellido) {
        return `${cliente.nombre} ${cliente.apellido}`;
      }
    }
    
    // Fallback: solo mostrar el ID
    return `Cliente #${mesa.cliente_asignado}`;
  }

  getClienteEmail(mesa: any): string {
    if (!mesa.cliente_asignado || !mesa.clientes) return '';
    
    if (mesa.clientes && typeof mesa.clientes === 'object') {
      return mesa.clientes.email || '';
    }
    
    return '';
  }

  // Métodos de acción
  async liberarMesa(mesa: any) {
    const alert = await this.alertCtrl.create({
      header: 'Confirmar liberación',
      message: `¿Está seguro de que desea liberar la Mesa ${mesa.numero}?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
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

  private async procesarLiberacion(mesa: any) {
    try {
      // Aquí iría la lógica para liberar la mesa en Supabase
      await this.supabase.liberarMesa(mesa.id);
      
      const toast = await this.toastCtrl.create({
        message: `Mesa ${mesa.numero} liberada exitosamente`,
        duration: 3000,
        color: 'success'
      });
      await toast.present();
      
      await this.loadMesas(); // Recargar datos
    } catch (err: any) {
      const toast = await this.toastCtrl.create({
        message: err.message || 'Error al liberar la mesa',
        duration: 4000,
        color: 'danger'
      });
      await toast.present();
    }
  }

  async asignarMesa(mesa: any) {
    const alert = await this.alertCtrl.create({
      header: 'Asignar Mesa',
      message: `Ingrese el ID del cliente para asignar a la Mesa ${mesa.numero}:`,
      inputs: [
        {
          name: 'clienteId',
          type: 'number',
          placeholder: 'ID del cliente',
          min: 1
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Asignar',
          handler: async (data) => {
            if (data.clienteId && data.clienteId > 0) {
              await this.procesarAsignacion(mesa, data.clienteId);
            }
          }
        }
      ]
    });
    await alert.present();
  }

  private async procesarAsignacion(mesa: any, clienteId: number) {
    try {
      // Aquí iría la lógica para asignar la mesa en Supabase
      // await this.supabase.asignarMesa(mesa.id, clienteId);
      
      const toast = await this.toastCtrl.create({
        message: `Mesa ${mesa.numero} asignada exitosamente`,
        duration: 3000,
        color: 'success'
      });
      await toast.present();
      
      await this.loadMesas(); // Recargar datos
    } catch (err: any) {
      const toast = await this.toastCtrl.create({
        message: err.message || 'Error al asignar la mesa',
        duration: 4000,
        color: 'danger'
      });
      await toast.present();
    }
  }

  async toggleDisponibilidad(mesa: any) {
    const nuevoEstado = !mesa.disponible;
    const accion = nuevoEstado ? 'activar' : 'desactivar';
    
    const alert = await this.alertCtrl.create({
      header: `${accion.charAt(0).toUpperCase() + accion.slice(1)} Mesa`,
      message: `¿Está seguro de que desea ${accion} la Mesa ${mesa.numero}?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: accion.charAt(0).toUpperCase() + accion.slice(1),
          handler: async () => {
            await this.procesarCambioDisponibilidad(mesa, nuevoEstado);
          }
        }
      ]
    });
    await alert.present();
  }

  private async procesarCambioDisponibilidad(mesa: any, disponible: boolean) {
    try {
      // Aquí iría la lógica para cambiar disponibilidad en Supabase
      // await this.supabase.cambiarDisponibilidadMesa(mesa.id, disponible);
      
      const toast = await this.toastCtrl.create({
        message: `Mesa ${mesa.numero} ${disponible ? 'activada' : 'desactivada'} exitosamente`,
        duration: 3000,
        color: 'success'
      });
      await toast.present();
      
      await this.loadMesas(); // Recargar datos
    } catch (err: any) {
      const toast = await this.toastCtrl.create({
        message: err.message || 'Error al cambiar la disponibilidad',
        duration: 4000,
        color: 'danger'
      });
      await toast.present();
    }
  }

}
