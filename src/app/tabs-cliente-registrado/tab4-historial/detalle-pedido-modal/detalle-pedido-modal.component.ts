import { Component, OnInit, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ClienteService } from 'src/app/services/cliente.service';

@Component({
  selector: 'app-detalle-pedido-modal',
  templateUrl: './detalle-pedido-modal.component.html',
  styleUrls: ['./detalle-pedido-modal.component.scss'],
  standalone: false,
})
export class DetallePedidoModalComponent implements OnInit {
  @Input() pedido: any;
  detalles: any[] = [];
  isLoading = true;

  constructor(
    private modalController: ModalController,
    private clienteService: ClienteService
  ) { }

  async ngOnInit() {
    await this.cargarDetalles();
  }

  async cargarDetalles() {
    try {
      this.isLoading = true;
      this.detalles = await this.clienteService.getDetallesPedido(this.pedido.id);
    } catch (error) {
      console.error('❌ Error cargando detalles:', error);
    } finally {
      this.isLoading = false;
    }
  }

  calcularSubtotal(detalle: any): number {
    return detalle.cantidad * detalle.precio_unitario;
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

  getIconoTipo(tipo: string): string {
    const iconos: any = {
      bebida: 'wine-outline',
      comida: 'restaurant-outline',
      postre: 'ice-cream-outline',
      entrada: 'leaf-outline'
    };
    return iconos[tipo] || 'ellipse-outline';
  }

  async cerrarModal() {
    await this.modalController.dismiss();
  }
}
