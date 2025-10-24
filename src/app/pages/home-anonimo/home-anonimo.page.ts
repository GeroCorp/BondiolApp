import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/supabase';
import { ClienteAnonimoService } from '../../services/cliente-anonimo.service';
import { ToastController, AlertController } from '@ionic/angular';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';

interface ClienteAnonimo {
  id_clienteanonimo: number;
  nombre: string;
  foto: string;
  en_espera: boolean;
  mesa_asignada: number | null;
  fecha_asignacion: string | null;
  created_at: string;
}

@Component({
  selector: 'app-home-anonimo',
  templateUrl: './home-anonimo.page.html',
  styleUrls: ['./home-anonimo.page.scss'],
  standalone: false
})
export class HomeAnonimoPage implements OnInit, OnDestroy {
  clienteAnonimo: ClienteAnonimo | null = null;
  mesaVerificada: boolean = false;
  numeroMesa: number | null = null;
  private intervalId: any;

  constructor(
    private router: Router,
    private authService: AuthService,
    private clienteAnonimoService: ClienteAnonimoService,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  async ngOnInit() {
    await this.cargarDatosClienteAnonimo();
    this.iniciarVerificacionMesa();
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private iniciarVerificacionMesa() {
    this.intervalId = setInterval(async () => {
      await this.verificarMesaAsignada();
    }, 10000);
  }

  async cargarDatosClienteAnonimo() {
    try {
      let storedData = sessionStorage.getItem('cliente_anonimo');
      
      if (!storedData) {
        storedData = localStorage.getItem('cliente_anonimo');
        if (storedData) {
          sessionStorage.setItem('cliente_anonimo', storedData);
        }
      }
      
      if (!storedData) {
        this.showToast('No se encontró sesión anónima', 'danger');
        this.router.navigate(['/ingreso-anonimo'], { replaceUrl: true });
        return;
      }

      const localData = JSON.parse(storedData);

      const { data, error } = await this.authService.client
        .from('clientes_anonimos')
        .select('*')
        .eq('id_clienteanonimo', localData.id)
        .single();

      if (error || !data) {
        console.error('Error cargando cliente anónimo:', error);
        localStorage.removeItem('cliente_anonimo');
        sessionStorage.removeItem('cliente_anonimo');
        this.showToast('Sesión expirada', 'danger');
        this.router.navigate(['/ingreso-anonimo'], { replaceUrl: true });
        return;
      }

      this.clienteAnonimo = data;

      if (data.mesa_asignada) {
        await this.cargarNumeroMesa(data.mesa_asignada);
        
        const mesaVerificadaStorage = sessionStorage.getItem('mesa_verificada');
        if (mesaVerificadaStorage === 'true') {
          this.mesaVerificada = true;
        }
      }

    } catch (error) {
      console.error('Error al cargar datos del cliente anónimo:', error);
      this.showToast('Error al cargar tus datos', 'danger');
    }
  }

  private async verificarMesaAsignada() {
    try {
      if (!this.clienteAnonimo?.id_clienteanonimo) return;

      const { data, error } = await this.authService.client
        .from('clientes_anonimos')
        .select('mesa_asignada, en_espera')
        .eq('id_clienteanonimo', this.clienteAnonimo.id_clienteanonimo)
        .single();

      if (!error && data) {
        const mesaAnterior = this.clienteAnonimo.mesa_asignada;
        this.clienteAnonimo.mesa_asignada = data.mesa_asignada;
        this.clienteAnonimo.en_espera = data.en_espera;

        if (data.mesa_asignada && data.mesa_asignada !== mesaAnterior) {
          await this.cargarNumeroMesa(data.mesa_asignada);
          this.mostrarNotificacionMesa();
        }
      }
    } catch (error) {
      console.error('Error verificando mesa:', error);
    }
  }

  private async cargarNumeroMesa(mesaId: number) {
    try {
      const { data, error } = await this.authService.client
        .from('mesas')
        .select('numero')
        .eq('id', mesaId)
        .single();

      if (!error && data) {
        this.numeroMesa = data.numero;
        localStorage.setItem('mesa_actual', data.numero.toString());
        sessionStorage.setItem('numero_mesa', data.numero.toString());
      }
    } catch (error) {
      console.error('Error cargando número de mesa:', error);
    }
  }

  private async mostrarNotificacionMesa() {
    const toast = await this.toastController.create({
      message: `🎉 ¡Te asignaron la Mesa ${this.numeroMesa}! Escanea el QR de tu mesa para continuar.`,
      duration: 5000,
      color: 'success',
      position: 'top'
    });
    await toast.present();
  }

  async escanearQRMesa() {
    if (!this.clienteAnonimo?.mesa_asignada || !this.numeroMesa) {
      this.showToast('⚠️ No tienes mesa asignada aún', 'warning');
      return;
    }

    try {
      const granted = await BarcodeScanner.checkPermissions();
      if (granted.camera !== 'granted') {
        const permission = await BarcodeScanner.requestPermissions();
        if (permission.camera !== 'granted') {
          this.showToast('Se necesitan permisos de cámara', 'danger');
          return;
        }
      }

      const result = await BarcodeScanner.scan();

      if (result.barcodes && result.barcodes.length > 0) {
        const qrData = result.barcodes[0].displayValue;
        await this.procesarQRMesa(qrData);
      } else {
        this.showToast('No se detectó ningún QR', 'danger');
      }
    } catch (err: any) {
      console.error('Error al escanear QR:', err);
      this.showToast('Error al escanear: ' + err.message, 'danger');
    }
  }

  private async procesarQRMesa(qrData: string) {
    try {
      const datosQR = qrData.split(',');

      if (datosQR.length !== 3) {
        this.showToast('QR inválido: formato incorrecto', 'danger');
        return;
      }

      const numeroMesaEscaneado = parseInt(datosQR[0]);
      const capacidad = parseInt(datosQR[1]);
      const tipo = datosQR[2];

      if (isNaN(numeroMesaEscaneado) || isNaN(capacidad)) {
        this.showToast('QR inválido: datos no válidos', 'danger');
        return;
      }

      if (numeroMesaEscaneado !== this.numeroMesa) {
        this.showToast(
          `⚠️ Esta no es tu mesa. Tu mesa asignada es la ${this.numeroMesa}`,
          'warning'
        );
        return;
      }

      const { data: mesa, error } = await this.authService.client
        .from('mesas')
        .select('*')
        .eq('numero', numeroMesaEscaneado)
        .single();

      if (error || !mesa) {
        this.showToast('Mesa no encontrada', 'danger');
        return;
      }

      if (mesa.cantidad !== capacidad || mesa.tipo !== tipo) {
        this.showToast('Los datos del QR no coinciden con la mesa registrada', 'danger');
        return;
      }

      this.mesaVerificada = true;
      sessionStorage.setItem('mesa_verificada', 'true');
      
      await this.authService.client
        .from('clientes_anonimos')
        .update({ en_espera: false })
        .eq('id_clienteanonimo', this.clienteAnonimo!.id_clienteanonimo);

      this.showToast(
        `✅ Mesa ${this.numeroMesa} verificada correctamente\nCapacidad: ${capacidad} personas\nTipo: ${tipo}`,
        'success'
      );

    } catch (error: any) {
      console.error('Error procesando QR:', error);
      this.showToast('Error al procesar el QR', 'danger');
    }
  }

  async verificarMesaSimulada() {
    try {
      if (!this.clienteAnonimo?.mesa_asignada || !this.numeroMesa) {
        this.showToast('No tienes una mesa asignada todavía', 'warning');
        return;
      }

      const { data: mesa, error } = await this.authService.client
        .from('mesas')
        .select('*')
        .eq('numero', this.numeroMesa)
        .maybeSingle();

      if (error || !mesa) {
        this.showToast('Error al obtener datos de la mesa', 'danger');
        return;
      }

      this.mesaVerificada = true;
      sessionStorage.setItem('mesa_verificada', 'true');
      
      await this.authService.client
        .from('clientes_anonimos')
        .update({ en_espera: false })
        .eq('id_clienteanonimo', this.clienteAnonimo.id_clienteanonimo);
      
      this.showToast(
        `✅ [TESTING] Mesa ${mesa.numero} verificada\nCapacidad: ${mesa.cantidad} personas\nTipo: ${mesa.tipo}`,
        'success'
      );
      
    } catch (error: any) {
      console.error('❌ Error en verificación simulada:', error);
      this.showToast(`Error: ${error.message || 'Error desconocido'}`, 'danger');
    }
  }

  verMenu() {
    if (!this.mesaVerificada) {
      this.showToast('⚠️ Primero debes escanear el QR de tu mesa', 'warning');
      return;
    }
    this.router.navigate(['/tabs-cliente'], { 
      queryParams: { tab: 'tab1-menu-anonimo' } 
    });
  }

  hacerPedido() {
    if (!this.mesaVerificada) {
      this.showToast('⚠️ Primero debes escanear el QR de tu mesa', 'warning');
      return;
    }
    this.router.navigate(['/tabs-cliente'], { 
      queryParams: { tab: 'tab2-pedido-anonimo' } 
    });
  }

  hacerConsulta() {
    if (!this.mesaVerificada) {
      this.showToast('⚠️ Primero debes escanear el QR de tu mesa', 'warning');
      return;
    }
    this.router.navigate(['/tabs-cliente'], { 
      queryParams: { tab: 'tab3-consulta-anonimo' } 
    });
  }

  verHistorial() {
    if (!this.mesaVerificada) {
      this.showToast('⚠️ Primero debes escanear el QR de tu mesa', 'warning');
      return;
    }
     this.router.navigate(['/tabs-cliente'], { 
      queryParams: { tab: 'tab6-historial-anonimo' } 
    });
  }

  verEncuestas() {
    if (!this.mesaVerificada) {
      this.showToast('⚠️ Primero debes escanear el QR de tu mesa', 'warning');
      return;
    }
    this.router.navigate(['/tabs-cliente'], { 
      queryParams: { tab: 'tab4-resultados-anonimo' } 
    });
  }

  verCuenta() {
    if (!this.mesaVerificada) {
      this.showToast('⚠️ Primero debes escanear el QR de tu mesa', 'warning');
      return;
    }
    this.router.navigate(['/tabs-cliente'], { 
      queryParams: { tab: 'tab5-cuenta-anonimo' } 
    });
  }

  async salir() {
    const alert = await this.alertController.create({
      header: 'Cerrar Sesión',
      message: '¿Deseas salir de tu sesión anónima? Tu mesa será liberada y deberás registrarte nuevamente.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Salir',
          handler: async () => {
            await this.cerrarSesion();
          }
        }
      ]
    });

    await alert.present();
  }

  private async cerrarSesion() {
    try {
      console.log('🔄 Iniciando cierre de sesión...');
      
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }

      await this.clienteAnonimoService.cerrarSesionYLiberarMesa();
      
      console.log('✅ Sesión cerrada correctamente');
      
      await this.showToast('Sesión cerrada correctamente. Mesa liberada.', 'success');
      
      await this.router.navigate(['/ingreso-anonimo'], { replaceUrl: true });
      
    } catch (error: any) {
      console.error('❌ Error al cerrar sesión:', error);
      
      await this.showToast(
        'Error al cerrar sesión: ' + (error.message || 'Error desconocido'), 
        'danger'
      );
      
      await this.router.navigate(['/ingreso-anonimo'], { replaceUrl: true });
    }
  }

  async showToast(message: string, color: 'success' | 'danger' | 'medium' | 'warning' = 'medium') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}