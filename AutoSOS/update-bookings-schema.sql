-- =====================================================
-- UPDATE BOOKINGS TABLE SCHEMA
-- =====================================================
-- This script adds new columns to the bookings table for enhanced functionality
-- =====================================================

-- STEP 1: Show current bookings table structure
SELECT '=== CURRENT BOOKINGS TABLE STRUCTURE ===' as info;
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'bookings' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- STEP 2: Add new columns to bookings table
SELECT '=== ADDING NEW COLUMNS TO BOOKINGS TABLE ===' as info;

-- Add mechanic location fields
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS mechanic_latitude double precision,
ADD COLUMN IF NOT EXISTS mechanic_longitude double precision;

-- Add client location fields (these might already exist, but ensuring they're there)
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS client_latitude double precision,
ADD COLUMN IF NOT EXISTS client_longitude double precision;

-- Remove old latitude and longitude fields (migrate data first if needed)
-- First, copy data from old fields to new client fields if they exist
UPDATE public.bookings 
SET 
  client_latitude = latitude,
  client_longitude = longitude
WHERE client_latitude IS NULL AND latitude IS NOT NULL;

-- Now drop the old fields
ALTER TABLE public.bookings 
DROP COLUMN IF EXISTS latitude,
DROP COLUMN IF EXISTS longitude;

-- Add service price field
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS service_price numeric(10,2);

-- Add motorcycle model field
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS motorcycle_model text;

-- Add phone number field
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS client_phone text;

-- Add payment method field (only cash or facial_recognition)
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'cash' CHECK (payment_method IN ('cash', 'facial_recognition'));

-- Add payment status field (for tracking payment completion)
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';

-- Add payment completion timestamp
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS payment_completed_at timestamptz;

-- Add service completion timestamp
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS service_completed_at timestamptz;

-- STEP 3: Add comments to columns for documentation
COMMENT ON COLUMN public.bookings.mechanic_latitude IS 'Mechanic current latitude when service starts';
COMMENT ON COLUMN public.bookings.mechanic_longitude IS 'Mechanic current longitude when service starts';
COMMENT ON COLUMN public.bookings.client_latitude IS 'Client location latitude where service is needed';
COMMENT ON COLUMN public.bookings.client_longitude IS 'Client location longitude where service is needed';
COMMENT ON COLUMN public.bookings.service_price IS 'Price of the service in PHP';
COMMENT ON COLUMN public.bookings.motorcycle_model IS 'Client motorcycle model/brand';
COMMENT ON COLUMN public.bookings.client_phone IS 'Client phone number for contact';
COMMENT ON COLUMN public.bookings.payment_method IS 'Payment method: cash or facial_recognition';
COMMENT ON COLUMN public.bookings.payment_status IS 'Payment status: pending, paid, failed';
COMMENT ON COLUMN public.bookings.payment_completed_at IS 'Timestamp when payment was completed';
COMMENT ON COLUMN public.bookings.service_completed_at IS 'Timestamp when service was completed';

-- STEP 4: Update existing records with default values (if needed)
UPDATE public.bookings 
SET 
  payment_method = 'cash',
  payment_status = 'pending'
WHERE payment_method IS NULL OR payment_status IS NULL;

-- Note: Data migration from old latitude/longitude to client_latitude/client_longitude 
-- was completed in STEP 2 above before dropping the old columns

-- STEP 5: Show updated table structure
SELECT '=== UPDATED BOOKINGS TABLE STRUCTURE ===' as info;
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'bookings' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- STEP 6: Show sample of updated data
SELECT '=== SAMPLE OF UPDATED BOOKINGS DATA ===' as info;
SELECT 
  id,
  client_id,
  mechanic_id,
  status,
  service_price,
  motorcycle_model,
  client_phone,
  payment_method,
  payment_status,
  client_latitude,
  client_longitude,
  mechanic_latitude,
  mechanic_longitude,
  created_at
FROM public.bookings 
ORDER BY created_at DESC 
LIMIT 5;

-- STEP 7: Success message
SELECT '=== BOOKINGS TABLE UPDATE COMPLETED ===' as info;
SELECT 'All new columns have been added successfully!' as message;
SELECT 'You can now store mechanic location, client location, service price, motorcycle model, phone number, and payment method in bookings.' as details;
