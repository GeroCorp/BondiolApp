import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Tab3ConsultasPage } from './tab3-consultas.page';

const routes: Routes = [
  {
    path: '',
    component: Tab3ConsultasPage
  },
  {
    path: 'chat/:id_mesa',
    loadChildren: () => import('./chat/chat.module').then( m => m.ChatPageModule)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class Tab3ConsultasPageRoutingModule {}
