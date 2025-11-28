import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { Tab9DeliveryPageRoutingModule } from './tab9-delivery-routing.module';

import { Tab9DeliveryPage } from './tab9-delivery.page';

import { GoogleMapsModule } from '@angular/google-maps';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    Tab9DeliveryPageRoutingModule,
    GoogleMapsModule
  ],
  declarations: [Tab9DeliveryPage]
})
export class Tab9DeliveryPageModule {}
