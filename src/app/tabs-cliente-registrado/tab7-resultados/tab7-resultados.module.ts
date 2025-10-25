import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { Tab7ResultadosPageRoutingModule } from './tab7-resultados-routing.module';

import { Tab7ResultadosPage } from './tab7-resultados.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    Tab7ResultadosPageRoutingModule
  ],
  declarations: [Tab7ResultadosPage]
})
export class Tab7ResultadosPageModule {}
