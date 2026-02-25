-- Create monthly_goals table for storing user-defined goals
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS monthly_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),
    revenue_goal DECIMAL(15, 2) DEFAULT 0,
    transactions_goal INTEGER DEFAULT 0,
    ad_budget_goal DECIMAL(15, 2) DEFAULT 0,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint: one goal per month/year per user
    UNIQUE(month, year, user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_monthly_goals_month_year ON monthly_goals(month, year);
CREATE INDEX IF NOT EXISTS idx_monthly_goals_user ON monthly_goals(user_id);

-- Enable Row Level Security
ALTER TABLE monthly_goals ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own goals
CREATE POLICY "Users can view own goals" ON monthly_goals
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own goals
CREATE POLICY "Users can insert own goals" ON monthly_goals
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own goals
CREATE POLICY "Users can update own goals" ON monthly_goals
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy: Users can delete their own goals
CREATE POLICY "Users can delete own goals" ON monthly_goals
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_monthly_goals_updated_at
    BEFORE UPDATE ON monthly_goals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON monthly_goals TO authenticated;
