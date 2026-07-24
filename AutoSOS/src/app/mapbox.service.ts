import { Injectable } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import { BehaviorSubject, Observable } from 'rxjs';
import { DistanceCalculatorService } from './utils/distance-calculator.service';
import { environment } from '../environments/environment';

export interface Location {
  latitude: number;
  longitude: number;
  timestamp: number;
}

export interface MechanicLocation {
  mechanicId: string;
  location: Location;
  isMoving: boolean;
  estimatedArrival?: number; // in minutes
}

export interface LocationSuggestion {
  id: string;
  name: string;
  address: string;
  location: Location;
  type: 'address' | 'poi' | 'place';
  relevance?: number;
}

export interface NavigationStep {
  instruction: string;
  distance: number;
  duration: number;
  maneuver: {
    type: string;
    instruction: string;
    bearing_after: number;
    bearing_before: number;
    location: [number, number];
  };
}

export interface NavigationRoute {
  distance: number;
  duration: number;
  geometry: any;
  steps: NavigationStep[];
  summary: string;
  weight_name: string;
  weight: number;
}

export interface NavigationResponse {
  routes: NavigationRoute[];
  waypoints: Array<{
    name: string;
    location: [number, number];
  }>;
  code: string;
  uuid: string;
}

@Injectable({
  providedIn: 'root'
})
export class MapboxService {
  private currentLocationSubject = new BehaviorSubject<Location | null>(null);
  private mechanicLocationSubject = new BehaviorSubject<MechanicLocation | null>(null);
  private isTrackingSubject = new BehaviorSubject<boolean>(false);

  public currentLocation$ = this.currentLocationSubject.asObservable();
  public mechanicLocation$ = this.mechanicLocationSubject.asObservable();
  public isTracking$ = this.isTrackingSubject.asObservable();

  /**
   * Get the current location value
   */
  getCurrentLocation(): Location | null {
    return this.currentLocationSubject.value;
  }

  private trackingInterval: any;
  private mapboxAccessToken = environment.mapboxAccessToken;
  private openRouteServiceApiKey = environment.openRouteServiceApiKey;

  constructor(private distanceCalculator: DistanceCalculatorService) {
    this.initializeLocationTracking();
  }

  /**
   * Initialize location tracking for the current user
   */
  async initializeLocationTracking(): Promise<void> {
    try {
      const coordinates = await Geolocation.getCurrentPosition();
      const location: Location = {
        latitude: coordinates.coords.latitude,
        longitude: coordinates.coords.longitude,
        timestamp: Date.now()
      };
      this.currentLocationSubject.next(location);
    } catch (error) {
      // Error getting current location
    }
  }

  /**
   * Start real-time location tracking
   */
  startLocationTracking(): void {
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
    }

    this.isTrackingSubject.next(true);
    
    this.trackingInterval = setInterval(async () => {
      try {
        const coordinates = await Geolocation.getCurrentPosition();
        const location: Location = {
          latitude: coordinates.coords.latitude,
          longitude: coordinates.coords.longitude,
          timestamp: Date.now()
        };
        this.currentLocationSubject.next(location);
        
        // Send location to backend for real-time updates
        await this.sendLocationToBackend(location);
      } catch (error) {
        // Error tracking location
      }
    }, 5000); // Update every 5 seconds
  }

  /**
   * Stop real-time location tracking
   */
  stopLocationTracking(): void {
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
    this.isTrackingSubject.next(false);
  }

  /**
   * Get directions between two points using Mapbox Directions API (Primary)
   */
  async getDirections(origin: Location, destination: Location): Promise<NavigationResponse> {
    console.log('Getting directions from:', origin, 'to:', destination);
    console.log('Using Mapbox Directions API');
    
    try {
      return await this.getMapboxDirections(origin, destination);
    } catch (error) {
      console.error('Error getting directions from Mapbox:', error);
      
      // Fallback to OpenRouteService API
      console.log('Falling back to OpenRouteService API...');
      return this.getOpenRouteServiceDirections(origin, destination);
    }
  }

  /**
   * Get directions using Mapbox Directions API
   */
  async getMapboxDirections(origin: Location, destination: Location): Promise<NavigationResponse> {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?access_token=${this.mapboxAccessToken}&geometries=geojson&overview=full&steps=true&voice_instructions=true&banner_instructions=true&voice_units=metric&banner_instructions=true`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Mapbox Directions API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Mapbox Directions response:', data);
      
      return data;
      
    } catch (error) {
      console.error('Error getting Mapbox directions:', error);
      throw error;
    }
  }

  /**
   * Get directions using OpenRouteService API (Fallback)
   */
  async getOpenRouteServiceDirections(origin: Location, destination: Location): Promise<NavigationResponse> {
    const orsUrl = 'https://api.openrouteservice.org/v2/directions/driving-car';
    
    try {
      const response = await fetch(orsUrl, {
        method: 'POST',
        headers: {
          'Authorization': this.openRouteServiceApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          coordinates: [
            [origin.longitude, origin.latitude],
            [destination.longitude, destination.latitude]
          ],
          format: 'geojson',
          options: {
            avoid_features: ['highways'],
            avoid_borders: 'controlled'
          }
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouteService API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('OpenRouteService response:', data);
      
      // Convert ORS format to Mapbox format for consistency
      return this.convertOrsToMapboxFormat(data);
      
    } catch (error) {
      console.error('Error getting directions from OpenRouteService:', error);
      throw error;
    }
  }

  /**
   * Get turn-by-turn navigation instructions
   */
  async getNavigationInstructions(origin: Location, destination: Location): Promise<NavigationStep[]> {
    try {
      const directions = await this.getDirections(origin, destination);
      
      if (directions.routes && directions.routes.length > 0) {
        const route = directions.routes[0];
        return route.steps || [];
      }
      
      return [];
    } catch (error) {
      console.error('Error getting navigation instructions:', error);
      return [];
    }
  }

  /**
   * Get alternative routes between two points
   */
  async getAlternativeRoutes(origin: Location, destination: Location, alternatives: number = 2): Promise<NavigationRoute[]> {
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?access_token=${this.mapboxAccessToken}&geometries=geojson&overview=full&steps=true&alternatives=${alternatives}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Mapbox Directions API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Alternative routes response:', data);
      
      return data.routes || [];
      
    } catch (error) {
      console.error('Error getting alternative routes:', error);
      return [];
    }
  }

  /**
   * Get optimized route with waypoints
   */
  async getOptimizedRoute(origin: Location, waypoints: Location[], destination: Location): Promise<NavigationResponse> {
    try {
      // Build coordinates string with origin, waypoints, and destination
      const coordinates = [
        `${origin.longitude},${origin.latitude}`,
        ...waypoints.map(wp => `${wp.longitude},${wp.latitude}`),
        `${destination.longitude},${destination.latitude}`
      ].join(';');

      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?access_token=${this.mapboxAccessToken}&geometries=geojson&overview=full&steps=true&voice_instructions=true&banner_instructions=true&voice_units=metric`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Mapbox Directions API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Optimized route response:', data);
      
      return data;
      
    } catch (error) {
      console.error('Error getting optimized route:', error);
      throw error;
    }
  }

  /**
   * Get route with traffic information
   */
  async getRouteWithTraffic(origin: Location, destination: Location): Promise<NavigationResponse> {
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?access_token=${this.mapboxAccessToken}&geometries=geojson&overview=full&steps=true&voice_instructions=true&banner_instructions=true&voice_units=metric`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Mapbox Directions API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Route with traffic response:', data);
      
      return data;
      
    } catch (error) {
      console.error('Error getting route with traffic:', error);
      // Fallback to regular route
      return this.getDirections(origin, destination);
    }
  }

  /**
   * Get route avoiding certain features
   */
  async getRouteAvoiding(origin: Location, destination: Location, avoidFeatures: string[] = ['tolls', 'highways']): Promise<NavigationResponse> {
    try {
      const avoidString = avoidFeatures.join(',');
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?access_token=${this.mapboxAccessToken}&geometries=geojson&overview=full&steps=true&voice_instructions=true&banner_instructions=true&voice_units=metric&exclude=${avoidString}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Mapbox Directions API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Route avoiding features response:', data);
      
      return data;
      
    } catch (error) {
      console.error('Error getting route avoiding features:', error);
      // Fallback to regular route
      return this.getDirections(origin, destination);
    }
  }
  private async getDirectionsFallback(origin: Location, destination: Location): Promise<any> {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?access_token=${this.mapboxAccessToken}&geometries=geojson&overview=full&steps=true`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Mapbox Fallback API Error:', response.status, errorText);
        throw new Error(`Mapbox Fallback API Error: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Mapbox Fallback API Response:', data);
      return data;
    } catch (error) {
      console.error('Mapbox Fallback API Error:', error);
      throw error;
    }
  }

  /**
   * Calculate distance between two points using Haversine formula (straight-line distance)
   */
  calculateDistance(point1: Location, point2: Location): number {
    return this.distanceCalculator.calculateDistanceBetweenLocations(point1, point2, 'km');
  }

  /**
   * Get driving distance between two points using OpenRouteService (more accurate for navigation)
   */
  async getDrivingDistance(origin: Location, destination: Location): Promise<{ distance: number, duration: number }> {
    try {
      const directions = await this.getDirections(origin, destination);
      if (directions.routes && directions.routes.length > 0) {
        const route = directions.routes[0];
        return {
          distance: route.distance / 1000, // Convert meters to kilometers
          duration: route.duration / 60 // Convert seconds to minutes
        };
      }
    } catch (error) {
      console.error('Error getting driving distance:', error);
    }
    
    // Fallback to straight-line distance calculation
    const straightLineDistance = this.calculateDistance(origin, destination);
    return {
      distance: straightLineDistance,
      duration: (straightLineDistance / 30) * 60 // Estimate: 30 km/h average speed
    };
  }

  /**
   * Update mechanic location (called by backend or mechanic app)
   */
  updateMechanicLocation(mechanicId: string, location: Location, isMoving: boolean = false): void {
    const mechanicLocation: MechanicLocation = {
      mechanicId,
      location,
      isMoving
    };
    this.mechanicLocationSubject.next(mechanicLocation);
  }

  /**
   * Get estimated arrival time
   */
  async getEstimatedArrival(mechanicLocation: Location, userLocation: Location): Promise<number> {
    try {
      const directions = await this.getDirections(mechanicLocation, userLocation);
      if (directions.routes && directions.routes.length > 0) {
        const duration = directions.routes[0].duration; // in seconds
        return Math.round(duration / 60); // convert to minutes
      }
    } catch (error) {
      // Error calculating arrival time
    }
    
    // Fallback: calculate based on distance (assuming average speed of 30 km/h)
    const distance = this.calculateDistance(mechanicLocation, userLocation);
    return Math.round((distance / 30) * 60); // convert to minutes
  }

  /**
   * Send location to backend for real-time sharing
   */
  private async sendLocationToBackend(location: Location): Promise<void> {
    // TODO: Implement API call to your backend
    // This should send the location to your Supabase backend
    // for real-time sharing with other users
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get Mapbox access token
   */
  getAccessToken(): string {
    return this.mapboxAccessToken;
  }

  /**
   * Set Mapbox access token
   */
  setAccessToken(token: string): void {
    this.mapboxAccessToken = token;
  }

  /**
   * Search for location suggestions using OpenRouteService directly
   */
  async searchLocationSuggestions(query: string, proximity?: Location): Promise<LocationSuggestion[]> {
    if (!query.trim()) {
      return [];
    }

    const orsUrl = 'https://api.openrouteservice.org/geocode/search';
    
    try {
      const params = new URLSearchParams({
        api_key: this.openRouteServiceApiKey,
        text: query,
        'boundary.country': 'PH',
        size: '5'
      });

      if (proximity) {
        params.append('focus.point.lon', proximity.longitude.toString());
        params.append('focus.point.lat', proximity.latitude.toString());
      }

      const response = await fetch(`${orsUrl}?${params}`);
      const data = await response.json();

      if (data.features) {
        return data.features.map((feature: any, index: number) => ({
          id: feature.properties?.id || `suggestion-${index}`,
          name: feature.properties?.label || feature.properties?.name || 'Unknown',
          address: feature.properties?.label || feature.properties?.name || 'Unknown',
          location: {
            latitude: feature.geometry?.coordinates[1] || 0,
            longitude: feature.geometry?.coordinates[0] || 0,
            timestamp: Date.now()
          },
          type: this.getLocationType(feature.properties?.layer || 'place'),
          relevance: feature.properties?.confidence || 1
        }));
      }
      return [];
    } catch (error) {
      console.error('OpenRouteService geocoding error:', error);
      // Fallback to Mapbox geocoding
      return this.searchLocationSuggestionsFallback(query, proximity);
    }
  }

  /**
   * Fallback method using Mapbox geocoding
   */
  private async searchLocationSuggestionsFallback(query: string, proximity?: Location): Promise<LocationSuggestion[]> {
    const proximityParam = proximity ? `&proximity=${proximity.longitude},${proximity.latitude}` : '';
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${this.mapboxAccessToken}&country=PH&types=address,poi,place${proximityParam}&limit=5`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.features) {
        return data.features.map((feature: any, index: number) => ({
          id: feature.id || `suggestion-${index}`,
          name: feature.text || feature.place_name,
          address: feature.place_name || feature.text,
          location: {
            latitude: feature.center[1],
            longitude: feature.center[0],
            timestamp: Date.now()
          },
          type: this.getLocationType(feature.place_type[0]),
          relevance: feature.relevance || 1
        }));
      }
      return [];
    } catch (error) {
      console.error('Mapbox fallback geocoding error:', error);
      return [];
    }
  }

  /**
   * Get reverse geocoding using public token directly
   */
  async getAddressFromCoordinates(location: Location): Promise<string> {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${location.longitude},${location.latitude}.json?access_token=${this.mapboxAccessToken}&types=address,poi,place&limit=1`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        return data.features[0].place_name || 'Unknown location';
      }
      return 'Unknown location';
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return 'Unknown location';
    }
  }

  /**
   * Get nearby places of interest using public token directly
   */
  async getNearbyPlaces(location: Location, radius: number = 1000): Promise<LocationSuggestion[]> {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${location.longitude},${location.latitude}.json?access_token=${this.mapboxAccessToken}&types=poi&limit=10&radius=${radius}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.features) {
        return data.features.map((feature: any, index: number) => ({
          id: feature.id || `poi-${index}`,
          name: feature.text || feature.place_name,
          address: feature.place_name || feature.text,
          location: {
            latitude: feature.center[1],
            longitude: feature.center[0],
            timestamp: Date.now()
          },
          type: 'poi' as const,
          relevance: feature.relevance || 1
        }));
      }
      return [];
    } catch (error) {
      console.error('Nearby places error:', error);
      return [];
    }
  }

  /**
   * Get location type from Mapbox place type
   */
  private getLocationType(placeType: string): 'address' | 'poi' | 'place' {
    switch (placeType) {
      case 'address':
        return 'address';
      case 'poi':
        return 'poi';
      default:
        return 'place';
    }
  }

  /**
   * Convert OpenRouteService response to Mapbox format
   */
  private convertOrsToMapboxFormat(orsData: any): any {
    try {
      if (orsData.features && orsData.features.length > 0) {
        const feature = orsData.features[0];
        const properties = feature.properties || {};
        const summary = properties.summary || {};
        
        // Convert to Mapbox format
        const mapboxResponse = {
          routes: [{
            geometry: feature.geometry || {},
            legs: [{
              distance: summary.distance || 0,
              duration: summary.duration || 0,
              steps: []
            }],
            distance: summary.distance || 0,
            duration: summary.duration || 0
          }],
          waypoints: []
        };
        return mapboxResponse;
      } else {
        return { routes: [], waypoints: [] };
      }
    } catch (error) {
      console.error('Error converting ORS to Mapbox format:', error);
      return { routes: [], waypoints: [] };
    }
  }

  /**
   * Validate if location is within Philippines bounds
   */
  isLocationInPhilippines(location: Location): boolean {
    // Philippines approximate bounds
    const bounds = {
      north: 21.1206,
      south: 4.5869,
      east: 127.9688,
      west: 116.9315
    };

    return location.latitude >= bounds.south && 
           location.latitude <= bounds.north && 
           location.longitude >= bounds.west && 
           location.longitude <= bounds.east;
  }
}
