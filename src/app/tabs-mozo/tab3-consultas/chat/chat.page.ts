import { Component, Input, OnInit, signal, ViewChild, ElementRef } from '@angular/core';
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
export class ChatPage implements OnInit {

  @ViewChild('messagesWrapper') messagesWrapper!: ElementRef;

  id_mesa!: number; // Esto representa el NÚMERO de la mesa, no su ID

  messages = signal<Msg[]>([]);
  loading = signal(false);
  newMessage: string = '';
  username: string = ''

  constructor(
    private clienteService: ClienteService, 
    private router: Router,
    private route: ActivatedRoute,
    private mozoService: Mozo
  ) {
  }
  
  ngOnInit() {
    this.setUsername();
    this.clienteService.subscribeToNewMessages(this.messages);
    // Obtener el numero_mesa desde los parámetros de la ruta
    this.route.paramMap.subscribe(params => {
      const numeroMesa = params.get('id_mesa'); // El parámetro sigue siendo 'id_mesa' en la ruta
      if (numeroMesa) {
        this.id_mesa = parseInt(numeroMesa, 10);
        console.log('Número de Mesa recibido:', this.id_mesa);
        // Cargar mensajes una vez que tenemos el número
        this.loadMessages();
      }
    });
  }

  async setUsername () {
    this.username = await this.mozoService.getNombreMozo();  
    console.log(this.username);
  }

  async sendMessage(){
    if (this.newMessage.trim() && this.id_mesa){
      const tempContent = this.newMessage;
      this.newMessage = '';
      
      try {
        // Enviar mensaje del mozo
        await this.mozoService.sendMessage(this.id_mesa, tempContent, this.username);
        
        // Recargar mensajes para ver el nuevo mensaje
        await this.loadMessages();
        
        // Scroll automático al último mensaje
        this.scrollToBottom();
        
        console.log("Mensaje enviado para mesa:", this.id_mesa);
      } catch (error) {
        console.error('Error enviando mensaje:', error);
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
      console.log('🔢 Longitud del signal:', this.messages().length);
      
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
