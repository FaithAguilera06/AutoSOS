import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { ServiceRequestsPageRoutingModule } from './service-requests-routing.module';
import { ServiceRequestsPage } from './service-requests.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ServiceRequestsPageRoutingModule
  ],
  declarations: [ServiceRequestsPage]
})
export class ServiceRequestsPageModule {} 