import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { MechanicFinderPageRoutingModule } from './mechanic-finder-routing.module';
import { MechanicFinderPage } from './mechanic-finder.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MechanicFinderPageRoutingModule
  ],
  declarations: [MechanicFinderPage]
})
export class MechanicFinderPageModule {} 