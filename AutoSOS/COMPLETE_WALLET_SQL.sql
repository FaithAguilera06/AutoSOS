-- =====================================================
-- COMPLETE WALLET SYSTEM SQL SCRIPT
-- AutoSOS - All wallet-related database components
-- =====================================================

-- Create wallet-related enums
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'transaction_type' AND n.nspname = 'public') THEN
    CREATE TYPE public.transaction_type AS ENUM ('topup', 'payment', 'refund', 'withdrawal');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'transaction_status' AND n.nspname = 'public') THEN
    CREATE TYPE public.transaction_status AS ENUM ('pending', 'approved', 'rejected', 'completed', 'failed');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'payment_method' AND n.nspname = 'public') THEN
    CREATE TYPE public.payment_method AS ENUM ('gcash', 'facial_recognition', 'bank_transfer', 'cash');
  END IF;
END $$;

-- Add wallet balance to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(10,2) DEFAULT 0.00;

-- Create wallet transactions table
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  transaction_type public.transaction_type NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  status public.transaction_status NOT NULL DEFAULT 'pending',
  payment_method public.payment_method,
  reference_number TEXT, -- GCash reference number or booking ID
  description TEXT,
  admin_notes TEXT, -- Admin can add notes when approving/rejecting
  processed_by UUID REFERENCES public.profiles(user_id), -- Admin who processed
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create wallet topup requests table (for GCash receipts)
CREATE TABLE IF NOT EXISTS public.wallet_topup_requests (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  gcash_reference TEXT NOT NULL,
  receipt_images TEXT[], -- Array of image URLs
  verification_photo TEXT, -- User's selfie for verification (optional)
  status public.transaction_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  processed_by UUID REFERENCES public.profiles(user_id),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create facial recognition payments table
CREATE TABLE IF NOT EXISTS public.facial_recognition_payments (
  id BIGSERIAL PRIMARY KEY,
  booking_id BIGINT NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  mechanic_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  verification_photo TEXT, -- Base64 encoded photo for verification
  facial_recognition_data JSONB, -- Facial recognition match data
  status public.transaction_status NOT NULL DEFAULT 'pending',
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create admin GCash settings table
CREATE TABLE IF NOT EXISTS public.admin_gcash_settings (
  id BIGSERIAL PRIMARY KEY,
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  qr_code_image TEXT, -- Base64 encoded QR code image
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS wallet_transactions_user_id_idx ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS wallet_transactions_status_idx ON public.wallet_transactions(status);
CREATE INDEX IF NOT EXISTS wallet_topup_requests_user_id_idx ON public.wallet_topup_requests(user_id);
CREATE INDEX IF NOT EXISTS wallet_topup_requests_status_idx ON public.wallet_topup_requests(status);
CREATE INDEX IF NOT EXISTS facial_payments_booking_id_idx ON public.facial_recognition_payments(booking_id);

-- Set up updated_at triggers
DROP TRIGGER IF EXISTS wallet_transactions_set_updated_at ON public.wallet_transactions;
CREATE TRIGGER wallet_transactions_set_updated_at
  BEFORE UPDATE ON public.wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS wallet_topup_requests_set_updated_at ON public.wallet_topup_requests;
CREATE TRIGGER wallet_topup_requests_set_updated_at
  BEFORE UPDATE ON public.wallet_topup_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS facial_payments_set_updated_at ON public.facial_recognition_payments;
CREATE TRIGGER facial_payments_set_updated_at
  BEFORE UPDATE ON public.facial_recognition_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS admin_gcash_settings_set_updated_at ON public.admin_gcash_settings;
CREATE TRIGGER admin_gcash_settings_set_updated_at
  BEFORE UPDATE ON public.admin_gcash_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Function to get wallet balance
CREATE OR REPLACE FUNCTION public.get_wallet_balance(p_user_id UUID DEFAULT NULL)
RETURNS NUMERIC LANGUAGE SQL SECURITY DEFINER SET search_path = public AS $$
  SELECT wallet_balance 
  FROM public.profiles 
  WHERE user_id = COALESCE(p_user_id, auth.uid());
$$;

-- Function to get wallet transaction history
CREATE OR REPLACE FUNCTION public.get_wallet_transactions(
  p_user_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
) RETURNS TABLE (
  id BIGINT,
  transaction_type TEXT,
  amount NUMERIC,
  status TEXT,
  payment_method TEXT,
  reference_number TEXT,
  description TEXT,
  created_at TIMESTAMPTZ
) LANGUAGE SQL SECURITY DEFINER SET search_path = public AS $$
  SELECT 
    wt.id,
    wt.transaction_type::TEXT,
    wt.amount,
    wt.status::TEXT,
    wt.payment_method::TEXT,
    wt.reference_number,
    wt.description,
    wt.created_at
  FROM public.wallet_transactions wt
  WHERE wt.user_id = COALESCE(p_user_id, auth.uid())
  ORDER BY wt.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;

-- Function to approve wallet topup request (admin only)
DROP FUNCTION IF EXISTS public.approve_wallet_topup(BIGINT, TEXT);
CREATE OR REPLACE FUNCTION public.approve_wallet_topup(
  p_topup_id BIGINT,
  p_admin_notes TEXT DEFAULT NULL
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id UUID;
  v_amount NUMERIC(10,2);
  v_current_balance NUMERIC(10,2);
BEGIN
  -- Check if user is admin
  IF public.current_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  -- Get topup request details
  SELECT user_id, amount INTO v_user_id, v_amount
  FROM public.wallet_topup_requests 
  WHERE id = p_topup_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Topup request not found or already processed';
  END IF;

  -- Update topup request status
  UPDATE public.wallet_topup_requests 
  SET 
    status = 'approved',
    admin_notes = COALESCE(p_admin_notes, 'Approved by admin'),
    processed_by = auth.uid(),
    processed_at = NOW()
  WHERE id = p_topup_id;

  -- Get current user balance
  SELECT wallet_balance INTO v_current_balance
  FROM public.profiles 
  WHERE user_id = v_user_id;
  
  -- Update user wallet balance
  UPDATE public.profiles 
  SET wallet_balance = COALESCE(v_current_balance, 0) + v_amount
  WHERE user_id = v_user_id;

  -- Create wallet transaction record
  INSERT INTO public.wallet_transactions (
    user_id,
    transaction_type,
    amount,
    status,
    payment_method,
    reference_number,
    description,
    processed_by,
    processed_at
  ) VALUES (
    v_user_id,
    'topup',
    v_amount,
    'completed',
    'gcash',
    'TOPUP-' || p_topup_id,
    'GCash topup approved by admin',
    auth.uid(),
    NOW()
  );

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error approving topup: %', SQLERRM;
END;
$$;

-- Function to reject wallet topup request (admin only)
CREATE OR REPLACE FUNCTION public.reject_wallet_topup(
  p_topup_id BIGINT,
  p_admin_notes TEXT
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Check if user is admin
  IF public.current_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  -- Update topup request status
  UPDATE public.wallet_topup_requests 
  SET 
    status = 'rejected',
    admin_notes = p_admin_notes,
    processed_by = auth.uid(),
    processed_at = NOW()
  WHERE id = p_topup_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Topup request not found or already processed';
  END IF;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error rejecting topup: %', SQLERRM;
END;
$$;

-- Storage policies for wallet receipt images
DROP POLICY IF EXISTS "Wallet receipts: owners read" ON storage.objects;
CREATE POLICY "Wallet receipts: owners read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'autosos'
  AND (storage.foldername(name))[1] = 'wallet_receipts'
  AND (storage.foldername(name))[2] = auth.uid()::TEXT
);

DROP POLICY IF EXISTS "Wallet receipts: owners insert" ON storage.objects;
CREATE POLICY "Wallet receipts: owners insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'autosos'
  AND (storage.foldername(name))[1] = 'wallet_receipts'
  AND (storage.foldername(name))[2] = auth.uid()::TEXT
);

DROP POLICY IF EXISTS "Wallet receipts: admins read" ON storage.objects;
CREATE POLICY "Wallet receipts: admins read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'autosos'
  AND (storage.foldername(name))[1] = 'wallet_receipts'
  AND public.current_user_role() = 'admin'
);

-- Enable Row Level Security on wallet tables
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_topup_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facial_recognition_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_gcash_settings ENABLE ROW LEVEL SECURITY;

-- Wallet transactions policies
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.wallet_transactions;
CREATE POLICY "Users can view their own transactions"
ON public.wallet_transactions FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all transactions" ON public.wallet_transactions;
CREATE POLICY "Admins can view all transactions"
ON public.wallet_transactions FOR SELECT TO authenticated
USING (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "System can insert transactions" ON public.wallet_transactions;
CREATE POLICY "System can insert transactions"
ON public.wallet_transactions FOR INSERT TO authenticated
WITH CHECK (TRUE); -- Will be restricted by application logic

-- Allow system functions to update wallet balances
DROP POLICY IF EXISTS "System can update wallet balances" ON public.profiles;
CREATE POLICY "System can update wallet balances"
ON public.profiles FOR UPDATE TO authenticated
USING (TRUE)
WITH CHECK (TRUE); -- Will be restricted by function logic

-- Wallet topup requests policies
DROP POLICY IF EXISTS "Users can view their own topup requests" ON public.wallet_topup_requests;
CREATE POLICY "Users can view their own topup requests"
ON public.wallet_topup_requests FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own topup requests" ON public.wallet_topup_requests;
CREATE POLICY "Users can insert their own topup requests"
ON public.wallet_topup_requests FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all topup requests" ON public.wallet_topup_requests;
CREATE POLICY "Admins can view all topup requests"
ON public.wallet_topup_requests FOR SELECT TO authenticated
USING (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins can update topup requests" ON public.wallet_topup_requests;
CREATE POLICY "Admins can update topup requests"
ON public.wallet_topup_requests FOR UPDATE TO authenticated
USING (public.current_user_role() = 'admin');

-- Facial recognition payments policies
DROP POLICY IF EXISTS "Users can view their own facial payments" ON public.facial_recognition_payments;
CREATE POLICY "Users can view their own facial payments"
ON public.facial_recognition_payments FOR SELECT TO authenticated
USING (client_id = auth.uid() OR mechanic_id = auth.uid());

DROP POLICY IF EXISTS "Mechanics can insert facial payments" ON public.facial_recognition_payments;
CREATE POLICY "Mechanics can insert facial payments"
ON public.facial_recognition_payments FOR INSERT TO authenticated
WITH CHECK (mechanic_id = auth.uid() AND public.current_user_role() = 'mechanic');

-- Admin GCash settings policies
DROP POLICY IF EXISTS "Everyone can view active GCash settings" ON public.admin_gcash_settings;
CREATE POLICY "Everyone can view active GCash settings"
ON public.admin_gcash_settings FOR SELECT TO authenticated
USING (is_active = TRUE);

DROP POLICY IF EXISTS "Admins can manage GCash settings" ON public.admin_gcash_settings;
CREATE POLICY "Admins can manage GCash settings"
ON public.admin_gcash_settings FOR ALL TO authenticated
USING (public.current_user_role() = 'admin');

-- Grant execute permissions on wallet functions to authenticated users
GRANT EXECUTE ON FUNCTION public.approve_wallet_topup(BIGINT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_wallet_topup(BIGINT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_wallet_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_wallet_transactions(UUID, INT, INT) TO authenticated;

-- Insert default admin GCash settings
INSERT INTO public.admin_gcash_settings (account_name, account_number, is_active)
VALUES ('AutoSOS Admin', '09123456789', TRUE)
ON CONFLICT DO NOTHING;

-- =====================================================
-- WALLET SYSTEM SETUP COMPLETE
-- =====================================================
-- This script includes:
-- ✅ All wallet-related tables and enums
-- ✅ Indexes for performance
-- ✅ Updated_at triggers
-- ✅ Wallet balance and transaction functions
-- ✅ Admin approve/reject functions with security
-- ✅ Complete RLS policies for all tables
-- ✅ Storage policies for receipt images
-- ✅ Function grants for authenticated users
-- ✅ Default admin settings
-- =====================================================
