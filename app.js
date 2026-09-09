// ============================================================
// CHAVES DO LOCALSTORAGE
// Ao migrar para Supabase, estas constantes deixam de ser usadas.
// Os dados passarão a vir das tabelas: "pesagens" e "locais".
// ============================================================
const STORAGE_KEY = "ecomonitor_data_v1";   // chave para pesagens no localStorage
const LOC_KEY = "ecomonitor_locations_v1";  // chave para locais no localStorage

// ============================================================
// LOCAIS PADRÃO
// No Supabase: tabela "locais" com colunas id (uuid), name (text), type (text).
// Substituir por: const { data: locations } = await supabase.from("locais").select("*")
// ============================================================
const defaultLocations = [
  { id: "loc1", name: "Cantina",        type: "Instituição de ensino" },
  { id: "loc2", name: "Sala 101",       type: "Instituição de ensino" },
  { id: "loc3", name: "Administrativo", type: "Instituição de ensino" },
  { id: "loc4", name: "Quadra",         type: "Instituição de ensino" },
  { id: "loc5", name: "Biblioteca",     type: "Instituição de ensino" }
];

// ============================================================
// DADOS DE EXEMPLO (seed)
// No Supabase: inserir via painel ou migration SQL.
// Formato da tabela "pesagens": id, date, location_id, type, weight, destination, notes
// ============================================================
const sampleData = [
  ["2026-09-08","loc1","Orgânico",12.5,"Compostagem"],
  ["2026-09-07","loc2","Plástico",8.3,"Reciclagem"],
  ["2026-09-06","loc3","Papel",6.7,"Reciclagem"],
  ["2026-09-05","loc4","Metal",4.2,"Reciclagem"],
  ["2026-09-04","loc1","Vidro",3.8,"Reciclagem"],
  ["2026-09-03","loc1","Orgânico",11.1,"Compostagem"],
  ["2026-09-02","loc2","Plástico",7.4,"Reciclagem"],
  ["2026-09-01","loc3","Papel",5.9,"Reciclagem"],
  ["2026-08-29","loc5","Rejeitos",4.1,"Aterro / rejeito"],
  ["2026-08-28","loc4","Vidro",3.4,"Reciclagem"],
  ["2026-08-27","loc1","Plástico",9.2,"Reciclagem"],
  ["2026-08-26","loc2","Orgânico",10.6,"Compostagem"],
  ["2026-08-25","loc3","Metal",5.0,"Reciclagem"],
  ["2026-08-23","loc1","Papel",7.3,"Reciclagem"],
  ["2026-08-22","loc5","Orgânico",9.8,"Compostagem"],
];

// ============================================================
// INICIALIZAÇÃO DOS DADOS EM MEMÓRIA
// No Supabase: substituir por chamadas assíncronas ao iniciar o app.
// Ex.: let locations = await fetchLocations()
//      let data = await fetchPesagens()
// ============================================================
let locations = JSON.parse(localStorage.getItem(LOC_KEY) || "null") || defaultLocations;
let data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");

// Se não houver dados salvos, popula com os dados de exemplo
if (!data) {
  data = sampleData.map((r,i) => ({
    id: String(i+1),
    date: r[0],
    locationId: r[1],  // no Supabase: location_id (FK para tabela locais)
    type: r[2],
    weight: r[3],
    destination: r[4],
    notes: ""
  }));
  saveData();
}

// ============================================================
// MAPA DE CORES POR TIPO DE RESÍDUO
// Usado apenas no front-end, não precisa ir para o banco.
// ============================================================
const colors = {
  "Orgânico":"#15966a", "Plástico":"#3577db", "Papel":"#f1a421",
  "Metal":"#718096",    "Vidro":"#43b9c5",    "Rejeitos":"#e85d64"
};

// ============================================================
// FUNÇÕES DE PERSISTÊNCIA
// No Supabase: substituir saveData() por INSERT/UPDATE na tabela "pesagens"
// e saveLocations() por INSERT/UPDATE na tabela "locais".
// ============================================================

// Salva array de pesagens no localStorage
function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Salva array de locais no localStorage
function saveLocations() {
  localStorage.setItem(LOC_KEY, JSON.stringify(locations));
}

// ============================================================
// FUNÇÕES UTILITÁRIAS DE FORMATAÇÃO
// Independentes do banco — permanecem iguais após migração.
// ============================================================

// Formata número como "X,X kg" em pt-BR
function kg(n) {
  return `${Number(n).toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1})} kg`;
}

// Formata número como porcentagem em pt-BR
function pct(n) {
  return `${Number(n).toLocaleString("pt-BR",{maximumFractionDigits:1})}%`;
}

// Retorna o nome do local pelo ID
// No Supabase: o JOIN na query já trará o nome diretamente
function getLocation(id) {
  return locations.find(l => l.id === id)?.name || "Local removido";
}

// Converte string "YYYY-MM-DD" para data formatada em pt-BR
function formatDate(s) {
  return new Date(s+"T12:00:00").toLocaleDateString("pt-BR");
}

// Exibe uma notificação temporária (toast) na tela
function showToast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2200);
}

// Gera HTML de uma tag colorida para o tipo de resíduo
function typeTag(type) {
  const map = { Orgânico:"green", Plástico:"blue", Papel:"yellow", Metal:"gray", Vidro:"cyan", Rejeitos:"red" };
  return `<span class="tag ${map[type]||"gray"}">${type}</span>`;
}

// Gera HTML de uma tag colorida para a destinação
function destinationTag(d) {
  return `<span class="tag ${d==="Reciclagem"||d==="Compostagem"?"green":d==="Aterro / rejeito"?"red":"gray"}">${d}</span>`;
}

// ============================================================
// POPULAÇÃO DOS SELECTS DE LOCAL
// No Supabase: buscar locais com supabase.from("locais").select("*")
// e popular os selects com o resultado.
// ============================================================
function populateLocationSelects() {
  const selects = [
    document.getElementById("locationFilter"), // filtro do dashboard
    document.getElementById("local"),           // formulário de pesagem
    document.getElementById("historyLocation")  // filtro do histórico
  ];
  selects.forEach((sel, i) => {
    if (!sel) return;
    const current = sel.value;
    // Primeiro item: "Todos os locais" (valor diferente por contexto)
    if (i === 0) sel.innerHTML = `<option value="all">Todos os locais</option>`;
    else         sel.innerHTML = `<option value="">Todos os locais</option>`;
    // Adiciona cada local como opção
    locations.forEach(l => sel.innerHTML += `<option value="${l.id}">${l.name}</option>`);
    // Mantém a seleção atual se ainda existir
    if ([...sel.options].some(o => o.value === current)) sel.value = current;
  });
}

// ============================================================
// FILTRO DE DADOS DO DASHBOARD
// No Supabase: aplicar filtros diretamente na query com .gte(), .eq() etc.
// Ex.: supabase.from("pesagens").select("*").gte("date", cutoff).eq("location_id", loc)
// ============================================================
function filteredData() {
  const period = document.getElementById("periodFilter")?.value || "30";
  const loc    = document.getElementById("locationFilter")?.value || "all";
  let arr = [...data];

  // Filtra por local
  if (loc !== "all") arr = arr.filter(x => x.locationId === loc);

  // Filtra por período (dias atrás)
  if (period !== "all") {
    const days = Number(period), cutoff = new Date();
    cutoff.setHours(0,0,0,0);
    cutoff.setDate(cutoff.getDate() - days);
    arr = arr.filter(x => new Date(x.date+"T12:00:00") >= cutoff);
  }

  // Ordena do mais recente para o mais antigo
  return arr.sort((a,b) => b.date.localeCompare(a.date));
}

// ============================================================
// RENDERIZAÇÃO DO DASHBOARD
// Orquestra todos os gráficos e métricas da tela principal.
// Após migração: chamar filteredData() como async e aguardar resultado do Supabase.
// ============================================================
function renderDashboard() {
  const arr    = filteredData();
  const total  = arr.reduce((s,x) => s+x.weight, 0);
  // Peso total de resíduos com destinação sustentável
  const recycle = arr.filter(x => ["Reciclagem","Compostagem","Reutilização"].includes(x.destination))
                     .reduce((s,x) => s+x.weight, 0);
  const non  = total - recycle;
  const days = Number(document.getElementById("periodFilter").value === "all" ? 30 : document.getElementById("periodFilter").value) || 30;

  // Atualiza os cards de métricas no topo
  document.getElementById("metricTotal").textContent       = kg(total);
  document.getElementById("metricRecycle").textContent     = kg(recycle);
  document.getElementById("metricNonRecycle").textContent  = kg(non);
  document.getElementById("metricDaily").textContent       = kg(total/days);
  document.getElementById("metricRecyclePct").textContent  = total ? pct(recycle/total*100) : "0% do total";
  document.getElementById("metricNonRecyclePct").textContent = total ? pct(non/total*100) : "0% do total";
  document.getElementById("metricTotalNote").textContent   = arr.length ? `${arr.length} pesagens registradas` : "Sem dados ainda";

  // Agrupa peso por categoria de resíduo
  const cat = {};
  ["Orgânico","Plástico","Papel","Metal","Vidro","Rejeitos"].forEach(t => cat[t] = 0);
  arr.forEach(x => cat[x.type] = (cat[x.type]||0) + x.weight);

  // Renderiza os componentes visuais
  renderBars(cat);
  renderDonut(cat, total);
  renderTrend(arr);
  renderInsights(cat, total, recycle, arr);
  renderRecent(arr);
  renderLocationBars(arr);
}

// ============================================================
// GRÁFICO DE BARRAS — categorias de resíduo
// Dados vêm de cat{} calculado em renderDashboard().
// ============================================================
function renderBars(cat) {
  const max = Math.max(1, ...Object.values(cat));
  document.getElementById("categoryChart").innerHTML = Object.entries(cat).map(([name,v]) => `
    <div class="bar-item">
      <div class="bar-value">${v.toLocaleString("pt-BR",{maximumFractionDigits:1})}</div>
      <div class="bar" style="height:${Math.max(3,v/max*82)}%;background:${colors[name]}"></div>
      <div class="bar-label">${name}</div>
    </div>`).join("");
}

// ============================================================
// GRÁFICO DE ROSCA (DONUT) — composição percentual
// ============================================================
function renderDonut(cat, total) {
  const entries = Object.entries(cat);
  let cursor = 0;
  // Monta os segmentos do conic-gradient
  const parts = entries.map(([name,v]) => {
    const start = cursor;
    cursor += total ? v/total*100 : 0;
    return `${colors[name]} ${start}% ${cursor}%`;
  });
  const d = document.getElementById("donutChart");
  d.style.background = parts.length
    ? `conic-gradient(${parts.join(",")})`
    : "conic-gradient(#dfe5e9 0 100%)";
  document.getElementById("donutTotal").textContent = Number(total).toLocaleString("pt-BR",{maximumFractionDigits:1});
  document.getElementById("donutLegend").innerHTML = entries.filter(e => e[1]>0).map(([name,v]) => `
    <div class="legend-row">
      <span class="legend-dot" style="background:${colors[name]}"></span>
      <span class="legend-name">${name}</span>
      <span class="legend-value">${pct(total ? v/total*100 : 0)}</span>
    </div>`).join("") || `<div class="empty">Sem dados</div>`;
}

// ============================================================
// AGRUPAMENTO POR SEMANA — usado no gráfico de tendência
// Retorna a data da segunda-feira da semana de uma data
// ============================================================
function weekKey(date) {
  const d = new Date(date+"T12:00:00");
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return d.toISOString().slice(0,10);
}

// ============================================================
// GRÁFICO DE LINHA — evolução semanal de resíduos
// No Supabase: agrupar por semana com uma query SQL usando date_trunc('week', date)
// ============================================================
function renderTrend(arr) {
  // Agrupa peso total por semana
  const by = {};
  arr.forEach(x => { const k = weekKey(x.date); by[k] = (by[k]||0) + x.weight; });

  // Pega as últimas 6 semanas ordenadas
  const pts = Object.entries(by).sort((a,b) => a[0].localeCompare(b[0])).slice(-6);
  const max = Math.max(1, ...pts.map(p => p[1]));
  const chart = document.getElementById("trendChart");

  if (!pts.length) {
    chart.innerHTML = '<div class="empty">Cadastre pesagens para visualizar a evolução.</div>';
    return;
  }

  // Calcula coordenadas SVG para cada ponto
  const w=800, h=205, pad=22;
  const coords = pts.map((p,i) => [
    (i*(w-pad*2)/Math.max(1,pts.length-1))+pad,
    h-pad-(p[1]/max)*(h-pad*2)
  ]);
  const poly = coords.map(p => p.join(",")).join(" ");

  chart.innerHTML = `
    <div class="chart-grid">
      <svg class="line-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
        <polyline points="${poly}" fill="none" stroke="#15966a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></polyline>
        ${coords.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="5" fill="#fff" stroke="#15966a" stroke-width="3"></circle>`).join("")}
      </svg>
    </div>
    <div class="chart-labels">${pts.map(p => `<span>${formatDate(p[0]).slice(0,5)}</span>`).join("")}</div>`;
}

// ============================================================
// INSIGHTS AUTOMÁTICOS
// Gerados a partir dos dados calculados — lógica permanece igual após migração.
// ============================================================
function renderInsights(cat, total, recycle, arr) {
  const plastic = cat["Plástico"]||0, organic = cat["Orgânico"]||0;
  const items = [];

  if (plastic > 0)
    items.push(["↗️","Atenção ao plástico",`O plástico representa ${pct(total?plastic/total*100:0)} dos resíduos. Avalie a redução de embalagens descartáveis.`]);
  if (total && recycle/total >= 0.5)
    items.push(["♻️","Bom desempenho na destinação",`${pct(recycle/total*100)} dos registros foram para reciclagem, compostagem ou reutilização.`]);
  if (total && organic/total >= 0.25)
    items.push(["🌱","Foco no orgânico",`O resíduo orgânico representa ${pct(organic/total*100)} do total. Considere ações de compostagem e combate ao desperdício.`]);
  if (!items.length)
    items.push(["💡","Comece o monitoramento","Cadastre algumas pesagens semanais para que o sistema consiga gerar insights automaticamente."]);

  document.getElementById("insights").innerHTML = items.map(x =>
    `<div class="insight"><div class="insight-icon">${x[0]}</div><div><strong>${x[1]}</strong><p>${x[2]}</p></div></div>`
  ).join("");
}

// ============================================================
// TABELA DE PESAGENS RECENTES (últimas 5)
// No Supabase: supabase.from("pesagens").select("*, locais(name)").order("date", {ascending:false}).limit(5)
// ============================================================
function renderRecent(arr) {
  const tbody = document.getElementById("recentTable");
  if (!arr.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty">Nenhuma pesagem encontrada.</td></tr>`;
    return;
  }
  tbody.innerHTML = arr.slice(0,5).map(x =>
    `<tr>
      <td>${formatDate(x.date)}</td>
      <td>${getLocation(x.locationId)}</td>
      <td>${typeTag(x.type)}</td>
      <td>${kg(x.weight)}</td>
      <td>${destinationTag(x.destination)}</td>
    </tr>`
  ).join("");
}

// ============================================================
// BARRAS DE RESÍDUOS POR LOCAL
// No Supabase: agrupar com .select("location_id, weight.sum()").groupBy("location_id")
// ============================================================
function renderLocationBars(arr) {
  // Soma o peso por location_id
  const totals = {};
  arr.forEach(x => totals[x.locationId] = (totals[x.locationId]||0) + x.weight);

  // Ordena locais do maior para o menor total
  const rows = locations.map(l => [l, totals[l.id]||0]).sort((a,b) => b[1]-a[1]);
  const max  = Math.max(1, ...rows.map(r => r[1]));

  document.getElementById("locationBars").innerHTML = rows.map((r,i) =>
    `<div class="loc-row">
      <span>${r[0].name}</span>
      <div class="track"><div class="fill" style="width:${r[1]/max*100}%;background:${["#15966a","#3577db","#f1a421","#718096","#43b9c5","#e85d64"][i%6]}"></div></div>
      <strong>${kg(r[1])}</strong>
    </div>`
  ).join("");
}

// ============================================================
// HISTÓRICO DE PESAGENS (com busca e filtros)
// No Supabase: supabase.from("pesagens").select("*, locais(name)")
//   .ilike("locais.name", `%${q}%`).eq("type", type).eq("location_id", loc)
// ============================================================
function renderHistory() {
  const q    = (document.getElementById("searchHistory").value||"").toLowerCase();
  const type = document.getElementById("historyType").value;
  const loc  = document.getElementById("historyLocation").value;

  // Filtra localmente por texto, tipo e local
  const arr = data.filter(x =>
    (!q || getLocation(x.locationId).toLowerCase().includes(q) || x.type.toLowerCase().includes(q)) &&
    (!type || x.type === type) &&
    (!loc  || x.locationId === loc)
  ).sort((a,b) => b.date.localeCompare(a.date));

  const tbody = document.getElementById("historyTable");
  tbody.innerHTML = arr.length
    ? arr.map(x =>
        `<tr>
          <td>${formatDate(x.date)}</td>
          <td>${getLocation(x.locationId)}</td>
          <td>${typeTag(x.type)}</td>
          <td>${kg(x.weight)}</td>
          <td>${destinationTag(x.destination)}</td>
          <td><button class="action-btn" data-delete="${x.id}">Excluir</button></td>
        </tr>`
      ).join("")
    : `<tr><td colspan="6" class="empty">Nenhum registro encontrado.</td></tr>`;
}

// ============================================================
// CARDS DE LOCAIS DE COLETA
// No Supabase: buscar locais e fazer JOIN com pesagens para calcular totais
// ============================================================
function renderLocations() {
  const cards = document.getElementById("locationCards");
  cards.innerHTML = locations.map(l => {
    const total = data.filter(x => x.locationId === l.id).reduce((s,x) => s+x.weight, 0);
    const count = data.filter(x => x.locationId === l.id).length;
    return `<article class="location-card">
      <h3>${l.name}</h3>
      <p>${l.type}</p>
      <div class="loc-total">${kg(total)}</div>
      <p>${count} pesagem(ns)</p>
    </article>`;
  }).join("");
}

// ============================================================
// EXPORTAÇÃO CSV
// No Supabase: buscar todos os dados com select("*, locais(name)") antes de gerar o CSV
// ============================================================
function exportCsv() {
  const header = ["id","data","local","tipo_residuo","peso_kg","destinacao","observacao"];
  const rows   = data.map(x => [x.id, x.date, getLocation(x.locationId), x.type, x.weight, x.destination, (x.notes||"")]);
  const csv    = [header,...rows].map(row => row.map(v => `"${String(v).replaceAll('"','""')}"`).join(";")).join("\n");
  const blob   = new Blob([csv], {type:"text/csv;charset=utf-8"});
  const a      = document.createElement("a");
  a.href       = URL.createObjectURL(blob);
  a.download   = "ecomonitor_pesagens.csv";
  a.click();
  URL.revokeObjectURL(a.href);
  showToast("CSV exportado com sucesso!");
}

// ============================================================
// NAVEGAÇÃO ENTRE SEÇÕES (SPA sem roteador)
// Permanece igual após migração — é lógica de UI pura.
// ============================================================
function navigate(section) {
  // Esconde todas as páginas e mostra a selecionada
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(`section-${section}`).classList.add("active");

  // Atualiza o item ativo no menu lateral
  document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.section === section));

  // Renderiza o conteúdo da seção acessada
  if (section === "dashboard") renderDashboard();
  if (section === "historico") renderHistory();
  if (section === "locais")    renderLocations();

  // Fecha o menu lateral em mobile
  if (window.innerWidth <= 800) document.getElementById("sidebar").classList.remove("open");
}

// ============================================================
// DELEGAÇÃO DE EVENTOS GLOBAIS (cliques)
// ============================================================
document.addEventListener("click", e => {
  // Clique em item de navegação
  const nav = e.target.closest(".nav-item");
  if (nav) navigate(nav.dataset.section);

  // Clique em botão com data-go (atalho de navegação)
  const go = e.target.closest("[data-go]");
  if (go) navigate(go.dataset.go);

  // Clique em botão de excluir pesagem
  const del = e.target.closest("[data-delete]");
  if (del) {
    const id = del.dataset.delete;
    // No Supabase: substituir confirm() por modal customizado
    // e trocar data.filter() por: await supabase.from("pesagens").delete().eq("id", id)
    if (confirm("Excluir esta pesagem?")) {
      data = data.filter(x => x.id !== id);
      saveData();
      renderHistory();
      renderDashboard();
      showToast("Pesagem excluída.");
    }
  }
});

// Abre/fecha o menu lateral (mobile)
document.getElementById("menuBtn").addEventListener("click", () =>
  document.getElementById("sidebar").classList.toggle("open")
);

// Re-renderiza o dashboard ao mudar os filtros de período ou local
["periodFilter","locationFilter"].forEach(id =>
  document.getElementById(id)?.addEventListener("change", renderDashboard)
);

// Re-renderiza o histórico ao digitar na busca ou mudar filtros
["searchHistory","historyType","historyLocation"].forEach(id =>
  document.getElementById(id)?.addEventListener(id === "searchHistory" ? "input" : "change", renderHistory)
);

// Alternância semanal/mensal no gráfico de tendência
document.querySelectorAll(".segmented button").forEach(btn => btn.addEventListener("click", () => {
  document.querySelectorAll(".segmented button").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  // MVP: estrutura preparada para evolução — hoje usa apenas semanas
  const subtitle = document.getElementById("trendSubtitle");
  subtitle.textContent = btn.dataset.trend === "monthly"
    ? "Visão mensal (estrutura preparada para evolução futura)"
    : "Pesagens registradas por semana";
  renderTrend(filteredData());
}));

// ============================================================
// FORMULÁRIO DE NOVA PESAGEM
// No Supabase: substituir data.push() por:
//   await supabase.from("pesagens").insert([item])
// e remover saveData() — o banco persiste automaticamente.
// ============================================================
document.getElementById("weighingForm").addEventListener("submit", e => {
  e.preventDefault();
  const item = {
    id:          Date.now().toString(), // no Supabase: gerado automaticamente (uuid)
    date:        document.getElementById("date").value,
    locationId:  document.getElementById("local").value,       // no Supabase: location_id
    type:        document.getElementById("wasteType").value,
    weight:      Number(document.getElementById("weight").value),
    destination: document.getElementById("destination").value,
    notes:       document.getElementById("notes").value.trim()
  };

  // Validação básica dos campos obrigatórios
  if (!item.date || !item.locationId || !item.type || !item.weight || !item.destination) {
    showToast("Preencha todos os campos obrigatórios.");
    return;
  }

  data.push(item);
  saveData();
  e.target.reset();
  document.getElementById("date").valueAsDate = new Date();
  renderDashboard();
  showToast("Pesagem registrada com sucesso!");
});

// Limpa o formulário de pesagem
document.getElementById("clearForm").addEventListener("click", () =>
  document.getElementById("weighingForm").reset()
);

// ============================================================
// FORMULÁRIO DE NOVO LOCAL
// No Supabase: substituir locations.push() por:
//   await supabase.from("locais").insert([{ name, type }])
// e remover saveLocations().
// ============================================================
document.getElementById("locationForm").addEventListener("submit", e => {
  e.preventDefault();
  const name = document.getElementById("newLocation").value.trim();
  const type = document.getElementById("locationType").value;
  if (!name) return;

  locations.push({ id: "loc"+Date.now(), name, type }); // no Supabase: id gerado pelo banco
  saveLocations();
  populateLocationSelects();
  renderLocations();
  showToast("Local adicionado.");
  e.target.reset();
});

// Botão de exportar CSV
document.getElementById("exportCsv").addEventListener("click", exportCsv);

// ============================================================
// INICIALIZAÇÃO DA APLICAÇÃO
// No Supabase: tornar esta seção assíncrona (async/await)
// e aguardar o carregamento dos dados antes de renderizar.
// ============================================================
document.getElementById("date").valueAsDate = new Date(); // pré-preenche a data de hoje
populateLocationSelects(); // popula todos os selects de local
renderDashboard();         // renderiza o dashboard inicial
renderLocations();         // renderiza os cards de locais
