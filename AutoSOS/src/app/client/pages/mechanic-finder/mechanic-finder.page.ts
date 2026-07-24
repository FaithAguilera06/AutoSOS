import { Component, OnInit, OnDestroy, ViewChild, ViewEncapsulation } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Geolocation } from '@capacitor/geolocation';
import { ToastController } from '@ionic/angular';
import { ProfileService } from '../../../profile.service';
import { BookingService } from '../../../booking.service';
import { SupabaseService } from '../../../supabase.service';
import { MapboxService, Location, MechanicLocation } from '../../../mapbox.service';
import { DistanceCalculatorService } from '../../../utils/distance-calculator.service';
import { MultiCriteriaScoringService, MechanicScore } from '../../../services/multi-criteria-scoring.service';
import { RealTimeMapComponent } from '../../../components/real-time-map.component';
import type { Profile } from '../../../models';

export interface Mechanic {
  id: string;
  name: string;
  specialty: string;
  specialization: string[]; // Array of specializations for scoring
  distance: number;
  rating: number;
  phone: string;
  email?: string;
  address: string;
  latitude: number;
  longitude: number;
  isAvailable: boolean;
  experience: number;
  languages: string[];
  avatar_url?: string;
  review_count?: number;
  eta?: number;
  // Enhanced scoring properties
  totalScore?: number;
  scoreBreakdown?: {
    distance: number;
    specialization: number;
    rating: number;
    availability: number;
    experience: number;
    responseTime: number;
  };
}

@Component({
  selector: 'app-mechanic-finder',
  templateUrl: 'mechanic-finder.page.html',
  styleUrls: ['mechanic-finder.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, RealTimeMapComponent],
  encapsulation: ViewEncapsulation.None
})
export class MechanicFinderPage implements OnInit, OnDestroy {
  @ViewChild('realTimeMap') realTimeMapComponent!: RealTimeMapComponent;
  
  // Location properties
  currentLatitude: number = 0;
  currentLongitude: number = 0;
  locationStatus: 'loading' | 'success' | 'error' = 'loading';
  locationStatusTitle: string = 'Getting your location...';
  locationStatusDescription: string = 'Please allow location access to find nearby mechanics';
  
  // Loading states
  isLoadingLocation: boolean = true;
  isLoadingMechanics: boolean = false;
  loadingText: string = 'Getting your location...';
  
  // Search filters
  searchRadius: number = 5;
  selectedSpecialty: string = '';
  minRating: number = 0;
  
  // Service request form
  selectedIssue: string = '';
  customIssue: string = '';
  selectedPaymentMethodForm: string = '';
  motorcycleModel: string = '';
  
  // Mechanic found modal
  showMechanicFoundModal: boolean = false;
  showMechanicDetails: boolean = false;
  showServiceInProgressModal: boolean = false;
  showLoadingState: boolean = false;
  
  // Bottom sheet state
  isBottomSheetExpanded: boolean = false;
  
  // Payment Modal
  showPaymentModal = false;
  selectedPaymentMethod: 'cash' | 'card' | 'facial_recognition' | null = null;
  facialRecognitionCompleted = false;
  facialRecognitionError = false;
  isProcessingFacialRecognition = false;
  isProcessingPayment = false;
  touchStartY: number = 0;
  touchCurrentY: number = 0;
  
  // Mechanics data
  nearbyMechanics: Mechanic[] = [];
  allMechanics: Mechanic[] = [];
  
  // Map properties
  private map: any;
  private userMarker: any;
  private mechanicMarkers: any[] = [];
  
  // Authentication state
  isUserAuthenticated: boolean = false;
  
  // Notification tracking to prevent spam
  private notificationShownForBooking: number | null = null;
  
  // Booking status checking
  private bookingCheckInterval: any;
  currentBooking: any = null;

  // Real-time tracking properties
  isRealTimeTracking = false;
  currentMechanicLocation: MechanicLocation | null = null;
  trackingMechanicId: string | null = null;
  selectedMechanic: Mechanic | null = null;
  showLocationSearch = false;

  // Location search properties
  searchQuery = '';
  searchSuggestions: any[] = [];
  nearbyPlaces: any[] = [];
  currentAddress = '';

  
  constructor(
    private router: Router,
    private toastController: ToastController,
    private profileService: ProfileService,
    private bookingService: BookingService,
    private supabaseService: SupabaseService,
    private mapboxService: MapboxService,
    private distanceCalculator: DistanceCalculatorService,
    private scoringService: MultiCriteriaScoringService
  ) {}
  
  ngOnInit() {
    this.initializeMechanicFinder();
    this.startBookingStatusCheck();
  }

  ionViewWillEnter() {
    // Check for active bookings when returning to this page
    this.checkForActiveBookings();
  }

  /**
   * Manually show existing booking modal (called by user action)
   */
  showExistingBookingModal() {
    if (this.currentBooking) {
      this.showMechanicFoundModal = true;
      
      // Initialize the map if needed
      setTimeout(() => {
        if (this.realTimeMapComponent) {
          this.realTimeMapComponent.initializeMapManually();
        }
      }, 100);
    } else {
      this.showToast('No active booking found', 'warning');
    }
  }

  /**
   * Check for active bookings and restore modal state
   * NOTE: Modified to NOT automatically show modal - only track current booking
   */
  async checkForActiveBookings() {
    try {
      const { data: sessionData } = await this.supabaseService.getSession();
      if (!sessionData.session?.user) {
        return;
      }

      const userId = sessionData.session.user.id;

      // Get the latest booking for this user
      const { data: bookings, error } = await this.supabaseService
        .from('bookings')
        .select('*')
        .eq('client_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching bookings:', error);
        return;
      }

      if (bookings && bookings.length > 0) {
        const latestBooking = bookings[0];
        
        // Only track the current booking, but don't automatically show modal
        // The modal should only show when user explicitly submits a request
        // Exclude completed bookings to allow new bookings
        if (latestBooking.status === 'matched' || 
            latestBooking.status === 'in_progress') {
          
          // Just track the current booking without showing modal
          this.currentBooking = latestBooking;
          console.log('Found active booking:', latestBooking.id, 'Status:', latestBooking.status);
          
          // Reset payment states when loading existing booking
          this.resetPaymentStates();
          
          // Don't automatically show modal - let user decide when to view it
        }
      }
    } catch (error) {
      console.error('Error checking for active bookings:', error);
    }
  }
  
  ngOnDestroy() {
    // Clean up map resources
    if (this.map) {
      // Clean up Google Maps instance
    }
    if (this.bookingCheckInterval) {
      clearInterval(this.bookingCheckInterval);
    }
  }
  
  /**
   * Initialize the mechanic finder
   */
  async initializeMechanicFinder() {
    try {
      // Check authentication first
      const isAuthenticated = await this.checkAuthentication();
      if (!isAuthenticated) {
        this.showToast('Please log in to use the mechanic finder', 'warning');
        return; // Don't redirect automatically, let user choose
      }

      await this.getCurrentLocation();
      // Load real mechanics from database instead of mock data
      await this.findNearbyMechanics();
      this.initializeMap();
    } catch (error) {
      console.error('Error initializing mechanic finder:', error);
      this.handleLocationError();
    }
  }
  
  /**
   * Get current GPS location
   */
  async getCurrentLocation() {
    this.isLoadingLocation = true;
    this.loadingText = 'Getting your location...';
    this.locationStatus = 'loading';
    this.locationStatusTitle = 'Getting your location...';
    this.locationStatusDescription = 'Please allow location access to find nearby mechanics';
    
    try {
      // Check if we're running on web or mobile
      if (this.isWebPlatform()) {
        await this.getWebLocation();
      } else {
        await this.getMobileLocation();
      }
    } catch (error) {
      console.error('Error getting location:', error);
      this.handleLocationError('Unable to get your location. Please check your device settings.');
    }
  }
  
  /**
   * Check if running on web platform
   */
  private isWebPlatform(): boolean {
    return !!(window.navigator && window.navigator.geolocation);
  }

  /**
   * Get location using web browser's Geolocation API
   */
  private async getWebLocation() {
    return new Promise<void>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.currentLatitude = position.coords.latitude;
          this.currentLongitude = position.coords.longitude;
          
          this.locationStatus = 'success';
          this.locationStatusTitle = 'Location Found';
          this.locationStatusDescription = `You are at ${this.currentLatitude.toFixed(4)}, ${this.currentLongitude.toFixed(4)}`;
          
          this.isLoadingLocation = false;
          
          // Location loaded successfully
          resolve();
        },
        (error) => {
          let errorMessage = 'Failed to get your location.';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out. Please try again.';
              break;
          }
          this.handleLocationError(errorMessage);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  }

  /**
   * Get location using Capacitor Geolocation plugin (mobile)
   */
  private async getMobileLocation() {
    try {
      // Check if geolocation is available
      const permissions = await Geolocation.checkPermissions();
      
      if (permissions.location === 'granted') {
        await this.requestMobileLocation();
      } else if (permissions.location === 'denied') {
        this.handleLocationError('Location access denied. Please enable location services in your device settings.');
      } else {
        // Request permission
        const requestResult = await Geolocation.requestPermissions();
        if (requestResult.location === 'granted') {
          await this.requestMobileLocation();
        } else {
          this.handleLocationError('Location permission denied. Please enable location access to use this feature.');
        }
      }
    } catch (error) {
      console.error('Error getting mobile location:', error);
      this.handleLocationError('Unable to get your location. Please check your device settings.');
    }
  }

  /**
   * Request location from mobile device using Capacitor
   */
  private async requestMobileLocation() {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });
      
      this.currentLatitude = position.coords.latitude;
      this.currentLongitude = position.coords.longitude;
      
      this.locationStatus = 'success';
      this.locationStatusTitle = 'Location Found';
      this.locationStatusDescription = `You are at ${this.currentLatitude.toFixed(4)}, ${this.currentLongitude.toFixed(4)}`;
      
      this.isLoadingLocation = false;
      
      // Location updated successfully
      
    } catch (error) {
      console.error('Error requesting mobile location:', error);
      this.handleLocationError('Failed to get your location. Please try again.');
    }
  }
  
  /**
   * Handle location errors
   */
  private handleLocationError(message: string = 'Location service unavailable') {
    this.locationStatus = 'error';
    this.locationStatusTitle = 'Location Error';
    this.locationStatusDescription = message;
    this.isLoadingLocation = false;
    
    // Show error toast
    this.showToast(message, 'danger');
    
    // For demo purposes, use a default location (Manila, Philippines)
    // In a real app, you might want to ask the user to enter their location manually
    this.currentLatitude = 14.5995;
    this.currentLongitude = 120.9842;
    
    // Use default location for mechanic search
    console.log('Using default location for mechanic search');
  }
  
  /**
   * Initialize Google Maps
   */
  private initializeMap() {
    // TODO: Initialize Google Maps API
    // This would require Google Maps API key and proper setup
    // For now, we'll create a placeholder map container
    
    setTimeout(() => {
      this.updateMapWithUserLocation();
    }, 1000);
  }
  
  /**
   * Update map with user location
   */
  private updateMapWithUserLocation() {
    if (this.currentLatitude && this.currentLongitude) {
      // TODO: Update Google Maps with user location
      // This would involve setting the map center and adding a user marker
      console.log('User location:', this.currentLatitude, this.currentLongitude);
    }
  }
  
  /**
   * Load mock mechanics data
   */
  private loadMockMechanics() {
    // Use current location if available, otherwise use default Manila coordinates
    const baseLat = this.currentLatitude || 14.5995;
    const baseLng = this.currentLongitude || 120.9842;
    
    this.allMechanics = [
      {
        id: '1',
        name: 'Juan Santos',
        specialty: 'Engine Specialist',
        specialization: ['engine and mechanical'],
        distance: 2.5,
        rating: 4.8,
        phone: '+63 912 345 6789',
        address: '123 Main St, Quezon City',
        latitude: baseLat + 0.01,
        longitude: baseLng + 0.01,
        isAvailable: true,
        experience: 15,
        languages: ['English', 'Tagalog']
      },
      {
        id: '2',
        name: 'Maria Garcia',
        specialty: 'Electrical Specialist',
        specialization: ['electrical'],
        distance: 3.2,
        rating: 4.6,
        phone: '+63 923 456 7890',
        address: '456 Oak Ave, Makati',
        latitude: baseLat - 0.008,
        longitude: baseLng + 0.015,
        isAvailable: true,
        experience: 12,
        languages: ['English', 'Tagalog', 'Spanish']
      },
      {
        id: '3',
        name: 'Pedro Martinez',
        specialty: 'Brake Specialist',
        specialization: ['general repair'],
        distance: 1.8,
        rating: 4.9,
        phone: '+63 934 567 8901',
        address: '789 Pine St, Manila',
        latitude: baseLat + 0.005,
        longitude: baseLng - 0.012,
        isAvailable: true,
        experience: 18,
        languages: ['English', 'Tagalog']
      },
      {
        id: '4',
        name: 'Ana Rodriguez',
        specialty: 'General Mechanic',
        specialization: ['general repair'],
        distance: 4.1,
        rating: 4.4,
        phone: '+63 945 678 9012',
        address: '321 Elm St, Pasig',
        latitude: baseLat - 0.015,
        longitude: baseLng - 0.008,
        isAvailable: false,
        experience: 10,
        languages: ['English', 'Tagalog']
      },
      {
        id: '5',
        name: 'Carlos Lopez',
        specialty: 'Engine Specialist',
        specialization: ['engine and mechanical'],
        distance: 5.3,
        rating: 4.7,
        phone: '+63 956 789 0123',
        address: '654 Maple Dr, Taguig',
        latitude: baseLat + 0.02,
        longitude: baseLng - 0.025,
        isAvailable: true,
        experience: 20,
        languages: ['English', 'Tagalog', 'Spanish']
      }
    ];
  }
  
  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Convert Profile to Mechanic interface
   */
  private profileToMechanic(profile: Profile): Mechanic {
    // Use straight-line distance for initial filtering, will be updated with driving distance later
    const straightLineDistance = this.calculateDistance(
      this.currentLatitude,
      this.currentLongitude,
      profile.latitude || 0,
      profile.longitude || 0
    );

    return {
      id: profile.user_id,
      name: profile.full_name || 'Unknown Mechanic',
      specialty: (profile.specialization && Array.isArray(profile.specialization)) 
        ? profile.specialization.join(', ') 
        : 'General',
      // Keep the original specialization array for scoring
      specialization: profile.specialization || ['General'],
      distance: Math.round(straightLineDistance * 10) / 10, // Round to 1 decimal place
      rating: 4.5, // Default rating - could be added to database later
      phone: '+63 912 345 6789', // Default phone - could be added to database later
      address: 'Manila, Philippines', // Default address - could be added to database later
      latitude: profile.latitude || 0,
      longitude: profile.longitude || 0,
      isAvailable: profile.availability === 'available',
      experience: 5, // Default experience - could be added to database later
      languages: ['English', 'Tagalog'] // Default languages - could be added to database later
    };
  }

  /**
   * Apply multi-criteria scoring to mechanics
   */
  private applyMultiCriteriaScoring() {
    if (!this.selectedIssue || this.nearbyMechanics.length === 0) {
      return;
    }

    console.log('🔍 Applying multi-criteria scoring for issue:', this.selectedIssue);

    // Create a mock booking object for scoring
    const mockBooking = {
      required_specialization: this.getSpecializationFromIssue(this.selectedIssue),
      client_latitude: this.currentLatitude,
      client_longitude: this.currentLongitude
    };

    console.log('📋 Mock booking for scoring:', mockBooking);

    // Calculate scores for each mechanic
    const scoredMechanics = this.nearbyMechanics.map(mechanic => {
      const score = this.scoringService.calculateMechanicScore(mechanic, mockBooking);
      
      return {
        ...mechanic,
        totalScore: score.totalScore,
        scoreBreakdown: score.breakdown
      };
    });

    // Sort by total score (highest first)
    this.nearbyMechanics = scoredMechanics.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
    
    console.log('🏆 Mechanics sorted by multi-criteria score:', this.nearbyMechanics.map(m => ({
      name: m.name,
      totalScore: m.totalScore,
      breakdown: m.scoreBreakdown
    })));
  }

  /**
   * Map issue to specialization for scoring
   */
  private getSpecializationFromIssue(issue: string): string {
    const issueMapping: { [key: string]: string } = {
      'tire_assistance': 'general repair',
      'tire-assistance': 'general repair',
      'emergency_fuel': 'general repair',
      'emergency-fuel': 'general repair',
      'oil_leak': 'engine and mechanical',
      'oil-leak': 'engine and mechanical',
      'overheating': 'engine and mechanical',
      'non_functional_brake_lights': 'electrical',
      'non-functional-brake-lights': 'electrical',
      'short_circuit': 'electrical',
      'short-circuit': 'electrical',
      'dead_battery': 'electrical',
      'dead-battery': 'electrical'
    };

    console.log('🔍 Mapping issue to specialization:', {
      inputIssue: issue,
      mappedSpecialization: issueMapping[issue] || 'general repair'
    });

    return issueMapping[issue] || 'general repair';
  }

  /**
   * Find the best mechanic for a booking using multi-criteria scoring
   */
  private async findBestMechanicForBooking(booking: any): Promise<Mechanic | null> {
    if (!this.nearbyMechanics.length) {
      return null;
    }

    console.log('🎯 Finding best mechanic for booking:', {
      bookingId: booking.id,
      requiredSpecialization: booking.required_specialization,
      availableMechanics: this.nearbyMechanics.length
    });

    // Create a mock booking object for scoring
    const mockBooking = {
      required_specialization: booking.required_specialization,
      client_latitude: this.currentLatitude,
      client_longitude: this.currentLongitude
    };

    console.log('📋 === MECHANIC SCORING FOR ALL AVAILABLE MECHANICS ===');
    console.log('📋 Booking Details:', mockBooking);
    console.log('📋 Total Available Mechanics:', this.nearbyMechanics.length);

    // Calculate scores for each mechanic with detailed logging
    const scoredMechanics = this.nearbyMechanics.map((mechanic, index) => {
      console.log(`\n🔍 === MECHANIC ${index + 1}/${this.nearbyMechanics.length} ===`);
      console.log('📋 Mechanic Details:', {
        id: mechanic.id,
        name: mechanic.name,
        specialization: mechanic.specialization,
        distance: mechanic.distance,
        latitude: mechanic.latitude,
        longitude: mechanic.longitude
      });

      const score = this.scoringService.calculateMechanicScore(mechanic, mockBooking);
      
      console.log('📊 Score Calculation Result:', {
        mechanicId: score.mechanicId,
        totalScore: score.totalScore,
        breakdown: score.breakdown,
        criteriaScores: score.criteriaScores
      });

      const scoredMechanic = {
        ...mechanic,
        totalScore: score.totalScore,
        scoreBreakdown: score.breakdown
      };

      console.log(`✅ Mechanic ${index + 1} Final Score: ${score.totalScore}`);
      console.log(`   - Distance Score: ${score.breakdown.distance}`);
      console.log(`   - Specialization Score: ${score.breakdown.specialization}`);
      console.log(`   - Total Score: ${score.totalScore}`);

      return scoredMechanic;
    });

    // Sort by total score (highest first)
    scoredMechanics.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));

    console.log('\n🏆 === FINAL RANKING (Highest to Lowest Score) ===');
    scoredMechanics.forEach((mechanic, index) => {
      console.log(`${index + 1}. ${mechanic.name}: ${mechanic.totalScore} points`);
      console.log(`   - Distance: ${mechanic.distance}km (Score: ${mechanic.scoreBreakdown.distance})`);
      console.log(`   - Specialization: ${mechanic.specialization} (Score: ${mechanic.scoreBreakdown.specialization})`);
    });

    const winner = scoredMechanics[0];
    console.log(`\n🎉 WINNER: ${winner.name} with score ${winner.totalScore}`);
    console.log('📋 === END MECHANIC SCORING ===\n');

    // Return the best mechanic
    return winner || null;
  }

  /**
   * Find nearby mechanics based on current location and filters
   */
  async findNearbyMechanics() {
    this.isLoadingMechanics = true;
    this.loadingText = 'Finding nearby mechanics...';
    
    try {
      // Get real mechanics from database (only available ones)
      const profiles = await this.profileService.listAvailableMechanics(this.selectedSpecialty);
      console.log('Available mechanics from database:', profiles);
      
      // Convert profiles to mechanic interface and calculate distances
      this.allMechanics = profiles.map(profile => {
        const mechanic = this.profileToMechanic(profile);
        console.log('Converted mechanic:', mechanic);
        return mechanic;
      });
      
      // Filter mechanics based on distance and other criteria
      this.nearbyMechanics = this.allMechanics.filter(mechanic => {
        console.log(`Filtering mechanic ${mechanic.name}:`, {
          distance: mechanic.distance,
          searchRadius: this.searchRadius,
          selectedSpecialty: this.selectedSpecialty,
          mechanicSpecialty: mechanic.specialty,
          minRating: this.minRating,
          mechanicRating: mechanic.rating,
          isAvailable: mechanic.isAvailable
        });
        
        // Filter by distance
        if (mechanic.distance > this.searchRadius) {
          console.log(`❌ Mechanic ${mechanic.name} filtered out: distance ${mechanic.distance}km > ${this.searchRadius}km`);
          return false;
        }
        
        // Filter by specialty (already filtered by database query)
        if (this.selectedSpecialty && !mechanic.specialty.toLowerCase().includes(this.selectedSpecialty.toLowerCase())) {
          console.log(`❌ Mechanic ${mechanic.name} filtered out: specialty mismatch`);
          return false;
        }
        
        // Filter by rating
        if (this.minRating > 0 && mechanic.rating < this.minRating) {
          console.log(`❌ Mechanic ${mechanic.name} filtered out: rating too low`);
          return false;
        }
        
        // Double-check availability (should already be filtered by database)
        if (!mechanic.isAvailable) {
          console.log(`❌ Mechanic ${mechanic.name} filtered out: not available`);
          return false;
        }
        
        console.log(`✅ Mechanic ${mechanic.name} passed all filters`);
        return true;
      });
      
      // Apply multi-criteria scoring if we have a selected issue
      if (this.selectedIssue && this.nearbyMechanics.length > 0) {
        this.applyMultiCriteriaScoring();
      } else {
        // Sort by distance as fallback
        this.nearbyMechanics.sort((a, b) => a.distance - b.distance);
      }
      
      // Update mechanics with accurate driving distances using OpenRouteService
      await this.updateMechanicsWithDrivingDistances();
      
      // Update map with mechanic markers
      this.updateMapWithMechanics();
      
      console.log(`Found ${this.nearbyMechanics.length} available mechanics within ${this.searchRadius}km`);
      
      // Show appropriate message based on results
      if (this.nearbyMechanics.length === 0) {
        this.showToast('No available mechanics found in your area. Please try again later.', 'warning');
      }
      
    } catch (error) {
      console.error('Error finding mechanics:', error);
      this.showToast('Failed to find nearby mechanics. Please try again.', 'danger');
    } finally {
      this.isLoadingMechanics = false;
    }
  }
  
  /**
   * Update mechanics with accurate driving distances using OpenRouteService
   */
  private async updateMechanicsWithDrivingDistances() {
    if (!this.currentLatitude || !this.currentLongitude) {
      console.log('Current location not available, skipping driving distance calculation');
      return;
    }

    const userLocation = {
      latitude: this.currentLatitude,
      longitude: this.currentLongitude,
      timestamp: Date.now()
    };

    // Update distances for each mechanic using OpenRouteService
    for (const mechanic of this.nearbyMechanics) {
      try {
        const mechanicLocation = {
          latitude: mechanic.latitude,
          longitude: mechanic.longitude,
          timestamp: Date.now()
        };

        const drivingInfo = await this.mapboxService.getDrivingDistance(userLocation, mechanicLocation);
        mechanic.distance = Math.round(drivingInfo.distance * 10) / 10; // Round to 1 decimal place
        
        console.log(`Updated ${mechanic.name} driving distance: ${mechanic.distance}km (${drivingInfo.duration}min)`);
      } catch (error) {
        console.error(`Error getting driving distance for ${mechanic.name}:`, error);
        // Keep the straight-line distance if OpenRouteService fails
      }
    }

    // Re-sort by updated driving distances
    this.nearbyMechanics.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Update map with mechanic markers
   */
  private updateMapWithMechanics() {
    // TODO: Add mechanic markers to Google Maps
    // This would involve adding markers for each mechanic with their info windows
    console.log('Updating map with', this.nearbyMechanics.length, 'mechanics');
  }
  
  /**
   * Refresh mechanics list
   */
  async refreshMechanics() {
    await this.findNearbyMechanics();
  }
  
  /**
   * Select a mechanic
   */
  selectMechanic(mechanic: Mechanic) {
    console.log('Selected mechanic:', mechanic);
    this.selectedMechanic = mechanic;
    // TODO: Navigate to mechanic details page or show modal
    this.showToast(`Selected ${mechanic.name}`, 'success');
  }
  
  
  /**
   * Message a mechanic
   */
  messageMechanic(mechanic: Mechanic) {
    // TODO: Implement messaging functionality
    console.log('Messaging mechanic:', mechanic.name);
    this.showToast(`Opening chat with ${mechanic.name}`, 'success');
  }
  
  /**
   * Reset search filters
   */
  resetFilters() {
    this.searchRadius = 5;
    this.selectedSpecialty = '';
    this.minRating = 0;
    this.findNearbyMechanics();
  }
  
  /**
   * Go back to previous page
   */
  goBack() {
    this.router.navigate(['/client/home']);
  }
  
  /**
   * Show toast message
   */
  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'bottom',
      color: color
    });
    await toast.present();
  }
  
  /**
   * Track by function for ngFor performance
   */
  trackByMechanicId(index: number, mechanic: Mechanic): string {
    return mechanic.id;
  }

  /**
   * Handle issue selection change
   */
  onIssueChange(event: any) {
    this.selectedIssue = event.target.value;
    if (this.selectedIssue !== 'other') {
      this.customIssue = '';
    }
  }

  /**
   * Check if service request can be submitted
   */
  canSubmitRequest(): boolean {
    // First check if user has an active booking
    if (this.hasActiveBooking()) {
      return false;
    }
    
    // Then check if form fields are filled
    if (!this.selectedIssue || !this.selectedPaymentMethod || !this.motorcycleModel.trim()) {
      return false;
    }
    
    if (this.selectedIssue === 'other' && !this.customIssue.trim()) {
      return false;
    }
    
    return true;
  }

  /**
   * Check if user has an active booking
   */
  hasActiveBooking(): boolean {
    if (!this.currentBooking) {
      return false;
    }
    
    // Check if the current booking is in an active state (exclude completed bookings)
    const activeStatuses = ['pending', 'matched', 'assigned', 'in_progress', 'service_completed'];
    return activeStatuses.includes(this.currentBooking.status);
  }

  /**
   * Check if user is authenticated
   */
  private async checkAuthentication(): Promise<boolean> {
    try {
      const { data: sessionData } = await this.supabaseService.getSession();
      this.isUserAuthenticated = !!sessionData.session?.user;
      return this.isUserAuthenticated;
    } catch (error) {
      console.error('Error checking authentication:', error);
      this.isUserAuthenticated = false;
      return false;
    }
  }

  /**
   * Navigate to login page
   */
  goToLogin() {
    this.router.navigate(['/login']);
  }


  /**
   * Get current location for map display
   */
  get currentLocation() {
    if (this.currentLatitude && this.currentLongitude) {
      return {
        latitude: this.currentLatitude,
        longitude: this.currentLongitude,
        timestamp: Date.now()
      };
    }
    return null;
  }

  /**
   * Get distance to selected mechanic
   */
  getDistanceToMechanic(): string {
    if (!this.selectedMechanic) return 'N/A';
    return `${this.selectedMechanic.distance.toFixed(1)} km`;
  }

  /**
   * Get estimated arrival time for selected mechanic
   */
  getEstimatedArrivalTime(): string {
    if (!this.selectedMechanic) return 'N/A';
    // Assuming average speed of 30 km/h in city traffic
    const estimatedMinutes = Math.round((this.selectedMechanic.distance / 30) * 60);
    return `${estimatedMinutes} min`;
  }


  /**
   * Assign a mechanic to a booking
   */
  async assignMechanicToBooking(bookingId: number, mechanicId: string) {
    try {
      // Update booking with mechanic assignment only
      // We'll fetch the mechanic's real-time location from profiles table when needed
      const { error } = await this.supabaseService
        .from('bookings')
        .update({ 
          mechanic_id: mechanicId, 
          status: 'matched'
        })
        .eq('id', bookingId);
      
      if (error) {
        console.error('Error assigning mechanic to booking:', error);
        throw error;
      }
      
      console.log(`Mechanic ${mechanicId} assigned to booking ${bookingId}`);
    } catch (error) {
      console.error('Failed to assign mechanic to booking:', error);
      throw error;
    }
  }

  /**
   * Make a mechanic unavailable (1:1 matching)
   */
  async makeMechanicUnavailable(mechanicId: string) {
    try {
      const { error } = await this.supabaseService
        .from('profiles')
        .update({ availability: 'not_available' })
        .eq('user_id', mechanicId);
      
      if (error) {
        console.error('Error making mechanic unavailable:', error);
        throw error;
      }
      
      console.log(`Mechanic ${mechanicId} made unavailable for 1:1 matching`);
    } catch (error) {
      console.error('Failed to make mechanic unavailable:', error);
      throw error;
    }
  }

  /**
   * Reset payment states for new booking
   */
  private resetPaymentStates() {
    this.facialRecognitionCompleted = false;
    this.facialRecognitionError = false;
    this.isProcessingFacialRecognition = false;
    this.isProcessingPayment = false;
    this.showPaymentModal = false;
  }

  /**
   * Submit service request
   */
  async submitServiceRequest() {
    // Check if user has an active booking first
    if (this.hasActiveBooking()) {
      this.showToast('You already have an active booking. Please complete or cancel your current booking before creating a new one.', 'warning');
      return;
    }

    if (!this.canSubmitRequest()) {
      this.showToast('Please fill in all required fields', 'warning');
      return;
    }

    // Check if user is authenticated
    const isAuthenticated = await this.checkAuthentication();
    if (!isAuthenticated) {
      this.showToast('Please log in to create a service request', 'warning');
      this.router.navigate(['/login']);
      return;
    }

    const issueDescription = this.selectedIssue === 'other' ? this.customIssue : this.selectedIssue;
    
    // Show loading indicator for creating booking
    this.isLoadingMechanics = true;
    this.loadingText = 'Creating service request...';
    
    try {
      // Reset notification tracking for new booking
      this.notificationShownForBooking = null;
      
      // Reset payment states for new booking
      this.resetPaymentStates();
      
      // Create a real booking in the database
      // Get phone number from user profile
      const userProfile = await this.profileService.getMyProfile();
      const userPhone = userProfile?.phone || 'Not provided';
      
      const booking = await this.bookingService.createBooking({
        required_specialization: this.selectedIssue,
        notes: `Issue: ${issueDescription}`,
        latitude: this.currentLatitude,
        longitude: this.currentLongitude,
        payment_method: this.selectedPaymentMethod || 'cash',
        motorcycle_model: this.motorcycleModel,
        client_phone: userPhone
      });

      console.log('Service request created:', booking);
      
      // Find nearby mechanics based on the request
      this.loadingText = 'Finding nearby mechanics...';
      await this.findNearbyMechanics();
      
      // Only show mechanic found modal if mechanics are available
      if (this.nearbyMechanics.length > 0) {
        // Use multi-criteria scoring to find the best mechanic
        const bestMechanic = await this.findBestMechanicForBooking(booking);
        
        if (bestMechanic) {
          await this.assignMechanicToBooking(booking.id, bestMechanic.id);
          
          // Make mechanic unavailable (1:1 matching)
          await this.makeMechanicUnavailable(bestMechanic.id);
          
          this.showToast(`Best mechanic found: ${bestMechanic.name} (Score: ${bestMechanic.totalScore})`, 'success');
          this.showMechanicFoundModal = true;
        } else {
          this.showToast('No suitable mechanics found. Your request has been queued.', 'warning');
        }
      } else {
        this.showToast('No mechanics available at the moment. Your request has been queued.', 'warning');
      }
      
      // Reset form
      this.selectedIssue = '';
      this.customIssue = '';
      this.selectedPaymentMethod = null;
      this.motorcycleModel = '';
      
    } catch (error: any) {
      console.error('Error creating service request:', error);
      if (error?.message?.includes('Not authenticated')) {
        this.showToast('Please log in to create a service request', 'warning');
        this.router.navigate(['/login']);
      } else {
        this.showToast('Error creating service request. Please try again.', 'danger');
      }
    } finally {
      // Hide loading indicator
      this.isLoadingMechanics = false;
    }
  }

  /**
   * Close mechanic found modal
   */
  closeMechanicFoundModal() {
    this.showMechanicFoundModal = false;
    this.showMechanicDetails = false;
  }

  /**
   * Get mechanic name from database
   */
  getMechanicName(): string {
    if (!this.currentBooking?.mechanic_id) {
      return 'Mechanic';
    }
    
    // Try to get from nearby mechanics first
    const mechanic = this.nearbyMechanics.find(m => m.id === this.currentBooking?.mechanic_id);
    if (mechanic?.name) {
      return mechanic.name;
    }
    
    // Fallback to generic name
    return 'Mechanic';
  }

  /**
   * Get mechanic avatar from booking
   */
  getMechanicAvatar(): string | null {
    if (!this.currentBooking?.mechanic_id) {
      return null;
    }
    const mechanic = this.nearbyMechanics.find(m => m.id === this.currentBooking?.mechanic_id);
    return mechanic?.avatar_url || null;
  }

  /**
   * Call mechanic
   */
  callMechanic() {
    if (!this.currentBooking?.mechanic_id) {
      this.showToast('Mechanic phone number not available', 'warning');
      return;
    }
    
    // Try to get mechanic phone from nearby mechanics
    const mechanic = this.nearbyMechanics.find(m => m.id === this.currentBooking?.mechanic_id);
    if (mechanic?.phone) {
      window.open(`tel:${mechanic.phone}`, '_self');
    } else {
      this.showToast('Mechanic phone number not available', 'warning');
    }
  }

  /**
   * Get payment method text
   */
  getPaymentMethodText(paymentMethod: string | null): string {
    switch (paymentMethod) {
      case 'cash':
        return 'Cash Payment';
      case 'facial_recognition':
        return 'Facial Recognition Payment';
      default:
        return 'Cash Payment';
    }
  }

  /**
   * Process payment
   */
  async processPayment() {
    if (!this.currentBooking?.service_price) {
      this.showToast('Service price not set', 'warning');
      return;
    }
    
    if (!this.currentBooking?.payment_method) {
      this.showToast('Payment method not specified', 'warning');
      return;
    }
    
    // Handle facial recognition payment
    if (this.currentBooking.payment_method === 'facial_recognition') {
      await this.processFacialRecognitionPayment();
      return;
    }
    
    // Handle cash payment
    if (this.currentBooking.payment_method === 'cash') {
      this.showToast('Cash payment completed!', 'success');
      await this.updateBookingStatus('completed');
      return;
    }
    
    // Default to cash if no payment method specified
    this.showToast('Payment completed!', 'success');
    await this.updateBookingStatus('completed');
  }


  /**
   * Process facial recognition payment
   */
  async processFacialRecognitionPayment() {
    if (!this.currentBooking) {
      this.showToast('No active booking found', 'warning');
      return;
    }

    try {
      this.isProcessingPayment = true;
      this.showToast('Starting facial recognition payment...', 'info');

      // Capture photo using full-screen camera interface
      const facePhoto = await this.capturePhotoFromStream();
      
      if (!facePhoto) {
        this.showToast('Failed to capture face photo. Please try again.', 'danger');
        this.isProcessingPayment = false;
        return;
      }

      // Get user session data
      const sessionData = await this.supabaseService.getSession();
      const userId = sessionData.data.session?.user.id;
      
      if (!userId) {
        this.showToast('User not authenticated', 'warning');
        this.isProcessingPayment = false;
        return;
      }

      // Process facial recognition payment with captured photo
      const success = await this.processFaceNetPayment(
        userId,
        this.currentBooking.mechanic_id || '',
        this.currentBooking.id,
        this.currentBooking.service_price || 0,
        facePhoto // Pass the already captured photo
      );

      if (success) {
        this.facialRecognitionCompleted = true;
        this.facialRecognitionError = false;
        this.showToast('✅ Payment completed successfully!', 'success');
        await this.updateBookingStatus('completed');
      } else {
        this.showToast('❌ Payment failed. Please try again.', 'danger');
        // Set error state to show retry option
        this.facialRecognitionError = true;
        this.facialRecognitionCompleted = false;
      }

    } catch (error) {
      this.showToast(`Payment processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'danger');
      // Set error state to show retry option
      this.facialRecognitionError = true;
      this.facialRecognitionCompleted = false;
    } finally {
      this.isProcessingPayment = false;
    }
  }

  /**
   * Process FaceNet payment with facial recognition
   */
  async processFaceNetPayment(
    userId: string,
    mechanicId: string,
    bookingId: string,
    amount: number,
    facePhoto?: string
  ): Promise<boolean> {
    try {
      // First, verify the face with FaceNet API
      const faceVerificationResult = await this.verifyFaceWithFaceNetAPI(userId, mechanicId, bookingId, amount, facePhoto);
      
      if (!faceVerificationResult.success) {
        this.showToast(`Face verification failed: ${faceVerificationResult.message}`, 'danger');
        
        // Check if it's a service unavailable error
        if (faceVerificationResult.message.includes('FaceNet service is not available')) {
          // Show option to proceed without verification
          const proceed = confirm('FaceNet service is not available. Do you want to proceed with payment anyway? (Not recommended for security)');
          if (proceed) {
            // Proceed with payment without face verification
            this.showToast('⚠️ Proceeding without face verification', 'warning');
            // Continue with payment processing
          } else {
        // Camera will be cleaned up automatically in the full-screen interface
            return false;
          }
        } else if (faceVerificationResult.message.includes('Face registration data appears to be corrupted')) {
          // Show specific guidance for corrupted face data
          this.showToast('🔧 Face data issue detected. Please re-register your face in Profile Settings.', 'warning');
        // Camera will be cleaned up automatically in the full-screen interface
          return false;
        } else {
          // Camera will be cleaned up automatically in the full-screen interface
          return false;
        }
      }

      // Only proceed with payment if face verification was successful
      const { data, error } = await this.supabaseService.rpc('process_facial_payment', {
        p_booking_id: parseInt(bookingId),
        p_amount: amount,
        p_verification_photo: faceVerificationResult.verification_photo || 'face_verified',
        p_facial_data: { 
          user_id: userId, 
          mechanic_id: mechanicId,
          timestamp: new Date().toISOString(),
          verification_method: 'facial_recognition',
          confidence: faceVerificationResult.confidence,
          verified_at: faceVerificationResult.verified_at
        }
      });

      if (error) {
        this.showToast(`Payment error: ${error.message}`, 'danger');
        // Camera will be cleaned up automatically in the full-screen interface
        return false;
      }
      
      // The function returns a table, so data should be an array
      const isSuccess = Array.isArray(data) && data.length > 0 && data[0]?.status === 'completed';
      
      return isSuccess;

    } catch (error) {
        // Camera will be cleaned up automatically in the full-screen interface
      return false;
    }
  }

  /**
   * Verify face with FaceNet API before processing payment
   */
  async verifyFaceWithFaceNetAPI(
    userId: string,
    mechanicId: string,
    bookingId: string,
    amount: number,
    facePhoto?: string
  ): Promise<{ success: boolean; message: string; confidence?: number; verification_photo?: string; verified_at?: string }> {
    try {
      // Use the provided face photo or capture a new one if not provided
      let photoToUse = facePhoto;
      
      if (!photoToUse) {
        // Only capture if no photo was provided (fallback for backward compatibility)
        const capturedPhoto = await this.capturePhotoFromStream();
        
        if (!capturedPhoto) {
          return {
            success: false,
            message: 'Failed to capture face photo'
          };
        }
        
        photoToUse = capturedPhoto;
      }

      // Convert base64 to blob for API call
      const photoBlob = this.base64ToBlob(photoToUse, 'image/jpeg');
      
      // Create FormData for the API call
      const formData = new FormData();
      formData.append('client_id', userId);
      formData.append('mechanic_id', mechanicId);
      formData.append('booking_id', bookingId);
      formData.append('amount', amount.toString());
      formData.append('file', photoBlob, 'face_verification.jpg');

      // Call FaceNet API for verification
      const response = await fetch('https://autosos-ai-services-1.onrender.com/process-payment', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        return {
          success: false,
          message: errorData.message || `API error: ${response.status}`
        };
      }

      const result = await response.json();
      
      // Log the result for debugging
      console.log('FaceNet API Response:', result);
      
      if (!result.success || !result.verified) {
        // Check for specific error types
        let errorMessage = result.message || 'Face verification failed';
        
        if (result.message && result.message.includes('shapes') && result.message.includes('not aligned')) {
          errorMessage = 'Face registration data appears to be corrupted. Please re-register your face in the profile settings.';
        } else if (result.message && result.message.includes('Failed to calculate similarity')) {
          errorMessage = 'Face verification failed due to data mismatch. Please try again or re-register your face.';
        }
        
        return {
          success: false,
          message: errorMessage
        };
      }

      return {
        success: true,
        message: 'Face verification successful',
        confidence: result.payment_data?.facial_verification_data?.confidence,
        verification_photo: result.payment_data?.verification_photo,
        verified_at: result.payment_data?.facial_verification_data?.verified_at
      };

    } catch (error) {
      // Handle connection refused and other network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return {
          success: false,
          message: 'FaceNet service is not available. Please check if the facial recognition service is running on Render.'
        };
      }
      
      return {
        success: false,
        message: `Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Convert base64 string to Blob
   */
  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  /**
   * Update booking status
   */
  async updateBookingStatus(status: string) {
    if (!this.currentBooking) return;
    
    try {
      const { error } = await this.supabaseService.client
        .from('bookings')
        .update({ 
          status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.currentBooking.id);
      
      if (error) {
        console.error('Error updating booking status:', error);
        this.showToast('Failed to update booking status', 'danger');
      } else {
        console.log('Booking status updated to:', status);
        this.currentBooking.status = status as any;
      }
    } catch (error) {
      console.error('Error updating booking status:', error);
      this.showToast('Failed to update booking status', 'danger');
    }
  }

  /**
   * Close service in progress modal
   */
  closeServiceInProgressModal() {
    this.showServiceInProgressModal = false;
  }



  /**
   * Toggle mechanic details view
   */
  toggleMechanicDetails() {
    this.showMechanicDetails = !this.showMechanicDetails;
  }

  /**
   * Cancel booking
   */
  async cancelBooking() {
    if (!this.currentBooking) {
      this.showToast('No active booking to cancel', 'warning');
      return;
    }

    try {
      console.log('Client cancelling booking:', this.currentBooking.id);
      
      // Use BookingService for consistent cancellation logic
      await this.bookingService.cancelBooking(this.currentBooking.id);
      
      console.log('Booking cancelled by client successfully');
      this.showToast('Booking cancelled successfully', 'success');
      // Clear current booking
      this.currentBooking = null;
    } catch (error) {
      console.error('Error cancelling booking:', error);
      this.showToast('Failed to cancel booking. Please try again.', 'danger');
    }
  }

  /**
   * Handle touch start for bottom sheet
   */
  onTouchStart(event: TouchEvent) {
    this.touchStartY = event.touches[0].clientY;
  }

  /**
   * Handle touch move for bottom sheet
   */
  onTouchMove(event: TouchEvent) {
    this.touchCurrentY = event.touches[0].clientY;
    const deltaY = this.touchStartY - this.touchCurrentY;
    
    // If swiping up and not expanded, expand
    if (deltaY > 50 && !this.isBottomSheetExpanded) {
      this.expandBottomSheet();
    }
    // If swiping down and expanded, collapse
    else if (deltaY < -50 && this.isBottomSheetExpanded) {
      this.collapseBottomSheet();
    }
  }

  /**
   * Handle touch end for bottom sheet
   */
  onTouchEnd(event: TouchEvent) {
    // Reset touch positions
    this.touchStartY = 0;
    this.touchCurrentY = 0;
  }

  /**
   * Start checking for booking status updates
   */
  startBookingStatusCheck() {
    // Check immediately
    this.checkBookingStatus();
    
    // Then check every 3 seconds
    this.bookingCheckInterval = setInterval(() => {
      this.checkBookingStatus();
    }, 3000);
  }

  /**
   * Check for booking status updates
   */
  async checkBookingStatus() {
    if (!this.isUserAuthenticated) {
      return;
    }

    try {
      const sessionData = await this.supabaseService.getSession();
      const userId = sessionData.data.session?.user.id;
      
      if (!userId) return;

      // Get bookings for this client (include completed to show completion notification)
      const { data: bookings, error } = await this.supabaseService
        .from('bookings')
        .select('*')
        .eq('client_id', userId)
        .in('status', ['matched', 'in_progress', 'cancelled', 'completed'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching client bookings:', error);
        return;
      }

      const activeBookings = bookings || [];
      console.log('Active bookings for client:', activeBookings.map(b => ({ id: b.id, status: b.status })));

      if (activeBookings.length > 0) {
        const latestBooking = activeBookings[0];
        
        if (latestBooking.status === 'cancelled') {
          // Show cancellation notification only if not already shown for this booking
          if (this.notificationShownForBooking !== latestBooking.id) {
            this.showBookingCancelledNotification();
            this.notificationShownForBooking = latestBooking.id;
          }
          this.isBottomSheetExpanded = false;
          this.currentBooking = null;
        } else if (latestBooking.status === 'completed') {
          // Show completion notification only if not already shown for this booking
          if (this.notificationShownForBooking !== latestBooking.id) {
            this.showBookingCompletedNotification();
            this.notificationShownForBooking = latestBooking.id;
          }
          this.isBottomSheetExpanded = false;
          this.currentBooking = null;
        } else if (latestBooking.status === 'matched') {
          // Show mechanic found modal with loading state
          this.currentBooking = latestBooking;
          this.showMechanicFoundModal = true;
          this.showServiceInProgressModal = false; // Hide service in progress modal
          this.showLoadingState = false; // Hide loading state
          console.log('Booking matched, showing mechanic found modal with loading state');
        } else if (latestBooking.status === 'in_progress') {
          // Show mechanic found modal with map and navigation
          this.currentBooking = latestBooking;
          this.showMechanicFoundModal = true;
          this.showServiceInProgressModal = false; // Hide service in progress modal
          this.showLoadingState = false; // Hide loading state
          console.log('Booking in progress, showing mechanic found modal with map');
          console.log('Service in progress, showing payment modal');
        } else if (latestBooking.status === 'service_completed') {
          // Service completed, show payment modal
          this.currentBooking = latestBooking;
          this.checkForServiceCompletion();
        } else if (latestBooking.status === 'completed') {
          // Booking is fully completed, close all modals
          console.log('Booking completed, closing all modals');
          this.showServiceInProgressModal = false;
          this.isBottomSheetExpanded = false;
          this.currentBooking = null;
        }
      } else {
        // No active bookings, hide all modals
        this.showServiceInProgressModal = false;
        this.showLoadingState = false;
        this.isBottomSheetExpanded = false;
        this.currentBooking = null;
      }
    } catch (error) {
      console.error('Error checking booking status:', error);
    }
  }

  /**
   * Show booking cancelled notification
   */
  async showBookingCancelledNotification() {
    const toast = await this.toastController.create({
      message: 'Your booking has been cancelled by the mechanic. You can create a new request.',
      duration: 5000,
      position: 'top',
      color: 'warning',
      buttons: [
        {
          text: 'OK',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }

  /**
   * Show booking completed notification
   */
  async showBookingCompletedNotification() {
    const toast = await this.toastController.create({
      message: 'Your service request has been completed! Thank you for using AutoSOS.',
      duration: 5000,
      position: 'top',
      color: 'success',
      buttons: [
        {
          text: 'OK',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }

  // ========================================
  // REAL-TIME TRACKING METHODS
  // ========================================

  /**
   * Start real-time tracking of a mechanic
   */
  startRealTimeTracking(mechanicId: string) {
    this.trackingMechanicId = mechanicId;
    this.isRealTimeTracking = true;
    
    // Start location tracking
    this.mapboxService.startLocationTracking();
    
    // Subscribe to mechanic location updates
    this.mapboxService.mechanicLocation$.subscribe(mechanicLocation => {
      if (mechanicLocation && mechanicLocation.mechanicId === mechanicId) {
        this.currentMechanicLocation = mechanicLocation;
      }
    });

    this.showToast('Real-time tracking started', 'success');
  }

  /**
   * Stop real-time tracking
   */
  stopRealTimeTracking() {
    this.isRealTimeTracking = false;
    this.trackingMechanicId = null;
    this.currentMechanicLocation = null;
    
    // Stop location tracking
    this.mapboxService.stopLocationTracking();
    
    this.showToast('Real-time tracking stopped', 'medium');
  }

  /**
   * Handle location updates from the map component
   */
  onLocationUpdated(location: Location) {
    // Update current location
    this.currentLatitude = location.latitude;
    this.currentLongitude = location.longitude;
    
    // Load current address and nearby places
    this.loadCurrentLocationAddress();
    this.loadNearbyPlaces();
    
    // Send location to backend for real-time sharing
    this.sendLocationToBackend(location);
  }

  /**
   * Handle mechanic location updates from the map component
   */
  onMechanicLocationUpdated(mechanicLocation: MechanicLocation) {
    this.currentMechanicLocation = mechanicLocation;
    
    // Update the mechanic in the nearby mechanics list
    const mechanicIndex = this.nearbyMechanics.findIndex(m => m.id === mechanicLocation.mechanicId);
    if (mechanicIndex !== -1) {
      this.nearbyMechanics[mechanicIndex].latitude = mechanicLocation.location.latitude;
      this.nearbyMechanics[mechanicIndex].longitude = mechanicLocation.location.longitude;
    }
  }

  /**
   * Send location to backend for real-time sharing
   */
  private async sendLocationToBackend(location: Location) {
    try {
      // TODO: Implement API call to your Supabase backend
      // This should send the location to your backend for real-time sharing
      console.log('Sending location to backend:', location);
    } catch (error) {
      console.error('Error sending location to backend:', error);
    }
  }

  /**
   * Get directions to mechanic
   */
  async getDirectionsToMechanic(mechanic: Mechanic) {
    if (!this.currentLatitude || !this.currentLongitude) {
      this.showToast('Location not available', 'warning');
      return;
    }

    try {
      const userLocation: Location = {
        latitude: this.currentLatitude,
        longitude: this.currentLongitude,
        timestamp: Date.now()
      };

      const mechanicLocation: Location = {
        latitude: mechanic.latitude,
        longitude: mechanic.longitude,
        timestamp: Date.now()
      };

      const directions = await this.mapboxService.getDirections(userLocation, mechanicLocation);
      
      if (directions.routes && directions.routes.length > 0) {
        const route = directions.routes[0];
        const duration = Math.round(route.duration / 60); // Convert to minutes
        const distance = (route.distance / 1000).toFixed(1); // Convert to km
        
        this.showToast(`Directions: ${distance}km, ${duration}min`, 'success');
      }
    } catch (error) {
      console.error('Error getting directions:', error);
      this.showToast('Error getting directions', 'danger');
    }
  }

  /**
   * Calculate distance to mechanic using Haversine formula
   */
  calculateDistanceToMechanic(mechanic: Mechanic): number {
    if (!this.currentLatitude || !this.currentLongitude) {
      return 0;
    }

    return this.distanceCalculator.calculateDistanceToMechanic(
      this.currentLatitude,
      this.currentLongitude,
      mechanic.latitude,
      mechanic.longitude,
      'km'
    );
  }

  /**
   * Format distance for display
   */
  formatDistanceToMechanic(mechanic: Mechanic): string {
    const distance = this.calculateDistanceToMechanic(mechanic);
    return this.distanceCalculator.formatDistance(distance, 'km', 1);
  }

  /**
   * Get estimated travel time to mechanic using OpenRouteService
   */
  async getEstimatedTravelTimeToMechanic(mechanic: Mechanic): Promise<string> {
    if (!this.currentLatitude || !this.currentLongitude) {
      return 'Location unavailable';
    }

    try {
      const userLocation = {
        latitude: this.currentLatitude,
        longitude: this.currentLongitude,
        timestamp: Date.now()
      };

      const mechanicLocation = {
        latitude: mechanic.latitude,
        longitude: mechanic.longitude,
        timestamp: Date.now()
      };

      const drivingInfo = await this.mapboxService.getDrivingDistance(userLocation, mechanicLocation);
      return this.distanceCalculator.formatTravelTime(drivingInfo.duration);
    } catch (error) {
      console.error('Error getting travel time:', error);
      // Fallback to straight-line distance calculation
      const distance = this.calculateDistanceToMechanic(mechanic);
      const timeInMinutes = this.distanceCalculator.getEstimatedTravelTime(distance);
      return this.distanceCalculator.formatTravelTime(timeInMinutes);
    }
  }

  // ========================================
  // LOCATION SEARCH METHODS
  // ========================================

  /**
   * Show location search suggestion when location is found
   */
  async showLocationSearchSuggestion() {
    const toast = await this.toastController.create({
      message: 'Location found! You can search for a more specific location or use the current one.',
      duration: 5000,
      position: 'top',
      color: 'primary',
      buttons: [
        {
          text: 'Search Location',
          handler: () => {
            this.showLocationSearch = true;
          }
        },
        {
          text: 'Use Current',
          handler: () => {
            this.useCurrentLocation();
          }
        }
      ]
    });
    await toast.present();
  }

  /**
   * Use current location and proceed
   */
  useCurrentLocation() {
    this.showLocationSearch = false;
    this.showToast('Using current location', 'success');
    // Proceed with finding mechanics
    this.findNearbyMechanics();
  }

  /**
   * Show location search overlay
   */
  showLocationSearchOverlay() {
    this.showLocationSearch = true;
  }

  /**
   * Close location search overlay
   */
  closeLocationSearch() {
    this.showLocationSearch = false;
  }

  /**
   * Handle location selection from search
   */
  onLocationSelected(location: Location) {
    this.currentLatitude = location.latitude;
    this.currentLongitude = location.longitude;
    this.showLocationSearch = false;
    this.showToast('Location updated', 'success');
    // Proceed with finding mechanics
    this.findNearbyMechanics();
  }

  /**
   * Handle search started event
   */
  onSearchStarted() {
    console.log('Location search started');
  }


  /**
   * Get client location for the map component
   */
  get clientLocation(): Location | null {
    return this.currentLocation;
  }

  // ========================================
  // INLINE LOCATION SEARCH METHODS
  // ========================================

  /**
   * Load current location address
   */
  async loadCurrentLocationAddress() {
    if (this.currentLocation) {
      try {
        this.currentAddress = await this.mapboxService.getAddressFromCoordinates(this.currentLocation);
      } catch (error) {
        console.error('Error loading current location address:', error);
        this.currentAddress = 'Current location';
      }
    }
  }

  /**
   * Load nearby places
   */
  async loadNearbyPlaces() {
    if (this.currentLocation) {
      try {
        this.nearbyPlaces = await this.mapboxService.getNearbyPlaces(this.currentLocation, 500);
      } catch (error) {
        console.error('Error loading nearby places:', error);
        this.nearbyPlaces = [];
      }
    }
  }

  /**
   * Toggle location search visibility
   */
  toggleLocationSearch() {
    this.showLocationSearch = !this.showLocationSearch;
    if (this.showLocationSearch) {
      this.loadNearbyPlaces();
    }
  }

  /**
   * Handle search input
   */
  onSearchInput(event: any) {
    const query = event.target.value;
    this.searchQuery = query;
    
    if (query.length > 2) {
      this.performSearch(query);
    } else {
      this.searchSuggestions = [];
    }
  }

  /**
   * Handle search clear
   */
  onSearchClear() {
    this.searchQuery = '';
    this.searchSuggestions = [];
  }

  /**
   * Perform location search
   */
  async performSearch(query: string) {
    if (!query.trim()) {
      return;
    }

    try {
      const suggestions = await this.mapboxService.searchLocationSuggestions(
        query, 
        this.currentLocation || undefined
      );
      this.searchSuggestions = suggestions;
    } catch (error) {
      console.error('Error performing search:', error);
      this.searchSuggestions = [];
    }
  }

  /**
   * Select a location suggestion
   */
  selectSuggestion(suggestion: any) {
    this.currentLatitude = suggestion.location.latitude;
    this.currentLongitude = suggestion.location.longitude;
    this.currentAddress = suggestion.address;
    this.showLocationSearch = false;
    this.searchQuery = '';
    this.searchSuggestions = [];
    this.showToast('Location updated', 'success');
    // Proceed with finding mechanics
    this.findNearbyMechanics();
  }

  /**
   * Get suggestion icon based on type
   */
  getSuggestionIcon(type: string): string {
    switch (type) {
      case 'address':
        return 'home';
      case 'poi':
        return 'business';
      case 'place':
        return 'location';
      default:
        return 'location';
    }
  }

  /**
   * Get suggestion color based on type
   */
  getSuggestionColor(type: string): string {
    switch (type) {
      case 'address':
        return 'primary';
      case 'poi':
        return 'secondary';
      case 'place':
        return 'tertiary';
      default:
        return 'medium';
    }
  }

  /**
   * Track by function for suggestions
   */
  trackBySuggestionId(index: number, suggestion: any): string {
    return suggestion.id;
  }

  // ========================================
  // PAYMENT METHODS
  // ========================================

  /**
   * Check for service completion and show payment modal
   */
  async checkForServiceCompletion() {
    if (!this.currentBooking) return;

    try {
      // Check if service is completed
      if (this.currentBooking.status === 'service_completed' && this.currentBooking.service_price) {
        this.showPaymentModal = true;
        this.showServiceInProgressModal = false;
      }
    } catch (error) {
      console.error('Error checking service completion:', error);
    }
  }

  /**
   * Close payment modal
   */
  closePaymentModal() {
    this.showPaymentModal = false;
    this.facialRecognitionCompleted = false;
    this.facialRecognitionError = false;
    this.isProcessingFacialRecognition = false;
    // Camera cleanup is handled automatically in the full-screen interface
  }

  /**
   * Select payment method
   */
  selectPaymentMethod(method: 'cash' | 'card' | 'facial_recognition') {
    this.selectedPaymentMethod = method;
    this.facialRecognitionCompleted = false; // Reset facial recognition when changing method
    this.facialRecognitionError = false; // Reset error state when changing method
  }

  /**
   * Retry facial recognition payment
   */
  async retryFacialRecognition() {
    // Reset error state
    this.facialRecognitionError = false;
    this.facialRecognitionCompleted = false;
    
    // Restart the facial recognition process
    await this.processFacialRecognitionPayment();
  }







  /**
   * Start facial recognition verification with auto payment processing
   */
  async startFacialRecognition() {
    this.isProcessingFacialRecognition = true;
    
    try {
      // Simulate facial recognition process
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // For demo purposes, always succeed
      // In real implementation, you would integrate with a facial recognition service
      this.facialRecognitionCompleted = true;
      this.showToast('Identity verified successfully!', 'success');
      
      // Automatically process payment and complete job
      await this.onFacialRecognitionSuccess();
      
    } catch (error) {
      console.error('Facial recognition error:', error);
      this.showToast('Facial recognition failed. Please try again.', 'danger');
    } finally {
      this.isProcessingFacialRecognition = false;
    }
  }

  /**
   * Start navigation to mechanic
   */
  async startNavigation() {
    if (!this.currentBooking?.mechanic_id) {
      this.showToast('No mechanic assigned to this booking', 'warning');
      return;
    }

    console.log('Starting navigation to mechanic...');
    
    try {
      // Fetch mechanic's current location from database
      const { data: mechanicProfile, error } = await this.supabaseService
        .from('profiles')
        .select('latitude, longitude, phone, full_name')
        .eq('user_id', this.currentBooking.mechanic_id)
        .single();

      if (error) {
        console.error('Error fetching mechanic location:', error);
        this.showToast('Could not get mechanic location', 'warning');
        return;
      }

      const mechanicLat = mechanicProfile?.latitude || this.currentBooking?.mechanic_latitude || 0;
      const mechanicLng = mechanicProfile?.longitude || this.currentBooking?.mechanic_longitude || 0;
      const mechanicPhone = mechanicProfile?.phone || '';
      const mechanicName = mechanicProfile?.full_name || 'Mechanic';

      console.log('Mechanic location:', { mechanicLat, mechanicLng, mechanicName });

      // Navigate to the internal real-time navigation page
      this.router.navigate(['/client/real-time-navigation'], {
        queryParams: {
          mechanicId: this.currentBooking.mechanic_id,
          clientLat: this.currentLatitude,
          clientLng: this.currentLongitude,
          clientName: 'You',
          mechanicLat: mechanicLat,
          mechanicLng: mechanicLng,
          mechanicPhone: mechanicPhone,
          mechanicName: mechanicName,
          enableTraffic: 'true',
          enableVoiceGuidance: 'true',
          avoidTolls: 'false',
          showNavigationInstructions: 'true'
        }
      });
      
      this.showToast('Starting navigation to mechanic', 'success');
    } catch (error) {
      console.error('Error starting navigation:', error);
      this.showToast('Error starting navigation', 'danger');
    }
  }

  /**
   * Get estimated distance to mechanic
   */
  getEstimatedDistance(): string {
    if (!this.currentLatitude || !this.currentLongitude || !this.selectedMechanic) {
      return 'Calculating...';
    }
    
    const distance = this.distanceCalculator.calculateDistanceToMechanic(
      this.currentLatitude,
      this.currentLongitude,
      this.selectedMechanic.latitude,
      this.selectedMechanic.longitude,
      'km'
    );
    
    return this.distanceCalculator.formatDistance(distance, 'km', 1);
  }

  /**
   * Get estimated time for mechanic arrival
   */
  getEstimatedTime(): string {
    if (!this.currentLatitude || !this.currentLongitude || !this.selectedMechanic) {
      return 'Calculating...';
    }
    
    const distance = this.distanceCalculator.calculateDistanceToMechanic(
      this.currentLatitude,
      this.currentLongitude,
      this.selectedMechanic.latitude,
      this.selectedMechanic.longitude,
      'km'
    );
    
    const timeInMinutes = this.distanceCalculator.getEstimatedTravelTime(distance);
    return this.distanceCalculator.formatTravelTime(timeInMinutes);
  }

  /**
   * Get current time
   */
  getCurrentTime(): string {
    return new Date().toLocaleString();
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string | null): string {
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
   * Close loading state modal
   */
  closeLoadingState() {
    this.showLoadingState = false;
  }

  /**
   * Get booking ID
   */
  getBookingId(): string {
    // This would typically return the actual booking ID
    // For now, return a placeholder
    return 'BK' + Math.random().toString(36).substr(2, 9).toUpperCase();
  }

  /**
   * Toggle bottom sheet expanded state
   */
  toggleBottomSheet() {
    this.isBottomSheetExpanded = !this.isBottomSheetExpanded;
  }

  /**
   * Expand bottom sheet
   */
  expandBottomSheet() {
    this.isBottomSheetExpanded = true;
  }

  /**
   * Collapse bottom sheet
   */
  collapseBottomSheet() {
    this.isBottomSheetExpanded = false;
  }

  // ========================================
  // JOB MANAGEMENT METHODS
  // ========================================



  /**
   * Enhanced facial recognition completion with auto job completion
   */
  async onFacialRecognitionSuccess() {
    try {
      // NOTE: Payment is already processed in processFacialRecognitionPayment()
      // This method should only handle UI updates and job completion
      
      // Update booking status to completed (payment already processed)
      await this.bookingService.updateBookingStatus(this.currentBooking.id, 'completed');
      
      // Update local booking data
      this.currentBooking.status = 'completed';
      this.currentBooking.service_completed_at = new Date().toISOString();

      this.showToast('Payment processed and job completed automatically!', 'success');
      this.closePaymentModal();
      
      // Navigate to activity page after a delay
      setTimeout(() => {
        this.router.navigate(['/client/activity']);
      }, 2000);
    } catch (error) {
      console.error('Error updating booking status:', error);
      this.showToast('Error updating booking status. Please try again.', 'danger');
    }
  }

  /**
   * Process facial recognition payment (private method)
   */
  private async processFacialRecognitionPaymentPrivate(
    clientId?: string,
    mechanicId?: string,
    bookingId?: number,
    amount?: number
  ): Promise<boolean> {
    try {
      // If parameters are provided, use FaceNet API
      if (clientId && mechanicId && bookingId && amount) {
        return await this.processFaceNetPayment(clientId, mechanicId, bookingId.toString(), amount);
      }

      // Fallback to simulation for backward compatibility
      return new Promise((resolve) => {
        setTimeout(() => {
          const success = Math.random() > 0.1; // 90% success rate for demo
          resolve(success);
        }, 3000);
      });
    } catch (error) {
      console.error('Error in facial recognition payment:', error);
      return false;
    }
  }


  /**
   * Capture face photo using camera with preview
   */
  private async captureFacePhoto(): Promise<string | null> {
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
        this.createPaymentCameraInterface(stream, resolve);

      } catch (error) {
        console.error('Camera access error:', error);
        this.showToast('Camera access denied. Please allow camera permission.', 'danger');
        resolve(null);
      }
    });
  }

  /**
   * Create payment camera interface for face verification
   */
  private createPaymentCameraInterface(stream: MediaStream, resolve: (value: string | null) => void): void {
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
        <h3 style="margin: 0 0 10px 0; color: white;">Face Verification</h3>
        <p style="margin: 0; font-size: 16px;">Position your face within the green circle</p>
        <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.8;">Look directly at the camera for payment</p>
      </div>
    `;
    instructions.appendChild(faceGuide);
    overlay.appendChild(instructions);
    
    // Create capture button
    const captureBtn = document.createElement('button');
    captureBtn.textContent = '💳 Verify & Pay';
    captureBtn.style.position = 'fixed';
    captureBtn.style.bottom = '50px';
    captureBtn.style.left = '50%';
    captureBtn.style.transform = 'translateX(-50%)';
    captureBtn.style.zIndex = '10001';
    captureBtn.style.padding = '15px 30px';
    captureBtn.style.backgroundColor = '#28a745';
    captureBtn.style.color = 'white';
    captureBtn.style.border = 'none';
    captureBtn.style.borderRadius = '25px';
    captureBtn.style.fontSize = '18px';
    captureBtn.style.fontWeight = 'bold';
    captureBtn.style.cursor = 'pointer';
    captureBtn.style.boxShadow = '0 4px 15px rgba(40, 167, 69, 0.3)';
    
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
    
    // Capture photo with stabilization (improved from wallet page)
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

  /**
   * Capture photo from existing camera stream (improved from wallet page)
   */
  private async capturePhotoFromStream(): Promise<string | null> {
    return new Promise(async (resolve) => {
      try {
        // Request camera access with improved settings
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user', // Front camera
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        });

        // Create improved camera interface (copied from wallet page)
        this.createSimpleCameraInterface(stream, resolve);

      } catch (error) {
        console.error('Camera access error:', error);
        this.showToast('Camera access denied. Please allow camera permission.', 'danger');
        resolve(null);
      }
    });
  }

  /**
   * Create improved camera interface for facial recognition payment (enhanced from wallet page)
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
        <h3 style="margin: 0 0 10px 0; color: white;">Facial Recognition Payment</h3>
        <p style="margin: 0; font-size: 16px;">Position your face within the green circle</p>
        <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.8;">Look directly at the camera</p>
      </div>
    `;
    instructions.appendChild(faceGuide);
    overlay.appendChild(instructions);
    
    // Create capture button
    const captureBtn = document.createElement('button');
    captureBtn.textContent = '📷 Capture & Pay';
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
    
    // Capture photo with stabilization (improved from wallet page)
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

  /**
   * Convert base64 to file
   */
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

  /**
   * Process wallet payment after face verification
   */
  private async processWalletPayment(paymentData: any): Promise<boolean> {
    try {
      console.log('Processing wallet payment with data:', paymentData);
      
      // Call the wallet service to process the payment
      const { data, error } = await this.supabaseService.rpc('process_facial_payment', {
        p_booking_id: paymentData.booking_id,
        p_amount: paymentData.amount,
        p_verification_photo: paymentData.verification_photo,
        p_facial_data: paymentData.facial_verification_data
      });

      if (error) {
        console.error('Wallet payment error:', error);
        
        // Provide specific error messages based on the error
        let errorMessage = '❌ Payment failed: ';
        
        if (error.message) {
          if (error.message.includes('User not authenticated')) {
            errorMessage = '❌ Authentication Error: Please log in again';
          } else if (error.message.includes('Booking not found')) {
            errorMessage = '❌ Booking Error: Service request not found or already completed';
          } else if (error.message.includes('Insufficient wallet balance')) {
            errorMessage = '❌ Wallet Error: Not enough funds. Please add money to your wallet';
          } else if (error.message.includes('No mechanic assigned')) {
            errorMessage = '❌ Service Error: No mechanic assigned to this booking';
          } else if (error.message.includes('payment already processed')) {
            errorMessage = '❌ Payment Error: This service has already been paid for';
          } else if (error.message.includes('not in progress')) {
            errorMessage = '❌ Service Error: Service is not currently in progress';
          } else if (error.message.includes('facial_recognition')) {
            errorMessage = '❌ Payment Method Error: This booking is not set for facial recognition payment';
          } else {
            errorMessage = `❌ Payment Error: ${error.message}`;
          }
        } else {
          errorMessage = '❌ Unknown payment error occurred';
        }
        
        this.showToast(errorMessage, 'danger');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error processing wallet payment:', error);
      
      let errorMessage = '❌ Payment Error: ';
      
      if ((error as any).message) {
        if ((error as any).message.includes('fetch')) {
          errorMessage = '❌ Network Error: Cannot connect to payment service. Check your internet connection';
        } else if ((error as any).message.includes('timeout')) {
          errorMessage = '❌ Timeout Error: Payment service is taking too long to respond';
        } else if ((error as any).message.includes('CORS')) {
          errorMessage = '❌ Connection Error: Cannot connect to payment service';
        } else {
          errorMessage = `❌ System Error: ${(error as any).message}`;
        }
      } else {
        errorMessage = '❌ Unexpected error occurred during payment';
      }
      
      this.showToast(errorMessage, 'danger');
      return false;
    }
  }

  /**
   * Get distance to mechanic for the service in progress modal
   */
  getDistanceToMechanicInProgress(): string {
    if (!this.currentBooking?.mechanic_latitude || !this.currentBooking?.mechanic_longitude) {
      return 'Calculating...';
    }

    if (!this.currentLatitude || !this.currentLongitude) {
      return 'Location unavailable';
    }

    const distance = this.distanceCalculator.calculateDistanceToMechanic(
      this.currentLatitude,
      this.currentLongitude,
      this.currentBooking.mechanic_latitude,
      this.currentBooking.mechanic_longitude,
      'km'
    );

    return this.distanceCalculator.formatDistance(distance, 'km', 1);
  }

  /**
   * Get estimated arrival time to mechanic for service in progress
   */
  getEstimatedArrivalTimeInProgress(): string {
    if (!this.currentBooking?.mechanic_latitude || !this.currentBooking?.mechanic_longitude) {
      return 'Calculating...';
    }

    if (!this.currentLatitude || !this.currentLongitude) {
      return 'Location unavailable';
    }

    const distance = this.distanceCalculator.calculateDistanceToMechanic(
      this.currentLatitude,
      this.currentLongitude,
      this.currentBooking.mechanic_latitude,
      this.currentBooking.mechanic_longitude,
      'km'
    );

    const timeInMinutes = this.distanceCalculator.getEstimatedTravelTime(distance);
    return this.distanceCalculator.formatTravelTime(timeInMinutes);
  }

  /**
   * Get client location for the map component
   */
  getClientLocationForMap(): Location | null {
    if (!this.currentLatitude || !this.currentLongitude) {
      return null;
    }

    return {
      latitude: this.currentLatitude,
      longitude: this.currentLongitude,
      timestamp: Date.now()
    };
  }

  /**
   * Open fullscreen map for mechanic location
   */
  openFullscreenMap() {
    if (this.selectedMechanic) {
      this.router.navigate(['/client/fullscreen-map'], {
        queryParams: {
          mechanicId: this.selectedMechanic.id,
          mechanicLat: this.selectedMechanic.latitude,
          mechanicLng: this.selectedMechanic.longitude,
          mechanicName: this.selectedMechanic.name,
          clientLat: this.currentLatitude,
          clientLng: this.currentLongitude,
          showRoute: true
        }
      });
    }
  }

} 