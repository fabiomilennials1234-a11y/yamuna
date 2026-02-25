-- FIX: Add missing user_id column to existing monthly_goals table
-- Run this in Supabase SQL Editor

-- 1. Add user_id column if it doesn't exist
ALTER TABLE monthly_goals 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_monthly_goals_month_year ON monthly_goals(month, year);
CREATE INDEX IF NOT EXISTS idx_monthly_goals_user ON monthly_goals(user_id);

-- 3. Drop existing RLS policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own goals" ON monthly_goals;
DROP POLICY IF EXISTS "Users can insert own goals" ON monthly_goals;
DROP POLICY IF EXISTS "Users can update own goals" ON monthly_goals;
DROP POLICY IF EXISTS "Users can delete own goals" ON monthly_goals;

-- 4. Enable RLS
ALTER TABLE monthly_goals ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies
CREATE POLICY "Users can view own goals" ON monthly_goals
    FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own goals" ON monthly_goals
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals" ON monthly_goals
    FOR UPDATE
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete own goals" ON monthly_goals
    FOR DELETE
    USING (auth.uid() = user_id OR user_id IS NULL);

-- 6. Create or replace updated_at function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS update_monthly_goals_updated_at ON monthly_goals;

CREATE TRIGGER update_monthly_goals_updated_at
    BEFORE UPDATE ON monthly_goals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 8. Grant permissions
GRANT ALL ON monthly_goals TO authenticated;

-- Done! You can now save goals from the dashboard.
