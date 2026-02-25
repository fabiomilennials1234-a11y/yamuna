# Padronização de Design - Yamuna Dashboard

## 🎨 Guia de Estilo Universal

### 1. **Typography**

#### Headers de Página
```tsx
<h2 className="scroll-m-20 text-3xl font-semibold tracking-tight first:mt-0">
    Nome da Página
</h2>
```

#### Section Titles
```tsx
<h3 className="text-sm font-medium tracking-wider uppercase text-muted-foreground mb-4">
    TÍTULO DA SEÇÃO
</h3>
```

### 2. **Layout Padrão**

Todas as páginas devem seguir esta estrutura:

```tsx
export default function Page() {
    return (
        <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
            {/* Header */}
            <div className="flex items-center justify-between py-6">
                <h2 className="scroll-m-20 text-3xl font-semibold tracking-tight first:mt-0">
                    Nome da Página
                </h2>
                <div className="flex items-center space-x-2">
                    <DateRangeFilter />
                </div>
            </div>

            {/* Content */}
            <main className="space-y-6 overflow-y-auto w-full">
                {/* Seu conteúdo aqui */}
            </main>
        </div>
    );
}
```

### 3. **Componentes**

#### KPI Cards
**✅ USAR:**
```tsx
import { Card } from "@/components/ui/card";
import { StandardKPICard } from "@/components/ui/StandardKPICard";

<StandardKPICard 
    label="Receita Total"
    value={282490.46}
    format="currency"
    prefix="R$"
/>
```

**❌ NÃO USAR:**
- `GlassCard` (componente antigo)
- Divs customizadas com `bg-[#0B0B1E]`
- Divs com glassmorphism manual

#### Tabelas
**✅ USAR:**
```tsx
<Card className="overflow-hidden">
    <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Título da Tabela</CardTitle>
        <span className="text-xs bg-muted px-2 py-1 rounded">Info</span>
    </CardHeader>
    <CardContent className="p-0">
        <div className="overflow-x-auto">
            <table className="w-full">
                {/* tabela */}
            </table>
        </div>
    </CardContent>
</Card>
```

**❌ NÃO USAR:**
- Divs com `bg-[#0B0B1E]/60`
- Bordas `border-white/10`
- Gradientes posicionados absolutamente

### 4. **Cores e Backgrounds**

**✅ PERMITIDO:**
- `bg-background` (preto/cor do tema)
- `bg-card` (cor de card do tema)
- `bg-muted` (cor neutra suave)
- `bg-primary` (cor de acento)
- `text-foreground`, `text-muted-foreground`

**❌ PROIBIDO:**
- `bg-[#0B0B1E]` (azul escuro custom)
- `bg-slate-900` (cinza manual)
- `bg-blue-950` (qualquer cor manual)
- Gradientes customizados com absolute positioning

### 5. **Spacing**

- **Header padding vertical**: `py-6`
- **Main content gap**: `gap-8` ou `gap-6` para seções
- **Card padding**: Usar padding do Card component (`p-6` é aplicado automaticamente)
- **Grid gaps**: `gap-4` para grids de cards

### 6. **Loading States**

**✅ USAR:**
```tsx
import { LoadingScreen, LoadingSpinner } from "@/components/ui/loading-spinner";

<LoadingScreen /> // Para páginas inteiras
<LoadingSpinner size="lg" /> // Para componentes
```

**❌ NÃO USAR:**
- Divs customizadas com `bg-[#0B0B1E]` e `animate-pulse`

### 7. **Filtros e Selects**

**✅ USAR ShadCN Select:**
```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

<Select value={filter} onValueChange={setFilter}>
    <SelectTrigger className="w-[180px]">
        <SelectValue />
    </SelectTrigger>
    <SelectContent>
        <SelectItem value="all">Todos</SelectItem>
    </SelectContent>
</Select>
```

**❌ NÃO USAR:**
- `<select>` HTML nativo com classes customizadas
- Backgrounds azuis em selects

## ⚠️ Páginas que PRECISAM ser atualizadas:

- [ ] `/finance` - Substituir GlassCard por StandardKPICard
- [ ] `/funnel` - Substituir GlassCard por Card padrão
- [ ] `/rfm` - Remover bg-[#0B0B1E] e usar Card components
- [ ] `/meta-ads` (MetaAdsClient) - Limpar estilos customizados da tabela
- [ ] `/produtos` - Verificar consistência
- [ ] `/publico-alvo` - Verificar consistência
- [ ] `/origem-midia` - Verificar consistência

## 📋 Checklist de Padronização

Para cada página, verificar:

1. ✅ Header usa `scroll-m-20 text-3xl font-semibold tracking-tight`
2. ✅ Layout segue estrutura padrão (flex flex-1 flex-col gap-8 p-4 pt-0)
3. ✅ KPI cards usam `StandardKPICard` ou `Card` component
4. ✅ Tabelas usam `Card` + `CardHeader` + `CardContent`
5. ✅ Sem `bg-[#0B0B1E]`, `bg-slate-900`, ou cores customizadas
6. ✅ Loading states usam `LoadingSpinner` component
7. ✅ Filtros usam ShadCN `Select` component
8. ✅ Spacing consistente (py-6 header, gap-8 main)
