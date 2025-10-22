import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/supabase';
import { ClienteAnonimoService } from '../../services/cliente-anonimo.service';
import { ToastController, AlertController } from '@ionic/angular';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';

import { HapticService } from 'src/app/services/haptic.service';
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
  private pollingInterval: any;
  clienteAnonimo: ClienteAnonimo | null = null;
  mesaVerificada: boolean = false;
  numeroMesa: number | null = null;
  private intervalId: any;

  constructor(
    private router: Router,
    private authService: AuthService,
    private clienteAnonimoService: ClienteAnonimoService,
    private toastController: ToastController,
    private alertController: AlertController,
    private hapticService: HapticService
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
      // Primero intentar sessionStorage, luego localStorage
      let storedData = sessionStorage.getItem('cliente_anonimo');
      
      if (!storedData) {
        storedData = localStorage.getItem('cliente_anonimo');
        if (storedData) {
          // Sincronizar a sessionStorage
          sessionStorage.setItem('cliente_anonimo', storedData);
        }
      }
      
      if (!storedData) {
        await this.hapticService.vibrateError();
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
        await this.hapticService.vibrateError();
        this.showToast('Sesión expirada', 'danger');
        this.router.navigate(['/ingreso-anonimo'], { replaceUrl: true });
        return;
      }

      this.clienteAnonimo = data;

      if (data.mesa_asignada) {
        await this.cargarNumeroMesa(data.mesa_asignada);
        
        // ✅ Verificar si la mesa ya fue verificada anteriormente
        const mesaVerificadaStorage = sessionStorage.getItem('mesa_verificada');
        if (mesaVerificadaStorage === 'true') {
          this.mesaVerificada = true;
        }
      }

    } catch (error) {
      console.error('Error al cargar datos del cliente anónimo:', error);
      await this.hapticService.vibrateError();
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
      // Verificar permisos de cámara
      const granted = await BarcodeScanner.checkPermissions();
      if (granted.camera !== 'granted') {
        const permission = await BarcodeScanner.requestPermissions();
        if (permission.camera !== 'granted') {
      await this.hapticService.vibrateError();
          this.showToast('Se necesitan permisos de cámara', 'danger');
          return;
        }
      }

      // Escanear QR
      const result = await BarcodeScanner.scan();

      if (result.barcodes && result.barcodes.length > 0) {
        const qrData = result.barcodes[0].displayValue;
        await this.procesarQRMesa(qrData);
      } else {
      await this.hapticService.vibrateError();
        this.showToast('No se detectó ningún QR', 'danger');
      }
    } catch (err: any) {
      await this.hapticService.vibrateError();
      console.error('Error al escanear QR:', err);
      this.showToast('Error al escanear: ' + err.message, 'danger');
    }
  }

  private async procesarQRMesa(qrData: string) {
    try {
      // Parsear el QR que viene en formato "numero,capacidad,tipo"
      const datosQR = qrData.split(',');

      if (datosQR.length !== 3) {
      await this.hapticService.vibrateError();
        this.showToast('QR inválido: formato incorrecto', 'danger');
        return;
      }

      const numeroMesaEscaneado = parseInt(datosQR[0]);
      const capacidad = parseInt(datosQR[1]);
      const tipo = datosQR[2];

      if (isNaN(numeroMesaEscaneado) || isNaN(capacidad)) {
      await this.hapticService.vibrateError();
        this.showToast('QR inválido: datos no válidos', 'danger');
        return;
      }

      console.log('Mesa escaneada:', {
        numero: numeroMesaEscaneado,
        capacidad: capacidad,
        tipo: tipo,
      });
      console.log('Mesa actual asignada:', this.numeroMesa);

      // VERIFICACIÓN: La mesa escaneada debe coincidir con la asignada
      if (numeroMesaEscaneado !== this.numeroMesa) {
        this.showToast(
          `⚠️ Esta no es tu mesa. Tu mesa asignada es la ${this.numeroMesa}`,
          'warning'
        );
        return;
      }

      // Verificar que la mesa existe en la base de datos
      const { data: mesa, error } = await this.authService.client
        .from('mesas')
        .select('*')
        .eq('numero', numeroMesaEscaneado)
        .single();

      if (error || !mesa) {
      await this.hapticService.vibrateError();
        this.showToast('Mesa no encontrada', 'danger');
        return;
      }

      // Verificar que los datos del QR coincidan con la base de datos
      if (mesa.cantidad !== capacidad || mesa.tipo !== tipo) {
      await this.hapticService.vibrateError();
        this.showToast('Los datos del QR no coinciden con la mesa registrada', 'danger');
        return;
      }

      // ✅ Marcar mesa como verificada
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
      await this.hapticService.vibrateError();
      this.showToast('Error al procesar el QR', 'danger');
    }
  }

  /**
   * 🧪 [TESTING] Simular escaneo de QR para testing (sin cámara)
   * Verifica automáticamente la mesa asignada sin necesidad de escanear
   */
  async verificarMesaSimulada() {
    try {
      if (!this.clienteAnonimo?.mesa_asignada || !this.numeroMesa) {
        this.showToast('No tienes una mesa asignada todavía', 'warning');
        return;
      }

      console.log('🧪 [TESTING] Verificando mesa sin QR...', {
        clienteId: this.clienteAnonimo.id_clienteanonimo,
        mesaAsignada: this.numeroMesa
      });

      // Obtener datos de la mesa para mostrar info
      const { data: mesa, error } = await this.authService.client
        .from('mesas')
        .select('*')
        .eq('numero', this.numeroMesa)
        .maybeSingle();

      if (error || !mesa) {
      await this.hapticService.vibrateError();
        this.showToast('Error al obtener datos de la mesa', 'danger');
        console.error('Error obteniendo mesa:', error);
        return;
      }

      // 🧪 TESTING: Marcar como verificada sin escanear
      this.mesaVerificada = true;
      sessionStorage.setItem('mesa_verificada', 'true');
      
      await this.authService.client
        .from('clientes_anonimos')
        .update({ en_espera: false })
        .eq('id_clienteanonimo', this.clienteAnonimo.id_clienteanonimo);
      
      console.log('✅ [TESTING] Mesa verificada automáticamente:', {
        numero: mesa.numero,
        capacidad: mesa.cantidad,
        tipo: mesa.tipo
      });
      
      this.showToast(
        `✅ [TESTING] Mesa ${mesa.numero} verificada\nCapacidad: ${mesa.cantidad} personas\nTipo: ${mesa.tipo}`,
        'success'
      );
      
    } catch (error: any) {
      console.error('❌ Error en verificación simulada:', error);
      await this.hapticService.vibrateError();
      this.showToast(`Error: ${error.message || 'Error desconocido'}`, 'danger');
    }
  }

  // ✅ NAVEGACIÓN CORREGIDA - Ir a tabs-cliente que contiene las tabs
  verMenu() {
    if (!this.mesaVerificada) {
      this.showToast('⚠️ Primero debes escanear el QR de tu mesa', 'warning');
      return;
    }
    // Navegar a tabs-cliente (que contiene las tabs)
    this.router.navigate(['/tabs-cliente'], { 
      queryParams: { tab: 'tab1-menu-anonimo' } 
    });
  }

  hacerPedido() {
    if (!this.mesaVerificada) {
      this.showToast('⚠️ Primero debes escanear el QR de tu mesa', 'warning');
      return;
    }
    // Navegar a tabs-cliente
    this.router.navigate(['/tabs-cliente'], { 
      queryParams: { tab: 'tab2-pedido-anonimo' } 
    });
  }

  hacerConsulta() {
    if (!this.mesaVerificada) {
      this.showToast('⚠️ Primero debes escanear el QR de tu mesa', 'warning');
      return;
    }
    // Navegar a tabs-cliente
    this.router.navigate(['/tabs-cliente'], { 
      queryParams: { tab: 'tab3-consulta-anonimo' } 
    });
  }

  verEncuestas() {
    // Esta funcionalidad parece estar en otra sección
    this.router.navigate(['/tabs-cliente/tab2-encuestas']);
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
      
      // Detener intervalo
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }

      // Llamar al servicio para liberar mesa
      await this.clienteAnonimoService.cerrarSesionYLiberarMesa();
      
      // Limpiar todos los datos de sesión
      sessionStorage.removeItem('cliente_anonimo');
      sessionStorage.removeItem('numero_mesa');
      sessionStorage.removeItem('mesa_verificada');
      localStorage.removeItem('cliente_anonimo');
      localStorage.removeItem('mesa_actual');
      
      console.log('✅ Sesión cerrada correctamente');
      
      await this.showToast('Sesión cerrada correctamente. Mesa liberada.', 'success');
      
      // Navegar a ingreso anónimo
      await this.router.navigate(['/ingreso-anonimo'], { replaceUrl: true });
      
    } catch (error: any) {
      console.error('❌ Error al cerrar sesión:', error);
      
      await this.showToast(
        'Error al cerrar sesión: ' + (error.message || 'Error desconocido'), 
        'danger'
      );
      await this.hapticService.vibrateError();
      
      // Limpiar de todas formas
      sessionStorage.clear();
      localStorage.removeItem('cliente_anonimo');
      localStorage.removeItem('mesa_actual');
      
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