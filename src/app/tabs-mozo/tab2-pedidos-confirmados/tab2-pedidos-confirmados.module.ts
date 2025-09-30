import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { Tab2PedidosConfirmadosPageRoutingModule } from './tab2-pedidos-confirmados-routing.module';

import { Tab2PedidosConfirmadosPage } from './tab2-pedidos-confirmados.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    Tab2PedidosConfirmadosPageRoutingModule
  ],
  declarations: [Tab2PedidosConfirmadosPage]
})
export class Tab2PedidosConfirmadosPageModule {}
