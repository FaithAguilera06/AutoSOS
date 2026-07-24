# Mapbox Navigation SDK Setup Guide for AutoSOS

## Overview
This guide will help you set up Mapbox Navigation SDK for real-time tracking and navigation in your AutoSOS Android application.

## Prerequisites
- Android Studio
- Mapbox account (free tier available)
- AutoSOS project with Ionic/Capacitor

## Step 1: Get Mapbox Access Token

1. Go to [Mapbox](https://www.mapbox.com/) and create a free account
2. Navigate to your [Account page](https://account.mapbox.com/)
3. Create a new access token or use the default public token
4. Copy your access token

## Step 2: Configure Access Token

1. Open `src/environments/mapbox.config.ts`
2. Replace `YOUR_MAPBOX_ACCESS_TOKEN` with your actual token:

```typescript
export const mapboxConfig = {
  accessToken: 'pk.eyJ1IjoieW91cnVzZXJuYW1lIiwiYSI6ImNsZXhhbXBsZTAwMDAwMDAwMDAwMDAwMDAwIn0.your_actual_token_here',
  // ... rest of config
};
```

3. Also update `src/app/mapbox.service.ts`:

```typescript
private mapboxAccessToken = 'pk.eyJ1IjoieW91cnVzZXJuYW1lIiwiYSI6ImNsZXhhbXBsZTAwMDAwMDAwMDAwMDAwMDAwIn0.your_actual_token_here';
```

## Step 3: Install Dependencies

Run the following commands in your project root:

```bash
# Install npm dependencies
npm install @mapbox/mapbox-sdk @mapbox/mapbox-gl-js

# Sync Capacitor
npx cap sync android
```

## Step 4: Android Configuration

### Add Mapbox Repository
The repository is already added to `android/app/build.gradle`. If you need to add it manually:

```gradle
repositories {
    maven {
        url 'https://api.mapbox.com/downloads/v2/releases/maven'
        authentication {
            basic(BasicAuthentication)
        }
        credentials {
            username = "mapbox"
            password = project.hasProperty('MAPBOX_DOWNLOADS_TOKEN') ? project.property('MAPBOX_DOWNLOADS_TOKEN') : System.getenv('MAPBOX_DOWNLOADS_TOKEN')
        }
    }
}
```

### Add Dependencies
The dependencies are already added to `android/app/build.gradle`:

```gradle
dependencies {
    // Mapbox Navigation SDK
    implementation 'com.mapbox.navigation:android:2.20.0'
    implementation 'com.mapbox.mapboxsdk:mapbox-android-sdk:10.16.0'
    implementation 'com.mapbox.mapboxsdk:mapbox-android-plugin-annotation-v9:0.9.0'
}
```

### Add Permissions
Add these permissions to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

## Step 5: Initialize Mapbox in Your App

### Update App Module
Add the MapboxService to your app module or use it as a standalone service.

### Initialize in Main Component
In your main app component or the mechanic finder page:

```typescript
import { MapboxService } from './mapbox.service';

constructor(private mapboxService: MapboxService) {
  // Initialize with your access token
  this.mapboxService.setAccessToken('your_access_token_here');
}
```

## Step 6: Features Implemented

### ✅ Real-time Location Tracking
- User location tracking every 5 seconds
- Mechanic location updates
- Distance calculations
- ETA estimations

### ✅ Navigation Features
- Turn-by-turn directions
- Route optimization
- Real-time route updates

### ✅ Map Integration
- Interactive map with markers
- User and mechanic location display
- Real-time movement tracking

## Step 7: Usage Examples

### Start Real-time Tracking
```typescript
// Start tracking a mechanic
this.startRealTimeTracking('mechanic_id_here');

// Stop tracking
this.stopRealTimeTracking();
```

### Get Directions
```typescript
const directions = await this.mapboxService.getDirections(userLocation, mechanicLocation);
```

### Calculate Distance
```typescript
const distance = this.mapboxService.calculateDistance(userLocation, mechanicLocation);
```

## Step 8: Testing

1. Build and run your Android app:
```bash
npx cap run android
```

2. Test the following features:
   - Location permission requests
   - Real-time location tracking
   - Map display with markers
   - Navigation directions
   - Mechanic tracking

## Troubleshooting

### Common Issues

1. **"Access token not found"**
   - Make sure you've set your Mapbox access token in both config files

2. **"Location permission denied"**
   - Check Android permissions in settings
   - Ensure location permissions are granted

3. **"Map not loading"**
   - Verify your access token is valid
   - Check internet connection
   - Ensure Mapbox dependencies are properly installed

4. **"Build errors"**
   - Clean and rebuild your project
   - Ensure all dependencies are properly synced

### Debug Mode
Enable debug logging in your MapboxService:

```typescript
// Add this to your service for debugging
console.log('Mapbox token:', this.mapboxAccessToken);
console.log('Current location:', location);
```

## Next Steps

1. **Backend Integration**: Implement real-time location sharing via Supabase
2. **Offline Maps**: Add offline map support for areas with poor connectivity
3. **Push Notifications**: Add notifications for mechanic arrival
4. **Route Optimization**: Implement multi-stop routing for mechanics

## Support

- [Mapbox Documentation](https://docs.mapbox.com/android/navigation/)
- [Mapbox Community](https://community.mapbox.com/)
- [AutoSOS Project Issues](link-to-your-project-issues)

## Cost Information

- **Free Tier**: 50,000 map loads per month
- **Paid Plans**: Start at $5/month for additional usage
- **Navigation**: Included in map loads

This setup provides a solid foundation for real-time navigation and tracking in your AutoSOS application!
