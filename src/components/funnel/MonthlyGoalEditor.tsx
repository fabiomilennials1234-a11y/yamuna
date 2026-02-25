"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Target, Edit, Check, X } from "lucide-react";

interface Goal {
    month: string;
    revenue?: number;
    transactions?: number;
    investment?: number;
}

interface MonthlyGoalEditorProps {
    goal: Goal | null;
    onSave: (goal: Goal) => void;
}

export function MonthlyGoalEditor({ goal, onSave }: MonthlyGoalEditorProps) {
    const [isEditing, setIsEditing] = useState(!goal);
    const [formData, setFormData] = useState<Goal>(
        goal || {
            month: new Date().toISOString().slice(0, 7),
            revenue: undefined,
            transactions: undefined,
            investment: undefined,
        }
    );

    const handleSave = () => {
        onSave(formData);
        setIsEditing(false);
    };

    if (!isEditing && goal) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <Target className="text-primary" size={24} />
                            <div>
                                <h3 className="font-bold">
                                    Meta de {new Date(goal.month + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                                </h3>
                                <p className="text-sm text-muted-foreground">Configure suas metas para os próximos meses</p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                            <Edit size={16} className="mr-2" />
                            Editar
                        </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Meta de Receita</p>
                            <p className="text-xl font-bold">
                                {goal.revenue ? `R$ ${goal.revenue.toLocaleString('pt-BR')}` : 'Não definida'}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Meta de Transações</p>
                            <p className="text-xl font-bold">
                                {goal.transactions || 'Não definida'}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Meta de Investimento (Ads)</p>
                            <p className="text-xl font-bold">
                                {goal.investment ? `R$ ${goal.investment.toLocaleString('pt-BR')}` : 'Não definida'}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-2 mb-4">
                    <Target className="text-primary" size={24} />
                    <div>
                        <h3 className="font-bold">Configurar Meta Mensal</h3>
                        <p className="text-sm text-muted-foreground">Defina objetivos claros para acompanhar seu progresso</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Meta de Receita (R$)
                        </label>
                        <Input
                            type="number"
                            placeholder="Ex: 50000"
                            value={formData.revenue || ''}
                            onChange={(e) => setFormData({ ...formData, revenue: parseFloat(e.target.value) || undefined })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Meta de Transações
                        </label>
                        <Input
                            type="number"
                            placeholder="Ex: 150"
                            value={formData.transactions || ''}
                            onChange={(e) => setFormData({ ...formData, transactions: parseInt(e.target.value) || undefined })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Orçamento de Ads (R$)
                        </label>
                        <Input
                            type="number"
                            placeholder="Ex: 15000"
                            value={formData.investment || ''}
                            onChange={(e) => setFormData({ ...formData, investment: parseFloat(e.target.value) || undefined })}
                        />
                    </div>
                </div>

                <div className="flex gap-3 pt-4">
                    <Button
                        onClick={handleSave}
                        disabled={!formData.revenue && !formData.transactions && !formData.investment}
                        className="flex-1"
                    >
                        <Check size={16} className="mr-2" />
                        Salvar Meta
                    </Button>
                    {goal && (
                        <Button variant="outline" onClick={() => setIsEditing(false)}>
                            <X size={16} className="mr-2" />
                            Cancelar
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
