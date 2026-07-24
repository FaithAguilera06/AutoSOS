-- Fix the process_facial_payment RPC function
-- The original function had issues with user roles and booking status

-- Drop the existing function
drop function if exists public.process_facial_payment(bigint, numeric, text, jsonb);

-- Create the corrected function
create or replace function public.process_facial_payment(
  p_booking_id bigint,
  p_amount numeric,
  p_verification_photo text,
  p_facial_data jsonb default null
) returns table (
  payment_id bigint,
  client_id uuid,
  mechanic_id uuid,
  amount numeric,
  status text
) language plpgsql security definer set search_path = public as $$
declare
  v_booking record;
  v_payment_id bigint;
  v_client_id uuid;
  v_mechanic_id uuid;
begin
  -- Get the current user (should be the client making the payment)
  v_client_id := auth.uid();
  
  if v_client_id is null then
    raise exception 'User not authenticated';
  end if;

  -- Get booking details - client can only pay for their own bookings
  select * into v_booking
  from public.bookings
  where id = p_booking_id 
    and client_id = v_client_id 
    and status = 'in_progress'  -- Changed from 'completed' to 'in_progress'
    and payment_method = 'facial_recognition'
    and payment_status = 'pending';

  if not found then
    raise exception 'Booking not found, not in progress, or payment already processed';
  end if;

  -- Get mechanic ID from booking
  v_mechanic_id := v_booking.mechanic_id;
  
  if v_mechanic_id is null then
    raise exception 'No mechanic assigned to this booking';
  end if;

  -- Check if client has sufficient balance
  if (select wallet_balance from public.profiles where user_id = v_client_id) < p_amount then
    raise exception 'Insufficient wallet balance';
  end if;

  -- Validate facial verification data is present
  if p_facial_data is null or p_facial_data->>'verification_method' != 'facial_recognition' then
    raise exception 'Invalid facial verification data - payment must be verified through FaceNet API';
  end if;

  -- Check if confidence threshold is met (if provided)
  if p_facial_data->>'confidence' is not null and (p_facial_data->>'confidence')::numeric < 0.6 then
    raise exception 'Face verification confidence too low - minimum 60% required';
  end if;

  -- Create facial payment record (try both table names for compatibility)
  begin
    insert into public.facial_payments (
      client_id, mechanic_id, booking_id, amount, verification_photo, facial_verification_data, status
    ) values (
      v_client_id, v_mechanic_id, p_booking_id, p_amount, p_verification_photo, p_facial_data, 'completed'
    ) returning id into v_payment_id;
  exception when undefined_table then
    -- Fallback to facial_recognition_payments table
    insert into public.facial_recognition_payments (
      client_id, mechanic_id, booking_id, amount, verification_photo, facial_recognition_data, status
    ) values (
      v_client_id, v_mechanic_id, p_booking_id, p_amount, p_verification_photo, p_facial_data, 'completed'
    ) returning id into v_payment_id;
  end;

  -- Deduct from client's wallet
  update public.profiles
  set wallet_balance = wallet_balance - p_amount
  where user_id = v_client_id;

  -- Add to mechanic's wallet
  update public.profiles
  set wallet_balance = wallet_balance + p_amount
  where user_id = v_mechanic_id;

  -- Create transaction records
  insert into public.wallet_transactions (
    user_id, transaction_type, amount, status, payment_method, reference_number, description
  ) values 
  (v_client_id, 'payment', p_amount, 'completed', 'facial_recognition', p_booking_id::text, 'Payment to mechanic via facial recognition'),
  (v_mechanic_id, 'payment', p_amount, 'completed', 'facial_recognition', p_booking_id::text, 'Payment received from client via facial recognition');

  -- Update booking payment status
  update public.bookings
  set payment_status = 'paid',
      payment_completed_at = now()
  where id = p_booking_id;

  -- Return results
  return query select v_payment_id, v_client_id, v_mechanic_id, p_amount, 'completed'::text;
end$$;

-- Grant execute permission to authenticated users
grant execute on function public.process_facial_payment(bigint, numeric, text, jsonb) to authenticated;
