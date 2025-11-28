import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { EstadoPedidosPageRoutingModule } from './estado-pedidos-routing.module';

import { EstadoPedidosPage } from './estado-pedidos.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    EstadoPedidosPageRoutingModule
  ],
  declarations: [EstadoPedidosPage]
})
export class EstadoPedidosPageModule {}
