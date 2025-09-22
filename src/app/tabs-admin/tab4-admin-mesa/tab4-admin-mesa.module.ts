import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { Tab3AdminClientePageRoutingModule } from './tab4-admin-mesa-routing.module';

import { Tab4AdminMesaPage } from './tab4-admin-mesa.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    Tab3AdminClientePageRoutingModule
  ],
  declarations: [Tab4AdminMesaPage]
})
export class Tab4AdminMesaPageModule {}
