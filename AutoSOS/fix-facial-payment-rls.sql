-- Fix RLS policies for facial recognition payment
-- This addresses the wallet transfer permission issues

-- =====================================================
-- STEP 1: Check current RLS policies
-- =====================================================

-- Show current policies for profiles table
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

-- Show current policies for wallet_transactions table
SELECT '=== CURRENT WALLET TRANSACTION POLICIES ===' as info;
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
WHERE tablename = 'wallet_transactions'
ORDER BY policyname;

-- =====================================================
-- STEP 2: Fix profiles table policies for wallet operations
-- =====================================================

-- Drop existing wallet-related policies
DROP POLICY IF EXISTS "System can update wallet balances" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- Create comprehensive profile update policy that allows wallet operations
CREATE POLICY profiles_update_own
ON public.profiles FOR UPDATE
TO authenticated
USING (
  -- User can update their own profile
  user_id = auth.uid() OR
  -- Admin can update any profile
  (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' OR
  -- System functions can update profiles (for wallet operations)
  current_setting('role') = 'service_role'
)
WITH CHECK (
  -- User can update their own profile
  user_id = auth.uid() OR
  -- Admin can update any profile
  (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin' OR
  -- System functions can update profiles (for wallet operations)
  current_setting('role') = 'service_role'
);

-- =====================================================
-- STEP 3: Fix wallet_transactions table policies
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "System can insert transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.wallet_transactions;

-- Create comprehensive wallet transaction policies
CREATE POLICY "Users can view their own transactions"
ON public.wallet_transactions FOR SELECT TO authenticated
USING (
  user_id = auth.uid() OR 
  public.current_user_role() = 'admin'
);

CREATE POLICY "System can insert transactions"
ON public.wallet_transactions FOR INSERT TO authenticated
WITH CHECK (
  -- Allow system functions to insert transactions
  current_setting('role') = 'service_role' OR
  -- Allow users to insert their own transactions
  user_id = auth.uid() OR
  -- Allow admin to insert any transaction
  public.current_user_role() = 'admin'
);

-- =====================================================
-- STEP 4: Ensure facial_payments table has proper policies
-- =====================================================

-- Check if facial_payments table exists and create policies
DO $$
BEGIN
    -- Check if facial_payments table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'facial_payments' AND table_schema = 'public') THEN
        -- Enable RLS
        ALTER TABLE public.facial_payments ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "facial_payments_select_own" ON public.facial_payments;
        DROP POLICY IF EXISTS "facial_payments_insert_system" ON public.facial_payments;
        
        -- Create policies for facial_payments
        CREATE POLICY "facial_payments_select_own"
        ON public.facial_payments FOR SELECT TO authenticated
        USING (
          client_id = auth.uid() OR 
          mechanic_id = auth.uid() OR
          public.current_user_role() = 'admin'
        );
        
        CREATE POLICY "facial_payments_insert_system"
        ON public.facial_payments FOR INSERT TO authenticated
        WITH CHECK (
          current_setting('role') = 'service_role' OR
          public.current_user_role() = 'admin'
        );
        
        RAISE NOTICE 'facial_payments table policies created successfully';
    ELSE
        RAISE NOTICE 'facial_payments table does not exist, skipping policies';
    END IF;
END $$;

-- =====================================================
-- STEP 5: Update the process_facial_payment function with better error handling
-- =====================================================

-- Drop and recreate the function with better error handling
DROP FUNCTION IF EXISTS public.process_facial_payment(BIGINT, NUMERIC, TEXT, JSONB);

CREATE OR REPLACE FUNCTION public.process_facial_payment(
  p_booking_id BIGINT,
  p_amount NUMERIC,
  p_verification_photo TEXT,
  p_facial_data JSONB DEFAULT NULL
) RETURNS TABLE (
  payment_id BIGINT,
  client_id UUID,
  mechanic_id UUID,
  amount NUMERIC,
  status TEXT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_booking RECORD;
  v_payment_id BIGINT;
  v_client_id UUID;
  v_mechanic_id UUID;
  v_client_balance NUMERIC;
  v_mechanic_balance NUMERIC;
BEGIN
  -- Get the current user (should be the client making the payment)
  v_client_id := auth.uid();
  
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Get booking details
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id 
    AND client_id = v_client_id 
    AND status = 'in_progress'
    AND payment_method = 'facial_recognition'
    AND payment_status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found, not in progress, or payment already processed';
  END IF;

  -- Get mechanic ID from booking
  v_mechanic_id := v_booking.mechanic_id;
  
  IF v_mechanic_id IS NULL THEN
    RAISE EXCEPTION 'No mechanic assigned to this booking';
  END IF;

  -- Get current wallet balances
  SELECT COALESCE(wallet_balance, 0) INTO v_client_balance
  FROM public.profiles WHERE user_id = v_client_id;
  
  SELECT COALESCE(wallet_balance, 0) INTO v_mechanic_balance
  FROM public.profiles WHERE user_id = v_mechanic_id;

  -- Check if client has sufficient balance
  IF v_client_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance. Current: %, Required: %', v_client_balance, p_amount;
  END IF;

  -- Create facial payment record (try both table names for compatibility)
  BEGIN
    INSERT INTO public.facial_payments (
      client_id, mechanic_id, booking_id, amount, verification_photo, facial_verification_data, status
    ) VALUES (
      v_client_id, v_mechanic_id, p_booking_id, p_amount, p_verification_photo, p_facial_data, 'completed'
    ) RETURNING id INTO v_payment_id;
  EXCEPTION WHEN undefined_table THEN
    -- Fallback to facial_recognition_payments table
    INSERT INTO public.facial_recognition_payments (
      client_id, mechanic_id, booking_id, amount, verification_photo, facial_recognition_data, status
    ) VALUES (
      v_client_id, v_mechanic_id, p_booking_id, p_amount, p_verification_photo, p_facial_data, 'completed'
    ) RETURNING id INTO v_payment_id;
  END;

  -- Deduct from client's wallet
  UPDATE public.profiles
  SET wallet_balance = v_client_balance - p_amount
  WHERE user_id = v_client_id;

  -- Add to mechanic's wallet
  UPDATE public.profiles
  SET wallet_balance = v_mechanic_balance + p_amount
  WHERE user_id = v_mechanic_id;

  -- Create transaction records (only if wallet_transactions table exists)
  BEGIN
    INSERT INTO public.wallet_transactions (
      user_id, transaction_type, amount, status, payment_method, reference_number, description
    ) VALUES 
    (v_client_id, 'payment', p_amount, 'completed', 'facial_recognition', p_booking_id::text, 'Payment to mechanic via facial recognition'),
    (v_mechanic_id, 'payment', p_amount, 'completed', 'facial_recognition', p_booking_id::text, 'Payment received from client via facial recognition');
  EXCEPTION WHEN undefined_table THEN
    -- Wallet transactions table doesn't exist, that's okay
    NULL;
  END;

  -- Update booking payment status
  UPDATE public.bookings
  SET payment_status = 'paid',
      payment_completed_at = NOW()
  WHERE id = p_booking_id;

  -- Return results
  RETURN QUERY SELECT v_payment_id, v_client_id, v_mechanic_id, p_amount, 'completed'::text;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.process_facial_payment(BIGINT, NUMERIC, TEXT, JSONB) TO authenticated;

-- =====================================================
-- STEP 6: Verify the fix
-- =====================================================

SELECT '=== VERIFICATION COMPLETE ===' as info;
SELECT 
  'RLS policies updated for:' as fix1,
  '1. profiles table (wallet operations)' as fix2,
  '2. wallet_transactions table' as fix3,
  '3. facial_payments table' as fix4,
  '4. process_facial_payment function' as fix5;

-- Test the function exists
SELECT 
  routine_name, 
  routine_type, 
  data_type as return_type
FROM information_schema.routines 
WHERE routine_name = 'process_facial_payment' 
    AND routine_schema = 'public';
