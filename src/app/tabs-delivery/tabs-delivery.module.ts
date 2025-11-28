import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TabsDeliveryPageRoutingModule } from './tabs-delivery-routing.module';

import { TabsDeliveryPage } from './tabs-delivery.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TabsDeliveryPageRoutingModule
  ],
  declarations: [TabsDeliveryPage]
})
export class TabsDeliveryPageModule {}
