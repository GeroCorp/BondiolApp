import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { QRCodeComponent  } from 'angularx-qrcode';


import { IonicModule } from '@ionic/angular';

import { Tab2CargaMesasPageRoutingModule } from './tab2-carga-mesas-routing.module';

import { Tab2CargaMesasPage } from './tab2-carga-mesas.page';
import { SecondaryButtonComponent } from 'src/app/components/secondary-button/secondary-button.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    Tab2CargaMesasPageRoutingModule,
    QRCodeComponent,
    SecondaryButtonComponent
     ],
  declarations: [Tab2CargaMesasPage]
})
export class Tab2CargaMesasPageModule {}
