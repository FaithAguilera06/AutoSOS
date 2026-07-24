import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminGuard } from '../guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./tabs/tabs.page').then(m => m.TabsPage),
    canActivate: [AdminGuard],
    children: [
      {
        path: 'client',
        loadComponent: () => import('./pages/client/client.page').then(m => m.ClientPage)
      },
      {
        path: 'mechanic',
        loadComponent: () => import('./pages/mechanic/mechanic.page').then(m => m.MechanicPage)
      },
      {
        path: 'wallet',
        loadComponent: () => import('./pages/wallet/wallet.page').then(m => m.WalletPage)
      },
      {
        path: 'account',
        loadComponent: () => import('./pages/account/account.page').then(m => m.AccountPage)
      },
      {
        path: '',
        redirectTo: 'client',
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminTabsRoutingModule {} 