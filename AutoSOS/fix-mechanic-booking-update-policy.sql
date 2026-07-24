-- Fix mechanic booking update policy
-- This script ensures mechanics can update bookings they are assigned to

-- Drop existing policies if they exist
DROP POLICY IF EXISTS bookings_update_mechanic ON public.bookings;

-- Create policy for mechanics to update their assigned bookings
CREATE POLICY bookings_update_mechanic
ON public.bookings FOR UPDATE
TO authenticated
USING (
  -- Mechanic can update bookings where they are assigned
  mechanic_id = auth.uid() OR
  -- Or if they are the client
  client_id = auth.uid()
)
WITH CHECK (
  -- Mechanic can update bookings where they are assigned
  mechanic_id = auth.uid() OR
  -- Or if they are the client
  client_id = auth.uid()
);

-- Also ensure mechanics can update their own profile availability
DROP POLICY IF EXISTS profiles_update_mechanic_availability ON public.profiles;

CREATE POLICY profiles_update_mechanic_availability
ON public.profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Verify the policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename IN ('bookings', 'profiles')
ORDER BY tablename, policyname;
