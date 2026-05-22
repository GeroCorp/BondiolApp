import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController, AlertController } from '@ionic/angular';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { ClienteService } from 'src/app/services/cliente.service';
import { PropinaService } from 'src/app/services/propina.service';
import { Notification } from 'src/app/services/notification';
import { TipoClienteService } from 'src/app/services/tipo-cliente.service';
import { CustomLoaderService } from 'src/app/services/custom-loader.service';
import { Delivery } from 'src/app/services/delivery';

@Component({
  selector: 'app-tab8-cuenta',
  templateUrl: './tab8-cuenta.page.html',
  styleUrls: ['./tab8-cuenta.page.scss'],
  standalone: false,
})
export class Tab8CuentaPage implements OnInit {
  cargando = false;
  pedidoActual: any = null;
  detalles: any[] = [];
  
  subtotal = 0;
  descuento = 0; // Para que existe esto si ya hiciste descuentoPorcentaje y montoDescuento????
  descuentoPorcentaje = 0;
  montoDescuento = 0;
  
  propinaPorcentaje = 0;
  montoPropina = 0;
  propinaSeleccionada = false;
  
  totalFinal = 0;

  esDelivery = false;

  constructor(
    private router: Router,
    private clienteService: ClienteService,
    private propinaService: PropinaService,
    private notificationService: Notification,
    private toastController: ToastController,
    private customLoader: CustomLoaderService,
    private alertController: AlertController,
    private tipoClienteService: TipoClienteService,
    private deliveryService: Delivery
  ) {}

  async ngOnInit() {
    this.esDelivery = this.clienteService.esDelivery();
    if (this.esDelivery) {
      await this.cargarCuentaDelivery();
      this.calcularTotalDelivery();
    } else {
      await this.cargarCuenta();
    }
  }

  async cargarCuenta() {
    await this.customLoader.show('Cargando cuenta...'); 
    try {

      console.log('🔍 Buscando pedido entregado...');
      
      const isAnonimo = this.tipoClienteService.isAnonimo();
      console.log('🎭 Es anónimo:', isAnonimo);

      let mesaId: number | null = null;
      let clienteId: number | null = null;

      if (isAnonimo) {
        // ✅ CLIENTE ANÓNIMO
        const clienteData = this.tipoClienteService.getClienteData();
        mesaId = clienteData?.mesa_asignada;
        clienteId = null;
        
        console.log('🎭 Datos cliente anónimo:', {
          mesa: mesaId,
          nombre: clienteData?.nombre
        });

        if (!mesaId) {
          console.log('❌ Cliente anónimo sin mesa asignada');
          this.showToast('No tienes una mesa asignada', 'warning');
          this.customLoader.hide();
          return;
        }

        // ✅ Buscar pedido por MESA (id_cliente será NULL)
        const { data: pedidos, error: pedidoError } = await this.clienteService.client
          .from('pedidos')
          .select('*')
          .eq('mesa', mesaId)
          .is('id_cliente', null)
          .eq('estado', 'entrega_confirmada')
          .order('fecha', { ascending: false })
          .limit(1);

        if (pedidoError) {
          console.error('❌ Error buscando pedido:', pedidoError);
          throw pedidoError;
        }

        console.log('📦 Pedidos encontrados (anónimo):', pedidos);

        if (!pedidos || pedidos.length === 0) {
          console.log('⚠️ No hay pedidos entregados para esta mesa');
          this.customLoader.hide();
          return;
        }

        this.pedidoActual = pedidos[0];
        this.pedidoActual.detalles_pedido = await this.clienteService.getDetallesPedido(this.pedidoActual.id);

      } else {
        // ✅ CLIENTE REGISTRADO
        clienteId = await this.clienteService.getClientId();
        console.log('👤 ID Cliente registrado:', clienteId);

        const mesaId = this.clienteService.mesaAsignada;

        console.log('🪑 Mesa ID del cliente:', mesaId);

        this.pedidoActual = await this.clienteService.getPedidoActivo();

        if (!this.pedidoActual || this.pedidoActual.estado !== 'entrega_confirmada') {
          console.log('⚠️ No hay pedidos entregados para este cliente');
          this.pedidoActual = null;
          this.customLoader.hide();
          this.showToast('No tienes pedidos entregados para pagar.', 'warning');
          this.router.navigate(['/home-cliente']);
          return
        }
      }

      console.log('✅ Pedido actual:', this.pedidoActual);

      this.detalles = this.pedidoActual.detalles_pedido || [];
      console.log('📋 Detalles del pedido:', this.detalles);
      
      this.subtotal = this.detalles.reduce(
        (sum, item) => sum + (item.cantidad * item.precio_unitario),
        0
      );

      console.log('💰 Subtotal calculado:', this.subtotal);

      // Obtener descuento (solo para registrados)
      if (!isAnonimo && clienteId) {
        this.descuentoPorcentaje = await this.clienteService.getDescuentoCliente(this.pedidoActual.id);
        this.descuento = this.descuentoPorcentaje;
        this.montoDescuento = Math.round(this.subtotal * (this.descuento / 100));
        console.log('🎁 Descuento:', this.descuentoPorcentaje + '%', '→ $' + this.montoDescuento);
      } else {
        this.descuentoPorcentaje = 0;
        this.descuento = 0;
        this.montoDescuento = 0;
        console.log('🎭 Anónimo: Sin descuento');
      }

      this.calcularTotal();

    } catch (error) {
      console.error('❌ Error cargando cuenta:', error);
      this.showToast('Error al cargar la cuenta', 'danger');
    } finally {
      this.customLoader.hide();
      this.cargando = false;
    }
  }

  seleccionarPropina(porcentaje: number) {
    this.propinaPorcentaje = porcentaje;
    this.montoPropina = this.calcularPropina(porcentaje);
    this.calcularTotal();
  }

  calcularPropina(porcentaje: number): number {
    const base = this.subtotal - this.montoDescuento;
    return Math.round(base * (porcentaje / 100));
  }

  calcularTotal() {
    const base = this.subtotal - this.montoDescuento;
    this.montoPropina = this.calcularPropina(this.propinaPorcentaje);
    this.totalFinal = base + this.montoPropina;
    
    console.log('🧮 Cálculo total:');
    console.log('   Base (subtotal - descuento):', base);
    console.log('   Propina (' + this.propinaPorcentaje + '%):', this.montoPropina);
    console.log('   TOTAL FINAL:', this.totalFinal);
  }

  async confirmarPropina() {
  this.propinaSeleccionada = true;
  console.log(this.esDelivery);
  if (this.esDelivery){
    await this.propinaService.updatePropinaDelivery(
      this.pedidoActual.id,
      this.propinaPorcentaje
    );
    this.calcularTotalDelivery(); // Recalcular total para delivery una vez guardada la propina
  }else{

    await this.propinaService.guardarPropina(
      this.pedidoActual.id,
      this.propinaPorcentaje,
      this.montoPropina
    );
  }

  await this.showToast(`Propina del ${this.propinaPorcentaje}% confirmada.`, 'success');

}

  sinPropina() {
    this.propinaPorcentaje = 0;
    this.montoPropina = 0;
    this.calcularTotal();
    this.propinaSeleccionada = true;
  }

  async realizarPago() {
    const alert = await this.alertController.create({
      header: '💳 Confirmar Pago',
      message: `¿Confirmas el pago de $${this.totalFinal}?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Confirmar Pago',
          handler: async () => {
            await this.procesarPago();
          }
        }
      ]
    });

    await alert.present();
  }

  async procesarPago() {
    await this.customLoader.show('Procesando pago...');
    if (!this.esDelivery){

    
    try {
      console.log('💳 Procesando pago del pedido:', this.pedidoActual.id);

      await this.propinaService.marcarComoPagado(this.pedidoActual.id);

      console.log('✅ Pedido marcado como pago_pendiente');

      const numeroMesa = this.pedidoActual.mesa?.numero || 'desconocida';
      const isAnonimo = this.tipoClienteService.isAnonimo();
      const tipoCliente = isAnonimo ? '(Cliente Anónimo)' : '';

      await this.notificationService.sendNotificationToPerfil(
        'mozo',
        '💳 Pago realizado',
        `El cliente ${tipoCliente} de la mesa ${numeroMesa} realizó el pago. Total: $${this.totalFinal}. Por favor confirma el pago.`
      );

      console.log('✅ Notificación enviada al mozo');

      await this.customLoader.hide();

      const successAlert = await this.alertController.create({
        header: '✅ Pago Realizado',
        message: `Tu pago de $${this.totalFinal} fue procesado correctamente. El mozo confirmará y liberará la mesa.`,
        buttons: [
          {
            text: 'Entendido',
            handler: () => {
              this.router.navigate(['/home-cliente']);
            }
          }
        ],
        backdropDismiss: false
      });

      await successAlert.present();

    } catch (error: any) {
      await this.customLoader.hide();
      console.error('❌ Error procesando pago:', error);
      console.error('📋 Detalles:', {
        mensaje: error.message,
        pedidoId: this.pedidoActual?.id,
        propinaPorcentaje: this.propinaPorcentaje,
        montoPropina: this.montoPropina
      });
      this.showToast('Error al procesar el pago: ' + (error.message || 'Intenta nuevamente'), 'danger');
    }
    } else {
      // Delivery
      try {
        console.log('💳 Procesando pago delivery del pedido:', this.pedidoActual.id);
        this.deliveryService.updateEstadoPedido(this.pedidoActual.id, 'pago_pendiente');
        this.clienteService.setIsDelivery(false);
        this.clienteService.setDireccionDelivery('');
        console.log('✅ Pedido de delivery marcado como pago_pendiente');
        await this.showToast('Pago de delivery procesado correctamente.', 'success');
        await this.customLoader.hide();
        this.router.navigate(['/home-cliente']);
      } catch(e: any) {
        await this.customLoader.hide();
        throw new Error('No se pudo procesar el pago de delivery: ' + e.message);
      }
    }
  }

  formatearFecha(fecha: string): string {
    return this.clienteService.formatearFecha(fecha);
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'medium' | 'warning') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom',
    });
    await toast.present();
  }

  async escanearQR() {
    try {
      const result = await BarcodeScanner.scan();

      if (result.barcodes.length === 0) {
        this.showToast('No se detectó ningún código QR.', 'warning');
        return;
      }
      const qrData = result.barcodes[0].displayValue;

      const propina = parseInt(qrData);

      this.showToast(`QR escaneado. Propina escaneada: ${propina}%`, 'success');

      this.propinaPorcentaje = propina;
      this.seleccionarPropina(propina);
      this.confirmarPropina();

    } catch (error: any) {
      console.error('❌ Error escaneando QR:', error);
      this.showToast('Error al escanear el QR: ' + (error.message || 'Intenta nuevamente'), 'danger');      
    }
  }

 ////////// Es un quilombo lo de arriba, lo de delivery lo hago aparte ////////////

  ////////////////////
  // Para delivery //
  async cargarCuentaDelivery() {
    try {
      await this.customLoader.show("Cargando cuenta de delivery...");
      
      this.pedidoActual = await this.deliveryService.getPedidoPorPagar();
      this.detalles = await this.deliveryService.getDetallesPedido(this.pedidoActual.id);
      this.subtotal = this.pedidoActual.subtotal
      
      const descuentoData = await this.deliveryService.getDescuento(this.pedidoActual.cliente.id_cliente);
      this.descuento = descuentoData?.descuento_obtenido || 0; // Obtener el valor correcto
      
    } catch (error) {
      console.error('Error cargando cuenta de delivery:', error);
      this.showToast('Error al cargar la cuenta de delivery', 'danger');
    }finally {
      this.customLoader.hide();

    }

  }

  private calcularTotalDelivery(){
    const base = this.subtotal
    this.montoDescuento = Math.round(base *  (this.descuento / 100));
    this.montoPropina = Math.round(base * (this.propinaPorcentaje / 100));
    this.totalFinal = base - this.montoDescuento + this.montoPropina;
  }


}