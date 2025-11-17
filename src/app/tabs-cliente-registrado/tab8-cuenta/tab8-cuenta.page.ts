import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController, LoadingController, AlertController } from '@ionic/angular';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { ClienteService } from 'src/app/services/cliente.service';
import { PropinaService } from 'src/app/services/propina.service';
import { Notification } from 'src/app/services/notification';
import { TipoClienteService } from 'src/app/services/tipo-cliente.service';

@Component({
  selector: 'app-tab8-cuenta',
  templateUrl: './tab8-cuenta.page.html',
  styleUrls: ['./tab8-cuenta.page.scss'],
  standalone: false,
})
export class Tab8CuentaPage implements OnInit {
  cargando = true;
  pedidoActual: any = null;
  detalles: any[] = [];
  
  subtotal = 0;
  descuento = 0;
  descuentoPorcentaje = 0;
  montoDescuento = 0;
  
  propinaPorcentaje = 0;
  montoPropina = 0;
  propinaSeleccionada = false;
  
  totalFinal = 0;

  constructor(
    private router: Router,
    private clienteService: ClienteService,
    private propinaService: PropinaService,
    private notificationService: Notification,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private tipoClienteService: TipoClienteService
  ) {}

  async ngOnInit() {
    await this.cargarCuenta();
  }

  async cargarCuenta() {
    this.cargando = true;
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
          this.cargando = false;
          return;
        }

        // ✅ Buscar pedido por MESA (id_cliente será NULL)
        const { data: pedidos, error: pedidoError } = await this.clienteService.client
          .from('pedidos')
          .select(`
            *,
            mesa:mesas!inner(numero, id),
            detalles_pedido(*)
          `)
          .eq('mesa', mesaId)
          .is('id_cliente', null)
          .eq('estado', 'entregado')
          .order('fecha', { ascending: false })
          .limit(1);

        if (pedidoError) {
          console.error('❌ Error buscando pedido:', pedidoError);
          throw pedidoError;
        }

        console.log('📦 Pedidos encontrados (anónimo):', pedidos);

        if (!pedidos || pedidos.length === 0) {
          console.log('⚠️ No hay pedidos entregados para esta mesa');
          this.cargando = false;
          return;
        }

        this.pedidoActual = pedidos[0];

      } else {
        // ✅ CLIENTE REGISTRADO
        clienteId = await this.clienteService.getClientId();
        console.log('👤 ID Cliente registrado:', clienteId);

        const { data: clienteData, error: clienteError } = await this.clienteService.client
          .from('clientes')
          .select('mesa_asignada')
          .eq('id_cliente', clienteId)
          .single();

        if (clienteError || !clienteData?.mesa_asignada) {
          console.log('❌ Cliente sin mesa asignada');
          this.showToast('No tienes una mesa asignada', 'warning');
          this.cargando = false;
          return;
        }

        mesaId = clienteData.mesa_asignada;
        console.log('🪑 Mesa ID del cliente:', mesaId);

        const { data: pedidos, error: pedidoError } = await this.clienteService.client
          .from('pedidos')
          .select(`
            *,
            mesa:mesas!inner(numero, id),
            detalles_pedido(*)
          `)
          .eq('id_cliente', clienteId)
          .eq('mesa', mesaId)
          .eq('estado', 'entregado')
          .order('fecha', { ascending: false })
          .limit(1);

        if (pedidoError) {
          console.error('❌ Error buscando pedido:', pedidoError);
          throw pedidoError;
        }

        console.log('📦 Pedidos encontrados (registrado):', pedidos);

        if (!pedidos || pedidos.length === 0) {
          console.log('⚠️ No hay pedidos entregados para esta mesa');
          this.cargando = false;
          return;
        }

        this.pedidoActual = pedidos[0];
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
        this.descuentoPorcentaje = await this.clienteService.getPorcentajeDescuento();
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
      this.cargando = false;
    }
  }

  seleccionarPropina(porcentaje: number) {
    this.propinaPorcentaje = porcentaje;
    this.calcularTotal();
  }

  calcularPropina(porcentaje: number): number {
    const base = this.subtotal - this.montoDescuento;
    return Math.round(base * (porcentaje / 100));
  }

  calcularTotal() {
    const base = this.subtotal - this.montoDescuento;
    this.montoPropina = Math.round(base * (this.propinaPorcentaje / 100));
    this.totalFinal = base + this.montoPropina;
    
    console.log('🧮 Cálculo total:');
    console.log('   Base (subtotal - descuento):', base);
    console.log('   Propina (' + this.propinaPorcentaje + '%):', this.montoPropina);
    console.log('   TOTAL FINAL:', this.totalFinal);
  }

  async confirmarPropina() {
  if (this.propinaPorcentaje === 0) {
    this.showToast('Selecciona un porcentaje de propina', 'warning');
    return;
  }

  try {
    console.log('💝 Guardando propina:', {
      pedidoId: this.pedidoActual.id,
      porcentaje: this.propinaPorcentaje,
      monto: this.montoPropina
    });

    await this.propinaService.guardarPropina(
      this.pedidoActual.id,
      this.propinaPorcentaje,
      this.montoPropina
    );

    this.propinaSeleccionada = true;
    this.showToast('¡Gracias por tu propina!', 'success');
    
    console.log('✅ Propina guardada correctamente');
  } catch (error: any) {
    console.error('❌ Error guardando propina:', error);
    console.error('📋 Detalles:', {
      mensaje: error.message,
      pedidoId: this.pedidoActual.id,
      porcentaje: this.propinaPorcentaje,
      monto: this.montoPropina
    });
    this.showToast('Error al guardar la propina: ' + (error.message || 'Intenta nuevamente'), 'danger');
  }
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
  const loading = await this.loadingController.create({
    message: 'Procesando pago...',
    spinner: 'crescent',
  });
  await loading.present();

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

    await loading.dismiss();

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
    await loading.dismiss();
    console.error('❌ Error procesando pago:', error);
    console.error('📋 Detalles:', {
      mensaje: error.message,
      pedidoId: this.pedidoActual?.id,
      propinaPorcentaje: this.propinaPorcentaje,
      montoPropina: this.montoPropina
    });
    this.showToast('Error al procesar el pago: ' + (error.message || 'Intenta nuevamente'), 'danger');
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

      this.seleccionarPropina(propina);
    } catch (error: any) {
      console.error('❌ Error escaneando QR:', error);
      this.showToast('Error al escanear el QR: ' + (error.message || 'Intenta nuevamente'), 'danger');      
    }
  }
}