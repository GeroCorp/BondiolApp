import { Component, Input, OnInit, signal } from '@angular/core';
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

  id_mesa!: number;

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
    // Obtener el id_mesa desde los parámetros de la ruta
    this.route.paramMap.subscribe(params => {
      const idMesa = params.get('id_mesa');
      if (idMesa) {
        this.id_mesa = parseInt(idMesa, 10);
        console.log('ID Mesa recibido:', this.id_mesa);
        // Cargar mensajes una vez que tenemos el ID
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
        
        console.log("Mensaje enviado para mesa:", this.id_mesa);
      } catch (error) {
        console.error('Error enviando mensaje:', error);
      }
    }
  }

  async loadMessages(){
    this.loading.set(true);
    try{
      const messagesReceived = await this.mozoService.getChatsMesas(this.id_mesa);
      this.messages.set(messagesReceived || []);
      console.log('Mensajes cargados para mesa', this.id_mesa, ':', messagesReceived);
    }catch (error){
      console.error('Error al cargar los mensajes:', error);
    }
    this.loading.set(false);
  }

  volver(){
    this.router.navigate(['/tabs-mozo/tab3-consultas']);
  }

}
