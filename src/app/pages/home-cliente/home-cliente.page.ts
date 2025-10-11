import { Component, effect, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/supabase';
import { ToastController, AlertController } from '@ionic/angular';
import { ClienteService } from 'src/app/services/cliente.service';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';

interface Cliente {
  id_cliente?: number;
  nombre: string;
  apellido: string;
  dni?: string;
  email?: string | null;
  foto?: string | null;
  estado?: string;
  created_at?: string;
}

@Component({
  selector: 'app-home-cliente',
  templateUrl: './home-cliente.page.html',
  styleUrls: ['./home-cliente.page.scss'],
  standalone: false
})
export class HomeClientePage implements OnInit {
  cliente: Cliente | null = null;
  enEspera: boolean = true;
  mesaAsignada: number | null = null;
  mesaVerificada: boolean = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private toastController: ToastController,
    private alertController: AlertController,
    private clienteService: ClienteService
  ) {
    effect(() => {
      this.enEspera = this.clienteService.clienteEnEspera();
      console.log('Estado del cliente en espera: ', this.enEspera);
    });
  }

  async ngOnInit() {
    this.clienteService.detectarUpdate();
    await this.cargarDatosCliente();
    await this.verificarMesaAsignada();
  }

  async cargarDatosCliente() {
    try {
      const user = await this.authService.getCurrentUser();
      
      if (user) {
        this.cliente = await this.authService.getClienteByUserId(user.id);
        
        if (this.cliente && !this.cliente.email) {
          this.cliente.email = user.email;
        }
      }
    } catch (error) {
      console.error('Error al cargar datos del cliente:', error);
      this.showToast('Error al cargar tus datos', 'danger');
    }
  }

  async verificarMesaAsignada() {
    try {
      if (this.cliente?.id_cliente) {
        this.mesaAsignada = await this.clienteService.getMesa(this.cliente.id_cliente);
        console.log('Mesa asignada al cliente:', this.mesaAsignada);
        
        // Si tiene mesa asignada, está verificada automáticamente
        if (this.mesaAsignada) {
          this.mesaVerificada = true;
          this.enEspera = false;
        }
      }
    } catch (error) {
      console.error('Error verificando mesa asignada:', error);
    }
  }

  async escanearQRMesa() {
    try {
      // Verificar permisos de cámara
      const granted = await BarcodeScanner.checkPermissions();
      if (granted.camera !== 'granted') {
        const permission = await BarcodeScanner.requestPermissions();
        if (permission.camera !== 'granted') {
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
        this.showToast('No se detectó ningún QR', 'danger');
      }
    } catch (err: any) {
      console.error('Error al escanear QR:', err);
      this.showToast('Error al escanear: ' + err.message, 'danger');
    }
  }

  async procesarQRMesa(qrData: string) {
    try {
      const numeroMesa = parseInt(qrData);

      if (isNaN(numeroMesa)) {
        this.showToast('QR inválido: no es un número de mesa', 'danger');
        return;
      }

      console.log('Mesa escaneada:', numeroMesa);
      console.log('Mesa actual asignada:', this.mesaAsignada);

      // Si ya tiene una mesa asignada, preguntar si quiere cambiarla
      if (this.mesaAsignada && this.mesaAsignada !== numeroMesa) {
        await this.confirmarCambioMesa(numeroMesa);
        return;
      }

      // Intentar asignar la mesa
      await this.asignarMesa(numeroMesa);

    } catch (error) {
      console.error('Error procesando QR:', error);
      this.showToast('Error al procesar el QR', 'danger');
    }
  }

  async confirmarCambioMesa(nuevaMesa: number) {
    const alert = await this.alertController.create({
      header: 'Cambiar de Mesa',
      message: `Actualmente tienes asignada la Mesa ${this.mesaAsignada}. ¿Deseas cambiar a la Mesa ${nuevaMesa}?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Cambiar',
          handler: async () => {
            // Liberar la mesa actual primero
            if (this.mesaAsignada) {
              await this.liberarMesaActual();
            }
            await this.asignarMesa(nuevaMesa);
          }
        }
      ]
    });
    await alert.present();
  }

  async liberarMesaActual() {
    try {
      if (!this.cliente?.id_cliente || !this.mesaAsignada) return;

      // Liberar la mesa en la tabla mesas
      await this.authService.client
        .from('mesas')
        .update({
          cliente_asignado: null,
          disponible: true
        })
        .eq('numero', this.mesaAsignada);

      console.log('Mesa anterior liberada');
    } catch (error) {
      console.error('Error liberando mesa actual:', error);
    }
  }

  async asignarMesa(numeroMesa: number) {
    try {
      if (!this.cliente?.id_cliente) {
        this.showToast('Error: No se pudo obtener tu ID de cliente', 'danger');
        return;
      }

      // Verificar si la mesa existe y está disponible
      const { data: mesa, error: errorMesa } = await this.authService.client
        .from('mesas')
        .select('*')
        .eq('numero', numeroMesa)
        .maybeSingle();

      if (errorMesa || !mesa) {
        this.showToast(`La Mesa ${numeroMesa} no existe`, 'danger');
        return;
      }

      // Verificar si está ocupada por otro cliente
      if (mesa.cliente_asignado && mesa.cliente_asignado !== this.cliente.id_cliente) {
        this.showToast(`La Mesa ${numeroMesa} está ocupada por otro cliente`, 'danger');
        return;
      }

      // Si ya está asignada a este cliente, solo verificar
      if (mesa.cliente_asignado === this.cliente.id_cliente) {
        this.mesaAsignada = numeroMesa;
        this.mesaVerificada = true;
        this.enEspera = false;
        this.showToast(`✅ Mesa ${numeroMesa} verificada`, 'success');
        return;
      }

      // Asignar la mesa al cliente
      const resultado = await this.clienteService.setMesa(this.cliente.id_cliente, numeroMesa);

      if (resultado) {
        this.mesaAsignada = numeroMesa;
        this.mesaVerificada = true;
        this.enEspera = false;
        this.showToast(`✅ Mesa ${numeroMesa} asignada correctamente`, 'success');
      }

    } catch (error: any) {
      console.error('Error asignando mesa:', error);
      if (error.message.includes('ocupada')) {
        this.showToast(error.message, 'danger');
      } else {
        this.showToast('Error al asignar la mesa', 'danger');
      }
    }
  }

  async logout() {
    // Si tiene mesa asignada, liberarla antes de cerrar sesión
    if (this.mesaAsignada && this.cliente?.id_cliente) {
      try {
        await this.clienteService.liberarMesaCliente();
      } catch (error) {
        console.error('Error liberando mesa al cerrar sesión:', error);
      }
    }

    await this.authService.logout();
    this.router.navigate(['/login'], { replaceUrl: true });
    this.showToast('Sesión cerrada correctamente', 'medium');
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

  // Redirecciones con verificación

  verMenu() {
    if (!this.mesaVerificada) {
      this.showToast('⚠️ Primero debes escanear el QR de una mesa', 'warning');
      return;
    }
    this.router.navigate(["/tabs-cliente-registrado/tab1-menu"]);
  }

  hacerPedido() {
    if (!this.mesaVerificada) {
      this.showToast('⚠️ Primero debes escanear el QR de una mesa', 'warning');
      return;
    }
    this.router.navigate(["/tabs-cliente-registrado/tab2-pedido"]);
  }

  hacerConsulta() {
    if (!this.mesaVerificada) {
      this.showToast('⚠️ Primero debes escanear el QR de una mesa', 'warning');
      return;
    }
    this.router.navigate(["/tabs-cliente-registrado/tab3-consulta"]);
  }
}