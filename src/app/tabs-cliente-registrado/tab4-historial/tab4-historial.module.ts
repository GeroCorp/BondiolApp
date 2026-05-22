import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { Tab4HistorialPageRoutingModule } from './tab4-historial-routing.module';

import { Tab4HistorialPage } from './tab4-historial.page';
import { DetallePedidoModalComponent } from './detalle-pedido-modal/detalle-pedido-modal.component';

import { MainButtonComponent } from 'src/app/components/main-button/main-button.component';
import { SecondaryButtonComponent } from 'src/app/components/secondary-button/secondary-button.component';
@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    Tab4HistorialPageRoutingModule,
    MainButtonComponent,
    SecondaryButtonComponent,
  ],
  declarations: [
    Tab4HistorialPage,
    DetallePedidoModalComponent
  ]
})
export class Tab4HistorialPageModule {}
