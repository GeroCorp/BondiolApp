import { Component, OnInit, signal, computed, OnDestroy } from '@angular/core';
import { LoadingController, ToastController, ModalController, NavController } from '@ionic/angular';
import { ClienteService } from 'src/app/services/cliente.service';
import { DetallePedidoModalComponent } from './detalle-pedido-modal/detalle-pedido-modal.component';
import { Router } from '@angular/router';
import { HapticService } from 'src/app/services/haptic.service';
import { TipoClienteService } from 'src/app/services/tipo-cliente.service';
import { AuthService } from 'src/app/services/supabase';

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
  pedidosSignal = signal<any[]>([]);
  
  // Computed signal para filtrar pedidos
  pedidosFiltrados = computed(() => {
    const pedidos = this.pedidosSignal();
    const filtro = this.filtroEstado();
    
    if (filtro === 'todos') {
      return pedidos;
    }
    
    return pedidos.filter(pedido => pedido.estado === filtro);
  });

  private subscription: any;
  private mesaActual: number | null = null;

  constructor(
    private router: Router,
    private clienteService: ClienteService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private modalController: ModalController,
    private navController: NavController,
    private hapticService: HapticService,
    private tipoClienteService: TipoClienteService,
    private authService: AuthService
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

  /**
   * ✅ Cargar historial de pedidos
   * FUNCIONA para clientes registrados y anónimos
   */
  async cargarHistorial() {
  this.isLoading.set(true);
  try {
    const isAnonimo = this.tipoClienteService.isAnonimo();
    const clienteData = this.tipoClienteService.getClienteData();
    const clienteId = this.tipoClienteService.getClienteId();
    
    console.log('📋 Cargando historial para:', {
      isAnonimo,
      clienteId,
      mesaAsignada: clienteData?.mesa_asignada
    });

    if (isAnonimo) {
      this.mesaActual = clienteData?.mesa_asignada || null;
      console.log('🎭 Cliente anónimo - Mesa:', this.mesaActual);
    } else {
      if (clienteId) {
        this.mesaActual = await this.clienteService.getNroMesa(clienteId);
        console.log('👤 Cliente registrado - Mesa:', this.mesaActual);
      }
    }

    if (!this.mesaActual) {
      console.warn('⚠️ No hay mesa asignada para cargar historial');
      this.pedidosSignal.set([]);
      return;
    }

    console.log('🏠 Cargando pedidos del cliente:', clienteId);

    const pedidos = await this.clienteService.getHistorialPedidos();

    console.log('✅ Pedidos obtenidos:', pedidos?.length || 0);
    console.log('📦 Pedidos completos:', pedidos);
    
    this.pedidosSignal.set(pedidos || []);
    
  } catch (error) {
    console.error('❌ Error cargando historial:', error);
    await this.hapticService.vibrateError();
    await this.showToast('Error al cargar el historial de pedidos', 'danger');
  } finally {
    this.isLoading.set(false);
  }
}

  /**
   * ✅ Iniciar suscripción en tiempo real a cambios de pedidos
   */
  async iniciarSuscripcion() {
  try {
    const isAnonimo = this.tipoClienteService.isAnonimo();
    const clienteData = this.tipoClienteService.getClienteData();
    
    let filtro: string;
    let mesaId: number | null = null;

    if (isAnonimo) {
      // ✅ ANÓNIMO: Suscribirse por MESA
      mesaId = clienteData?.mesa_asignada;
      
      if (!mesaId) {
        console.warn('⚠️ Cliente anónimo sin mesa');
        return;
      }

      filtro = `mesa=eq.${mesaId}`;
      console.log('🎭 Suscripción anónimo por mesa:', mesaId);

    } else {
      // ✅ REGISTRADO: Suscribirse por ID_CLIENTE
      const clienteId = await this.clienteService.getClientId();
      
      filtro = `id_cliente=eq.${clienteId}`;
      console.log('👤 Suscripción registrado por cliente:', clienteId);
    }

    this.subscription = this.authService.client
      .channel(`historial-pedidos-${isAnonimo ? 'anonimo-' + mesaId : 'cliente'}`)
      .on(
        'postgres_changes',
        { 
          event: '*',  // ✅ CAMBIO: Escuchar TODOS los eventos (INSERT, UPDATE, DELETE)
          schema: 'public', 
          table: 'pedidos',
          filter: filtro
        },
        async (payload) => {
          console.log('🔄 Cambio en pedidos:', payload);
          
          // ✅ Recargar historial en cualquier cambio
          await this.cargarHistorial();
        }
      )
      .subscribe();

    console.log('✅ Suscripción iniciada correctamente');
  } catch (error) {
    console.error('❌ Error iniciando suscripción:', error);
  }
}

  /**
   * Recargar historial manualmente
   */
  async recargar() {
    await this.cargarHistorial();
    await this.showToast('Historial actualizado', 'medium');
  }

  /**
   * Manejar pull-to-refresh
   */
  async handleRefresh(event: any) {
    await this.cargarHistorial();
    event.target.complete();
  }

  /**
   * Cambiar filtro de estado
   */
  cambiarFiltro(event: any) {
    const estado = String(event || 'todos');
    this.filtroEstado.set(estado);
    console.log('🔍 Filtro cambiado a:', estado);
  }

  /**
   * Formatear fecha para mostrar
   */
  formatearFecha(fecha: string): string {
    return this.clienteService.formatearFecha(fecha);
  }

  /**
   * Obtener color según estado del pedido
   */
  getColorEstado(estado: string): string {
    return this.clienteService.getColorEstado(estado);
  }

  /**
   * Obtener texto formateado del estado
   */
  getTextoEstado(estado: string): string {
    return this.clienteService.getTextoEstado(estado);
  }

  /**
   * Calcular total de items en un pedido
   */
  calcularTotalItems(detalles: any[]): number {
    return detalles?.reduce((total, item) => total + item.cantidad, 0) || 0;
  }

  /**
   * Ver detalle completo del pedido en modal
   */
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

  /**
   * Obtener ícono según estado del pedido
   */
  getIconoEstado(estado: string): string {
    const iconos: any = {
      pendiente: 'time-outline',
      confirmado: 'checkmark-circle-outline',
      en_preparacion: 'restaurant-outline',
      listo: 'checkmark-done-outline',
      entregado: 'happy-outline',
      cuenta_solicitada: 'receipt-outline',
      pago_pendiente: 'card-outline',
      pagado: 'checkmark-done-circle-outline',
      cancelado: 'close-circle-outline',
      rechazado: 'ban-outline'
    };
    return iconos[estado] || 'help-circle-outline';
  }

  /**
   * Volver a home
   */
  volverHome() {
    this.router.navigate(["/home-cliente"]);
  }

  /**
   * Mostrar toast
   */
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