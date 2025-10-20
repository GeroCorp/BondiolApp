import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { Tab3ConsultaAnonimoPageRoutingModule } from './tab3-consulta-anonimo-routing.module';

import { Tab3ConsultaAnonimoPage } from './tab3-consulta-anonimo.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    Tab3ConsultaAnonimoPageRoutingModule
  ],
  declarations: [Tab3ConsultaAnonimoPage]
})
export class Tab3ConsultaAnonimoPageModule {}
