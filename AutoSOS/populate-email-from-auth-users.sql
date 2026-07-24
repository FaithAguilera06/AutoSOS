-- Simple query to populate email field in profiles table from auth.users
-- Run this in Supabase SQL Editor to fill existing profiles with email data

-- Update profiles table with email from auth.users where email is null or empty
UPDATE public.profiles 
SET email = auth_users.email
FROM auth.users AS auth_users
WHERE public.profiles.user_id = auth_users.id 
  AND (public.profiles.email IS NULL OR public.profiles.email = '');

-- Verify the update worked
SELECT 
  p.user_id,
  p.full_name,
  p.email,
  p.role,
  au.email as auth_email
FROM public.profiles p
LEFT JOIN auth.users au ON p.user_id = au.id
WHERE p.role = 'client'
ORDER BY p.created_at DESC
LIMIT 10;
