import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WalletService } from '../../wallet.service';

export interface Booking {
  id: number;
  client_id: string;
  status: string;
  required_specialization: string;
  notes?: string;
  created_at: string;
}

@Component({
  selector: 'app-facial-payment-modal',
  templateUrl: './facial-payment-modal.component.html',
  styleUrls: ['./facial-payment-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class FacialPaymentModalComponent {
  @Input() booking: Booking | null = null;
  @Input() isOpen = false;
  @Output() closeModal = new EventEmitter<void>();
  @Output() paymentProcessed = new EventEmitter<void>();

  @ViewChild('videoElement') videoElement!: ElementRef;
  @ViewChild('canvasElement') canvasElement!: ElementRef;

  paymentAmount: number = 0;
  isProcessing = false;
  isCapturing = false;
  capturedPhoto: string | null = null;
  cameraStream: MediaStream | null = null;

  constructor(
    private modalController: ModalController,
    private toastController: ToastController,
    private walletService: WalletService
  ) {}

  async ngOnInit() {
    if (this.booking) {
      // Set default payment amount based on service type
      this.paymentAmount = this.getDefaultAmount(this.booking.required_specialization);
    }
  }

  private getDefaultAmount(specialization: string): number {
    // Default amounts based on service type
    const amounts: { [key: string]: number } = {
      'engine_repair': 1500,
      'brake_service': 800,
      'oil_change': 300,
      'tire_service': 500,
      'electrical': 1000,
      'general': 600
    };
    return amounts[specialization] || 500;
  }

  async startCamera() {
    try {
      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user', // Front camera for facial recognition
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });

      if (this.videoElement) {
        this.videoElement.nativeElement.srcObject = this.cameraStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      this.showToast('Camera access denied', 'danger');
    }
  }

  async capturePhoto() {
    if (!this.cameraStream || !this.videoElement || !this.canvasElement) {
      this.showToast('Camera not ready', 'warning');
      return;
    }

    try {
      this.isCapturing = true;
      
      const video = this.videoElement.nativeElement;
      const canvas = this.canvasElement.nativeElement;
      const ctx = canvas.getContext('2d');

      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to base64
      this.capturedPhoto = canvas.toDataURL('image/jpeg', 0.8);
      
      this.showToast('Photo captured successfully!', 'success');
    } catch (error) {
      console.error('Error capturing photo:', error);
      this.showToast('Error capturing photo', 'danger');
    } finally {
      this.isCapturing = false;
    }
  }

  async processPayment() {
    if (!this.booking || !this.capturedPhoto || this.paymentAmount <= 0) {
      this.showToast('Please fill in all required fields', 'warning');
      return;
    }

    this.isProcessing = true;
    try {
      // Upload verification photo
      const photoFile = this.walletService.base64ToFile(this.capturedPhoto, 'facial_verification.jpg');
      const photoUrl = await this.walletService.uploadVerificationPhoto(photoFile);

      // Process facial payment
      const success = await this.walletService.processFacialPayment(
        this.booking.id,
        this.paymentAmount,
        photoUrl
      );

      if (success) {
        this.showToast('Payment processed successfully!', 'success');
        this.paymentProcessed.emit();
        this.closeModal.emit();
      } else {
        this.showToast('Failed to process payment', 'danger');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      this.showToast('Error processing payment', 'danger');
    } finally {
      this.isProcessing = false;
    }
  }

  retakePhoto() {
    this.capturedPhoto = null;
  }

  close() {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
    }
    this.closeModal.emit();
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

  ngOnDestroy() {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
    }
  }
}
