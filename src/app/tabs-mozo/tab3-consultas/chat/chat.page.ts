import { Component, Input, OnInit, OnDestroy, signal, ViewChild, ElementRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ClienteService } from 'src/app/services/cliente.service';
import { Mozo } from 'src/app/services/mozo';

type Msg = {
  contenido: string, 
  nombre_usuario: string, 
  date_sended: string
}

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  standalone: false,
})
export class ChatPage implements OnInit, OnDestroy {

  @ViewChild('messagesWrapper') messagesWrapper!: ElementRef;

  id_mesa!: number; // Esto representa el NÚMERO de la mesa, no su ID

  messages = signal<Msg[]>([]);
  loading = signal(false);
  newMessage: string = '';
  username: string = '';
  private realtimeSubscription: any = null; // ✅ NUEVO

  constructor(
    private clienteService: ClienteService, 
    private router: Router,
    private route: ActivatedRoute,
    private mozoService: Mozo
  ) {
  }
  
  async ngOnInit() {
    await this.setUsername();
    
    // Obtener el numero_mesa desde los parámetros de la ruta
    this.route.paramMap.subscribe(params => {
      const numeroMesa = params.get('id_mesa');
      if (numeroMesa) {
        this.id_mesa = parseInt(numeroMesa, 10);
        console.log('📢 Número de Mesa recibido:', this.id_mesa);
        // Cargar mensajes una vez que tenemos el número
        this.loadMessages();
        // ✅ NUEVO: Suscribirse a mensajes en tiempo real
        this.subscribeToMessages();
      }
    });
  }

  // ✅ NUEVO: Limpiar suscripción al salir
  ngOnDestroy() {
    if (this.realtimeSubscription) {
      this.realtimeSubscription.unsubscribe();
      console.log('🔌 Desuscrito del chat de mozo');
    }
  }

  // ✅ NUEVO: Suscripción en tiempo real para el mozo
  private subscribeToMessages() {
    if (!this.id_mesa) {
      console.error('❌ No hay mesa para suscribirse');
      return;
    }

    console.log('📡 Mozo suscribiéndose a mensajes de mesa:', this.id_mesa);

    this.realtimeSubscription = this.clienteService.client
      .channel(`chat-mozo-mesa-${this.id_mesa}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes',
          filter: `nroMesa=eq.${this.id_mesa}`
        },
        async (payload) => {
          console.log('📩 Nuevo mensaje recibido en mozo:', payload);
          
          const nuevoMensaje = payload.new as Msg;
          
          // Agregar el mensaje solo si no es del mozo actual (para evitar duplicados)
          if (nuevoMensaje.nombre_usuario !== this.username) {
            this.messages.update(mensajes => [...mensajes, nuevoMensaje]);
            setTimeout(() => this.scrollToBottom(), 100);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado suscripción mozo:', status);
      });
  }

  async setUsername () {
    this.username = await this.mozoService.getNombreMozo();  
    console.log('👤 Usuario mozo:', this.username);
  }

  async sendMessage(){
    if (this.newMessage.trim() && this.id_mesa){
      const tempContent = this.newMessage;
      this.newMessage = '';
      
      try {
        // Enviar mensaje del mozo
        await this.mozoService.sendMessage(this.id_mesa, tempContent, this.username);
        
        console.log("✅ Mensaje enviado por mozo a mesa:", this.id_mesa);
        
        // ✅ Agregar el mensaje localmente de inmediato (para que aparezca sin recargar)
        const nuevoMensaje: Msg = {
          contenido: tempContent,
          nombre_usuario: this.username,
          date_sended: new Date().toISOString()
        };
        this.messages.update(mensajes => [...mensajes, nuevoMensaje]);
        
        // Scroll automático al último mensaje
        setTimeout(() => this.scrollToBottom(), 100);
        
      } catch (error) {
        console.error('❌ Error enviando mensaje:', error);
        this.newMessage = tempContent; // Restaurar mensaje si falla
      }
    }
  }

  async loadMessages(){
    this.loading.set(true);
    console.log('🔍 Iniciando carga de mensajes para mesa:', this.id_mesa);
    
    try{
      const messagesReceived = await this.mozoService.getChatsMesas(this.id_mesa);
      console.log('📨 Mensajes recibidos desde BD:', messagesReceived);
      console.log('📊 Cantidad de mensajes:', messagesReceived?.length || 0);
      
      this.messages.set(messagesReceived || []);
      
      // Debug del signal
      console.log('📡 Estado del signal messages después de set:', this.messages());
      console.log('📢 Longitud del signal:', this.messages().length);
      
      // Scroll al final después de cargar mensajes
      setTimeout(() => this.scrollToBottom(), 100);
    }catch (error){
      console.error('❌ Error al cargar los mensajes:', error);
    }
    this.loading.set(false);
    console.log('✅ Carga de mensajes completada. Loading:', this.loading());
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesWrapper?.nativeElement) {
        const element = this.messagesWrapper.nativeElement.closest('.messages-container');
        if (element) {
          element.scrollTop = element.scrollHeight;
        }
      }
    } catch (error) {
      console.error('Error al hacer scroll:', error);
    }
  }

  // TrackBy function para mejorar performance de ngFor
  trackByIndex(index: number, item: any): number {
    return index;
  }

  volver(){
    this.router.navigate(['/tabs-mozo/tab3-consultas']);
  }

}