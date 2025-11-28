import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { Tab1PedidosPageRoutingModule } from './tab1-pedidos-routing.module';

import { Tab1PedidosPage } from './tab1-pedidos.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    Tab1PedidosPageRoutingModule
  ],
  declarations: [Tab1PedidosPage]
})
export class Tab1PedidosPageModule {}
