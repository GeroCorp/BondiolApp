import { Component, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/supabase';
import { ListaEsperaService } from '../../services/lista-espera.service';
import { ToastController, AlertController } from '@ionic/angular';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Notification } from 'src/app/services/notification';

import { HapticService } from 'src/app/services/haptic.service';
@Component({
  selector: 'app-ingreso-anonimo',
  templateUrl: './ingreso-anonimo.page.html',
  styleUrls: ['./ingreso-anonimo.page.scss'],
  standalone: false
})
export class IngresoAnonimoPage implements OnDestroy {
  nombre: string = '';
  foto: string | null = null;
  isLoading: boolean = false;
  private pollingInterval: any;

  constructor(
    private supabase: AuthService,
    private listaEsperaService: ListaEsperaService,
    private router: Router,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private hapticService: HapticService,
    private notificationService: Notification
  ) {
    this.limpiarSesionAnterior();
  }

  ngOnDestroy() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
  }

  private limpiarSesionAnterior() {
    try {
      sessionStorage.removeItem('cliente_anonimo');
      sessionStorage.removeItem('numero_mesa');
      sessionStorage.removeItem('polling_interval');
      localStorage.removeItem('cliente_anonimo');
      localStorage.removeItem('mesa_actual');
      console.log('✅ Sesión anterior limpiada');
    } catch (error) {
      console.error('Error limpiando sesión anterior:', error);
    }
  }

  volver(){
    this.router.navigate(["/login"])
  }

  async tomarFoto() {
    try {
      const image = await Camera.getPhoto({
        quality: 70,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });

      this.foto = image.dataUrl || null;
      this.showToast('Foto capturada', 'success');
    } catch (error: any) {
      if (error.message !== 'User cancelled photos app') {
        await this.hapticService.vibrateError();
        this.showToast('Error al capturar foto', 'danger');
      }
    }
  }

  eliminarFoto() {
    this.foto = null;
  }

  async ingresar() {
    if (!this.nombre || this.nombre.trim().length < 2) {
      this.showToast('Ingresa un nombre válido (mínimo 2 caracteres)', 'warning');
      return;
    }

    if (!this.foto) {
      this.showToast('Debes tomar una foto', 'warning');
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Confirmar',
      message: `¿Ingresar como "${this.nombre.trim()}"?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Confirmar',
          handler: async () => await this.procesarIngreso()
        }
      ]
    });

    await alert.present();
  }

  private async procesarIngreso() {
    this.isLoading = true;

    try {
      console.log('🔄 Procesando ingreso anónimo...');

      // 1. Subir foto
      const blob = this.supabase.dataURLtoBlob(this.foto!);
      const tempId = `anonimo_${Date.now()}`;
      const fotoUrl = await this.supabase.subirImagenCliente(tempId, blob);

      console.log('📸 Foto subida:', fotoUrl);

      // 2. Registrar en clientes_anonimos
      const { data: clienteAnonimo, error: errorCliente } = await this.supabase.client
        .from('clientes_anonimos')
        .insert([{
          nombre: this.nombre.trim(),
          foto: fotoUrl,
          en_espera: true,
          mesa_asignada: null
        }])
        .select()
        .single();

      if (errorCliente || !clienteAnonimo) {
        console.error('Error insertando cliente anónimo:', errorCliente);
        throw new Error('Error al registrar cliente anónimo');
      }
      this.notificationService.sendNotificationToPerfil(
        "maitre",
        "Nuevo cliente anónimo en lista de espera", 
        "El cliente "+this.nombre.trim()+" ha ingresado como anónimo y está en la lista de espera.");
      

      console.log('✅ Cliente anónimo registrado:', clienteAnonimo);

      // 3. ✅ AGREGAR A LISTA DE ESPERA (NUEVO)
      const resultadoListaEspera = await this.listaEsperaService.agregarClienteEspera({
        nombre_cliente: this.nombre.trim(),
        cantidad_personas: 1 // Por defecto 1 persona para anónimos
      });

      if (!resultadoListaEspera.success) {
        console.error('Error agregando a lista de espera:', resultadoListaEspera.error);
        throw new Error('Error al agregar a lista de espera');
      }

      console.log('✅ Cliente agregado a lista de espera:', resultadoListaEspera.data);

      // 4. Guardar datos en storage
      const clienteData = {
        id: clienteAnonimo.id_clienteanonimo,
        nombre: clienteAnonimo.nombre,
        foto: clienteAnonimo.foto,
        lista_espera_id: resultadoListaEspera.data.id // Guardar ID de lista de espera
      };

      localStorage.setItem('cliente_anonimo', JSON.stringify(clienteData));
      sessionStorage.setItem('cliente_anonimo', JSON.stringify(clienteData));

      this.showToast('✅ Ingresaste a la lista de espera', 'success');

      // 5. Esperar asignación de mesa
      await this.esperarMesa(clienteAnonimo.id_clienteanonimo);

    } catch (error: any) {
      console.error('❌ Error en procesarIngreso:', error);
      await this.hapticService.vibrateError();
      this.showToast('Error al ingresar: ' + error.message, 'danger');
      this.isLoading = false;
    }
  }

  private async esperarMesa(clienteId: number) {
    const alert = await this.alertCtrl.create({
      header: '⏳ En Lista de Espera',
      message: 'Estás en la lista de espera. El maître te asignará una mesa pronto.',
      backdropDismiss: false,
      buttons: [{
        text: 'Esperar',
        handler: () => {
          this.iniciarPolling(clienteId);
        }
      }]
    });

    await alert.present();
  }

  private iniciarPolling(clienteId: number) {
    console.log('🔄 Iniciando polling para cliente:', clienteId);

    this.router.navigate(['/home-anonimo']);
  }

  async showToast(message: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}