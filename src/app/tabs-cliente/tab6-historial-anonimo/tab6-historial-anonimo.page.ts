import { Component, OnInit, OnDestroy } from '@angular/core';
import { ToastController, ModalController } from '@ionic/angular';
import { AuthService } from '../../services/supabase';
import { DetallePedidoModalComponent } from '../../tabs-cliente-registrado/tab4-historial/detalle-pedido-modal/detalle-pedido-modal.component'

@Component({
  selector: 'app-tab6-historial-anonimo',
  templateUrl: './tab6-historial-anonimo.page.html',
  styleUrls: ['./tab6-historial-anonimo.page.scss'],
  standalone: false,
})
export class Tab6HistorialAnonimoPage implements OnInit, OnDestroy {
  isLoading = false;
  filtroEstado = 'todos';
  pedidos: any[] = [];
  pedidosFiltrados: any[] = [];
  private subscription: any;

  constructor(
    private authService: AuthService,
    private toastController: ToastController,
    private modalController: ModalController
  ) {}

  async ngOnInit() {
    console.log('✅ Historial anónimo - ngOnInit');
    await this.cargarHistorial();
    await this.iniciarSuscripcion();
  }

  async ngOnDestroy() {
    console.log('🔄 Historial anónimo - ngOnDestroy');
    if (this.subscription) {
      await this.subscription.unsubscribe();
    }
  }

  async cargarHistorial() {
    this.isLoading = true;
    try {
      const mesaData = sessionStorage.getItem('numero_mesa');
      
      if (!mesaData) {
        console.log('❌ No hay mesa en sessionStorage');
        this.showToast('No tienes una mesa asignada', 'warning');
        this.isLoading = false;
        return;
      }

      const numeroMesa = parseInt(mesaData);

      // Obtener el ID de la mesa
      const { data: mesaInfo, error: mesaError } = await this.authService.client
        .from('mesas')
        .select('id')
        .eq('numero', numeroMesa)
        .single();

      if (mesaError || !mesaInfo) {
        console.error('❌ Error obteniendo ID de mesa:', mesaError);
        this.isLoading = false;
        return;
      }
      const mesaId = mesaInfo.id;

      // ✅ Obtener pedidos de esta mesa (cliente anónimo)
      const { data, error } = await this.authService.client
        .from('pedidos')
        .select(`
          *,
          mesa:mesas(numero, id),
          detalles_pedido(*)
        `)
        .eq('mesa', mesaId)
        .is('id_cliente', null) // Solo pedidos anónimos
        .order('fecha', { ascending: false });

      if (error) {
        console.error('❌ Error cargando historial:', error);
        throw error;
      }

      this.pedidos = data || [];
      this.aplicarFiltro();
      
      console.log('✅ Historial cargado:', this.pedidos.length, 'pedidos');
    } catch (error) {
      console.error('❌ Error en cargarHistorial:', error);
      this.showToast('Error al cargar el historial de pedidos', 'danger');
    } finally {
      this.isLoading = false;
    }
  }
  
  async iniciarSuscripcion() {
    try {
      const mesaData = sessionStorage.getItem('numero_mesa');
      
      if (!mesaData) {
        return;
      }

      const numeroMesa = parseInt(mesaData);

      // Obtener el ID de la mesa
      const { data: mesaInfo } = await this.authService.client
        .from('mesas')
        .select('id')
        .eq('numero', numeroMesa)
        .single();

      if (!mesaInfo) {
        return;
      }

      const mesaId = mesaInfo.id;

      this.subscription = this.authService.client
        .channel('historial-pedidos-anonimo-channel')
        .on(
          'postgres_changes',
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'pedidos',
            filter: `mesa=eq.${mesaId}`
          },
          async (payload) => {
            console.log('🔄 Cambio en pedidos detectado:', payload);
            
            // Recargar historial cuando hay cambios
            await this.cargarHistorial();
          }
        )
        .subscribe();

      console.log('✅ Suscripción a historial de pedidos iniciada');
    } catch (error) {
      console.error('❌ Error suscribiéndose al historial:', error);
    }
  }

  cambiarFiltro(value: any) {
    const estado = String(value || 'todos');
    this.filtroEstado = estado;
    this.aplicarFiltro();
  }

  private aplicarFiltro() {
    if (this.filtroEstado === 'todos') {
      this.pedidosFiltrados = [...this.pedidos];
    } else {
      this.pedidosFiltrados = this.pedidos.filter(
        pedido => pedido.estado === this.filtroEstado
      );
    }
  }

  async recargar() {
    await this.cargarHistorial();
    this.showToast('Historial actualizado', 'medium');
  }

  async handleRefresh(event: any) {
    await this.cargarHistorial();
    event.target.complete();
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '';
    
    const date = new Date(fecha);
    const hoy = new Date();
    
    const opciones: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
    };

    const hora = date.toLocaleTimeString('es-AR', opciones);

    if (date.toDateString() === hoy.toDateString()) {
      return `Hoy ${hora}`;
    } else {
      return `${date.toLocaleDateString('es-AR')} ${hora}`;
    }
  }

  getColorEstado(estado: string): string {
    const colores: any = {
      pendiente: 'warning',
      confirmado: 'tertiary',
      en_preparacion: 'secondary',
      listo: 'success',
      entregado: 'primary',
      cuenta_solicitada: 'medium',
      pago_pendiente: 'warning',
      pagado: 'success',
      cancelado: 'danger'
    };
    return colores[estado] || 'medium';
  }

  getTextoEstado(estado: string): string {
    const textos: any = {
      pendiente: 'Pendiente',
      confirmado: 'Confirmado',
      en_preparacion: 'En preparación',
      listo: 'Listo para servir',
      entregado: 'Entregado',
      cuenta_solicitada: 'Cuenta solicitada',
      pago_pendiente: 'Pago pendiente',
      pagado: 'Pagado',
      cancelado: 'Cancelado'
    };
    return textos[estado] || estado;
  }

  calcularTotalItems(detalles: any[]): number {
    if (!detalles || detalles.length === 0) return 0;
    return detalles.reduce((total, item) => total + item.cantidad, 0);
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

  private async showToast(message: string, color: 'success' | 'danger' | 'medium' | 'warning') {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}