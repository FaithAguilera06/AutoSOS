
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ActivityPage } from './activity.page';

@NgModule({
  imports: [
    ActivityPage,
    RouterModule.forChild([{ path: '', component: ActivityPage }])
  ]
})
export class ActivityPageModule {}
