import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then(m => m.LoginPage)
  },
  {
    path: 'role-selection',
    loadComponent: () => import('./role-selection/role-selection.page').then(m => m.RoleSelectionPage)
  },
  {
    path: 'mechanic-registration',
    loadComponent: () => import('./mechanic-registration/mechanic-registration.page').then(m => m.MechanicRegistrationPage)
  },
  {
    path: 'client-registration',
    loadComponent: () => import('./client-registration/client-registration.page').then(m => m.ClientRegistrationPage)
  },
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin-tabs-routing.module').then(m => m.AdminTabsRoutingModule)
  },
  {
    path: 'client',
    loadChildren: () => import('./client/client-tabs-routing.module').then(m => m.ClientTabsRoutingModule)
  },
  {
    path: 'mechanic',
    loadChildren: () => import('./mechanic/mechanic-tabs-routing.module').then(m => m.MechanicTabsRoutingModule)
  },
  {
    path: 'mechanic/pending',
    loadComponent: () => import('./mechanic/pages/pending/pending.page').then(m => m.PendingPage)
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
