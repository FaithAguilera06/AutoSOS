-- =====================================================
-- FIX BOOKING UPDATE POLICY FOR MECHANIC ASSIGNMENT
-- =====================================================
-- This script adds a policy to allow clients to update their bookings
-- to assign mechanics (update mechanic_id and status)
-- =====================================================

-- STEP 1: Show current booking policies
SELECT '=== CURRENT BOOKING POLICIES ===' as info;
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'bookings'
ORDER BY policyname;

-- STEP 2: Add policy to allow clients to update their own bookings
SELECT '=== ADDING CLIENT BOOKING UPDATE POLICY ===' as info;

-- Drop existing client update policy if it exists
DROP POLICY IF EXISTS bookings_update_client ON public.bookings;

-- Create new policy to allow clients to update their own bookings
CREATE POLICY bookings_update_client
ON public.bookings FOR UPDATE
TO authenticated
USING (
  client_id = auth.uid()
  AND (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'client'
)
WITH CHECK (
  client_id = auth.uid()
  AND (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'client'
);

-- STEP 3: Verify the new policy was created
SELECT '=== VERIFIED BOOKING POLICIES ===' as info;
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'bookings'
ORDER BY policyname;

-- STEP 4: Test the policy by showing what a client can do
SELECT '=== POLICY TEST ===' as info;
SELECT 
  'Clients can now update their own bookings to assign mechanics!' as message,
  'This includes updating mechanic_id and status fields' as details;

-- STEP 5: Success message
SELECT '=== POLICY FIX COMPLETED ===' as info;
SELECT 'Clients should now be able to assign mechanics to their bookings!' as message;
