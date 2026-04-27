import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { Tab1CargaEmpleadoPageRoutingModule } from './tab1-carga-empleado-routing.module';

import { Tab1CargaEmpleadoPage } from './tab1-carga-empleado.page';
import { SecondaryButtonComponent } from 'src/app/components/secondary-button/secondary-button.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    Tab1CargaEmpleadoPageRoutingModule,
    ReactiveFormsModule,
    SecondaryButtonComponent
  ],
  declarations: [Tab1CargaEmpleadoPage]
})
export class Tab1CargaEmpleadoPageModule {}
