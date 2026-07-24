import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ClientGuard } from '../guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./tabs/tabs.page').then(m => m.TabsPage),
    canActivate: [ClientGuard],
    children: [
      {
        path: 'home',
        loadComponent: () => import('./pages/home/home.page').then(m => m.HomePage)
      },
      {
        path: 'activity',
        loadComponent: () => import('./pages/activity/activity.page').then(m => m.ActivityPage)
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
        path: 'diagnostic',
        loadChildren: () => import('./pages/diagnostic/diagnostic.module').then(m => m.DiagnosticPageModule)
      },
      {
        path: 'mechanic-finder',
        loadComponent: () => import('./pages/mechanic-finder/mechanic-finder.page').then(m => m.MechanicFinderPage)
      },
      {
        path: 'fullscreen-map',
        loadComponent: () => import('./pages/fullscreen-map/fullscreen-map.page').then(m => m.ClientFullscreenMapPage)
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
export class ClientTabsRoutingModule {}
