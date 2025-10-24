import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController, LoadingController, AlertController } from '@ionic/angular';
import { AuthService } from 'src/app/services/supabase';
import { HapticService } from 'src/app/services/haptic.service';

interface Consulta {
  id_consulta: number;
  mesa_id: number;
  cliente_id: number;
  mensaje: string;
  estado: string;
  respuesta?: string;
  created_at: string;
  mesa?: { numero: number };
  cliente?: { nombre: string; apellido: string };
  respuestaTemp?: string; // Para el ngModel
}

@Component({
  selector: 'app-tab3-consultas',
  templateUrl: './tab3-consultas.page.html',
  styleUrls: ['./tab3-consultas.page.scss'],
  standalone: false
})
export class Tab3ConsultasPage implements OnInit {
  consultas: Consulta[] = [];
  cargando = true;
  mesas : any[] = [];


  constructor(
    private router: Router,
    private authService: AuthService,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private hapticService: HapticService
  ) {}

  async ngOnInit() {
    // await this.cargarConsultas();
    await this.cargarMesas();
  }

  async cargarConsultas() {
    this.cargando = true;
    try {
      const consultas = await this.authService.getConsultasPendientes();
      this.consultas = consultas || [];
      // Inicializar campo temporal para respuesta
      this.consultas.forEach(c => c.respuestaTemp = '');
    } catch (error) {
      console.error('Error al cargar consultas:', error);
      await this.hapticService.vibrateError();
      this.showToast('Error al cargar las consultas', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  async recargar() {
    await this.cargarMesas();
    this.showToast('Lista actualizada', 'medium');
  }

  async handleRefresh(event: any) {
    await this.cargarMesas();
    event.target.complete();
  }

  formatearFecha(fecha: string): string {
    const date = new Date(fecha);
    const hoy = new Date();
    const ayer = new Date(hoy);
    ayer.setDate(hoy.getDate() - 1);

    const opciones: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
    };

    const hora = date.toLocaleTimeString('es-AR', opciones);

    if (date.toDateString() === hoy.toDateString()) {
      return `Hoy ${hora}`;
    } else if (date.toDateString() === ayer.toDateString()) {
      return `Ayer ${hora}`;
    } else {
      return `${date.toLocaleDateString('es-AR')} ${hora}`;
    }
  }

  test(mesa: any) {
    console.log('Mesa seleccionada:', mesa);
    // Navegar al chat pasando el NUMERO de la mesa como parámetro
    this.router.navigate(['/tabs-mozo/tab3-consultas/chat', mesa.numero]);
  }

  async cargarMesas() {
    try {
      this.mesas = await this.authService.getMesasConEstado();
      this.showToast('Mesas cargadas correctamente', 'success');
    } catch (error) {
      console.error('Error al cargar mesas:', error);
      await this.hapticService.vibrateError();
      this.showToast('Error al cargar las mesas', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  async loadChats(){

  }

  // async responderConsulta(consulta: Consulta) {
  //   if (!consulta.respuestaTemp || consulta.respuestaTemp.trim() === '') {
  //     this.showToast('Debes escribir una respuesta', 'warning');
  //     return;
  //   }

  //   const alert = await this.alertController.create({
  //     header: 'Confirmar respuesta',
  //     message: '¿Enviar esta respuesta al cliente?',
  //     buttons: [
  //       {
  //         text: 'Cancelar',
  //         role: 'cancel',
  //       },
  //       {
  //         text: 'Enviar',
  //         handler: async () => {
  //           await this.enviarRespuesta(consulta);
  //         },
  //       },
  //     ],
  //   });

  //   await alert.present();
  // }

  // async enviarRespuesta(consulta: Consulta) {
  //   const loading = await this.loadingController.create({
  //     message: 'Enviando respuesta...',
  //     spinner: 'crescent',
  //   });
  //   await loading.present();

  //   try {
  //     // Actualizar la consulta con la respuesta
  //     await this.authService.responderConsulta(
  //       consulta.id_consulta,
  //       consulta.respuestaTemp || ''
  //     );

  //     // Enviar notificación al cliente
  //     await this.authService.enviarNotificacionCliente(
  //       consulta.cliente_id,
  //       'Respuesta del mozo',
  //       `Tu consulta de la mesa ${consulta.mesa?.numero} ha sido respondida.`
  //     );

  //     await loading.dismiss();
  //     this.showToast('Respuesta enviada correctamente', 'success');

  //     // Recargar lista
  //     await this.cargarConsultas();
  //   } catch (error) {
  //     await loading.dismiss();
  //     console.error('Error al enviar respuesta:', error);
  //     this.showToast('Error al enviar la respuesta', 'danger');
  //   }
  // }

  async verHistorial() {
    this.showToast('Función en desarrollo', 'medium');
  }

  async showToast(message: string, color: 'success' | 'danger' | 'warning' | 'medium') {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      color,
      position: 'bottom',
    });
    await toast.present();
  }

  // TrackBy function para mejorar performance de ngFor
  trackByIndex(index: number, item: any): number {
    return index;
  }

  // Método para verificar si una mesa tiene mensajes nuevos
  hasNewMessages(numeroMesa: number): boolean {
    // TODO: Implementar lógica para verificar mensajes nuevos
    // Por ahora retorna false, pero aquí podrías:
    // - Verificar timestamp del último mensaje
    // - Comparar con la última vez que el mozo vio el chat
    // - Usar un servicio de notificaciones en tiempo real
    return Math.random() > 0.7; // Simulación temporal
  }
}