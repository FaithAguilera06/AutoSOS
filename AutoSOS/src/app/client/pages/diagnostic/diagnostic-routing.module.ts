import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DiagnosticPage } from './diagnostic.page';

const routes: Routes = [
  {
    path: '',
    component: DiagnosticPage
  },
  {
    path: 'chatbot',
    loadComponent: () => import('./chatbot/chatbot.page').then(m => m.ChatbotPage)
  },
  {
    path: 'camera',
    loadComponent: () => import('./camera/camera.page').then(m => m.CameraPage)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DiagnosticPageRoutingModule {} 