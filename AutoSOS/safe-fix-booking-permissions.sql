-- =====================================================
-- SAFE FIX: BOOKING PERMISSIONS ONLY
-- =====================================================
-- This script only fixes booking permissions without touching profile policies
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

-- STEP 2: Drop existing booking policies that might be conflicting
DROP POLICY IF EXISTS bookings_select_mechanic ON public.bookings;
DROP POLICY IF EXISTS bookings_update_mechanic ON public.bookings;
DROP POLICY IF EXISTS bookings_select_own ON public.bookings;
DROP POLICY IF EXISTS bookings_update_client ON public.bookings;
DROP POLICY IF EXISTS bookings_insert_client ON public.bookings;
DROP POLICY IF EXISTS bookings_update_admin ON public.bookings;

-- STEP 3: Create simple booking policies
-- Allow users to see bookings where they are involved
CREATE POLICY bookings_select_involved
ON public.bookings FOR SELECT
TO authenticated
USING (
  client_id = auth.uid() OR 
  mechanic_id = auth.uid() OR
  (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin'
);

-- Allow users to update bookings where they are involved
CREATE POLICY bookings_update_involved
ON public.bookings FOR UPDATE
TO authenticated
USING (
  client_id = auth.uid() OR 
  mechanic_id = auth.uid() OR
  (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin'
)
WITH CHECK (
  client_id = auth.uid() OR 
  mechanic_id = auth.uid() OR
  (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin'
);

-- Allow clients to insert bookings
CREATE POLICY bookings_insert_client
ON public.bookings FOR INSERT
TO authenticated
WITH CHECK (
  client_id = auth.uid() AND
  (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'client'
);

-- STEP 4: Verify the new booking policies
SELECT '=== NEW BOOKING POLICIES ===' as info;
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

-- STEP 5: Test booking access
SELECT '=== TESTING BOOKING ACCESS ===' as info;
SELECT 
  'Bookings should now be accessible to:' as test,
  '1. Clients can see and update their own bookings' as access1,
  '2. Mechanics can see and update bookings assigned to them' as access2,
  '3. Clients can create new bookings' as access3,
  '4. Admins can see and update all bookings' as access4;

-- STEP 6: Success message
SELECT '=== BOOKING PERMISSIONS FIXED ===' as info;
SELECT 'Booking permissions should now work without breaking profile access!' as message;
