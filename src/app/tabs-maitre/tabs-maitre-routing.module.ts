import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabsMaitreComponent } from './tabs-maitre.component';

const routes: Routes = [
  {
    path: '',
    component: TabsMaitreComponent,
    children: [
      {
        path: 'tab1-espera',
        loadChildren: () =>
          import('./tab1-espera/tab1-espera.module').then(m => m.Tab1EsperaModule)
      },
      {
        path: 'tab2-mesas',
        loadChildren: () =>
          import('./tab2-mesas/tab2-mesas.module').then(m => m.Tab2MesasModule)
      },
      {
        path: '',
        redirectTo: '/tabs-maitre/tab1-espera',
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TabsMaitrePageRoutingModule {}
