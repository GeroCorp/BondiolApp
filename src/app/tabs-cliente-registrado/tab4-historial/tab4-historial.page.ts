import { Component, OnInit, signal, computed, OnDestroy } from '@angular/core';
import { LoadingController, ToastController, ModalController, NavController } from '@ionic/angular';
import { ClienteService } from 'src/app/services/cliente.service';
import { DetallePedidoModalComponent } from './detalle-pedido-modal/detalle-pedido-modal.component';
import { Router } from '@angular/router';

import { HapticService } from 'src/app/services/haptic.service';
@Component({
  selector: 'app-tab4-historial',
  templateUrl: './tab4-historial.page.html',
  styleUrls: ['./tab4-historial.page.scss'],
  standalone: false,
})
export class Tab4HistorialPage implements OnInit, OnDestroy {
  // Signals para el manejo reactivo del estado
  isLoading = signal<boolean>(false);
  filtroEstado = signal<string>('todos');
  
  // Computed signal para filtrar pedidos
  pedidosFiltrados = computed(() => {
    const pedidos = this.clienteService.historialPedidos();
    const filtro = this.filtroEstado();
    
    if (filtro === 'todos') {
      return pedidos;
    }
    
    return pedidos.filter(pedido => pedido.estado === filtro);
  });

  private subscription: any;

  constructor(
    private router: Router,
    private clienteService: ClienteService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private modalController: ModalController,
    private navController: NavController,
    private hapticService: HapticService
  ) {}

  async ngOnInit() {
    await this.cargarHistorial();
    await this.iniciarSuscripcion();
  }

  async ngOnDestroy() {
    if (this.subscription) {
      await this.subscription.unsubscribe();
    }
  }

  async cargarHistorial() {
    this.isLoading.set(true);
    try {
      await this.clienteService.getHistorialPedidos();
      console.log('✅ Historial cargado:', this.clienteService.historialPedidos());
    } catch (error) {
      console.error('❌ Error cargando historial:', error);
      await this.hapticService.vibrateError();
      await this.showToast('Error al cargar el historial de pedidos', 'danger');
    } finally {
      this.isLoading.set(false);
    }
  }

  async iniciarSuscripcion() {
    try {
      this.subscription = await this.clienteService.subscribeToHistorialPedidos();
    } catch (error) {
      console.error('❌ Error iniciando suscripción:', error);
    }
  }

  async recargar() {
    await this.cargarHistorial();
    await this.showToast('Historial actualizado', 'medium');
  }

  async handleRefresh(event: any) {
    await this.cargarHistorial();
    event.target.complete();
  }

  cambiarFiltro(event: any) {
    const estado = String(event || 'todos');
    this.filtroEstado.set(estado);
  }

  formatearFecha(fecha: string): string {
    return this.clienteService.formatearFecha(fecha);
  }

  getColorEstado(estado: string): string {
    return this.clienteService.getColorEstado(estado);
  }

  getTextoEstado(estado: string): string {
    return this.clienteService.getTextoEstado(estado);
  }

  calcularTotalItems(detalles: any[]): number {
    return detalles?.reduce((total, item) => total + item.cantidad, 0) || 0;
  }

  async verDetalle(pedido: any) {
    const modal = await this.modalController.create({
      component: DetallePedidoModalComponent,
      componentProps: {
        pedido: pedido
      },
      breakpoints: [0, 0.3, 0.7, 1],
      initialBreakpoint: 0.7,
      backdropDismiss: true
    });

    await modal.present();
  }

  getIconoEstado(estado: string): string {
    const iconos: any = {
      pendiente: 'time-outline',
      confirmado: 'checkmark-circle-outline',
      en_preparacion: 'restaurant-outline',
      listo: 'checkmark-done-outline',
      entregado: 'happy-outline',
      pagado: 'card-outline',
      cancelado: 'close-circle-outline'
    };
    return iconos[estado] || 'help-circle-outline';
  }

  volverHome() {
    this.router.navigate(["/home-cliente"]);
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'medium') {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}
