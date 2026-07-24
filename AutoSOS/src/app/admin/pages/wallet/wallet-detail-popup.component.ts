import { Component, Input, Output, EventEmitter } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-wallet-detail-popup',
  templateUrl: 'wallet-detail-popup.component.html',
  styleUrls: ['wallet-detail-popup.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class WalletDetailPopupComponent {
  @Input() request: any;
  @Input() isVisible = false;
  @Output() closePopupEvent = new EventEmitter<void>();
  imageLoaded: boolean[] = [];
  documentUrls: { [key: string]: string } = {};

  closePopup() {
    this.closePopupEvent.emit();
  }

  viewImageFullscreen(imageUrl: string, imageName: string = 'Receipt Image') {
    console.log('Opening image in new tab with URL:', imageUrl);
    // Open image directly in new tab for full-screen viewing
    window.open(imageUrl, '_blank');
  }


  /**
   * Get document URL with fallback to placeholder
   */
  getDocumentUrl(docId: number): string {
    // First check if we have a cached URL
    if (this.documentUrls[docId]) {
      console.log('Using cached URL for docId:', docId, this.documentUrls[docId]);
      return this.documentUrls[docId];
    }
    
    // Get the receipt images and use the index to get the URL
    const receiptImages = this.getReceiptImages();
    console.log('Receipt images:', receiptImages, 'docId:', docId);
    
    if (receiptImages && receiptImages[docId]) {
      const imageUrl = receiptImages[docId];
      const processedUrl = this.getImageUrl(imageUrl);
      console.log('Processing URL:', imageUrl, '->', processedUrl);
      
      // Cache the processed URL
      this.documentUrls[docId] = processedUrl;
      return this.documentUrls[docId];
    }
    
    console.warn('No image found for docId:', docId, 'using placeholder');
    // Fallback to placeholder
    return 'assets/images/placeholder-document.png';
  }


  /**
   * Get receipt images array, handling different data formats
   */
  getReceiptImages(): string[] {
    if (!this.request?.receipt_images) {
      return [];
    }

    // Handle different data formats
    if (Array.isArray(this.request.receipt_images)) {
      return this.request.receipt_images.filter((img: any) => img && img.trim() !== '');
    }

    // Handle string format (comma-separated)
    if (typeof this.request.receipt_images === 'string') {
      return this.request.receipt_images
        .split(',')
        .map((img: any) => img.trim())
        .filter((img: any) => img !== '');
    }

    return [];
  }

  /**
   * Get properly formatted image URL
   */
  getImageUrl(imageUrl: string): string {
    if (!imageUrl) return '';
    
    // If it's already a full URL, return as is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    
    // If it's a Supabase storage URL, ensure it's properly formatted
    if (imageUrl.includes('supabase')) {
      return imageUrl;
    }
    
    // For relative paths, assume it's a Supabase storage path
    return `https://atdibhoeaeqfgjswcqwx.supabase.co/storage/v1/object/public/autosos/${imageUrl}`;
  }

  /**
   * Handle image load events
   */
  onImageLoad(index: number) {
    this.imageLoaded[index] = true;
  }

  /**
   * Handle image error events
   */
  onImageError(event: any) {
    console.error('Image failed to load:', event.target.src);
    // You could set a fallback image here
  }

} 