import { Component, OnInit, signal, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { CustomLoaderService } from 'src/app/services/custom-loader.service';
import { Delivery } from 'src/app/services/delivery';
import { ClienteService } from 'src/app/services/cliente.service';

type Msg = {
  created_at:string;
  mensaje:string,
  id_cliente?: number,
  id_delivery?: number
}

@Component({
  selector: 'app-chat-delivery',
  templateUrl: './chat-delivery.page.html',
  styleUrls: ['./chat-delivery.page.scss'],
  standalone: false
})
export class ChatDeliveryPage implements OnInit {

  @ViewChild('messagesWrapper') messagesWrapper!: ElementRef;

  messages = signal<Msg[]>([]);
  newMessage: string = '';
  idDelivery: number = 0;
  idpedido: number = 0;
  pedido = signal<any>(null); // Para obtener datos del cliente (id, nombre, apellido)
  private msgSubscription: any = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private customLoader: CustomLoaderService,
    private clienteService: ClienteService,
    private delivery: Delivery
  ) { }

  ngOnInit() {
    this.initMain();
  }
  
  ngOnDestroy() {
    if (this.msgSubscription) {
      this.delivery.unsubscribeFromMessages(this.msgSubscription);
    }
  }

  async initMain(){
    this.idpedido = await this.clienteService.getIdLastPedido();
    await this.getClientData();
    await this.subscribeToMessages(this.idpedido);
    await this.loadMessages();
    console.log('📢 ID de Pedido recibido en Chat Delivery:', this.idpedido);
  }

  async sendMessage(){
    if ( this.newMessage.trim() === '' ) {
      return;
    }
    const tempContent = this.newMessage;
    this.newMessage = '';
    try{
      await this.clienteService.sendMessageToDelivery(tempContent, this.idpedido);

      setTimeout(() => this.scrollToBottom(), 100);

    }catch (e){
      throw new Error('Error al enviar mensaje: ' + e);
      this.newMessage = tempContent;
    }
  }


  async loadMessages(){
    this.customLoader.show('Cargando mensajes...');

    try {
      const messagesReceived = await this.delivery.getMessages(this.idpedido);
      this.messages.set(messagesReceived);
      console.log('Mensajes cargados en Chat Delivery:', this.messages());
      setTimeout(() => {
        this.scrollToBottom();
      }, 100);
    } catch (error) {
      throw new Error('Error al cargar mensajes: ' + error);
    }
    this.customLoader.hide();

  }

  async subscribeToMessages(id: number){
    this.msgSubscription = this.delivery.subscribeToMessages(id, this.updateOnNewMessage.bind(this));
  }



  ///////////////
  // Utilities //

  async updateOnNewMessage(newMsg: Msg){
    this.messages.update(msgs => [...msgs, newMsg]);
  }

  async getClientData(){
    const pedidoData = await this.delivery.getPedidoById(this.idpedido);
    this.pedido.set(pedidoData);
    console.log('Datos del pedido en Chat Delivery:', this.pedido());
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
    this.router.navigate(['/home-cliente']);
  }

}
