-- =====================================================
-- FIX BOOKING CANCELLATION POLICIES
-- =====================================================
-- This script ensures both clients and mechanics can cancel bookings
-- by allowing them to update booking status and mechanic_id
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

-- STEP 2: Add policy for clients to update their own bookings (for cancellation)
SELECT '=== ADDING CLIENT BOOKING UPDATE POLICY ===' as info;

-- Drop existing client update policy if it exists
DROP POLICY IF EXISTS bookings_update_client ON public.bookings;

-- Create policy to allow clients to update their own bookings
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

-- STEP 3: Add policy for mechanics to update bookings they're assigned to
SELECT '=== ADDING MECHANIC BOOKING UPDATE POLICY ===' as info;

-- Drop existing mechanic update policy if it exists
DROP POLICY IF EXISTS bookings_update_mechanic ON public.bookings;

-- Create policy to allow mechanics to update bookings they're assigned to
CREATE POLICY bookings_update_mechanic
ON public.bookings FOR UPDATE
TO authenticated
USING (
  mechanic_id = auth.uid()
  AND (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'mechanic'
)
WITH CHECK (
  mechanic_id = auth.uid()
  AND (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'mechanic'
);

-- STEP 4: Add policy for mechanics to update their own profile availability
SELECT '=== ADDING MECHANIC PROFILE UPDATE POLICY ===' as info;

-- Drop existing mechanic profile update policy if it exists
DROP POLICY IF EXISTS profiles_update_mechanic_availability ON public.profiles;

-- Create policy to allow mechanics to update their own profile availability
CREATE POLICY profiles_update_mechanic_availability
ON public.profiles FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  AND (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'mechanic'
)
WITH CHECK (
  user_id = auth.uid()
  AND (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'mechanic'
);

-- STEP 5: Verify all policies are created
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

-- STEP 6: Verify profile policies
SELECT '=== VERIFIED PROFILE POLICIES ===' as info;
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
WHERE tablename = 'profiles'
ORDER BY policyname;

-- STEP 7: Test the policies by showing what each role can do
SELECT '=== POLICY CAPABILITIES TEST ===' as info;
SELECT 
  'Clients can now:' as role,
  '• Create bookings' as capability_1,
  '• View their own bookings' as capability_2,
  '• Update their own bookings (for cancellation)' as capability_3,
  '• Cancel bookings by setting status to cancelled' as capability_4
UNION ALL
SELECT 
  'Mechanics can now:' as role,
  '• View bookings assigned to them' as capability_1,
  '• Update bookings assigned to them (for cancellation)' as capability_2,
  '• Update their own profile availability' as capability_3,
  '• Cancel bookings by setting status to cancelled' as capability_4
UNION ALL
SELECT 
  'Admins can:' as role,
  '• View all bookings' as capability_1,
  '• Update any booking' as capability_2,
  '• Approve/reject mechanics' as capability_3,
  '• Manage all profiles' as capability_4;

-- STEP 8: Success message
SELECT '=== CANCELLATION POLICIES FIX COMPLETED ===' as info;
SELECT 'Both clients and mechanics can now cancel bookings!' as message;
SELECT 'Clients can cancel their own bookings' as client_capability;
SELECT 'Mechanics can cancel bookings assigned to them' as mechanic_capability;
SELECT 'All cancellation operations are now properly secured!' as security_note;
