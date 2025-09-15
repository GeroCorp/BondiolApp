import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { Tab3AdminClientePageRoutingModule } from './tab3-admin-cliente-routing.module';

import { Tab3AdminClientePage } from './tab3-admin-cliente.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    Tab3AdminClientePageRoutingModule
  ],
  declarations: [Tab3AdminClientePage]
})
export class Tab3AdminClientePageModule {}
