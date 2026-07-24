# Haversine Distance Calculator Implementation Guide

## Overview
This guide documents the implementation of the Haversine formula for calculating distances between geographic coordinates in the AutoSOS application. The Haversine formula is used to calculate the great-circle distance between two points on Earth given their latitude and longitude coordinates.

## What is the Haversine Formula?

The Haversine formula is an equation used in navigation to calculate the great-circle distance between two points on a sphere (like Earth) given their latitude and longitude coordinates. It's particularly useful for calculating distances between locations on Earth.

### Formula
```
a = sin²(Δφ/2) + cos φ1 ⋅ cos φ2 ⋅ sin²(Δλ/2)
c = 2 ⋅ atan2( √a, √(1−a) )
d = R ⋅ c
```

Where:
- φ is latitude
- λ is longitude
- R is Earth's radius (mean radius = 6,371 km)
- d is the distance

## Implementation

### 1. Distance Calculator Service
**File:** `src/app/utils/distance-calculator.service.ts`

This service provides a comprehensive set of methods for distance calculations:

#### Key Methods:
- `calculateDistance(lat1, lon1, lat2, lon2, unit)` - Calculate distance between two coordinates
- `calculateDistanceBetweenLocations(location1, location2, unit)` - Calculate distance between Location objects
- `calculateDistanceToMechanic(currentLat, currentLon, mechanicLat, mechanicLon, unit)` - Calculate distance to a mechanic
- `calculateDistanceToClient(mechanicLat, mechanicLon, clientLat, clientLon, unit)` - Calculate distance to a client
- `formatDistance(distance, unit, decimals)` - Format distance for display
- `getEstimatedTravelTime(distance, averageSpeed)` - Calculate estimated travel time
- `formatTravelTime(timeInMinutes)` - Format travel time for display

#### Features:
- **Multiple Units**: Supports kilometers, miles, and meters
- **Input Validation**: Validates coordinate ranges (-90 to 90 for latitude, -180 to 180 for longitude)
- **Smart Formatting**: Automatically formats distances (e.g., "850m" for distances < 1km)
- **Travel Time Estimation**: Calculates estimated travel time based on distance and average speed
- **Bearing Calculation**: Calculates compass bearing between two points
- **Radius Filtering**: Finds mechanics within a specified radius

### 2. Integration Points

#### Mechanic Home Page
**File:** `src/app/mechanic/pages/home/home.page.ts`

- **`getDistance()`**: Returns formatted distance to client
- **`getEstimatedTravelTime()`**: Returns estimated travel time to client
- Uses `client_latitude` and `client_longitude` from booking data

#### Client Mechanic Finder
**File:** `src/app/client/pages/mechanic-finder/mechanic-finder.page.ts`

- **`calculateDistanceToMechanic(mechanic)`**: Calculates distance to a specific mechanic
- **`formatDistanceToMechanic(mechanic)`**: Formats distance for display
- **`getEstimatedTravelTimeToMechanic(mechanic)`**: Calculates travel time to mechanic
- **`getEstimatedDistance()`**: Returns formatted distance to selected mechanic
- **`getEstimatedTime()`**: Returns estimated arrival time

#### Service Requests Page
**File:** `src/app/mechanic/pages/service-requests/service-requests.page.ts`

- **`getDistance()`**: Returns formatted distance to client
- **`getEstimatedTravelTime()`**: Returns estimated travel time to client

#### Mapbox Service
**File:** `src/app/mapbox.service.ts`

- **`calculateDistance(point1, point2)`**: Uses the distance calculator service for consistency

## Database Schema Updates

The implementation uses the updated booking schema with separate latitude/longitude fields:

```sql
-- New fields in bookings table
client_latitude DECIMAL(10, 8),
client_longitude DECIMAL(11, 8),
mechanic_latitude DECIMAL(10, 8),
mechanic_longitude DECIMAL(11, 8),
```

## Usage Examples

### Basic Distance Calculation
```typescript
// Calculate distance between two points
const distance = this.distanceCalculator.calculateDistance(
  14.5995, 120.9842,  // Manila coordinates
  14.6042, 120.9822,  // Nearby location
  'km'
);
// Returns: 0.6 (kilometers)
```

### Distance with Formatting
```typescript
// Format distance for display
const formattedDistance = this.distanceCalculator.formatDistance(0.6, 'km', 1);
// Returns: "600m" (automatically converts to meters for small distances)
```

### Travel Time Estimation
```typescript
// Calculate travel time
const timeInMinutes = this.distanceCalculator.getEstimatedTravelTime(5.2, 30);
// Returns: 10.4 (minutes for 5.2km at 30km/h average speed)

const formattedTime = this.distanceCalculator.formatTravelTime(10.4);
// Returns: "10 min"
```

### Finding Mechanics Within Radius
```typescript
// Find mechanics within 10km
const nearbyMechanics = this.distanceCalculator.findMechanicsWithinRadius(
  userLat, userLon, mechanics, 10
);
// Returns array of mechanics sorted by distance
```

## Accuracy and Limitations

### Accuracy
- **High Accuracy**: The Haversine formula provides excellent accuracy for most applications
- **Spherical Model**: Assumes Earth is a perfect sphere (actual Earth is an oblate spheroid)
- **Typical Error**: Less than 0.5% for distances up to a few hundred kilometers

### Limitations
1. **Spherical Assumption**: Doesn't account for Earth's ellipsoidal shape
2. **No Elevation**: Ignores elevation differences between points
3. **No Obstacles**: Calculates straight-line distance, not road distance
4. **No Traffic**: Doesn't consider traffic conditions for travel time

## Performance Considerations

### Optimization Features
- **Input Validation**: Prevents unnecessary calculations with invalid coordinates
- **Caching**: Results can be cached for repeated calculations
- **Efficient Math**: Uses optimized trigonometric functions
- **Memory Efficient**: Minimal memory footprint

### Best Practices
1. **Validate Coordinates**: Always validate input coordinates before calculation
2. **Cache Results**: Cache distance calculations for frequently accessed data
3. **Batch Operations**: Use `findMechanicsWithinRadius` for multiple calculations
4. **Unit Consistency**: Use consistent units throughout the application

## Testing

### Unit Tests
The distance calculator service should be tested with:
- **Valid Coordinates**: Various valid latitude/longitude combinations
- **Edge Cases**: Coordinates at poles, equator, and international date line
- **Invalid Input**: Out-of-range coordinates, null values, NaN values
- **Unit Conversions**: Different unit outputs
- **Formatting**: Distance and time formatting functions

### Test Data
```typescript
// Test coordinates (Manila area)
const manila = { lat: 14.5995, lon: 120.9842 };
const quezonCity = { lat: 14.6760, lon: 121.0437 };
const makati = { lat: 14.5547, lon: 121.0244 };

// Expected distances (approximate)
// Manila to Quezon City: ~8.5km
// Manila to Makati: ~5.2km
```

## Future Enhancements

### Potential Improvements
1. **Ellipsoidal Calculations**: Implement Vincenty's formulae for higher accuracy
2. **Elevation Support**: Add elevation data for more accurate calculations
3. **Road Distance**: Integrate with mapping services for actual road distances
4. **Traffic Integration**: Real-time traffic data for travel time estimates
5. **Caching Layer**: Implement Redis or similar for distance caching
6. **Batch Processing**: Optimize for bulk distance calculations

### Integration Opportunities
1. **Google Maps API**: Use for road distances and traffic data
2. **OpenStreetMap**: Free alternative for routing and distance calculations
3. **Real-time Traffic**: Integrate traffic APIs for accurate travel times
4. **Machine Learning**: Predict travel times based on historical data

## Troubleshooting

### Common Issues

#### 1. Invalid Coordinates
```typescript
// Error: "Invalid coordinates provided"
// Solution: Validate coordinates before calculation
if (!this.isValidCoordinate(lat, lon)) {
  console.warn('Invalid coordinates');
  return 0;
}
```

#### 2. Distance Always Returns 0
```typescript
// Check if coordinates are properly set
console.log('Current location:', this.currentLatitude, this.currentLongitude);
console.log('Target location:', targetLat, targetLon);
```

#### 3. Performance Issues
```typescript
// Use batch operations for multiple calculations
const nearbyMechanics = this.distanceCalculator.findMechanicsWithinRadius(
  userLat, userLon, allMechanics, radius
);
```

### Debug Mode
Enable debug logging in the distance calculator service:
```typescript
// Add to distance calculator service
private debug = true;

private log(message: string, data?: any) {
  if (this.debug) {
    console.log(`[DistanceCalculator] ${message}`, data);
  }
}
```

## Conclusion

The Haversine formula implementation provides a robust, accurate, and efficient solution for calculating distances between geographic coordinates in the AutoSOS application. The comprehensive service includes formatting, travel time estimation, and utility functions that enhance the user experience with precise location-based information.

The implementation is designed to be:
- **Accurate**: Uses the proven Haversine formula
- **Flexible**: Supports multiple units and formatting options
- **Efficient**: Optimized for performance
- **Maintainable**: Well-documented and modular code
- **Extensible**: Easy to add new features and improvements
