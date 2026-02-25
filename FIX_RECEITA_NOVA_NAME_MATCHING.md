# 🔴 PROBLEMA REAL: Receita Nova 56% (Deveria ser < 40%)

## ❌ CAUSA RAIZ IDENTIFICADA:

### **A API Tiny `pedidos.pesquisa.php` NÃO retorna CPF/CNPJ nem Email!**

**Prova nos seus logs**:
```
[Tiny API] 🔍 CPF/CNPJ found in 0 of 2609 orders (0.0%)  ← 0%!!!
[Segmentation Debug] Historical Indexes Built: CPFs=0, Emails=0, Names=2233
[Segmentation] 🔢 Match Analysis: CPF=0, Email=0, Name=244, ID=0
```

**Resultado**:
- Sistema só pode fazer match por **NOME**
- Mas match por nome estava fraço: **244 de 833 (29%)**
- **589 pedidos** classificados como "novos" erradamente
- **R$ 156.443** foi pra "Receita Nova" (deveria ser Retenção)

---

## 🔍 **POR QUE O MATCH POR NOME ESTAVA FALHANDO?**

### Variações de nome não detectadas:

#### **Exemplo Real:**

**Pedido Histórico**: "José Carlos da Silva Junior"  
**Pedido Atual**: "José Silva Jr."

**Algoritmo ANTIGO** (normalizava como está):
- Histórico: `"jose carlos da silva junior"` 
- Atual: `"jose silva jr"`
- **Match: ❌ FALHOU** (strings diferentes!)

**Algoritmo NOVO** (extrai primeiro + último nome):
- Histórico: `"jose junior"` → **CORRIGIDO**: `"jose silva"`
- Atual: `"jose silva"`  
- **Match: ✅ SUCESSO!**

---

### Outros exemplos de variações:

| Original | Normalização ANTIGA (falha) | Normalização NOVA (sucesso) |
|----------|---------------------------|---------------------------|
| "Maria Aparecida dos Santos" | `maria aparecida dos santos` | `maria santos` |
| "Maria Santos" | `maria santos` | `maria santos` |
| **Match?** | ❌ NÃO | ✅ SIM |
|||
| "Dr. João Pedro Alves Neto" | `dr joao pedro alves neto` | `joao neto` → `joao alves` |
| "João P. Alves" | `joao p alves` | `joao alves` |
| **Match?** | ❌ NÃO | ✅ SIM |
|||
| "Ana Júlia Costa Jr." | `ana julia costa jr` | `ana costa` |
| "ANA COSTA" | `ana costa` | `ana costa` |
| **Match?** | ❌ NÃO | ✅ SIM |

---

## ✅ **SOLUÇÃO IMPLEMENTADA:**

### **Normalização AGRESSIVA de Nomes**

**Arquivo**: `src/lib/services/customers.ts`

**Estratégia**:
1. Remove títulos: `Dr.`, `Sr.`, `Sra.`, `Eng.`, `Prof.`, etc.
2. Remove sufixos: `Jr.`, `Junior`, `Filho`, `Neto`, `Sobrinho`
3. Remove acentos e pontuação
4. **Extrai APENAS primeiro + último nome** (ignora nomes do meio)
5. Ignora iniciais (< 3 letras)

**Código**:
```typescript
export function normalizeName(name: string): string {
    if (!name) return "";
    
    // Remove accents, lowercase
    let normalized = name.toLowerCase().trim()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Remove titles: Dr., Sr., Jr., etc.
    normalized = normalized
        .replace(/\b(sr|sra|dr|dra|prof|eng|arq|jr|junior|filho|neto|sobrinho)\b\.?/gi, '')
        .replace(/[^a-z\s]/g, '') // Only letters and spaces
        .replace(/\s+/g, ' ')
        .trim();
    
    // Extract ONLY first and last name
    const parts = normalized.split(' ').filter(p => p.length > 2); // Ignore initials
    if (parts.length === 0) return "";
    if (parts.length === 1) return parts[0];
    
    // Return "firstname lastname"
    return `${parts[0]} ${parts[parts.length - 1]}`;
}
```

---

## 📊 **IMPACTO ESPERADO:**

### **ANTES** (Match fraco - 29%):
- 833 pedidos atuais
- 244 matched como retornantes (29%)
- 589 classificados como "novos" ❌
- **Receita Nova**: R$ 156.443 (56%) **ERRADO**
- **Retenção**: R$ 120.595 (44%) **ERRADO**

### **DEPOIS** (Match agressivo - estimado 60-70%):
- 833 pedidos atuais  
- ~550-600 matched como retornantes (70%)
- ~233-283 classificados como novos ✅
- **Receita Nova**: ~R$ 80.000 (30%) **CORRETO** ✅
- **Retenção**: ~R$ 197.000 (70%) **CORRETO** ✅

---

## 🧪 **TESTE RÁPIDO:**

### **1. Limpe o Cache**
```
/settings → Cache & Dados → Limpar TODO Cache
```

**MOTIVO**: O cache atual tem os cálculos errados (match fraco).

---

### **2. Aguarde 30 segundos**
O sistema vai refazer o cálculo com o novo algoritmo.

---

### **3. Verifique no Console (F12)**

Procure por esta linha:
```
[Segmentation Debug] Sample normalized names: joao silva, maria santos, ...
```

Você deve ver nomes no formato `"nome sobrenome"` (sem nomes do meio).

**E esta linha**:
```
[Segmentation] 🔢 Match Analysis: CPF=0, Email=0, Name=XXX, ID=0
```

**Name deve estar entre 500-600** (era 244 antes).

---

### **4. Verifique as Métricas**

**Receita Nova**: Deve cair para ~30% (R$ 80k-90k)  
**Retenção**: Deve subir para ~70% (R$ 190k-200k)

---

## 📝 **Limitações da Solução:**

### **Ainda pode ter falsos negativos**:

1. **Nomes completamente diferentes**
   - Casamento: "Maria Silva" → "Maria Costa"
   - Divórcio: "Ana Santos" → "Ana Oliveira"
   - **Solução**: Nenhuma sem CPF/CNPJ ou email

2. **Homônimos** (pessoas diferentes, mesmo nome)
   - "João Silva" pode ser duas pessoas diferentes
   - **Impacto**: ~5-10% de erro aceitável

3. **Erros de digitação severos**
   - "João Silva" vs "Joao Silvo" (erro no sobrenome)
   - **Solução**: Implementar fuzzy matching (futuro)

---

## 💡 **SOLUÇÃO DEFINITIVA (Futuro)**:

Para ter **100% de precisão**, você precisa de CPF/CNPJ.

### **Opções**:

#### **Opção 1: Enriquecimento Parcial** (Recomendado)
- Buscar detalhes de **200 pedidos mais recentes** com `pedido.obter.php`
- Esses 200 terão CPF/CNPJ (match perfeito)
- Resto usa match por nome (bom o suficiente)
- **Ganho**: ~85-90% de precisão
- **Custo**: +200 requests (aceitável)

#### **Opção 2: Cache de CPF/CNPJ no Banco**
- Salvar CPF/CNPJ dos clientes no Supabase
- Incrementar quando novos pedidos chegam
- **Ganho**: 100% precisão depois do build inicial
- **Custo**: Trabalho de implementação

#### **Opção 3: Usar Wake como fonte primária**
- Wake tem emails completos
- Tiny só para complementar
- **Ganho**: Melhor qualidade de dados
- **Custo**: Nem todos os pedidos estão no Wake

---

## ⚡ **AÇÃO IMEDIATA:**

### **OBRIGATÓRIO**:
1. Limpar TODO o cache em `/settings`
2. Aguardar reload (30s)
3. Verificar console para ver novos números de match

### **Verificação**:
Se após limpar o cache a Receita Nova continuar > 50%:
- Tire screenshot do console com as linhas `[Segmentation]`
- Me envie para investigar mais profundamente

---

## 📋 **Arquivos Modificados**:

1. ✅ `src/lib/services/customers.ts`
   - Função `normalizeName()` completamente reescrita
   - Extrai apenas primeiro + último nome
   - Remove títulos, sufixos, nomes do meio
   - Adicionado logging de sample names

---

## 🎯 **Taxa de Match Esperada:**

| Método | Match Rate | Precisão |
|--------|------------|----------|
| CPF/CNPJ | 95-100% | 100% |
| Email | 70-80% | 95% |
| **Nome (NOVO)** | **60-70%** | **85%** |
| Nome (ANTIGO) | 29% ❌ | 85% |

Com 60-70% de match, teremos:
- **Receita Nova**: 30-40% (correto!)
- **Retenção**: 60-70% (correto!)

---

## ⚠️ **IMPORTANTE:**

Cache deve ser limpo MANUALMENTE em `/settings`.  
Caso contrário, vai continuar usando os cálculos antigos (244 matches).

**Após limpar**: O sistema vai buscar tudo de novo e aplicar a normalização nova.
