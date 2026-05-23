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

  constructor(
    public clienteService: ClienteService, 
    private router: Router,
    private toastController: ToastController,
    private customLoader: CustomLoaderService
  ) { }

  async ngOnInit() {
    this.setIsDelivery();
    await this.calcularTotales();
  }

  setIsDelivery() {
    const raw = this.clienteService.esDelivery();
    this.isDelivery.set(raw);
  }

  // ✅ Calcular todos los totales con descuento
  async calcularTotales() {
    this.subtotal = this.clienteService.getSubtotal();
  }

  // Getter para acceder al pedido desde el template
  get pedido() {
    return this.clienteService.pedido;
  }

  handleImages(item: any) {
    let images = item.imagenes;

    if (!images){
      console.error("No se encontraron imagenes");
      return;
    }

    const imagesArray = images.split(',');

    return imagesArray[0];
  }

  // Remover un item del pedido
  async removeItem(index: number) {
    this.clienteService.removeItem(index);
    await this.calcularTotales();
  }

  // Limpiar todo el pedido
  clearPedido() {
    this.clienteService.clearPedido();
    this.subtotal = 0;
    this.porcentajeDescuento = 0;
    this.montoDescuento = 0;
    this.totalFinal = 0;
  }

  // Confirmar el pedido
  async confirmarPedido() {
    await this.customLoader.show();
    try {
      console.log('Confirmando pedido...');
      console.log('Total:', this.subtotal);
      
      await this.clienteService.insertPedido();
      
      await this.showToast(
        this.porcentajeDescuento > 0 
          ? `¡Pedido confirmado con ${this.porcentajeDescuento}% de descuento!` 
          : 'Pedido confirmado exitosamente',
        'success'
      );
      
      this.clienteService.clearPedido();
      await this.calcularTotales();
      this.clienteService.setJuegosAccess(true);
      // Opcional: redirigir al home
      setTimeout(() => {
        this.router.navigate(['/home-cliente']);
      }, 1500);
    } catch (error) {
      this.customLoader.hide();
      console.error('Error al confirmar pedido:', error);
      await this.showToast('Error al confirmar el pedido', 'danger');
    }
    this.customLoader.hide();
  }


  // Aumentar cantidad de un item
  async increaseQuantity(index: number) {
    const currentItem = this.clienteService.pedido()[index];
    this.clienteService.updateItemQuantity(index, currentItem.quantity + 1);
    await this.calcularTotales();
  }

  // Disminuir cantidad de un item
  async decreaseQuantity(index: number) {
    const currentItem = this.clienteService.pedido()[index];
    this.clienteService.updateItemQuantity(index, currentItem.quantity - 1);
    await this.calcularTotales();
  }

  volverHome(){
    this.router.navigate(["/tabs-cliente-registrado/tab1-menu"])
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