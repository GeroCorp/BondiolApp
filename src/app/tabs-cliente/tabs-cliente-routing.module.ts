import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabsClienteComponent } from './tabs-cliente.component';

const routes: Routes = [
  {
    path: '',
    component: TabsClienteComponent,
    children: [
      {
        path: 'tab1-anonimo',
        loadChildren: () =>
          import('./tab1-anonimo/tab1-anonimo.module').then(m => m.Tab1AnonimoModule),
      },
      {
        path: 'tab2-encuestas',
        loadChildren: () =>
          import('./tab2-encuestas/tab2-encuestas.module').then(m => m.Tab2EncuestasModule),
      },
      {
        path: 'tab3-mesa',
        loadChildren: () =>
          import('./tab3-mesa/tab3-mesa.module').then(m => m.Tab3MesaModule),
      },
      {
        path: '',
        redirectTo: '/tabs-cliente/tab1-anonimo',
        pathMatch: 'full',
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TabsClientePageRoutingModule {}
