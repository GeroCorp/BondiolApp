import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { Mozo, ESTADO } from 'src/app/services/mozo';
import { AuthService } from 'src/app/services/supabase';
import { DetallePedidoModalComponent } from './detalle-pedido-modal/detalle-pedido-modal.component';
import { Notification } from 'src/app/services/notification';
import { HapticService } from 'src/app/services/haptic.service';
import { EmailService, DatosFactura } from 'src/app/services/email';
import { CustomLoaderService } from 'src/app/services/custom-loader.service';
import { ClienteService } from 'src/app/services/cliente.service';
@Component({
  selector: 'app-tab2-pedidos-confirmados',
  templateUrl: './tab2-pedidos-confirmados.page.html',
  styleUrls: ['./tab2-pedidos-confirmados.page.scss'],
  standalone: false,
})
export class Tab2PedidosConfirmadosPage implements OnInit, AfterViewInit {
  @ViewChild('segmentContainer') segmentContainer!: ElementRef;
  @ViewChild('arrowLeft') arrowLeft!: ElementRef;
  @ViewChild('arrowRight') arrowRight!: ElementRef;
  
  pedidos: any[] = [];
  pedidosFiltrados: any[] = [];
  filtroEstado = 'todos';
  cargando = true;

  constructor(
    private mozoService: Mozo,
    private authService: AuthService,
    private modalController: ModalController,
    private toastController: ToastController,
    private customLoader: CustomLoaderService,
    private notificationService: Notification,
    private hapticService: HapticService,
    private emailService: EmailService,
    private clienteService: ClienteService // Para habilitar pago al entregar pedido
  ) {}

  async ngOnInit() {
    await this.cargarPedidos();
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

  async cargarPedidos() {
    this.cargando = true;
    try {
      const pedidos = await this.mozoService.getPedidosConfirmados();
      this.pedidos = pedidos || [];
      this.filtrarPedidos();
    } catch (error) {
      console.error('Error al cargar pedidos:', error);
      await this.hapticService.vibrateError();
      this.showToast('Error al cargar pedidos confirmados', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  filtrarPedidos() {
    if (this.filtroEstado === 'todos') {
      this.pedidosFiltrados = this.pedidos;
    } else {
      this.pedidosFiltrados = this.pedidos.filter(
        (pedido) => pedido.estado === this.filtroEstado
      );
    }
    
    // Centrar el botón seleccionado en el scroll
    setTimeout(() => {
      this.scrollToActiveButton();
    }, 100);
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

  async recargar() {
    await this.cargarPedidos();
    this.showToast('Lista actualizada', 'medium');
  }

  async handleRefresh(event: any) {
    await this.cargarPedidos();
    event.target.complete();
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

  getColorEstado(estado: string): string {
    const colores: any = {
      confirmado: 'warning',
      en_preparacion: 'danger',
      'en_preparación': 'danger',
      listo: 'success',
      entregado: 'medium'
    };
    return colores[estado] || 'medium';
  }

  getTextoEstado(estado: string): string {
    const textos: any = {
      pendiente: 'Pendiente',
      confirmado: 'Confirmado',
      en_preparacion: 'En preparación',
      'en_preparación': 'En preparación',
      listo: 'Listo',
      entregado: 'Entregado'
    };
    return textos[estado] || estado;
  }

  getColorSector(estado: string): string {
    const colores: any = {
      pendiente: 'warning',
      en_preparacion: 'tertiary',
      'en_preparación': 'tertiary',
      listo: 'success'
    };
    return colores[estado] || 'medium';
  }

  async marcarEntregado(pedido: any) {
    await this.customLoader.show('Marcando como entregado...');

    try {
      await this.authService.actualizarEstadoPedido(pedido.id, 'entregado');

      await this.notificationService.sendNotificationToCliente(
        `Pedido entregado`,
        `Su pedido fue marcado como entregado por el mozo, por favor confirme el estado.`,
        '',
        pedido.id_cliente
      );

      this.clienteService.setCanPay(true); // Habilitar pago para el cliente

      await this.customLoader.hide();
      this.showToast('Pedido marcado como entregado', 'success');
      await this.cargarPedidos();
    } catch (error) {
      await this.customLoader.hide();
      console.error('Error al marcar como entregado:', error);
      await this.hapticService.vibrateError();
      this.showToast('Error al actualizar el pedido', 'danger');
    }
  }

  async verDetalle(pedido: any) {
    try {
      // Cargar los items del pedido
      const items = await this.mozoService.getDetallesPedido(pedido.id || pedido.id_pedido);
      
      // Crear y presentar el modal
      const modal = await this.modalController.create({
        component: DetallePedidoModalComponent,
        componentProps: {
          pedido: pedido,
          items: items || []
        },
        cssClass: 'detalle-pedido-modal',
        animated: false
      });
      
      await modal.present();
    } catch (error) {
      console.error('Error al cargar detalle del pedido:', error);
      await this.hapticService.vibrateError();
      this.showToast('Error al cargar el detalle del pedido', 'danger');
    }
  }

  async confirmarPago(pedido: any) {
    if (pedido.estado !== 'pago_pendiente') {
      this.showToast('El cliente aún no ha realizado el pago', 'warning');
      return;
    }

    await this.customLoader.show('Confirmando pago y liberando mesa...');

    try {
      const pedidoId = pedido.id || pedido.id_pedido;
      const mesaId = pedido.mesa?.id || pedido.mesa;
      const numeroMesa = pedido.mesa?.numero;
      let cliente;
      if (pedido.id_cliente){
        cliente = await this.mozoService.getdatosCliente(pedido.id_cliente);
      }else{
        cliente = await this.mozoService.getDatosAnon(mesaId);
      }
      console.log('💳 Confirmando pago:', {
        pedidoId,
        mesaId,
        numeroMesa,
        id_cliente: pedido.id_cliente ? pedido.id_cliente : cliente.id_clienteanonimo
      });

      // 1️⃣ Cambiar estado del pedido a 'pagado'
      const estadoMesa = await this.mozoService.actualizarEstadoPedido(pedidoId, ESTADO.PAGADO);
      if (estadoMesa){
        console.log('✅ Pedido marcado como pagado');
      }else{
        throw new Error('No se pudo actualizar el estado del pedido a pagado');
      }

      // 2️⃣ Liberar la mesa
      const isLiberada = await this.authService.liberarMesa(mesaId)

      if(!isLiberada){
        throw new Error('No se pudo liberar la mesa');
      }

      console.log('✅ Mesa liberada');

      // 3️⃣ Limpiar datos del cliente
      if (pedido.id_cliente) {
        // ✅ CLIENTE REGISTRADO
        console.log('👤 Limpiando mesa de cliente registrado:', cliente.id_cliente);
        
        const { error: errorCliente } = await this.authService.client
          .from('clientes')
          .update({ mesa_asignada: null })
          .eq('id_cliente', cliente.id_cliente);

        if (errorCliente) {
          console.error('❌ Error actualizando cliente:', errorCliente);
        } else {
          console.log('✅ Mesa limpiada de cliente registrado');
        }
        
      } else {
        // ✅ CLIENTE ANÓNIMO
        console.log('🎭 Buscando cliente anónimo en mesa:', mesaId);
                  
          const { error: errorAnonimo } = await this.authService.client
          .from('clientes_anonimos')
          .update({ mesa_asignada: null })
          .eq('id_clienteanonimo', cliente.id_clienteanonimo);
      }
      

      // 4️⃣ Notificaciones
      await this.notificationService.sendNotificationToPerfil(
        'dueño',
        '💰 Pago confirmado',
        `Mesa ${numeroMesa} - Pedido #${pedidoId} pagado y liberado. Total: $${pedido.total}`
      );

      await this.notificationService.sendNotificationToPerfil(
        'supervisor',
        '💰 Pago confirmado',
        `Mesa ${numeroMesa} - Pedido #${pedidoId} pagado y liberado. Total: $${pedido.total}`
      );

      const detalles = await this.mozoService.getDetallesPedido(pedidoId);

      // Enviar el mail solo si el pedido tiene un cliente asociado
      if (pedido.id_cliente){
        this.emailService.enviarEmailFactura(pedidoId, pedido.total, cliente, pedido.porcentajePropina, pedido.descuento, detalles);
        await this.notificationService.sendNotificationToCliente(
          '✅ Pago confirmado',
          'Tu pago fue confirmado. ¡Gracias por visitarnos! Esperamos verte pronto.',
          '',
          pedido.id_cliente
        );
        console.log("Mail enviado con exito.");
      }
      else{
        const datosPDF: DatosFactura ={
          pedidoId: pedidoId,
          SUBTOTAL: pedido.total,
          cliente_nombre: cliente.nombre,
          cliente_dni: cliente.dni || 0,
          items_facturados: detalles,
          DESCUENTO_APLICADO: pedido.descuento ? pedido.descuento : 0,
          PORCENTAJE_PROPINA: pedido.porcentajePropina ? pedido.porcentajePropina : 0,
          IMPORTE_PROPINA: pedido.total * (pedido.porcentajePropina / 100)
        }
        const res = await this.emailService.generarPDF(datosPDF);
        const downloadLink = res?.downloadLink || '';
        
        await this.notificationService.sendNotificationToCliente(
          '✅ Pago confirmado',
          `Tu pago fue confirmado. Gracias por visitarnos! Esperamos verte pronto.\n\nPresiona para ver tu factura.`,
          downloadLink,
          cliente.id_clienteanonimo
        );

      }

      await this.customLoader.hide();
      this.showToast('Pago confirmado y mesa liberada', 'success');
      await this.cargarPedidos();
      
    } catch (error) {
      await this.customLoader.hide();
      console.error('❌ Error al confirmar pago:', error);
      await this.hapticService.vibrateError();
      this.showToast('Error al confirmar pago', 'danger');
    }
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

  async showToast(message: string, color: 'success' | 'danger' | 'medium' | 'warning') {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      color,
      position: 'bottom',
    });
    await toast.present();
  }

  async test() {
    const datosPDF: DatosFactura = {
      pedidoId: 12345,
      SUBTOTAL: 2500,
      cliente_nombre: "Juan Pérez",
      cliente_dni: 12345678,
      items_facturados: [
        { nombre_prod: "Pizza Margherita", cantidad: 1, precio_unitario: 1200, id:1 },
        { nombre_prod: "Coca Cola 500ml", cantidad: 2, precio_unitario: 650 , id:2}
      ],
      DESCUENTO_APLICADO: 10,
      PORCENTAJE_PROPINA: 10,
      IMPORTE_PROPINA: 250
    }
    const res = await this.emailService.generarPDF(datosPDF);
    const downloadLink = res?.downloadLink || '';
    
    await this.notificationService.sendNotificationToCliente(
      '✅ Pago confirmado',
      `Tu pago fue confirmado. Gracias por visitarnos! Esperamos verte pronto.\n\nPresiona para ver tu factura.`,
      downloadLink,
      126
    );
  }
}