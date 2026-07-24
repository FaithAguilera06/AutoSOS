import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WalletDetailPopupComponent } from './wallet-detail-popup.component';
import { WalletService, WalletTopupRequest } from '../../../wallet.service';

@Component({
  selector: 'app-wallet',
  templateUrl: 'wallet.page.html',
  styleUrls: ['wallet.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, WalletDetailPopupComponent]
})
export class WalletPage implements OnInit {
  constructor(
    private router: Router,
    private toastController: ToastController,
    private walletService: WalletService
  ) {}
  
  // Topup Requests
  topupRequests: WalletTopupRequest[] = [];
  searchTerm = '';
  filteredRequests: WalletTopupRequest[] = [];
  showPopup = false;
  selectedRequest: WalletTopupRequest | null = null;
  isLoading = false;
  

  async ngOnInit() {
    await this.loadTopupRequests();
  }

  async loadTopupRequests() {
    this.isLoading = true;
    try {
      this.topupRequests = await this.walletService.getAllTopupRequests();
      this.filterRequests();
      
      if (this.topupRequests.length === 0) {
        this.showToast('No topup requests found', 'warning');
      }
    } catch (error) {
      console.error('Error loading topup requests:', error);
      this.showToast('Error loading topup requests', 'danger');
    } finally {
      this.isLoading = false;
    }
  }


  onSearchChange(event: any) {
    this.searchTerm = event.detail.value;
    this.filterRequests();
  }

  filterRequests() {
    if (!this.searchTerm) {
      this.filteredRequests = this.topupRequests;
    } else {
      this.filteredRequests = this.topupRequests.filter(request =>
        request.gcash_reference.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        request.id.toString().includes(this.searchTerm.toLowerCase())
      );
    }
  }

  viewRequest(requestId: number) {
    this.selectedRequest = this.topupRequests.find(r => r.id === requestId) || null;
    this.showPopup = true;
  }

  closePopup() {
    this.showPopup = false;
    this.selectedRequest = null;
  }

  async approveRequest(topupId: number) {
    try {
      const success = await this.walletService.approveTopupRequest(topupId);
      if (success) {
        this.showToast('Topup request approved successfully!', 'success');
        await this.loadTopupRequests();
        this.closePopup();
      } else {
        this.showToast('Failed to approve topup request', 'danger');
      }
    } catch (error) {
      console.error('Error approving topup request:', error);
      this.showToast('Error approving topup request', 'danger');
    }
  }

  async rejectRequest(topupId: number, reason: string) {
    try {
      const success = await this.walletService.rejectTopupRequest(topupId, reason);
      if (success) {
        this.showToast('Topup request rejected', 'warning');
        await this.loadTopupRequests();
        this.closePopup();
      } else {
        this.showToast('Failed to reject topup request', 'danger');
      }
    } catch (error) {
      console.error('Error rejecting topup request:', error);
      this.showToast('Error rejecting topup request', 'danger');
    }
  }

  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'warning';
      case 'completed':
        return 'success';
      case 'rejected':
        return 'danger';
      default:
        return 'medium';
    }
  }


  async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'bottom',
      color: color
    });
    await toast.present();
  }

} 