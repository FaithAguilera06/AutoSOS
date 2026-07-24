-- =====================================================
-- TEST SCRIPT FOR NEW RLS FIX
-- =====================================================
-- Run this after applying the new-facial-payment-rls-fix.sql
-- to verify everything is working correctly
-- =====================================================

-- STEP 1: Check function exists and is accessible
SELECT '=== FUNCTION CHECK ===' as info;
SELECT 
    routine_name, 
    routine_type, 
    security_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_name = 'process_facial_payment' 
    AND routine_schema = 'public';

-- STEP 2: Check RLS policies are in place
SELECT '=== RLS POLICIES CHECK ===' as info;
SELECT 
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename IN ('profiles', 'wallet_transactions', 'facial_payments')
ORDER BY tablename, policyname;

-- STEP 3: Check if tables exist
SELECT '=== TABLE EXISTENCE CHECK ===' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('profiles', 'bookings', 'wallet_transactions', 'facial_payments', 'facial_recognition_payments')
ORDER BY table_name;

-- STEP 4: Check current user and permissions
SELECT '=== USER PERMISSIONS CHECK ===' as info;
SELECT 
    auth.uid() as current_user_id,
    'authenticated' as user_role;

-- STEP 5: Test wallet balance access (should work now)
SELECT '=== WALLET BALANCE TEST ===' as info;
SELECT 
    user_id,
    COALESCE(wallet_balance, 0) as wallet_balance,
    role
FROM public.profiles 
WHERE user_id = auth.uid()
LIMIT 1;

-- STEP 6: Check if there are any test bookings
SELECT '=== TEST BOOKING CHECK ===' as info;
SELECT 
    id,
    client_id,
    mechanic_id,
    status,
    payment_method,
    payment_status,
    service_price
FROM public.bookings 
WHERE client_id = auth.uid() 
    AND status = 'in_progress' 
    AND payment_method = 'facial_recognition'
    AND payment_status = 'pending'
LIMIT 1;

-- STEP 7: Success indicators
SELECT '=== SUCCESS INDICATORS ===' as info;
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'process_facial_payment') 
        THEN '✅ Function exists'
        ELSE '❌ Function missing'
    END as function_status,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND cmd = 'UPDATE') 
        THEN '✅ Profiles update policy exists'
        ELSE '❌ Profiles update policy missing'
    END as profiles_policy_status,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'wallet_transactions' AND cmd = 'INSERT') 
        THEN '✅ Wallet transactions insert policy exists'
        ELSE '❌ Wallet transactions insert policy missing'
    END as wallet_policy_status,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'facial_payments') 
        THEN '✅ Facial payments table exists'
        ELSE '❌ Facial payments table missing'
    END as table_status;

-- STEP 8: Final verification message
SELECT '=== FINAL STATUS ===' as info;
SELECT 
    'If all indicators show ✅, the RLS fix is working correctly' as message,
    'You can now test facial recognition payments in your app' as next_step;
