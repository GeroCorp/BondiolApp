import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { Tab3ClientesPageRoutingModule } from './tab3-clientes-routing.module';
import { Tab3ClientesPage } from './tab3-clientes.page';
import { SecondaryButtonComponent } from 'src/app/components/secondary-button/secondary-button.component';
import { MainButtonComponent } from 'src/app/components/main-button/main-button.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,   
    IonicModule,
    Tab3ClientesPageRoutingModule,
    SecondaryButtonComponent,
    MainButtonComponent
  ],
  declarations: [Tab3ClientesPage]
})
export class Tab3ClientesPageModule {}