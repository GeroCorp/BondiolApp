import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MainButtonComponent } from '../../components/main-button/main-button.component';
import { SecondaryButtonComponent } from '../../components/secondary-button/secondary-button.component';

import { ListaEsperaClientePageRoutingModule } from './lista-espera-cliente-routing.module';

import { ListaEsperaClientePage } from './lista-espera-cliente.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ListaEsperaClientePageRoutingModule,
    MainButtonComponent,
    SecondaryButtonComponent
  ],
  declarations: [ListaEsperaClientePage]
})
export class ListaEsperaClientePageModule {}
