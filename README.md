# 🍃 EcoMonitor — MVP v1.0

Sistema web de monitoramento de resíduos sólidos desenvolvido como MVP para instituições de ensino. Permite registrar, visualizar e exportar dados de pesagens de resíduos com foco em sustentabilidade e na ODS 13 da ONU.

---

## 📋 Funcionalidades

- **Dashboard** — métricas de total, recicláveis, não recicláveis e média diária com gráficos interativos
- **Nova Pesagem** — formulário para registrar data, local, tipo de resíduo, peso e destinação
- **Histórico** — tabela com busca e filtros por tipo de resíduo e local, com opção de exclusão
- **Locais** — cadastro e visualização dos pontos de coleta com totais acumulados
- **Relatórios** — exportação de todos os registros em formato CSV

---

## 🗂️ Estrutura do Projeto

```
ecomonitor_mvp/
├── index.html   # Estrutura HTML da aplicação (todas as seções/páginas)
├── style.css    # Estilos da interface
└── app.js       # Toda a lógica da aplicação (dados, gráficos, eventos)
```

---

## 🚀 Como Rodar

O projeto é 100% front-end estático, sem dependências ou build necessário.

**Opção 1 — Abrir direto no navegador:**
1. Clone ou baixe o repositório
2. Abra o arquivo `index.html` no navegador

**Opção 2 — VS Code com Live Server:**
1. Instale a extensão [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)
2. Clique com botão direito em `index.html` → **Open with Live Server**

**Opção 3 — VS Code com F5 (launch.json configurado):**
1. Abra a pasta no VS Code
2. Pressione `F5` — o Chrome abrirá automaticamente

---

## 🧱 Arquitetura

A aplicação é uma **SPA (Single Page Application)** sem framework, com navegação controlada pela função `navigate()` em `app.js`.

### Persistência de dados
Atualmente os dados são salvos no **localStorage** do navegador:

| Chave | Conteúdo |
|---|---|
| `ecomonitor_data_v1` | Array de pesagens |
| `ecomonitor_locations_v1` | Array de locais de coleta |

### Tipos de resíduo suportados
`Orgânico` · `Plástico` · `Papel` · `Metal` · `Vidro` · `Rejeitos`

### Destinações suportadas
`Reciclagem` · `Compostagem` · `Reutilização` · `Aterro / rejeito` · `Outro`

---

## 📊 Gráficos

| Gráfico | Função em `app.js` | Descrição |
|---|---|---|
| Barras por categoria | `renderBars()` | Peso acumulado por tipo de resíduo |
| Rosca (donut) | `renderDonut()` | Composição percentual dos resíduos |
| Linha de tendência | `renderTrend()` | Evolução semanal das pesagens |
| Barras por local | `renderLocationBars()` | Total acumulado por ponto de coleta |

---

## 📁 Exportação CSV

O botão **Exportar CSV** na seção Relatórios gera um arquivo com as colunas:

```
id | data | local | tipo_residuo | peso_kg | destinacao | observacao
```

- Separador: `;` (compatível com Excel pt-BR)
- Encoding: UTF-8
- Para personalizar a exportação, edite a função `exportCsv()` em `app.js`

---

## 🔮 Próximos Passos (Roadmap)

### Integração com Supabase
O código já está comentado com instruções de migração. As principais trocas serão:

| Hoje | Com Supabase |
|---|---|
| `localStorage` | Tabelas `pesagens` e `locais` |
| `saveData()` | `supabase.from("pesagens").insert()` |
| `data.filter()` | Queries com `.eq()`, `.gte()`, `.ilike()` |
| ID via `Date.now()` | UUID gerado automaticamente |
| Nome hardcoded | `supabase.auth.getUser()` |

**Tabelas necessárias no Supabase:**

```sql
-- Tabela de locais de coleta
create table locais (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null
);

-- Tabela de pesagens
create table pesagens (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  location_id uuid references locais(id),
  type text not null,
  weight numeric not null,
  destination text not null,
  notes text
);
```

### Outras melhorias planejadas
- [ ] Autenticação de usuários
- [ ] Visão mensal no gráfico de tendência
- [ ] Modal de confirmação no lugar do `confirm()` nativo
- [ ] Filtros na exportação CSV (período e local)
- [ ] Suporte a múltiplas instituições

---

## 🌎 Contexto

Projeto desenvolvido com foco na **ODS 13 — Ação contra a Mudança Global do Clima**, incentivando o monitoramento e a redução de resíduos em instituições de ensino.

---

## 🛠️ Tecnologias

- HTML5
- CSS3
- JavaScript (Vanilla ES6+)
- Google Fonts (Inter)
- localStorage API
