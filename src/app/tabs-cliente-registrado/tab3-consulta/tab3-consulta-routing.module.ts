import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Tab3ConsultaPage } from './tab3-consulta.page';

const routes: Routes = [
  {
    path: '',
    component: Tab3ConsultaPage
  },  {
    path: 'chat-delivery',
    loadChildren: () => import('./chat-delivery/chat-delivery.module').then( m => m.ChatDeliveryPageModule)
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class Tab3ConsultaPageRoutingModule {}
