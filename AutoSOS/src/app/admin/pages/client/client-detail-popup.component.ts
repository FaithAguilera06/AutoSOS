import { Component, Input, Output, EventEmitter } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-client-detail-popup',
  templateUrl: 'client-detail-popup.component.html',
  styleUrls: ['client-detail-popup.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class ClientDetailPopupComponent {
  @Input() client: any;
  @Input() isVisible = false;
  @Output() closePopupEvent = new EventEmitter<void>();

  closePopup() {
    this.closePopupEvent.emit();
  }

  /**
   * Get the username as email (since username is used as email in the system)
   */
  getEmail(): string {
    if (this.client?.username) {
      return this.client.username;
    }
    if (this.client?.email) {
      return this.client.email;
    }
    return 'Not provided';
  }
} 