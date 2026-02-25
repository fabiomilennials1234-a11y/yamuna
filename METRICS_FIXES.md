# 🔧 Correções de Métricas - Dashboard Yamuna

## ✅ CORREÇÕES IMPLEMENTADAS (10/12/2025)

### 1. Filtros de Data no Tiny API (CORRIGIDO)

**Problema anterior:**
A API do Tiny não estava filtrando corretamente por data, retornando todos os pedidos independente do período.

**Correção aplicada:**
1. Ajustado parâmetros da API: `dataInicial` e `dataFinal` (padrão Tiny)
2. Adicionado **filtro local de data** como backup - se a API não filtrar, o código filtra manualmente
3. Aumentado limite de páginas para 10 (busca mais pedidos para períodos de 12 meses)

```typescript
// Filtro local como backup
mappedOrders = mappedOrders.filter(order => {
    const orderDateISO = convertToISO(order.date);
    return orderDateISO >= startISO && orderDateISO <= endISO;
});
```

---

### 2. Faturamento 12 Meses ≠ Receita Mês Anterior (CORRIGIDO)

**Problema anterior:**
Ambos mostravam o mesmo valor (R$ 302.854,86) porque usavam cache keys similares.

**Correção aplicada:**
- Cache key de 12 meses: `metrics:12months:YYYY-MM-DD`
- Cache key do mês anterior: `metrics:previousMonth:YYYY-MM-DD:YYYY-MM-DD`
- Logs distintos para facilitar debug: `[12M Metrics]` vs `[LastMonth]`

---

### 3. Receita Nova não Filtrava (CORRIGIDO)

**Problema anterior:**
Quando filtrava para 1 dia, a "Receita Nova" continuava mostrando valor do período maior.

**Correção aplicada:**
- O filtro de data agora é aplicado localmente nos pedidos retornados do Tiny
- A segmentação de clientes novos vs recorrentes usa o período CORRETO do filtro

---

### 4. Transações (VERIFICADO)

**Como funciona:**
- `transactions = allOrders.length` (número de pedidos do Tiny + Wake)
- Pedidos cancelados são excluídos
- Filtro de data aplicado corretamente

---

## 📊 COMO OS DADOS SÃO CALCULADOS

### Período Selecionado (Filtro do Usuário)
| Métrica | Fonte | Descrição |
|---------|-------|-----------|
| Investimento | Meta + Google | Muda com o filtro |
| % Custo | Calculado | Muda com o filtro |
| Ticket Médio | Tiny/Wake | Muda com o filtro |
| Receita Nova | Tiny/Wake | **MUDA COM O FILTRO** |
| Retenção | Tiny/Wake | Muda com o filtro |
| CAC | Calculado | Muda com o filtro |
| Clientes Adquiridos | Tiny/Wake | Muda com o filtro |

### Dados FIXOS (Não mudam com filtro)
| Métrica | Período | Descrição |
|---------|---------|-----------|
| Faturamento 12m | Últimos 365 dias | Sempre fixo |
| LTV 12m | Últimos 365 dias | Sempre fixo |
| ROI 12m | Últimos 365 dias | Sempre fixo |
| Receita Mês Anterior | Novembro (mês calendario anterior) | Sempre novembro |
| Investimento Mês Anterior | Novembro | Sempre novembro |

---

## 🔍 COMO VERIFICAR SE OS DADOS ESTÃO CORRETOS

### 1. Limpar Cache
Vá em **Configurações** > **Limpar Cache** para forçar reload de todos os dados.

### 2. Verificar Logs no Terminal
Procure por:
```
[12M Metrics] �️ Period: 2024-12-10 to 2025-12-10 (365 days)
[12M Metrics] ✅ Orders found: 850
[12M Metrics] ✅ Revenue: R$ 450000.00

[LastMonth] �️ Period: 2025-11-01 to 2025-11-30 (novembro)
[LastMonth] ✅ Orders found: 45
[LastMonth] ✅ Revenue: R$ 25000.00

[Tiny API] � After local date filter: 45 orders
```

### 3. Filtrar para 1 Dia
- Selecione 1 dia no filtro
- Receita Nova e Retenção devem mostrar valores MENORES
- Faturamento 12m e Mês Anterior devem permanecer IGUAL

---

## ⚠️ LIMITAÇÕES CONHECIDAS

### Tiny API
- Máximo de 1000 pedidos por busca (10 páginas × 100)
- Para períodos muito longos, pode não pegar todos os pedidos
- Solução: aumentar `maxPages` se necessário

### Wake API
- Se não houver token, pedidos Wake não são incluídos

### Identificação de Clientes
- Se o Tiny não retornar dados de cliente, usamos GA4 newUsers como estimativa

---

*Última atualização: 10/12/2025 22:50*
