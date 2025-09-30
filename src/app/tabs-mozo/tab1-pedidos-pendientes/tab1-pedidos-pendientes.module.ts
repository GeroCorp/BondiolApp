import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { Tab1PedidosPendientesPageRoutingModule } from './tab1-pedidos-pendientes-routing.module';

import { Tab1PedidosPendientesPage } from './tab1-pedidos-pendientes.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    Tab1PedidosPendientesPageRoutingModule
  ],
  declarations: [Tab1PedidosPendientesPage]
})
export class Tab1PedidosPendientesPageModule {}
