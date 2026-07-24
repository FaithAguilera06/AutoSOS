
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { JobsPage } from './jobs.page';

@NgModule({
  imports: [
    JobsPage,
    RouterModule.forChild([{ path: '', component: JobsPage }])
  ]
})
export class JobsPageModule {}
