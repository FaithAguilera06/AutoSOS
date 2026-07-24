import { Component, OnInit, OnDestroy } from '@angular/core';
import { IonicModule, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Geolocation } from '@capacitor/geolocation';
import { SupabaseService } from '../../../supabase.service';

@Component({
  selector: 'app-real-time-navigation',
  templateUrl: 'real-time-navigation.page.html',
  styleUrls: ['real-time-navigation.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class RealTimeNavigationPage implements OnInit, OnDestroy {
  // Route parameters
  mechanicId: string = '';
  clientLat: number = 0;
  clientLng: number = 0;
  clientName: string = '';
  mechanicLat: number = 0;
  mechanicLng: number = 0;
  clientPhone: string = '';

  // Map and navigation state
  map: any = null;
  mapLoaded = false;
  isFullscreen = false;
  isTracking = false;
  isLoadingRoute = false;
  routeLoaded = false;

  // Location data
  mechanicLocation: any = null;
  clientLocation: any = null;
  routeDistance: string = '';
  routeDuration: string = '';

  // Mapbox configuration
  private mapboxToken = 'pk.eyJ1IjoiYXV0b3NvczEyMyIsImEiOiJjbWdvNHJ0MDkxcjJtMm5va2lhNnB1YjR0In0.8hQ5bC4FlZKZFevZQvBzNg';
  private locationWatchId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supabaseService: SupabaseService,
    private toastController: ToastController
  ) {}

  async ngOnInit() {
    // Get route parameters
    this.route.queryParams.subscribe(params => {
      this.mechanicId = params['mechanicId'] || '';
      this.clientLat = parseFloat(params['clientLat']) || 0;
      this.clientLng = parseFloat(params['clientLng']) || 0;
      this.clientName = params['clientName'] || 'Client';
      this.mechanicLat = parseFloat(params['mechanicLat']) || 0;
      this.mechanicLng = parseFloat(params['mechanicLng']) || 0;
    });

    // Initialize locations
    this.clientLocation = {
      latitude: this.clientLat,
      longitude: this.clientLng
    };

    this.mechanicLocation = {
      latitude: this.mechanicLat,
      longitude: this.mechanicLng
    };

    // Initialize map
    await this.initializeMap();
    
    // Start location tracking
    await this.startLocationTracking();
  }

  ngOnDestroy() {
    if (this.locationWatchId) {
      Geolocation.clearWatch({ id: this.locationWatchId });
    }
  }

  async initializeMap() {
    try {
      // Load Mapbox GL JS
      if (typeof (window as any).mapboxgl === 'undefined') {
        await this.loadMapboxScript();
      }

      const mapboxgl = (window as any).mapboxgl;
      mapboxgl.accessToken = this.mapboxToken;

      // Create map
      this.map = new mapboxgl.Map({
        container: 'navigation-map',
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [this.clientLng, this.clientLat],
        zoom: 13
      });

      this.map.on('load', () => {
        this.mapLoaded = true;
        this.addMarkers();
        this.loadRoute();
      });

      // Add navigation controls
      this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    } catch (error) {
      console.error('Error initializing map:', error);
      this.showToast('Error loading map', 'danger');
    }
  }

  private async loadMapboxScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.1.2/mapbox-gl.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Mapbox GL JS'));
      document.head.appendChild(script);

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.1.2/mapbox-gl.css';
      document.head.appendChild(link);
    });
  }

  addMarkers() {
    const mapboxgl = (window as any).mapboxgl;

    // Add client marker
    new mapboxgl.Marker({ color: '#ff3b30' })
      .setLngLat([this.clientLng, this.clientLat])
      .setPopup(new mapboxgl.Popup().setHTML(`<h4>${this.clientName}</h4><p>Client Location</p>`))
      .addTo(this.map);

    // Add mechanic marker
    if (this.mechanicLocation) {
      new mapboxgl.Marker({ color: '#0a7cff' })
        .setLngLat([this.mechanicLng, this.mechanicLat])
        .setPopup(new mapboxgl.Popup().setHTML('<h4>Your Location</h4><p>Mechanic Position</p>'))
        .addTo(this.map);
    }
  }

  async loadRoute() {
    if (!this.map || !this.clientLocation || !this.mechanicLocation) return;

    this.isLoadingRoute = true;

    try {
      const start = `${this.mechanicLng},${this.mechanicLat}`;
      const end = `${this.clientLng},${this.clientLat}`;

      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${start};${end}?geometries=geojson&access_token=${this.mapboxToken}`
      );

      if (!response.ok) {
        throw new Error('Failed to get directions');
      }

      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        
        // Update route info
        this.routeDistance = (route.distance / 1000).toFixed(1) + ' km';
        this.routeDuration = Math.round(route.duration / 60) + ' min';

        // Add route to map
        this.map.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: route.geometry
          }
        });

        this.map.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#1f75fe',
            'line-width': 6,
            'line-opacity': 0.8
          }
        });

        // Fit map to route
        const bounds = new (window as any).mapboxgl.LngLatBounds();
        route.geometry.coordinates.forEach((coord: number[]) => {
          bounds.extend(coord);
        });
        this.map.fitBounds(bounds, { padding: 50 });

        this.routeLoaded = true;
        this.showToast('Route loaded successfully', 'success');
      }
    } catch (error) {
      console.error('Error loading route:', error);
      this.showToast('Error loading route', 'danger');
    } finally {
      this.isLoadingRoute = false;
    }
  }

  async startLocationTracking() {
    try {
      const watchId = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 1000
        },
        (position) => {
          if (position) {
            this.updateMechanicLocation(position.coords.latitude, position.coords.longitude);
          }
        }
      );

      this.locationWatchId = watchId;
      this.isTracking = true;
    } catch (error) {
      console.error('Error starting location tracking:', error);
      this.showToast('Error starting location tracking', 'warning');
    }
  }

  updateMechanicLocation(lat: number, lng: number) {
    this.mechanicLocation = { latitude: lat, longitude: lng };
    this.mechanicLat = lat;
    this.mechanicLng = lng;

    // Update mechanic marker if map exists
    if (this.map) {
      // Remove existing mechanic marker
      const existingMarker = document.querySelector('.mapboxgl-marker');
      if (existingMarker) {
        existingMarker.remove();
      }

      // Add updated marker
      const mapboxgl = (window as any).mapboxgl;
      new mapboxgl.Marker({ color: '#0a7cff' })
        .setLngLat([lng, lat])
        .setPopup(new mapboxgl.Popup().setHTML('<h4>Your Location</h4><p>Mechanic Position</p>'))
        .addTo(this.map);
    }
  }

  centerOnMechanic() {
    if (this.map && this.mechanicLocation) {
      this.map.flyTo({
        center: [this.mechanicLng, this.mechanicLat],
        zoom: 15
      });
    }
  }

  centerOnClient() {
    if (this.map && this.clientLocation) {
      this.map.flyTo({
        center: [this.clientLng, this.clientLat],
        zoom: 15
      });
    }
  }

  refreshRoute() {
    this.loadRoute();
  }

  startNavigation() {
    this.showToast('Navigation started! Follow the blue route.', 'success');
    // Here you could integrate with a navigation service
  }

  callClient() {
    if (this.clientPhone) {
      window.open(`tel:${this.clientPhone}`, '_self');
    } else {
      this.showToast('Client phone number not available', 'warning');
    }
  }

  toggleFullscreen() {
    this.isFullscreen = !this.isFullscreen;
    setTimeout(() => {
      if (this.map) {
        this.map.resize();
      }
    }, 100);
  }

  goBack() {
    this.router.navigate(['/mechanic/home']);
  }

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
