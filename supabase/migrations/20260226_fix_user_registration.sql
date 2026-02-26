-- ============================================================
-- Fix: Auto-create user_profiles on signup + RLS INSERT policy
-- Run on Supabase project: ppnyrufzkicurwtyjtmr
-- ============================================================

-- 1. Trigger function: auto-create user_profiles when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
    'client_viewer'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Also ensure a profiles row exists (for OnboardingModal)
  INSERT INTO public.profiles (id, updated_at)
  VALUES (NEW.id, NOW())
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Add INSERT policy so users can create their own user_profiles row
-- (fallback for cases where trigger didn't fire, e.g. existing users)
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 4. Add UPDATE policy so users can update their own basic info
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 5. Backfill: create user_profiles for any existing auth.users that don't have one
INSERT INTO public.user_profiles (id, full_name, role)
SELECT
  au.id,
  COALESCE(au.raw_user_meta_data ->> 'full_name', au.raw_user_meta_data ->> 'name', ''),
  'client_viewer'
FROM auth.users au
LEFT JOIN public.user_profiles up ON up.id = au.id
WHERE up.id IS NULL
ON CONFLICT (id) DO NOTHING;
