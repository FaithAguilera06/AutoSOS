import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MechanicFinderPage } from './mechanic-finder.page';

const routes: Routes = [
  {
    path: '',
    component: MechanicFinderPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MechanicFinderPageRoutingModule {} 