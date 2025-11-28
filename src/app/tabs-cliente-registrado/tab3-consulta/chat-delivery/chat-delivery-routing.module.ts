import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ChatDeliveryPage } from './chat-delivery.page';

const routes: Routes = [
  {
    path: '',
    component: ChatDeliveryPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ChatDeliveryPageRoutingModule {}
