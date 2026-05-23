import { Component, OnInit, signal } from '@angular/core';
import { ClienteService } from '../../services/cliente.service';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { CustomLoaderService } from '../../services/custom-loader.service';

@Component({
  selector: 'app-tab2-pedido',
  templateUrl: './tab2-pedido.page.html',
  styleUrls: ['./tab2-pedido.page.scss'],
  standalone: false
})
export class Tab2PedidoPage implements OnInit {
  // Variables para mostrar los cálculos
  subtotal: number = 0;
  porcentajeDescuento: number = 0;
  montoDescuento: number = 0;
  totalFinal: number = 0;

  isDelivery = signal<boolean>(false);

  // Pedido activo (ya enviado a cocina)
  pedidoActivo: any = null;
  cargandoPedidoActivo: boolean = false;

  constructor(
    public clienteService: ClienteService, 
    private router: Router,
    private toastController: ToastController,
    private customLoader: CustomLoaderService
  ) { }

  async ngOnInit() {
    this.setIsDelivery();
    await this.calcularTotales();
    await this.cargarPedidoActivo();
    if (this.pedido().length === 0) {
      this.router.navigate(['/tabs-cliente-registrado/tab1-menu']);
    }
  }

  setIsDelivery() {
    const raw = this.clienteService.esDelivery();
    this.isDelivery.set(raw);
  }

  async calcularTotales() {
    this.subtotal = this.clienteService.getSubtotal();
  }

  async cargarPedidoActivo() {
    this.cargandoPedidoActivo = true;
    try {
      this.pedidoActivo = await this.clienteService.getPedidoActivo();
    } catch (e) {
      console.error('Error cargando pedido activo:', e);
      this.pedidoActivo = null;
    } finally {
      this.cargandoPedidoActivo = false;
    }
  }

  getColorEstado(estado: string): string {
    return this.clienteService.getColorEstado(estado);
  }

  getTextoEstado(estado: string): string {
    return this.clienteService.getTextoEstado(estado);
  }

  // Getter para acceder al pedido desde el template
  get pedido() {
    return this.clienteService.pedido;
  }

  handleImages(item: any) {
    let images = item.imagenes;
    if (!images) return '';
    const imagesArray = images.split(',');
    return imagesArray[0];
  }

  async removeItem(index: number) {
    this.clienteService.removeItem(index);
    await this.calcularTotales();
    if (this.pedido().length === 0) {
      this.router.navigate(['/tabs-cliente-registrado/tab1-menu']);
    }
  }

  clearPedido() {
    this.clienteService.clearPedido();
    this.subtotal = 0;
    this.porcentajeDescuento = 0;
    this.montoDescuento = 0;
    this.totalFinal = 0;
  }

  async confirmarPedido() {
    await this.customLoader.show();
    try {
      await this.clienteService.insertPedido();
      this.clienteService.clearPedido();
      await this.calcularTotales();
      this.clienteService.setJuegosAccess(true);
      this.router.navigate(['/tabs-cliente-registrado/tab1-menu']);
    } catch (error) {
      console.error('Error al confirmar pedido:', error);
      await this.showToast('Error al confirmar el pedido', 'danger');
    } finally {
      this.customLoader.hide();
    }
  }

  async increaseQuantity(index: number) {
    const currentItem = this.clienteService.pedido()[index];
    this.clienteService.updateItemQuantity(index, currentItem.quantity + 1);
    await this.calcularTotales();
  }

  async decreaseQuantity(index: number) {
    const currentItem = this.clienteService.pedido()[index];
    this.clienteService.updateItemQuantity(index, currentItem.quantity - 1);
    await this.calcularTotales();
    if (this.pedido().length === 0) {
      this.router.navigate(['/tabs-cliente-registrado/tab1-menu']);
    }
  }

  volverHome(){
    this.router.navigate(['/tabs-cliente-registrado/tab1-menu']);
  }

  async showToast(message: string, color: 'success' | 'danger' | 'medium' = 'medium') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}