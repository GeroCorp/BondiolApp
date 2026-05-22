import { Component, OnInit, signal, computed, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { ToastController, ModalController } from '@ionic/angular';
import { ClienteService } from 'src/app/services/cliente.service';
import { DetallePedidoModalComponent } from './detalle-pedido-modal/detalle-pedido-modal.component';
import { Router } from '@angular/router';

import { CustomLoaderService } from 'src/app/services/custom-loader.service';
import { Notification } from 'src/app/services/notification';
import { HapticService } from 'src/app/services/haptic.service';
import { TipoClienteService } from 'src/app/services/tipo-cliente.service';
import { Delivery } from 'src/app/services/delivery';

interface Pedido {
  mesa: number | null;
  estado: string;
  fecha: string;
  total: number;
  detalles_pedido: detallePedido[];
  tiempo_estimado: number;
}

interface detallePedido {
  nombre_prod: string;
  cantidad: number;
  precio_unitario: number;
  tipo: 'plato' | 'bebida';
  imagen?: string;
}
@Component({
  selector: 'app-tab4-historial',
  templateUrl: './tab4-historial.page.html',
  styleUrls: ['./tab4-historial.page.scss'],
  standalone: false,
})
export class Tab4HistorialPage implements OnInit, OnDestroy, AfterViewInit {
  // ViewChild para scroll
  @ViewChild('segmentContainer', { static: false }) segmentContainer: ElementRef | undefined;
  @ViewChild('arrowLeft', { static: false }) arrowLeft: ElementRef | undefined;
  @ViewChild('arrowRight', { static: false }) arrowRight: ElementRef | undefined;

  // Signals para el manejo reactivo del estado
  isLoading = signal<boolean>(false);
  pedido = signal<Pedido | null>(null);
  canConfirm = signal<boolean>(false);
  canPay = signal<boolean>(false);
  isDelivery: boolean = false;
  carouselImgs: string[] = [];
  carouselIndex = signal<number>(0);


  private subscription: any;
  private mesaActual: number | null = null;

  constructor(
    private router: Router,
    private clienteService: ClienteService,
    private toastController: ToastController,
    private modalController: ModalController,
    private hapticService: HapticService,
    private tipoClienteService: TipoClienteService,
    private deliveryService: Delivery,
    private customLoader: CustomLoaderService,
    private notificationService: Notification
  ){}

  async ngOnInit() {
    this.isDelivery = this.clienteService.esDelivery();
    await this.cargarPedido();
    await this.handleImagenesPedido();
    await this.iniciarSuscripcion();
  }

  async ngOnDestroy() {
    if (this.subscription) {
      await this.subscription.unsubscribe();
      console.log('🛑 Suscripción a historial de pedidos cancelada');
    }
  }

  ngAfterViewInit() {
    // Inicializar la visibilidad de las flechas
    setTimeout(() => this.updateArrowVisibility(), 100);
  }

  /**
   * ✅ Cargar el ultimo pedido activo del cliente
   * FUNCIONA para clientes registrados y anónimos
   */
  async cargarPedido() {
  this.customLoader.show('Cargando historial...');
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

    if (!this.mesaActual && this.isDelivery) {

      const pedidoActivo = await this.clienteService.getPedidoActivo();
      this.pedido.set(pedidoActivo);

    } else {
  
      const pedidoActivo = await this.clienteService.getPedidoActivo();

  
      console.log('✅ Pedidos obtenidos:', pedidoActivo?.length || 0);
      console.log('📦 Pedidos completos:', pedidoActivo);
      
      this.pedido.set(pedidoActivo || null);
      this.canConfirm.set(pedidoActivo?.estado == 'entregado');
      this.canPay.set(pedidoActivo?.estado == 'entrega_confirmada');
      this.handleImagenesPedido();
      console.log("Pedido completo: ", this.pedido());
    }

    
  } catch (error) {
    console.error('❌ Error cargando historial:', error);
    this.customLoader.hide();
    await this.hapticService.vibrateError();
    await this.showToast('Error al cargar el historial de pedidos', 'danger');
  } finally {
    this.customLoader.hide();
  }
}

  handleImagenesPedido(){
    // Dejar solo la primer imagen (url) de cada producto
    const pedido = this.pedido();
    console.log("Pedido con imagenes: ", pedido);
    if (pedido?.detalles_pedido) {
      pedido.detalles_pedido.forEach((detalle) => {
        this.carouselImgs.push(detalle.imagen!);
      })
    }
  }

  confirmarPedido() {
    // El boton confirmara la entrega del pedido, y "habilitara" el pago
    this.canPay.set(true);
    this.canConfirm.set(false);

    this.clienteService.confirmarPedido();

    this.notificationService.sendNotificationToPerfil(
      'mozo',
      'Cliente ha confirmado la entrega del pedido',
      `La mesa ${this.mesaActual} ha confirmado la correcta entrega de su pedido.`)
  }

  iraCuenta() {
  this.router.navigate(['/tabs-cliente-registrado/tab8-cuenta']);
  }

  cambiarImagen(direccion: number) {
    const totalImgs = this.carouselImgs.length;
    if (totalImgs > 0) {
      const nuevaIndex = (this.carouselIndex() + direccion + totalImgs) % totalImgs;
      this.carouselIndex.set(nuevaIndex);
    }

  }

  /**
   * ✅ Iniciar suscripción en tiempo real a cambios de pedidos
   */
  async iniciarSuscripcion() {
    try {
      this.subscription = await this.clienteService.subscribeToHistorialPedidos(() => this.cargarPedido());
    } catch (error) {
      console.error('❌ Error iniciando suscripción:', error);
    }
  }

  /**
   * Recargar historial manualmente
   */
  async recargar() {
    await this.cargarPedido();
    await this.showToast('Historial actualizado', 'medium');
  }

  /**
   * Manejar pull-to-refresh
   */
  async handleRefresh(event: any) {
    await this.cargarPedido();
    event.target.complete();
  }

  /**
   * Cambiar filtro de estado
   */
  cambiarFiltro(event: any) {
    const estado = String(event || 'todos');
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

  /**
   * Manejo del scroll en los botones de filtro
   */
  onScroll() {
    this.updateArrowVisibility();
  }

  /**
   * Actualiza la visibilidad de las flechas según la posición del scroll
   */
  updateArrowVisibility() {
    if (this.segmentContainer && this.arrowLeft && this.arrowRight) {
      const container = this.segmentContainer.nativeElement;
      const { scrollLeft, scrollWidth, clientWidth } = container;
      
      const atStart = scrollLeft <= 10;
      const atEnd = scrollLeft >= scrollWidth - clientWidth - 10;
      
      // Mostrar/ocultar flecha izquierda
      if (atStart) {
        this.arrowLeft.nativeElement.classList.remove('visible');
      } else {
        this.arrowLeft.nativeElement.classList.add('visible');
      }
      
      // Mostrar/ocultar flecha derecha
      if (atEnd) {
        this.arrowRight.nativeElement.classList.remove('visible');
      } else {
        this.arrowRight.nativeElement.classList.add('visible');
      }
    }
  }

  /**
   * Scroll hacia la izquierda
   */
  scrollLeft() {
    if (this.segmentContainer) {
      const container = this.segmentContainer.nativeElement;
      container.scrollBy({
        left: -150,
        behavior: 'smooth'
      });
      setTimeout(() => this.updateArrowVisibility(), 300);
    }
  }

  /**
   * Scroll hacia la derecha
   */
  scrollRight() {
    if (this.segmentContainer) {
      const container = this.segmentContainer.nativeElement;
      container.scrollBy({
        left: 150,
        behavior: 'smooth'
      });
      setTimeout(() => this.updateArrowVisibility(), 300);
    }
  }
}