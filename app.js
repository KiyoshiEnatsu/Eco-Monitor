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
let ambientes = [];
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
  const [{ data: locs }, { data: pesagens }, { data: ambs }] = await Promise.all([
    db.from("locais").select("*").order("name"),
    db.from("pesagens").select("*").order("date", { ascending: false }),
    db.from("ambientes").select("*").order("name")
  ]);
  locations = locs || [];
  ambientes = ambs || [];
  data = (pesagens || []).map(x => ({ ...x, locationId: x.location_id }));
  populateLocationSelects();
  populateAmbienteSelects();
  populateRelatorioSelects();
  renderDashboard();
  renderLocations();
  renderAmbientes();
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
// AMBIENTES — renderiza tabela e popula selects
// ============================================================
function populateAmbienteSelects() {
  const sel = document.getElementById("locationType");
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = ambientes.map(a => `<option value="${a.name}">${a.name}</option>`).join("");
  if ([...sel.options].some(o => o.value === current)) sel.value = current;
}

function renderAmbientes() {
  const tbody = document.getElementById("ambientesTable");
  if (!tbody) return;
  tbody.innerHTML = ambientes.length
    ? ambientes.map(a => `<tr>
        <td>${a.name}</td>
        <td>
          <button class="action-btn edit-btn" data-edit-amb="${a.id}">Editar</button>
          <button class="action-btn" data-delete-amb="${a.id}">Excluir</button>
        </td>
      </tr>`).join("")
    : `<tr><td colspan="2" class="empty">Nenhum ambiente cadastrado.</td></tr>`;
}

function openEditAmbiente(id) {
  const amb = ambientes.find(a => a.id === id);
  if (!amb) return;
  const form = document.getElementById("ambienteForm");
  document.getElementById("newAmbiente").value = amb.name;
  form.dataset.editId = id;
  form.querySelector("button[type=submit]").textContent = "💾 Salvar alterações";
  document.getElementById("cancelEditAmbiente").style.display = "";
  document.getElementById("newAmbiente").focus();
}

function resetAmbienteForm() {
  const form = document.getElementById("ambienteForm");
  form.reset();
  delete form.dataset.editId;
  form.querySelector("button[type=submit]").textContent = "＋ Adicionar";
  document.getElementById("cancelEditAmbiente").style.display = "none";
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
      <div class="location-card-header">
        <div>
          <h3>${l.name}</h3>
          <p>${l.type}</p>
        </div>
        <div class="location-card-actions">
          <button class="action-btn edit-btn" data-edit-id="${l.id}">Editar</button>
          <button class="action-btn" data-delete-loc="${l.id}">Excluir</button>
        </div>
      </div>
      <div class="loc-total">${kg(total)}</div>
      <p>${count} pesagem(ns)</p>
    </article>`;
  }).join("");
}

// Abre o formulário em modo edição buscando os dados direto do array locations
function openEditLocation(id) {
  const loc = locations.find(l => l.id === id);
  if (!loc) return;
  const form = document.getElementById("locationForm");
  document.getElementById("newLocation").value = loc.name;
  document.getElementById("locationType").value = loc.type;
  form.dataset.editId = id;
  form.querySelector("button[type=submit]").textContent = "💾 Salvar alterações";
  document.getElementById("cancelEditLocation").style.display = "";
  document.getElementById("newLocation").focus();
}

// Reseta o formulário de local para o modo de criação
function resetLocationForm() {
  const form = document.getElementById("locationForm");
  form.reset();
  delete form.dataset.editId;
  form.querySelector("button[type=submit]").textContent = "＋ Adicionar";
  document.getElementById("cancelEditLocation").style.display = "none";
}

// ============================================================
// EXPORTAÇÃO XLSX — 4 tipos de relatório com formatação
// ============================================================
function xlsxDownload(filename, rows) {
  const GREEN      = "15966a";
  const LINE       = "e6ebf0";
  const GREEN_SOFT = "e8f7ef";
  const WHITE      = "ffffff";

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const ncols = rows[0].length;

  // Largura automática das colunas
  ws["!cols"] = rows[0].map((_, ci) => ({
    wch: Math.min(40, Math.max(12, ...rows.map(r => String(r[ci] ?? "").length)))
  }));

  // Estilo do cabeçalho (linha 1) — fundo verde, texto branco, negrito
  for (let c = 0; c < ncols; c++) {
    const ref = XLSX.utils.encode_cell({ r: 0, c });
    if (!ws[ref]) continue;
    ws[ref].s = {
      fill:  { fgColor: { rgb: GREEN } },
      font:  { bold: true, color: { rgb: WHITE }, sz: 11 },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: { bottom: { style: "thin", color: { rgb: WHITE } } }
    };
  }

  // Estilo das linhas de dados — alternando LINE e GREEN_SOFT
  for (let r = 1; r < rows.length; r++) {
    const bg = r % 2 === 0 ? LINE : GREEN_SOFT;
    for (let c = 0; c < ncols; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (!ws[ref]) ws[ref] = { v: "", t: "s" };
      ws[ref].s = {
        fill:      { fgColor: { rgb: bg } },
        font:      { sz: 10 },
        alignment: { vertical: "center" },
        border: {
          top:    { style: "thin", color: { rgb: LINE } },
          bottom: { style: "thin", color: { rgb: LINE } },
          left:   { style: "thin", color: { rgb: LINE } },
          right:  { style: "thin", color: { rgb: LINE } }
        }
      };
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "EcoMonitor");
  XLSX.writeFile(wb, filename, { bookType: "xlsx", cellStyles: true });
  showToast("Relatório exportado com sucesso!");
}

function filteredReportData() {
  const inicio = document.getElementById("relatorioInicio").value;
  const fim    = document.getElementById("relatorioFim").value;
  const local  = document.getElementById("relatorioLocal").value;
  const tipo   = document.getElementById("relatorioTipo").value;
  return data.filter(x =>
    (!inicio || x.date >= inicio) &&
    (!fim    || x.date <= fim) &&
    (!local  || x.locationId === local) &&
    (!tipo   || x.type === tipo)
  ).sort((a, b) => a.date.localeCompare(b.date));
}

function exportCompleto() {
  const arr  = filteredReportData();
  const rows = [
    ["Data", "Local", "Tipo de Resíduo", "Peso (kg)", "Destinação", "Observação"],
    ...arr.map(x => [
      formatDate(x.date), getLocation(x.locationId), x.type,
      Number(x.weight), x.destination, x.notes || ""
    ])
  ];
  xlsxDownload("ecomonitor_completo.xlsx", rows);
}

function exportCategoria() {
  const arr = filteredReportData();
  const cat = {};
  ["Orgânico","Plástico","Papel","Metal","Vidro","Rejeitos"].forEach(t => cat[t] = 0);
  arr.forEach(x => cat[x.type] = (cat[x.type] || 0) + x.weight);
  const total = Object.values(cat).reduce((s, v) => s + v, 0);
  const rows = [
    ["Tipo de Resíduo", "Total (kg)", "Participação (%)"],
    ...Object.entries(cat).map(([t, v]) => [t, Number(v.toFixed(2)), total ? Number((v/total*100).toFixed(1)) : 0]),
    ["", "", ""],
    ["TOTAL", Number(total.toFixed(2)), 100]
  ];
  xlsxDownload("ecomonitor_por_categoria.xlsx", rows);
}

function exportLocal() {
  const arr    = filteredReportData();
  const totais = {};
  arr.forEach(x => totais[x.locationId] = (totais[x.locationId] || 0) + x.weight);
  const total  = Object.values(totais).reduce((s, v) => s + v, 0);
  const rows   = [
    ["Local", "Total (kg)", "Participação (%)"],
    ...locations
      .map(l => { const v = totais[l.id] || 0; return [l.name, Number(v.toFixed(2)), total ? Number((v/total*100).toFixed(1)) : 0]; })
      .sort((a, b) => b[1] - a[1]),
    ["", "", ""],
    ["TOTAL", Number(total.toFixed(2)), 100]
  ];
  xlsxDownload("ecomonitor_por_local.xlsx", rows);
}

function exportDestinacao() {
  const arr  = filteredReportData();
  const dest = {};
  arr.forEach(x => dest[x.destination] = (dest[x.destination] || 0) + x.weight);
  const total = Object.values(dest).reduce((s, v) => s + v, 0);
  const rows  = [
    ["Destinação", "Total (kg)", "Participação (%)"],
    ...Object.entries(dest)
      .sort((a, b) => b[1] - a[1])
      .map(([d, v]) => [d, Number(v.toFixed(2)), total ? Number((v/total*100).toFixed(1)) : 0]),
    ["", "", ""],
    ["TOTAL", Number(total.toFixed(2)), 100]
  ];
  xlsxDownload("ecomonitor_por_destinacao.xlsx", rows);
}

function populateRelatorioSelects() {
  const sel = document.getElementById("relatorioLocal");
  if (!sel) return;
  sel.innerHTML = `<option value="">Todos os locais</option>`;
  locations.forEach(l => sel.innerHTML += `<option value="${l.id}">${l.name}</option>`);
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
      db.from("pesagens").delete().eq("id", id).then(() => {
        data = data.filter(x => x.id !== id);
        renderHistory();
        renderDashboard();
        showToast("Pesagem excluída.");
      });
    }
  }

  // Clique em editar local
  const edit = e.target.closest("[data-edit-id]");
  if (edit) openEditLocation(edit.dataset.editId);

  // Clique em excluir local
  const delLoc = e.target.closest("[data-delete-loc]");
  if (delLoc) {
    const id = delLoc.dataset.deleteLoc;
    if (data.some(x => x.locationId === id)) {
      showToast("Remova as pesagens deste local antes de excluí-lo.");
      return;
    }
    if (confirm("Excluir este local?")) {
      db.from("locais").delete().eq("id", id).then(() => {
        locations = locations.filter(l => l.id !== id);
        populateLocationSelects();
        renderLocations();
        showToast("Local excluído.");
      });
    }
  }

  // Clique em editar ambiente
  const editAmb = e.target.closest("[data-edit-amb]");
  if (editAmb) openEditAmbiente(editAmb.dataset.editAmb);

  // Clique em excluir ambiente
  const delAmb = e.target.closest("[data-delete-amb]");
  if (delAmb) {
    const id = delAmb.dataset.deleteAmb;
    const amb = ambientes.find(a => a.id === id);
    if (locations.some(l => l.type === amb?.name)) {
      showToast("Remova os locais deste ambiente antes de excluí-lo.");
      return;
    }
    if (confirm("Excluir este ambiente?")) {
      db.from("ambientes").delete().eq("id", id).then(() => {
        ambientes = ambientes.filter(a => a.id !== id);
        populateAmbienteSelects();
        renderAmbientes();
        showToast("Ambiente excluído.");
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
// FORMULÁRIO DE LOCAL — INSERT ou UPDATE no Supabase
// ============================================================
document.getElementById("locationForm").addEventListener("submit", async e => {
  e.preventDefault();
  const name   = document.getElementById("newLocation").value.trim();
  const type   = document.getElementById("locationType").value;
  const editId = e.target.dataset.editId;
  if (!name) return;

  if (editId) {
    // Modo edição — UPDATE no Supabase
    const { error } = await db.from("locais").update({ name, type }).eq("id", editId);
    if (error) { showToast("Erro ao atualizar local."); return; }
    const loc = locations.find(l => l.id === editId);
    if (loc) { loc.name = name; loc.type = type; }
    showToast("Local atualizado.");
  } else {
    // Modo criação — INSERT no Supabase
    const { data: inserted, error } = await db.from("locais").insert([{ name, type }]).select().single();
    if (error) { showToast("Erro ao salvar local."); return; }
    locations.push(inserted);
    showToast("Local adicionado.");
  }

  resetLocationForm();
  populateLocationSelects();
  renderLocations();
});

document.getElementById("cancelEditLocation").addEventListener("click", resetLocationForm);

// ============================================================
// FORMULÁRIO DE AMBIENTE — INSERT ou UPDATE no Supabase
// ============================================================
document.getElementById("ambienteForm").addEventListener("submit", async e => {
  e.preventDefault();
  const name   = document.getElementById("newAmbiente").value.trim();
  const editId = e.target.dataset.editId;
  if (!name) return;

  if (editId) {
    const { error } = await db.from("ambientes").update({ name }).eq("id", editId);
    if (error) { showToast("Erro ao atualizar ambiente."); return; }
    const amb = ambientes.find(a => a.id === editId);
    if (amb) amb.name = name;
    showToast("Ambiente atualizado.");
  } else {
    const { data: inserted, error } = await db.from("ambientes").insert([{ name }]).select().single();
    if (error) { showToast("Erro ao salvar ambiente."); return; }
    ambientes.push(inserted);
    showToast("Ambiente adicionado.");
  }

  resetAmbienteForm();
  populateAmbienteSelects();
  renderAmbientes();
});

document.getElementById("cancelEditAmbiente").addEventListener("click", resetAmbienteForm);

document.addEventListener("click", e => {
  const btn = e.target.closest("[data-report]");
  if (!btn) return;
  const map = { completo: exportCompleto, categoria: exportCategoria, local: exportLocal, destinacao: exportDestinacao };
  map[btn.dataset.report]?.();
});

// ============================================================
// INICIALIZAÇÃO — carrega dados do Supabase e renderiza
// ============================================================
document.getElementById("date").valueAsDate = new Date();
fetchAll();
