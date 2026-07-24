-- Add phone field to profiles table
-- This script adds a phone field to store user contact numbers

-- Add phone column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone text;

-- Add index for phone field (optional, for performance)
CREATE INDEX IF NOT EXISTS profiles_phone_idx ON public.profiles(phone);

-- Update the trigger function to handle phone field
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, phone, role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name',''),
    COALESCE(new.raw_user_meta_data->>'phone',''),
    'client'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END$$;

-- Add RLS policy for phone field (users can update their own phone)
DROP POLICY IF EXISTS profiles_update_phone ON public.profiles;
CREATE POLICY profiles_update_phone
ON public.profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Add policy for reading phone numbers (authenticated users can read phone numbers)
DROP POLICY IF EXISTS profiles_select_phone ON public.profiles;
CREATE POLICY profiles_select_phone
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;
