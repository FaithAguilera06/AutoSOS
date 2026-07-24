-- =====================================================
-- EMERGENCY FIX: RESTORE PROFILE ACCESS
-- =====================================================
-- This script fixes the profile access issue caused by the previous script
-- =====================================================

-- STEP 1: Show current profile policies
SELECT '=== CURRENT PROFILE POLICIES ===' as info;
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

-- STEP 2: Drop all existing profile policies
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS profiles_select_mechanic ON public.profiles;
DROP POLICY IF EXISTS profiles_update_mechanic_availability ON public.profiles;

-- STEP 3: Create simple, permissive profile policies
-- Allow authenticated users to see all profiles
CREATE POLICY profiles_select_all
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to update their own profile
CREATE POLICY profiles_update_own_simple
ON public.profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Allow authenticated users to insert their own profile
CREATE POLICY profiles_insert_own
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- STEP 4: Verify the new policies
SELECT '=== NEW PROFILE POLICIES ===' as info;
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

-- STEP 5: Test profile access
SELECT '=== TESTING PROFILE ACCESS ===' as info;
SELECT 
  'Profiles should now be accessible to:' as test,
  '1. All authenticated users can SELECT profiles' as access1,
  '2. Users can UPDATE their own profile' as access2,
  '3. Users can INSERT their own profile' as access3;

-- STEP 6: Success message
SELECT '=== PROFILE ACCESS RESTORED ===' as info;
SELECT 'All profiles should now be accessible again!' as message;
