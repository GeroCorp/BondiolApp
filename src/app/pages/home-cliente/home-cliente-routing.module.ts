import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { HomeClientePage } from './home-cliente.page';

const routes: Routes = [
  {
    path: '',
    component: HomeClientePage
  },  {
    path: 'maps',
    loadChildren: () => import('./maps/maps.module').then( m => m.MapsPageModule)
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class HomeClientePageRoutingModule {}
