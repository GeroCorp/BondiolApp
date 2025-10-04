import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ClienteService } from 'src/app/services/cliente.service';
import { Notification } from 'src/app/services/notification';

type Msg = {
  contenido: string, 
  nombre_usuario: string, 
  date_sended: string
}
@Component({
  selector: 'app-tab3-consulta',
  templateUrl: './tab3-consulta.page.html',
  styleUrls: ['./tab3-consulta.page.scss'],
  standalone: false,
})



export class Tab3ConsultaPage implements OnInit {

  messages = signal<Msg[]>([]);
  loading = signal(false);
  newMessage: string = '';
  username: string = ''

  private notificationService: Notification = inject(Notification);

  constructor(
    private clienteService: ClienteService,
    private router: Router
  ) { }

  async ngOnInit() {
    this.username = await this.clienteService.getNombreCliente();
    this.clienteService.subscribeToNewMessages(this.messages);
    await this.loadMessages();
  }

  async sendMessage(){
    if (this.newMessage.trim()){
      const tempContent = this.newMessage;
      this.newMessage = '';
      await this.clienteService.sendMessage(tempContent);
    }
    console.log("Nueva lista: ",this.messages());
    
    // Notificar al mozo del nuevo mensaje (Aunque tira error y no sé pq)
    this.notificationService.sendNotificationToPerfil("Mozo", "Nuevo mensaje de la mesa "+this.clienteService.getMesa(await this.clienteService.getClientId()), "Tienes un nuevo mensaje de "+this.username+" en el chat.");
  }

  async loadMessages(){
    this.loading.set(true);
    try{

      const messagesReceived = await this.clienteService.getChatMessages();
      this.messages.set(messagesReceived || []);
    }catch (error){
      console.error('Error al cargar los mensajes:', error);
    }
    this.loading.set(false);
  }

    volverHome(){
      this.router.navigate(["/home-cliente"])
    }
}
