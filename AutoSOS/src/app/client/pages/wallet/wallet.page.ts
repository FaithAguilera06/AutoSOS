import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import { IonicModule, ModalController, ToastController, AlertController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { WalletService, WalletTransaction, AdminGcashSettings } from '../../../wallet.service';
import { SupabaseService } from '../../../supabase.service';

@Component({
  selector: 'app-wallet',
  templateUrl: 'wallet.page.html',
  styleUrls: ['wallet.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, HttpClientModule]
})
export class WalletPage implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef;
  
  isModalOpen = false;
  topUpAmount: number | null = null;
  selectedFiles: File[] = [];
  gcashReference: string = '';
  
  walletBalance: number = 0;
  transactions: WalletTransaction[] = [];
  adminGcashSettings: AdminGcashSettings | null = null;
  isLoading = false;
  
  // Facial recognition properties
  isFaceRegistered = false;
  isRegisteringFace = false;
  faceRegistrationPhoto: string | null = null;
  facialRecognitionApiUrl = 'https://autosos-ai-services-1.onrender.com'; // Direct FaceNet Service
  faceRegistrationError = false;
  
  // Image preview properties
  isImageModalOpen = false;
  selectedImageUrl: string | null = null;
  selectedImageName: string = '';
  

  constructor(
    private modalController: ModalController,
    private toastController: ToastController,
    private alertController: AlertController,
    private walletService: WalletService,
    private http: HttpClient,
    private supabaseService: SupabaseService
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
      
      // Load admin GCash settings
      this.adminGcashSettings = await this.walletService.getAdminGcashSettings();
      
      // Check facial recognition status
      await this.checkFacialRecognitionStatus();
    } catch (error) {
      console.error('Error loading wallet data:', error);
      this.showToast('Error loading wallet data', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  presentTopUpModal() {
    this.isModalOpen = true;
  }

  dismissModal() {
    this.isModalOpen = false;
    this.resetForm();
  }

  resetForm() {
    this.topUpAmount = null;
    this.selectedFiles = [];
    this.gcashReference = '';
  }

  /**
   * Check if file is an image
   */
  isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
  }

  /**
   * Get file preview URL
   */
  getFilePreview(file: File): string {
    return URL.createObjectURL(file);
  }

  /**
   * View image in fullscreen modal
   */
  viewImageFullscreen(imageUrl: string, imageName: string) {
    this.selectedImageUrl = imageUrl;
    this.selectedImageName = imageName;
    this.isImageModalOpen = true;
  }

  /**
   * Close image modal
   */
  closeImageModal() {
    this.isImageModalOpen = false;
    this.selectedImageUrl = null;
    this.selectedImageName = '';
  }

  selectFiles() {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: any) {
    const files = event.target.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Check if file is an image
        if (!file.type.startsWith('image/')) {
          this.showToast('Only image files are allowed', 'warning');
          continue;
        }
        
        // Check file size (max 5MB per file)
        if (file.size > 5 * 1024 * 1024) {
          this.showToast('File size must be less than 5MB', 'warning');
          continue;
        }
        
        if (this.selectedFiles.length < 3) {
          this.selectedFiles.push(file);
          this.showToast(`Added: ${file.name}`, 'success');
        } else {
          this.showToast('Maximum 3 files allowed', 'warning');
          break;
        }
      }
    }
  }

  removeFile(index: number) {
    this.selectedFiles.splice(index, 1);
  }


  async submitTopUp() {
    if (!this.topUpAmount || this.selectedFiles.length === 0 || !this.gcashReference) {
      this.showToast('Please fill in all required fields', 'warning');
      return;
    }

    this.isLoading = true;
    try {
      console.log('Starting topup submission...');
      
      // Upload receipt images with timeout
      console.log('Uploading receipt images...');
      const receiptUrls = await Promise.race([
        this.walletService.uploadReceiptImages(this.selectedFiles),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Upload timeout after 30 seconds')), 30000)
        )
      ]);
      
      console.log('Receipt images uploaded:', receiptUrls);
      
      // Submit topup request (without verification photo)
      console.log('Submitting topup request...');
      const success = await Promise.race([
        this.walletService.submitTopupRequest(
          this.topUpAmount!,
          this.gcashReference,
          receiptUrls,
          null // No verification photo
        ),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Submission timeout after 15 seconds')), 15000)
        )
      ]);

      if (success) {
        this.showToast('Top-up request submitted successfully!', 'success');
        this.dismissModal();
        await this.loadWalletData(); // Reload data
      } else {
        this.showToast('Failed to submit top-up request', 'danger');
      }
    } catch (error) {
      console.error('Error submitting topup:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('timeout')) {
        this.showToast('Request timed out. Please check your connection and try again.', 'danger');
      } else if (errorMessage.includes('not authenticated')) {
        this.showToast('Please log in again to continue.', 'danger');
      } else {
        this.showToast(`Error submitting top-up request: ${errorMessage}`, 'danger');
      }
    } finally {
      this.isLoading = false;
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

  sendMoney() {
    // Add send money logic
    console.log('Send money clicked');
  }

  receivePayment() {
    // Add receive payment logic
    console.log('Receive payment clicked');
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
      case 'payment': return 'danger';
      case 'refund': return 'warning';
      case 'withdrawal': return 'medium';
      default: return 'medium';
    }
  }

  getTransactionTitle(type: string): string {
    switch (type) {
      case 'topup': return 'Top Up';
      case 'payment': return 'Payment';
      case 'refund': return 'Refund';
      case 'withdrawal': return 'Withdrawal';
      default: return 'Transaction';
    }
  }

  getTransactionAmount(type: string, amount: number): string {
    const prefix = (type === 'topup' || type === 'refund') ? '+' : '-';
    return `${prefix}₱${amount.toFixed(2)}`;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Facial Recognition Methods
  async checkFacialRecognitionStatus() {
    try {
      // Get current user ID
      const currentUserId = await this.getCurrentUserId();
      
      // Check face registration status from FaceNet service
      const response = await this.http.get(`${this.facialRecognitionApiUrl}/check-face-registration/${currentUserId}`).toPromise() as any;
      
      if (response && response.success) {
        this.isFaceRegistered = response.has_registered_face || false;
        console.log('Face registration status for user', currentUserId, ':', this.isFaceRegistered);
      } else {
        this.isFaceRegistered = false;
        console.log('Failed to check face registration status');
      }
    } catch (error) {
      console.error('Error checking facial recognition status:', error);
      // If service is not available, assume not registered
      this.isFaceRegistered = false;
    }
  }

  async checkIfFaceAlreadyRegistered(userId: string): Promise<boolean> {
    try {
      // Check face registration status from FaceNet service
      const response = await this.http.get(`${this.facialRecognitionApiUrl}/check-face-registration/${userId}`).toPromise() as any;
      
      if (response && response.success) {
        const isRegistered = response.has_registered_face || false;
        console.log('Checking if face already registered for user', userId, ':', isRegistered);
        return isRegistered;
      } else {
        console.log('Failed to check if face already registered, assuming not registered');
        return false;
      }
    } catch (error) {
      console.error('Error checking if face already registered:', error);
      // If service is not available, assume not registered
      return false;
    }
  }

  async getCurrentUserId(): Promise<string> {
    try {
      // Get user ID from Supabase session
      const { data: sessionData } = await this.supabaseService.getSession();
      const userId = sessionData.session?.user.id;
      
      if (userId) {
        return userId;
      } else {
        // Fallback to a consistent ID based on localStorage
        let clientId = localStorage.getItem('client_id');
        if (!clientId) {
          clientId = 'client_' + Date.now();
          localStorage.setItem('client_id', clientId);
        }
        return clientId;
      }
    } catch (error) {
      console.error('Error getting current user ID:', error);
      // Fallback to localStorage
      let clientId = localStorage.getItem('client_id');
      if (!clientId) {
        clientId = 'client_' + Date.now();
        localStorage.setItem('client_id', clientId);
      }
      return clientId;
    }
  }

  async handleFacialRecognitionClick() {
    if (this.isFaceRegistered) {
      // User is already registered, show message
      this.showToast('You are already registered for facial recognition! Click "Remove" if you want to register a new face.', 'success');
    } else if (this.faceRegistrationError) {
      // Retry face registration
      await this.retryFaceRegistration();
    } else {
      // Start face registration process
      await this.startFaceRegistration();
    }
  }

  /**
   * Retry face registration after error
   */
  async retryFaceRegistration() {
    this.faceRegistrationError = false;
    this.faceRegistrationPhoto = null;
    await this.startFaceRegistration();
  }

  async startFaceRegistration() {
    this.isRegisteringFace = true;
    try {
      // First, check if user already has a registered face
      const currentUserId = await this.getCurrentUserId();
      const isAlreadyRegistered = await this.checkIfFaceAlreadyRegistered(currentUserId);
      
      if (isAlreadyRegistered) {
        // Show confirmation dialog
        const confirmed = await this.showConfirmDialog(
          'Face Already Registered',
          'You already have a registered face. Do you want to replace it with a new one?',
          'Replace Face',
          'Cancel'
        );
        
        if (!confirmed) {
          this.showToast('Face registration cancelled', 'warning');
          return;
        }
        
        // Remove existing face first
        await this.removeFaceRegistration();
      }
      
      // Capture face photo
      const facePhoto = await this.captureFacePhoto();
      if (facePhoto) {
        this.faceRegistrationPhoto = facePhoto;
        await this.registerFace();
      }
    } catch (error) {
      console.error('Error starting face registration:', error);
      this.showToast('Error starting face registration', 'danger');
    } finally {
      this.isRegisteringFace = false;
    }
  }

  async captureFacePhoto(): Promise<string | null> {
    return new Promise(async (resolve) => {
      try {
        // Request camera access
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user', // Front camera
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        });

        // Create simple camera interface
        this.createSimpleCameraInterface(stream, resolve);

      } catch (error) {
        console.error('Camera access error:', error);
        this.showToast('Camera access denied. Please allow camera permission.', 'danger');
        resolve(null);
      }
    });
  }

  /**
   * Create simple camera interface for face registration
   */
  private createSimpleCameraInterface(stream: MediaStream, resolve: (value: string | null) => void): void {
    // Create video element
    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    video.style.position = 'fixed';
    video.style.top = '0';
    video.style.left = '0';
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.zIndex = '9999';
    video.style.backgroundColor = 'black';
    video.style.objectFit = 'cover';
    
    // Create overlay with face guide
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.zIndex = '10000';
    overlay.style.pointerEvents = 'none';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    
    // Face guide circle
    const faceGuide = document.createElement('div');
    faceGuide.style.width = '250px';
    faceGuide.style.height = '300px';
    faceGuide.style.border = '3px solid #00ff00';
    faceGuide.style.borderRadius = '50%';
    faceGuide.style.position = 'relative';
    faceGuide.style.marginBottom = '20px';
    
    // Inner guide circle
    const innerGuide = document.createElement('div');
    innerGuide.style.position = 'absolute';
    innerGuide.style.top = '50%';
    innerGuide.style.left = '50%';
    innerGuide.style.transform = 'translate(-50%, -50%)';
    innerGuide.style.width = '220px';
    innerGuide.style.height = '270px';
    innerGuide.style.border = '2px solid rgba(0, 255, 0, 0.3)';
    innerGuide.style.borderRadius = '50%';
    faceGuide.appendChild(innerGuide);
    
    // Instructions
    const instructions = document.createElement('div');
    instructions.style.textAlign = 'center';
    instructions.style.color = 'white';
    instructions.innerHTML = `
      <div style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 10px 0; color: white;">Face Registration</h3>
        <p style="margin: 0; font-size: 16px;">Position your face within the green circle</p>
        <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.8;">Look directly at the camera</p>
      </div>
    `;
    instructions.appendChild(faceGuide);
    overlay.appendChild(instructions);
    
    // Create capture button
    const captureBtn = document.createElement('button');
    captureBtn.textContent = '📷 Capture Face';
    captureBtn.style.position = 'fixed';
    captureBtn.style.bottom = '50px';
    captureBtn.style.left = '50%';
    captureBtn.style.transform = 'translateX(-50%)';
    captureBtn.style.zIndex = '10001';
    captureBtn.style.padding = '15px 30px';
    captureBtn.style.backgroundColor = '#007bff';
    captureBtn.style.color = 'white';
    captureBtn.style.border = 'none';
    captureBtn.style.borderRadius = '25px';
    captureBtn.style.fontSize = '18px';
    captureBtn.style.fontWeight = 'bold';
    captureBtn.style.cursor = 'pointer';
    captureBtn.style.boxShadow = '0 4px 15px rgba(0, 123, 255, 0.3)';
    
    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.position = 'fixed';
    closeBtn.style.top = '20px';
    closeBtn.style.right = '20px';
    closeBtn.style.zIndex = '10001';
    closeBtn.style.padding = '10px 15px';
    closeBtn.style.backgroundColor = '#dc3545';
    closeBtn.style.color = 'white';
    closeBtn.style.border = 'none';
    closeBtn.style.borderRadius = '50%';
    closeBtn.style.fontSize = '20px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.width = '50px';
    closeBtn.style.height = '50px';
    
    // Add elements to page
    document.body.appendChild(video);
    document.body.appendChild(overlay);
    document.body.appendChild(captureBtn);
    document.body.appendChild(closeBtn);
    
    // Capture photo with stabilization
    captureBtn.onclick = () => {
      // Add stabilization delay to ensure clear capture
      setTimeout(() => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        
        // Ensure video is ready and stable
        if (video.readyState >= 2) { // HAVE_CURRENT_DATA
          ctx?.drawImage(video, 0, 0);
          
          // Capture with higher quality for better recognition
          const facePhoto = canvas.toDataURL('image/jpeg', 0.9);
          
          // Clean up
          stream.getTracks().forEach(track => track.stop());
          document.body.removeChild(video);
          document.body.removeChild(overlay);
          document.body.removeChild(captureBtn);
          document.body.removeChild(closeBtn);
          
          resolve(facePhoto);
        } else {
          // Retry if video not ready
          setTimeout(() => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(video, 0, 0);
            
            const facePhoto = canvas.toDataURL('image/jpeg', 0.9);
            
            // Clean up
            stream.getTracks().forEach(track => track.stop());
            document.body.removeChild(video);
            document.body.removeChild(overlay);
            document.body.removeChild(captureBtn);
            document.body.removeChild(closeBtn);
            
            resolve(facePhoto);
          }, 500);
        }
      }, 300); // 300ms stabilization delay
    };
    
    // Close camera
    closeBtn.onclick = () => {
      stream.getTracks().forEach(track => track.stop());
      document.body.removeChild(video);
      document.body.removeChild(overlay);
      document.body.removeChild(captureBtn);
      document.body.removeChild(closeBtn);
      resolve(null);
    };
  }

  private openFaceFileInput(resolve: (value: string | null) => void) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'user'; // Front camera on mobile
    
    input.style.display = 'none';
    
    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          resolve(e.target.result);
        };
        reader.readAsDataURL(file);
      } else {
        resolve(null);
      }
    };
    
    input.click();
  }

  async registerFace() {
    if (!this.faceRegistrationPhoto) {
      this.showToast('No face photo captured', 'warning');
      return;
    }

    try {
      console.log('Starting face registration...');
      const currentUserId = await this.getCurrentUserId();
      const userName = await this.getCurrentUserName();
      
      // Convert base64 to file
      const file = this.base64ToFile(this.faceRegistrationPhoto, 'face.jpg');
      
      // Create form data
      const formData = new FormData();
      formData.append('user_id', currentUserId);
      formData.append('user_name', userName);
      formData.append('file', file);
      
      console.log('Sending face registration request to:', `${this.facialRecognitionApiUrl}/register-face`);
      
      // Register face with timeout
      const response = await Promise.race([
        this.http.post(`${this.facialRecognitionApiUrl}/register-face`, formData).toPromise() as any,
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Face registration timeout after 30 seconds')), 30000)
        )
      ]);
      
      console.log('Face registration response:', response);
      
      if (response && response.success) {
        this.isFaceRegistered = true;
        this.faceRegistrationPhoto = null;
        this.faceRegistrationError = false;
        this.showToast('Face registered successfully! You can now use facial recognition for payments.', 'success');
        
        // Refresh the face registration status
        await this.checkFacialRecognitionStatus();
      } else {
        const errorMessage = response?.message || 'Face registration failed';
        this.showToast(`Face registration failed: ${errorMessage}. Please try again.`, 'danger');
        this.faceRegistrationError = true;
      }
    } catch (error) {
      console.error('Error registering face:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.faceRegistrationError = true;
      
      if (errorMessage.includes('timeout')) {
        this.showToast('Face registration timed out. Please check your connection and try again.', 'danger');
      } else if (errorMessage.includes('Network Error') || errorMessage.includes('fetch')) {
        this.showToast('Network error. Please check your connection and try again.', 'danger');
      } else {
        this.showToast(`Error registering face: ${errorMessage}. Please try again.`, 'danger');
      }
    }
  }

  async getCurrentUserName(): Promise<string> {
    // This should return the current user's name from your authentication system
    // For now, using a placeholder - you'll need to implement this based on your auth
    return 'Client User'; // Replace with actual user name
  }

  async showConfirmDialog(header: string, message: string, confirmText: string, cancelText: string): Promise<boolean> {
    return new Promise(async (resolve) => {
      const alert = await this.alertController.create({
        header: header,
        message: message,
        buttons: [
          {
            text: cancelText,
            role: 'cancel',
            handler: () => resolve(false)
          },
          {
            text: confirmText,
            handler: () => resolve(true)
          }
        ]
      });
      
      await alert.present();
    });
  }

  private base64ToFile(base64: string, filename: string): File {
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }

  async removeFaceRegistration() {
    try {
      const currentUserId = await this.getCurrentUserId();
      
      const response = await this.http.delete(`${this.facialRecognitionApiUrl}/remove-face/${currentUserId}`).toPromise() as any;
      
      if (response && response.success) {
        this.isFaceRegistered = false;
        this.showToast('Facial recognition data removed successfully', 'success');
        
        // Refresh the face registration status
        await this.checkFacialRecognitionStatus();
      } else {
        this.showToast('Failed to remove facial recognition data', 'danger');
      }
    } catch (error) {
      console.error('Error removing face registration:', error);
      this.showToast('Error removing facial recognition data', 'danger');
    }
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