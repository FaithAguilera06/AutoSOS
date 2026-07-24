
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { WalletPage } from './wallet.page';

@NgModule({
  imports: [
    WalletPage,
    RouterModule.forChild([{ path: '', component: WalletPage }])
  ]
})
export class WalletPageModule {}
