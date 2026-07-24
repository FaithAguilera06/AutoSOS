import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { WalletService } from '../../../wallet.service';

@Component({
  selector: 'app-receipt-viewer',
  templateUrl: 'receipt-viewer.component.html',
  styleUrls: ['receipt-viewer.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class ReceiptViewerComponent implements OnInit {
  @Input() receiptUrls: string[] = [];
  @Input() transactionType: string = '';
  @Input() transactionId: number | null = null;
  @Input() isVisible = false;
  @Output() closeViewerEvent = new EventEmitter<void>();

  isLoadingReceipts = false;
  receiptUrlsWithSigned: { [key: string]: string } = {};

  constructor(
    private walletService: WalletService,
    private modalController: ModalController
  ) {}

  ngOnInit() {
    if (this.receiptUrls.length > 0) {
      this.loadReceiptUrls();
    }
  }

  async loadReceiptUrls() {
    if (!this.receiptUrls || this.receiptUrls.length === 0) return;
    
    try {
      this.isLoadingReceipts = true;
      
      // Generate signed URLs for each receipt
      for (let i = 0; i < this.receiptUrls.length; i++) {
        try {
          const receiptUrl = this.receiptUrls[i];
          // For now, we'll use the URL as-is since it should already be a public URL
          // In the future, we might need to generate signed URLs if they're private
          this.receiptUrlsWithSigned[i] = this.getReceiptUrl(receiptUrl);
        } catch (error) {
          console.error('Error processing receipt URL:', i, error);
        }
      }
    } catch (error) {
      console.error('Error loading receipt URLs:', error);
    } finally {
      this.isLoadingReceipts = false;
    }
  }

  getReceiptUrl(receiptUrl: string): string {
    if (!receiptUrl) return 'assets/images/placeholder-document.png';
    
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

  getReceiptTypeLabel(): string {
    switch (this.transactionType) {
      case 'topup': return 'Top-up Receipt';
      case 'payment': return 'Payment Receipt';
      case 'refund': return 'Refund Receipt';
      default: return 'Transaction Receipt';
    }
  }

  async viewReceipt(receiptIndex: number) {
    const receiptUrl = this.receiptUrlsWithSigned[receiptIndex];
    
    if (receiptUrl) {
      // Open receipt image directly in new tab for full-screen viewing
      window.open(receiptUrl, '_blank');
    }
  }

  closeViewer() {
    this.closeViewerEvent.emit();
  }
}
