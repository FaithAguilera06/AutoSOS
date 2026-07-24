-- Test script to verify wallet transfer permissions
-- Run this after applying the RLS fix

-- 1. Check if the function exists and has correct permissions
SELECT '=== FUNCTION CHECK ===' as info;
SELECT 
    routine_name, 
    routine_type, 
    security_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_name = 'process_facial_payment' 
    AND routine_schema = 'public';

-- 2. Check current RLS policies
SELECT '=== CURRENT RLS POLICIES ===' as info;
SELECT 
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename IN ('profiles', 'wallet_transactions', 'facial_payments')
ORDER BY tablename, policyname;

-- 3. Check if user has wallet balance (replace with actual user ID)
SELECT '=== WALLET BALANCE CHECK ===' as info;
SELECT 
    user_id,
    wallet_balance,
    role
FROM public.profiles 
WHERE user_id = auth.uid();

-- 4. Test the function with a simple call (this will show any permission errors)
-- Replace the values with actual booking data from your system
DO $$
DECLARE
    result_record RECORD;
    test_booking_id BIGINT;
    test_amount NUMERIC;
BEGIN
    -- Get a test booking ID (replace with actual booking ID from your system)
    SELECT id INTO test_booking_id 
    FROM public.bookings 
    WHERE client_id = auth.uid() 
        AND status = 'in_progress' 
        AND payment_method = 'facial_recognition'
        AND payment_status = 'pending'
    LIMIT 1;
    
    IF test_booking_id IS NOT NULL THEN
        -- Get the service price
        SELECT service_price INTO test_amount 
        FROM public.bookings 
        WHERE id = test_booking_id;
        
        IF test_amount IS NOT NULL AND test_amount > 0 THEN
            RAISE NOTICE 'Testing with booking ID: %, amount: %', test_booking_id, test_amount;
            
            -- This will show the exact error if there are permission issues
            FOR result_record IN 
                SELECT * FROM public.process_facial_payment(
                    test_booking_id,
                    test_amount,
                    'test_photo',
                    '{"test": "data"}'::jsonb
                )
            LOOP
                RAISE NOTICE 'SUCCESS: Payment ID: %, Client ID: %, Mechanic ID: %, Amount: %, Status: %', 
                    result_record.payment_id, 
                    result_record.client_id, 
                    result_record.mechanic_id, 
                    result_record.amount, 
                    result_record.status;
            END LOOP;
        ELSE
            RAISE NOTICE 'No valid booking with service price found for testing';
        END IF;
    ELSE
        RAISE NOTICE 'No test booking found. Create a booking with facial_recognition payment method first.';
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERROR: %', SQLERRM;
END $$;
