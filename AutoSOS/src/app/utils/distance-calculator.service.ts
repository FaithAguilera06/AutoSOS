import { Injectable } from '@angular/core';
import { Location } from '../mapbox.service';

@Injectable({
  providedIn: 'root'
})
export class DistanceCalculatorService {

  // Earth's radius in different units
  private readonly EARTH_RADIUS_KM = 6371;
  private readonly EARTH_RADIUS_MILES = 3959;
  private readonly EARTH_RADIUS_METERS = 6371000;

  /**
   * Calculate distance between two points using Haversine formula
   * @param lat1 Latitude of first point
   * @param lon1 Longitude of first point
   * @param lat2 Latitude of second point
   * @param lon2 Longitude of second point
   * @param unit Unit of measurement ('km', 'miles', 'meters')
   * @returns Distance in specified unit
   */
  calculateDistance(
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number, 
    unit: 'km' | 'miles' | 'meters' = 'km'
  ): number {
    // Validate inputs
    if (!this.isValidCoordinate(lat1, lon1) || !this.isValidCoordinate(lat2, lon2)) {
      console.warn('Invalid coordinates provided to calculateDistance');
      return 0;
    }

    const R = this.getEarthRadius(unit);
    
    // Convert degrees to radians
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const lat1Rad = this.toRadians(lat1);
    const lat2Rad = this.toRadians(lat2);

    // Haversine formula
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  /**
   * Calculate distance between two Location objects
   * @param location1 First location
   * @param location2 Second location
   * @param unit Unit of measurement ('km', 'miles', 'meters')
   * @returns Distance in specified unit
   */
  calculateDistanceBetweenLocations(
    location1: Location, 
    location2: Location, 
    unit: 'km' | 'miles' | 'meters' = 'km'
  ): number {
    return this.calculateDistance(
      location1.latitude,
      location1.longitude,
      location2.latitude,
      location2.longitude,
      unit
    );
  }

  /**
   * Calculate distance from current location to a mechanic
   * @param currentLat Current latitude
   * @param currentLon Current longitude
   * @param mechanicLat Mechanic latitude
   * @param mechanicLon Mechanic longitude
   * @param unit Unit of measurement
   * @returns Distance in specified unit
   */
  calculateDistanceToMechanic(
    currentLat: number,
    currentLon: number,
    mechanicLat: number,
    mechanicLon: number,
    unit: 'km' | 'miles' | 'meters' = 'km'
  ): number {
    return this.calculateDistance(currentLat, currentLon, mechanicLat, mechanicLon, unit);
  }

  /**
   * Calculate distance from mechanic to client
   * @param mechanicLat Mechanic latitude
   * @param mechanicLon Mechanic longitude
   * @param clientLat Client latitude
   * @param clientLon Client longitude
   * @param unit Unit of measurement
   * @returns Distance in specified unit
   */
  calculateDistanceToClient(
    mechanicLat: number,
    mechanicLon: number,
    clientLat: number,
    clientLon: number,
    unit: 'km' | 'miles' | 'meters' = 'km'
  ): number {
    return this.calculateDistance(mechanicLat, mechanicLon, clientLat, clientLon, unit);
  }

  /**
   * Format distance for display
   * @param distance Distance in kilometers
   * @param unit Unit to display ('km', 'miles', 'meters')
   * @param decimals Number of decimal places
   * @returns Formatted distance string
   */
  formatDistance(distance: number, unit: 'km' | 'miles' | 'meters' = 'km', decimals: number = 1): string {
    if (distance < 0) return '0';
    
    let displayDistance = distance;
    let displayUnit = unit;

    // Convert to appropriate unit if needed
    if (unit === 'miles' && distance > 0) {
      displayDistance = distance * 0.621371; // km to miles
    } else if (unit === 'meters' && distance > 0) {
      displayDistance = distance * 1000; // km to meters
    }

    // Format based on distance
    if (displayDistance < 1 && unit === 'km') {
      return `${(displayDistance * 1000).toFixed(0)}m`;
    } else if (displayDistance < 0.1 && unit === 'miles') {
      return `${(displayDistance * 5280).toFixed(0)}ft`;
    } else {
      return `${displayDistance.toFixed(decimals)}${displayUnit}`;
    }
  }

  /**
   * Get estimated travel time based on distance
   * @param distance Distance in kilometers
   * @param averageSpeed Average speed in km/h (default: 30 km/h for city driving)
   * @returns Estimated time in minutes
   */
  getEstimatedTravelTime(distance: number, averageSpeed: number = 30): number {
    if (distance <= 0 || averageSpeed <= 0) return 0;
    return (distance / averageSpeed) * 60; // Convert hours to minutes
  }

  /**
   * Format travel time for display
   * @param timeInMinutes Time in minutes
   * @returns Formatted time string
   */
  formatTravelTime(timeInMinutes: number): string {
    if (timeInMinutes < 1) return '< 1 min';
    if (timeInMinutes < 60) return `${Math.round(timeInMinutes)} min`;
    
    const hours = Math.floor(timeInMinutes / 60);
    const minutes = Math.round(timeInMinutes % 60);
    
    if (minutes === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${minutes}m`;
    }
  }

  /**
   * Check if a coordinate is valid
   * @param lat Latitude
   * @param lon Longitude
   * @returns True if coordinate is valid
   */
  private isValidCoordinate(lat: number, lon: number): boolean {
    return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180 && 
           !isNaN(lat) && !isNaN(lon) && isFinite(lat) && isFinite(lon);
  }

  /**
   * Convert degrees to radians
   * @param degrees Degrees to convert
   * @returns Radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get Earth's radius for specified unit
   * @param unit Unit of measurement
   * @returns Earth's radius in specified unit
   */
  private getEarthRadius(unit: 'km' | 'miles' | 'meters'): number {
    switch (unit) {
      case 'km':
        return this.EARTH_RADIUS_KM;
      case 'miles':
        return this.EARTH_RADIUS_MILES;
      case 'meters':
        return this.EARTH_RADIUS_METERS;
      default:
        return this.EARTH_RADIUS_KM;
    }
  }

  /**
   * Find mechanics within a specified radius
   * @param userLat User's latitude
   * @param userLon User's longitude
   * @param mechanics Array of mechanics with location data
   * @param radiusKm Radius in kilometers
   * @returns Array of mechanics within radius, sorted by distance
   */
  findMechanicsWithinRadius(
    userLat: number,
    userLon: number,
    mechanics: any[],
    radiusKm: number
  ): any[] {
    return mechanics
      .filter(mechanic => 
        mechanic.latitude && 
        mechanic.longitude && 
        this.isValidCoordinate(mechanic.latitude, mechanic.longitude)
      )
      .map(mechanic => ({
        ...mechanic,
        distance: this.calculateDistance(
          userLat, 
          userLon, 
          mechanic.latitude, 
          mechanic.longitude, 
          'km'
        )
      }))
      .filter(mechanic => mechanic.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);
  }

  /**
   * Calculate bearing between two points
   * @param lat1 Latitude of first point
   * @param lon1 Longitude of first point
   * @param lat2 Latitude of second point
   * @param lon2 Longitude of second point
   * @returns Bearing in degrees (0-360)
   */
  calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLon = this.toRadians(lon2 - lon1);
    const lat1Rad = this.toRadians(lat1);
    const lat2Rad = this.toRadians(lat2);

    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

    let bearing = Math.atan2(y, x);
    bearing = this.toDegrees(bearing);
    bearing = (bearing + 360) % 360;

    return bearing;
  }

  /**
   * Convert radians to degrees
   * @param radians Radians to convert
   * @returns Degrees
   */
  private toDegrees(radians: number): number {
    return radians * (180 / Math.PI);
  }

  /**
   * Get compass direction from bearing
   * @param bearing Bearing in degrees
   * @returns Compass direction string
   */
  getCompassDirection(bearing: number): string {
    const directions = [
      'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
      'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'
    ];
    
    const index = Math.round(bearing / 22.5) % 16;
    return directions[index];
  }
}
