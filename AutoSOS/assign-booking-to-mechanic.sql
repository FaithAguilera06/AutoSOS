-- =====================================================
-- MANUAL BOOKING ASSIGNMENT SCRIPT
-- =====================================================
-- Use this to manually assign a booking to a mechanic for testing
-- =====================================================

-- STEP 1: Show all unassigned bookings
SELECT '=== UNASSIGNED BOOKINGS ===' as info;
SELECT 
  id,
  client_id,
  status,
  required_specialization,
  notes,
  created_at
FROM bookings
WHERE mechanic_id IS NULL
ORDER BY created_at DESC;

-- STEP 2: Show all available mechanics
SELECT '=== AVAILABLE MECHANICS ===' as info;
SELECT 
  user_id,
  full_name,
  approved,
  availability,
  created_at
FROM profiles
WHERE role = 'mechanic' 
  AND approved = true 
  AND availability = 'available'
ORDER BY created_at DESC;

-- STEP 3: Assign the most recent booking to the most recent mechanic
-- (Replace the IDs below with actual IDs from the results above)
SELECT '=== ASSIGNING BOOKING TO MECHANIC ===' as info;

-- Get the most recent unassigned booking ID
WITH recent_booking AS (
  SELECT id
  FROM bookings
  WHERE mechanic_id IS NULL
  ORDER BY created_at DESC
  LIMIT 1
),
-- Get the most recent available mechanic ID
recent_mechanic AS (
  SELECT user_id, full_name
  FROM profiles
  WHERE role = 'mechanic' 
    AND approved = true 
    AND availability = 'available'
  ORDER BY created_at DESC
  LIMIT 1
)
-- Update the booking
UPDATE bookings 
SET 
  mechanic_id = (SELECT user_id FROM recent_mechanic),
  status = 'matched',
  updated_at = NOW()
WHERE id = (SELECT id FROM recent_booking)
RETURNING 
  id as booking_id,
  mechanic_id,
  status,
  'ASSIGNED TO: ' || (SELECT full_name FROM recent_mechanic) as mechanic_name;

-- STEP 4: Verify the assignment
SELECT '=== VERIFICATION ===' as info;
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
WHERE b.mechanic_id IS NOT NULL
ORDER BY b.created_at DESC
LIMIT 3;

-- STEP 5: Success message
SELECT '=== ASSIGNMENT COMPLETED ===' as info;
SELECT 'The booking should now appear in the mechanic''s Service Requests tab!' as message;
