"use server";

import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * File-based goals storage using .cache directory
 * Persists across server restarts
 */

interface MonthlyGoal {
    month: number;
    year: number;
    revenue_goal: number;
    transactions_goal: number;
    ad_budget_goal: number;
    created_at?: string;
    updated_at?: string;
}

// Use the same .cache directory as the cache service
const CACHE_DIR = path.join(process.cwd(), '.cache', 'goals');

// Ensure cache directory exists
async function ensureCacheDir() {
    try {
        await fs.mkdir(CACHE_DIR, { recursive: true });
    } catch (error) {
        console.error('[Goals] Error creating cache dir:', error);
    }
}

function getGoalKey(month: number, year: number): string {
    return `${year}-${month.toString().padStart(2, '0')}`;
}

function getGoalFilePath(month: number, year: number): string {
    const key = getGoalKey(month, year);
    return path.join(CACHE_DIR, `goal_${key}.json`);
}

export async function saveMonthlyGoalLocal(
    month: number,
    year: number,
    revenueGoal: number,
    transactionsGoal: number,
    adBudgetGoal: number
) {
    console.log(`[Goals Local] Saving: ${month}/${year} - Revenue=${revenueGoal}, Trans=${transactionsGoal}, Budget=${adBudgetGoal}`);

    await ensureCacheDir();

    const goal: MonthlyGoal = {
        month,
        year,
        revenue_goal: revenueGoal,
        transactions_goal: transactionsGoal,
        ad_budget_goal: adBudgetGoal,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString()
    };

    try {
        const filePath = getGoalFilePath(month, year);

        // Check if file already exists to preserve created_at
        try {
            const existingData = await fs.readFile(filePath, 'utf-8');
            const existingGoal: MonthlyGoal = JSON.parse(existingData);
            goal.created_at = existingGoal.created_at || goal.created_at;
        } catch (err) {
            // File doesn't exist, use new created_at
        }

        await fs.writeFile(filePath, JSON.stringify(goal, null, 2), 'utf-8');
        console.log(`[Goals Local] ✅ Saved to file: ${filePath}`);

        return { success: true, data: goal };
    } catch (error) {
        console.error('[Goals Local] ❌ Error saving to file:', error);
        return { success: false, error: 'Failed to save goal' };
    }
}

export async function getMonthlyGoalLocal(month: number, year: number): Promise<MonthlyGoal | null> {
    try {
        const filePath = getGoalFilePath(month, year);
        const data = await fs.readFile(filePath, 'utf-8');
        const goal: MonthlyGoal = JSON.parse(data);

        console.log(`[Goals Local] ✅ Found goal for ${month}/${year}:`, {
            revenue_goal: goal.revenue_goal,
            transactions_goal: goal.transactions_goal,
            ad_budget_goal: goal.ad_budget_goal
        });

        return goal;
    } catch (error) {
        console.log(`[Goals Local] ℹ️ No goal found for ${month}/${year}`);
        return null;
    }
}

export async function getCurrentMonthGoalLocal() {
    const now = new Date();
    return getMonthlyGoalLocal(now.getMonth() + 1, now.getFullYear());
}

export async function getPreviousMonthGoalLocal() {
    const now = new Date();
    const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    return getMonthlyGoalLocal(prevMonth, prevYear);
}

/**
 * List all saved goals (useful for debugging)
 */
export async function listAllGoals(): Promise<MonthlyGoal[]> {
    try {
        await ensureCacheDir();
        const files = await fs.readdir(CACHE_DIR);
        const goalFiles = files.filter(f => f.startsWith('goal_') && f.endsWith('.json'));

        const goals: MonthlyGoal[] = [];
        for (const file of goalFiles) {
            try {
                const data = await fs.readFile(path.join(CACHE_DIR, file), 'utf-8');
                goals.push(JSON.parse(data));
            } catch (err) {
                console.error(`[Goals] Error reading ${file}:`, err);
            }
        }

        return goals.sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return b.month - a.month;
        });
    } catch (error) {
        console.error('[Goals] Error listing goals:', error);
        return [];
    }
}
