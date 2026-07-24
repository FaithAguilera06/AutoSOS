-- Make all pending mechanics unavailable so they won't be booked
-- This script updates the availability status of all mechanics who are not yet approved

-- Update all pending mechanics to be unavailable
UPDATE profiles 
SET availability = 'not_available' 
WHERE role = 'mechanic' 
  AND approved = false;

-- Also update mechanics who are approved but might have unapproved documents
-- (This is a safety measure to ensure only fully approved mechanics are available)
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

-- Show the results
SELECT 
  user_id,
  full_name,
  role,
  approved,
  availability,
  created_at
FROM profiles 
WHERE role = 'mechanic'
ORDER BY approved, availability, created_at;

-- Show count of available vs unavailable mechanics
SELECT 
  approved,
  availability,
  COUNT(*) as count
FROM profiles 
WHERE role = 'mechanic'
GROUP BY approved, availability
ORDER BY approved, availability;
