import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { IonicModule, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { RealTimeMapComponent } from '../../../components/real-time-map.component';
import { MapboxService, Location } from '../../../mapbox.service';
import { SupabaseService } from '../../../supabase.service';

@Component({
  selector: 'app-fullscreen-map',
  templateUrl: 'fullscreen-map.page.html',
  styleUrls: ['fullscreen-map.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RealTimeMapComponent]
})
export class FullscreenMapPage implements OnInit, OnDestroy {
  @ViewChild('realTimeMap') realTimeMapComponent!: RealTimeMapComponent;
  
  // Route parameters
  mechanicId: string | null = null;
  // Optional direct coordinates from query (mechanic -> client)
  clientLat: number = 0;
  clientLng: number = 0;
  mechanicLat: number = 0;
  mechanicLng: number = 0;
  clientName: string = 'Client';

  // Location data
  clientLocation: Location | null = null;
  currentLocation: Location | null = null;

  // Map state
  isFullscreen: boolean = true;
  showRoute: boolean = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private toastController: ToastController,
    private mapboxService: MapboxService,
    private supabaseService: SupabaseService
  ) {}

  ngOnInit() {
    this.loadRouteParameters();
    this.initializeMap();
    this.setupFullscreenListeners();
  }

  ngOnDestroy() {
    // Cleanup fullscreen listeners
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
    document.removeEventListener('fullscreenerror', this.handleFullscreenError);
  }

  private handleFullscreenChange = () => {
    this.isFullscreen = !!document.fullscreenElement;
  };

  private handleFullscreenError = () => {
    this.showToast('Fullscreen error occurred', 'danger');
  };

  /**
   * Load parameters from route
   */
  private loadRouteParameters() {
    this.route.queryParams.subscribe(params => {
      console.log('Fullscreen map: Loading route parameters:', params);
      
      this.mechanicId = params['mechanicId'] || null;
      this.clientLat = parseFloat(params['clientLat']) || 0;
      this.clientLng = parseFloat(params['clientLng']) || 0;
      this.mechanicLat = parseFloat(params['mechanicLat']) || 0;
      this.mechanicLng = parseFloat(params['mechanicLng']) || 0;
      this.clientName = params['clientName'] || 'Client';
      this.showRoute = String(params['showRoute']).toLowerCase() === 'true';

      console.log('Fullscreen map: Parsed parameters:', {
        mechanicId: this.mechanicId,
        clientLat: this.clientLat,
        clientLng: this.clientLng,
        clientName: this.clientName,
        showRoute: this.showRoute
      });

      // Create client location object
      if (this.clientLat && this.clientLng) {
        this.clientLocation = {
          latitude: this.clientLat,
          longitude: this.clientLng,
          timestamp: Date.now()
        };
        console.log('Fullscreen map: Client location created:', this.clientLocation);
      } else {
        console.warn('Fullscreen map: Invalid client coordinates:', { lat: this.clientLat, lng: this.clientLng });
      }

      // If mechanic direct coordinates are provided, seed MapboxService mechanic location immediately
      if (this.mechanicLat && this.mechanicLng && this.mechanicId) {
        const mechLoc = {
          latitude: this.mechanicLat,
          longitude: this.mechanicLng,
          timestamp: Date.now()
        } as Location;
        this.mapboxService.updateMechanicLocation(this.mechanicId, mechLoc, false);
      }
    });
  }

  /**
   * Initialize map and location tracking
   */
  private async initializeMap() {
    try {
      console.log('Fullscreen map: Initializing...');
      
      // Get current location
      await this.getCurrentLocation();
      
      // Add a small delay to ensure DOM is ready
      setTimeout(() => {
        console.log('Fullscreen map: DOM should be ready now');
        this.showToast('Map initializing with OpenRouteService...', 'primary');
        
        // Force map component to initialize if it hasn't already
        if (this.realTimeMapComponent && !this.realTimeMapComponent.map) {
          console.log('Fullscreen map: Forcing map component initialization...');
          this.realTimeMapComponent.retryMapInitialization();
        }
      }, 1000);
      
    } catch (error) {
      console.error('Error initializing fullscreen map:', error);
      this.showToast('Error initializing map', 'danger');
    }
  }

  /**
   * Get current location
   */
  private async getCurrentLocation() {
    try {
      const position = this.mapboxService.getCurrentLocation();
      if (position) {
        this.currentLocation = {
          latitude: position.latitude,
          longitude: position.longitude,
          timestamp: position.timestamp
        };
      } else {
        throw new Error('No current location available');
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      // Use default location if GPS fails
      this.currentLocation = {
        latitude: 14.5995, // Manila, Philippines
        longitude: 120.9842,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Handle location updates from map component
   */
  onLocationUpdated(location: Location) {
    this.currentLocation = location;
  }

  /**
   * Handle mechanic location updates from map component
   */
  onMechanicLocationUpdated(mechanicLocation: any) {
    // Handle mechanic location updates if needed
    console.log('Mechanic location updated:', mechanicLocation);
  }

  /**
   * Get client location for map component
   */
  getClientLocation(): Location | null {
    return this.clientLocation;
  }

  /**
   * Calculate distance to client
   */
  getDistanceToClient(): string {
    if (this.currentLocation && this.clientLocation) {
      const distance = this.mapboxService.calculateDistance(this.currentLocation, this.clientLocation);
      return `${distance.toFixed(1)} km`;
    }
    return 'Calculating...';
  }

  /**
   * Get estimated arrival time using OpenRouteService
   */
  async getEstimatedArrival(): Promise<string> {
    if (this.currentLocation && this.clientLocation) {
      try {
        // Use OpenRouteService for accurate travel time
        const drivingInfo = await this.mapboxService.getDrivingDistance(this.currentLocation, this.clientLocation);
        return `${Math.round(drivingInfo.duration)} min`;
      } catch (error) {
        console.error('Error getting travel time:', error);
        // Fallback to simple calculation
        const distance = this.mapboxService.calculateDistance(this.currentLocation, this.clientLocation);
        const timeInMinutes = Math.round((distance / 30) * 60);
        return `${timeInMinutes} min`;
      }
    }
    return 'Calculating...';
  }

  /**
   * Navigate back to service requests
   */
  goBack() {
    this.router.navigate(['/mechanic/home']);
  }

  /**
   * Toggle fullscreen mode
   */
  async toggleFullscreen() {
    try {
      if (!this.isFullscreen) {
        // Enter fullscreen
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
          this.isFullscreen = true;
          this.showToast('Entered fullscreen mode', 'success');
        }
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen();
          this.isFullscreen = false;
          this.showToast('Exited fullscreen mode', 'primary');
        }
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
      this.showToast('Fullscreen not supported on this device', 'warning');
    }
  }

  /**
   * Handle fullscreen change events
   */
  private setupFullscreenListeners() {
    document.addEventListener('fullscreenchange', this.handleFullscreenChange);
    document.addEventListener('fullscreenerror', this.handleFullscreenError);
  }

  /**
   * Center map on client location
   */
  centerOnClient() {
    if (this.clientLocation) {
      // This will be handled by the map component
      console.log('Centering on client location:', this.clientLocation);
      this.showToast(`Centering on ${this.clientName}'s location`, 'primary');
    }
  }

  /**
   * Center map on current location
   */
  centerOnCurrent() {
    if (this.currentLocation) {
      // This will be handled by the map component
      console.log('Centering on current location:', this.currentLocation);
      this.showToast('Centering on your location', 'primary');
    }
  }

  /**
   * Toggle route display
   */
  toggleRoute() {
    this.showRoute = !this.showRoute;
    this.showToast(this.showRoute ? 'Route display enabled' : 'Route display disabled', 'primary');
  }

  /**
   * Disable route for debugging
   */
  disableRouteForDebug() {
    if (this.realTimeMapComponent) {
      this.realTimeMapComponent.disableRouteDisplay();
      this.showToast('Route disabled for debugging', 'warning');
    }
  }

  /**
   * Get navigation instructions
   */
  getNavigationInstructions(): string {
    if (!this.currentLocation || !this.clientLocation) {
      return 'Calculating route...';
    }

    const distance = this.mapboxService.calculateDistance(this.currentLocation, this.clientLocation);
    const eta = this.getEstimatedArrival();

    return `Navigate ${distance.toFixed(1)} km to reach ${this.clientName}. Estimated time: ${eta}`;
  }

  /**
   * Retry map initialization
   */
  retryMapInitialization() {
    console.log('Fullscreen map: Retrying map initialization...');
    this.showToast('Retrying map initialization...', 'primary');
    
    // Try to retry the map component directly
    if (this.realTimeMapComponent) {
      this.realTimeMapComponent.retryMapInitialization();
    }
    
    // Also force re-initialization after a short delay
    setTimeout(() => {
      this.initializeMap();
    }, 500);
  }

  /**
   * Show toast message
   */
  private async showToast(message: string, color: 'success' | 'danger' | 'warning' | 'primary' = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color
    });
    await toast.present();
  }
}
