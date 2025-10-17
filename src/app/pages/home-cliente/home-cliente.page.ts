import { Component, effect, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/supabase';
import { ToastController, AlertController } from '@ionic/angular';
import { ClienteService } from 'src/app/services/cliente.service';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { PerfilService } from 'src/app/services/perfilService';
import { Notification } from 'src/app/services/notification';



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
  mesaVerificada: boolean = true;
  perfil = "cliente";
  private notificationService: Notification = inject(Notification);



  constructor(
    private router: Router,
    private authService: AuthService,
    private toastController: ToastController,
    private clienteService: ClienteService,
    private perfilService: PerfilService,
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
    this.perfilService.setPerfil(this.perfil);
    this.notificationService.setUserTag(this.perfil);

  }

  async cargarDatosCliente() {
    try {
      const user = await this.authService.getCurrentUser();
      
      if (user) {
        this.cliente = await this.authService.getClienteByUserId(user.id);
        this.notificationsInit();
        if (this.cliente && !this.cliente.email) {
          this.cliente.email = user.email;
        }
      }
    } catch (error) {
      console.error('Error al cargar datos del cliente:', error);
      this.showToast('Error al cargar tus datos', 'danger');
    }
  }

  async notificationsInit(){
    this.notificationService.setExternalUserId(this.cliente?.id_cliente?.toString() || '');
    this.clienteService.subscribeToHistorialPedidos();
  }

  async verificarMesaAsignada() {
    try {
      if (this.cliente?.id_cliente) {
        this.mesaAsignada = await this.clienteService.getMesa(this.cliente.id_cliente);
        console.log('Mesa asignada al cliente:', this.mesaAsignada);
        
        // Solo obtener la mesa asignada, PERO NO marcarla como verificada
        // El cliente debe escanear el QR para verificar que está en la mesa correcta
        if (this.mesaAsignada) {
          this.enEspera = false; // Ya no está en espera
          // mesaVerificada sigue siendo false hasta que escanee QR
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
  async escanearQRListaEspera() {
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
          this.router.navigate([qrData]);
        
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
      // Parsear el QR que viene en formato "numero,capacidad,tipo"
      const datosQR = qrData.split(',');
      
      if (datosQR.length !== 3) {
        this.showToast('QR inválido: formato incorrecto', 'danger');
        return;
      }

      const numeroMesa = parseInt(datosQR[0]);
      const capacidad = parseInt(datosQR[1]);
      const tipo = datosQR[2];

      if (isNaN(numeroMesa) || isNaN(capacidad)) {
        this.showToast('QR inválido: datos no válidos', 'danger');
        return;
      }

      console.log('Mesa escaneada:', {
        numero: numeroMesa,
        capacidad: capacidad,
        tipo: tipo
      });
      console.log('Mesa actual asignada:', this.mesaAsignada);

      // VERIFICACIÓN CLAVE: Si el cliente tiene mesa asignada, debe coincidir con la escaneada
      if (this.mesaAsignada && this.mesaAsignada !== numeroMesa) {
        this.showToast(
          `❌ Esta no es tu mesa asignada. Tu mesa es la ${this.mesaAsignada}, pero escaneaste la mesa ${numeroMesa}`,
          'danger'
        );
        return;
      }

      // Si no tiene mesa asignada, mostrar error
      if (!this.mesaAsignada) {
        this.showToast(
          `❌ No tienes una mesa asignada. Debe asignarte una mesa antes de poder escanear el QR.`,
          'danger'
        );
        return;
      }

      // Si llegó hasta aquí, significa que la mesa escaneada coincide con la asignada
      await this.verificarMesa(numeroMesa, capacidad, tipo);

    } catch (error) {
      console.error('Error procesando QR:', error);
      this.showToast('Error al procesar el QR', 'danger');
    }
  }

  /**
   * Verificar que la mesa escaneada corresponde a la asignada
   */
  async verificarMesa(numeroMesa: number, capacidad: number, tipo: string) {
    try {
      if (!this.cliente?.id_cliente) {
        this.showToast('Error: No se pudo obtener tu ID de cliente', 'danger');
        return;
      }

      // Verificar que la mesa existe en la base de datos
      const { data: mesa, error: errorMesa } = await this.authService.client
        .from('mesas')
        .select('*')
        .eq('numero', numeroMesa)
        .single();

      if (errorMesa || !mesa) {
        this.showToast(`La Mesa ${numeroMesa} no existe en el sistema`, 'danger');
        return;
      }
      
      // Verificar que los datos del QR coincidan con los de la base de datos
      if (mesa.cantidad !== capacidad || mesa.tipo !== tipo) {
        this.showToast(`Los datos del QR no coinciden con la mesa registrada`, 'danger');
        return;
      }

      // Asegurarse de que la mesa esté correctamente asignada en la base de datos
      // Esto actualiza tanto la tabla clientes como mesas
      await this.clienteService.setMesa(this.cliente.id_cliente, numeroMesa);

      // Todo correcto - verificar la mesa
      this.mesaVerificada = true;
      this.enEspera = false;
      
      console.log(`✅ Mesa ${numeroMesa} verificada y sincronizada correctamente`);
      
      this.showToast(
        `✅ Mesa ${numeroMesa} verificada correctamente\n` +
        `Capacidad: ${capacidad} personas\n` +
        `Tipo: ${tipo}`,
        'success'
      );

    } catch (error) {
      console.error('Error verificando mesa:', error);
      this.showToast('Error al verificar la mesa', 'danger');
    }
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

  /**
   * NOTA: Este método ahora no se usa en el flujo principal
   * La asignación de mesas se hace desde el maître/administrador
   * Los clientes solo verifican su mesa asignada escaneando el QR
   */
  async asignarMesa(numeroMesa: number) {
    try {
      if (!this.cliente?.id_cliente) {
        this.showToast('Error: No se pudo obtener tu ID de cliente', 'danger');
        return;
      }

      // Solo permitir si no tiene mesa asignada (caso excepcional)
      if (this.mesaAsignada) {
        this.showToast('Ya tienes una mesa asignada. Escanea el QR de tu mesa para verificarla.', 'warning');
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

      // Asignar la mesa al cliente (solo en casos excepcionales)
      const resultado = await this.clienteService.setMesa(this.cliente.id_cliente, numeroMesa);

      if (resultado) {
        this.mesaAsignada = numeroMesa;
        this.mesaVerificada = true;
        this.enEspera = false;
        this.showToast(`✅ Mesa ${numeroMesa} asignada y verificada correctamente`, 'success');
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

  verHistorial(){
    if (!this.mesaVerificada) {
      this.showToast('⚠️ Primero debes escanear el QR de una mesa', 'warning');
      return;
    }
    this.router.navigate(["/tabs-cliente-registrado/tab4-historial"]);
  }

  /**
   * Unirse a la lista de espera
   */
  async unirseListaEspera() {
    // Navegar al page de lista de espera
  }
}