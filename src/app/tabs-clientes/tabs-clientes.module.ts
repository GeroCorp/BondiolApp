import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TabsClientesPageRoutingModule } from './tabs-clientes-routing.module';

import { TabsClientesPage } from './tabs-clientes.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TabsClientesPageRoutingModule
  ],
  declarations: [TabsClientesPage]
})
export class TabsClientesPageModule {}
