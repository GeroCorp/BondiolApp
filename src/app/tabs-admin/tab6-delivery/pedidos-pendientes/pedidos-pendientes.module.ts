import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PedidosPendientesPageRoutingModule } from './pedidos-pendientes-routing.module';

import { PedidosPendientesPage } from './pedidos-pendientes.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PedidosPendientesPageRoutingModule
  ],
  declarations: [PedidosPendientesPage]
})
export class PedidosPendientesPageModule {}
