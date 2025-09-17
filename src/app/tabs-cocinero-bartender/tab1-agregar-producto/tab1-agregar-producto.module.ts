import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { Tab1AgregarProductoPageRoutingModule } from './tab1-agregar-producto-routing.module';

import { Tab1AgregarProductoPage } from './tab1-agregar-producto.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ReactiveFormsModule,
    Tab1AgregarProductoPageRoutingModule
  ],
  declarations: [Tab1AgregarProductoPage]
})
export class Tab1AgregarProductoPageModule {}
