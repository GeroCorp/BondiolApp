import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { Tab2RecibirPedidoPageRoutingModule } from './tab2-recibir-pedido-routing.module';

import { Tab2RecibirPedidoPage } from './tab2-recibir-pedido.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    Tab2RecibirPedidoPageRoutingModule
  ],
  declarations: [Tab2RecibirPedidoPage]
})
export class Tab2RecibirPedidoPageModule {}
