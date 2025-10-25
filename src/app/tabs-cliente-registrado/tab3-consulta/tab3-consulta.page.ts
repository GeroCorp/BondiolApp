import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ClienteService } from 'src/app/services/cliente.service';
import { Notification } from 'src/app/services/notification';
import { ViewChild, ElementRef } from '@angular/core';

type Msg = {
  contenido: string, 
  nombre_usuario: string, 
  date_sended: string,
  nroMesa: number
}

@Component({
  selector: 'app-tab3-consulta',
  templateUrl: './tab3-consulta.page.html',
  styleUrls: ['./tab3-consulta.page.scss'],
  standalone: false,
})
export class Tab3ConsultaPage implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') private messagesContainer?: ElementRef;

  messages = signal<Msg[]>([]);
  loading = signal(false);
  newMessage: string = '';
  username: string = '';
  mesaActual: number | null = null;
  private subscription: any;

  private notificationService: Notification = inject(Notification);

  constructor(
    private clienteService: ClienteService,
    private router: Router
  ) { }

  async ngOnInit() {
    try {
      // Obtener datos del cliente
      this.username = await this.clienteService.getNombreCliente();
      const clienteId = await this.clienteService.getClientId();
      this.mesaActual = await this.clienteService.getNroMesa(clienteId);

      console.log('📱 Cliente conectado:', {
        nombre: this.username,
        mesa: this.mesaActual
      });

      // Cargar mensajes iniciales
      await this.loadMessages();

      // ✅ SUSCRIBIRSE A NUEVOS MENSAJES EN TIEMPO REAL
      this.suscribirseAMensajes();

    } catch (error) {
      console.error('❌ Error en ngOnInit:', error);
    }
  }

  ngOnDestroy() {
    // Desuscribirse al salir
    if (this.subscription) {
      this.subscription.unsubscribe();
      console.log('🔌 Desuscrito del chat');
    }
  }

  /**
   * 🔄 Suscripción en tiempo real a nuevos mensajes
   */
  private suscribirseAMensajes() {
    if (!this.mesaActual) {
      console.error('❌ No hay mesa asignada para suscribirse');
      return;
    }

    console.log('🔔 Suscribiéndose a mensajes de la mesa:', this.mesaActual);

    this.subscription = this.clienteService.client
      .channel(`chat-cliente-mesa-${this.mesaActual}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes',
          filter: `nroMesa=eq.${this.mesaActual}`
        },
        async (payload) => {
          console.log('📩 Nuevo mensaje recibido:', payload);
          
          const nuevoMensaje = payload.new as Msg;
          
          // Agregar el nuevo mensaje a la lista
          this.messages.update(mensajes => [...mensajes, nuevoMensaje]);
          
          // Scroll automático al último mensaje
          setTimeout(() => this.scrollToBottom(), 100);
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado de suscripción:', status);
      });
  }

  /**
   * 📨 Enviar mensaje
   */
  async sendMessage() {
    if (!this.newMessage.trim()) return;

    const tempContent = this.newMessage;
    this.newMessage = '';

    try {
      await this.clienteService.sendMessage(tempContent);
    } catch (error) {
      console.error('❌ Error:', error);
      
    }

    console.log("Nueva lista: ",this.messages());
    
    // Notificar al mozo del nuevo mensaje (Aunque tira error y no sé pq)
    this.notificationService.sendNotificationToPerfil("Mozo", "Nuevo mensaje de la mesa "+this.clienteService.getNroMesa(await this.clienteService.getClientId()), "Tienes un nuevo mensaje de "+this.username+" en el chat.");
  }

  async loadMessages(){
    this.loading.set(true);
    try {
      const messagesReceived = await this.clienteService.getChatMessages();
      
      console.log('📋 Mensajes cargados:', messagesReceived?.length || 0);
      
      this.messages.set(messagesReceived || []);
      
      // Scroll al final después de cargar
      setTimeout(() => this.scrollToBottom(), 200);

    } catch (error) {
      console.error('❌ Error al cargar los mensajes:', error);
    } finally {
      this.loading.set(false);
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

  volverHome() {
    this.router.navigate(["/home-cliente"]);
  }
}