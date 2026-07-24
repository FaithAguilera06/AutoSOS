import { Component, OnInit } from '@angular/core';
import { IonicModule, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { WalletService, WalletTransaction } from '../../../wallet.service';

@Component({
  selector: 'app-wallet',
  templateUrl: 'wallet.page.html',
  styleUrls: ['wallet.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class WalletPage implements OnInit {
  walletBalance: number = 0;
  transactions: WalletTransaction[] = [];
  isLoading = false;
  

  constructor(
    private toastController: ToastController,
    private walletService: WalletService
  ) { }

  async ngOnInit() {
    await this.loadWalletData();
  }

  async loadWalletData() {
    this.isLoading = true;
    try {
      // Load wallet balance
      this.walletBalance = await this.walletService.loadWalletBalance();
      
      // Load transaction history
      this.transactions = await this.walletService.getTransactionHistory(10);
    } catch (error) {
      console.error('Error loading wallet data:', error);
      this.showToast('Error loading wallet data', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  // Helper methods for transaction display
  getTransactionIcon(type: string): string {
    switch (type) {
      case 'topup': return 'add-circle';
      case 'payment': return 'card';
      case 'refund': return 'refresh-circle';
      case 'withdrawal': return 'remove-circle';
      default: return 'help-circle';
    }
  }

  getTransactionColor(type: string): string {
    switch (type) {
      case 'topup': return 'success';
      case 'payment': return 'success'; // For mechanics, payments are income
      case 'refund': return 'warning';
      case 'withdrawal': return 'medium';
      default: return 'medium';
    }
  }

  getTransactionTitle(type: string): string {
    switch (type) {
      case 'topup': return 'Top Up';
      case 'payment': return 'Payment Received';
      case 'refund': return 'Refund';
      case 'withdrawal': return 'Withdrawal';
      default: return 'Transaction';
    }
  }

  getTransactionAmount(type: string, amount: number): string {
    const prefix = (type === 'payment') ? '+' : (type === 'topup' || type === 'refund') ? '+' : '-';
    return `${prefix}₱${amount.toFixed(2)}`;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

  // Receipt viewing methods
  async viewReceipts(transaction: WalletTransaction) {
    if (!transaction.receipt_images || transaction.receipt_images.length === 0) {
      this.showToast('No receipts available for this transaction', 'warning');
      return;
    }

    // Always open the first receipt directly in a new tab
    const receiptUrl = this.getReceiptUrl(transaction.receipt_images[0]);
    window.open(receiptUrl, '_blank');
  }

  hasReceipts(transaction: WalletTransaction): boolean {
    return !!(transaction.receipt_images && transaction.receipt_images.length > 0);
  }

  getReceiptUrl(receiptUrl: string): string {
    if (!receiptUrl) return '';
    
    // If it's already a full URL, return as is
    if (receiptUrl.startsWith('http://') || receiptUrl.startsWith('https://')) {
      return receiptUrl;
    }
    
    // If it's a Supabase storage URL, ensure it's properly formatted
    if (receiptUrl.includes('supabase')) {
      return receiptUrl;
    }
    
    // For relative paths, assume it's a Supabase storage path
    return `https://atdibhoeaeqfgjswcqwx.supabase.co/storage/v1/object/public/autosos/${receiptUrl}`;
  }
}