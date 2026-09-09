import os
import io
import base64
from datetime import datetime, date
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from supabase import create_client
from dotenv import load_dotenv
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from xhtml2pdf import pisa

load_dotenv()

app = Flask(__name__)
CORS(app)

db = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

# ============================================================
# UTILITÁRIOS
# ============================================================

RECICLAVEIS = {"Reciclagem", "Compostagem", "Reutilização"}

COLORS = {
    "Orgânico": "#15966a",
    "Plástico": "#3577db",
    "Papel":    "#f1a421",
    "Metal":    "#718096",
    "Vidro":    "#43b9c5",
    "Rejeitos": "#e85d64",
}

def fetch_data(date_start=None, date_end=None, location_id=None):
    q = db.from_("pesagens").select("*, locais(name)")
    if date_start:
        q = q.gte("date", date_start)
    if date_end:
        q = q.lte("date", date_end)
    if location_id:
        q = q.eq("location_id", location_id)
    res = q.order("date", desc=False).execute()
    return res.data or []

def build_dataframe(rows):
    if not rows:
        return pd.DataFrame(columns=["date","local","type","weight","destination","notes"])
    df = pd.DataFrame(rows)
    df["local"] = df["locais"].apply(lambda x: x["name"] if x else "Local removido")
    df["date"]  = pd.to_datetime(df["date"])
    df["weight"] = pd.to_numeric(df["weight"])
    return df

def chart_bars(df):
    """Gráfico de barras por categoria — retorna PNG em base64."""
    tipos = ["Orgânico","Plástico","Papel","Metal","Vidro","Rejeitos"]
    totais = [df[df["type"]==t]["weight"].sum() for t in tipos]

    fig, ax = plt.subplots(figsize=(7, 3.2))
    bars = ax.bar(tipos, totais, color=[COLORS[t] for t in tipos], width=0.55, zorder=3)
    ax.set_ylabel("kg", fontsize=9)
    ax.yaxis.grid(True, linestyle="--", alpha=0.5, zorder=0)
    ax.set_axisbelow(True)
    ax.spines[["top","right","left"]].set_visible(False)
    ax.tick_params(axis="x", labelsize=8)
    for bar, v in zip(bars, totais):
        if v > 0:
            ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + max(totais)*0.01,
                    f"{v:.1f}", ha="center", va="bottom", fontsize=7.5)
    fig.tight_layout()
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=130)
    plt.close(fig)
    return base64.b64encode(buf.getvalue()).decode()

def chart_trend(df):
    """Gráfico de linha semanal — retorna PNG em base64."""
    if df.empty:
        return None
    weekly = df.set_index("date").resample("W-MON")["weight"].sum().tail(8)
    if weekly.empty:
        return None

    fig, ax = plt.subplots(figsize=(7, 3))
    ax.plot(range(len(weekly)), weekly.values, color="#15966a", linewidth=2.5,
            marker="o", markersize=5, markerfacecolor="#fff", markeredgewidth=2)
    ax.set_xticks(range(len(weekly)))
    ax.set_xticklabels([d.strftime("%d/%m") for d in weekly.index], fontsize=8)
    ax.set_ylabel("kg", fontsize=9)
    ax.yaxis.grid(True, linestyle="--", alpha=0.5)
    ax.set_axisbelow(True)
    ax.spines[["top","right","left"]].set_visible(False)
    fig.tight_layout()
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=130)
    plt.close(fig)
    return base64.b64encode(buf.getvalue()).decode()

def build_html(df, periodo, instituicao="Escola Exemplo"):
    total     = df["weight"].sum()
    recicl    = df[df["destination"].isin(RECICLAVEIS)]["weight"].sum()
    nao_rec   = total - recicl
    pct_rec   = (recicl / total * 100) if total else 0
    pct_nao   = (nao_rec / total * 100) if total else 0

    por_tipo  = df.groupby("type")["weight"].sum().reindex(
                    ["Orgânico","Plástico","Papel","Metal","Vidro","Rejeitos"], fill_value=0)

    img_bars  = chart_bars(df)
    img_trend = chart_trend(df)

    # Insights
    insights = []
    if total and (df[df["type"]=="Plástico"]["weight"].sum() / total) > 0.2:
        insights.append("O plástico representa mais de 20% dos resíduos. Avalie a redução de embalagens descartáveis.")
    if total and pct_rec >= 50:
        insights.append(f"{pct_rec:.1f}% dos resíduos foram destinados à reciclagem, compostagem ou reutilização.")
    if total and (df[df["type"]=="Orgânico"]["weight"].sum() / total) >= 0.25:
        insights.append("O resíduo orgânico representa mais de 25% do total. Considere ações de compostagem.")
    if not insights:
        insights.append("Continue o monitoramento regular para gerar análises mais precisas.")

    recomendacoes = []
    if df[df["type"]=="Plástico"]["weight"].sum() > 0:
        recomendacoes.append("Reduzir o uso de embalagens descartáveis.")
    if df[df["type"]=="Orgânico"]["weight"].sum() > 0:
        recomendacoes.append("Avaliar ações de compostagem para resíduos orgânicos.")
    recomendacoes.append("Reforçar a separação correta dos resíduos na fonte.")

    rows_tipo = "".join(
        f"<tr><td>{t}</td><td>{v:.1f} kg</td><td>{(v/total*100):.1f}%</td></tr>"
        for t, v in por_tipo.items() if v > 0
    )

    trend_section = ""
    if img_trend:
        trend_section = f"""
        <div class="section">
            <h2>Evolução Semanal</h2>
            <img src="data:image/png;base64,{img_trend}" class="chart">
        </div>"""

    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
  * {{ margin:0; padding:0; box-sizing:border-box; }}
  body {{ font-family:'Inter',sans-serif; color:#1a202c; font-size:13px; padding:40px; }}
  .header {{ text-align:center; border-bottom:3px solid #15966a; padding-bottom:20px; margin-bottom:28px; }}
  .header h1 {{ font-size:22px; color:#15966a; letter-spacing:1px; }}
  .header p  {{ color:#718096; margin-top:4px; font-size:12px; }}
  .section   {{ margin-bottom:28px; }}
  .section h2 {{ font-size:14px; font-weight:700; color:#2d3748; border-left:4px solid #15966a;
                 padding-left:10px; margin-bottom:14px; }}
  .metrics   {{ display:flex; gap:16px; margin-bottom:28px; }}
  .metric    {{ flex:1; background:#f7fafc; border-radius:8px; padding:16px; text-align:center;
                border-top:3px solid #15966a; }}
  .metric.red {{ border-top-color:#e85d64; }}
  .metric span {{ display:block; font-size:11px; color:#718096; margin-bottom:6px; }}
  .metric strong {{ font-size:20px; color:#1a202c; }}
  .metric small  {{ display:block; font-size:11px; color:#718096; margin-top:4px; }}
  table  {{ width:100%; border-collapse:collapse; font-size:12px; }}
  th     {{ background:#f0faf5; color:#2d3748; font-weight:600; padding:8px 10px; text-align:left;
            border-bottom:2px solid #c6f6d5; }}
  td     {{ padding:7px 10px; border-bottom:1px solid #e2e8f0; }}
  tr:last-child td {{ border-bottom:none; }}
  .chart {{ width:100%; border-radius:6px; margin-top:8px; }}
  ul     {{ padding-left:18px; }}
  li     {{ margin-bottom:6px; line-height:1.5; }}
  .insight-box {{ background:#f0faf5; border-radius:8px; padding:14px 16px; margin-bottom:10px;
                  border-left:4px solid #15966a; font-size:12px; line-height:1.6; }}
  .footer {{ text-align:center; color:#a0aec0; font-size:10px; margin-top:32px;
             border-top:1px solid #e2e8f0; padding-top:14px; }}
</style>
</head>
<body>

<div class="header">
  <h1>🍃 ECOMONITOR — RELATÓRIO AMBIENTAL</h1>
  <p>Instituição: {instituicao} &nbsp;|&nbsp; Período: {periodo} &nbsp;|&nbsp;
     Gerado em: {date.today().strftime("%d/%m/%Y")}</p>
</div>

<div class="metrics">
  <div class="metric">
    <span>Geração Total</span>
    <strong>{total:.1f} kg</strong>
    <small>{len(df)} pesagens</small>
  </div>
  <div class="metric">
    <span>Recicláveis</span>
    <strong>{recicl:.1f} kg</strong>
    <small>{pct_rec:.1f}% do total</small>
  </div>
  <div class="metric red">
    <span>Não Recicláveis</span>
    <strong>{nao_rec:.1f} kg</strong>
    <small>{pct_nao:.1f}% do total</small>
  </div>
</div>

<div class="section">
  <h2>Geração por Categoria</h2>
  <img src="data:image/png;base64,{img_bars}" class="chart">
  <table style="margin-top:14px">
    <thead><tr><th>Categoria</th><th>Total</th><th>Participação</th></tr></thead>
    <tbody>{rows_tipo}</tbody>
  </table>
</div>

{trend_section}

<div class="section">
  <h2>Análise</h2>
  {"".join(f'<div class="insight-box">{i}</div>' for i in insights)}
</div>

<div class="section">
  <h2>Recomendações</h2>
  <ul>{"".join(f"<li>{r}</li>" for r in recomendacoes)}</ul>
</div>

<div class="footer">
  EcoMonitor MVP &nbsp;|&nbsp; ODS 13 — Ação contra a Mudança Global do Clima
</div>

</body>
</html>"""

# ============================================================
# ROTAS
# ============================================================

@app.route("/relatorio/pdf", methods=["GET"])
def gerar_pdf():
    date_start  = request.args.get("inicio")
    date_end    = request.args.get("fim")
    location_id = request.args.get("local") or None

    rows = fetch_data(date_start, date_end, location_id)
    df   = build_dataframe(rows)

    inicio = date_start or (df["date"].min().strftime("%d/%m/%Y") if not df.empty else "—")
    fim    = date_end   or (df["date"].max().strftime("%d/%m/%Y") if not df.empty else "—")
    if isinstance(inicio, str) and "-" in inicio:
        inicio = datetime.strptime(inicio, "%Y-%m-%d").strftime("%d/%m/%Y")
    if isinstance(fim, str) and "-" in fim:
        fim = datetime.strptime(fim, "%Y-%m-%d").strftime("%d/%m/%Y")
    periodo = f"{inicio} a {fim}"

    html = build_html(df, periodo)
    buf  = io.BytesIO()
    pisa.CreatePDF(html, dest=buf)
    buf.seek(0)

    return send_file(
        buf,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=f"ecomonitor_relatorio_{date.today().isoformat()}.pdf"
    )


@app.route("/relatorio/csv", methods=["GET"])
def gerar_csv():
    date_start  = request.args.get("inicio")
    date_end    = request.args.get("fim")
    location_id = request.args.get("local") or None

    rows = fetch_data(date_start, date_end, location_id)
    df   = build_dataframe(rows)

    if df.empty:
        return jsonify({"erro": "Nenhum dado encontrado para os filtros informados."}), 404

    export = df[["id","date","local","type","weight","destination","notes"]].copy()
    export.columns = ["id","data","local","tipo_residuo","peso_kg","destinacao","observacao"]
    export["data"] = export["data"].dt.strftime("%d/%m/%Y")

    buf = io.StringIO()
    export.to_csv(buf, index=False, sep=";", encoding="utf-8")
    buf.seek(0)

    return send_file(
        io.BytesIO(("\ufeff" + buf.getvalue()).encode("utf-8")),
        mimetype="text/csv",
        as_attachment=True,
        download_name=f"ecomonitor_pesagens_{date.today().isoformat()}.csv"
    )


@app.route("/locais", methods=["GET"])
def listar_locais():
    res = db.from_("locais").select("id, name").order("name").execute()
    return jsonify(res.data or [])


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
