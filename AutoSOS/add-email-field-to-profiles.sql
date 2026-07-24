-- Add email field to profiles table
-- This script adds an email field to store user email addresses from signup

-- Add email column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email text;

-- Add index for email field (optional, for performance)
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);

-- Update the trigger function to handle email field from signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, phone, role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name',''),
    COALESCE(new.email, ''), -- Get email from auth.users
    COALESCE(new.raw_user_meta_data->>'phone',''),
    'client'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END$$;

-- Add RLS policy for email field (users can update their own email)
DROP POLICY IF EXISTS profiles_update_email ON public.profiles;
CREATE POLICY profiles_update_email
ON public.profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Add policy for reading email addresses (authenticated users can read emails)
DROP POLICY IF EXISTS profiles_select_email ON public.profiles;
CREATE POLICY profiles_select_email
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;
