import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { QRCodeModule } from 'angularx-qrcode';


import { IonicModule } from '@ionic/angular';

import { Tab2CargaMesasPageRoutingModule } from './tab2-carga-mesas-routing.module';

import { Tab2CargaMesasPage } from './tab2-carga-mesas.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    Tab2CargaMesasPageRoutingModule,
    QRCodeModule],
  declarations: [Tab2CargaMesasPage]
})
export class Tab2CargaMesasPageModule {}
