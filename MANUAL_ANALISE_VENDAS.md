# Guia de Análise de Vendas e Tendências - Yamuna Dashboard

Este documento explica como utilizar as novas funcionalidades de análise de vendas, tendências e sazonalidade implementadas no dashboard.

## 1. Identificar Produtos com Aumento ou Queda de Vendas

Para ver rapidamente quais produtos estão crescendo ou caindo em relação ao mês anterior:

1.  Acesse a página **Produtos** (Menu Lateral > Produtos ou "Curva ABC").
2.  Observe a tabela principal. Foi adicionada uma nova coluna chamada **"Tendência (Mês Ant.)"**.
    *   **Seta Verde** 🟢 + Porcentagem: Indica quanto as vendas **aumentaram** comparado ao mês passado.
    *   **Seta Vermelha** 🔴 + Porcentagem: Indica quanto as vendas **caíram**.
    *   **Traço Cinza**: Vendas estáveis.

**Exemplo:** Se um produto vendeu R$ 10.000 mês passado e R$ 15.000 este mês, aparecerá uma seta verde com **+50%**.

## 2. Análise Detalhada (Curva de Crescimento e Sazonalidade)

Para entender a sazonalidade (ex: vendas no inverno, páscoa, férias) e ver a evolução detalhada de um produto específico:

1.  Na tabela de Produtos, passe o mouse sobre a linha do produto desejado.
2.  Clique no ícone de **Gráfico** 📈 (botão que aparece na coluna "Ações" à direita).
3.  Uma janela lateral se abrirá com a **Análise Detalhada**.

### Funcionalidades da Janela de Análise:

*   **Filtro por Canal**: No topo, você pode alternar entre:
    *   **Todos**: Vendas gerais.
    *   **B2B**: Vendas apenas para empresas (atacado/revenda).
    *   **B2C**: Vendas apenas para consumidor final (site/varejo).
*   **Filtro de Período (Granularidade)**: No cabeçalho do gráfico, alterne entre:
    *   **Mês**: Visão macro mês a mês.
    *   **Semana**: Visão detalhada semana a semana (ideal para ver picos de curto prazo).
*   **Gráfico de 12 Meses**: O gráfico mostra sempre os últimos 12 meses (ou 52 semanas).
    *   A área **colorida sólida** representa as vendas realizadas (Histórico).
    *   A área **tracejada/transparente** (se houver) representa a previsão de vendas futuras baseada no histórico.

Isso permite responder perguntas como: *"Este produto vende mais em Dezembro?"* ou *"Como foi a performance do Ghee no B2B nas últimas semanas?"*.

## 3. Gráfico Geral no Dashboard

Na tela inicial (Dashboard Principal), o gráfico **"Evolução de Vendas por Produto"** também foi atualizado com esses super poderes:

1.  Selecione um **Produto** específico na lista.
2.  Escolha o **Canal** (B2B/B2C/Todos).
3.  Escolha o **Período** (Mensal/Semanal).

O gráfico atualizará instantaneamente com o novo design Premium, mostrando a curva de vendas e receita para o recorte selecionado.
