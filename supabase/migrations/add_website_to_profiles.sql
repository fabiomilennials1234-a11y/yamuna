-- Add website column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS website TEXT;

-- Verify RLS 
-- (Assuming profiles has RLS, we ensure users can update their own profile including website)
-- Usually standard profiles policies allow update where ID = auth.uid()

-- If policy doesn't exist for update:
-- CREATE POLICY "Users can update own profile" ON profiles
--     FOR UPDATE
--     USING (auth.uid() = id);
