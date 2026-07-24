import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ServiceRequestsPage } from './service-requests.page';

const routes: Routes = [
  {
    path: '',
    component: ServiceRequestsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ServiceRequestsPageRoutingModule {} 