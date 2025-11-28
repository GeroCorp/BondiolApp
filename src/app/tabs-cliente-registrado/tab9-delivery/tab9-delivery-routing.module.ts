import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Tab9DeliveryPage } from './tab9-delivery.page';

const routes: Routes = [
  {
    path: '',
    component: Tab9DeliveryPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class Tab9DeliveryPageRoutingModule {}
