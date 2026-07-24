-- =====================================================
-- DIAGNOSTIC SCRIPT FOR BOOKING ASSIGNMENT ISSUES
-- =====================================================
-- This script will help diagnose why mechanics can't see their assigned bookings
-- =====================================================

-- STEP 1: Check all bookings and their assignment status
SELECT '=== ALL BOOKINGS AND THEIR ASSIGNMENTS ===' as info;
SELECT 
  id,
  client_id,
  mechanic_id,
  status,
  required_specialization,
  notes,
  created_at,
  updated_at
FROM bookings
ORDER BY created_at DESC;

-- STEP 2: Check all mechanics and their user IDs
SELECT '=== ALL MECHANICS AND THEIR USER IDs ===' as info;
SELECT 
  user_id,
  full_name,
  role,
  approved,
  availability,
  created_at
FROM profiles
WHERE role = 'mechanic'
ORDER BY created_at DESC;

-- STEP 3: Check if there are any bookings assigned to mechanics
SELECT '=== BOOKINGS ASSIGNED TO MECHANICS ===' as info;
SELECT 
  b.id as booking_id,
  b.status,
  b.mechanic_id,
  p.full_name as mechanic_name,
  b.required_specialization,
  b.created_at
FROM bookings b
LEFT JOIN profiles p ON b.mechanic_id = p.user_id
WHERE b.mechanic_id IS NOT NULL
ORDER BY b.created_at DESC;

-- STEP 4: Check pending bookings (not assigned to any mechanic)
SELECT '=== PENDING BOOKINGS (NOT ASSIGNED) ===' as info;
SELECT 
  id,
  client_id,
  mechanic_id,
  status,
  required_specialization,
  created_at
FROM bookings
WHERE mechanic_id IS NULL
ORDER BY created_at DESC;

-- STEP 5: Check the most recent booking and its assignment
SELECT '=== MOST RECENT BOOKING DETAILS ===' as info;
SELECT 
  b.id,
  b.client_id,
  b.mechanic_id,
  b.status,
  b.required_specialization,
  b.notes,
  b.created_at,
  CASE 
    WHEN b.mechanic_id IS NULL THEN 'NOT ASSIGNED'
    WHEN p.full_name IS NULL THEN 'ASSIGNED TO UNKNOWN MECHANIC'
    ELSE 'ASSIGNED TO: ' || p.full_name
  END as assignment_status
FROM bookings b
LEFT JOIN profiles p ON b.mechanic_id = p.user_id
ORDER BY b.created_at DESC
LIMIT 1;

-- STEP 6: Fix any recent bookings that should be assigned
-- This will assign the most recent booking to the most recent available mechanic
SELECT '=== FIXING RECENT BOOKING ASSIGNMENT ===' as info;

-- Get the most recent unassigned booking
WITH recent_booking AS (
  SELECT id, created_at
  FROM bookings
  WHERE mechanic_id IS NULL
  ORDER BY created_at DESC
  LIMIT 1
),
-- Get the most recent available mechanic
recent_mechanic AS (
  SELECT user_id, full_name
  FROM profiles
  WHERE role = 'mechanic' 
    AND approved = true 
    AND availability = 'available'
  ORDER BY created_at DESC
  LIMIT 1
)
-- Update the booking to assign it to the mechanic
UPDATE bookings 
SET 
  mechanic_id = (SELECT user_id FROM recent_mechanic),
  status = 'matched',
  updated_at = NOW()
WHERE id = (SELECT id FROM recent_booking)
RETURNING 
  id,
  mechanic_id,
  status,
  'ASSIGNED TO: ' || (SELECT full_name FROM recent_mechanic) as assignment_info;

-- STEP 7: Verify the fix
SELECT '=== VERIFICATION: BOOKINGS AFTER FIX ===' as info;
SELECT 
  b.id,
  b.client_id,
  b.mechanic_id,
  b.status,
  p.full_name as mechanic_name,
  b.required_specialization,
  b.created_at
FROM bookings b
LEFT JOIN profiles p ON b.mechanic_id = p.user_id
ORDER BY b.created_at DESC
LIMIT 5;

-- STEP 8: Show summary
SELECT '=== SUMMARY ===' as info;
SELECT 
  'Total Bookings' as metric,
  COUNT(*) as count
FROM bookings
UNION ALL
SELECT 
  'Assigned Bookings',
  COUNT(*)
FROM bookings
WHERE mechanic_id IS NOT NULL
UNION ALL
SELECT 
  'Pending Bookings',
  COUNT(*)
FROM bookings
WHERE mechanic_id IS NULL
UNION ALL
SELECT 
  'Available Mechanics',
  COUNT(*)
FROM profiles
WHERE role = 'mechanic' 
  AND approved = true 
  AND availability = 'available';

-- STEP 9: Success message
SELECT '=== DIAGNOSTIC COMPLETED ===' as info;
SELECT 'Check the results above to see if bookings are properly assigned!' as message;
