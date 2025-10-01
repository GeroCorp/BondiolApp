import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { Tab2PedidoPageRoutingModule } from './tab2-pedido-routing.module';

import { Tab2PedidoPage } from './tab2-pedido.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    Tab2PedidoPageRoutingModule
  ],
  declarations: [Tab2PedidoPage]
})
export class Tab2PedidoPageModule {}
