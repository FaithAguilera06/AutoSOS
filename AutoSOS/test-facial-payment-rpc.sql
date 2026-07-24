-- Test script to check if the process_facial_payment RPC function exists and works
-- Run this in your Supabase SQL editor to diagnose the issue

-- 1. Check if the function exists
SELECT 
    routine_name, 
    routine_type, 
    data_type as return_type
FROM information_schema.routines 
WHERE routine_name = 'process_facial_payment' 
    AND routine_schema = 'public';

-- 2. Check if the facial_payments table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('facial_payments', 'facial_recognition_payments');

-- 3. Check if the function has the right parameters
SELECT 
    parameter_name, 
    data_type, 
    parameter_mode
FROM information_schema.parameters 
WHERE specific_name IN (
    SELECT specific_name 
    FROM information_schema.routines 
    WHERE routine_name = 'process_facial_payment' 
        AND routine_schema = 'public'
);

-- 4. Test the function with dummy data (this will show the exact error)
-- Replace with actual values from your booking
DO $$
DECLARE
    result_record RECORD;
BEGIN
    -- This will show the exact error message
    FOR result_record IN 
        SELECT * FROM public.process_facial_payment(
            1, -- booking_id (replace with actual booking ID)
            100.00, -- amount (replace with actual amount)
            'test_photo', -- verification_photo
            '{"test": "data"}'::jsonb -- facial_data
        )
    LOOP
        RAISE NOTICE 'Payment ID: %, Client ID: %, Mechanic ID: %, Amount: %, Status: %', 
            result_record.payment_id, 
            result_record.client_id, 
            result_record.mechanic_id, 
            result_record.amount, 
            result_record.status;
    END LOOP;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error: %', SQLERRM;
END $$;
