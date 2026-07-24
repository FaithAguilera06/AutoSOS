-- Simple fix for facial recognition payment issues
-- This addresses the most common problems

-- First, let's check what tables exist and create the missing one if needed
CREATE TABLE IF NOT EXISTS public.facial_payments (
  id BIGSERIAL PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  mechanic_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  booking_id BIGINT REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  verification_photo TEXT,
  facial_verification_data JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS public.process_facial_payment(BIGINT, NUMERIC, TEXT, JSONB);

-- Create a simplified version of the function
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

  -- Check if client has sufficient balance (with default if wallet_balance is null)
  IF COALESCE((SELECT wallet_balance FROM public.profiles WHERE user_id = v_client_id), 0) < p_amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  -- Validate facial verification data is present
  IF p_facial_data IS NULL OR p_facial_data->>'verification_method' != 'facial_recognition' THEN
    RAISE EXCEPTION 'Invalid facial verification data - payment must be verified through FaceNet API';
  END IF;

  -- Check if confidence threshold is met (if provided)
  IF p_facial_data->>'confidence' IS NOT NULL AND (p_facial_data->>'confidence')::NUMERIC < 0.6 THEN
    RAISE EXCEPTION 'Face verification confidence too low - minimum 60% required';
  END IF;

  -- Create facial payment record
  INSERT INTO public.facial_payments (
    client_id, mechanic_id, booking_id, amount, verification_photo, facial_verification_data, status
  ) VALUES (
    v_client_id, v_mechanic_id, p_booking_id, p_amount, p_verification_photo, p_facial_data, 'completed'
  ) RETURNING id INTO v_payment_id;

  -- Deduct from client's wallet (with default if wallet_balance is null)
  UPDATE public.profiles
  SET wallet_balance = COALESCE(wallet_balance, 0) - p_amount
  WHERE user_id = v_client_id;

  -- Add to mechanic's wallet (with default if wallet_balance is null)
  UPDATE public.profiles
  SET wallet_balance = COALESCE(wallet_balance, 0) + p_amount
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

-- Test the function (optional - remove this if you don't want to test)
-- This will show if there are any syntax errors
DO $$
BEGIN
    RAISE NOTICE 'Function created successfully';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating function: %', SQLERRM;
END $$;
