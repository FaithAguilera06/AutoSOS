-- Script to make a specific mechanic available for testing
-- Replace 'YOUR_MECHANIC_USER_ID' with the actual user_id of your mechanic

-- First, let's see all mechanics to find the right one
SELECT 
  user_id,
  full_name,
  role,
  approved,
  availability,
  latitude,
  longitude
FROM profiles 
WHERE role = 'mechanic'
ORDER BY created_at DESC;

-- Uncomment and modify the line below with your mechanic's user_id:
-- UPDATE profiles 
-- SET availability = 'available', 
--     approved = true,
--     latitude = 14.5995,  -- Manila coordinates (adjust as needed)
--     longitude = 120.9842
-- WHERE user_id = 'YOUR_MECHANIC_USER_ID_HERE';

-- After running the update, verify the change:
-- SELECT 
--   user_id,
--   full_name,
--   approved,
--   availability,
--   latitude,
--   longitude
-- FROM profiles 
-- WHERE user_id = 'YOUR_MECHANIC_USER_ID_HERE';
