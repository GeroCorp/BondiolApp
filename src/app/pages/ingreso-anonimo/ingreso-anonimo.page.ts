import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { TipoClienteService } from '../../services/tipo-cliente.service';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { AlertController, ToastController } from '@ionic/angular';
import { supabase } from '../../services/supabase';

@Component({
  selector: 'app-ingreso-anonimo',
  templateUrl: './ingreso-anonimo.page.html',
  styleUrls: ['./ingreso-anonimo.page.scss'],
  standalone: false
})
export class IngresoAnonimoPage {
  nombre: string = '';
  foto: string | null = null;

  constructor(
    private tipoClienteService: TipoClienteService,
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  async accederComoExistente() {
    try {
      const { data: clientesAnonimos, error } = await supabase
        .from('clientes_anonimos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!clientesAnonimos?.length) {
        this.showToast('No hay clientes anónimos registrados');
        return;
      }

      const alert = await this.alertController.create({
        header: 'Clientes Anónimos',
        message: 'Selecciona un cliente existente',
        inputs: clientesAnonimos.map(c => ({
          type: 'radio',
          label: `${c.nombre} ${c.en_espera ? '(En espera)' : c.mesa_asignada ? `(Mesa ${c.mesa_asignada})` : ''}`,
          value: c,
          checked: false
        })),
        buttons: [
          {
            text: 'Cancelar',
            role: 'cancel'
          },
          {
            text: 'Acceder',
            handler: async (clienteSeleccionado) => {
              if (!clienteSeleccionado) return false;
              
              console.log('🔍 Cliente anónimo seleccionado:', clienteSeleccionado);
              console.log('📋 Estado del cliente:', {
                nombre: clienteSeleccionado.nombre,
                mesa_asignada: clienteSeleccionado.mesa_asignada,
                en_espera: clienteSeleccionado.en_espera
              });
              
              // ✅ Cargar en el servicio con normalización correcta
              await this.tipoClienteService.loadClienteAnonimoExisting(clienteSeleccionado);
              
              // Navegar al home donde se aplicará la lógica correcta
              this.router.navigate(['/home-cliente']);
              
              // Mostrar mensaje apropiado
              if (clienteSeleccionado.mesa_asignada) {
                this.showToast(
                  `Bienvenido ${clienteSeleccionado.nombre}. Tienes asignada la mesa ${clienteSeleccionado.mesa_asignada}. Escanea el QR para verificar.`,
                  'success'
                );
              } else {
                this.showToast(
                  `Bienvenido ${clienteSeleccionado.nombre}. Estás en lista de espera.`,
                  'primary'
                );
              }
              
              return true;
            }
          }
        ]
      });

      await alert.present();
    } catch (error) {
      console.error('Error:', error);
      this.showToast('Error al cargar clientes anónimos');
    }
  }

  async tomarFoto() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera
      });

      this.foto = `data:image/jpeg;base64,${image.base64String}`;
    } catch (error) {
      console.error('Error taking photo:', error);
    }
  }

  async ingresar() {
    if (!this.nombre || !this.foto) {
      alert('Por favor complete todos los campos');
      return;
    }

    try {
      await this.tipoClienteService.setClienteAnonimo(this.nombre, this.foto);
      this.router.navigate(['/home-cliente']);
    } catch (error) {
      console.error('Error:', error);
      alert('Error al ingresar como anónimo');
    }
  }

  async seleccionarClienteExistente() {
    try {
      const { data: clientesAnonimos, error } = await supabase
        .from('clientes_anonimos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!clientesAnonimos?.length) {
        this.showToast('No hay clientes anónimos registrados', 'warning');
        return;
      }

      const alert = await this.alertController.create({
        header: 'Seleccionar Cliente Anónimo',
        inputs: clientesAnonimos.map((c: any, i: number) => ({
          type: 'radio',
          label: `${c.nombre} ${c.en_espera ? '(En espera)' : c.mesa_asignada ? `(Mesa ${c.mesa_asignada})` : ''}`,
          value: i,
          checked: i === 0
        })),
        buttons: [
          { text: 'Cancelar', role: 'cancel' },
          {
            text: 'Acceder',
            handler: async (index: number) => {
              const clienteSeleccionado = clientesAnonimos[index];
              if (!clienteSeleccionado) return false;

              // cargar en el servicio sin insertar duplicado
              await this.tipoClienteService.loadClienteAnonimoExisting(clienteSeleccionado);

              // navegar al home-cliente (donde la UI deberá mostrar unirse a lista de espera si corresponde)
              this.router.navigate(['/home-cliente']);
              return true;
            }
          }
        ]
      });

      await alert.present();
    } catch (err) {
      console.error('Error al cargar clientes anónimos', err);
      this.showToast('Error al cargar clientes anónimos', 'danger');
    }
  }

  async mostrarClientesAnonimos() {
    try {
      const { data: clientesAnonimos, error } = await supabase
        .from('clientes_anonimos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!clientesAnonimos?.length) {
        this.showToast('No hay clientes anónimos registrados', 'warning');
        return;
      }

      const alert = await this.alertController.create({
        header: 'Seleccionar Cliente Existente',
        inputs: clientesAnonimos.map((c: any, i: number) => ({
          type: 'radio',
          label: `${c.nombre} ${c.en_espera ? '(En espera)' : c.mesa_asignada ? `(Mesa ${c.mesa_asignada})` : ''}`,
          value: i,
          checked: i === 0
        })),
        buttons: [
          { text: 'Cancelar', role: 'cancel' },
          {
            text: 'Acceder',
            handler: async (index: number) => {
              const clienteSeleccionado = clientesAnonimos[index];
              if (!clienteSeleccionado) return false;

              // IMPORTANTE: cargar el cliente en el servicio SIN insertar/duplicar
              await this.tipoClienteService.loadClienteAnonimoExisting(clienteSeleccionado);

              // navegar al home-cliente (el servicio ya normalizó y suscribió realtime)
              this.router.navigate(['/home-cliente']);
              return true;
            }
          }
        ]
      });

      await alert.present();
    } catch (err) {
      console.error('Error al cargar clientes anónimos', err);
      this.showToast('Error al cargar clientes anónimos', 'danger');
    }
  }

  private async showToast(message: string, color: string = 'primary') {
    const t = await this.toastController.create({ message, duration: 2000, color, position: 'top' });
    await t.present();
  }

  irARegistro() {
    this.router.navigate(['/register']);
  }
}