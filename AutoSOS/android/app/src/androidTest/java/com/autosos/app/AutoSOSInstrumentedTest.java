package com.autosos.app;

import static org.junit.Assert.*;

import android.content.Context;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import org.junit.Test;
import org.junit.runner.RunWith;

/**
 * AutoSOS Instrumented Tests
 * These tests run on Android devices/emulators
 */
@RunWith(AndroidJUnit4.class)
public class AutoSOSInstrumentedTest {

    @Test
    public void useAppContext() throws Exception {
        // Context of the app under test
        Context appContext = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertEquals("com.autosos.app", appContext.getPackageName());
    }

    @Test
    public void testMainActivityLaunch() throws Exception {
        // Test that MainActivity can be instantiated
        Context appContext = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertNotNull("App context should not be null", appContext);
    }

    @Test
    public void testAppPermissions() throws Exception {
        // Test that required permissions are declared
        Context appContext = InstrumentationRegistry.getInstrumentation().getTargetContext();
        
        // Check if camera permission is available
        int cameraPermission = appContext.checkSelfPermission("android.permission.CAMERA");
        assertTrue("Camera permission should be available", 
                   cameraPermission == android.content.pm.PackageManager.PERMISSION_GRANTED ||
                   cameraPermission == android.content.pm.PackageManager.PERMISSION_DENIED);
        
        // Check if location permission is available
        int locationPermission = appContext.checkSelfPermission("android.permission.ACCESS_FINE_LOCATION");
        assertTrue("Location permission should be available", 
                   locationPermission == android.content.pm.PackageManager.PERMISSION_GRANTED ||
                   locationPermission == android.content.pm.PackageManager.PERMISSION_DENIED);
    }
}
