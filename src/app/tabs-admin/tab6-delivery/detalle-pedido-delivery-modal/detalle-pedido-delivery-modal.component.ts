import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Delivery } from 'src/app/services/delivery';

@Component({
  selector: 'app-detalle-pedido-delivery-modal',
  templateUrl: './detalle-pedido-delivery-modal.component.html',
  styleUrls: ['./detalle-pedido-delivery-modal.component.scss'],
  standalone: false
})
export class DetallePedidoDeliveryModalComponent implements OnInit {
  @Input() pedido: any;
  
  items: any[] = [];
  cargando = true;

  constructor(
    private modalController: ModalController,
    private deliveryService: Delivery
  ) {}

  ngOnInit() {
    console.log('Pedido de delivery recibido:', this.pedido);
    this.cargarDetalles();
  }

  async cargarDetalles() {
    try {
      this.cargando = true;
      this.items = await this.deliveryService.getDetallesPedido(this.pedido.id);
      console.log('Detalles cargados:', this.items);
    } catch (error) {
      console.error('Error al cargar detalles:', error);
    } finally {
      this.cargando = false;
    }
  }

  async cerrarModal() {
    await this.modalController.dismiss();
  }

  getColorEstado(estado: string): string {
    const colores: any = {
      pendiente: 'warning',
      confirmado: 'success',
      en_preparacion: 'tertiary',
      listo: 'medium',
      entregado: 'success'
    };
    return colores[estado] || 'medium';
  }

  getTextoEstado(estado: string): string {
    const textos: any = {
      pendiente: 'Pendiente',
      confirmado: 'Confirmado',
      en_preparacion: 'En preparación',
      listo: 'Listo',
      entregado: 'Entregado'
    };
    return textos[estado] || estado;
  }

  formatearFecha(fecha: string): string {
    const date = new Date(fecha);
    return date.toLocaleString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  calcularSubtotal(item: any): number {
    return item.precio_unitario * item.cantidad;
  }

  calcularTotal(): number {
    return this.items.reduce((total, item) => total + this.calcularSubtotal(item), 0);
  }
}
