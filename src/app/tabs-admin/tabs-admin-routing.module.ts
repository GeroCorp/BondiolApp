import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TabsAdminPage } from './tabs-admin.page';

const routes: Routes = [
  {
    path: '',
    component: TabsAdminPage,
    children: [
      {
        path: 'tab1-carga-empleado',
        loadChildren: () => import('./tab1-carga-empleado/tab1-carga-empleado.module').then(m => m.Tab1CargaEmpleadoPageModule)
      },
      {
        path: 'tab2-carga-mesas',
        loadChildren: () => import('./tab2-carga-mesas/tab2-carga-mesas.module').then(m => m.Tab2CargaMesasPageModule)
      },
      {
        path: 'tab3-admin-cliente',
        loadChildren: () => import('./tab3-admin-cliente/tab3-admin-cliente.module').then(m => m.Tab3AdminClientePageModule)
      },
      {
        path: 'tab4-admin-mesa',
        loadChildren: () => import('./tab4-admin-mesa/tab4-admin-mesa.module').then(m => m.Tab4AdminMesaPageModule)
      },
      {
        path: 'tab5-admin-perfil',
        loadChildren: () => import('./tab5-admin-perfil/tab5-admin-perfil.module').then( m => m.Tab5AdminPerfilPageModule)
      },
      {
        path: '',
        redirectTo: 'tab1-carga-empleado',
        pathMatch: 'full',
      }
    ]
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TabsAdminPageRoutingModule {}
