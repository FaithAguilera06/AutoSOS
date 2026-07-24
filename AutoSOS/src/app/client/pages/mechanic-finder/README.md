# Mechanic Finder Feature

## Overview
The Mechanic Finder feature allows users to find nearby qualified mechanics for immediate assistance. It uses GPS location to determine the user's position and displays nearby mechanics on a map with their details.

## Features

### GPS Location
- Automatically gets the user's current GPS location
- Requests location permissions if not already granted
- Shows location status (loading, success, error)
- Displays coordinates when location is found

### Map Integration
- Google Maps integration (placeholder for now)
- Shows user location with a marker
- Displays mechanic locations with markers
- Interactive map controls for location and refresh

### Mechanic Search
- Finds mechanics within specified radius (1-5km)
- Filters by specialty (Engine, Electrical, Brakes, General)
- Filters by minimum rating (3+, 4+, 4.5+ stars)
- Shows mechanic count and details

### Mechanic Details
- Name and specialty
- Distance from user location
- Rating with star display
- Contact information (phone, address)
- Availability status
- Experience level
- Languages spoken

### User Actions
- Call mechanic directly
- Send message to mechanic
- Select mechanic for detailed view
- Refresh search results
- Reset filters

## Technical Implementation

### Dependencies
- `@capacitor/geolocation` - For GPS location access
- Google Maps API (to be implemented)
- Ionic Geolocation plugin

### Components
- `MechanicFinderPage` - Main component
- Location status display
- Map container with controls
- Mechanics list with cards
- Search filters
- Loading overlays

### Data Structure
```typescript
interface Mechanic {
  id: string;
  name: string;
  specialty: string;
  distance: number;
  rating: number;
  phone: string;
  address: string;
  latitude: number;
  longitude: number;
  isAvailable: boolean;
  experience: number;
  languages: string[];
}
```

## Usage

1. **Access**: Click "Mechanic Finder Mode" on the home page
2. **Location**: Allow location access when prompted
3. **Search**: View nearby mechanics on the map and list
4. **Filter**: Adjust search radius, specialty, and rating filters
5. **Contact**: Call or message mechanics directly
6. **Select**: Tap on mechanic card for more details

## Future Enhancements

- [ ] Google Maps API integration
- [ ] Real-time mechanic availability
- [ ] Push notifications for nearby mechanics
- [ ] Mechanic reviews and ratings
- [ ] Booking system for appointments
- [ ] Emergency SOS feature
- [ ] Mechanic verification system
- [ ] Payment integration

## Permissions Required

- Location access for GPS coordinates
- Camera access (for future photo sharing)
- Phone access (for calling mechanics)

## Error Handling

- Location permission denied
- GPS service unavailable
- Network connectivity issues
- No mechanics found in area
- Map loading failures

## Styling

The feature uses a modern, clean design with:
- Card-based layout
- Smooth animations and transitions
- Responsive design for mobile
- Loading states and error handling
- Color-coded status indicators 