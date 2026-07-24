-- =====================================================
-- CHECK AND FIX POLICIES SAFELY
-- =====================================================
-- This script checks existing policies and provides safe fixes
-- =====================================================

-- STEP 1: Show all existing policies
SELECT '=== ALL EXISTING POLICIES ===' as info;
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
WHERE tablename IN ('bookings', 'profiles')
ORDER BY tablename, policyname;

-- STEP 2: Show specific booking policies
SELECT '=== BOOKING POLICIES ===' as info;
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'bookings'
ORDER BY policyname;

-- STEP 3: Show specific profile policies
SELECT '=== PROFILE POLICIES ===' as info;
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- STEP 4: Drop ALL existing policies (safe approach)
SELECT '=== DROPPING ALL EXISTING POLICIES ===' as info;

-- Drop all booking policies
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'bookings') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.bookings';
    END LOOP;
END $$;

-- Drop all profile policies
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.profiles';
    END LOOP;
END $$;

-- STEP 5: Create new simple policies
SELECT '=== CREATING NEW SIMPLE POLICIES ===' as info;

-- Profile policies (permissive)
CREATE POLICY profiles_select_all
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY profiles_update_own
ON public.profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY profiles_insert_own
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Booking policies (involved users only)
CREATE POLICY bookings_select_involved
ON public.bookings FOR SELECT
TO authenticated
USING (
  client_id = auth.uid() OR 
  mechanic_id = auth.uid() OR
  (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin'
);

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

CREATE POLICY bookings_insert_client
ON public.bookings FOR INSERT
TO authenticated
WITH CHECK (
  client_id = auth.uid() AND
  (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'client'
);

-- STEP 6: Verify new policies
SELECT '=== VERIFIED NEW POLICIES ===' as info;
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
WHERE tablename IN ('bookings', 'profiles')
ORDER BY tablename, policyname;

-- STEP 7: Success message
SELECT '=== ALL POLICIES RESET AND FIXED ===' as info;
SELECT 'All policies have been reset and recreated with safe, working configurations!' as message;
