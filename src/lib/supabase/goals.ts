import { createClient } from "./server";

export interface MonthlyGoal {
    id: string;
    month: number;
    year: number;
    revenue_goal: number;
    transactions_goal: number;
    ad_budget_goal?: number;
    user_id?: string;
    created_at: string;
    updated_at: string;
}

/**
 * Get user ID from current session
 */
async function getCurrentUserId(): Promise<string | null> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        return user?.id || null;
    } catch (error) {
        console.warn('[Goals] Could not get current user:', error);
        return null;
    }
}

export async function getMonthlyGoal(month: number, year: number): Promise<MonthlyGoal | null> {
    const supabase = await createClient();
    const userId = await getCurrentUserId();

    let query = supabase
        .from('monthly_goals')
        .select('*')
        .eq('month', month)
        .eq('year', year);

    // Add user filter if we have a user ID
    if (userId) {
        query = query.eq('user_id', userId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
        if (error.code !== 'PGRST116' && !error.message.includes('not found')) {
            console.warn(`[Goals] Warning fetching goal for ${month}/${year}:`, error.message);
        }
        return null;
    }

    return data;
}

export async function getCurrentMonthGoal(): Promise<MonthlyGoal | null> {
    const now = new Date();
    return getMonthlyGoal(now.getMonth() + 1, now.getFullYear());
}

export async function getPreviousMonthGoal(): Promise<MonthlyGoal | null> {
    const now = new Date();
    const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    return getMonthlyGoal(prevMonth, prevYear);
}

export async function setMonthlyGoal(
    month: number,
    year: number,
    revenueGoal: number,
    transactionsGoal: number,
    adBudgetGoal: number = 0
): Promise<MonthlyGoal | null> {
    try {
        const supabase = await createClient();
        const userId = await getCurrentUserId();

        if (!userId) {
            throw new Error('Usuário não autenticado. Faça login novamente.');
        }

        console.log(`[Goals] 💾 Saving goal: ${month}/${year} for user ${userId.substring(0, 8)}...`);
        console.log(`[Goals] 📊 Values: Revenue=R$ ${revenueGoal}, Trans=${transactionsGoal}, AdBudget=R$ ${adBudgetGoal}`);

        // Check if goal already exists for this user
        const { data: existing, error: selectError } = await supabase
            .from('monthly_goals')
            .select('id')
            .eq('month', month)
            .eq('year', year)
            .eq('user_id', userId)
            .maybeSingle();

        if (selectError && selectError.code !== 'PGRST116' && !selectError.message.includes('not found')) {
            console.error(`[Goals] ❌ Select error:`, selectError);
            throw new Error(`Erro ao verificar meta existente: ${selectError.message}`);
        }

        let result;
        if (existing?.id) {
            // Update existing goal
            console.log(`[Goals] 📝 Updating existing goal ID: ${existing.id}`);
            result = await supabase
                .from('monthly_goals')
                .update({
                    revenue_goal: revenueGoal,
                    transactions_goal: transactionsGoal,
                    ad_budget_goal: adBudgetGoal,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
                .select()
                .single();
        } else {
            // Insert new goal
            console.log(`[Goals] ➕ Inserting new goal for user ${userId.substring(0, 8)}...`);
            result = await supabase
                .from('monthly_goals')
                .insert({
                    month,
                    year,
                    revenue_goal: revenueGoal,
                    transactions_goal: transactionsGoal,
                    ad_budget_goal: adBudgetGoal,
                    user_id: userId
                })
                .select()
                .single();
        }

        if (result.error) {
            console.error(`[Goals] ❌ Save error:`, result.error);

            // Check for specific error types
            if (result.error.message.includes('violates row-level security')) {
                throw new Error('Erro de permissão. Verifique se você tem acesso para salvar metas.');
            }
            if (result.error.message.includes('relation') && result.error.message.includes('does not exist')) {
                throw new Error('Tabela de metas não encontrada. Execute a migração no Supabase.');
            }

            throw new Error(`Erro ao salvar: ${result.error.message}`);
        }

        console.log(`[Goals] ✅ Saved successfully!`);
        return result.data;
    } catch (error: any) {
        console.error(`[Goals] ❌ Exception:`, error);
        throw error;
    }
}

export async function getAllGoals(): Promise<MonthlyGoal[]> {
    const supabase = await createClient();
    const userId = await getCurrentUserId();

    let query = supabase
        .from('monthly_goals')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .limit(12);

    if (userId) {
        query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
        console.warn('[Goals] Warning fetching all goals:', error.message);
        return [];
    }

    return data || [];
}

