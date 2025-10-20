import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { Tab2PedidoAnonimoPageRoutingModule } from './tab2-pedido-anonimo-routing.module';

import { Tab2PedidoAnonimoPage } from './tab2-pedido-anonimo.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    Tab2PedidoAnonimoPageRoutingModule
  ],
  declarations: [Tab2PedidoAnonimoPage]
})
export class Tab2PedidoAnonimoPageModule {}
