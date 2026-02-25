alter table monthly_goals 
add column if not exists ad_budget_goal numeric default 0;
