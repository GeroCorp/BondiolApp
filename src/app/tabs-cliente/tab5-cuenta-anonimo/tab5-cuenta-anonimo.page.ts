import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController, LoadingController, AlertController } from '@ionic/angular';
import { AuthService } from '../../services/supabase';
import { PropinaService } from '../../services/propina.service';
import { Notification } from '../../services/notification';

@Component({
  selector: 'app-tab5-cuenta-anonimo',
  templateUrl: './tab5-cuenta-anonimo.page.html',
  styleUrls: ['./tab5-cuenta-anonimo.page.scss'],
  standalone: false,
})
export class Tab5CuentaAnonimoPage implements OnInit {
  cargando = true;
  pedidoActual: any = null;
  detalles: any[] = [];
  
  subtotal = 0;
  propinaPorcentaje = 0;
  montoPropina = 0;
  propinaSeleccionada = false;
  
  totalFinal = 0;

  opcionesPropina = [
    { porcentaje: 0, descripcion: 'Sin propina' },
    { porcentaje: 5, descripcion: 'Satisfecho' },
    { porcentaje: 10, descripcion: 'Muy satisfecho' },
    { porcentaje: 15, descripcion: 'Excelente servicio' },
    { porcentaje: 20, descripcion: 'Extraordinario' }
  ];

  constructor(
    private router: Router,
    private authService: AuthService,
    private propinaService: PropinaService,
    private notificationService: Notification,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private alertController: AlertController
  ) {}

  async ngOnInit() {
    await this.cargarCuenta();
  }

  async cargarCuenta() {
    this.cargando = true;
    try {
      console.log('🔍 Buscando pedido entregado...');
      
      const mesaData = sessionStorage.getItem('numero_mesa');
      
      if (!mesaData) {
        console.log('❌ No hay mesa en sessionStorage');
        this.showToast('No tienes una mesa asignada', 'warning');
        this.cargando = false;
        return;
      }

      const numeroMesa = parseInt(mesaData);
      console.log('🪑 Número de mesa del cliente:', numeroMesa);

      // Obtener el ID de la mesa
      const { data: mesaInfo, error: mesaError } = await this.authService.client
        .from('mesas')
        .select('id')
        .eq('numero', numeroMesa)
        .single();

      if (mesaError || !mesaInfo) {
        console.error('❌ Error obteniendo ID de mesa:', mesaError);
        this.cargando = false;
        return;
      }

      const mesaId = mesaInfo.id;
      console.log('🆔 Mesa ID:', mesaId);

      // Buscar el último pedido ENTREGADO de esta mesa (sin filtrar por cliente)
      const { data: pedidos, error: pedidoError } = await this.authService.client
        .from('pedidos')
        .select(`
          *,
          mesa:mesas!inner(numero, id),
          detalles_pedido(*)
        `)
        .eq('mesa', mesaId)
        .eq('estado', 'entregado')
        .is('id_cliente', null) // Solo pedidos anónimos
        .order('fecha', { ascending: false })
        .limit(1);

      if (pedidoError) {
        console.error('❌ Error buscando pedido:', pedidoError);
        throw pedidoError;
      }

      console.log('📦 Pedidos encontrados:', pedidos);

      if (!pedidos || pedidos.length === 0) {
        console.log('⚠️ No hay pedidos entregados para esta mesa');
        this.cargando = false;
        return;
      }

      this.pedidoActual = pedidos[0];
      console.log('✅ Pedido actual:', this.pedidoActual);

      // Cargar detalles
      this.detalles = this.pedidoActual.detalles_pedido || [];
      console.log('📋 Detalles del pedido:', this.detalles);
      
      // Calcular subtotal desde los detalles
      this.subtotal = this.detalles.reduce(
        (sum, item) => sum + (item.cantidad * item.precio_unitario),
        0
      );

      console.log('💰 Subtotal calculado:', this.subtotal);

      // Calcular total inicial
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
    return Math.round(this.subtotal * (porcentaje / 100));
  }

  calcularTotal() {
    this.montoPropina = Math.round(this.subtotal * (this.propinaPorcentaje / 100));
    this.totalFinal = this.subtotal + this.montoPropina;
    
    console.log('🧮 Cálculo total:');
    console.log('   Subtotal:', this.subtotal);
    console.log('   Propina (' + this.propinaPorcentaje + '%):', this.montoPropina);
    console.log('   TOTAL FINAL:', this.totalFinal);
  }

  async confirmarPropina() {
    if (this.propinaPorcentaje === 0) {
      this.showToast('Selecciona un porcentaje de propina', 'warning');
      return;
    }

    try {
      await this.propinaService.guardarPropina(
        this.pedidoActual.id,
        this.propinaPorcentaje,
        this.montoPropina
      );

      this.propinaSeleccionada = true;
      this.showToast('¡Gracias por tu propina!', 'success');
    } catch (error) {
      console.error('Error guardando propina:', error);
      this.showToast('Error al guardar la propina', 'danger');
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

      // Marcar pedido como pago pendiente
      await this.propinaService.marcarComoPagado(this.pedidoActual.id);

      console.log('✅ Pedido marcado como pago_pendiente');

      // Obtener número de mesa para la notificación
      const numeroMesa = this.pedidoActual.mesa?.numero || 'desconocida';

      // Notificar al mozo
      await this.notificationService.sendNotificationToPerfil(
        'mozo',
        '💳 Pago realizado',
        `El cliente anónimo de la mesa ${numeroMesa} realizó el pago. Total: $${this.totalFinal}. Por favor confirma el pago.`
      );

      console.log('✅ Notificación enviada al mozo');

      await loading.dismiss();

      // Mostrar confirmación
      const successAlert = await this.alertController.create({
        header: '✅ Pago Realizado',
        message: `Tu pago de $${this.totalFinal} fue procesado correctamente. El mozo confirmará y liberará la mesa.`,
        buttons: [
          {
            text: 'Entendido',
            handler: () => {
              this.volverMenu();
            }
          }
        ],
        backdropDismiss: false
      });

      await successAlert.present();

    } catch (error) {
      await loading.dismiss();
      console.error('Error procesando pago:', error);
      this.showToast('Error al procesar el pago', 'danger');
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

  volverMenu() {
    this.router.navigate(['/tabs-cliente/tab1-menu-anonimo']);
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
}