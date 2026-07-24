-- =====================================================
-- FIX MECHANIC LOCATIONS SCRIPT
-- =====================================================
-- This script will:
-- 1. Show current location status of all mechanics
-- 2. Set proper coordinates for mechanics without location
-- 3. Verify the fixes
-- =====================================================

-- STEP 1: Show current location status
SELECT '=== CURRENT MECHANIC LOCATIONS ===' as info;
SELECT 
  user_id,
  full_name,
  approved,
  availability,
  latitude,
  longitude,
  CASE 
    WHEN latitude IS NULL OR longitude IS NULL THEN 'MISSING LOCATION'
    ELSE 'HAS LOCATION'
  END as location_status
FROM profiles 
WHERE role = 'mechanic'
ORDER BY created_at DESC;

-- STEP 2: Count mechanics with/without location
SELECT '=== LOCATION STATUS COUNTS ===' as info;
SELECT 
  CASE 
    WHEN latitude IS NULL OR longitude IS NULL THEN 'MISSING LOCATION'
    ELSE 'HAS LOCATION'
  END as location_status,
  COUNT(*) as count
FROM profiles 
WHERE role = 'mechanic'
GROUP BY 
  CASE 
    WHEN latitude IS NULL OR longitude IS NULL THEN 'MISSING LOCATION'
    ELSE 'HAS LOCATION'
  END;

-- STEP 3: Fix locations for mechanics without coordinates
SELECT '=== FIXING MECHANIC LOCATIONS ===' as info;

-- Set Manila coordinates for mechanics without location data
UPDATE profiles 
SET latitude = 14.5995,  -- Manila, Philippines
    longitude = 120.9842
WHERE role = 'mechanic' 
  AND (latitude IS NULL OR longitude IS NULL);

-- Alternative: Set coordinates for specific major cities in Philippines
-- You can uncomment and modify these if you want different locations:

-- UPDATE profiles 
-- SET latitude = 14.5995, longitude = 120.9842  -- Manila
-- WHERE role = 'mechanic' 
--   AND (latitude IS NULL OR longitude IS NULL)
--   AND full_name ILIKE '%manila%';

-- UPDATE profiles 
-- SET latitude = 10.3157, longitude = 123.8854  -- Cebu
-- WHERE role = 'mechanic' 
--   AND (latitude IS NULL OR longitude IS NULL)
--   AND full_name ILIKE '%cebu%';

-- UPDATE profiles 
-- SET latitude = 7.1907, longitude = 125.4553   -- Davao
-- WHERE role = 'mechanic' 
--   AND (latitude IS NULL OR longitude IS NULL)
--   AND full_name ILIKE '%davao%';

-- STEP 4: Show updated locations
SELECT '=== UPDATED MECHANIC LOCATIONS ===' as info;
SELECT 
  user_id,
  full_name,
  approved,
  availability,
  latitude,
  longitude,
  CASE 
    WHEN latitude IS NULL OR longitude IS NULL THEN 'STILL MISSING LOCATION'
    ELSE 'LOCATION FIXED'
  END as location_status
FROM profiles 
WHERE role = 'mechanic'
ORDER BY created_at DESC;

-- STEP 5: Show final location counts
SELECT '=== FINAL LOCATION STATUS COUNTS ===' as info;
SELECT 
  CASE 
    WHEN latitude IS NULL OR longitude IS NULL THEN 'MISSING LOCATION'
    ELSE 'HAS LOCATION'
  END as location_status,
  COUNT(*) as count
FROM profiles 
WHERE role = 'mechanic'
GROUP BY 
  CASE 
    WHEN latitude IS NULL OR longitude IS NULL THEN 'MISSING LOCATION'
    ELSE 'HAS LOCATION'
  END;

-- STEP 6: Test distance calculation (Manila to Manila = 0km)
SELECT '=== TESTING DISTANCE CALCULATION ===' as info;
SELECT 
  full_name,
  latitude,
  longitude,
  -- Calculate distance from Manila (14.5995, 120.9842) to mechanic location
  ROUND(
    6371 * acos(
      cos(radians(14.5995)) * 
      cos(radians(latitude)) * 
      cos(radians(longitude) - radians(120.9842)) + 
      sin(radians(14.5995)) * 
      sin(radians(latitude))
    )::numeric, 2
  ) as distance_from_manila_km
FROM profiles 
WHERE role = 'mechanic'
  AND latitude IS NOT NULL 
  AND longitude IS NOT NULL
ORDER BY distance_from_manila_km;

-- STEP 7: Show mechanics that would be found in a 10km search
SELECT '=== MECHANICS WITHIN 10KM OF MANILA ===' as info;
SELECT 
  user_id,
  full_name,
  approved,
  availability,
  latitude,
  longitude,
  ROUND(
    6371 * acos(
      cos(radians(14.5995)) * 
      cos(radians(latitude)) * 
      cos(radians(longitude) - radians(120.9842)) + 
      sin(radians(14.5995)) * 
      sin(radians(latitude))
    )::numeric, 2
  ) as distance_km
FROM profiles 
WHERE role = 'mechanic'
  AND approved = true
  AND availability = 'available'
  AND latitude IS NOT NULL 
  AND longitude IS NOT NULL
  AND (
    6371 * acos(
      cos(radians(14.5995)) * 
      cos(radians(latitude)) * 
      cos(radians(longitude) - radians(120.9842)) + 
      sin(radians(14.5995)) * 
      sin(radians(latitude))
    )
  ) <= 10  -- Within 10km
ORDER BY distance_km;

-- STEP 8: Success message
SELECT '=== LOCATION FIX COMPLETED ===' as info;
SELECT 'All mechanics now have location data! They should be findable in the app.' as message;
