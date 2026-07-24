import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { IonicModule, ToastController, LoadingController, AlertController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Booking, BookingStatus } from '../../../models';
import { SupabaseService } from '../../../supabase.service';
import { BookingService } from '../../../booking.service';

export interface MechanicBookingHistory extends Booking {
  clientName?: string;
  clientPhone?: string;
  isProcessing?: boolean;
}

@Component({
  selector: 'app-jobs',
  templateUrl: 'jobs.page.html',
  styleUrls: ['jobs.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class JobsPage implements OnInit {
  bookings: MechanicBookingHistory[] = [];
  filteredBookings: MechanicBookingHistory[] = [];
  selectedFilter: 'cancelled' | 'in_progress' | 'completed' = 'completed';
  isLoadingBookings = false;
  searchQuery = '';
  
  // Filter options
  filterOptions = [
    { value: 'cancelled', label: 'Cancelled', icon: 'close-circle', color: 'danger' },
    { value: 'in_progress', label: 'In Progress', icon: 'construct', color: 'primary' },
    { value: 'completed', label: 'Completed', icon: 'checkmark-circle', color: 'success' }
  ];

  // Modal state variables - keeping for compatibility with existing modals
  isCashModalOpen = false;
  isFacialModalOpen = false;
  selectedBooking: MechanicBookingHistory | null = null;
  isProcessingPayment = false;
  isCapturing = false;
  paymentStatus: 'success' | 'error' | null = null;
  paymentStatusMessage = '';
  selectedFiles: File[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private supabaseService: SupabaseService,
    private bookingService: BookingService
  ) { }

  ngOnInit() {
    this.loadBookings();
  }

  ionViewWillEnter() {
    this.loadBookings();
  }

  /**
   * Load bookings assigned to this mechanic
   */
  async loadBookings() {
    this.isLoadingBookings = true;
    try {
      const { data: sessionData } = await this.supabaseService.getSession();
      const userId = sessionData.session?.user.id;
      
      if (!userId) {
        this.showToast('Please log in to view your jobs', 'warning');
        return;
      }

      // Get bookings assigned to this mechanic with client details
      const { data: bookings, error } = await this.supabaseService
        .from('bookings')
        .select(`
          *,
          profiles:client_id(full_name, phone)
        `)
        .eq('mechanic_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading bookings:', error);
        this.showToast('Error loading job history', 'danger');
        return;
      }

      // Transform the data
      this.bookings = (bookings || []).map(booking => ({
        ...booking,
        clientName: booking.profiles?.full_name || 'Unknown Client',
        clientPhone: booking.profiles?.phone || null,
        isProcessing: false
      }));

      this.applyFilters();
      console.log('Mechanic bookings loaded:', this.bookings);
    } catch (error) {
      console.error('Error loading bookings:', error);
      this.showToast('Error loading job history', 'danger');
    } finally {
      this.isLoadingBookings = false;
    }
  }

  /**
   * Apply filters to bookings
   */
  applyFilters() {
    let filtered = [...this.bookings];

    // Filter by status
    filtered = filtered.filter(booking => {
      switch (this.selectedFilter) {
        case 'in_progress':
          return booking.status === 'in_progress' || booking.status === 'matched' || (booking.status === 'pending' && booking.mechanic_id);
        case 'completed':
          return booking.status === 'completed';
        case 'cancelled':
          return booking.status === 'cancelled';
        default:
          return true;
      }
    });

    // Filter by search query
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(booking => 
        booking.required_specialization.toLowerCase().includes(query) ||
        booking.notes?.toLowerCase().includes(query) ||
        booking.clientName?.toLowerCase().includes(query) ||
        booking.id.toString().includes(query)
      );
    }

    this.filteredBookings = filtered;
  }

  /**
   * Set filter
   */
  setFilter(filter: string) {
    if (filter === 'cancelled' || filter === 'in_progress' || filter === 'completed') {
      this.selectedFilter = filter;
      this.applyFilters();
    }
  }

  /**
   * Handle search
   */
  onSearchChange() {
    this.applyFilters();
  }

  /**
   * Handle price setting
   */
  async setPrice(booking: MechanicBookingHistory) {
    if (!booking.service_price || booking.service_price <= 0) {
      await this.showToast('Please enter a valid price', 'warning');
      return;
    }

    booking.isProcessing = true;
    
    try {
      // Update booking with service price
      const { error } = await this.supabaseService
        .from('bookings')
        .update({ service_price: booking.service_price })
        .eq('id', booking.id);

      if (error) throw error;
      
      booking.isProcessing = false;
      await this.showToast('Price set successfully!', 'success');
    } catch (error) {
      console.error('Error setting price:', error);
      booking.isProcessing = false;
      await this.showToast('Failed to set price. Please try again.', 'danger');
    }
  }

  /**
   * Mark job as done (change from in_progress to completed)
   */
  async markJobAsDone(booking: MechanicBookingHistory) {
    booking.isProcessing = true;
    
    try {
      // Update booking status to completed
      await this.bookingService.updateBookingStatus(booking.id, 'completed');
      
      // Only update payment status if it's cash payment and not already paid
      if (booking.payment_method === 'cash' && booking.payment_status !== 'paid') {
        await this.bookingService.updatePaymentStatus(booking.id, 'paid', 'cash');
        booking.payment_status = 'paid';
        booking.payment_completed_at = new Date().toISOString();
      }
      
      // Update local data
      booking.status = 'completed';
      booking.service_completed_at = new Date().toISOString();
      booking.isProcessing = false;
      
      this.applyFilters();
      
      if (booking.payment_method === 'cash' && booking.payment_status === 'paid') {
        await this.showToast('Job marked as completed and cash payment confirmed!', 'success');
      } else {
        await this.showToast('Job marked as completed!', 'success');
      }
    } catch (error) {
      console.error('Error marking job as done:', error);
      booking.isProcessing = false;
      await this.showToast('Failed to mark job as done. Please try again.', 'danger');
    }
  }

  /**
   * Accept a booking (for pending jobs)
   */
  async acceptBooking(booking: MechanicBookingHistory) {
    booking.isProcessing = true;
    
    try {
      const { data: sessionData } = await this.supabaseService.getSession();
      const userId = sessionData.session?.user.id;
      
      if (!userId) {
        this.showToast('Please log in to accept bookings', 'warning');
        return;
      }

      // Update booking to assign mechanic
      await this.bookingService.updateBookingStatus(booking.id, 'in_progress', userId);
      
      // Update local data
      booking.status = 'in_progress';
      booking.mechanic_id = userId;
      booking.isProcessing = false;
      
      this.applyFilters();
      await this.showToast('Booking accepted successfully!', 'success');
    } catch (error) {
      console.error('Error accepting booking:', error);
      booking.isProcessing = false;
      await this.showToast('Failed to accept booking. Please try again.', 'danger');
    }
  }

  /**
   * Start working on a job (change from assigned to in_progress)
   */
  async startJob(booking: MechanicBookingHistory) {
    booking.isProcessing = true;
    
    try {
      await this.bookingService.updateBookingStatus(booking.id, 'in_progress');
      
      // Update local data
      booking.status = 'in_progress';
      booking.isProcessing = false;
      
      this.applyFilters();
      await this.showToast('Job started! Good luck!', 'success');
    } catch (error) {
      console.error('Error starting job:', error);
      booking.isProcessing = false;
      await this.showToast('Failed to start job. Please try again.', 'danger');
    }
  }

  /**
   * Dismiss cash payment modal
   */
  dismissCashModal() {
    this.isCashModalOpen = false;
    this.selectedBooking = null;
    this.isProcessingPayment = false;
    this.selectedFiles = [];
  }

  /**
   * Dismiss facial recognition modal
   */
  dismissFacialModal() {
    this.isFacialModalOpen = false;
    this.selectedBooking = null;
    this.isProcessingPayment = false;
    this.isCapturing = false;
    this.paymentStatus = null;
    this.paymentStatusMessage = '';
  }

  /**
   * Select files for upload
   */
  selectFiles() {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*';
    input.style.display = 'none';
    
    input.onchange = (event: any) => {
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
    };
    
    input.click();
  }

  /**
   * Handle file selection
   */
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

  /**
   * Remove file from selection
   */
  removeFile(index: number) {
    this.selectedFiles.splice(index, 1);
  }

  /**
   * Confirm cash payment
   */
  async confirmCashPayment() {
    if (!this.selectedBooking) return;

    if (this.selectedFiles.length === 0) {
      this.showToast('Please upload at least one payment proof', 'warning');
      return;
    }

    this.isProcessingPayment = true;

    const loading = await this.loadingController.create({
      message: 'Processing cash payment...',
      spinner: 'crescent'
    });

    await loading.present();

    try {
      // Simulate cash payment processing
      await this.simulatePaymentProcess();

      // Update booking status
      this.selectedBooking.status = 'completed';
      this.selectedBooking.payment_status = 'paid';
      this.selectedBooking.payment_method = 'cash';

      await loading.dismiss();
      this.showToast('Cash payment confirmed!', 'success');
      this.dismissCashModal();

    } catch (error) {
      console.error('Cash payment error:', error);
      await loading.dismiss();
      this.showToast('Cash payment failed. Please try again.', 'danger');
    } finally {
      this.isProcessingPayment = false;
    }
  }

  /**
   * Start facial recognition process
   */
  async startFacialRecognition() {
    if (!this.selectedBooking) return;

    this.isCapturing = true;
    this.paymentStatus = null;
    this.paymentStatusMessage = '';

    try {
      // Simulate facial recognition process
      await this.simulateFacialRecognition();

      // Simulate successful payment
      this.paymentStatus = 'success';
      this.paymentStatusMessage = 'Payment successful! Face verified.';

      // Update booking status after a delay
      setTimeout(() => {
        if (this.selectedBooking) {
          this.selectedBooking.status = 'completed';
          this.selectedBooking.payment_status = 'paid';
          this.selectedBooking.payment_method = 'facial_recognition';
        }
        this.dismissFacialModal();
        this.showToast('Facial recognition payment successful!', 'success');
      }, 2000);

    } catch (error) {
      console.error('Facial recognition error:', error);
      this.paymentStatus = 'error';
      this.paymentStatusMessage = 'Face verification failed. Please try again.';
      
      setTimeout(() => {
        this.isCapturing = false;
        this.paymentStatus = null;
      }, 3000);
    }
  }

  /**
   * Simulate facial recognition process
   */
  private simulateFacialRecognition(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 3000); // 3 second delay to simulate face scanning
    });
  }

  /**
   * Process payment for the order (legacy method - kept for compatibility)
   */
  async processPayment(order: any) {
    // Set processing state
    order.isProcessing = true;

    const loading = await this.loadingController.create({
      message: 'Processing payment...',
      spinner: 'crescent'
    });

    await loading.present();

    try {
      // Simulate payment processing
      await this.simulatePaymentProcess();

      // Update order status
      order.status = 'Completed';
      order.paymentMethod = 'Online Payment';
      order.isProcessing = false;

      await loading.dismiss();
      this.showToast('Payment successful!', 'success');

      // In a real app, you would call your payment service here
      // await this.paymentService.processPayment(order);

    } catch (error) {
      console.error('Payment error:', error);
      order.isProcessing = false;
      await loading.dismiss();
      this.showToast('Payment failed. Please try again.', 'danger');
    }
  }

  /**
   * Simulate payment processing delay
   */
  private simulatePaymentProcess(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 2000); // 2 second delay
    });
  }

  /**
   * Navigate to different tabs
   */
  navigateToTab(tab: string) {
    switch (tab) {
      case 'home':
        this.router.navigateByUrl('/mechanic/home');
        break;
      case 'jobs':
        this.router.navigateByUrl('/mechanic/jobs');
        break;
      case 'wallet':
        this.router.navigateByUrl('/mechanic/wallet');
        break;
      case 'account':
        this.router.navigateByUrl('/mechanic/account');
        break;
      default:
        console.log('Unknown tab:', tab);
    }
  }

  /**
   * Show toast message
   */
  async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'bottom',
      color: color,
      buttons: [
        {
          text: 'Dismiss',
          role: 'cancel'
        }
      ]
    });

    await toast.present();
  }

  /**
   * Refresh bookings (pull to refresh)
   */
  async refreshBookings(event: any) {
    try {
      await this.loadBookings();
      this.showToast('Jobs refreshed');
    } catch (error) {
      console.error('Error refreshing bookings:', error);
      this.showToast('Error refreshing jobs', 'danger');
    } finally {
      event.target.complete();
    }
  }


  /**
   * Format status for display
   */
  formatStatus(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Format service type for display
   */
  formatServiceType(serviceType: string): string {
    return serviceType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Format payment method for display
   */
  formatPaymentMethod(paymentMethod: string | null): string {
    if (!paymentMethod) return 'Cash';
    return paymentMethod.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Format payment status for display
   */
  formatPaymentStatus(paymentStatus: string): string {
    return paymentStatus.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Get status color class
   */
  getStatusColor(status: BookingStatus): string {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'assigned':
        return 'secondary';
      case 'in_progress':
        return 'primary';
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'danger';
      default:
        return 'medium';
    }
  }

  /**
   * Get status icon
   */
  getStatusIcon(status: BookingStatus): string {
    switch (status) {
      case 'pending':
        return 'time';
      case 'assigned':
        return 'person-add';
      case 'in_progress':
        return 'construct';
      case 'completed':
        return 'checkmark-circle';
      case 'cancelled':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  }

  /**
   * Format currency
   */
  formatCurrency(amount: number | null): string {
    if (amount === null) return 'TBD';
    return `₱${amount.toFixed(2)}`;
  }

  /**
   * Format date
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Track by function for ngFor performance
   */
  trackByBookingId(index: number, booking: MechanicBookingHistory): number {
    return booking.id;
  }

  
}

