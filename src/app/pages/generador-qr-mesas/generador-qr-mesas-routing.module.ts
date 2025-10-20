import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { GeneradorQrMesasPage } from './generador-qr-mesas.page';

const routes: Routes = [
  {
    path: '',
    component: GeneradorQrMesasPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class GeneradorQrMesasPageRoutingModule {}
