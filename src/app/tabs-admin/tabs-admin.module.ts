import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// import { RouterModule } from '@angular/router';

import { IonicModule } from '@ionic/angular';

import { TabsAdminPageRoutingModule } from './tabs-admin-routing.module';

import { TabsAdminPage } from './tabs-admin.page';
import { GestionReservasPageRoutingModule } from '../pages/gestion-reservas/gestion-reservas-routing.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TabsAdminPageRoutingModule,
    GestionReservasPageRoutingModule
    // RouterModule.forChild([{path: '', component: TabsAdminPage}])
  ],
  declarations: [TabsAdminPage]
})
export class TabsAdminPageModule {}
