import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { GeneradorQrMesasPageRoutingModule } from './generador-qr-mesas-routing.module';
import { GeneradorQrMesasPage } from './generador-qr-mesas.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    GeneradorQrMesasPageRoutingModule
  ],
  declarations: [GeneradorQrMesasPage]
})
export class GeneradorQrMesasPageModule {}