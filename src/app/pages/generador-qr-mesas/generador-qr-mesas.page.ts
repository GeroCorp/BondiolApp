// generador-qr-mesas.page.ts
import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/supabase';
import { ToastController } from '@ionic/angular';
import * as QRCode from 'qrcode';
import { Vibration } from '@awesome-cordova-plugins/vibration/ngx';

import { HapticService } from 'src/app/services/haptic.service';
interface Mesa {
  id: number;
  numero: number;
  cantidad: number;
  tipo: string;
  disponible: boolean;
  cliente_asignado: number | null;
}

@Component({
  selector: 'app-generador-qr-mesas',
  templateUrl: './generador-qr-mesas.page.html',
  styleUrls: ['./generador-qr-mesas.page.scss'],
  standalone: false,
})
export class GeneradorQrMesasPage implements OnInit {
  mesas: Mesa[] = [];
  qrCodes: { [key: number]: string } = {}; // Almacena los QR generados por número de mesa
  loading: boolean = false;

  constructor(
    private authService: AuthService,
    private toastController: ToastController,
    private hapticService: HapticService
  ) {}

  async ngOnInit() {
    await this.cargarMesas();
  }

  async cargarMesas() {
    try {
      this.loading = true;
      const data = await this.authService.getMesasConEstado();
      this.mesas = data;
      
      // Generar QR para cada mesa
      for (const mesa of this.mesas) {
        await this.generarQR(mesa.numero);
      }
      
      this.showToast('Mesas cargadas correctamente', 'success');
    } catch (error: any) {
      console.error('Error cargando mesas:', error);
      await this.hapticService.vibrateError();
      this.showToast('Error al cargar las mesas', 'danger');

    } finally {
      this.loading = false;
    }
  }

  async generarQR(numeroMesa: number) {
    try {
      // Generar QR con solo el número de mesa como string
      const qrDataURL = await QRCode.toDataURL(numeroMesa.toString(), {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      this.qrCodes[numeroMesa] = qrDataURL;
      console.log(`QR generado para mesa ${numeroMesa}`);
    } catch (error) {
      console.error(`Error generando QR para mesa ${numeroMesa}:`, error);
      await this.hapticService.vibrateError();
      this.showToast(`Error generando QR para mesa ${numeroMesa}`, 'danger');

    }
  }

  async descargarQR(numeroMesa: number) {
    try {
      const qrDataURL = this.qrCodes[numeroMesa];
      
      if (!qrDataURL) {
        this.showToast('QR no disponible', 'warning');
        return;
      }

      // Crear un enlace temporal para descargar
      const link = document.createElement('a');
      link.href = qrDataURL;
      link.download = `mesa_${numeroMesa}_qr.png`;
      link.click();
      
      this.showToast(`QR de mesa ${numeroMesa} descargado`, 'success');
    } catch (error) {
      console.error('Error descargando QR:', error);
      await this.hapticService.vibrateError();
      this.showToast('Error al descargar el QR', 'danger');

    }
  }

  async imprimirQR(numeroMesa: number) {
    try {
      const qrDataURL = this.qrCodes[numeroMesa];
      
      if (!qrDataURL) {
        this.showToast('QR no disponible', 'warning');
        return;
      }

      // Crear ventana de impresión
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        await this.hapticService.vibrateError();
        this.showToast('No se pudo abrir ventana de impresión', 'danger');
        return;
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>QR Mesa ${numeroMesa}</title>
            <style>
              body {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                font-family: Arial, sans-serif;
              }
              .qr-container {
                text-align: center;
                padding: 20px;
                border: 2px solid #000;
              }
              h1 {
                margin: 0 0 20px 0;
              }
              img {
                max-width: 400px;
                height: auto;
              }
              .info {
                margin-top: 20px;
                font-size: 18px;
              }
            </style>
          </head>
          <body>
            <div class="qr-container">
              <h1>Mesa ${numeroMesa}</h1>
              <img src="${qrDataURL}" alt="QR Mesa ${numeroMesa}">
              <div class="info">
                <p>Escanea este código para acceder a la mesa</p>
              </div>
            </div>
          </body>
        </html>
      `);
      
      printWindow.document.close();
      printWindow.focus();
      
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
      
      this.showToast('Preparando impresión...', 'success');
    } catch (error) {
      console.error('Error imprimiendo QR:', error);
      await this.hapticService.vibrateError();
      this.showToast('Error al imprimir el QR', 'danger');
    }
  }

  async regenerarQR(numeroMesa: number) {
    await this.generarQR(numeroMesa);
    this.showToast(`QR regenerado para mesa ${numeroMesa}`, 'success');
  }

  async showToast(message: string, color: 'success' | 'danger' | 'medium' | 'warning' = 'medium') {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}