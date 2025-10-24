import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { Tab4ResultadosAnonimoPageRoutingModule } from './tab4-resultados-anonimo-routing.module';

import { Tab4ResultadosAnonimoPage } from './tab4-resultados-anonimo.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    Tab4ResultadosAnonimoPageRoutingModule
  ],
  declarations: [Tab4ResultadosAnonimoPage]
})
export class Tab4ResultadosAnonimoPageModule {}
