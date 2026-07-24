import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { IonicModule, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { RealTimeMapComponent } from '../../../components/real-time-map.component';
import { MapboxService, Location } from '../../../mapbox.service';
import { SupabaseService } from '../../../supabase.service';

@Component({
  selector: 'app-client-fullscreen-map',
  templateUrl: 'fullscreen-map.page.html',
  styleUrls: ['fullscreen-map.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RealTimeMapComponent]
})
export class ClientFullscreenMapPage implements OnInit, OnDestroy {
  @ViewChild('realTimeMap') realTimeMapComponent!: RealTimeMapComponent;
  // Route parameters
  mechanicId: string | null = null;
  mechanicLat: number = 0;
  mechanicLng: number = 0;
  mechanicName: string = 'Mechanic';
  clientLat: number = 0;
  clientLng: number = 0;

  // Location data
  mechanicLocation: Location | null = null;
  clientLocation: Location | null = null;

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
      this.mechanicId = params['mechanicId'] || null;
      this.mechanicLat = parseFloat(params['mechanicLat']) || 0;
      this.mechanicLng = parseFloat(params['mechanicLng']) || 0;
      this.mechanicName = params['mechanicName'] || 'Mechanic';
      this.clientLat = parseFloat(params['clientLat']) || 0;
      this.clientLng = parseFloat(params['clientLng']) || 0;
      this.showRoute = String(params['showRoute']).toLowerCase() === 'true' || this.showRoute;

      // Create location objects
      if (this.mechanicLat && this.mechanicLng) {
        this.mechanicLocation = {
          latitude: this.mechanicLat,
          longitude: this.mechanicLng,
          timestamp: Date.now()
        };
      }

      if (this.clientLat && this.clientLng) {
        this.clientLocation = {
          latitude: this.clientLat,
          longitude: this.clientLng,
          timestamp: Date.now()
        };
      }
    });
  }

  /**
   * Retry map initialization
   */
  retryMapInitialization() {
    try {
      if (this.realTimeMapComponent) {
        this.realTimeMapComponent.retryMapInitialization();
      }
    } catch {}
  }

  /**
   * Initialize map and location tracking
   */
  private async initializeMap() {
    try {
      // Map is ready
      console.log('Client fullscreen map initialized');
    } catch (error) {
      console.error('Error initializing map:', error);
      this.showToast('Error initializing map', 'danger');
    }
  }

  /**
   * Handle location updates from map component
   */
  onLocationUpdated(location: Location) {
    this.clientLocation = location;
  }

  /**
   * Handle mechanic location updates from map component
   */
  onMechanicLocationUpdated(mechanicLocation: any) {
    this.mechanicLocation = mechanicLocation.location;
  }

  /**
   * Get mechanic location for map component
   */
  getMechanicLocation(): Location | null {
    return this.mechanicLocation;
  }

  /**
   * Get client location for map component
   */
  getClientLocation(): Location | null {
    return this.clientLocation;
  }

  /**
   * Calculate distance to mechanic
   */
  getDistanceToMechanic(): string {
    if (this.clientLocation && this.mechanicLocation) {
      const distance = this.mapboxService.calculateDistance(this.clientLocation, this.mechanicLocation);
      return `${distance.toFixed(1)} km`;
    }
    return 'Calculating...';
  }

  /**
   * Get estimated arrival time
   */
  getEstimatedArrival(): string {
    if (this.clientLocation && this.mechanicLocation) {
      // Simple calculation based on distance (assuming 30 km/h average speed)
      const distance = this.mapboxService.calculateDistance(this.clientLocation, this.mechanicLocation);
      const timeInMinutes = Math.round((distance / 30) * 60);
      return `${timeInMinutes} min`;
    }
    return 'Calculating...';
  }

  /**
   * Navigate back to mechanic finder
   */
  goBack() {
    this.router.navigate(['/client/mechanic-finder']);
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
   * Center map on mechanic location
   */
  centerOnMechanic() {
    if (this.mechanicLocation) {
      console.log('Centering on mechanic location:', this.mechanicLocation);
      this.showToast(`Centering on ${this.mechanicName}'s location`, 'primary');
    }
  }

  /**
   * Center map on current location
   */
  centerOnCurrent() {
    if (this.clientLocation) {
      console.log('Centering on current location:', this.clientLocation);
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
   * Get navigation instructions
   */
  getNavigationInstructions(): string {
    if (!this.clientLocation || !this.mechanicLocation) {
      return 'Calculating route...';
    }

    const distance = this.mapboxService.calculateDistance(this.clientLocation, this.mechanicLocation);
    const eta = this.getEstimatedArrival();

    return `Your mechanic ${this.mechanicName} is ${distance.toFixed(1)} km away. Estimated arrival: ${eta}`;
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
