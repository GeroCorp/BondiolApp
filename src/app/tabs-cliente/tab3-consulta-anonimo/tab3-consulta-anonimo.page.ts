import { Component, OnInit, OnDestroy } from '@angular/core';
import { ClienteAnonimoService } from '../../services/cliente-anonimo.service';
import { ToastController } from '@ionic/angular';

import { HapticService } from 'src/app/services/haptic.service';
@Component({
  selector: 'app-tab3-consulta-anonimo',
  templateUrl: './tab3-consulta-anonimo.page.html',
  styleUrls: ['./tab3-consulta-anonimo.page.scss'],
  standalone: false,
})
export class Tab3ConsultaAnonimoPage implements OnInit, OnDestroy {
  messages: any[] = [];
  loading: boolean = false;
  nuevoMensaje: string = '';
  nombreCliente: string = '';
  private subscription: any;

  constructor(
    private clienteService: ClienteAnonimoService,
    private toastCtrl: ToastController,
    private hapticService: HapticService
  ) {}

  async ngOnInit() {
    const clienteData = sessionStorage.getItem('cliente_anonimo');
    if (clienteData) {
      const cliente = JSON.parse(clienteData);
      this.nombreCliente = cliente.nombre;
    }

    await this.cargarMensajes();
    this.suscribirseAMensajes();
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  async cargarMensajes() {
    this.loading = true;
    try {
      this.messages = await this.clienteService.obtenerMensajesChat();
    } catch (error) {
      console.error('Error cargando mensajes:', error);
      await this.hapticService.vibrateError();
      this.showToast('Error al cargar mensajes', 'danger');
    }
    this.loading = false;
  }

  suscribirseAMensajes() {
    this.subscription = this.clienteService.suscribirseAMensajes((mensajes) => {
      this.messages = mensajes;
    });
  }

  async enviar() {
    if (!this.nuevoMensaje.trim()) return;

    const temp = this.nuevoMensaje;
    this.nuevoMensaje = '';
    
    try {
      await this.clienteService.enviarMensaje(temp);
    } catch (error: any) {
      await this.hapticService.vibrateError();
      this.showToast('Error: ' + error.message, 'danger');
      this.nuevoMensaje = temp;
    }
  }

  async showToast(message: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}