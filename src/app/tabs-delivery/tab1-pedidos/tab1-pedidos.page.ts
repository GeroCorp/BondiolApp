import { Component, OnInit, signal, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { Router } from '@angular/router';

import { CustomLoaderService } from 'src/app/services/custom-loader.service';
import { Delivery } from 'src/app/services/delivery';
import { ClienteService } from 'src/app/services/cliente.service';

@Component({
  selector: 'app-tab1-pedidos',
  templateUrl: './tab1-pedidos.page.html',
  styleUrls: ['./tab1-pedidos.page.scss'],
  standalone: false
})
export class Tab1PedidosPage implements OnInit {

  @ViewChild('segmentContainer') segmentContainer!: ElementRef;
  @ViewChild('arrowLeft') arrowLeft!: ElementRef;
  @ViewChild('arrowRight') arrowRight!: ElementRef;

  pedidos = signal<any[]>([]);
  pedidosFiltrados = signal<any[]>([]);
  filtroEstado = 'todos';
  toDisable = ['entregado', 'confirmado']

  constructor(
    private deliveryService: Delivery, 
    private toastController: ToastController,
    private customLoader: CustomLoaderService,
    private router: Router,
    private clienteService: ClienteService
  ) { 
  }

  ngOnInit() {
    this.loadPedidos();
  }

  ngAfterViewInit() {
    // Detectar si el contenedor necesita scroll y configurar flechas
    setTimeout(() => {
      this.checkScrollNeeded();
      // Verificar cambios en el tamaño de ventana
      window.addEventListener('resize', () => {
        this.checkScrollNeeded();
      });
    }, 100);
  }

  async loadPedidos(){
    this.customLoader.show('Cargando pedidos...');
    this.deliveryService.getPedidosConDetalles().then(
      (pedidos) =>{
        // Filtrar para excluir "pendiente", "rechazado" y "pagado"
        const pedidosFiltrados = pedidos.filter(
        p => p.estado !== 'pendiente' && p.estado !== 'rechazado' && p.estado !== 'pagado' 
        );
        this.pedidos.set(pedidosFiltrados);
        console.log(this.pedidos());
        this.filtrarPedidos();
        this.customLoader.hide();
      }
    )
  }

  showMaproute(id_pedido: number){
    console.log('Navegando a mapa del pedido:', id_pedido);
    this.router.navigate(['/tabs-delivery/tab1-pedidos/maps', id_pedido]);
  }

  formatearDireccion(direccion: string){
    if (!direccion){
      console.log("Direccion vacía");
    }
    let formateada = direccion.split(',')
    return formateada[0];
  }
  
  formatEstado(estado: string) {
    const estadosMap: { [key: string]: string } = {
      'listo': 'Marcar en camino',
      'en_camino': 'Marcar como Entregado',
      'entregado': 'Esperando pago',
      'pago_pendiente':'Confirmar pago',
      'confirmado': 'Preparando pedido'
    }
    return estadosMap[estado];
  }

  toDisableEstado(estado: string): boolean {
    return this.toDisable.includes(estado);
  }

  filtrarPedidos() {
    if (this.filtroEstado === 'todos') {
      this.pedidosFiltrados.set(this.pedidos());
    } else {
      this.pedidosFiltrados.set(this.pedidos().filter(
        (pedido) => pedido.estado === this.filtroEstado
      ));
    }
    
    // Centrar el botón seleccionado en el scroll
    setTimeout(() => {
      this.scrollToActiveButton();
    }, 100);
  }

  /**
   * Verifica si el contenedor de segment necesita scroll horizontal
   */
  checkScrollNeeded() {
    if (this.segmentContainer) {
      const container = this.segmentContainer.nativeElement;
      const needsScroll = container.scrollWidth > container.clientWidth;
      
      if (needsScroll) {
        container.classList.add('scrollable');
        this.updateArrowVisibility();
      } else {
        container.classList.remove('scrollable');
        this.hideAllArrows();
      }
    }
  }

  actualizarEstadoPedido(pedido: any) {
    let nuevoEstado = '';
    if (pedido.estado === 'listo') {
      nuevoEstado = 'en_camino';
    } else if (pedido.estado === 'en_camino') {
      nuevoEstado = 'entregado';
      this.clienteService.setCanPay(true); // Habilitar pago para el cliente
    } else if (pedido.estado === 'pago_pendiente') {
      nuevoEstado = 'pagado';
    }
    const res = this.deliveryService.updateEstadoPedido(pedido.id, nuevoEstado) 

    console.log(res);
  }

  /**
   * Centra automáticamente el botón seleccionado en el contenedor
   */
  scrollToActiveButton() {
    if (this.segmentContainer) {
      const container = this.segmentContainer.nativeElement;
      const activeButton = container.querySelector('ion-segment-button.segment-button-checked');
      
      if (activeButton) {
        const containerRect = container.getBoundingClientRect();
        const buttonRect = activeButton.getBoundingClientRect();
        
        const scrollLeft = container.scrollLeft;
        const targetScroll = scrollLeft + (buttonRect.left - containerRect.left) - (containerRect.width / 2) + (buttonRect.width / 2);
        
        container.scrollTo({
          left: Math.max(0, targetScroll),
          behavior: 'smooth'
        });
      }
    }
  }

  /**
   * Evento de scroll del contenedor
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
   * Oculta todas las flechas
   */
  hideAllArrows() {
    if (this.arrowLeft && this.arrowRight) {
      this.arrowLeft.nativeElement.classList.remove('visible');
      this.arrowRight.nativeElement.classList.remove('visible');
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
    }
  }

  async handleRefresh(event: any) {
    await this.loadPedidos();
    event.target.complete();
  }

  formatearColor(estado: string): string {
    switch (estado) {
      case 'listo':
        return 'success';
      case 'entregado':
        return 'success';
      case 'pago_pendiente':
        return 'warning';
      default:
        return 'secondary';
    }
  }

  formatearFecha(fecha: string): string {
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

  async showToast(message: string, color: 'success' | 'danger' | 'medium' | 'warning') {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      color,
      position: 'bottom',
    });
    await toast.present();
  }

}
