import { Component, effect, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/supabase';
import { ToastController, AlertController } from '@ionic/angular';
import { ClienteService } from 'src/app/services/cliente.service';
import { ListaEsperaService } from 'src/app/services/lista-espera.service';
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
  mesaVerificada: boolean = true;

  constructor(
    private router: Router,
    private authService: AuthService,
    private toastController: ToastController,
    private alertController: AlertController,
    private clienteService: ClienteService,
    private listaEsperaService: ListaEsperaService
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
        
        if (this.mesaAsignada) {
          this.enEspera = false;
        }
      }
    } catch (error) {
      console.error('Error verificando mesa asignada:', error);
    }
  }

  async escanearQRMesa() {
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

  async escanearQRListaEspera() {
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

      if (this.mesaAsignada && this.mesaAsignada !== numeroMesa) {
        this.showToast(
          `❌ Esta no es tu mesa asignada. Tu mesa es la ${this.mesaAsignada}, pero escaneaste la mesa ${numeroMesa}`,
          'danger'
        );
        return;
      }

      if (!this.mesaAsignada) {
        this.showToast(
          `❌ No tienes una mesa asignada. Debe asignarte una mesa antes de poder escanear el QR.`,
          'danger'
        );
        return;
      }

      await this.verificarMesa(numeroMesa, capacidad, tipo);

    } catch (error) {
      console.error('Error procesando QR:', error);
      this.showToast('Error al procesar el QR', 'danger');
    }
  }

  async verificarMesa(numeroMesa: number, capacidad: number, tipo: string) {
    try {
      if (!this.cliente?.id_cliente) {
        this.showToast('Error: No se pudo obtener tu ID de cliente', 'danger');
        return;
      }

      const { data: mesa, error: errorMesa } = await this.authService.client
        .from('mesas')
        .select('*')
        .eq('numero', numeroMesa)
        .maybeSingle();

      if (errorMesa || !mesa) {
        this.showToast(`La Mesa ${numeroMesa} no existe en el sistema`, 'danger');
        return;
      }

      if (mesa.capacidad !== capacidad || mesa.tipo !== tipo) {
        this.showToast(`Los datos del QR no coinciden con la mesa registrada`, 'danger');
        return;
      }

      await this.clienteService.setMesa(this.cliente.id_cliente, numeroMesa);

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

      if (this.mesaAsignada) {
        this.showToast('Ya tienes una mesa asignada. Escanea el QR de tu mesa para verificarla.', 'warning');
        return;
      }

      const { data: mesa, error: errorMesa } = await this.authService.client
        .from('mesas')
        .select('*')
        .eq('numero', numeroMesa)
        .maybeSingle();

      if (errorMesa || !mesa) {
        this.showToast(`La Mesa ${numeroMesa} no existe`, 'danger');
        return;
      }

      if (mesa.cliente_asignado && mesa.cliente_asignado !== this.cliente.id_cliente) {
        this.showToast(`La Mesa ${numeroMesa} está ocupada por otro cliente`, 'danger');
        return;
      }

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

   verJuegos() {
      if (!this.mesaVerificada) {
        this.showToast('⚠️ Primero debes escanear el QR de una mesa', 'warning');
        return;
      }
      this.router.navigate(['/tabs-cliente-registrado/tab4-juegos']);
    }

  /**
   * 🧪 [TESTING] Simular unirse a lista de espera sin escanear QR
   * Agrega al cliente directamente a la tabla lista_espera
   */
  async unirseListaEsperaSimulado() {
    try {
      if (!this.cliente?.id_cliente) {
        this.showToast('Error: No se pudo obtener tu ID de cliente', 'danger');
        return;
      }

      // Verificar si ya tiene mesa asignada
      if (this.mesaAsignada !== null) {
        this.showToast('Ya tienes una mesa asignada', 'warning');
        return;
      }

      // Mostrar alerta pidiendo cantidad de personas
      const alert = await this.alertController.create({
        header: '🧪 [TESTING] Unirse a Lista de Espera',
        message: `${this.cliente.nombre} ${this.cliente.apellido}`,
        subHeader: '¿Cuántas personas son?',
        inputs: [
          {
            name: 'cantidadPersonas',
            type: 'number',
            placeholder: 'Cantidad de personas',
            value: 2,
            min: 1,
            max: 12,
            attributes: {
              inputmode: 'numeric'
            }
          }
        ],
        buttons: [
          {
            text: 'Cancelar',
            role: 'cancel'
          },
          {
            text: 'Unirse a Lista',
            handler: async (data) => {
              const cantidad = parseInt(data.cantidadPersonas);
              
              if (!cantidad || cantidad < 1 || cantidad > 12) {
                this.showToast('Cantidad de personas debe ser entre 1 y 12', 'warning');
                return false;
              }

              await this.procesarUnionListaEsperaTesting(cantidad);
              return true;
            }
          }
        ]
      });

      await alert.present();

    } catch (error) {
      console.error('Error en unirseListaEsperaSimulado:', error);
      this.showToast('Error al unirse a lista de espera', 'danger');
    }
  }

  /**
   * Procesar la unión a lista de espera (modo testing)
   * Inserta directamente en la tabla lista_espera
   */
  async procesarUnionListaEsperaTesting(cantidadPersonas: number) {
    try {
      if (!this.cliente) {
        this.showToast('Error: No hay datos del cliente', 'danger');
        return;
      }

      console.log('🧪 [TESTING] Agregando a lista de espera:', {
        nombre: `${this.cliente.nombre} ${this.cliente.apellido}`,
        cantidad: cantidadPersonas
      });

      // Agregar a la tabla lista_espera usando el servicio
      const resultado = await this.listaEsperaService.agregarClienteEspera({
        nombre_cliente: `${this.cliente.nombre} ${this.cliente.apellido}`,
        cantidad_personas: cantidadPersonas
      });

      if (resultado.success) {
        console.log('✅ Cliente agregado a lista de espera:', resultado.data);
        
        // Asegurar que el cliente no tenga mesa asignada
        if (this.cliente.id_cliente) {
          const { error: updateError } = await this.authService.client
            .from('clientes')
            .update({ mesa_asignada: null })
            .eq('id_cliente', this.cliente.id_cliente);

          if (updateError) {
            console.error('Error actualizando cliente:', updateError);
          }
        }

        // Actualizar estado local
        this.mesaAsignada = null;
        this.mesaVerificada = false;
        this.enEspera = true;

        this.showToast(
          `✅ ¡Agregado a la lista de espera!\n` +
          `ID: ${resultado.data?.id}\n` +
          `Personas: ${cantidadPersonas}\n` +
          `El maître te asignará una mesa pronto`,
          'success'
        );

        // Mostrar información adicional
        setTimeout(() => {
          this.mostrarInfoListaEspera(resultado.data?.id);
        }, 3500);

      } else {
        this.showToast('Error al agregar a lista de espera', 'danger');
      }

    } catch (error) {
      console.error('Error procesando unión a lista de espera:', error);
      this.showToast('Error al procesar la solicitud', 'danger');
    }
  }

  /**
   * Mostrar información adicional sobre la lista de espera
   */
  async mostrarInfoListaEspera(clienteId?: number) {
    const alert = await this.alertController.create({
      header: '📋 En Lista de Espera',
      message: clienteId 
        ? `Tu ID de lista: <strong>${clienteId}</strong><br><br>` +
          `El maître verá tu solicitud y te asignará una mesa cuando esté disponible.<br><br>` +
          `Mantente cerca del restaurante.`
        : `Tu solicitud fue registrada.<br><br>` +
          `El maître te asignará una mesa cuando esté disponible.`,
      buttons: ['Entendido']
    });

    await alert.present();
  }

  /**
   * 🧪 [TESTING] Simular escaneo de QR para testing (sin cámara)
   * Verifica automáticamente la mesa asignada sin necesidad de escanear
   */
  async verificarMesaSimulada() {
    try {
      if (!this.mesaAsignada) {
        this.showToast('No tienes una mesa asignada todavía', 'warning');
        return;
      }

      const { data: mesa, error } = await this.authService.client
        .from('mesas')
        .select('*')
        .eq('numero', this.mesaAsignada)
        .maybeSingle();

      if (error || !mesa) {
        this.showToast('Error al obtener datos de la mesa', 'danger');
        return;
      }

      const qrSimulado = `${mesa.numero},${mesa.cantidad},${mesa.tipo}`;
      
      console.log('🧪 [TESTING] Simulando escaneo QR de mesa:', qrSimulado);
      
      await this.procesarQRMesa(qrSimulado);
      
    } catch (error) {
      console.error('Error en verificación simulada:', error);
      this.showToast('Error al verificar la mesa', 'danger');
    }
  }
}