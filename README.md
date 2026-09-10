# 🍃 EcoMonitor

Sistema web para **registro, monitoramento e análise da geração de resíduos sólidos**, desenvolvido com foco em instituições de ensino e ambientes que desejam acompanhar seus resíduos, pontos de coleta e destinação.

O EcoMonitor transforma registros de pesagens em **indicadores, gráficos, insights e relatórios**, facilitando o acompanhamento da geração de resíduos e apoiando ações de sustentabilidade.

---

## 📊 Visão geral

O sistema permite registrar cada pesagem de resíduos informando:

* 📅 Data
* 📍 Local de coleta
* ♻️ Tipo de resíduo
* ⚖️ Peso em quilogramas
* 🌱 Destinação
* 📝 Observações

Os dados são armazenados no **Supabase** e utilizados pelo dashboard para gerar indicadores e visualizações.

---

## ✨ Funcionalidades

### 📈 Dashboard

O dashboard apresenta uma visão geral dos dados registrados, incluindo:

* Total de resíduos gerados
* Total destinado a reciclagem, compostagem ou reutilização
* Total de resíduos não recicláveis
* Média diária de geração
* Geração por categoria de resíduo
* Composição percentual dos resíduos
* Evolução das pesagens ao longo das semanas
* Geração por local de coleta
* Últimas pesagens registradas
* Insights e recomendações automáticas

O dashboard também permite filtrar os dados por **período** e **local**.

---

### ⚖️ Nova pesagem

Permite registrar uma nova pesagem de resíduos.

Campos disponíveis:

| Campo           | Descrição                          |
| --------------- | ---------------------------------- |
| Data            | Data da pesagem                    |
| Local           | Ponto onde a pesagem foi realizada |
| Tipo de resíduo | Categoria do resíduo               |
| Peso            | Quantidade em kg                   |
| Destinação      | Destino dado ao resíduo            |
| Observação      | Informação adicional opcional      |

### Tipos de resíduos

* Orgânico
* Plástico
* Papel
* Metal
* Vidro
* Rejeitos

### Tipos de destinação

* Reciclagem
* Compostagem
* Reutilização
* Aterro / rejeito
* Outro

---

### 📋 Histórico

O histórico permite consultar os registros de pesagens armazenados.

É possível:

* Pesquisar por local ou tipo de resíduo
* Filtrar por categoria
* Filtrar por local
* Visualizar data, peso e destinação
* Excluir registros

---

### 📍 Locais de coleta

O sistema permite cadastrar e gerenciar os locais onde as pesagens são realizadas.

Cada local possui:

* Nome
* Ambiente
* Total acumulado de resíduos
* Quantidade de pesagens

Os locais podem ser **adicionados, editados e excluídos**.

Um local que ainda possua pesagens vinculadas não pode ser excluído.

---

### 🏫 Ambientes

O sistema possui uma camada de organização por ambientes.

Os ambientes podem ser:

* Cadastrados
* Editados
* Excluídos

Um ambiente utilizado por algum local de coleta não pode ser excluído até que seus locais vinculados sejam removidos ou alterados.

---

## 📊 Visualizações

O dashboard possui diferentes formas de analisar os dados.

### Geração por categoria

Gráfico de barras mostrando a quantidade acumulada de cada tipo de resíduo.

### Composição dos resíduos

Gráfico de rosca mostrando a participação percentual de cada categoria no total.

### Evolução da geração

Gráfico de linha mostrando a evolução das pesagens ao longo das semanas.

### Geração por local

Comparação da quantidade total de resíduos registrada em cada ponto de coleta.

---

## 💡 Insights automáticos

O EcoMonitor analisa os dados registrados e gera observações automaticamente.

Por exemplo:

* Identificação de alta participação de plástico
* Destaque para bons índices de reciclagem, compostagem ou reutilização
* Identificação de grande participação de resíduos orgânicos
* Recomendações para iniciar o monitoramento quando ainda não existem dados suficientes

Esses insights são calculados diretamente a partir dos dados disponíveis no dashboard.

---

## 📑 Relatórios

O sistema possui exportação de relatórios em **`.xlsx`**, permitindo analisar os dados posteriormente no Excel ou em softwares compatíveis.

Os relatórios podem ser filtrados por:

* Período inicial
* Período final
* Local
* Tipo de resíduo

### Relatórios disponíveis

#### 📄 Relatório completo

Exporta todos os registros filtrados.

Arquivo:

```text
ecomonitor_completo.xlsx
```

Contém:

```text
Data
Local
Tipo de Resíduo
Peso (kg)
Destinação
Observação
```

#### ♻️ Relatório por categoria

Mostra o total e a participação percentual de cada tipo de resíduo.

```text
ecomonitor_por_categoria.xlsx
```

#### 📍 Relatório por local

Mostra a quantidade total e a participação percentual de cada local.

```text
ecomonitor_por_local.xlsx
```

#### 🌱 Relatório por destinação

Mostra a quantidade de resíduos destinada a cada destino.

```text
ecomonitor_por_destinacao.xlsx
```

Os arquivos são gerados com formatação, cabeçalhos, larguras de coluna e bordas nas células para facilitar a leitura no Excel.

---

## 🧱 Arquitetura

O EcoMonitor é uma aplicação web frontend construída sem framework.

A interface funciona como uma **Single Page Application (SPA)**, utilizando JavaScript para controlar a navegação e atualização dinâmica dos componentes.

### Estrutura principal

```text
Eco-Monitor/
├── index.html
├── style.css
├── app.js
├── .vscode/
└── README.md
```

### Responsabilidade dos arquivos

| Arquivo      | Responsabilidade                                        |
| ------------ | ------------------------------------------------------- |
| `index.html` | Estrutura e componentes da aplicação                    |
| `style.css`  | Estilos, layout e responsividade                        |
| `app.js`     | Lógica, Supabase, gráficos, filtros, CRUD e exportações |
| `.vscode/`   | Configurações do ambiente de desenvolvimento            |

---

## 🗄️ Banco de dados

A aplicação utiliza **Supabase** como backend e banco de dados.

Os principais dados utilizados pela aplicação são:

```text
ambientes
locais
pesagens
```

### Relacionamento

```text
Ambiente
   │
   └── Locais
          │
          └── Pesagens
```

Uma pesagem pertence a um local, enquanto um local pertence a um ambiente.

---

## 🔌 Supabase

O cliente do Supabase é inicializado no frontend através da URL do projeto e da chave pública (`anon`).

A aplicação realiza operações como:

```javascript
db.from("pesagens").select(...)
db.from("pesagens").insert(...)
db.from("pesagens").delete(...)

db.from("locais").select(...)
db.from("locais").insert(...)
db.from("locais").update(...)
db.from("locais").delete(...)

db.from("ambientes").select(...)
db.from("ambientes").insert(...)
db.from("ambientes").update(...)
db.from("ambientes").delete(...)
```

A aplicação carrega os dados do banco ao iniciar e mantém uma cópia em memória para atualizar o dashboard e as tabelas sem precisar realizar uma nova consulta a cada alteração.

---

## 🚀 Como executar

### Pré-requisitos

Você precisa de:

* Navegador moderno
* VS Code (recomendado)
* Projeto configurado no Supabase

Não é necessário Node.js para executar a interface atual diretamente.

### 1. Clone o repositório

```bash
git clone https://github.com/KiyoshiEnatsu/Eco-Monitor.git
```

Entre na pasta:

```bash
cd Eco-Monitor
```

### 2. Abra no VS Code

```bash
code .
```

### 3. Execute a aplicação

A forma recomendada é utilizar a extensão **Live Server** do VS Code.

Abra:

```text
index.html
```

e selecione:

```text
Open with Live Server
```

A aplicação será aberta no navegador.

---

## 🔐 Segurança

A aplicação utiliza uma chave pública (`anon`) do Supabase no frontend. O controle de acesso aos dados deve ser feito através das políticas de segurança do Supabase (**RLS — Row Level Security**).

---

## 🛠️ Tecnologias utilizadas

### Frontend

* HTML5
* CSS3
* JavaScript ES6+
* Google Fonts — Inter

### Backend / Banco

* Supabase
* PostgreSQL

### Exportação

* ExcelJS
* XLSX / Excel

### Desenvolvimento

* Visual Studio Code
* Git
* GitHub
* Live Server

---

## 📁 Fluxo da aplicação

O funcionamento geral pode ser representado por:

```text
                    ┌──────────────────┐
                    │     EcoMonitor   │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
        Dashboard        Pesagens        Cadastros
              │              │              │
              │              ▼              │
              │        ┌───────────┐        │
              │        │ Supabase  │◄───────┘
              │        └─────┬─────┘
              │              │
              └──────────────┤
                             ▼
                    Análise dos dados
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
           Gráficos       Insights       Relatórios
                                             │
                                             ▼
                                           XLSX
```

---

## 🌎 Objetivo do projeto

O EcoMonitor busca facilitar o acompanhamento da geração e destinação de resíduos, transformando registros simples de pesagem em informações úteis para tomada de decisão.

A proposta é incentivar:

* ♻️ Reciclagem
* 🌱 Compostagem
* 📉 Redução da geração de resíduos
* 📊 Monitoramento contínuo
* 🏫 Educação ambiental
* 🌎 Práticas mais sustentáveis

O projeto está alinhado principalmente com a **ODS 13 — Ação Contra a Mudança Global do Clima**, utilizando o monitoramento de resíduos como ferramenta de conscientização e apoio à sustentabilidade.

---

## 🔮 Roadmap

Possíveis evoluções do projeto:

* [ ] Autenticação de usuários
* [ ] Controle de acesso por instituição
* [ ] Suporte a múltiplas instituições
* [ ] Dashboard mensal
* [ ] Mais indicadores ambientais
* [ ] Filtros avançados nos relatórios
* [ ] Relatórios gráficos
* [ ] Melhorias na experiência mobile
* [ ] Sistema de notificações
* [ ] Metas de redução de resíduos
* [ ] Comparação entre períodos
* [ ] Histórico de alterações
* [ ] Controle de permissões de usuários

---

## 👨‍💻 Projeto

**EcoMonitor**

Sistema de monitoramento de resíduos sólidos para apoiar instituições na coleta, análise e gestão de informações relacionadas à geração e destinação de resíduos.

---

## 📄 Licença

Este projeto não possui uma licença open source definida no momento.
