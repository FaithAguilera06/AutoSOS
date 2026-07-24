import { Component, Input } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-client-detail-modal',
  templateUrl: 'client-detail-modal.component.html',
  styleUrls: ['client-detail-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class ClientDetailModal {
  @Input() client: any;

  constructor(private modalController: ModalController) {}

  dismiss() {
    this.modalController.dismiss();
  }
} 