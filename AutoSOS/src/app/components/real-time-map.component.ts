import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import { MapboxService, Location, MechanicLocation, NavigationResponse, NavigationStep } from '../mapbox.service';
import { SupabaseService } from '../supabase.service';
import { LocationSearchComponent } from './location-search.component';
import { Subscription } from 'rxjs';
import { mapboxConfig } from '../../environments/mapbox.config';

@Component({
  selector: 'app-real-time-map',
  template: `
    <div class="map-container" [style.height]="containerHeight">
      <div id="mapbox-map" class="map" [style.height]="containerHeight"></div>
      
      <!-- Loading Indicator -->
      <div class="loading-indicator" *ngIf="!map">
        <ion-spinner name="crescent"></ion-spinner>
        <p>Loading map...</p>
        <p style="font-size: 12px; margin-top: 10px;">If map doesn't load, check console for errors</p>
      </div>
      
      <!-- Fallback Map Display -->
      <div class="fallback-map" *ngIf="!map" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; z-index: 1;">
        <div style="text-align: center;">
          <p>🗺️ Map Loading...</p>
          <p style="font-size: 14px; margin-top: 10px;">Please wait while we initialize the map</p>
          <div *ngIf="mapError" style="margin-top: 20px; padding: 10px; background: rgba(255,0,0,0.2); border-radius: 8px; font-size: 12px;">
            <p style="margin: 0; color: #ffcccb;">Error: {{ mapError }}</p>
            <ion-button fill="outline" size="small" (click)="retryMapInitialization()" style="margin-top: 10px;">
              <ion-icon name="refresh" slot="start"></ion-icon>
              Retry
            </ion-button>
          </div>
        </div>
      </div>
      
      
      <!-- Location Status -->
      <div class="location-status" *ngIf="!isLocationEnabled && map">
        <ion-button (click)="enableLocation()" fill="outline" color="primary">
          <ion-icon name="location" slot="start"></ion-icon>
          Enable Location
        </ion-button>
      </div>

      <!-- Location Search Overlay -->
      <div class="location-search-overlay" *ngIf="showLocationSearch">
        <div class="search-header">
          <h3>Choose Your Location</h3>
          <ion-button fill="clear" (click)="closeLocationSearch()" color="medium">
            <ion-icon name="close"></ion-icon>
          </ion-button>
        </div>
        <app-location-search
          [currentLocation]="currentLocation"
          (locationSelected)="onLocationSelected($event)"
          (searchStarted)="onSearchStarted()">
        </app-location-search>
      </div>

      <!-- Mechanic Info -->
      <div class="mechanic-info" *ngIf="mechanicLocation">
        <ion-card>
          <ion-card-header>
            <ion-card-title>Mechanic Status</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div class="status-row">
              <ion-icon [name]="mechanicLocation.isMoving ? 'car' : 'pause'" 
                       [color]="mechanicLocation.isMoving ? 'success' : 'warning'"></ion-icon>
              <span>{{ mechanicLocation.isMoving ? 'On the way' : 'Stopped' }}</span>
            </div>
            <div class="distance-row" *ngIf="distance">
              <ion-icon name="navigate" color="primary"></ion-icon>
              <span>{{ distance.toFixed(1) }} km away</span>
            </div>
            <div class="eta-row" *ngIf="estimatedArrival">
              <ion-icon name="time" color="secondary"></ion-icon>
              <span>ETA: {{ estimatedArrival }} min</span>
            </div>
          </ion-card-content>
        </ion-card>
      </div>

      <!-- Navigation Controls -->
      <div class="navigation-controls">
        <ion-button (click)="centerOnUser()" fill="clear" color="primary" title="Center on my location">
          <ion-icon name="locate"></ion-icon>
        </ion-button>
        <ion-button (click)="centerOnMechanic()" fill="clear" color="primary" *ngIf="mechanicLocation" title="Center on mechanic">
          <ion-icon name="car"></ion-icon>
        </ion-button>
        <ion-button (click)="centerOnClient()" fill="clear" color="secondary" *ngIf="clientLocation" title="Center on client">
          <ion-icon name="location"></ion-icon>
        </ion-button>
        <ion-button (click)="togglePinMode()" [fill]="isPinMode ? 'solid' : 'outline'" color="warning" title="Pin location mode">
          <ion-icon name="pin"></ion-icon>
        </ion-button>
        <ion-button (click)="toggleTracking()" [fill]="isTracking ? 'solid' : 'outline'" color="primary" title="Toggle tracking">
          <ion-icon [name]="isTracking ? 'pause' : 'play'"></ion-icon>
        </ion-button>
      </div>

      <!-- Pin Mode Instructions -->
      <div class="pin-instructions" *ngIf="isPinMode">
        <ion-card>
          <ion-card-content>
            <div class="instruction-content">
              <ion-icon name="pin" color="warning"></ion-icon>
              <span>Tap anywhere on the map to set your location</span>
            </div>
          </ion-card-content>
        </ion-card>
      </div>
    </div>
  `,
  styles: [`
    .map-container {
      position: relative;
      width: 100%;
      height: 100%;
      min-height: 300px;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      background: #f0f0f0;
      z-index: 1; /* Reset to normal z-index */
    }

    .map {
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
      z-index: 1;
    }

    #mapbox-map {
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
      z-index: 1;
    }
    
    /* Ensure Mapbox elements are not affected by Ionic's CSS */
    .map-container :global(.mapboxgl-canvas-container) {
      width: 100% !important;
      height: 100% !important;
    }
    
    .map-container :global(.mapboxgl-canvas) {
      width: 100% !important;
      height: 100% !important;
    }
    
    .map-container :global(.mapboxgl-control-container) {
      z-index: 1000;
    }

    /* Ensure map markers and overlays are properly positioned */
    .map-container :global(.mapboxgl-marker) {
      z-index: 1000;
    }

    .map-container :global(.mapboxgl-popup) {
      z-index: 1001;
    }

    /* Fix for map elements being cut off */
    .map-container :global(.mapboxgl-canvas-container) {
      overflow: visible !important;
    }

    .loading-indicator {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 1000;
      text-align: center;
      color: #666;
    }

    .loading-indicator ion-spinner {
      margin-bottom: 10px;
    }

    .loading-indicator p {
      margin: 0;
      font-size: 14px;
    }

    .location-status {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 1000;
    }

    .mechanic-info {
      position: absolute;
      top: 16px;
      left: 16px;
      right: 16px;
      z-index: 1000;
    }

    .navigation-controls {
      position: absolute;
      bottom: 16px;
      right: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 1000;
    }

    .navigation-controls ion-button {
      --background: rgba(255, 255, 255, 0.9);
      --color: #333;
      backdrop-filter: blur(10px);
    }

    .status-row, .distance-row, .eta-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 4px 0;
    }

    ion-card {
      margin: 0;
      --background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
    }

    ion-button {
      --border-radius: 50%;
      width: 48px;
      height: 48px;
    }

    .location-search-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      z-index: 2000;
      display: flex;
      flex-direction: column;
    }

    .search-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      background: var(--ion-color-primary);
      color: white;
    }

    .search-header h3 {
      margin: 0;
      font-size: 1.2em;
      font-weight: 600;
    }

    .search-header ion-button {
      --color: white;
      --background: transparent;
      width: 40px;
      height: 40px;
    }

    .pin-instructions {
      position: absolute;
      top: 16px;
      left: 16px;
      right: 16px;
      z-index: 1000;
    }

    .instruction-content {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 500;
    }

    .instruction-content ion-icon {
      font-size: 18px;
    }

    .pin-instructions ion-card {
      margin: 0;
      --background: rgba(255, 193, 7, 0.95);
      backdrop-filter: blur(10px);
    }

    .pin-instructions ion-card-content {
      padding: 12px 16px;
    }

    .pin-instructions span {
      color: #856404;
    }
  `],
  standalone: true,
  imports: [CommonModule, IonicModule, LocationSearchComponent]
})
export class RealTimeMapComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {
  @Input() containerHeight: string = '400px';
  @Input() mechanicId: string | null = null;
  @Input() clientLocation: Location | null = null;
  @Input() showRoute: boolean = false;
  @Input() isVisible: boolean = false;
  
  // Navigation properties
  @Input() showNavigationInstructions: boolean = false;
  @Input() enableVoiceGuidance: boolean = false;
  @Input() enableTraffic: boolean = true;
  @Input() avoidTolls: boolean = false;
  
  @Output() locationUpdated = new EventEmitter<Location>();
  @Output() mechanicLocationUpdated = new EventEmitter<MechanicLocation>();

  // Track previous mechanicId to detect changes
  private previousMechanicId: string | null = null;

  currentLocation: Location | null = null;
  mechanicLocation: MechanicLocation | null = null;
  isLocationEnabled = false;
  isTracking = false;
  distance: number | null = null;
  estimatedArrival: number | null = null;
  showLocationSearch = false;
  isPinMode = false;
  map: any = null; // Make map public for template access
  mapError: string | null = null;
  
  // Navigation properties
  currentRoute: NavigationResponse | null = null;
  navigationInstructions: NavigationStep[] = [];
  currentStepIndex: number = 0;
  isNavigating: boolean = false;
  routeAlternatives: any[] = [];
  
  private subscriptions: Subscription[] = [];
  private userMarker: any;
  private mechanicMarker: any;
  private pinMarker: any;
  private currentMechanicMarker: any;
  private clientMarker: any;
  private routeLayer: any;

  constructor(
    private mapboxService: MapboxService,
    private toastController: ToastController,
    private supabaseService: SupabaseService
  ) {}

  ngOnInit() {
    this.subscribeToLocationUpdates();
    // Don't initialize map here, wait for AfterViewInit
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.mapboxService.stopLocationTracking();
    this.destroyMap();
  }

  /**
   * Destroy the current map instance
   */
  private destroyMap() {
    if (this.map) {
      console.log('Destroying map instance');
      this.map.remove();
      this.map = null;
    }
  }

  /**
   * Recreate the map (useful when container dimensions change)
   */
  public recreateMap() {
    console.log('Recreating map...');
    this.destroyMap();
    setTimeout(() => {
      this.initializeMapManually();
    }, 100);
  }

  /**
   * Force map visibility (debugging method)
   */
  public forceMapVisibility() {
    console.log('Forcing map visibility...');
    const container = document.getElementById('mapbox-map');
    if (container) {
      container.style.display = 'block';
      container.style.visibility = 'visible';
      container.style.opacity = '1';
      container.style.zIndex = '9999';
      container.style.position = 'relative';
      console.log('Map container visibility forced');
    }
    
    if (this.map) {
      console.log('Map exists, forcing resize...');
      this.map.resize();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['mechanicId'] && this.map) {
      console.log('MechanicId changed, reloading mechanic location');
      this.loadMechanicLocation();
    }
    
    if (changes['clientLocation'] && this.map) {
      // console.log('Client location changed, updating client marker'); // Temporarily disabled for debugging
      this.updateClientMarker();
    }
    
    if (changes['showRoute'] && this.map) {
      console.log('Show route changed, updating route display');
      this.updateRouteDisplay();
    }

    if (changes['containerHeight'] && this.map) {
      console.log('Container height changed, resizing map');
      setTimeout(() => {
        if (this.map) {
          this.map.resize();
        }
      }, 100);
    }

    if (changes['isVisible']) {
      console.log('Visibility changed:', changes['isVisible'].currentValue);
      if (changes['isVisible'].currentValue && !this.map) {
        // Component became visible and map doesn't exist, initialize it
        setTimeout(() => {
          this.initializeMapManually();
        }, 100);
      } else if (changes['isVisible'].currentValue && this.map) {
        // Component became visible and map exists, resize it
        setTimeout(() => {
          if (this.map) {
            this.map.resize();
          }
        }, 100);
      }
    }
  }

  private subscribeToLocationUpdates() {
    // Subscribe to current location updates
    const locationSub = this.mapboxService.currentLocation$.subscribe(location => {
      this.currentLocation = location;
      if (location) {
        this.updateUserMarker(location);
        this.calculateDistance();
        this.locationUpdated.emit(location);
      }
    });

    // Subscribe to mechanic location updates
    const mechanicSub = this.mapboxService.mechanicLocation$.subscribe(mechanicLocation => {
      this.mechanicLocation = mechanicLocation;
      if (mechanicLocation) {
        this.updateMechanicMarker(mechanicLocation);
        this.calculateDistance();
        this.estimateArrival();
        this.mechanicLocationUpdated.emit(mechanicLocation);
      }
    });

    // Subscribe to tracking status
    const trackingSub = this.mapboxService.isTracking$.subscribe(isTracking => {
      this.isTracking = isTracking;
    });

    this.subscriptions.push(locationSub, mechanicSub, trackingSub);
  }

  ngAfterViewInit() {
    // Initialize map after view is ready
    setTimeout(() => {
      this.initializeMap();
    }, 200);
    
    // Fallback initialization if the first attempt fails
    setTimeout(() => {
      if (!this.map) {
        console.log('Fallback map initialization attempt');
        this.initializeMap();
      }
    }, 1000);
    
    // Additional fallback for Android devices
    setTimeout(() => {
      if (!this.map) {
        console.log('Android fallback map initialization attempt');
        this.initializeMap();
      }
    }, 3000);
  }

  private async initializeMap() {
    try {
      console.log('Initializing Mapbox map...');
      
      // Check if Mapbox GL JS is available
      if (typeof (window as any).mapboxgl === 'undefined') {
        console.error('Mapbox GL JS not loaded. Please ensure the library is included.');
        this.mapError = 'Mapbox GL JS library not loaded';
        return;
      }

      const mapboxgl = (window as any).mapboxgl;
      console.log('Mapbox GL JS loaded successfully');
      
      // Ensure container has proper dimensions before checking
      this.ensureContainerDimensions();
      
      // Check if container exists and has proper dimensions
      if (!this.checkMapContainer()) {
        console.error('Map container not ready');
        this.mapError = 'Map container not ready';
        return;
      }
      console.log('Map container is ready');
      
      // Set access token
      mapboxgl.accessToken = this.mapboxService.getAccessToken();
      console.log('Mapbox access token set:', this.mapboxService.getAccessToken());
      console.log('Token length:', this.mapboxService.getAccessToken().length);
      
      // Create map instance with Android-specific options
      const mapOptions: any = {
        container: 'mapbox-map',
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [120.9842, 14.5995], // Manila, Philippines
        zoom: 15,
        antialias: true,
        preserveDrawingBuffer: true
      };

      // Add Android-specific options
      if (this.isAndroid()) {
        mapOptions.renderWorldCopies = false;
        mapOptions.maxZoom = 20;
        mapOptions.minZoom = 1;
      }
      
      this.map = new mapboxgl.Map(mapOptions);
      console.log('Map instance created');

      // Wait for map to load
      this.map.on('load', () => {
        this.isLocationEnabled = true;
        
        // Force map to resize to ensure proper display
        setTimeout(() => {
          if (this.map) {
            this.map.resize();
          }
        }, 100);
        
        // Initialize location tracking
        this.mapboxService.initializeLocationTracking();
        
        // Load mechanic location after map is ready
        this.loadMechanicLocation();
      });

      // Add error handling
      this.map.on('error', (e: any) => {
        this.mapError = e.error ? e.error.message : 'Unknown map error';
      });

      // Add style load error handling
      this.map.on('style.load', () => {
        this.mapError = null;
      });

      // Add navigation controls
      this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Add geolocate control
      const geolocate = new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserHeading: true
      });
      
      this.map.addControl(geolocate, 'top-right');

      // Handle geolocate events
      geolocate.on('geolocate', (e: any) => {
        const location: Location = {
          latitude: e.coords.latitude,
          longitude: e.coords.longitude,
          timestamp: Date.now()
        };
        this.currentLocation = location;
        this.updateUserMarker(location);
        this.locationUpdated.emit(location);
      });

      // Add click event listener for pin mode
      this.map.on('click', (e: any) => {
        if (this.isPinMode) {
          this.handleMapClick(e);
        }
      });

      // Change cursor when in pin mode
      this.map.on('mouseenter', () => {
        if (this.isPinMode) {
          this.map.getCanvas().style.cursor = 'crosshair';
        }
      });

      this.map.on('mouseleave', () => {
        if (this.isPinMode) {
          this.map.getCanvas().style.cursor = '';
        }
      });

    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }

  private updateUserMarker(location: Location) {
    if (!this.map) return;

    if (this.userMarker) {
      this.userMarker.setLngLat([location.longitude, location.latitude]);
    } else {
      // Create new user marker
      const mapboxgl = (window as any).mapboxgl;
      
      // Create a custom marker element
      const el = document.createElement('div');
      el.className = 'user-marker';
      el.style.width = '20px';
      el.style.height = '20px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = '#007bff';
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      
      this.userMarker = new mapboxgl.Marker(el)
        .setLngLat([location.longitude, location.latitude])
        .addTo(this.map);
      
      // console.log('Created user marker at:', location); // Temporarily disabled for debugging
    }
  }

  private updateMechanicMarker(mechanicLocation: MechanicLocation) {
    if (!this.map) return;

    if (this.mechanicMarker) {
      this.mechanicMarker.setLngLat([
        mechanicLocation.location.longitude, 
        mechanicLocation.location.latitude
      ]);
    } else {
      // Create new mechanic marker
      const mapboxgl = (window as any).mapboxgl;
      
      // Create a custom marker element for mechanic
      const el = document.createElement('div');
      el.className = 'mechanic-marker';
      el.style.width = '24px';
      el.style.height = '24px';
      el.style.borderRadius = '4px';
      el.style.backgroundColor = '#28a745';
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      el.style.transform = 'rotate(45deg)';
      
      this.mechanicMarker = new mapboxgl.Marker(el)
        .setLngLat([
          mechanicLocation.location.longitude, 
          mechanicLocation.location.latitude
        ])
        .addTo(this.map);
      
      // console.log('Created mechanic marker at:', mechanicLocation.location); // Temporarily disabled for debugging
    }
  }

  private calculateDistance() {
    if (this.currentLocation && this.mechanicLocation) {
      this.distance = this.mapboxService.calculateDistance(
        this.currentLocation, 
        this.mechanicLocation.location
      );
    }
  }

  private async estimateArrival() {
    if (this.currentLocation && this.mechanicLocation) {
      try {
        this.estimatedArrival = await this.mapboxService.getEstimatedArrival(
          this.mechanicLocation.location,
          this.currentLocation
        );
      } catch (error) {
        console.error('Error estimating arrival:', error);
      }
    }
  }

  async enableLocation() {
    try {
      await this.mapboxService.initializeLocationTracking();
      this.isLocationEnabled = true;
    } catch (error) {
      console.error('Error enabling location:', error);
    }
  }

  toggleTracking() {
    if (this.isTracking) {
      this.mapboxService.stopLocationTracking();
    } else {
      this.mapboxService.startLocationTracking();
    }
  }

  centerOnUser() {
    if (this.currentLocation && this.map) {
      this.map.flyTo({
        center: [this.currentLocation.longitude, this.currentLocation.latitude],
        zoom: 15
      });
    }
  }

  centerOnMechanic() {
    if (this.mechanicLocation && this.map) {
      this.map.flyTo({
        center: [
          this.mechanicLocation.location.longitude, 
          this.mechanicLocation.location.latitude
        ],
        zoom: 15
      });
    }
  }

  centerOnClient() {
    if (this.clientLocation && this.map) {
      this.map.flyTo({
        center: [this.clientLocation.longitude, this.clientLocation.latitude],
        zoom: 15
      });
    }
  }

  // ========================================
  // LOCATION SEARCH METHODS
  // ========================================

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
    this.currentLocation = location;
    this.updateUserMarker(location);
    this.calculateDistance();
    this.locationUpdated.emit(location);
    this.closeLocationSearch();
  }

  /**
   * Handle search started event
   */
  onSearchStarted() {
    // Additional logic when search starts
    console.log('Location search started');
  }

  // ========================================
  // PIN MODE METHODS
  // ========================================

  /**
   * Manually initialize the map (public method for parent components)
   */
  public initializeMapManually() {
    console.log('Manual map initialization requested');
    
    // If map already exists, just resize it
    if (this.map) {
      console.log('Map already exists, resizing...');
      setTimeout(() => {
        if (this.map) {
          this.map.resize();
        }
      }, 100);
      return;
    }
    
    // Wait for container to be ready with multiple attempts
    this.waitForContainerAndInitialize();
  }

  /**
   * Wait for container to be ready and then initialize map
   */
  private waitForContainerAndInitialize(attempts: number = 0) {
    const maxAttempts = 10;
    const delay = 200; // 200ms between attempts
    
    console.log(`Checking container readiness (attempt ${attempts + 1}/${maxAttempts})`);
    
    if (this.checkMapContainer()) {
      console.log('Container is ready, initializing map...');
      this.initializeMap();
    } else if (attempts < maxAttempts) {
      console.log(`Container not ready, retrying in ${delay}ms...`);
      setTimeout(() => {
        this.waitForContainerAndInitialize(attempts + 1);
      }, delay);
    } else {
      console.error('Container never became ready after maximum attempts');
      // Force initialization anyway as a fallback
      this.initializeMapForcibly();
    }
  }

  /**
   * Force map initialization even if container check fails
   */
  private initializeMapForcibly() {
    try {
      console.log('Force initializing map...');
      
      // Check if Mapbox GL JS is available
      if (typeof (window as any).mapboxgl === 'undefined') {
        console.error('Mapbox GL JS not loaded. Please ensure the library is included.');
        return;
      }

      const mapboxgl = (window as any).mapboxgl;
      console.log('Mapbox GL JS loaded successfully');
      
      // Set access token
      mapboxgl.accessToken = mapboxConfig.accessToken;
      console.log('Mapbox access token set');
      
      // Create map instance
      this.map = new mapboxgl.Map({
        container: 'mapbox-map',
        style: mapboxConfig.defaultStyle,
        center: [mapboxConfig.defaultCenter.longitude, mapboxConfig.defaultCenter.latitude],
        zoom: mapboxConfig.defaultZoom
      });
      console.log('Map instance created (forced)');

      // Wait for map to load
      this.map.on('load', () => {
        this.isLocationEnabled = true;
        
        // Force map to resize to ensure proper display
        setTimeout(() => {
          if (this.map) {
            this.map.resize();
          }
        }, 100);
        
        // Initialize location tracking
        this.mapboxService.initializeLocationTracking();
        
        // Load mechanic location after map is ready
        this.loadMechanicLocation();
      });

      // Add error handling
      this.map.on('error', (e: any) => {
        this.mapError = e.error ? e.error.message : 'Unknown map error';
      });

      // Add style load error handling
      this.map.on('style.load', () => {
        this.mapError = null;
      });

      // Add navigation controls
      this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Add geolocate control
      const geolocate = new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserHeading: true
      });
      
      this.map.addControl(geolocate, 'top-right');

      // Handle geolocate events
      geolocate.on('geolocate', (e: any) => {
        const location: Location = {
          latitude: e.coords.latitude,
          longitude: e.coords.longitude,
          timestamp: Date.now()
        };
        this.currentLocation = location;
        this.updateUserMarker(location);
        this.locationUpdated.emit(location);
      });

      // Add click event listener for pin mode
      this.map.on('click', (e: any) => {
        if (this.isPinMode) {
          this.handleMapClick(e);
        }
      });

      // Change cursor when in pin mode
      this.map.on('mouseenter', () => {
        if (this.isPinMode) {
          this.map.getCanvas().style.cursor = 'crosshair';
        }
      });

      this.map.on('mouseleave', () => {
        if (this.isPinMode) {
          this.map.getCanvas().style.cursor = '';
        }
      });

    } catch (error) {
      console.error('Error force initializing map:', error);
    }
  }

  /**
   * Ensure container has proper dimensions before map initialization
   */
  private ensureContainerDimensions() {
    const container = document.getElementById('mapbox-map');
    if (!container) {
      console.log('Container not found for dimension check');
      return;
    }

    const computedStyle = window.getComputedStyle(container);
    const currentWidth = parseFloat(computedStyle.width) || 0;
    const currentHeight = parseFloat(computedStyle.height) || 0;

    console.log(`Current container dimensions: ${currentWidth}x${currentHeight}`);

    // If dimensions are zero or very small, try to set them explicitly
    if (currentWidth <= 0 || currentHeight <= 0) {
      console.log('Container has zero dimensions, attempting to fix...');
      
      // Parse the containerHeight input to get numeric value
      const heightValue = parseFloat(this.containerHeight.replace('px', ''));
      if (heightValue > 0) {
        container.style.height = this.containerHeight;
        container.style.width = '100%';
        console.log(`Set container dimensions to: 100% x ${this.containerHeight}`);
      }
    }
  }

  /**
   * Check if map container is ready
   */
  private checkMapContainer() {
    const container = document.getElementById('mapbox-map');
    if (!container) {
      console.log('Map container element not found');
      return false;
    }
    
    const rect = container.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(container);
    const width = parseFloat(computedStyle.width) || rect.width;
    const height = parseFloat(computedStyle.height) || rect.height;
    
    console.log(`Container dimensions: ${width}x${height} (rect: ${rect.width}x${rect.height})`);
    console.log(`Container computed style: width=${computedStyle.width}, height=${computedStyle.height}`);
    
    // Mapbox requires both width and height to be greater than 0
    if (width <= 0 || height <= 0) {
      console.log('Container dimensions are zero or negative');
      return false;
    }
    
    // Also check if container is visible
    if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
      console.log('Container is not visible');
      return false;
    }
    
    console.log('Container is ready with valid dimensions');
    return true;
  }


  /**
   * Toggle pin mode for manual location selection
   */
  togglePinMode() {
    this.isPinMode = !this.isPinMode;
    
    if (this.isPinMode) {
      console.log('Pin mode enabled - click on map to set location');
    } else {
      console.log('Pin mode disabled');
      this.removePinMarker();
    }
  }

  /**
   * Handle map click when in pin mode
   */
  private handleMapClick(e: any) {
    const lng = e.lngLat.lng;
    const lat = e.lngLat.lat;
    
    console.log('Map clicked at:', { lat, lng });
    
    // Create location object
    const location: Location = {
      latitude: lat,
      longitude: lng,
      timestamp: Date.now()
    };
    
    // Place pin marker
    this.placePinMarker(location);
    
    // Update current location
    this.currentLocation = location;
    this.updateUserMarker(location);
    
    // Emit location update
    this.locationUpdated.emit(location);
    
    // Show confirmation
    this.showLocationConfirmation(location);
    
    // Exit pin mode
    this.isPinMode = false;
  }

  /**
   * Place a pin marker at the specified location
   */
  private placePinMarker(location: Location) {
    if (!this.map) return;

    // Remove existing pin marker
    this.removePinMarker();

    const mapboxgl = (window as any).mapboxgl;
    
    // Create a custom pin marker element
    const el = document.createElement('div');
    el.className = 'pin-marker';
    el.style.width = '30px';
    el.style.height = '30px';
    el.style.backgroundImage = 'url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'%23dc3545\'%3E%3Cpath d=\'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z\'/%3E%3C/svg%3E")';
    el.style.backgroundSize = 'contain';
    el.style.backgroundRepeat = 'no-repeat';
    el.style.backgroundPosition = 'center';
    el.style.cursor = 'pointer';
    
    this.pinMarker = new mapboxgl.Marker(el)
      .setLngLat([location.longitude, location.latitude])
      .addTo(this.map);
    
    console.log('Pin marker placed at:', location);
  }

  /**
   * Remove the pin marker
   */
  private removePinMarker() {
    if (this.pinMarker) {
      this.pinMarker.remove();
      this.pinMarker = null;
    }
  }

  /**
   * Show location confirmation dialog
   */
  private async showLocationConfirmation(location: Location) {
    try {
      // Get address from coordinates
      const address = await this.mapboxService.getAddressFromCoordinates(location);
      
      // Show toast notification
      const toast = await this.toastController.create({
        message: `Location set to: ${address}`,
        duration: 3000,
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
      
      console.log('Location set to:', address);
    } catch (error) {
      console.error('Error getting address for confirmation:', error);
      
      // Show fallback toast
      const toast = await this.toastController.create({
        message: 'Location set successfully',
        duration: 2000,
        position: 'top',
        color: 'success'
      });
      await toast.present();
    }
  }

  // ========================================
  // MECHANIC LOCATION METHODS
  // ========================================

  /**
   * Load mechanic's current location from the database
   */
  private async loadMechanicLocation() {
    if (!this.mechanicId) {
      console.log('No mechanicId provided, skipping mechanic location load');
      return;
    }

    console.log('Loading mechanic location for ID:', this.mechanicId);

    try {
      // Get mechanic's profile with location data
      const { data: profile, error } = await this.supabaseService
        .from('profiles')
        .select('latitude, longitude, full_name')
        .eq('user_id', this.mechanicId)
        .single();

      if (error) {
        console.error('Error loading mechanic location:', error);
        // Create a default marker at Manila if no location data
        this.createDefaultMechanicMarker();
        return;
      }

      console.log('Profile data loaded:', profile);

      if (profile && profile.latitude && profile.longitude) {
        const mechanicLocation: Location = {
          latitude: profile.latitude,
          longitude: profile.longitude,
          timestamp: Date.now()
        };

        // Create mechanic marker
        this.createMechanicMarker(mechanicLocation, profile.full_name || 'Mechanic');
        
        console.log('Mechanic location loaded:', mechanicLocation);
      } else {
        console.log('No location data found, creating default marker');
        // Create a default marker at Manila if no location data
        this.createDefaultMechanicMarker();
      }
    } catch (error) {
      console.error('Error loading mechanic location:', error);
      // Create a default marker at Manila if error occurs
      this.createDefaultMechanicMarker();
    }
  }

  /**
   * Create a default mechanic marker at Manila coordinates
   */
  private createDefaultMechanicMarker() {
    const defaultLocation: Location = {
      latitude: 14.5995, // Manila, Philippines
      longitude: 120.9842,
      timestamp: Date.now()
    };

    this.createMechanicMarker(defaultLocation, 'Mechanic');
    console.log('Default mechanic marker created at Manila');
  }

  /**
   * Create a marker for the mechanic's current location
   */
  private createMechanicMarker(location: Location, mechanicName: string) {
    if (!this.map) return;

    // Remove existing mechanic marker
    this.removeMechanicMarker();

    const mapboxgl = (window as any).mapboxgl;
    
    // Create a custom mechanic marker element
    const el = document.createElement('div');
    el.className = 'mechanic-current-marker';
    el.style.width = '32px';
    el.style.height = '32px';
    el.style.backgroundImage = 'url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'%23ff6b35\'%3E%3Cpath d=\'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z\'/%3E%3C/svg%3E")';
    el.style.backgroundSize = 'contain';
    el.style.backgroundRepeat = 'no-repeat';
    el.style.backgroundPosition = 'center';
    el.style.cursor = 'pointer';
    el.style.border = '3px solid white';
    el.style.borderRadius = '50%';
    el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
    
    // Create popup with mechanic info
    const popup = new mapboxgl.Popup({
      offset: 25,
      closeButton: true,
      closeOnClick: false
    }).setHTML(`
      <div style="padding: 8px; text-align: center;">
        <h4 style="margin: 0 0 4px 0; color: #333; font-size: 14px;">${mechanicName}</h4>
        <p style="margin: 0; color: #666; font-size: 12px;">Current Location</p>
      </div>
    `);
    
    this.currentMechanicMarker = new mapboxgl.Marker(el)
      .setLngLat([location.longitude, location.latitude])
      .setPopup(popup)
      .addTo(this.map);
    
    console.log('Mechanic marker created at:', location);
  }

  /**
   * Remove the mechanic marker
   */
  private removeMechanicMarker() {
    if (this.currentMechanicMarker) {
      this.currentMechanicMarker.remove();
      this.currentMechanicMarker = null;
    }
  }

  /**
   * Update mechanic marker position
   */
  private updateMechanicMarkerPosition(location: Location) {
    if (this.currentMechanicMarker) {
      this.currentMechanicMarker.setLngLat([location.longitude, location.latitude]);
    }
  }

  /**
   * Handle location updates from parent component
   */
  onLocationUpdated(location: Location) {
    // console.log('Location updated from parent:', location); // Temporarily disabled for debugging
    
    // Update the mechanic marker position if this is the mechanic's location
    if (this.mechanicId) {
      this.updateMechanicMarkerPosition(location);
    }
    
    // Emit the location update
    this.locationUpdated.emit(location);
  }

  /**
   * Handle mechanic location updates from parent component
   */
  onMechanicLocationUpdated(mechanicLocation: MechanicLocation) {
    // console.log('Mechanic location updated from parent:', mechanicLocation); // Temporarily disabled for debugging
    
    // Update the mechanic marker if this is the current mechanic
    if (this.mechanicId === mechanicLocation.mechanicId) {
      this.updateMechanicMarkerPosition(mechanicLocation.location);
    }
    
    // Update route if showing route
    if (this.showRoute && this.clientLocation) {
      this.updateRouteDisplay();
    }
    
    // Emit the mechanic location update
    this.mechanicLocationUpdated.emit(mechanicLocation);
  }

  // ========================================
  // CLIENT LOCATION AND ROUTE METHODS
  // ========================================

  /**
   * Update client marker
   */
  private updateClientMarker() {
    if (!this.map || !this.clientLocation) {
      this.removeClientMarker();
      return;
    }

    this.removeClientMarker();

    const mapboxgl = (window as any).mapboxgl;
    
    // Create a custom client marker element
    const el = document.createElement('div');
    el.className = 'client-marker';
    el.style.width = '28px';
    el.style.height = '28px';
    el.style.backgroundImage = 'url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'%23007bff\'%3E%3Cpath d=\'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z\'/%3E%3C/svg%3E")';
    el.style.backgroundSize = 'contain';
    el.style.backgroundRepeat = 'no-repeat';
    el.style.backgroundPosition = 'center';
    el.style.cursor = 'pointer';
    el.style.border = '3px solid white';
    el.style.borderRadius = '50%';
    el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
    
    // Create popup with client info
    const popup = new mapboxgl.Popup({
      offset: 25,
      closeButton: true,
      closeOnClick: false
    }).setHTML(`
      <div style="padding: 8px; text-align: center;">
        <h4 style="margin: 0 0 4px 0; color: #333; font-size: 14px;">Client Location</h4>
        <p style="margin: 0; color: #666; font-size: 12px;">Service Request Location</p>
      </div>
    `);
    
    this.clientMarker = new mapboxgl.Marker(el)
      .setLngLat([this.clientLocation.longitude, this.clientLocation.latitude])
      .setPopup(popup)
      .addTo(this.map);
    
    // Center the map on the client location
    this.map.flyTo({
      center: [this.clientLocation.longitude, this.clientLocation.latitude],
      zoom: 15
    });
    
    // console.log('Client marker created and map centered at:', this.clientLocation); // Temporarily disabled for debugging
  }

  /**
   * Remove the client marker
   */
  private removeClientMarker() {
    if (this.clientMarker) {
      this.clientMarker.remove();
      this.clientMarker = null;
    }
  }

  /**
   * Update route display between mechanic and client
   */
  private async updateRouteDisplay() {
    if (!this.map || !this.showRoute || !this.clientLocation) {
      this.removeRoute();
      return;
    }

    // Get mechanic location
    const mechanicLocation = this.currentMechanicMarker ? 
      this.getMechanicLocationFromMarker() : null;

    if (!mechanicLocation) {
      console.log('No mechanic location available for route');
      return;
    }

    try {
      console.log('Getting enhanced directions from:', mechanicLocation, 'to:', this.clientLocation);
      
      // Get directions with traffic and navigation instructions
      let directions: NavigationResponse;
      
      if (this.enableTraffic) {
        directions = await this.mapboxService.getRouteWithTraffic(mechanicLocation, this.clientLocation);
      } else if (this.avoidTolls) {
        directions = await this.mapboxService.getRouteAvoiding(mechanicLocation, this.clientLocation, ['tolls']);
      } else {
        directions = await this.mapboxService.getDirections(mechanicLocation, this.clientLocation);
      }
      
      console.log('Enhanced directions response:', directions);
      
      if (directions.routes && directions.routes.length > 0) {
        const route = directions.routes[0];
        this.currentRoute = directions;
        
        // Store navigation instructions
        if (this.showNavigationInstructions && route.steps) {
          this.navigationInstructions = route.steps;
          this.currentStepIndex = 0;
        }
        
        console.log('Route found, displaying...');
        this.displayRoute(route);
        
        // Update estimated arrival time
        this.estimatedArrival = Math.round(route.duration / 60);
        
        // Calculate distance
        this.distance = route.distance / 1000; // Convert meters to kilometers
        
        console.log('Route updated successfully. Distance:', this.distance, 'km, ETA:', this.estimatedArrival, 'min');
        
        // Get alternative routes if requested
        if (this.routeAlternatives.length === 0) {
          this.getAlternativeRoutes();
        }
        
      } else {
        console.log('No routes found in response, drawing simple line');
        this.drawSimpleRoute(mechanicLocation, this.clientLocation);
      }
    } catch (error) {
      console.error('Error getting enhanced route:', error);
      console.log('Drawing simple route as fallback');
      this.drawSimpleRoute(mechanicLocation, this.clientLocation);
    }
  }

  /**
   * Get alternative routes
   */
  private async getAlternativeRoutes() {
    if (!this.currentMechanicMarker || !this.clientLocation) return;
    
    const mechanicLocation = this.getMechanicLocationFromMarker();
    if (!mechanicLocation) return;
    
    try {
      this.routeAlternatives = await this.mapboxService.getAlternativeRoutes(
        mechanicLocation, 
        this.clientLocation, 
        2
      );
      console.log('Alternative routes:', this.routeAlternatives);
    } catch (error) {
      console.error('Error getting alternative routes:', error);
    }
  }

  /**
   * Start navigation with turn-by-turn instructions
   */
  async startNavigation() {
    if (!this.currentRoute || !this.navigationInstructions.length) {
      console.log('No route or instructions available for navigation');
      return;
    }
    
    this.isNavigating = true;
    this.currentStepIndex = 0;
    
    // Announce first instruction
    if (this.enableVoiceGuidance) {
      this.announceInstruction(this.navigationInstructions[0]);
    }
    
    console.log('Navigation started with', this.navigationInstructions.length, 'steps');
  }

  /**
   * Stop navigation
   */
  stopNavigation() {
    this.isNavigating = false;
    this.currentStepIndex = 0;
    console.log('Navigation stopped');
  }

  /**
   * Get next navigation instruction
   */
  getNextInstruction(): NavigationStep | null {
    if (!this.isNavigating || this.currentStepIndex >= this.navigationInstructions.length) {
      return null;
    }
    
    return this.navigationInstructions[this.currentStepIndex];
  }

  /**
   * Move to next instruction
   */
  nextInstruction() {
    if (this.currentStepIndex < this.navigationInstructions.length - 1) {
      this.currentStepIndex++;
      
      if (this.enableVoiceGuidance) {
        this.announceInstruction(this.navigationInstructions[this.currentStepIndex]);
      }
    }
  }

  /**
   * Announce instruction using Web Speech API
   */
  private announceInstruction(instruction: NavigationStep) {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(instruction.instruction);
      utterance.rate = 0.8;
      utterance.pitch = 1;
      speechSynthesis.speak(utterance);
    }
  }

  /**
   * Get mechanic location from marker
   */
  private getMechanicLocationFromMarker(): Location | null {
    if (!this.currentMechanicMarker) return null;
    
    const lngLat = this.currentMechanicMarker.getLngLat();
    return {
      latitude: lngLat.lat,
      longitude: lngLat.lng,
      timestamp: Date.now()
    };
  }

  /**
   * Display route on map
   */
  private displayRoute(route: any) {
    this.removeRoute();

    const mapboxgl = (window as any).mapboxgl;
    
    // Add route source
    this.map.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: route.geometry
      }
    });

    // Add route layer
    this.map.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#ff6b35',
        'line-width': 4,
        'line-opacity': 0.8
      }
    });

    console.log('Route displayed on map');
  }

  /**
   * Remove route from map
   */
  private removeRoute() {
    if (this.map.getLayer('route')) {
      this.map.removeLayer('route');
    }
    if (this.map.getSource('route')) {
      this.map.removeSource('route');
    }
    // Also remove simple route
    if (this.map.getLayer('simple-route')) {
      this.map.removeLayer('simple-route');
    }
    if (this.map.getSource('simple-route')) {
      this.map.removeSource('simple-route');
    }
  }

  /**
   * Draw a simple straight line route as fallback
   */
  private drawSimpleRoute(origin: Location, destination: Location) {
    if (!this.map) return;

    console.log('Drawing simple route between:', origin, 'and:', destination);

    // Remove existing simple route
    if (this.map.getLayer('simple-route')) {
      this.map.removeLayer('simple-route');
    }
    if (this.map.getSource('simple-route')) {
      this.map.removeSource('simple-route');
    }

    // Create a simple line between the two points
    const routeData = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [
          [origin.longitude, origin.latitude],
          [destination.longitude, destination.latitude]
        ]
      }
    };

    // Add route source
    this.map.addSource('simple-route', {
      type: 'geojson',
      data: routeData
    });

    // Add route layer
    this.map.addLayer({
      id: 'simple-route',
      type: 'line',
      source: 'simple-route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#ff6b6b',
        'line-width': 4,
        'line-opacity': 0.8
      }
    });

    console.log('Simple route drawn successfully');
  }

  /**
   * Get the current location
   */
  getCurrentLocation(): Location | null {
    return this.currentLocation;
  }

  /**
   * Check if running on Android
   */
  private isAndroid(): boolean {
    return /Android/i.test(navigator.userAgent);
  }

  /**
   * Public method to retry map initialization
   */
  retryMapInitialization() {
    console.log('Retrying map initialization...');
    this.mapError = null;
    
    // Destroy existing map if it exists
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    
    // Clear any existing container content
    const container = document.getElementById('mapbox-map');
    if (container) {
      container.innerHTML = '';
    }
    
    // Wait a bit then reinitialize
    setTimeout(() => {
      this.initializeMap();
    }, 500);
  }

  /**
   * Public method to disable route display for debugging
   */
  disableRouteDisplay() {
    console.log('Disabling route display for debugging');
    this.showRoute = false;
    this.removeRoute();
  }

  /**
   * Public method to enable route display
   */
  enableRouteDisplay() {
    console.log('Enabling route display');
    this.showRoute = true;
    this.updateRouteDisplay();
  }
}
