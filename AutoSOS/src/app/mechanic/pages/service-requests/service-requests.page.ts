import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Geolocation } from '@capacitor/geolocation';
import { BookingService } from '../../../booking.service';
import { SupabaseService } from '../../../supabase.service';
import { ProfileService } from '../../../profile.service';
import { MapboxService, Location, MechanicLocation } from '../../../mapbox.service';
import { NativeNavigationService } from '../../../native-navigation.service';
import { DistanceCalculatorService } from '../../../utils/distance-calculator.service';
import { RealTimeMapComponent } from '../../../components/real-time-map.component';
import type { Booking, Profile } from '../../../models';

export interface ServiceRequest {
  id: string;
  client_id: string;
  client?: Profile;
  mechanic_id?: string;
  required_specialization: string;
  motorcycle_model?: string;
  notes?: string;
  payment_method: string;
  service_price?: number;
  status: 'pending' | 'matched' | 'in_progress' | 'completed' | 'cancelled';
  latitude: number;
  longitude: number;
  client_latitude?: number;
  client_longitude?: number;
  created_at: string;
  updated_at: string;
}

@Component({
  selector: 'app-service-requests',
  templateUrl: 'service-requests.page.html',
  styleUrls: ['service-requests.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, RealTimeMapComponent]
})
export class ServiceRequestsPage implements OnInit, OnDestroy {
  @ViewChild('realTimeMap') realTimeMap!: RealTimeMapComponent;
  
  // Current service request
  currentServiceRequest: ServiceRequest | null = null;
  
  // Mechanic information
  mechanicId: string | null = null;
  mechanicProfile: Profile | null = null;
  
  // Location properties
  currentLatitude: number = 0;
  currentLongitude: number = 0;
  clientLocation: Location | null = null;
  
  // Price setting
  servicePrice: number = 0;
  
  // Payment tracking
  paymentReceived: boolean = false;
  
  // Swipe to complete
  swipeProgress: string = 'translateX(0px)';
  isSwipeActive: boolean = false;
  
  // Loading states
  isLoading: boolean = false;
  
  // Real-time updates
  private updateInterval: any;

  constructor(
    private router: Router,
    private toastController: ToastController,
    private alertController: AlertController,
    private bookingService: BookingService,
    private supabaseService: SupabaseService,
    private profileService: ProfileService,
    private mapboxService: MapboxService,
    private distanceCalculator: DistanceCalculatorService,
    private nativeNavigation: NativeNavigationService
  ) {}

  ngOnInit() {
    this.initializeServiceRequests();
    this.startRealTimeUpdates();
  }

  /**
   * Ionic lifecycle hook - called when view is fully loaded
   * This is the correct place to initialize maps in Ionic
   */
  ionViewDidEnter() {
    console.log('Service requests view did enter - map should be ready');
    this.debugMapboxSetup();
    // The map component will handle its own initialization
    // but we can add any additional setup here if needed
  }

  /**
   * Debug Mapbox setup according to the debugging checklist
   */
  debugMapboxSetup() {
    console.log('🔍 Debugging Mapbox setup...');
    
    // 1. Check if Mapbox GL JS is loaded
    if (typeof (window as any).mapboxgl === 'undefined') {
      console.error('❌ Mapbox GL JS not loaded');
      return;
    }
    console.log('✅ Mapbox GL JS loaded');
    
    // 2. Check access token
    const token = this.mapboxService.getAccessToken();
    console.log('🔑 Token length:', token?.length);
    if (!token || token.length < 10) {
      console.error('❌ Invalid or missing Mapbox token');
    } else {
      console.log('✅ Mapbox token looks valid');
    }
    
    // 3. Check WebGL support
    const mapboxgl = (window as any).mapboxgl;
    if (!mapboxgl.supported()) {
      console.error('❌ WebGL not supported');
    } else {
      console.log('✅ WebGL is supported');
    }
    
    // 4. Check map container
    setTimeout(() => {
      const container = document.getElementById('mapbox-map');
      if (container) {
        const rect = container.getBoundingClientRect();
        console.log('📦 Map container dimensions:', {
          width: rect.width,
          height: rect.height,
          visible: rect.width > 0 && rect.height > 0
        });
        
        if (rect.width === 0 || rect.height === 0) {
          console.error('❌ Map container has zero dimensions');
        } else {
          console.log('✅ Map container has proper dimensions');
        }
      } else {
        console.error('❌ Map container not found');
      }
    }, 1000);
  }

  ngOnDestroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }

  /**
   * Initialize service requests page
   */
  async initializeServiceRequests() {
    try {
      this.isLoading = true;
      
      // Get mechanic profile
      await this.loadMechanicProfile();
      
      // Get current location
      await this.getCurrentLocation();
      
      // Load current service request
      await this.loadCurrentServiceRequest();
      
    } catch (error) {
      console.error('Error initializing service requests:', error);
      this.showToast('Failed to load service requests', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Load mechanic profile
   */
  async loadMechanicProfile() {
    try {
      const session = await this.supabaseService.getSession();
      if (session.data.session?.user) {
        this.mechanicId = session.data.session.user.id;
        
        const profile = await this.profileService.getMyProfile();
        this.mechanicProfile = profile;
      }
    } catch (error) {
      console.error('Error loading mechanic profile:', error);
    }
  }

  /**
   * Get current location
   */
  async getCurrentLocation() {
    try {
      const position = await Geolocation.getCurrentPosition();
      this.currentLatitude = position.coords.latitude;
      this.currentLongitude = position.coords.longitude;
    } catch (error) {
      console.error('Error getting location:', error);
      this.showToast('Failed to get location', 'warning');
    }
  }

  /**
   * Load current service request
   */
  async loadCurrentServiceRequest() {
    try {
      if (!this.mechanicId) return;

      // Get assigned bookings for this mechanic
      const { data: bookings, error } = await this.supabaseService
        .from('bookings')
        .select(`
          *,
          client:profiles!bookings_client_id_fkey(*)
        `)
        .eq('mechanic_id', this.mechanicId)
        .in('status', ['pending', 'matched', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error loading service request:', error);
        return;
      }

      if (bookings && bookings.length > 0) {
        this.currentServiceRequest = bookings[0] as ServiceRequest;
        
        // Set client location for map
        if (this.currentServiceRequest) {
          this.clientLocation = {
            latitude: this.currentServiceRequest.latitude,
            longitude: this.currentServiceRequest.longitude,
            timestamp: Date.now()
          };
          
          // Initialize map after popup is visible
          setTimeout(() => {
            this.initializeMapInPopup();
          }, 500);
          
          // Additional map refresh when popup is fully loaded
          setTimeout(() => {
            this.refreshMapInPopup();
          }, 1500);
        }
      }
    } catch (error) {
      console.error('Error loading current service request:', error);
    }
  }

  /**
   * Initialize map in popup modal
   */
  private initializeMapInPopup() {
    console.log('Initializing map in popup...');
    
    if (this.realTimeMap) {
      // Force map initialization with a longer delay
      setTimeout(() => {
        console.log('First map initialization attempt...');
        this.realTimeMap.initializeMapManually();
        
        // Center map on client location after initialization
        setTimeout(() => {
          if (this.realTimeMap && this.currentServiceRequest) {
            console.log('Centering map on client location...');
            this.centerOnClient();
          }
        }, 1000);
        
        // Additional resize after a delay to ensure proper rendering
        setTimeout(() => {
          if (this.realTimeMap) {
            console.log('Second map initialization attempt...');
            this.realTimeMap.initializeMapManually();
          }
        }, 2000);
        
        // Final attempt to ensure map loads
        setTimeout(() => {
          if (this.realTimeMap) {
            console.log('Final map initialization attempt...');
            this.realTimeMap.initializeMapManually();
          }
        }, 3000);
      }, 1000);
    }
  }

  /**
   * Refresh map in popup modal
   */
  private refreshMapInPopup() {
    console.log('Refreshing map in popup...');
    
    if (this.realTimeMap) {
      // Force map refresh
      this.realTimeMap.initializeMapManually();
      
      // Trigger resize
      setTimeout(() => {
        if (this.realTimeMap) {
          this.realTimeMap.initializeMapManually();
        }
      }, 500);
    }
  }

  /**
   * Start real-time updates
   */
  startRealTimeUpdates() {
    // Check for updates every 5 seconds
    this.updateInterval = setInterval(() => {
      this.checkForUpdates();
    }, 5000);
  }

  /**
   * Check for updates
   */
  async checkForUpdates() {
    if (!this.currentServiceRequest) return;

    try {
      // Check for payment updates
      if (this.currentServiceRequest.payment_method === 'facial_recognition' && 
          this.currentServiceRequest.status === 'in_progress') {
        await this.checkPaymentStatus();
      }

      // Check for status updates
      await this.loadCurrentServiceRequest();
    } catch (error) {
      console.error('Error checking for updates:', error);
    }
  }

  /**
   * Check payment status for facial recognition
   */
  async checkPaymentStatus() {
    try {
      // In a real implementation, you would check the payment service
      // For now, we'll simulate a payment check
      if (this.currentServiceRequest && !this.paymentReceived) {
        // Simulate payment received after some time
        setTimeout(() => {
          this.paymentReceived = true;
          this.showPaymentNotification();
        }, 10000); // 10 seconds delay for demo
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    }
  }

  /**
   * Show payment notification
   */
  async showPaymentNotification() {
    const toast = await this.toastController.create({
      message: `Payment of ₱${this.currentServiceRequest?.service_price} received via facial recognition!`,
      duration: 5000,
      position: 'top',
      color: 'success',
      buttons: [
        {
          text: 'View Wallet',
          handler: () => {
            this.router.navigate(['/mechanic/wallet']);
          }
        }
      ]
    });
    await toast.present();
  }

  /**
   * Accept service request
   */
  async acceptRequest() {
    if (!this.currentServiceRequest) return;

    try {
      this.isLoading = true;

      // Update booking status to in_progress
      const { error } = await this.supabaseService
        .from('bookings')
        .update({ 
          status: 'in_progress',
          mechanic_id: this.mechanicId,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.currentServiceRequest.id);

      if (error) {
        throw error;
      }

      // Update local state
      this.currentServiceRequest.status = 'in_progress';
      
      this.showToast('Service request accepted! Please set your service price.', 'success');
      
    } catch (error) {
      console.error('Error accepting request:', error);
      this.showToast('Failed to accept request', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Decline service request
   */
  async declineRequest() {
    if (!this.currentServiceRequest) return;

    const alert = await this.alertController.create({
      header: 'Decline Request',
      message: 'Are you sure you want to decline this service request?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Decline',
          handler: async () => {
            try {
              this.isLoading = true;

              // Update booking status to cancelled
              const { error } = await this.supabaseService
                .from('bookings')
                .update({ 
                  status: 'cancelled',
                  updated_at: new Date().toISOString()
                })
                .eq('id', this.currentServiceRequest!.id);

              if (error) {
                throw error;
              }

              this.showToast('Service request declined', 'warning');
              this.currentServiceRequest = null;
              
            } catch (error) {
              console.error('Error declining request:', error);
              this.showToast('Failed to decline request', 'danger');
            } finally {
              this.isLoading = false;
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Set service price
   */
  async setServicePrice() {
    if (!this.currentServiceRequest || !this.servicePrice) return;

    try {
      this.isLoading = true;

      // Update booking with service price
      const { error } = await this.supabaseService
        .from('bookings')
        .update({ 
          service_price: this.servicePrice,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.currentServiceRequest.id);

      if (error) {
        throw error;
      }

      // Update local state
      this.currentServiceRequest.service_price = this.servicePrice;
      
      this.showToast('Service price set successfully!', 'success');
      
    } catch (error) {
      console.error('Error setting service price:', error);
      this.showToast('Failed to set service price', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Start job
   */
  async startJob() {
    if (!this.currentServiceRequest) return;

    try {
      this.isLoading = true;

      // Update booking status to in_progress
      const { error } = await this.supabaseService
        .from('bookings')
        .update({ 
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', this.currentServiceRequest.id);

      if (error) {
        throw error;
      }

      // Update local state
      this.currentServiceRequest.status = 'in_progress';
      
      this.showToast('Job started! You can now begin the service.', 'success');
      
    } catch (error) {
      console.error('Error starting job:', error);
      this.showToast('Failed to start job', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Complete job
   */
  async completeJob() {
    if (!this.currentServiceRequest) return;

    try {
      this.isLoading = true;

      // Update booking status to completed
      const { error } = await this.supabaseService
        .from('bookings')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', this.currentServiceRequest.id);

      if (error) {
        throw error;
      }

      this.showToast('Job completed successfully!', 'success');
      this.currentServiceRequest = null;
      
    } catch (error) {
      console.error('Error completing job:', error);
      this.showToast('Failed to complete job', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Handle swipe to complete
   */
  onSwipeComplete(event: any) {
    // Handle swipe gesture for completing job
    // This would be implemented with gesture handling
    console.log('Swipe to complete:', event);
  }

  /**
   * Call client
   */
  async callClient() {
    if (!this.currentServiceRequest?.client?.phone) {
      this.showToast('No phone number available', 'warning');
      return;
    }

    // In a real app, you would use the device's phone functionality
    window.open(`tel:${this.currentServiceRequest.client.phone}`, '_self');
  }

  /**
   * Get client location for map
   */
  getClientLocation(): Location | null {
    if (!this.currentServiceRequest?.latitude || !this.currentServiceRequest?.longitude) {
      console.log('No client location data available');
      return null;
    }

    const location = {
      latitude: this.currentServiceRequest.latitude,
      longitude: this.currentServiceRequest.longitude,
      timestamp: Date.now()
    };
    
    console.log('Client location:', location);
    return location;
  }

  /**
   * Get distance to client using Haversine formula
   */
  getDistance(): string {
    if (!this.clientLocation) return '0';
    
    const distance = this.distanceCalculator.calculateDistanceToClient(
      this.currentLatitude,
      this.currentLongitude,
      this.clientLocation.latitude,
      this.clientLocation.longitude,
      'km'
    );
    
    return this.distanceCalculator.formatDistance(distance, 'km', 1);
  }

  /**
   * Get estimated travel time to client
   */
  getEstimatedTravelTime(): string {
    if (!this.clientLocation) return '0 min';
    
    const distance = this.distanceCalculator.calculateDistanceToClient(
      this.currentLatitude,
      this.currentLongitude,
      this.clientLocation.latitude,
      this.clientLocation.longitude,
      'km'
    );

    const timeInMinutes = this.distanceCalculator.getEstimatedTravelTime(distance);
    return this.distanceCalculator.formatTravelTime(timeInMinutes);
  }

  /**
   * Handle location updates
   */
  onLocationUpdated(location: Location) {
    this.currentLatitude = location.latitude;
    this.currentLongitude = location.longitude;
  }

  /**
   * Handle mechanic location updates
   */
  onMechanicLocationUpdated(location: MechanicLocation) {
    // Handle mechanic location updates if needed
    console.log('Mechanic location updated:', location);
  }

  /**
   * Refresh requests
   */
  async refreshRequests() {
    await this.loadCurrentServiceRequest();
  }

  /**
   * Go back
   */
  goBack() {
    this.router.navigate(['/mechanic/home']);
  }

  /**
   * Close the service request popup
   */
  closePopup() {
    this.currentServiceRequest = null;
  }

  /**
   * Center map on client location
   */
  centerOnClient() {
    if (this.realTimeMap) {
      this.realTimeMap.centerOnClient();
    }
  }

  /**
   * Center map on mechanic location
   */
  centerOnMechanic() {
    if (this.realTimeMap) {
      this.realTimeMap.centerOnUser();
    }
  }

  /**
   * Open internal real-time navigation page instead of external Mapbox
   */
  openRealTimeNavigation() {
    if (!this.currentServiceRequest) return;
    if (!this.currentServiceRequest.client_latitude || !this.currentServiceRequest.client_longitude) return;

    // Close the popup first
    this.closePopup();

    // Navigate to the internal real-time navigation page with parameters
    this.router.navigate(['/mechanic/real-time-navigation'], {
      queryParams: {
        mechanicId: this.mechanicId,
        clientLat: this.currentServiceRequest.client_latitude,
        clientLng: this.currentServiceRequest.client_longitude,
        clientName: this.currentServiceRequest.client?.full_name || 'Client',
        mechanicLat: this.currentLatitude,
        mechanicLng: this.currentLongitude,
        clientPhone: this.currentServiceRequest.client?.phone || ''
      }
    });
  }


  /**
   * Show toast message
   */
  async showToast(message: string, color: 'success' | 'danger' | 'warning' | 'primary' = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color
    });
    await toast.present();
  }
}