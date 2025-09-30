import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TabsClienteRegistradoPage } from './tabs-cliente-registrado.page';

const routes: Routes = [
  {
    path: '',
    component: TabsClienteRegistradoPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TabsClienteRegistradoPageRoutingModule {}
