
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AccountPage } from './account.page';

@NgModule({
  imports: [
    AccountPage,
    RouterModule.forChild([{ path: '', component: AccountPage }])
  ]
})
export class AccountPageModule {}
