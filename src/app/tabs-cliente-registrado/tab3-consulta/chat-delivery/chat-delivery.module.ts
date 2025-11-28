import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ChatDeliveryPageRoutingModule } from './chat-delivery-routing.module';

import { ChatDeliveryPage } from './chat-delivery.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ChatDeliveryPageRoutingModule
  ],
  declarations: [ChatDeliveryPage]
})
export class ChatDeliveryPageModule {}
