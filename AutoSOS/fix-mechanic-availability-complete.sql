-- =====================================================
-- COMPLETE MECHANIC AVAILABILITY FIX SCRIPT
-- =====================================================
-- This script will:
-- 1. Show current status of all mechanics
-- 2. Make all pending mechanics unavailable
-- 3. Set a specific mechanic as available for testing
-- 4. Show final results
-- =====================================================

-- STEP 1: Show current status of all mechanics
SELECT '=== CURRENT MECHANIC STATUS ===' as info;
SELECT 
  user_id,
  full_name,
  role,
  approved,
  availability,
  latitude,
  longitude,
  specialization,
  created_at
FROM profiles 
WHERE role = 'mechanic'
ORDER BY approved, availability, created_at;

-- STEP 2: Show counts by status
SELECT '=== MECHANIC COUNTS BY STATUS ===' as info;
SELECT 
  approved,
  availability,
  COUNT(*) as count
FROM profiles 
WHERE role = 'mechanic'
GROUP BY approved, availability
ORDER BY approved, availability;

-- STEP 3: Make all pending mechanics unavailable
SELECT '=== MAKING PENDING MECHANICS UNAVAILABLE ===' as info;
UPDATE profiles 
SET availability = 'not_available' 
WHERE role = 'mechanic' 
  AND approved = false;

-- Also update mechanics who are approved but might have unapproved documents
UPDATE profiles 
SET availability = 'not_available' 
WHERE role = 'mechanic' 
  AND approved = true 
  AND availability = 'available'
  AND user_id IN (
    -- Check if they have any unapproved documents
    SELECT DISTINCT p.user_id 
    FROM profiles p
    LEFT JOIN mechanic_documents md ON p.user_id = md.user_id
    WHERE p.role = 'mechanic' 
      AND p.approved = true
      AND (md.status IS NULL OR md.status IN ('submitted', 'rejected'))
  );

-- STEP 4: Get the most recent mechanic for testing
SELECT '=== FINDING MOST RECENT MECHANIC FOR TESTING ===' as info;
SELECT 
  user_id,
  full_name,
  approved,
  availability,
  latitude,
  longitude
FROM profiles 
WHERE role = 'mechanic'
ORDER BY created_at DESC
LIMIT 1;

-- STEP 5: Make the most recent mechanic available for testing
-- (This will make the newest mechanic available with Manila coordinates)
UPDATE profiles 
SET availability = 'available', 
    approved = true,
    latitude = 14.5995,  -- Manila, Philippines coordinates
    longitude = 120.9842,
    specialization = ARRAY['general']  -- Set default specialization
WHERE user_id = (
  SELECT user_id 
  FROM profiles 
  WHERE role = 'mechanic'
  ORDER BY created_at DESC
  LIMIT 1
);

-- STEP 6: Show final results
SELECT '=== FINAL MECHANIC STATUS ===' as info;
SELECT 
  user_id,
  full_name,
  role,
  approved,
  availability,
  latitude,
  longitude,
  specialization,
  created_at
FROM profiles 
WHERE role = 'mechanic'
ORDER BY approved, availability, created_at;

-- STEP 7: Show final counts
SELECT '=== FINAL MECHANIC COUNTS ===' as info;
SELECT 
  approved,
  availability,
  COUNT(*) as count
FROM profiles 
WHERE role = 'mechanic'
GROUP BY approved, availability
ORDER BY approved, availability;

-- STEP 8: Test the exact query the app uses
SELECT '=== MECHANICS AVAILABLE FOR BOOKING ===' as info;
SELECT 
  user_id,
  full_name,
  approved,
  availability,
  latitude,
  longitude,
  specialization
FROM profiles
WHERE role = 'mechanic'
  AND approved = true
  AND availability = 'available';

-- STEP 9: Success message
SELECT '=== SCRIPT COMPLETED SUCCESSFULLY ===' as info;
SELECT 'Your mechanic should now be available for booking!' as message;
