# AutoSOS APK Build Guide

## Prerequisites

### 1. Install Java Development Kit (JDK)
- Download and install **JDK 17** or **JDK 11** from [Oracle](https://www.oracle.com/java/technologies/downloads/) or [OpenJDK](https://adoptium.net/)
- Set `JAVA_HOME` environment variable to your JDK installation path
- Add JDK `bin` directory to your `PATH`

### 2. Install Android Studio
- Download from [https://developer.android.com/studio](https://developer.android.com/studio)
- Install with default settings
- Open Android Studio and install Android SDK
- Accept all license agreements

### 3. Set Environment Variables
Add these to your system environment variables:

```
JAVA_HOME=C:\Program Files\Java\jdk-17
ANDROID_HOME=C:\Users\%USERNAME%\AppData\Local\Android\Sdk
PATH=%PATH%;%JAVA_HOME%\bin;%ANDROID_HOME%\tools;%ANDROID_HOME%\platform-tools
```

### 4. Quick Setup Scripts
Use these helper scripts to check and configure your environment:

- **`setup-java-env.bat`** - Check and configure Java environment
- **`setup-android-env.bat`** - Set up Android environment variables

## Build Process

### Option 1: Using the Batch Script (Recommended)
1. Run `build-apk.bat` in the project root
2. Follow the instructions in the script
3. Build APK in Android Studio

### Option 2: Manual Build
1. **Build Angular app:**
   ```bash
   npm run build
   ```

2. **Sync with Capacitor:**
   ```bash
   npx cap sync android
   ```

3. **Open in Android Studio:**
   ```bash
   npx cap open android
   ```

4. **Build APK in Android Studio:**
   - Wait for Gradle sync to complete
   - Go to `Build` → `Build Bundle(s) / APK(s)` → `Build APK(s)`
   - Wait for build completion

## APK Location
The generated APK will be located at:
```
android\app\build\outputs\apk\debug\app-debug.apk
```

## App Permissions Included

The APK includes all necessary permissions:

### Camera Permissions
- `android.permission.CAMERA`
- `android.permission.READ_EXTERNAL_STORAGE`
- `android.permission.WRITE_EXTERNAL_STORAGE`

### Location Permissions
- `android.permission.ACCESS_FINE_LOCATION`
- `android.permission.ACCESS_COARSE_LOCATION`
- `android.permission.ACCESS_BACKGROUND_LOCATION`

### Network Permissions
- `android.permission.INTERNET`
- `android.permission.ACCESS_NETWORK_STATE`

### Other Permissions
- `android.permission.WAKE_LOCK`
- `android.permission.VIBRATE`
- `android.permission.RECORD_AUDIO`

## Troubleshooting

### Java Issues
- Ensure JAVA_HOME is set correctly
- Use JDK 17 or JDK 11 (not newer versions)
- Restart command prompt after setting environment variables

### Android Studio Issues
- Ensure Android SDK is installed
- Accept all license agreements
- Update Android SDK tools if needed

### Build Issues
- Clean project: `Build` → `Clean Project`
- Rebuild: `Build` → `Rebuild Project`
- Invalidate caches: `File` → `Invalidate Caches and Restart`

### Java Compilation Issues
- **TensorFlow Lite Array Error:** Fixed tensor input handling in MotorcycleDiagnosticModel.java
- **JAVA_HOME not set:** Use `setup-java-env.bat` to check and configure Java environment
- **Java not found:** Install Java JDK 17 or 11 from https://adoptium.net/

### APK Runtime Issues
- **MainActivity ClassNotFoundException:** Fixed by creating MainActivity.java in correct package (com.autosos.app)
- **App crashes on launch:** Use `test-apk-fix.bat` to verify MainActivity configuration
- **Package name mismatch:** Ensure MainActivity is in com.autosos.app package

### Mapbox Issues
- **Certificate/Repository Errors:** Using web-based Mapbox GL JS (no native dependencies)
- **No repository issues:** All map functionality works through web implementation
- **Better compatibility:** Web-based approach works across all platforms

## App Configuration

The app is configured with:
- **App ID:** `com.autosos.app`
- **App Name:** `AutoSOS`
- **Mapbox Access Token:** Configured and active
- **All required permissions:** Camera, Location, Network

## Mapbox Configuration

The app includes:
- **Mapbox Access Token:** `pk.eyJ1IjoiZmFpdGhhZ3VpbGVyYSIsImEiOiJjbWZqbmdrcWUxMHBpMmpwd2Nsb2d1bnFkIn0.mczL0OLNOyx7VlpdqOSbbQ`
- **Mapbox Implementation:** Web-based Mapbox GL JS (no native Android dependencies)
- **Benefits:** Better compatibility, easier maintenance, no repository issues
- **Features:** Full map functionality, navigation, location services, markers

## Testing the APK

1. Install the APK on an Android device
2. Grant all requested permissions
3. Test camera functionality
4. Test location services
5. Test map functionality

## Production Build

For a production APK:
1. Generate a signed APK in Android Studio
2. Create a keystore for signing
3. Configure signing in `android/app/build.gradle`
4. Build release APK

## Support

If you encounter issues:
1. Check the console output for specific errors
2. Ensure all prerequisites are installed
3. Verify environment variables are set correctly
4. Try cleaning and rebuilding the project
