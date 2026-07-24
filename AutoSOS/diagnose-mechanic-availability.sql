-- Diagnostic script to check why mechanics aren't being found
-- Run this to see the current state of all mechanics

-- Check all mechanics and their status
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

-- Check if there are any mechanics with availability = 'available'
SELECT 
  COUNT(*) as available_mechanics_count
FROM profiles 
WHERE role = 'mechanic' 
  AND approved = true 
  AND availability = 'available';

-- Check if there are any mechanics with location data
SELECT 
  COUNT(*) as mechanics_with_location
FROM profiles 
WHERE role = 'mechanic' 
  AND latitude IS NOT NULL 
  AND longitude IS NOT NULL;

-- Check the exact query that the app uses to find mechanics
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

-- Show count by status
SELECT 
  approved,
  availability,
  COUNT(*) as count
FROM profiles 
WHERE role = 'mechanic'
GROUP BY approved, availability
ORDER BY approved, availability;
