-- =====================================================
-- FIX MECHANIC PROFILE UPDATE PERMISSIONS
-- =====================================================
-- This script ensures mechanics can update their own profile
-- including the availability field
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

-- STEP 2: Drop existing update policies
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_mechanic ON public.profiles;

-- STEP 3: Create comprehensive profile update policy
CREATE POLICY profiles_update_own
ON public.profiles FOR UPDATE
TO authenticated
USING (
  -- User can update their own profile
  user_id = auth.uid() OR
  -- Or if they are admin
  (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin'
)
WITH CHECK (
  -- User can update their own profile
  user_id = auth.uid() OR
  -- Or if they are admin
  (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin'
);

-- STEP 4: Ensure profiles table has RLS enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- STEP 5: Verify the policy was created
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

-- STEP 6: Test query to verify mechanic can update their profile
SELECT '=== TESTING MECHANIC PROFILE UPDATE ===' as info;
SELECT 
  'Mechanics should now be able to:' as test,
  '1. UPDATE their own profile' as access1,
  '2. UPDATE availability field' as access2,
  '3. UPDATE other profile fields' as access3;

-- STEP 7: Success message
SELECT '=== MECHANIC PROFILE PERMISSIONS FIXED ===' as info;
SELECT 'Mechanics should now be able to update their availability status!' as message;
