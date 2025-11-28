import { Component, OnInit, signal, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { Delivery } from 'src/app/services/delivery';
import { CustomLoaderService } from 'src/app/services/custom-loader.service';

type Msg = {
  created_at:string;
  mensaje:string,
  id_cliente?: number,
  id_delivery?: number
}
@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  standalone: false
})


export class ChatPage implements OnInit, OnDestroy {

  @ViewChild('messagesWrapper') messagesWrapper!: ElementRef;

  pedido = signal<any>(null); // Para obtener datos del cliente (id, nombre, apellido)

  messages = signal<Msg[]>([]);
  newMessage: string = '';
  idDelivery: number = 0;
  idpedido: number = 0;
  private messagesChannel: any = null; // ✅ Almacenar el canal para desuscribirse

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private delivery: Delivery,
    private customLoader: CustomLoaderService
  ) { }

  ngOnInit() {
    this.getDeliveryId();
    this.getNumeroPedido();
    this.loadMessages();
  }

  ngOnDestroy() {
    if (this.messagesChannel) {
      this.delivery.unsubscribeFromMessages(this.messagesChannel);
    }
  }
  
  getNumeroPedido(){
    this.route.paramMap.subscribe(params =>{
      const id_pedido = params.get('id_pedido');
      if (id_pedido && this.idpedido !== parseInt(id_pedido, 10)) {
        this.idpedido = parseInt(id_pedido, 10);
        console.log('📢 ID de Pedido recibido:', this.idpedido);
        this.getClientData();
        this.subscribeToMessages(this.idpedido);
      }
    })
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
      console.error('Error cargando mensajes:', error);
    } finally {
      this.customLoader.hide();
    }
  }

  async sendMessage() {
    if (this.newMessage.trim() === '') {
      return;
    }
    const tempContent = this.newMessage;
    this.newMessage = '';
    try {
      await this.delivery.sendMessage(this.idpedido, tempContent, this.pedido()?.cliente?.id_cliente);

      setTimeout(() => this.scrollToBottom(), 100);

    }catch (e) {
        console.error('❌ Error enviando mensaje:', e);
        this.newMessage = tempContent; // Restaurar mensaje si falla
    }
  }

  async subscribeToMessages(id: number){
    // Desuscribirse del canal anterior si existe
    if (this.messagesChannel) {
      this.delivery.unsubscribeFromMessages(this.messagesChannel);
    }
    // Suscribirse al nuevo pedido
    this.messagesChannel = await this.delivery.subscribeToMessages(id, this.updateOnNewMessage.bind(this));
  }

  
  async getDeliveryId(){
    try {
      const id_delivery = await this.delivery.getDeliveryId();
      this.idDelivery = id_delivery;
    } catch (error) {
      console.error('Error obteniendo ID Delivery:', error);
    }
  }

  ///////////////
  // Utilities //

  async updateOnNewMessage(newMsg: Msg){
    this.messages.update(msgs => [...msgs, newMsg]);
  }

  async getClientData(){
    try {
      const pedidoData = await this.delivery.getPedidoById(this.idpedido);
      this.pedido.set(pedidoData);
    } catch (error) {
      console.error('Error obteniendo datos del pedido:', error);
    }
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
    this.router.navigate(['/tabs-delivery/tab2-menu-chats']);
  }

}
