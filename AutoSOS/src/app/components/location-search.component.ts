import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { MapboxService, Location, LocationSuggestion } from '../mapbox.service';

@Component({
  selector: 'app-location-search',
  template: `
    <div class="location-search-container">
      <!-- Search Input -->
      <div class="search-input-container">
        <ion-searchbar
          [(ngModel)]="searchQuery"
          (ionInput)="onSearchInput($event)"
          (ionClear)="onSearchClear()"
          placeholder="Search for a location..."
          show-clear-button="focus"
          debounce="300">
        </ion-searchbar>
      </div>

      <!-- Current Location Display -->
      <div class="current-location" *ngIf="currentLocation && !isSearching">
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              <ion-icon name="location" color="primary"></ion-icon>
              Current Location
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p class="location-address">{{ currentAddress }}</p>
            <p class="location-coordinates">
              {{ currentLocation.latitude.toFixed(6) }}, {{ currentLocation.longitude.toFixed(6) }}
            </p>
            <div class="location-actions">
              <ion-button 
                fill="outline" 
                size="small" 
                (click)="confirmLocation()"
                color="success">
                <ion-icon name="checkmark" slot="start"></ion-icon>
                Use This Location
              </ion-button>
              <ion-button 
                fill="outline" 
                size="small" 
                (click)="startSearch()"
                color="primary">
                <ion-icon name="search" slot="start"></ion-icon>
                Search Instead
              </ion-button>
            </div>
          </ion-card-content>
        </ion-card>
      </div>

      <!-- Search Results -->
      <div class="search-results" *ngIf="isSearching && searchSuggestions.length > 0">
        <ion-list>
          <ion-item 
            *ngFor="let suggestion of searchSuggestions; trackBy: trackBySuggestionId"
            (click)="selectSuggestion(suggestion)"
            button>
            <ion-icon 
              [name]="getSuggestionIcon(suggestion.type)" 
              [color]="getSuggestionColor(suggestion.type)"
              slot="start">
            </ion-icon>
            <ion-label>
              <h3>{{ suggestion.name }}</h3>
              <p>{{ suggestion.address }}</p>
            </ion-label>
            <ion-button 
              fill="clear" 
              size="small" 
              (click)="selectSuggestion(suggestion); $event.stopPropagation()"
              slot="end">
              <ion-icon name="arrow-forward"></ion-icon>
            </ion-button>
          </ion-item>
        </ion-list>
      </div>

      <!-- No Results -->
      <div class="no-results" *ngIf="isSearching && searchSuggestions.length === 0 && searchQuery.length > 2">
        <ion-card>
          <ion-card-content>
            <div class="no-results-content">
              <ion-icon name="search-outline" size="large" color="medium"></ion-icon>
              <h3>No locations found</h3>
              <p>Try searching with different keywords or check your spelling.</p>
            </div>
          </ion-card-content>
        </ion-card>
      </div>

      <!-- Nearby Places -->
      <div class="nearby-places" *ngIf="!isSearching && nearbyPlaces.length > 0">
        <h3 class="section-title">
          <ion-icon name="map" color="primary"></ion-icon>
          Nearby Places
        </h3>
        <ion-list>
          <ion-item 
            *ngFor="let place of nearbyPlaces; trackBy: trackBySuggestionId"
            (click)="selectSuggestion(place)"
            button>
            <ion-icon 
              name="location" 
              color="secondary"
              slot="start">
            </ion-icon>
            <ion-label>
              <h3>{{ place.name }}</h3>
              <p>{{ place.address }}</p>
            </ion-label>
            <ion-button 
              fill="clear" 
              size="small" 
              (click)="selectSuggestion(place); $event.stopPropagation()"
              slot="end">
              <ion-icon name="arrow-forward"></ion-icon>
            </ion-button>
          </ion-item>
        </ion-list>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="isLoading">
        <ion-card>
          <ion-card-content>
            <div class="loading-content">
              <ion-spinner name="crescent"></ion-spinner>
              <p>Searching locations...</p>
            </div>
          </ion-card-content>
        </ion-card>
      </div>
    </div>
  `,
  styles: [`
    .location-search-container {
      width: 100%;
      max-height: 500px;
      overflow-y: auto;
    }

    .search-input-container {
      margin-bottom: 16px;
    }

    .current-location {
      margin-bottom: 16px;
    }

    .location-address {
      font-weight: 500;
      margin-bottom: 8px;
      color: var(--ion-color-primary);
    }

    .location-coordinates {
      font-size: 0.9em;
      color: var(--ion-color-medium);
      margin-bottom: 16px;
    }

    .location-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .search-results {
      margin-bottom: 16px;
    }

    .no-results {
      margin-bottom: 16px;
    }

    .no-results-content {
      text-align: center;
      padding: 20px;
    }

    .no-results-content h3 {
      margin: 16px 0 8px 0;
      color: var(--ion-color-medium);
    }

    .no-results-content p {
      color: var(--ion-color-medium);
      margin: 0;
    }

    .nearby-places {
      margin-bottom: 16px;
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 16px 0 8px 0;
      font-size: 1.1em;
      font-weight: 600;
    }

    .loading-state {
      margin-bottom: 16px;
    }

    .loading-content {
      text-align: center;
      padding: 20px;
    }

    .loading-content p {
      margin-top: 16px;
      color: var(--ion-color-medium);
    }

    ion-item {
      --padding-start: 16px;
      --padding-end: 16px;
    }

    ion-item h3 {
      font-weight: 500;
      margin-bottom: 4px;
    }

    ion-item p {
      color: var(--ion-color-medium);
      font-size: 0.9em;
      margin: 0;
    }

    ion-card {
      margin: 0;
      --background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
    }

    ion-searchbar {
      --background: rgba(255, 255, 255, 0.9);
      --border-radius: 12px;
      --box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
  `],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule]
})
export class LocationSearchComponent implements OnInit {
  @Input() currentLocation: Location | null = null;
  @Output() locationSelected = new EventEmitter<Location>();
  @Output() searchStarted = new EventEmitter<void>();

  searchQuery = '';
  searchSuggestions: LocationSuggestion[] = [];
  nearbyPlaces: LocationSuggestion[] = [];
  currentAddress = '';
  isSearching = false;
  isLoading = false;

  constructor(private mapboxService: MapboxService) {}

  ngOnInit() {
    if (this.currentLocation) {
      this.loadCurrentLocationAddress();
      this.loadNearbyPlaces();
    }
  }

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

  onSearchInput(event: any) {
    const query = event.target.value;
    this.searchQuery = query;
    
    if (query.length > 2) {
      this.performSearch(query);
    } else {
      this.clearSearch();
    }
  }

  onSearchClear() {
    this.clearSearch();
  }

  async performSearch(query: string) {
    if (!query.trim()) {
      return;
    }

    this.isSearching = true;
    this.isLoading = true;

    try {
      const suggestions = await this.mapboxService.searchLocationSuggestions(
        query, 
        this.currentLocation || undefined
      );
      this.searchSuggestions = suggestions;
    } catch (error) {
      console.error('Error performing search:', error);
      this.searchSuggestions = [];
    } finally {
      this.isLoading = false;
    }
  }

  clearSearch() {
    this.isSearching = false;
    this.searchSuggestions = [];
    this.searchQuery = '';
  }

  startSearch() {
    this.isSearching = true;
    this.searchStarted.emit();
  }

  selectSuggestion(suggestion: LocationSuggestion) {
    this.locationSelected.emit(suggestion.location);
    this.clearSearch();
  }

  confirmLocation() {
    if (this.currentLocation) {
      this.locationSelected.emit(this.currentLocation);
    }
  }

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

  trackBySuggestionId(index: number, suggestion: LocationSuggestion): string {
    return suggestion.id;
  }
}
