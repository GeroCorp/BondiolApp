import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TabsMaitrePage } from './tabs-maitre.page';

const routes: Routes = [
  {
    path: '',
    component: TabsMaitrePage,
    children: [
      {
        path: 'tab1-espera',
        loadChildren: () => import('./tab1-espera/tab1-espera.module').then( m => m.Tab1EsperaPageModule)
      },
      {
        path: 'tab2-mesas',
        loadChildren: () => import('./tab2-mesas/tab2-mesas.module').then( m => m.Tab2MesasPageModule)
      },
      {
        path: 'tab3-clientes',
        loadChildren: () => import('./tab3-clientes/tab3-clientes.module').then( m => m.Tab3ClientesPageModule)
      },
      {
        path: 'tab4-perfil',
        loadChildren: () => import('./tab4-perfil/tab4-perfil.module').then( m => m.Tab4PerfilPageModule)
      },
      {
        path: '',
        redirectTo: 'tab1-espera',
        pathMatch: 'full',
      }
    ]
  },
  



];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TabsMaitrePageRoutingModule {}
