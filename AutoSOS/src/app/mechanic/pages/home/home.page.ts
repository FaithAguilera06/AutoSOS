import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Geolocation } from '@capacitor/geolocation';
import { SupabaseService } from '../../../supabase.service';
import { ProfileService } from '../../../profile.service';
import { BookingService } from '../../../booking.service';
import { RealTimeMapComponent } from '../../../components/real-time-map.component';
import { MapboxService, Location, MechanicLocation } from '../../../mapbox.service';
import { NativeNavigationService } from '../../../native-navigation.service';
import { DistanceCalculatorService } from '../../../utils/distance-calculator.service';
import { mapboxConfig } from '../../../../environments/mapbox.config';
import { environment } from '../../../../environments/environment';
import type { Profile, Booking } from '../../../models';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, RealTimeMapComponent]
})
export class HomePage implements OnInit, OnDestroy {
  @ViewChild('realTimeMap') realTimeMapComponent!: RealTimeMapComponent
  
  isOnline = true;
  profile: Profile | null = null;
  mechanicName = 'Loading...';
  
  // Client Found Modal properties
  showClientFoundModal = false;
  showServiceRequestModal = false;
  showPriceSettingModal = false;
  isBottomSheetExpanded = false;
  
  // Performance optimization properties
  private lastBookingCheck = 0;
  private bookingCheckDebounce = 1000; // 1 second debounce
  private clientDetailsCache = new Map<string, Profile>();
  
  // Location tracking interval
  private locationTrackingInterval: any;
  
  // Loading states
  private isLoadingClientDetails = false;
  
  // Service Request Notification properties
  isServiceRequestExpanded = false;
  
  // Real booking data
  currentBooking: Booking | null = null;
  currentClient: Profile | null = null;
  clientDetails: Profile | null = null;
  servicePrice: number | null = null;
  private bookingCheckInterval: any;
  
  // Location properties
  currentLatitude: number = 0;
  currentLongitude: number = 0;
  currentAddress: string = '';
  clientLocation: Location | null = null;
  
  // Payment tracking
  paymentReceived: boolean = false;
  
  // Map fullscreen state
  isMapFullscreen: boolean = false;

  constructor(
    private router: Router,
    private supabase: SupabaseService,
    private profileService: ProfileService,
    private bookingService: BookingService,
    private mapboxService: MapboxService,
    private distanceCalculator: DistanceCalculatorService,
    private nativeNavigation: NativeNavigationService
  ) {}

  async ngOnInit() {
    await this.loadUserData();
    await this.initializeLocation();
    this.startBookingCheck();
  }

  /**
   * Ionic lifecycle hook - called when view is fully loaded
   * This is the correct place to initialize maps in Ionic
   */
  ionViewDidEnter() {
    console.log('Mechanic home view did enter - map should be ready');
    this.debugMapboxSetup();
    this.handleMapResize();
    
    // Center map on mechanic's location after a short delay
    setTimeout(() => {
      this.centerMapOnMechanic();
    }, 1000);
  }

  ngOnDestroy() {
    if (this.bookingCheckInterval) {
      clearInterval(this.bookingCheckInterval);
    }
    if (this.locationTrackingInterval) {
      clearInterval(this.locationTrackingInterval);
    }
  }

  /**
   * Debug Mapbox setup according to the debugging checklist
   */
  debugMapboxSetup() {
    console.log('🔍 Debugging Mapbox setup in mechanic home...');
    
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

  /**
   * Handle map resize after view loads
   */
  handleMapResize() {
    console.log('🔄 Handling map resize...');
    
    // Wait for DOM to be ready
    setTimeout(() => {
      const mapElement = document.getElementById('mapbox-map');
      if (mapElement) {
        console.log('📏 Forcing map resize...');
        
        // Trigger resize event
        window.dispatchEvent(new Event('resize'));
        
        // Additional resize after a short delay
        setTimeout(() => {
          window.dispatchEvent(new Event('resize'));
          console.log('✅ Map resize completed');
        }, 300);
      }
    }, 500);
  }

  /**
   * Initialize mechanic location
   */
  async initializeLocation() {
    try {
      console.log('Initializing mechanic location...');
      
      // Get current position
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      });

      if (position && position.coords) {
        this.currentLatitude = position.coords.latitude;
        this.currentLongitude = position.coords.longitude;
        
        console.log('Mechanic location initialized:', {
          latitude: this.currentLatitude,
          longitude: this.currentLongitude
        });

        // Get address from coordinates
        this.currentAddress = await this.getAddressFromCoordinates(
          this.currentLatitude, 
          this.currentLongitude
        );

        // Update location in database
        await this.updateMechanicLocation({
          latitude: this.currentLatitude,
          longitude: this.currentLongitude,
          timestamp: Date.now()
        });

        // Start continuous location tracking
        this.startLocationTracking();
      }
    } catch (error) {
      console.error('Error initializing location:', error);
      
      // Fallback to default location (Manila)
      this.currentLatitude = 14.5995;
      this.currentLongitude = 120.9842;
      
      // Get address for fallback location
      this.currentAddress = await this.getAddressFromCoordinates(
        this.currentLatitude, 
        this.currentLongitude
      );
      
      console.log('Using fallback location (Manila):', {
        latitude: this.currentLatitude,
        longitude: this.currentLongitude,
        address: this.currentAddress
      });
    }
  }

  /**
   * Start continuous location tracking
   */
  startLocationTracking() {
    // Update location every 30 seconds
    setInterval(async () => {
      try {
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 10000
        });

        if (position && position.coords) {
          this.currentLatitude = position.coords.latitude;
          this.currentLongitude = position.coords.longitude;
          
          console.log('Location updated:', {
            latitude: this.currentLatitude,
            longitude: this.currentLongitude
          });

          // Update location in database
          await this.updateMechanicLocation({
            latitude: this.currentLatitude,
            longitude: this.currentLongitude,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error('Error updating location:', error);
      }
    }, 30000); // Update every 30 seconds
  }

  async loadUserData() {
    try {
      this.profile = await this.profileService.getMyProfile();
      if (this.profile) {
        this.mechanicName = this.profile.full_name || 'Mechanic';
        this.isOnline = this.profile.availability === 'available';
        console.log('Mechanic profile loaded:', {
          user_id: this.profile.user_id,
          full_name: this.profile.full_name,
          availability: this.profile.availability,
          role: this.profile.role
        });
        
        // Check for bookings immediately after profile is loaded
        console.log('Profile loaded, checking for existing bookings...');
        await this.checkForNewBookings();
      } else {
        console.log('No profile found for mechanic');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      this.mechanicName = 'Mechanic';
    }
  }

  /**
   * Start checking for new bookings
   */
  startBookingCheck() {
    // Check immediately
    this.checkForNewBookings();
    
    // Reduced frequency from 2s to 5s to reduce database load
    this.bookingCheckInterval = setInterval(() => {
      this.checkForNewBookings();
    }, 5000);
  }

  /**
   * Check for new bookings assigned to this mechanic
   */
  async checkForNewBookings() {
    // Debounce rapid successive calls
    const now = Date.now();
    if (now - this.lastBookingCheck < this.bookingCheckDebounce) {
      return;
    }
    this.lastBookingCheck = now;

    // Ensure profile is loaded before checking for bookings
    if (!this.profile?.user_id) {
      console.log('Profile not loaded yet, skipping booking check');
      return;
    }

    // Check for bookings even when offline to show assigned bookings
    console.log('Checking for new bookings. Mechanic ID:', this.profile?.user_id, 'Online:', this.isOnline);

    try {
      // Get bookings where this mechanic is assigned and status is matched or in_progress
      // Exclude completed bookings to prevent modal from showing after completion
      const { data: bookings, error } = await this.supabase
        .from('bookings')
        .select('*')
        .eq('mechanic_id', this.profile?.user_id)
        .in('status', ['matched', 'in_progress'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching mechanic bookings:', error);
        return;
      }

      const assignedBookings = bookings || [];
      console.log('Current matched bookings for mechanic:', assignedBookings.map(b => ({ id: b.id, status: b.status, mechanic_id: b.mechanic_id })));

      // If we have a current booking, check if it's still valid
      if (this.currentBooking) {
        // First check if the current booking status is completed
        if (this.currentBooking.status === 'completed') {
          console.log('Current booking is completed, closing modal. Booking ID:', this.currentBooking.id);
          this.closeServiceRequestModal();
          return;
        }
        
        const currentBookingStillValid = assignedBookings.some(booking => 
          booking.id === this.currentBooking!.id
        );
        
        if (!currentBookingStillValid) {
          // Current booking is no longer valid (completed/cancelled), close modal
          console.log('Current booking no longer valid, closing modal. Current booking ID:', this.currentBooking.id);
          this.closeServiceRequestModal();
          return;
        }
      }

      // If no current booking and we have new bookings, show the first one
      if (assignedBookings.length > 0 && !this.currentBooking) {
        console.log('Found new booking, showing modal:', assignedBookings[0]);
        
        // Prevent race condition by checking again
        if (this.currentBooking) {
          console.log('Booking already set, skipping duplicate assignment');
          return;
        }
        
        // Found a new booking, show the modal
        this.currentBooking = assignedBookings[0];
        
        // Load client details with caching
        if (this.currentBooking && this.currentBooking.client_id) {
          console.log('Loading client details for client ID:', this.currentBooking.client_id);
          try {
            await this.loadClientDetailsOptimized(this.currentBooking.client_id);
          } catch (error) {
            console.error('Error loading client details:', error);
            // Continue with modal display even if client details fail
          }
        }
        
        console.log('Showing service request modal');
        this.showServiceRequestModal = true;
        
        // Start real-time location tracking for the mechanic
        try {
          this.startMechanicTracking();
        } catch (error) {
          console.error('Error starting mechanic tracking:', error);
          // Continue with modal display even if tracking fails
        }
      }
    } catch (error) {
      console.error('Error checking for bookings:', error);
    }
  }

  /**
   * Load client details by client ID
   */
  async loadClientDetailsOptimized(clientId: string) {
    // Check cache first
    if (this.clientDetailsCache.has(clientId)) {
      console.log('Using cached client details for:', clientId);
      this.currentClient = this.clientDetailsCache.get(clientId)!;
      return;
    }

    try {
      // Get profile data including phone field
      const { data: profileData, error: profileError } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('user_id', clientId)
        .single();

      if (profileError) {
        console.error('Error loading client profile:', profileError);
        return;
      }

      // Set client data with phone field
      this.currentClient = {
        user_id: profileData.user_id,
        full_name: profileData.full_name || 'Unknown Client',
        phone: profileData.phone || null,
        email: profileData.email || null,
        avatar_url: profileData.avatar_url || null,
        role: profileData.role || 'client',
        created_at: profileData.created_at,
        updated_at: profileData.updated_at,
        approved: profileData.approved || false,
        availability: profileData.availability || 'not_available',
        specialization: profileData.specialization || null,
        latitude: profileData.latitude || null,
        longitude: profileData.longitude || null
      };

      // Cache the client details
      this.clientDetailsCache.set(clientId, this.currentClient);
      console.log('Client details loaded and cached:', this.currentClient.full_name);
    } catch (error) {
      console.error('Error loading client details:', error);
    }
  }

  /**
   * Load client details by client ID (legacy method for backward compatibility)
   */
  async loadClientDetails(clientId: string) {
    return this.loadClientDetailsOptimized(clientId);
  }
  /**
   * Toggle online/offline status
   */
  async toggleOnlineStatus() {
    console.log('=== TOGGLE ONLINE STATUS ===');
    console.log('Current status:', this.isOnline ? 'Online' : 'Offline');
    console.log('Current profile:', this.profile);
    
    const newStatus = !this.isOnline;
    console.log('Attempting to set status to:', newStatus ? 'Online' : 'Offline');
    
    // Update availability in Supabase
    if (this.profile) {
      try {
        const availabilityStatus = newStatus ? 'available' : 'not_available';
        console.log('Updating availability to:', availabilityStatus);
        
        const updatedProfile = await this.profileService.setAvailability(availabilityStatus);
        console.log('Successfully updated profile:', updatedProfile);
        
        // Update local state with the returned profile data
        this.isOnline = updatedProfile.availability === 'available';
        this.profile = updatedProfile;
        
        console.log('Local state updated. New status:', this.isOnline ? 'Online' : 'Offline');
        
        // If going offline, close any open modals
        if (!this.isOnline) {
          this.closeClientFoundModal();
        }
        
        this.showToast(`Status updated to ${this.isOnline ? 'Online' : 'Offline'}`, 'success');
      } catch (error) {
        console.error('❌ Error updating availability:', error);
        // Revert the toggle if update failed
        this.isOnline = !newStatus;
        this.showToast('Error updating status. Please try again.', 'danger');
      }
    } else {
      console.error('❌ No profile loaded, cannot update availability');
      this.isOnline = !newStatus; // Revert
      this.showToast('Profile not loaded. Please refresh the page.', 'danger');
    }
  }

  /**
   * Close client found modal
   */
  closeClientFoundModal() {
    this.showClientFoundModal = false;
    this.showServiceRequestModal = false;
    this.isBottomSheetExpanded = false;
    this.currentBooking = null;
    this.currentClient = null;
  }

  /**
   * Toggle service request notification expansion
   */
  toggleServiceRequestExpansion() {
    this.isServiceRequestExpanded = !this.isServiceRequestExpanded;
  }

  /**
   * Toggle bottom sheet expansion
   */
  toggleBottomSheet() {
    console.log('toggleBottomSheet called, current state:', this.isBottomSheetExpanded);
    this.isBottomSheetExpanded = !this.isBottomSheetExpanded;
    console.log('New state:', this.isBottomSheetExpanded);
  }

  /**
   * Mark as arrived at location
   */
  async markAsArrived() {
    if (!this.currentBooking) return;
    
    try {
      console.log('Marking as arrived...');
      // Update booking status to in_progress if not already
      const { error } = await this.supabase
        .from('bookings')
        .update({ 
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', this.currentBooking.id);

      if (error) throw error;

      this.showToast('Arrived at location!', 'success');
    } catch (error) {
      console.error('Error marking as arrived:', error);
      this.showToast('Error updating status', 'danger');
    }
  }

  /**
   * Finish service and open price setting modal
   */
  finishService() {
    console.log('Finishing service...');
    this.showPriceSettingModal = true;
  }

  /**
   * Close price setting modal
   */
  closePriceSettingModal() {
    this.showPriceSettingModal = false;
    this.servicePrice = null;
  }

  /**
   * Set quick price
   */
  setQuickPrice(price: number) {
    this.servicePrice = price;
  }

  /**
   * Confirm service price and complete service
   */
  async confirmServicePrice() {
    if (!this.currentBooking || !this.servicePrice) return;

    try {
      console.log('Confirming service price:', this.servicePrice);
      
      // Update booking with service completion and price
      const { error } = await this.supabase
        .from('bookings')
        .update({ 
          status: 'service_completed',
          service_price: this.servicePrice,
          service_completed_at: new Date().toISOString(),
          payment_status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', this.currentBooking.id);

      if (error) throw error;

      this.showToast(`Service completed! Price set to ₱${this.servicePrice}`, 'success');
      
      // Close modals
      this.closePriceSettingModal();
      this.showClientFoundModal = false;
      
      // Reset current booking
      this.currentBooking = null;
      this.currentClient = null;
      
    } catch (error) {
      console.error('Error confirming service price:', error);
      this.showToast('Error completing service', 'danger');
    }
  }

  /**
   * Accept the booking
   */
  async acceptBooking() {
    if (!this.currentBooking) return;
    
    try {
      // Update booking status to in_progress
      const { error } = await this.supabase
        .from('bookings')
        .update({ status: 'in_progress' })
        .eq('id', this.currentBooking.id);
      
      if (error) {
        console.error('Error accepting booking:', error);
        return;
      }
      
      console.log('Booking accepted and in progress');
      this.closeClientFoundModal();
    } catch (error) {
      console.error('Error accepting booking:', error);
    }
  }

  /**
   * Decline the booking
   */
  async declineBooking() {
    if (!this.currentBooking) return;
    
    try {
      console.log('Declining booking:', this.currentBooking.id);
      
      // Use BookingService for consistent cancellation logic
      await this.bookingService.cancelBooking(this.currentBooking.id);
      
      console.log('Booking status updated to cancelled, mechanic_id set to null');
      
      // Make mechanic available again
      if (this.profile) {
        await this.profileService.setAvailability('available');
        this.isOnline = true;
        console.log('Mechanic availability set to available');
      }
      
      console.log('Booking declined, mechanic made available again');
      this.closeClientFoundModal();
    } catch (error) {
      console.error('Error declining booking:', error);
    }
  }

  /**
   * Set service price for a booking
   */
  async setPrice(price: number) {
    if (!this.currentBooking || !price || price <= 0) {
      this.showToast('Please enter a valid price', 'warning');
      return;
    }

    try {
      const { error } = await this.supabase
        .from('bookings')
        .update({ 
          service_price: price,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.currentBooking.id);

      if (error) {
        console.error('Error setting price:', error);
        this.showToast('Error setting price', 'danger');
        return;
      }

      this.showToast('Price set successfully!', 'success');
      this.currentBooking.service_price = price;
      
    } catch (error) {
      console.error('Error setting price:', error);
      this.showToast('Error setting price', 'danger');
    }
  }

  /**
   * Start the job (mark as in_progress)
   */
  async startJob() {
    if (!this.currentBooking) return;
    
    try {
      const { error } = await this.supabase
        .from('bookings')
        .update({ 
          status: 'in_progress',
          service_started_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', this.currentBooking.id);

      if (error) {
        console.error('Error starting job:', error);
        this.showToast('Error starting job', 'danger');
        return;
      }

      this.showToast('Job started successfully!', 'success');
      this.currentBooking.status = 'in_progress';
      
    } catch (error) {
      console.error('Error starting job:', error);
      this.showToast('Error starting job', 'danger');
    }
  }

  /**
   * Complete the job
   */
  async completeJob() {
    if (!this.currentBooking) return;
    
    try {
      const { error } = await this.supabase
        .from('bookings')
        .update({ 
          status: 'completed',
          service_completed_at: new Date().toISOString(),
          payment_status: 'paid',
          payment_method: 'cash',
          payment_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', this.currentBooking.id);

      if (error) {
        console.error('Error completing job:', error);
        this.showToast('Error completing job', 'danger');
        return;
      }

      // Update local booking data
      this.currentBooking.status = 'completed';
      this.currentBooking.payment_status = 'paid';
      this.currentBooking.payment_method = 'cash';
      this.currentBooking.service_completed_at = new Date().toISOString();
      this.currentBooking.payment_completed_at = new Date().toISOString();

      this.showToast('Job completed successfully and payment marked as paid!', 'success');
      this.closeClientFoundModal();
      
    } catch (error) {
      console.error('Error completing job:', error);
      this.showToast('Error completing job', 'danger');
    }
  }


  // ========================================
  // MAP LOCATION METHODS
  // ========================================

  /**
   * Get current location from map component
   */
  getCurrentLocationFromMap(): Location | null {
    if (this.realTimeMapComponent && this.realTimeMapComponent.getCurrentLocation) {
      const location = this.realTimeMapComponent.getCurrentLocation();
      if (location) {
        this.currentLatitude = location.latitude;
        this.currentLongitude = location.longitude;
        return location;
      }
    }
    return null;
  }

  /**
   * Force map initialization and resize (for debugging)
   */
  forceMapInitialization() {
    console.log('🔄 Force initializing map...');
    
    // Get the map component reference
    const mapComponent = document.querySelector('app-real-time-map');
    if (mapComponent) {
      // Trigger resize events
      window.dispatchEvent(new Event('resize'));
      
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
        console.log('✅ Map resize events triggered');
      }, 300);
      
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
        console.log('✅ Final map resize event triggered');
      }, 1000);
    } else {
      console.error('❌ Map component not found');
    }
  }

  /**
   * Force location update
   */
  async forceLocationUpdate() {
    try {
      console.log('Forcing location update...');
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });

      if (position && position.coords) {
        this.currentLatitude = position.coords.latitude;
        this.currentLongitude = position.coords.longitude;
        
        // Get updated address
        this.currentAddress = await this.getAddressFromCoordinates(
          this.currentLatitude, 
          this.currentLongitude
        );
        
        console.log('Location force updated:', {
          latitude: this.currentLatitude,
          longitude: this.currentLongitude,
          address: this.currentAddress
        });

        // Update location in database
        await this.updateMechanicLocation({
          latitude: this.currentLatitude,
          longitude: this.currentLongitude,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('Error forcing location update:', error);
    }
  }

  /**
   * Handle location updates from the map component
   */
  onLocationUpdated(location: Location) {
    console.log('Mechanic location updated:', location);
    
    // Store the latest location
    this.currentLatitude = location.latitude;
    this.currentLongitude = location.longitude;
    
    // Update mechanic location in the database
    this.updateMechanicLocation(location);
    
    // Center map on mechanic's location
    this.centerMapOnMechanic();
  }

  /**
   * Handle mechanic location updates from the map component
   */
  onMechanicLocationUpdated(mechanicLocation: MechanicLocation) {
    console.log('Mechanic location updated:', mechanicLocation);
  }

  /**
   * Center map on mechanic's current location
   */
  centerMapOnMechanic() {
    if (this.realTimeMapComponent && this.currentLatitude && this.currentLongitude) {
      console.log('Centering map on mechanic location:', {
        lat: this.currentLatitude,
        lng: this.currentLongitude
      });
      
      // Use the real-time map component's centerOnUser method
      this.realTimeMapComponent.centerOnUser();
    }
  }

  /**
   * Update mechanic location in the database
   */
  private async updateMechanicLocation(location: Location) {
    // Try to get user_id from profile or auth
    let userId = this.profile?.user_id;
    
    if (!userId) {
      // Fallback: get user_id from auth session
      try {
        const { data: { session } } = await this.supabase.getSession();
        userId = session?.user?.id;
        console.log('Using user_id from auth session:', userId);
      } catch (error) {
        console.error('Error getting user_id from auth:', error);
        return;
      }
    }

    if (!userId) {
      console.error('Cannot update location: No user_id available');
      return;
    }

    console.log('Updating mechanic location:', {
      user_id: userId,
      latitude: location.latitude,
      longitude: location.longitude
    });

    try {
      const { error } = await this.supabase
        .from('profiles')
        .update({
          latitude: location.latitude,
          longitude: location.longitude,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating mechanic location:', error);
      } else {
        console.log('Mechanic location updated successfully in database:', location);
      }
    } catch (error) {
      console.error('Error updating mechanic location:', error);
    }
  }


  /**
   * Get client location from current booking
   */
  getClientLocation(): Location | null {
    if (!this.currentBooking || !this.currentBooking.client_latitude || !this.currentBooking.client_longitude) {
      return null;
    }

    return {
      latitude: this.currentBooking.client_latitude,
      longitude: this.currentBooking.client_longitude,
      timestamp: Date.now()
    };
  }

  /**
   * Get client location for modal map display
   */
  getClientLocationForModal() {
    return this.getClientLocation();
  }

  /**
   * Refresh the modal map
   */
  refreshModalMap() {
    console.log('Modal map refresh removed');
  }

  /**
   * Toggle map fullscreen mode
   */
  toggleMapFullscreen() {
    this.isMapFullscreen = !this.isMapFullscreen;
    console.log('Map fullscreen toggled:', this.isMapFullscreen);
    
    // Refresh map when toggling to ensure proper rendering
    setTimeout(() => {
      console.log('Map fullscreen toggle - map refresh removed');
      // Force a resize event to ensure map adapts to new dimensions
      window.dispatchEvent(new Event('resize'));
    }, 200); // Increased timeout for better rendering
  }

  /**
   * Create a test booking for debugging
   */
  async createTestBooking() {
    try {
      console.log('Creating test booking...');
      
      const testBooking = {
        client_id: 'test-client-123',
        mechanic_id: this.profile?.user_id,
        status: 'matched',
        required_specialization: 'Motorcycle Repair',
        client_phone: '+63 912 345 6789',
        notes: 'Battery issue - motorcycle won\'t start',
        client_address: 'SM North EDSA, Quezon City',
        client_latitude: 14.6539,
        client_longitude: 121.0285,
        created_at: new Date().toISOString()
      };
      
      const { data, error } = await this.supabase
        .from('bookings')
        .insert([testBooking])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating test booking:', error);
        this.showToast('Error creating test booking', 'danger');
        return;
      }
      
      console.log('Test booking created:', data);
      this.showToast('Test booking created successfully!', 'success');
      
      // Set as current booking to show the modal
      this.currentBooking = data;
      
    } catch (error) {
      console.error('Error creating test booking:', error);
      this.showToast('Error creating test booking', 'danger');
    }
  }

  /**
   * Close the service request popup
   */
  closeServiceRequestPopup() {
    this.currentBooking = null;
  }

  /**
   * Open fullscreen map page
   */
  openFullscreenMap() {
    // Open the simulation HTML file directly
    const simulationUrl = 'real-time-navigation-simulation.html';
    window.open(simulationUrl, '_blank');
  }

  /**
   * Get status text for display
   */
  getStatusText(status: string): string {
    switch (status) {
      case 'pending': return 'Pending';
      case 'matched': return 'Matched';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return 'Unknown';
    }
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    if (!dateString) return 'No date';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      return date.toLocaleString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  }

  /**
   * Get address from coordinates using Mapbox reverse geocoding
   */
  async getAddressFromCoordinates(lat: number, lng: number): Promise<string> {
    try {
      const mapboxToken = this.mapboxService.getAccessToken();
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&types=address,poi`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch address');
      }
      
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        // Get the most relevant address
        const feature = data.features[0];
        return feature.place_name || feature.text || 'Address not found';
      }
      
      return 'Address not found';
    } catch (error) {
      console.error('Error getting address:', error);
      return 'Unable to get address';
    }
  }


  /**
   * Start real-time tracking for the mechanic
   */
  private startMechanicTracking() {
    if (!this.profile?.user_id) return;

    console.log('Starting real-time tracking for mechanic:', this.profile.user_id);
    
    // Clear any existing interval
    if (this.locationTrackingInterval) {
      clearInterval(this.locationTrackingInterval);
    }
    
    // Set up interval to update mechanic location in database
    this.locationTrackingInterval = setInterval(async () => {
      try {
        const position = await Geolocation.getCurrentPosition();
        const location: Location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: Date.now()
        };
        
        await this.updateMechanicLocation(location);
      } catch (error) {
        console.error('Error updating mechanic location:', error);
      }
    }, 10000); // Update every 10 seconds
  }

  /**
   * Test map initialization
   */
  testMap() {
    console.log('Testing map initialization...');
    console.log('Map test - initialization removed');
  }

  /**
   * Test basic Mapbox functionality
   */
  testBasicMap() {
    // Check if Mapbox GL JS is loaded
    if (typeof (window as any).mapboxgl === 'undefined') {
      alert('Mapbox GL JS not loaded! Check if the script is included in index.html');
      return;
    }
    
    // Show test container
    const testContainer = document.getElementById('basic-map-test');
    if (testContainer) {
      testContainer.style.display = 'block';
      
      // Try to create a basic map
      try {
        const mapboxgl = (window as any).mapboxgl;
        mapboxgl.accessToken = mapboxConfig.accessToken;
        
        const map = new mapboxgl.Map({
          container: 'basic-map-test',
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [120.9842, 14.5995], // Manila
          zoom: 10
        });
        
        map.on('load', () => {
          testContainer.innerHTML = '<p style="color: green;">✅ Basic Map Loaded Successfully!</p>';
        });
        
        map.on('error', (e: any) => {
          testContainer.innerHTML = '<p style="color: red;">❌ Map Error: ' + e.error.message + '</p>';
        });
        
      } catch (error) {
        testContainer.innerHTML = '<p style="color: red;">❌ Error: ' + error + '</p>';
      }
    }
  }

  /**
   * Test modal and map container
   */
  testModalAndMap() {
    // Check if modal is showing
    const modalTest = document.querySelector('[style*="MODAL IS SHOWING"]');
    if (modalTest) {
      alert('Modal is showing!');
    } else {
      alert('Modal is NOT showing!');
    }
    
    // Check if map container exists
    const mapContainer = document.getElementById('mapbox-map');
    if (mapContainer) {
      const rect = mapContainer.getBoundingClientRect();
      alert(`Map container found! Dimensions: ${rect.width}x${rect.height}`);
    } else {
      alert('Map container NOT found!');
    }
  }

  /**
   * Test with fake mechanic ID
   */
  testWithFakeMechanicId() {
    // Set a fake profile for testing
    this.profile = {
      user_id: 'test-mechanic-123',
      full_name: 'Test Mechanic',
      email: 'test@example.com',
      phone: '1234567890',
      role: 'mechanic',
      approved: true,
      availability: 'available',
      specialization: ['general'],
      latitude: 14.5995,
      longitude: 120.9842,
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Show modal with fake data
    this.showClientFoundModal = true;
    
    // Force map container to have visible dimensions
    setTimeout(() => {
      const mapContainer = document.getElementById('mapbox-map');
      if (mapContainer) {
        mapContainer.style.width = '100%';
        mapContainer.style.height = '400px';
        mapContainer.style.minHeight = '400px';
        mapContainer.style.display = 'block';
        mapContainer.style.visibility = 'visible';
        mapContainer.style.background = 'red'; // Temporary red background to see if container is visible
      }
      
      // Initialize map after modal opens
    console.log('Map initialization removed');
    }, 500);
  }

  /**
   * Check profile loading status
   */
  async checkProfileStatus() {
    try {
      const profile = await this.profileService.getMyProfile();
      if (profile) {
        alert(`Profile loaded successfully!\nID: ${profile.user_id}\nName: ${profile.full_name}\nRole: ${profile.role}`);
      } else {
        alert('Profile is null - not loaded from database');
      }
    } catch (error) {
      alert(`Error loading profile: ${error}`);
    }
  }

  /**
   * Test map outside of modal
   */
  testMapOutsideModal() {
    // Create a simple map outside the modal
    const testContainer = document.getElementById('basic-map-test');
    if (testContainer) {
      testContainer.style.display = 'block';
      testContainer.style.height = '300px';
      testContainer.style.background = 'blue';
      
      // Try to create a map in this container
      if (typeof (window as any).mapboxgl !== 'undefined') {
        const mapboxgl = (window as any).mapboxgl;
        mapboxgl.accessToken = mapboxConfig.accessToken;
        
        try {
          const map = new mapboxgl.Map({
            container: 'basic-map-test',
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [120.9842, 14.5995],
            zoom: 10
          });
          
          map.on('load', () => {
            testContainer.innerHTML = '<p style="color: green; font-size: 18px;">✅ Map loaded successfully outside modal!</p>';
          });
          
          map.on('error', (e: any) => {
            testContainer.innerHTML = '<p style="color: red;">❌ Map error: ' + e.error.message + '</p>';
          });
          
        } catch (error) {
          testContainer.innerHTML = '<p style="color: red;">❌ Error: ' + error + '</p>';
        }
      } else {
        testContainer.innerHTML = '<p style="color: red;">❌ Mapbox GL JS not loaded</p>';
      }
    }
  }

  /**
   * Test Mapbox token validity
   */
  async testMapboxToken() {
    const token = environment.mapboxAccessToken;
    
    try {
      // Test the token by making a simple API call
      const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/Manila.json?access_token=${token}`);
      
      if (response.ok) {
        alert('✅ Mapbox token is valid!');
      } else {
        alert(`❌ Mapbox token error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      alert(`❌ Network error testing token: ${error}`);
    }
  }

  /**
   * Show toast notification
   */
  async showToast(message: string, color: string = 'primary') {
    const toast = document.createElement('ion-toast');
    toast.message = message;
    toast.duration = 3000;
    toast.color = color;
    toast.position = 'top';
    document.body.appendChild(toast);
    await toast.present();
  }

  /**
   * Get estimated distance to client
   */
  getEstimatedDistance(): string {
    // This would typically calculate distance between mechanic and client
    // For now, return a placeholder
    return '2.5 km';
  }

  /**
   * Get estimated time to client
   */
  getEstimatedTime(): string {
    // This would typically calculate ETA based on distance and traffic
    // For now, return a placeholder
    return '8 min';
  }

  /**
   * Get formatted address from coordinates
   */
  getFormattedAddress(): string {
    if (this.currentBooking?.client_latitude && this.currentBooking?.client_longitude) {
      // This would typically use reverse geocoding
      // For now, return a placeholder
      return 'Client Location, Quezon City';
    }
    return 'Location not available';
  }

  /**
   * Open navigation app with client location
   */
  openNavigationApp() {
    if (this.currentBooking?.client_latitude && this.currentBooking?.client_longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${this.currentBooking.client_latitude},${this.currentBooking.client_longitude}`;
      window.open(url, '_blank');
    } else {
      this.showToast('Client location not available', 'warning');
    }
  }

  /**
   * Call client
   */
  callClient() {
    if (this.currentClient?.phone) {
      window.open(`tel:${this.currentClient.phone}`, '_self');
    } else {
      this.showToast('Client phone number not available', 'warning');
    }
  }

  /**
   * Get client phone from database
   */
  getClientPhone(): string {
    if (!this.currentBooking) {
      return 'No phone';
    }
    
    // First try to get from loaded client details
    if (this.currentClient?.phone) {
      return this.currentClient.phone;
    }
    
    // Try to get from booking's client_phone field
    if (this.currentBooking.client_phone) {
      return this.currentBooking.client_phone;
    }
    
    // If client details not loaded, try to load them (but don't cause infinite loops)
    if (this.currentBooking.client_id && !this.currentClient) {
      // Only load if not already loading to prevent infinite loops
      if (!this.isLoadingClientDetails) {
        this.isLoadingClientDetails = true;
        this.loadClientDetails(this.currentBooking.client_id).finally(() => {
          this.isLoadingClientDetails = false;
        });
      }
      return 'Loading...';
    }
    
    return 'No phone';
  }
  getClientName(): string {
    if (!this.currentBooking) {
      return 'Unknown Client';
    }
    
    // First try to get from loaded client details
    if (this.currentClient?.full_name) {
      return this.currentClient.full_name;
    }
    
    // If client details not loaded, try to load them (but don't cause infinite loops)
    if (this.currentBooking.client_id && !this.currentClient) {
      // Only load if not already loading to prevent infinite loops
      if (!this.isLoadingClientDetails) {
        this.isLoadingClientDetails = true;
        this.loadClientDetails(this.currentBooking.client_id).finally(() => {
          this.isLoadingClientDetails = false;
        });
      }
      return 'Loading...';
    }
    
    // Fallback to generic name
    return 'Client';
  }
  getMotorcycleModel(): string {
    if (!this.currentBooking) {
      return 'Unknown Model';
    }
    
    // First try to get from database field
    if (this.currentBooking.motorcycle_model) {
      return this.currentBooking.motorcycle_model;
    }
    
    // Try to extract motorcycle model from notes
    if (this.currentBooking.notes) {
      const notes = this.currentBooking.notes.toLowerCase();
      
      // Common motorcycle brands/models to look for
      const motorcyclePatterns = [
        /honda\s+(\w+)/i,
        /yamaha\s+(\w+)/i,
        /kawasaki\s+(\w+)/i,
        /suzuki\s+(\w+)/i,
        /ducati\s+(\w+)/i,
        /bmw\s+(\w+)/i,
        /ktm\s+(\w+)/i,
        /harley\s+(\w+)/i,
        /motorcycle[:\s]+([^,\n]+)/i,
        /bike[:\s]+([^,\n]+)/i
      ];
      
      for (const pattern of motorcyclePatterns) {
        const match = this.currentBooking.notes.match(pattern);
        if (match) {
          return match[1] || match[0];
        }
      }
    }
    
    // Fallback based on specialization
    switch (this.currentBooking.required_specialization) {
      case 'tire-assistance':
        return 'Honda CBR';
      case 'engine-repair':
        return 'Yamaha R1';
      case 'electrical':
        return 'Kawasaki Ninja';
      default:
        return 'Motorcycle';
    }
  }

  /**
   * Close service request modal
   */
  closeServiceRequestModal() {
    this.showServiceRequestModal = false;
    this.currentBooking = null;
    this.currentClient = null;
    this.clientLocation = null;
    this.servicePrice = null;
    this.isMapFullscreen = false; // Reset fullscreen state when closing modal
  }

  /**
   * Get distance to client using Haversine formula
   */
  getDistance(): string {
    if (!this.currentBooking?.client_latitude || !this.currentBooking?.client_longitude) {
      return '0';
    }
    
    const distance = this.distanceCalculator.calculateDistanceToClient(
      this.currentLatitude,
      this.currentLongitude,
      this.currentBooking.client_latitude,
      this.currentBooking.client_longitude,
      'km'
    );

    return this.distanceCalculator.formatDistance(distance, 'km', 1);
  }

  /**
   * Get estimated travel time to client
   */
  getEstimatedTravelTime(): string {
    if (!this.currentBooking?.client_latitude || !this.currentBooking?.client_longitude) {
      return '0 min';
    }
    
    const distance = this.distanceCalculator.calculateDistanceToClient(
      this.currentLatitude,
      this.currentLongitude,
      this.currentBooking.client_latitude,
      this.currentBooking.client_longitude,
      'km'
    );

    const timeInMinutes = this.distanceCalculator.getEstimatedTravelTime(distance);
    return this.distanceCalculator.formatTravelTime(timeInMinutes);
  }

  /**
   * Decline service request
   */
  async declineRequest() {
    if (!this.currentBooking) return;

    try {
      const { error } = await this.supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', this.currentBooking.id);

      if (error) {
        console.error('Error declining request:', error);
        this.showToast('Error declining request', 'danger');
        return;
      }

      this.showToast('Request declined', 'success');
      this.closeServiceRequestModal();
    } catch (error) {
      console.error('Error declining request:', error);
      this.showToast('Error declining request', 'danger');
    }
  }

  /**
   * Accept service request
   */
  async acceptRequest() {
    if (!this.currentBooking) return;

    try {
      const updateData: any = { 
        status: 'in_progress',
        mechanic_id: this.profile?.user_id
      };

      const { error } = await this.supabase
        .from('bookings')
        .update(updateData)
        .eq('id', this.currentBooking.id);

      if (error) {
        console.error('Error accepting request:', error);
        this.showToast('Error accepting request', 'danger');
        return;
      }

      this.showToast('Request accepted! Please set your service price.', 'success');
      // Update current booking status
      this.currentBooking.status = 'in_progress';
    } catch (error) {
      console.error('Error accepting request:', error);
      this.showToast('Error accepting request', 'danger');
    }
  }

  /**
   * Set service price
   */
  async setServicePrice() {
    if (!this.currentBooking || !this.servicePrice || this.servicePrice <= 0) {
      this.showToast('Please enter a valid price', 'warning');
      return;
    }

    try {
      const { error } = await this.supabase
        .from('bookings')
        .update({ 
          service_price: this.servicePrice
        })
        .eq('id', this.currentBooking.id);

      if (error) {
        console.error('Error setting price:', error);
        this.showToast('Error setting price', 'danger');
        return;
      }

      this.showToast('Price set successfully!', 'success');
      // Update current booking
      this.currentBooking.service_price = this.servicePrice;
    } catch (error) {
      console.error('Error setting price:', error);
      this.showToast('Error setting price', 'danger');
    }
  }

  /**
   * Debug method to manually check for bookings
   */
  async debugCheckBookings() {
    console.log('=== DEBUG: Manual booking check ===');
    console.log('Current profile:', this.profile);
    console.log('Current booking:', this.currentBooking);
    console.log('Show service request modal:', this.showServiceRequestModal);
    
    // Test database access step by step
    console.log('=== TESTING DATABASE ACCESS ===');
    
    // Test 1: Check if we can access our own profile
    try {
      const { data: myProfile, error: profileError } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('user_id', this.profile?.user_id)
        .single();

      if (profileError) {
        console.error('❌ Error accessing own profile:', profileError);
      } else {
        console.log('✅ Successfully accessed own profile:', myProfile);
      }
    } catch (error) {
      console.error('❌ Exception accessing own profile:', error);
    }
    
    // Test 2: Check if we can access bookings where we are the mechanic
    try {
      const { data: mechanicBookings, error: mechanicError } = await this.supabase
        .from('bookings')
        .select('*')
        .eq('mechanic_id', this.profile?.user_id)
        .order('created_at', { ascending: false });

      if (mechanicError) {
        console.error('❌ Error accessing mechanic bookings:', mechanicError);
      } else {
        console.log('✅ Successfully accessed mechanic bookings:', mechanicBookings);
      }
    } catch (error) {
      console.error('❌ Exception accessing mechanic bookings:', error);
    }
    
    // Test 3: Check if we can access all bookings (should fail for non-admin)
    try {
      const { data: allBookings, error: allError } = await this.supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (allError) {
        console.log('⚠️ Expected error accessing all bookings (non-admin):', allError.message);
      } else {
        console.log('✅ Successfully accessed all bookings (admin?):', allBookings);
      }
    } catch (error) {
      console.error('❌ Exception accessing all bookings:', error);
    }
    
    // Test 4: Check if we can access client profiles
    try {
      const { data: clientProfiles, error: clientError } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('role', 'client')
        .limit(5);

      if (clientError) {
        console.error('❌ Error accessing client profiles:', clientError);
      } else {
        console.log('✅ Successfully accessed client profiles:', clientProfiles);
      }
    } catch (error) {
      console.error('❌ Exception accessing client profiles:', error);
    }
    
    // Force check for bookings
    console.log('=== RUNNING NORMAL BOOKING CHECK ===');
    await this.checkForNewBookings();
    
    this.showToast('Debug check completed. Check console for database access results.', 'primary');
  }

  /**
   * Debug method to set mechanic as available and approved
   */
  async debugSetAvailable() {
    if (!this.profile) {
      this.showToast('No profile loaded', 'danger');
      return;
    }

    try {
      // Set mechanic as available and approved
      const { error } = await this.supabase
        .from('profiles')
        .update({ 
          availability: 'available',
          approved: true
        })
        .eq('user_id', this.profile.user_id);

      if (error) {
        console.error('Error setting mechanic as available:', error);
        this.showToast('Error setting availability', 'danger');
        return;
      }

      console.log('Mechanic set as available and approved');
      this.showToast('Mechanic set as available and approved', 'success');
      
      // Reload profile data
      await this.loadUserData();
    } catch (error) {
      console.error('Error in debug set available:', error);
      this.showToast('Error setting availability', 'danger');
    }
  }

  /**
   * Debug method to manually show the service request modal
   */
  async debugShowModal() {
    console.log('=== DEBUG: Manually showing modal ===');
    
    // Create a mock booking for testing
    this.currentBooking = {
      id: 999,
      client_id: 'test-client-id',
      mechanic_id: this.profile?.user_id || 'test-mechanic-id',
      status: 'matched',
      required_specialization: 'tire-assistance',
      notes: 'Phone: +1234567890\nMotorcycle Model: Honda CBR\nPayment Method: cash\nIssue: Flat tire',
      client_latitude: 14.5995,
      client_longitude: 120.9842,
      mechanic_latitude: null,
      mechanic_longitude: null,
      service_price: null,
      motorcycle_model: 'Honda CBR',
      client_phone: '+1234567890',
      payment_method: 'cash',
      mechanic_score: null,
      distance_km: null,
      payment_status: 'pending',
      service_completed_at: null,
      payment_completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Create a mock client
    this.currentClient = {
      user_id: 'test-client-id',
      full_name: 'Test Client',
      phone: '+1234567890',
      email: 'test@example.com',
      role: 'client',
      motorcycle_model: 'Honda CBR',
      approved: true,
      availability: 'available',
      specialization: [],
      latitude: 14.5995,
      longitude: 120.9842,
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Mock booking created:', this.currentBooking);
    console.log('Mock client created:', this.currentClient);
    
    this.showServiceRequestModal = true;
    this.showToast('Debug modal shown with mock data', 'success');
  }

  /**
   * Debug method to test availability update
   */
  async debugTestAvailability() {
    console.log('=== DEBUG: Testing Availability Update ===');
    console.log('Current profile:', this.profile);
    console.log('Current availability:', this.profile?.availability);
    console.log('Current isOnline:', this.isOnline);
    
    if (!this.profile) {
      this.showToast('No profile loaded', 'danger');
      return;
    }

    try {
      // Test setting availability to 'available'
      console.log('Testing setAvailability to "available"...');
      const result = await this.profileService.setAvailability('available');
      console.log('✅ Successfully set availability to available:', result);
      
      // Reload profile to verify
      console.log('Reloading profile to verify...');
      await this.loadUserData();
      
      console.log('Profile after reload:', this.profile);
      console.log('Availability after reload:', this.profile?.availability);
      console.log('isOnline after reload:', this.isOnline);
      
      this.showToast('Availability test completed. Check console for details.', 'success');
    } catch (error) {
      console.error('❌ Error testing availability update:', error);
      this.showToast('Error testing availability update', 'danger');
    }
  }

  /**
   * Check if there's an active booking
   */
  hasActiveBooking(): boolean {
    return this.currentBooking !== null && 
           this.currentBooking !== undefined &&
           (this.currentBooking.status === 'matched' || 
            this.currentBooking.status === 'in_progress');
  }

  /**
   * Get client location for navigation
   */
  getClientLocationForNavigation(): Location | null {
    if (!this.hasActiveBooking() || !this.currentBooking!.client_latitude || !this.currentBooking!.client_longitude) {
      return null;
    }
    
    return {
      latitude: this.currentBooking!.client_latitude,
      longitude: this.currentBooking!.client_longitude,
      timestamp: Date.now()
    };
  }

  /**
   * Get client location for map
   */
  getClientLocationForMap(): Location | null {
    if (!this.hasActiveBooking() || 
        !this.currentBooking!.client_latitude ||
        !this.currentBooking!.client_longitude) {
      return null;
    }

    return {
      latitude: this.currentBooking!.client_latitude,
      longitude: this.currentBooking!.client_longitude,
      timestamp: Date.now()
    };
  }

  /**
   * Center map on client location
   */
  centerOnClient() {
    if (this.realTimeMapComponent) {
      this.realTimeMapComponent.centerOnClient();
    }
  }

  /**
   * Center map on mechanic location
   */
  centerOnMechanic() {
    if (this.realTimeMapComponent) {
      this.realTimeMapComponent.centerOnUser();
    }
  }

  /**
   * Get distance to client
   */
  getDistanceToClient(): string {
    if (!this.hasActiveBooking() || 
        !this.currentLatitude || 
        !this.currentLongitude ||
        !this.currentBooking ||
        !this.currentBooking.client_latitude ||
        !this.currentBooking.client_longitude) {
      return 'Unknown';
    }
    
    try {
      const distance = this.distanceCalculator.calculateDistance(
        this.currentLatitude,
        this.currentLongitude,
        this.currentBooking.client_latitude,
        this.currentBooking.client_longitude
      );
      
      return `${distance.toFixed(1)} km`;
    } catch (error) {
      console.error('Error calculating distance:', error);
      return 'Unknown';
    }
  }

  /**
   * Start navigation to client
   */
  startNavigation() {
    if (!this.hasActiveBooking() || 
        !this.currentBooking!.client_latitude ||
        !this.currentBooking!.client_longitude) {
      console.error('No active booking with client location to navigate to');
      return;
    }
    
    console.log('Starting enhanced navigation to client...');
    
    // Close the minimized notification
    this.isServiceRequestExpanded = false;
    
    // Navigate to the internal real-time navigation page with enhanced parameters
    this.router.navigate(['/mechanic/real-time-navigation'], {
      queryParams: {
        mechanicId: this.profile?.user_id,
        clientLat: this.currentBooking!.client_latitude,
        clientLng: this.currentBooking!.client_longitude,
        clientName: 'Client',
        mechanicLat: this.currentLatitude,
        mechanicLng: this.currentLongitude,
        clientPhone: this.currentBooking!.client_phone || '',
        enableTraffic: 'true',
        enableVoiceGuidance: 'true',
        avoidTolls: 'false',
        showNavigationInstructions: 'true'
      }
    });
    
    this.showToast('Starting navigation with turn-by-turn directions', 'success');
  }
} 