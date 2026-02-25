# 🛠️ Guia de Padronização - Tarefas Restantes

## ✅ O que JÁ está CORRETO:
- `/dashboard` (Check-in Loja Virtual) ✅
- `/google-ads` ✅
- `/products` (Curva ABC) ✅
- `/diagnostics` ✅
- `/publico-alvo` ✅
- `/origem-midia` ✅
- `/settings` (Configurações da Conta) ✅

##❌ O que PRECISA Corrigir:

### 1. `/finance` (Indicadores Financeiros) 

**Arquivo**: `src/app/(dashboard)/finance/page.tsx`

**Problema**: Usa componente `GlassCard` antigo (linhas 120, 132)

**Solução**:
Substituir a função `FinanceKpiCard` por:

```tsx
function FinanceKpiCard({ label, value, icon: Icon, format, suffix = "" }: any) {
    return (
        <StandardKPICard
            label={label}
            value={value}
            icon={Icon}
            format={format === 'currency' ? 'decimal' : format}
            prefix={format === 'currency' ? 'R$ ' : ''}
            suffix={suffix}
        />
    );
}
```

E corrigir a linha 110:
```tsx
                        </CardContent>
                    </Card>
```

### 2. `/funnel` (Funil Loja Virtual)

**Arquivo**: `src/app/(dashboard)/funnel/page.tsx`

**Problema**: Usa componente `GlassCard` (linhas 86, 98, 110, 122)

**Solução**:
1. Remover import: `import { GlassCard } from "@/components/ui/GlassCard";`
2. Adicionar import: `import { Card } from "@/components/ui/card";`
3. Substituir TODOS os `<GlassCard>` por `<Card className="p-6">`
4. Substituir `</GlassCard>` por `</Card>`

### 3. `/rfm` (RFM - Clientes)

**Arquivo**: `src/app/(dashboard)/rfm/page.tsx`

**Problemas Múltiplos:**

#### A. Selects customizados (linhas 37, 43, 50, 57)
**Substituir**:
```tsx
<select className="bg-[#0B0B1E]/80 border border-white/10...">
```

**Por**:
```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

<Select>
    <SelectTrigger className="w-[180px]">
        <SelectValue />
    </SelectTrigger>
    <SelectContent>
        <SelectItem value="all">Todos</SelectItem>
    </SelectContent>
</Select>
```

#### B. Summary Cards (linha 68)
**Substituir**:
```tsx
<div className="bg-[#0B0B1E]/60 backdrop-blur-md border border-white/5...">
```

**Por**:
```tsx
<Card className="p-5">
```

#### C. Tabela RFM (linha 110)
**Substituir**:
```tsx
<div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#0B0B1E]/60...">
```

**Por**:
```tsx
<Card className="overflow-hidden">
    <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Segmentação RFM</CardTitle>
    </CardHeader>
    <CardContent className="p-0">
        <div className="overflow-x-auto">
            {/* tabela */}
        </div>
    </CardContent>
</Card>
```

#### D. Legenda RFM (linha 193)
**Substituir**:
```tsx
<div className="bg-[#0B0B1E]/60 border border-white/5...">
```

**Por**:
```tsx
<Card className="p-6">
```

### 4. `/meta-ads/MetaAdsClient.tsx`

**Arquivo**: `src/app/(dashboard)/meta-ads/MetaAdsClient.tsx`

**Problema**: Usa `bg-slate-900/40` no container e filtros customizados

**Solução Já Aplicada**: ✅ Card component já está sendo usado

**Verificar**: Se os selects de filtro estão usando classes customizadas, trocar por ShadCN Select

## 🚀 Ordem de Execução Recomendada:

1. **Finance** (mais simples - apenas trocar função)
2. **Funnel** (buscar e substituir GlassCard por Card)
3. **RFM** (mais complexo - múltiplas substituições)

## 📝 Template de Substituição

### Para KPI Cards:
```tsx
// ANTES
<GlassCard delay={1} className="...">
    <div>...</div>
</GlassCard>

// DEPOIS
<StandardKPICard 
    label="Label"
    value={value}
    format="currency"
    prefix="R$"
/>
```

### Para Cards Informativos:
```tsx
// ANTES
<GlassCard delay={2} className="p-6">
    <h3>Título</h3>
    <p>Conteúdo</p>
</GlassCard>

// DEPOIS
<Card>
    <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-4">Título</h3>
        <p className="text-muted-foreground">Conteúdo</p>
    </CardContent>
</Card>
```

### Para Tabelas:
```tsx
// ANTES
<div className="bg-[#0B0B1E]/60 rounded-xl border border-white/10">
    <div className="p-6 border-b">Título</div>
    <table>...</table>
</div>

// DEPOIS
<Card className="overflow-hidden">
    <CardHeader>
        <CardTitle>Título</CardTitle>
    </CardHeader>
    <CardContent className="p-0">
        <div className="overflow-x-auto">
            <table>...</table>
        </div>
    </CardContent>
</Card>
```

## ⚡ Comandos Úteis para Busca:

```bash
# Encontrar todos os usos de GlassCard
grep -r "GlassCard" src/app/(dashboard)

# Encontrar bg azuis
grep -r "bg-\[#0B0B1E\]" src/app/(dashboard)

# Encontrar bg-slate-900
grep -r "bg-slate-900" src/app/(dashboard)
```

## ✨ Resultado Esperado

Após todas as correções, TODAS as páginas terão:
- ✅ Fundo preto/tema padrão (sem azul)
- ✅ Cards usando componente `Card` do ShadCN
- ✅ Typography consistente (`scroll-m-20 text-3xl font-semibold`)
- ✅ Loading com `LoadingSpinner` component
- ✅ Filtros com ShadCN `Select`
