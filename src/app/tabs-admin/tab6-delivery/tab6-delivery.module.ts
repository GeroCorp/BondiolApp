import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { Tab6DeliveryPageRoutingModule } from './tab6-delivery-routing.module';

import { Tab6DeliveryPage } from './tab6-delivery.page';
import { DetallePedidoDeliveryModalComponent } from './detalle-pedido-delivery-modal/detalle-pedido-delivery-modal.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    Tab6DeliveryPageRoutingModule
  ],
  declarations: [Tab6DeliveryPage, DetallePedidoDeliveryModalComponent]
})
export class Tab6DeliveryPageModule {}
