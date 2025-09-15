import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// import { RouterModule } from '@angular/router';

import { IonicModule } from '@ionic/angular';

import { TabsAdminPageRoutingModule } from './tabs-admin-routing.module';

import { TabsAdminPage } from './tabs-admin.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TabsAdminPageRoutingModule,
    // RouterModule.forChild([{path: '', component: TabsAdminPage}])
  ],
  declarations: [TabsAdminPage]
})
export class TabsAdminPageModule {}
