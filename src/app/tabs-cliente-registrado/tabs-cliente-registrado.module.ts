import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TabsClienteRegistradoPageRoutingModule } from './tabs-cliente-registrado-routing.module';

import { TabsClienteRegistradoPage } from './tabs-cliente-registrado.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TabsClienteRegistradoPageRoutingModule,
    TabsClienteRegistradoPage
  ]
})
export class TabsClienteRegistradoPageModule {}
