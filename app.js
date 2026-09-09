// ============================================================
// CONFIGURAÇÃO DO SUPABASE
// URL e chave pública do projeto — não compartilhe a service_role key
// ============================================================
const SUPABASE_URL = "https://wjqodofpfycxyewmbzvk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqcW9kb2ZwZnljeHlld21ienZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NjE2ODYsImV4cCI6MjA5NTQzNzY4Nn0.Emvqq_vElule8SvA4g2HILMSb2iFUyknNEjhuPWP-s0";
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================================
// DADOS EM MEMÓRIA
// Carregados uma vez ao iniciar via fetchAll(), depois atualizados localmente
// ============================================================
let locations = [];
let data = [];

// ============================================================
// MAPA DE CORES POR TIPO DE RESÍDUO — apenas front-end
// ============================================================
const colors = {
  "Orgânico":"#15966a", "Plástico":"#3577db", "Papel":"#f1a421",
  "Metal":"#718096",    "Vidro":"#43b9c5",    "Rejeitos":"#e85d64"
};

// ============================================================
// BUSCA INICIAL DE DADOS NO SUPABASE
// Carrega locais e pesagens ao abrir o app
// ============================================================
async function fetchAll() {
  const [{ data: locs }, { data: pesagens }] = await Promise.all([
    db.from("locais").select("*").order("name"),
    db.from("pesagens").select("*").order("date", { ascending: false })
  ]);
  locations = locs || [];
  // Mapeia location_id para locationId para manter compatibilidade com o restante do código
  data = (pesagens || []).map(x => ({ ...x, locationId: x.location_id }));
  populateLocationSelects();
  renderDashboard();
  renderLocations();
}

// ============================================================
// FUNÇÕES UTILITÁRIAS DE FORMATAÇÃO
// ============================================================
function kg(n) {
  return `${Number(n).toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1})} kg`;
}
function pct(n) {
  return `${Number(n).toLocaleString("pt-BR",{maximumFractionDigits:1})}%`;
}
function getLocation(id) {
  return locations.find(l => l.id === id)?.name || "Local removido";
}
function formatDate(s) {
  return new Date(s+"T12:00:00").toLocaleDateString("pt-BR");
}
function showToast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2200);
}
function typeTag(type) {
  const map = { Orgânico:"green", Plástico:"blue", Papel:"yellow", Metal:"gray", Vidro:"cyan", Rejeitos:"red" };
  return `<span class="tag ${map[type]||"gray"}">${type}</span>`;
}
function destinationTag(d) {
  return `<span class="tag ${d==="Reciclagem"||d==="Compostagem"?"green":d==="Aterro / rejeito"?"red":"gray"}">${d}</span>`;
}

// ============================================================
// POPULAÇÃO DOS SELECTS DE LOCAL
// ============================================================
function populateLocationSelects() {
  const selects = [
    document.getElementById("locationFilter"),
    document.getElementById("local"),
    document.getElementById("historyLocation")
  ];
  selects.forEach((sel, i) => {
    if (!sel) return;
    const current = sel.value;
    if (i === 0) sel.innerHTML = `<option value="all">Todos os locais</option>`;
    else         sel.innerHTML = `<option value="">Todos os locais</option>`;
    locations.forEach(l => sel.innerHTML += `<option value="${l.id}">${l.name}</option>`);
    if ([...sel.options].some(o => o.value === current)) sel.value = current;
  });
}

// ============================================================
// FILTRO DE DADOS DO DASHBOARD
// ============================================================
function filteredData() {
  const period = document.getElementById("periodFilter")?.value || "30";
  const loc    = document.getElementById("locationFilter")?.value || "all";
  let arr = [...data];
  if (loc !== "all") arr = arr.filter(x => x.locationId === loc);
  if (period !== "all") {
    const days = Number(period), cutoff = new Date();
    cutoff.setHours(0,0,0,0);
    cutoff.setDate(cutoff.getDate() - days);
    arr = arr.filter(x => new Date(x.date+"T12:00:00") >= cutoff);
  }
  return arr.sort((a,b) => b.date.localeCompare(a.date));
}

// ============================================================
// RENDERIZAÇÃO DO DASHBOARD
// ============================================================
function renderDashboard() {
  const arr     = filteredData();
  const total   = arr.reduce((s,x) => s+x.weight, 0);
  const recycle = arr.filter(x => ["Reciclagem","Compostagem","Reutilização"].includes(x.destination))
                     .reduce((s,x) => s+x.weight, 0);
  const non  = total - recycle;
  const days = Number(document.getElementById("periodFilter").value === "all" ? 30 : document.getElementById("periodFilter").value) || 30;

  document.getElementById("metricTotal").textContent        = kg(total);
  document.getElementById("metricRecycle").textContent      = kg(recycle);
  document.getElementById("metricNonRecycle").textContent   = kg(non);
  document.getElementById("metricDaily").textContent        = kg(total/days);
  document.getElementById("metricRecyclePct").textContent   = total ? pct(recycle/total*100) : "0% do total";
  document.getElementById("metricNonRecyclePct").textContent= total ? pct(non/total*100) : "0% do total";
  document.getElementById("metricTotalNote").textContent    = arr.length ? `${arr.length} pesagens registradas` : "Sem dados ainda";

  const cat = {};
  ["Orgânico","Plástico","Papel","Metal","Vidro","Rejeitos"].forEach(t => cat[t] = 0);
  arr.forEach(x => cat[x.type] = (cat[x.type]||0) + x.weight);

  renderBars(cat);
  renderDonut(cat, total);
  renderTrend(arr);
  renderInsights(cat, total, recycle, arr);
  renderRecent(arr);
  renderLocationBars(arr);
}

// ============================================================
// GRÁFICO DE BARRAS
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
// GRÁFICO DE ROSCA (DONUT)
// ============================================================
function renderDonut(cat, total) {
  const entries = Object.entries(cat);
  let cursor = 0;
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
// GRÁFICO DE LINHA — evolução semanal
// ============================================================
function weekKey(date) {
  const d = new Date(date+"T12:00:00");
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return d.toISOString().slice(0,10);
}
function renderTrend(arr) {
  const by = {};
  arr.forEach(x => { const k = weekKey(x.date); by[k] = (by[k]||0) + x.weight; });
  const pts = Object.entries(by).sort((a,b) => a[0].localeCompare(b[0])).slice(-6);
  const max = Math.max(1, ...pts.map(p => p[1]));
  const chart = document.getElementById("trendChart");
  if (!pts.length) {
    chart.innerHTML = '<div class="empty">Cadastre pesagens para visualizar a evolução.</div>';
    return;
  }
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
// TABELA DE PESAGENS RECENTES
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
// ============================================================
function renderLocationBars(arr) {
  const totals = {};
  arr.forEach(x => totals[x.locationId] = (totals[x.locationId]||0) + x.weight);
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
// HISTÓRICO DE PESAGENS
// ============================================================
function renderHistory() {
  const q    = (document.getElementById("searchHistory").value||"").toLowerCase();
  const type = document.getElementById("historyType").value;
  const loc  = document.getElementById("historyLocation").value;
  const arr  = data.filter(x =>
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
// ============================================================
function exportCsv() {
  const header = ["id","data","local","tipo_residuo","peso_kg","destinacao","observacao"];
  const rows   = data.map(x => [x.id, x.date, getLocation(x.locationId), x.type, x.weight, x.destination, (x.notes||"")]);
  const csv    = [header,...rows].map(row => row.map(v => `"${String(v).replaceAll('"','""')}"`).join(";")).join("\n");
  const blob   = new Blob(["\uFEFF"+csv], {type:"text/csv;charset=utf-8"});
  const a      = document.createElement("a");
  a.href       = URL.createObjectURL(blob);
  a.download   = "ecomonitor_pesagens.csv";
  a.click();
  URL.revokeObjectURL(a.href);
  showToast("CSV exportado com sucesso!");
}

// ============================================================
// NAVEGAÇÃO ENTRE SEÇÕES
// ============================================================
function navigate(section) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(`section-${section}`).classList.add("active");
  document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.section === section));
  if (section === "dashboard") renderDashboard();
  if (section === "historico") renderHistory();
  if (section === "locais")    renderLocations();
  if (window.innerWidth <= 800) document.getElementById("sidebar").classList.remove("open");
}

// ============================================================
// DELEGAÇÃO DE EVENTOS GLOBAIS
// ============================================================
document.addEventListener("click", e => {
  const nav = e.target.closest(".nav-item");
  if (nav) navigate(nav.dataset.section);

  const go = e.target.closest("[data-go]");
  if (go) navigate(go.dataset.go);

  const del = e.target.closest("[data-delete]");
  if (del) {
    const id = del.dataset.delete;
    if (confirm("Excluir esta pesagem?")) {
      // Exclui no Supabase e atualiza memória local
      db.from("pesagens").delete().eq("id", id).then(() => {
        data = data.filter(x => x.id !== id);
        renderHistory();
        renderDashboard();
        showToast("Pesagem excluída.");
      });
    }
  }
});

document.getElementById("menuBtn").addEventListener("click", () =>
  document.getElementById("sidebar").classList.toggle("open")
);

["periodFilter","locationFilter"].forEach(id =>
  document.getElementById(id)?.addEventListener("change", renderDashboard)
);

["searchHistory","historyType","historyLocation"].forEach(id =>
  document.getElementById(id)?.addEventListener(id === "searchHistory" ? "input" : "change", renderHistory)
);

document.querySelectorAll(".segmented button").forEach(btn => btn.addEventListener("click", () => {
  document.querySelectorAll(".segmented button").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  const subtitle = document.getElementById("trendSubtitle");
  subtitle.textContent = btn.dataset.trend === "monthly"
    ? "Visão mensal (estrutura preparada para evolução futura)"
    : "Pesagens registradas por semana";
  renderTrend(filteredData());
}));

// ============================================================
// FORMULÁRIO DE NOVA PESAGEM — INSERT no Supabase
// ============================================================
document.getElementById("weighingForm").addEventListener("submit", async e => {
  e.preventDefault();
  const item = {
    date:        document.getElementById("date").value,
    location_id: document.getElementById("local").value,
    type:        document.getElementById("wasteType").value,
    weight:      Number(document.getElementById("weight").value),
    destination: document.getElementById("destination").value,
    notes:       document.getElementById("notes").value.trim()
  };
  if (!item.date || !item.location_id || !item.type || !item.weight || !item.destination) {
    showToast("Preencha todos os campos obrigatórios.");
    return;
  }
  const { data: inserted, error } = await db.from("pesagens").insert([item]).select().single();
  if (error) { showToast("Erro ao salvar. Tente novamente."); return; }
  // Adiciona na memória local com locationId mapeado
  data.unshift({ ...inserted, locationId: inserted.location_id });
  e.target.reset();
  document.getElementById("date").valueAsDate = new Date();
  renderDashboard();
  showToast("Pesagem registrada com sucesso!");
});

document.getElementById("clearForm").addEventListener("click", () =>
  document.getElementById("weighingForm").reset()
);

// ============================================================
// FORMULÁRIO DE NOVO LOCAL — INSERT no Supabase
// ============================================================
document.getElementById("locationForm").addEventListener("submit", async e => {
  e.preventDefault();
  const name = document.getElementById("newLocation").value.trim();
  const type = document.getElementById("locationType").value;
  if (!name) return;
  const { data: inserted, error } = await db.from("locais").insert([{ name, type }]).select().single();
  if (error) { showToast("Erro ao salvar local. Tente novamente."); return; }
  locations.push(inserted);
  populateLocationSelects();
  renderLocations();
  showToast("Local adicionado.");
  e.target.reset();
});

document.getElementById("exportCsv").addEventListener("click", exportCsv);

// ============================================================
// INICIALIZAÇÃO — carrega dados do Supabase e renderiza
// ============================================================
document.getElementById("date").valueAsDate = new Date();
fetchAll();
