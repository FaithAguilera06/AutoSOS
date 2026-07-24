import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MechanicGuard } from '../guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./tabs/tabs.page').then(m => m.TabsPage),
    canActivate: [MechanicGuard],
    children: [
      {
        path: 'home',
        loadComponent: () => import('./pages/home/home.page').then(m => m.HomePage)
      },
      {
        path: 'jobs',
        loadComponent: () => import('./pages/jobs/jobs.page').then(m => m.JobsPage)
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
        path: 'service-requests',
        loadComponent: () => import('./pages/service-requests/service-requests.page').then(m => m.ServiceRequestsPage)
      },
      {
        path: 'real-time-navigation',
        loadComponent: () => import('./pages/real-time-navigation/real-time-navigation.page').then(m => m.RealTimeNavigationPage)
      },
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MechanicTabsRoutingModule {} 