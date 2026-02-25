"use client";

import { MonthlyGoalEditor } from "./MonthlyGoalEditor";

interface Goal {
    month: string;
    revenue?: number;
    transactions?: number;
    investment?: number;
}

interface GoalEditorWrapperProps {
    initialGoal: Goal | null;
}

export function GoalEditorWrapper({ initialGoal }: GoalEditorWrapperProps) {
    const handleSave = (goal: Goal) => {
        console.log('Meta salva:', goal);
        // TODO: Implement server action to save goal
    };

    return <MonthlyGoalEditor goal={initialGoal} onSave={handleSave} />;
}
