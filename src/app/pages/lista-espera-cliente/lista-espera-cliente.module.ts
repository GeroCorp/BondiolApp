import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ListaEsperaClientePageRoutingModule } from './lista-espera-cliente-routing.module';

import { ListaEsperaClientePage } from './lista-espera-cliente.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ListaEsperaClientePageRoutingModule
  ],
  declarations: [ListaEsperaClientePage]
})
export class ListaEsperaClientePageModule {}
