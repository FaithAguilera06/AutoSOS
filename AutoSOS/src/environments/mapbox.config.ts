import { environment } from './environment';

export const mapboxConfig = {
  // Mapbox Access Token - Using environment variable for security
  accessToken: environment.mapboxAccessToken,
  
  // Map style options
  styles: {
    street: 'mapbox://styles/mapbox/streets-v12',
    satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
    dark: 'mapbox://styles/mapbox/dark-v11',
    light: 'mapbox://styles/mapbox/light-v11'
  },
  
  // Default map settings
  defaultStyle: 'mapbox://styles/mapbox/streets-v12',
  defaultZoom: 15,
  defaultCenter: {
    latitude: 14.5995, // Manila, Philippines
    longitude: 120.9842
  },
  
  // Navigation settings
  navigation: {
    enableVoiceInstructions: true,
    enableRouteProgress: true,
    enableLocationEngine: true,
    enableOfflineRouting: false
  },
  
  // Real-time tracking settings
  tracking: {
    updateInterval: 5000, // 5 seconds
    accuracyThreshold: 10, // meters
    enableBackgroundTracking: true
  },
  
  // API endpoints
  api: {
    directions: 'https://api.mapbox.com/directions/v5/mapbox/driving',
    geocoding: 'https://api.mapbox.com/geocoding/v5/mapbox.places',
    matrix: 'https://api.mapbox.com/directions-matrix/v1/mapbox/driving'
  }
};
