import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { DiagnosticPageRoutingModule } from './diagnostic-routing.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DiagnosticPageRoutingModule,
    RouterModule
  ],
  declarations: []
})
export class DiagnosticPageModule {} 