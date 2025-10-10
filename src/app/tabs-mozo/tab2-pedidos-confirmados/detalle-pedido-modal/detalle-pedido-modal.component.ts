import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-detalle-pedido-modal',
  templateUrl: './detalle-pedido-modal.component.html',
  styleUrls: ['./detalle-pedido-modal.component.scss'],
  standalone: false
})
export class DetallePedidoModalComponent implements OnInit {
  @Input() pedido: any;
  @Input() items: any[] = [];

  constructor(private modalController: ModalController) {}

  ngOnInit() {
    console.log('Pedido recibido:', this.pedido);
    console.log('Items recibidos:', this.items);
  }

  async cerrarModal() {
    await this.modalController.dismiss();
  }

  getColorEstado(estado: string): string {
    const colores: any = {
      confirmado: 'warning',
      en_preparacion: 'tertiary',
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
      listo: 'Listo',
      entregado: 'Entregado'
    };
    return textos[estado] || estado;
  }

  getColorSector(estado: string): string {
    const colores: any = {
      pendiente: 'warning',
      en_preparacion: 'tertiary',
      listo: 'success'
    };
    return colores[estado] || 'medium';
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