import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
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
  @ViewChild('messagesContainer') private messagesContainer?: ElementRef;

  messages: any[] = [];
  loading: boolean = false;
  nuevoMensaje: string = '';
  nombreCliente: string = '';
  mesaActual: number | null = null;
  private subscription: any;

  constructor(
    private clienteService: ClienteAnonimoService,
    private toastCtrl: ToastController,
    private hapticService: HapticService
  ) {}

  async ngOnInit() {
    try {
      // Obtener datos del cliente anónimo
      const clienteData = sessionStorage.getItem('cliente_anonimo');
      const mesaData = sessionStorage.getItem('numero_mesa');

      if (!clienteData || !mesaData) {
        this.showToast('Error: No se encontró sesión', 'danger');
        return;
      }

      const cliente = JSON.parse(clienteData);
      this.nombreCliente = cliente.nombre;
      this.mesaActual = parseInt(mesaData);

      console.log('👤 Cliente anónimo conectado:', {
        nombre: this.nombreCliente,
        mesa: this.mesaActual
      });

      // Cargar mensajes iniciales
      await this.cargarMensajes();

      // Suscribirse a nuevos mensajes
      this.suscribirseAMensajes();

    } catch (error) {
      console.error('❌ Error en ngOnInit:', error);
    }
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      console.log('🔌 Desuscrito del chat');
    }
  }

  /**
   * 📥 Cargar mensajes de la mesa actual
   */
  async cargarMensajes() {
    if (!this.mesaActual) {
      console.error('❌ No hay mesa asignada');
      return;
    }

    this.loading = true;
    try {
      // ✅ Obtener solo mensajes de ESTA mesa
      const mensajes = await this.clienteService.obtenerMensajesChat();
      
      console.log('📋 Mensajes cargados para mesa', this.mesaActual, ':', mensajes.length);
      
      this.messages = mensajes;

      // Scroll al final
      setTimeout(() => this.scrollToBottom(), 200);

    } catch (error) {
      console.error('Error cargando mensajes:', error);
      await this.hapticService.vibrateError();
      this.showToast('Error al cargar mensajes', 'danger');
    } finally {
      this.loading = false;
    }
  }

  /**
   * 🔔 Suscribirse a nuevos mensajes en tiempo real
   */
  suscribirseAMensajes() {
    if (!this.mesaActual) {
      console.error('❌ No hay mesa para suscribirse');
      return;
    }

    console.log('🔔 Suscribiéndose a mensajes de la mesa:', this.mesaActual);

    this.subscription = this.clienteService.suscribirseAMensajes((mensajes) => {
      console.log('📩 Mensajes actualizados:', mensajes.length);
      this.messages = mensajes;
      
      // Scroll automático
      setTimeout(() => this.scrollToBottom(), 100);
    });
  }

  /**
   * 📨 Enviar mensaje
   */
  async enviar() {
    if (!this.nuevoMensaje.trim()) return;

    const temp = this.nuevoMensaje;
    this.nuevoMensaje = '';
    
    try {
      await this.clienteService.enviarMensaje(temp);
      console.log('✅ Mensaje enviado:', temp);

      // Scroll al final
      setTimeout(() => this.scrollToBottom(), 100);

    } catch (error: any) {
      await this.hapticService.vibrateError();
      this.showToast('Error: ' + error.message, 'danger');
      this.nuevoMensaje = temp;
    }
  }

  /**
   * 📜 Scroll automático al último mensaje
   */
  private scrollToBottom() {
    try {
      if (this.messagesContainer) {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    } catch (error) {
      console.error('Error en scroll:', error);
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