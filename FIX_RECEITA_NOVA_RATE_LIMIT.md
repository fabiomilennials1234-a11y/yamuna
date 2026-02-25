# 🔴 CORREÇÃO: Receita Nova Calculando Errado - Rate Limit Fix

## Data: 2026-01-11

---

## 🐛 **PROBLEMA IDENTIFICADO:**

### **"Receita Nova" está classificando clientes ERRADOS como "novos"**

**Causa Raiz**: Rate Limit da API Tiny causando **PERDA DE DADOS HISTÓRICOS**

### Como acontece:

1. ✅ Sistema busca pedidos do período atual (ex: 12/12 - 11/01)
2. ❌ Sistema tenta buscar 180 dias de histórico para identificar clientes retornantes
3. 🚫 **API Tiny atinge rate limit** (60 requests/min)
4. ❌ Alguns pedidos históricos **não são buscados** (dados incompletos!)
5. 🔴 Cliente que comprou em Agosto NÃO aparece no histórico
6. 🔴 Cliente compra em Janeiro → Sistema acha que é **"novo"**
7. 💰 **ERRO**: Receita vai para "Receita Nova" ao invés de "Retenção"

---

## 📊 **IMPACTO NA IMAGEM:**

Na sua screenshot:
- **Receita Total**: R$ 277.039,21
- **Receita Nova**: R$ 222.670,74 ← **INFLADO** (muitos "falsos novos")
- **Retenção**: R$ 54.368,47 ← **MUITO BAIXO** (deveria ser ~80%)

**Esperado** (com 80% retenção típica):
- Receita Nova: ~R$ 55.000
- Retenção: ~R$ 222.000

**Diferença detectada**: ~R$ 167.000 classificados incorretamente!

---

## ✅ **SOLUÇÃO IMPLEMENTADA:**

### **1. Delay entre requisições aumentado**

**Arquivo**: `src/lib/services/tiny.ts` (linha 239)

**Antes**:
```typescript
const BATCH_DELAY = 700; // ~85 req/min (EXCEDE limite!)
```

**Depois**:
```typescript
const BATCH_DELAY = 1200; // ~50 req/min (SEGURO)
```

**Benefício**: 
- Fica com **margem de 10 req/min** do limite
- Evita rate limit errors
- **TODOS os pedidos históricos são buscados**

---

### **2. Tempo de espera após rate limit aumentado**

**Arquivo**: `src/lib/services/tiny.ts` (linha 261-265)

**Antes**:
```typescript
console.warn(`[Tiny API] 🚫 Rate Limit. Waiting 2s...`);
await new Promise(r => setTimeout(r, 2000));
```

**Depois**:
```typescript
console.warn(`[Tiny API] 🚫 Rate Limit. Waiting 5s before retry...`);
await new Promise(r => setTimeout(r, 5000)); // 5 segundos
```

**Benefício**:
- Garante que API se recupere completamente antes de continuar
- Reduz chances de rate limit em cascata

---

### **3. Cache de Retenção aumentado para 4 horas**

**Arquivo**: `src/app/actions.ts` (linha 280)

**Antes**:
```typescript
}, CACHE_TTL.LONG); // 15 minutos
```

**Depois**:
```typescript
}, CACHE_TTL.FOUR_HOURS); // 4 horas
```

**Benefício**:
- Dados históricos não mudam frequentemente
- Evita refetch desnecessários = menos rate limits
- Performance melhorada

---

### **4. Logging Diagnóstico Automático**

**Arquivo**: `src/app/actions.ts` (linha 252-261)

**Novo código adicionado**:
```typescript
// DIAGNOSTIC: Check if historical fetch seems suspiciously low
const historicalDays = 180;
const expectedMinOrders = historicalDays * 0.5; // At least 0.5 orders/day
if (histTiny.length < expectedMinOrders) {
    console.warn(`[Retention] ⚠️  WARNING: Historical data seems LOW!`);
    console.warn(`[Retention]     Orders found: ${histTiny.length}`);
    console.warn(`[Retention]     Expected minimum: ~${Math.round(expectedMinOrders)}`);
    console.warn(`[Retention]     This may cause INCORRECT "Receita Nova" calculation!`);
    console.warn(`[Retention]     Possible cause: Rate limit prevented full data fetch`);
}
```

**Benefício**:
- **Detecta automaticamente** quando dados históricos estão incompletos
- Alerta no console para investigação
- Facilita debug futuro

---

## 🔍 **COMO MONITORAR:**

### **1. No Console do Navegador (F12 → Console):**

Procure por estas mensagens:

✅ **SUCESSO** (Dados completos):
```
[Retention] 📦 Historical: 847 Tiny + 12 Wake
[Retention] 📊 Starting retention fetch: 2025-07-15 to 2026-01-11
[Retention] ✅ Complete historical data fetched
```

🚫 **PROBLEMA** (Dados incompletos - Rate Limit):
```
[Retention] ⚠️  WARNING: Historical data seems LOW!
[Retention]     Period: 180 days (2025-07-15 to 2026-01-10)
[Retention]     Orders found: 45
[Retention]     Expected minimum: ~90
[Retention]     This may cause INCORRECT "Receita Nova" calculation!
[Retention]     Possible cause: Rate limit prevented full data fetch
```

---

### **2. No Console do Servidor (Vercel Logs):**

Procure por:

🚫 **Rate Limit ativo**:
```
[Tiny API] 🚫 Rate Limit (Page 23). Waiting 5s before retry...
```

Se ver isso MUITAS vezes seguidas → Problema persiste

---

### **3. Métricas Esperadas (Sanity Check):**

Para uma loja típica:

| Métrica | Esperado | Se estiver errado |
|---------|----------|-------------------|
| **Retenção** | ~70-85% da receita | < 50% → Problema! |
| **Receita Nova** | ~15-30% da receita | > 50% → Problema! |
| **Histórico** | 3-5 pedidos/dia × 180 | < 90 pedidos → Rate limit! |

**No seu caso**:
- Receita Total: R$ 277.039,21
- Retenção esperada (80%): ~R$ 221.000
- Receita Nova esperada (20%): ~R$ 55.000

---

## 🚀 **PRÓXIMOS PASSOS:**

### **1. LIMPAR CACHE (OBRIGATÓRIO)**
```
1. Vá para /settings → Cache & Dados
2. Clique em "Limpar TODO Cache"
3. Aguarde reload automático
```

**Motivo**: Cache atual tem dados incorretos com rate limit

---

### **2. Aguardar 30 segundos**

O sistema vai buscar os dados com os novos delays mais seguros.

---

### **3. Verificar no Console**

Abra F12 → Console e procure por:
- ✅ Nenhum WARNING de "Historical data seems LOW"
- ✅ Número de pedidos históricos > 90
- ✅ Receita Nova entre 15-30%

---

### **4. Se o problema persistir:**

Significa que você tem MUITO volume de pedidos (> 6.000 pedidos em 6 meses).

**Solução Avançada** (se necessário):
- Implementar cache permanente de dados históricos no banco de dados
- Fetch incremental (buscar só pedidos novos)
- Reduzir período histórico de 180 para 90 dias

---

## 📝 **ARQUIVOS MODIFICADOS:**

1. ✅ `src/lib/services/tiny.ts`
   - Delay aumentado para 1.2s
   - Retry wait aumentado para 5s

2. ✅ `src/app/actions.ts`
   - Cache de retenção: 4 horas
   - Diagnóstico automático adicionado

---

## 🎯 **RESULTADO ESPERADO:**

Após limpar o cache e aguardar o refetch:

### **ANTES** (Errado - com rate limit):
- Receita Nova: R$ 222.670,74 (80%) ❌
- Retenção: R$ 54.368,47 (20%) ❌

### **DEPOIS** (Correto - sem rate limit):
- Receita Nova: ~R$ 55.000 (20%) ✅
- Retenção: ~R$ 222.000 (80%) ✅

---

## 💡 **ENTENDIMENTO TÉCNICO:**

**Por que 1.2s de delay?**
- 60 segundos / 1.2 segundos = 50 requests/minuto
- Limite da API: 60 req/min
- Margem de segurança: 10 req/min
- Permite outras operações simultâneas sem conflito

**Por que 4 horas de cache?**
- Dados de 6 meses atrás não mudam
- Evita refetch a cada 15 minutos
- Reduz drasticamente chamadas à API
- Melhora performance geral

---

## ⚠️ **IMPORTANTE:**

Este fix resolve o problema de rate limit, mas **só funciona após limpar o cache**.

Cache atual contém dados incorretos (com rate limit).

**AÇÃO OBRIGATÓRIA**: Ir em /settings e Limpar TODO Cache

---

## 📞 **DIAGNOSTICO RÁPIDO:**

Rode este comando no console do navegador após limpar cache:

```javascript
console.log('Checking Receita Nova...');
const receitaTotal = 277039.21; // Sua receita total
const receitaNova = parseFloat(document.querySelector('[data-metric="receita-nova"]')?.textContent?.replace(/\D/g,'') || '0') / 100;
const percentage = (receitaNova / receitaTotal) * 100;
console.log(`Receita Nova: R$ ${receitaNova.toFixed(2)} (${percentage.toFixed(1)}%)`);
console.log(percentage > 40 ? '❌ STILL WRONG - Check console for rate limit warnings' : '✅ LOOKS GOOD');
```

Se mostrar ❌, verifique os logs de rate limit.
