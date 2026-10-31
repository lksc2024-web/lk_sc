// Regiao — áreas de busca (cidade, zona, região do estado, raio, estado, Brasil), índice de destaque
// dos negócios, horário de funcionamento e o painel de mapa com ranking. Usado pela Prospecção e pela
// Central (o mesmo arquivo nos dois apps). Mapa: Leaflet + mapa base do OpenStreetMap, sem chave.
(function () {
  "use strict";

  const UFS = {
    AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia", CE: "Ceará", DF: "Distrito Federal",
    ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul",
    MG: "Minas Gerais", PA: "Pará", PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí",
    RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RS: "Rio Grande do Sul", RO: "Rondônia", RR: "Roraima",
    SC: "Santa Catarina", SP: "São Paulo", SE: "Sergipe", TO: "Tocantins",
  };

  // Zonas e regiões desenhadas à mão (caixas aproximadas, em graus).
  const PRESETS = {
    RJ: [
      { id: "rj-oeste", nome: "Zona Oeste do Rio", grupo: "Cidade do Rio", s: -23.07, n: -22.84, w: -43.80, e: -43.40 },
      { id: "rj-barra", nome: "Barra e Jacarepaguá", grupo: "Cidade do Rio", s: -23.03, n: -22.92, w: -43.50, e: -43.28 },
      { id: "rj-norte", nome: "Zona Norte do Rio", grupo: "Cidade do Rio", s: -22.90, n: -22.78, w: -43.42, e: -43.17 },
      { id: "rj-sul", nome: "Zona Sul do Rio", grupo: "Cidade do Rio", s: -23.00, n: -22.92, w: -43.25, e: -43.15 },
      { id: "rj-centro", nome: "Centro do Rio", grupo: "Cidade do Rio", s: -22.92, n: -22.89, w: -43.21, e: -43.16 },
      { id: "rj-baixada", nome: "Baixada Fluminense", grupo: "Estado do RJ", s: -22.82, n: -22.55, w: -43.75, e: -43.20 },
      { id: "rj-niteroi", nome: "Niterói e São Gonçalo", grupo: "Estado do RJ", s: -22.98, n: -22.75, w: -43.14, e: -42.95 },
      { id: "rj-lagos", nome: "Região dos Lagos", grupo: "Estado do RJ", s: -22.98, n: -22.70, w: -42.40, e: -41.85 },
      { id: "rj-serrana", nome: "Região Serrana", grupo: "Estado do RJ", s: -22.55, n: -22.15, w: -43.30, e: -42.45 },
      { id: "rj-sulflu", nome: "Sul Fluminense", grupo: "Estado do RJ", s: -22.75, n: -22.25, w: -44.50, e: -43.80 },
      { id: "rj-norteflu", nome: "Norte Fluminense", grupo: "Estado do RJ", s: -22.40, n: -21.30, w: -41.90, e: -41.00 },
    ],
    SP: [
      { id: "sp-leste", nome: "Zona Leste de SP", grupo: "Cidade de São Paulo", s: -23.62, n: -23.48, w: -46.60, e: -46.36 },
      { id: "sp-sul", nome: "Zona Sul de SP", grupo: "Cidade de São Paulo", s: -23.80, n: -23.57, w: -46.80, e: -46.62 },
      { id: "sp-oeste", nome: "Zona Oeste de SP", grupo: "Cidade de São Paulo", s: -23.62, n: -23.50, w: -46.80, e: -46.67 },
      { id: "sp-norte", nome: "Zona Norte de SP", grupo: "Cidade de São Paulo", s: -23.52, n: -23.38, w: -46.75, e: -46.55 },
      { id: "sp-centro", nome: "Centro de SP", grupo: "Cidade de São Paulo", s: -23.57, n: -23.52, w: -46.67, e: -46.62 },
      { id: "sp-abc", nome: "Grande ABC", grupo: "Estado de SP", s: -23.75, n: -23.60, w: -46.60, e: -46.43 },
      { id: "sp-osasco", nome: "Osasco, Barueri e Alphaville", grupo: "Estado de SP", s: -23.56, n: -23.46, w: -46.95, e: -46.75 },
      { id: "sp-guarulhos", nome: "Guarulhos", grupo: "Estado de SP", s: -23.50, n: -23.38, w: -46.58, e: -46.38 },
      { id: "sp-campinas", nome: "Campinas e região", grupo: "Estado de SP", s: -23.05, n: -22.70, w: -47.25, e: -46.85 },
      { id: "sp-santista", nome: "Baixada Santista", grupo: "Estado de SP", s: -24.10, n: -23.85, w: -46.60, e: -46.15 },
      { id: "sp-vale", nome: "Vale do Paraíba (S. J. dos Campos e Taubaté)", grupo: "Estado de SP", s: -23.25, n: -22.85, w: -46.00, e: -45.40 },
    ],
  };

  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt1 = (x) => (Math.round(x * 10) / 10).toLocaleString("pt-BR");
  const int = (x) => Math.round(x).toLocaleString("pt-BR");

  // ── Geometria ──────────────────────────────────────────────────────────────
  function distKm(a, b) {
    const R = 6371, r = Math.PI / 180;
    const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function caixaCirculo(lat, lng, raioKm) {
    const dLat = raioKm / 111.32, dLng = raioKm / (111.32 * Math.cos(lat * Math.PI / 180));
    return { s: lat - dLat, n: lat + dLat, w: lng - dLng, e: lng + dLng };
  }
  function tamanhoKm(c) { // [largura, altura]
    const meio = (c.s + c.n) / 2;
    return [distKm({ lat: meio, lng: c.w }, { lat: meio, lng: c.e }), distKm({ lat: c.s, lng: c.w }, { lat: c.n, lng: c.w })];
  }
  function dividir(c, n) {
    if (!n || n < 2) return [c];
    const dy = (c.n - c.s) / n, dx = (c.e - c.w) / n, out = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++)
      out.push({ s: c.s + i * dy, n: c.s + (i + 1) * dy, w: c.w + j * dx, e: c.w + (j + 1) * dx });
    return out;
  }
  // Quantas fatias por lado para que cada pedaço tenha mais ou menos `alvoKm` de lado.
  function gradePara(c, alvoKm, max = 4) {
    const [l, a] = tamanhoKm(c);
    return Math.max(1, Math.min(max, Math.ceil(Math.max(l, a) / alvoKm)));
  }
  function bboxUF(uf, municipios) {
    const ms = municipios.filter((m) => m.uf === uf);
    if (!ms.length) return null;
    const c = { s: 90, n: -90, w: 180, e: -180 };
    for (const m of ms) { c.s = Math.min(c.s, m.lat); c.n = Math.max(c.n, m.lat); c.w = Math.min(c.w, m.lon); c.e = Math.max(c.e, m.lon); }
    const pad = 0.05; c.s -= pad; c.n += pad; c.w -= pad; c.e += pad;
    return c;
  }
  const capitais = (municipios) => municipios.filter((m) => m.cap).sort((a, b) => a.uf.localeCompare(b.uf));

  // Contorno aproximado das cidades grandes (o resto usa um quadrado em volta do centro).
  const CONTORNO = {
    "Rio de Janeiro|RJ": { s: -23.08, n: -22.75, w: -43.80, e: -43.10 },
    "São Paulo|SP": { s: -23.80, n: -23.36, w: -46.83, e: -46.36 },
    "Belo Horizonte|MG": { s: -20.06, n: -19.78, w: -44.07, e: -43.86 },
    "Brasília|DF": { s: -15.95, n: -15.65, w: -48.10, e: -47.75 },
  };
  function caixaDaCidade(m) {
    return CONTORNO[`${m.n}|${m.uf}`] || caixaCirculo(m.lat, m.lon, m.cap ? 15 : 7);
  }
  // A cidade em 9 setores: Noroeste, Norte, Nordeste / Oeste, Centro, Leste / Sudoeste, Sul, Sudeste.
  const SETORES = [["Sudoeste", "Sul", "Sudeste"], ["Oeste", "Centro", "Leste"], ["Noroeste", "Norte", "Nordeste"]];
  function setoresDaCidade(m) {
    const c = caixaDaCidade(m), dy = (c.n - c.s) / 3, dx = (c.e - c.w) / 3, out = [];
    const grupo = "Partes da cidade";
    out.push({ id: `cid-${m.uf}-${m.n}-toda`, nome: `Cidade inteira · ${m.n}`, grupo, ...c });
    for (const [i, nomes] of [[2, SETORES[2]], [1, SETORES[1]], [0, SETORES[0]]])
      nomes.forEach((nome, j) => out.push({ id: `cid-${m.uf}-${m.n}-${nome}`, nome: `${nome} · ${m.n}`, grupo,
        s: c.s + i * dy, n: c.s + (i + 1) * dy, w: c.w + j * dx, e: c.w + (j + 1) * dx }));
    return out;
  }
  const cidadesDoEstado = (uf, municipios) => municipios.filter((m) => m.uf === uf)
    .sort((a, b) => (b.cap - a.cap) || a.n.localeCompare(b.n));

  // Regiões oferecidas para um estado: zonas desenhadas à mão + setores da cidade escolhida
  // (sudeste, oeste…) + capital e entorno + metades do estado.
  function regioesDoEstado(uf, municipios, nomeCidade) {
    const cap = municipios.find((m) => m.uf === uf && m.cap);
    const cid = (nomeCidade && municipios.find((m) => m.uf === uf && m.n === nomeCidade)) || cap;
    const pre = PRESETS[uf] || [];
    const out = !cid || cid === cap ? pre.filter((r) => r.grupo.startsWith("Cidade")) : [];
    if (cid) out.push(...setoresDaCidade(cid));
    out.push(...pre.filter((r) => !r.grupo.startsWith("Cidade")));
    const c = bboxUF(uf, municipios);
    if (!c) return out;
    if (cap) out.push({ id: `${uf}-capital`, nome: `${cap.n} e entorno`, grupo: "Regiões do estado", ...caixaCirculo(cap.lat, cap.lon, 30) });
    const mLat = (c.s + c.n) / 2, mLng = (c.w + c.e) / 2;
    out.push(
      { id: `${uf}-norte`, nome: `Norte do estado`, grupo: "Regiões do estado", s: mLat, n: c.n, w: c.w, e: c.e },
      { id: `${uf}-sul`, nome: `Sul do estado`, grupo: "Regiões do estado", s: c.s, n: mLat, w: c.w, e: c.e },
      { id: `${uf}-leste`, nome: `Leste do estado`, grupo: "Regiões do estado", s: c.s, n: c.n, w: mLng, e: c.e },
      { id: `${uf}-oeste`, nome: `Oeste do estado`, grupo: "Regiões do estado", s: c.s, n: c.n, w: c.w, e: mLng },
    );
    return out;
  }

  // ── Horário ────────────────────────────────────────────────────────────────
  // per: [[diaAbre, hAbre, mAbre, diaFecha, hFecha, mFecha]] com dia 0 = domingo.
  function abertoEm(per, dia, minuto) {
    if (!per || !per.length) return null;
    const SEM = 7 * 1440, t = dia * 1440 + minuto;
    for (const [da, ha, ma, df, hf, mf] of per) {
      const a = da * 1440 + ha * 60 + ma;
      let f = df * 1440 + hf * 60 + mf;
      if (f <= a) f += SEM; // atravessa a semana (sábado → domingo)
      if ((t >= a && t < f) || (t + SEM >= a && t + SEM < f)) return true;
    }
    return false;
  }
  function abertoAgora(geo, quando = new Date()) {
    if (!geo) return null;
    const r = abertoEm(geo.per, quando.getDay(), quando.getHours() * 60 + quando.getMinutes());
    return r == null ? (geo.aberto ?? null) : r;
  }
  // Texto de hoje, a partir das descrições do Google (que começam na segunda).
  function horarioHoje(geo, quando = new Date()) {
    const txt = geo && geo.txt;
    if (!txt || txt.length !== 7) return "";
    const linha = txt[(quando.getDay() + 6) % 7] || "";
    return linha.replace(/^[^:]+:\s*/, "").replace(/ | /g, " ");
  }
  const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

  // ── Índice de destaque ─────────────────────────────────────────────────────
  // Nota "bayesiana" (nota com poucas avaliações puxa para a média) + volume de avaliações.
  // 0–100, relativo ao grupo comparado. Também devolve a posição e o "Top X%".
  function indices(lista) {
    const com = lista.filter((l) => (l.avaliacoes || 0) > 0 && l.nota > 0);
    const C = com.length ? com.reduce((s, l) => s + l.nota * l.avaliacoes, 0) / com.reduce((s, l) => s + l.avaliacoes, 0) : 4.3;
    const m = 25, vmax = Math.max(1, ...lista.map((l) => l.avaliacoes || 0));
    const out = new Map();
    for (const l of lista) {
      const v = l.avaliacoes || 0, R = l.nota || 0;
      const bayes = v ? (v * R + m * C) / (v + m) : Math.min(C, 3.8);
      const pop = Math.log10(1 + v) / Math.log10(1 + vmax);
      out.set(l.id, { indice: Math.round(100 * (0.72 * clamp((bayes - 3.5) / 1.5) + 0.28 * pop)), bayes });
    }
    const ord = [...lista].sort((a, b) => out.get(b.id).indice - out.get(a.id).indice || (b.avaliacoes || 0) - (a.avaliacoes || 0));
    ord.forEach((l, i) => { const x = out.get(l.id); x.pos = i + 1; x.top = Math.max(1, Math.ceil(((i + 1) / ord.length) * 100)); });
    return out;
  }
  const corIndice = (i) => (i >= 75 ? "#16a34a" : i >= 55 ? "#d97706" : "#8a9490");

  // ── Leaflet sob demanda ────────────────────────────────────────────────────
  let promessaLeaflet = null;
  function carregarLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    if (promessaLeaflet) return promessaLeaflet;
    promessaLeaflet = new Promise((ok, falha) => {
      const css = document.createElement("link");
      css.rel = "stylesheet"; css.href = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(css);
      const js = document.createElement("script");
      js.src = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js";
      js.onload = () => ok(window.L); js.onerror = () => { promessaLeaflet = null; falha(new Error("Sem internet para o mapa.")); };
      document.head.appendChild(js);
    });
    return promessaLeaflet;
  }
  function camadaBase(L) {
    // Mapa base do OpenStreetMap: gratuito e sem chave (o CARTO passou a exigir chave).
    return L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    });
  }
  // Limites da área calculados à mão (o círculo do Leaflet só sabe os limites depois que o mapa tem posição).
  function limitesArea(area) {
    if (!area) return null;
    let c = area.circ ? caixaCirculo(area.circ.lat, area.circ.lng, area.circ.raio) : area.ret ? { ...area.ret } : null;
    for (const p of area.pontos || []) {
      c = c || { s: p.lat, n: p.lat, w: p.lng, e: p.lng };
      c.s = Math.min(c.s, p.lat); c.n = Math.max(c.n, p.lat); c.w = Math.min(c.w, p.lng); c.e = Math.max(c.e, p.lng);
    }
    return c && [[c.s, c.w], [c.n, c.e]];
  }
  const ESTILO_AREA = { color: "#2563eb", weight: 2, fillOpacity: 0.06, dashArray: "6 6" };
  function desenharArea(L, mapa, area) {
    const grupo = L.featureGroup();
    if (!area) return grupo;
    if (area.circ) L.circle([area.circ.lat, area.circ.lng], { radius: area.circ.raio * 1000, ...ESTILO_AREA }).addTo(grupo);
    else if (area.ret) L.rectangle([[area.ret.s, area.ret.w], [area.ret.n, area.ret.e]], ESTILO_AREA).addTo(grupo);
    for (const p of area.pontos || []) L.circleMarker([p.lat, p.lng], { radius: 4, color: "#2563eb", weight: 1, fillOpacity: 0.7 }).addTo(grupo);
    grupo.addTo(mapa);
    return grupo;
  }

  // ── Estilos (servem para os dois apps: usa as variáveis de cada um) ───────
  const CSS = `
.rg{--rg-card:var(--card,var(--panel,#fff));--rg-linha:var(--linha,var(--line,#e2e5e3));--rg-sub:var(--sub,var(--muted,#5e6561));
  --rg-txt:var(--txt,var(--ink,#141716));--rg-pri:var(--pri,var(--accent,#0f5f4f));--rg-bg:var(--bg,#f4f5f4)}
.rg-mapa{height:min(58vh,440px);min-height:280px;border-radius:12px;border:1px solid var(--rg-linha);overflow:hidden;background:#e9ece8;z-index:0}
.rg-mapa.peq{height:220px;min-height:0}
.rg-barra{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:10px 0}
.rg-barra select,.rg-barra input[type=time]{min-height:38px;padding:6px 10px;border-radius:10px;border:1px solid var(--rg-linha);background:var(--rg-bg);color:var(--rg-txt);width:auto}
.rg-chip{border:1px solid var(--rg-linha);background:var(--rg-card);color:var(--rg-txt);border-radius:999px;padding:7px 12px;font-size:13px;cursor:pointer;white-space:nowrap}
.rg-chip[aria-pressed=true]{background:var(--rg-pri);border-color:var(--rg-pri);color:#fff}
.rg-raio{display:flex;align-items:center;gap:8px;flex:1 1 220px;font-size:13px;color:var(--rg-sub)}
.rg-raio input{flex:1;accent-color:var(--rg-pri)}
.rg-raio b{color:var(--rg-txt);min-width:46px;text-align:right;font-variant-numeric:tabular-nums}
.rg-resumo{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:10px 0}
.rg-resumo div{border:1px solid var(--rg-linha);border-radius:10px;padding:8px 10px;background:var(--rg-card)}
.rg-resumo b{display:block;font-size:18px;font-variant-numeric:tabular-nums;color:var(--rg-txt)}
.rg-resumo span{font-size:12px;color:var(--rg-sub)}
.rg-nota{font-size:12.5px;color:var(--rg-sub);margin:6px 0}
.rg-lista{display:flex;flex-direction:column;gap:6px;margin-top:8px}
.rg-item{display:grid;grid-template-columns:34px minmax(0,1fr) 86px;gap:10px;align-items:center;border:1px solid var(--rg-linha);
  border-radius:12px;padding:10px;background:var(--rg-card);color:var(--rg-txt);text-align:left;cursor:pointer;width:100%;font:inherit}
.rg-item:hover{border-color:var(--rg-pri)}
.rg-item.sel{outline:2px solid var(--rg-pri)}
.rg-pos{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:13px;color:#fff}
.rg-nome{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rg-info{font-size:12.5px;color:var(--rg-sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rg-barrinha{height:5px;border-radius:3px;background:var(--rg-linha);margin-top:6px;overflow:hidden}
.rg-barrinha i{display:block;height:100%;border-radius:3px}
.rg-pct{text-align:right;font-variant-numeric:tabular-nums}
.rg-pct b{display:block;font-size:17px}
.rg-pct span{display:block;font-size:10.5px;line-height:1.2;color:var(--rg-sub)}
.rg-aberto{color:#16a34a;font-weight:600}.rg-fechado{color:#b42318}
.rg-pino{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;color:#fff;font:700 12px/1 system-ui,sans-serif;
  border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)}
.rg-pop{font:13px/1.4 system-ui,sans-serif;min-width:190px}
.rg-pop b{font-size:14px}.rg-pop button{margin-top:6px;border:0;border-radius:8px;padding:6px 10px;background:#0f5f4f;color:#fff;cursor:pointer;font:600 13px system-ui}
.rg-mais{width:100%;margin-top:6px}
.rg-rotulo-sec{font-size:12px;font-weight:600;color:var(--rg-sub);text-transform:uppercase;letter-spacing:.04em;margin:14px 0 -2px}
.rg-rolar{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}.rg-rolar::-webkit-scrollbar{display:none}
.rg-rolar>*{flex:none}
.rg-barra input[type=search]{min-height:42px;padding:8px 12px;border-radius:10px;border:1px solid var(--rg-linha);background:var(--rg-bg);color:var(--rg-txt);font:inherit}
.rg-busca{border:1px solid var(--rg-linha);border-radius:12px;padding:12px;margin-top:10px;background:var(--rg-card)}
.rg-btn{border:0;border-radius:10px;padding:10px 14px;background:var(--rg-pri);color:#fff;font:inherit;font-weight:600;cursor:pointer;flex:1 1 200px}
.rg-btn:disabled{opacity:.5}
.rg-prog{height:6px;border-radius:3px;background:var(--rg-linha);overflow:hidden;margin-top:8px}.rg-prog i{display:block;height:100%;width:0;background:var(--rg-pri);transition:width .3s}
.rg-pct .rg-ch{margin-top:4px;color:var(--rg-pri)}
.leaflet-tooltip.rg-rotulo{background:rgba(255,255,255,.94);border:0;border-radius:6px;box-shadow:0 1px 3px rgba(0,0,0,.25);padding:1px 6px;
  font:600 11px/1.4 system-ui,sans-serif;color:#1b1f1d;white-space:nowrap}
.leaflet-tooltip.rg-rotulo::before{display:none}
.rg-mapa:not(.perto) .rg-rotulo-extra,.rg-mapa:not(.medio) .rg-rotulo-medio{display:none}
@media (max-width:520px){.rg-resumo{grid-template-columns:repeat(2,minmax(0,1fr))}}
`;
  function estilos() {
    if (document.getElementById("rg-css")) return;
    const s = document.createElement("style"); s.id = "rg-css"; s.textContent = CSS; document.head.appendChild(s);
  }

  // ── Mapa simples de área (prévia no formulário de busca) ──────────────────
  async function mapaArea(el, area, { onToque } = {}) {
    estilos();
    const L = await carregarLeaflet();
    if (el._rgMapa) { el._rgMapa.remove(); el._rgMapa = null; }
    const mapa = L.map(el, { zoomControl: true, attributionControl: true, scrollWheelZoom: false });
    el._rgMapa = mapa;
    camadaBase(L).addTo(mapa);
    desenharArea(L, mapa, area);
    const lim = limitesArea(area);
    if (lim) mapa.fitBounds(lim, { padding: [12, 12] });
    else mapa.setView([-14.5, -51], 3);
    if (onToque) mapa.on("click", (e) => onToque({ lat: e.latlng.lat, lng: e.latlng.lng }));
    setTimeout(() => mapa.invalidateSize(), 60);
    return mapa;
  }

  // ── Painel completo: área (tudo, raio, região, bairro, área do mapa) + mapa + busca no Google ──
  // ── + filtros de horário + ranking com destaque e chance de fechar ─────────────────────────────
  // opcoes: { leads, area, chance(l) -> número|{pct}, onAbrir(id), municipios() -> Promise<lista>,
  //           buscar(spec, progresso) -> Promise<{ok, msg}> (opcional), estado (objeto para lembrar escolhas) }
  const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

  function painelMapa(el, opcoes) {
    estilos();
    const salvo = opcoes.estado || {};
    const st = Object.assign(salvo, {
      area: "tudo", uf: "RJ", cidade: "", regiao: "rj-oeste", bairro: "", centro: null, raio: 5,
      horario: "todos", dia: new Date().getDay(), hora: "19:00", top: false, nota45: false, nicho: "",
      ordem: "destaque", termo: "", mais: false, mostrar: 30, sel: null, ...salvo,
    });
    let popupAberto = false;
    let o = opcoes, L = null, mapa = null, cMarcas = null, cArea = null, cRaio = null, cRegiao = null, marcas = new Map();
    let mun = [];

    const chip = (attr, val, txt, on) => `<button type="button" class="rg-chip" ${attr}="${val}" aria-pressed="${!!on}">${txt}</button>`;
    el.classList.add("rg");
    el.innerHTML = `
      <div class="rg-rotulo-sec">Área</div>
      <div class="rg-barra rg-rolar" data-rg="areas">
        ${chip("data-a", "tudo", "Tudo", st.area === "tudo")}${chip("data-a", "raio", "Raio", st.area === "raio")}
        ${chip("data-a", "regiao", "Região", st.area === "regiao")}${chip("data-a", "bairro", "Bairro", st.area === "bairro")}
        ${chip("data-a", "visivel", "Área do mapa", st.area === "visivel")}
      </div>
      <div class="rg-barra" data-sub="raio" hidden>
        <label class="rg-raio"><span>Raio</span><input type="range" min="1" max="50" value="${st.raio}" data-rg="raio"><b data-rg="raio-v">${st.raio} km</b></label>
        <button type="button" class="rg-chip" data-rg="gps">Usar minha localização</button>
      </div>
      <div class="rg-barra" data-sub="regiao" hidden>
        <select data-rg="uf">${Object.entries(UFS).map(([k, v]) => `<option value="${k}"${k === st.uf ? " selected" : ""}>${v}</option>`).join("")}</select>
        <select data-rg="cidade" style="flex:1;min-width:0"></select>
        <select data-rg="regiao" style="flex:1 1 100%;min-width:0"></select>
      </div>
      <div class="rg-barra" data-sub="bairro" hidden>
        <input type="search" data-rg="bairro" placeholder="Bairro e cidade, ex.: Campo Grande, Rio de Janeiro" value="${esc(st.bairro)}" style="flex:1;min-width:0">
      </div>
      <p class="rg-nota" data-rg="dica"></p>
      <div class="rg-mapa" data-rg="mapa"></div>
      <div class="rg-busca" data-rg="busca" hidden>
        <div class="rg-barra" style="margin:0 0 8px">
          <input type="search" data-rg="termo" placeholder="O que procurar? ex.: pizzaria, barbearia" value="${esc(st.termo)}" style="flex:1;min-width:0">
        </div>
        <div class="rg-barra" style="margin:0">
          ${chip("data-q", "20", "Até 20 por tipo", !st.mais)}${chip("data-q", "60", "Até 60 por tipo", st.mais)}
          <button type="button" class="rg-btn" data-rg="ir">Buscar no Google nesta área</button>
        </div>
        <p class="rg-nota" data-rg="custo"></p>
        <div data-rg="prog" hidden><div class="rg-prog"><i data-rg="prog-barra"></i></div><p class="rg-nota" data-rg="prog-txt"></p></div>
      </div>
      <div class="rg-rotulo-sec">Horário</div>
      <div class="rg-barra rg-rolar">
        ${chip("data-h", "todos", "Qualquer", st.horario === "todos")}${chip("data-h", "agora", "Aberto agora", st.horario === "agora")}
        ${chip("data-h", "em", "Aberto em…", st.horario === "em")}
      </div>
      <div class="rg-barra" data-rg="em" ${st.horario === "em" ? "" : "hidden"}>
        <select data-rg="dia">${DIAS.map((d, i) => `<option value="${i}"${i === st.dia ? " selected" : ""}>${d}</option>`).join("")}</select>
        <input type="time" data-rg="hora" value="${st.hora}" step="900">
      </div>
      <div class="rg-rotulo-sec">Mostrar primeiro</div>
      <div class="rg-barra rg-rolar">
        ${chip("data-o", "destaque", "Melhores avaliados", st.ordem === "destaque")}${chip("data-o", "chance", "Melhores para prospectar", st.ordem === "chance")}
      </div>
      <div class="rg-barra rg-rolar">
        ${chip("data-f", "top", "Só os 10 primeiros", st.top)}${chip("data-f", "nota45", "Nota 4,5+", st.nota45)}
        <select data-rg="nicho"><option value="">Todos os tipos</option></select>
      </div>
      <div class="rg-resumo" data-rg="resumo"></div>
      <p class="rg-nota" data-rg="sem-geo" hidden></p>
      <div class="rg-lista" data-rg="lista"></div>`;
    const q = (k) => el.querySelector(`[data-rg="${k}"]`);
    const valorChance = (l) => { if (!o.chance) return null; const c = o.chance(l); return c == null ? null : typeof c === "number" ? c : c.pct; };
    const regiaoAtual = () => regioesDoEstado(st.uf, mun, st.cidade).find((r) => r.id === st.regiao) || null;
    const bairroAlvo = () => norm(st.bairro.split(",")[0]);

    function dentroDaArea(l) {
      const g = l.dados.geo;
      if (st.area === "raio") return !st.centro || distKm(st.centro, g) <= st.raio;
      if (st.area === "regiao") { const r = regiaoAtual(); return !r || (g.lat >= r.s && g.lat <= r.n && g.lng >= r.w && g.lng <= r.e); }
      if (st.area === "bairro") { const b = bairroAlvo(); return !b || norm(l.bairro).includes(b) || norm(l.endereco).includes(b); }
      if (st.area === "visivel") return !mapa || mapa.getBounds().contains([g.lat, g.lng]);
      return true;
    }

    function filtrar() {
      const comGeo = o.leads.filter((l) => l.dados && l.dados.geo && l.dados.geo.lat != null);
      let lista = comGeo.filter((l) => !l.fechado && (!st.nicho || l.nicho === st.nicho) && dentroDaArea(l));
      if (st.horario === "agora") lista = lista.filter((l) => abertoAgora(l.dados.geo) === true);
      if (st.horario === "em") {
        const [h, m] = st.hora.split(":").map(Number);
        lista = lista.filter((l) => abertoEm(l.dados.geo.per, st.dia, h * 60 + m) === true);
      }
      if (st.nota45) lista = lista.filter((l) => (l.nota || 0) >= 4.5);
      const idx = indices(lista), ch = new Map(lista.map((l) => [l.id, valorChance(l)]));
      if (st.ordem === "chance") lista.sort((a, b) => (ch.get(b.id) ?? -1) - (ch.get(a.id) ?? -1) || idx.get(a.id).pos - idx.get(b.id).pos);
      else lista.sort((a, b) => idx.get(a.id).pos - idx.get(b.id).pos);
      if (st.top) lista = lista.slice(0, 10);
      return { lista, idx, ch, semGeo: o.leads.length - comGeo.length };
    }

    function linha(l, ix, n, chv) {
      const g = l.dados.geo, ab = abertoAgora(g), hoje = horarioHoje(g);
      const dist = st.area === "raio" && st.centro ? `${fmt1(distKm(st.centro, g))} km` : "";
      const info = [l.bairro || l.cidade, dist].filter(Boolean).map(esc).join(" · ");
      const hor = ab == null ? "sem horário" : `<span class="${ab ? "rg-aberto" : "rg-fechado"}">${ab ? "Aberto" : "Fechado"}</span>${hoje ? " · hoje " + esc(hoje) : ""}`;
      const cor = st.ordem === "chance" && chv != null ? corIndice(chv + 15) : corIndice(ix.indice);
      return `<button type="button" class="rg-item${st.sel === l.id ? " sel" : ""}" data-id="${esc(l.id)}">
        <span class="rg-pos" style="background:${cor}">${n}</span>
        <span style="min-width:0">
          <span class="rg-nome" style="display:block">${esc(l.nome)}</span>
          <span class="rg-info" style="display:block">★ ${l.nota ? fmt1(l.nota) : "–"} (${int(l.avaliacoes || 0)}) · ${info}</span>
          <span class="rg-info" style="display:block">${hor}</span>
          <span class="rg-barrinha"><i style="width:${st.ordem === "chance" && chv != null ? chv : ix.indice}%;background:${cor}"></i></span>
        </span>
        <span class="rg-pct">
          <b>${ix.indice}%</b><span>destaque · top ${ix.top}%</span>
          ${chv != null ? `<b class="rg-ch">${chv}%</b><span>chance de fechar</span>` : ""}
        </span>
      </button>`;
    }

    function pino(n, cor, top) {
      return L.divIcon({ className: "", iconSize: top ? [26, 26] : [14, 14], iconAnchor: top ? [13, 13] : [7, 7],
        html: top ? `<div class="rg-pino" style="background:${cor}">${n}</div>`
          : `<div class="rg-pino" style="width:14px;height:14px;border-width:1.5px;background:${cor}"></div>` });
    }

    function popup(l, ix, n, chv) {
      const g = l.dados.geo, ab = abertoAgora(g), hoje = horarioHoje(g);
      return `<div class="rg-pop"><b>${n}º · ${esc(l.nome)}</b><br>
        <span style="color:#5e6561">${esc([l.categoria, l.bairro].filter(Boolean).join(" · "))}</span><br>
        Destaque <b>${ix.indice}%</b> (top ${ix.top}%)${chv != null ? ` · Chance de fechar <b>${chv}%</b>` : ""}<br>
        ★ ${l.nota ? fmt1(l.nota) : "–"} (${int(l.avaliacoes || 0)} avaliações)<br>
        ${ab == null ? "Horário não informado" : ab ? "Aberto agora" : "Fechado agora"}${hoje ? " · hoje " + esc(hoje) : ""}
        ${o.onAbrir ? `<br><button type="button" data-abrir="${esc(l.id)}">Abrir lead</button>` : ""}</div>`;
    }

    function desenharSobreposicoes() {
      if (!mapa) return;
      if (cRaio) { cRaio.remove(); cRaio = null; }
      if (cRegiao) { cRegiao.remove(); cRegiao = null; }
      if (cArea) { cArea.remove(); cArea = null; }
      if (st.area === "raio" && st.centro) {
        cRaio = L.layerGroup([
          L.circle([st.centro.lat, st.centro.lng], { radius: st.raio * 1000, color: "#0f5f4f", weight: 2, fillOpacity: 0.07 }),
          L.circleMarker([st.centro.lat, st.centro.lng], { radius: 5, color: "#fff", weight: 2, fillColor: "#0f5f4f", fillOpacity: 1 }),
        ]).addTo(mapa);
      } else if (st.area === "regiao") {
        const r = regiaoAtual();
        if (r) cRegiao = L.rectangle([[r.s, r.w], [r.n, r.e]], ESTILO_AREA).addTo(mapa);
      } else if (st.area === "tudo") cArea = desenharArea(L, mapa, o.area);
    }

    function enquadrar(lista) {
      if (!mapa || st.area === "visivel") return;
      let alvo = null;
      if (st.area === "raio" && st.centro) alvo = limitesArea({ circ: { ...st.centro, raio: st.raio } });
      else if (st.area === "regiao" && regiaoAtual()) { const r = regiaoAtual(); alvo = [[r.s, r.w], [r.n, r.e]]; }
      else if (lista.length) alvo = L.latLngBounds(lista.map((l) => [l.dados.geo.lat, l.dados.geo.lng]));
      else alvo = limitesArea(o.area);
      if (alvo) mapa.fitBounds(alvo, { padding: [24, 24], maxZoom: 15 }); else mapa.setView([-22.9, -43.3], 10);
    }

    function desenhar(ajustar, soLista = false) {
      const { lista, idx, ch, semGeo } = filtrar();
      const abertos = lista.filter((l) => abertoAgora(l.dados.geo) === true).length;
      const media = lista.length ? lista.reduce((s, l) => s + (l.nota || 0), 0) / lista.length : 0;
      const chs = lista.map((l) => ch.get(l.id)).filter((x) => x != null);
      q("resumo").innerHTML = `
        <div><b>${lista.length}</b><span>na área</span></div>
        <div><b>${lista.length ? fmt1(media) : "–"}</b><span>nota média</span></div>
        <div><b>${lista.length ? Math.round((abertos / lista.length) * 100) + "%" : "–"}</b><span>abertos agora</span></div>
        <div><b>${chs.length ? Math.round(chs.reduce((a, b) => a + b, 0) / chs.length) + "%" : "–"}</b><span>chance média de fechar</span></div>`;
      q("sem-geo").hidden = !semGeo;
      q("sem-geo").textContent = semGeo ? `${semGeo} ${semGeo === 1 ? "lead veio" : "leads vieram"} de buscas antigas, sem localização. Eles entram no mapa quando aparecerem numa busca nova.` : "";
      const vis = lista.slice(0, st.mostrar);
      q("lista").innerHTML = vis.map((l, i) => linha(l, idx.get(l.id), i + 1, ch.get(l.id))).join("") +
        (lista.length > vis.length ? `<button type="button" class="rg-chip rg-mais" data-rg="mais">Mostrar mais (${lista.length - vis.length})</button>` : "") +
        (!lista.length ? `<p class="rg-nota">Nenhuma empresa sua nesta área com esses filtros.${o.buscar ? " Use “Buscar no Google nesta área” para trazer as melhores daqui." : ""}</p>` : "");
      if (!mapa || soLista) return;
      cMarcas.clearLayers(); marcas = new Map();
      lista.slice().reverse().forEach((l) => {
        const n = lista.indexOf(l) + 1, ix = idx.get(l.id), chv = ch.get(l.id);
        const cor = st.ordem === "chance" && chv != null ? corIndice(chv + 15) : corIndice(ix.indice);
        const top = n <= 10;
        const mk = L.marker([l.dados.geo.lat, l.dados.geo.lng], { icon: pino(n, cor, top), zIndexOffset: 2000 - n })
          .bindPopup(popup(l, ix, n, chv))
          .bindTooltip(esc(l.nome.length > 26 ? l.nome.slice(0, 25) + "…" : l.nome),
            { permanent: true, direction: "right", offset: top ? [12, 0] : [6, 0], className: n <= 3 ? "rg-rotulo" : top ? "rg-rotulo rg-rotulo-medio" : "rg-rotulo rg-rotulo-extra" })
          .on("click", () => marcar(l.id, false));
        mk.addTo(cMarcas); marcas.set(l.id, mk);
      });
      desenharSobreposicoes();
      if (ajustar) enquadrar(lista);
    }

    function marcar(id, voar) {
      st.sel = id;
      el.querySelectorAll(".rg-item").forEach((b) => b.classList.toggle("sel", b.dataset.id === id));
      const mk = marcas.get(id);
      if (mk && voar) { mapa.setView(mk.getLatLng(), Math.max(mapa.getZoom(), 15)); mk.openPopup(); el.querySelector(".rg-mapa").scrollIntoView({ behavior: "smooth", block: "center" }); }
    }

    function preencherNichos() {
      const ns = [...new Set(o.leads.map((l) => l.nicho).filter(Boolean))].sort();
      if (st.nicho && !ns.includes(st.nicho)) st.nicho = "";
      q("nicho").innerHTML = `<option value="">Todos os tipos</option>` + ns.map((n) => `<option${n === st.nicho ? " selected" : ""}>${esc(n)}</option>`).join("");
      q("nicho").hidden = ns.length < 2;
    }

    async function preencherRegioes() {
      if (!mun.length && o.municipios) { try { mun = await o.municipios(); } catch { mun = []; } }
      const cids = cidadesDoEstado(st.uf, mun);
      if (st.cidade && !cids.some((m) => m.n === st.cidade)) st.cidade = "";
      q("cidade").innerHTML = cids.map((m) => `<option value="${esc(m.n)}"${m.n === st.cidade ? " selected" : ""}>${esc(m.n)}${m.cap ? " (capital)" : ""}</option>`).join("");
      if (!st.cidade && cids[0]) st.cidade = cids[0].n;
      const grupos = {};
      for (const r of regioesDoEstado(st.uf, mun, st.cidade)) (grupos[r.grupo] ||= []).push(r);
      if (!regiaoAtual()) st.regiao = (Object.values(grupos)[0] || [{}])[0].id || "";
      q("regiao").innerHTML = Object.entries(grupos).map(([g, rs]) =>
        `<optgroup label="${esc(g)}">${rs.map((r) => `<option value="${r.id}"${r.id === st.regiao ? " selected" : ""}>${esc(r.nome)}</option>`).join("")}</optgroup>`).join("");
    }

    const DICAS = {
      tudo: "Todas as suas empresas com localização. Escolha uma área para ver só as melhores de um lugar.",
      raio: "Toque no mapa para marcar o centro, ou use sua localização. Arraste o raio para abrir ou fechar.",
      regiao: "Escolha estado, cidade e a parte dela (ex.: Sudeste, Oeste), uma zona pronta ou uma região do estado.",
      bairro: "Digite o bairro e a cidade. A lista mostra quem é desse bairro.",
      visivel: "Mova e aproxime o mapa como no Maps: a lista acompanha o que está na tela.",
    };
    function mudarArea(a) {
      st.area = a;
      el.querySelectorAll("[data-a]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.a === a));
      el.querySelectorAll("[data-sub]").forEach((d) => (d.hidden = d.dataset.sub !== a));
      q("dica").textContent = DICAS[a];
      if (a === "regiao") preencherRegioes().then(() => { desenhar(true); custo(); });
      else desenhar(true);
      custo();
    }

    // ── Busca no Google a partir do mapa ──
    function specBusca() {
      const paginas = st.mais ? 3 : 1;
      if (st.area === "raio") {
        if (!st.centro) return { erro: "Marque o centro do raio: toque no mapa ou use sua localização." };
        return { modo: "raio", rotulo: `${st.raio} km de um ponto no mapa`, circ: { ...st.centro, raio: st.raio }, ret: caixaCirculo(st.centro.lat, st.centro.lng, st.raio), paginas };
      }
      if (st.area === "regiao") {
        const r = regiaoAtual(); if (!r) return { erro: "Escolha a região." };
        const ret = { s: r.s, n: r.n, w: r.w, e: r.e };
        return { modo: "regiao", rotulo: `${r.nome} (${st.uf})`, uf: st.uf, ret, paginas, grade: st.mais ? gradePara(ret, 15, 3) : 1 };
      }
      const b = mapa ? mapa.getBounds() : null;
      if (!b) return { erro: "O mapa ainda está carregando." };
      const ret = { s: b.getSouth(), n: b.getNorth(), w: b.getWest(), e: b.getEast() };
      if (st.area === "bairro") {
        if (!st.bairro.trim()) return { erro: "Digite o bairro e a cidade." };
        return { modo: "bairro", rotulo: st.bairro.trim(), bairro: st.bairro.split(",")[0].trim(), ret, paginas };
      }
      const [lg, al] = tamanhoKm(ret);
      if (Math.max(lg, al) > 400) return { erro: "Aproxime o mapa numa cidade ou região antes de buscar (a tela está mostrando uma área grande demais)." };
      return { modo: "visivel", rotulo: "área do mapa", ret, paginas, grade: st.mais ? gradePara(ret, 15, 3) : 1 };
    }
    const termos = () => [...new Set(st.termo.split(/[,;]/).map((s) => s.trim()).filter(Boolean))].slice(0, 5);
    function custo() {
      if (!o.buscar) return;
      const sp = specBusca(), n = Math.max(1, termos().length) * (st.mais ? 3 : 1) * ((sp.grade || 1) ** 2);
      q("custo").textContent = sp.erro ? sp.erro : `Busca as melhores de “${sp.rotulo}” no Google e guarda nos seus leads. Usa até ${n} ${n === 1 ? "chamada" : "chamadas"}.`;
    }
    async function irBuscar() {
      const t = termos();
      if (!t.length) { q("termo").focus(); q("custo").textContent = "Diga o que procurar (ex.: pizzaria)."; return; }
      const sp = specBusca();
      if (sp.erro) { q("custo").textContent = sp.erro; return; }
      const bt = q("ir"); bt.disabled = true; q("prog").hidden = false;
      const prog = (f, etapa) => { q("prog-barra").style.width = `${Math.round(f * 100)}%`; if (etapa) q("prog-txt").textContent = etapa; };
      const quando = st.horario === "em" ? (([h, m]) => ({ dia: st.dia, min: h * 60 + m, hora: st.hora }))(st.hora.split(":").map(Number)) : null;
      let r;
      try { r = await o.buscar({ ...sp, nichos: t, horario: st.horario === "todos" ? "" : st.horario, quando, notaMin: st.nota45 ? 4.5 : 0 }, prog); }
      catch (e) { r = { ok: false, msg: e.message }; }
      bt.disabled = false; q("prog").hidden = true;
      q("custo").textContent = r && r.msg ? r.msg : "";
      if (r && r.ok && st.area === "bairro") st.area = "bairro";
    }

    // ── Eventos ──
    el.addEventListener("click", (e) => {
      const a = e.target.closest("[data-a]"); if (a) return mudarArea(a.dataset.a);
      const h = e.target.closest("[data-h]");
      if (h) {
        st.horario = h.dataset.h;
        el.querySelectorAll("[data-h]").forEach((b) => b.setAttribute("aria-pressed", b === h));
        q("em").hidden = st.horario !== "em";
        return desenhar(false);
      }
      const od = e.target.closest("[data-o]");
      if (od) { st.ordem = od.dataset.o; el.querySelectorAll("[data-o]").forEach((b) => b.setAttribute("aria-pressed", b === od)); return desenhar(false); }
      const qq = e.target.closest("[data-q]");
      if (qq) { st.mais = qq.dataset.q === "60"; el.querySelectorAll("[data-q]").forEach((b) => b.setAttribute("aria-pressed", b === qq)); return custo(); }
      const f = e.target.closest("[data-f]");
      if (f) { st[f.dataset.f] = !st[f.dataset.f]; f.setAttribute("aria-pressed", st[f.dataset.f]); return desenhar(false); }
      if (e.target.closest('[data-rg="mais"]')) { st.mostrar += 30; return desenhar(false); }
      if (e.target.closest('[data-rg="ir"]')) return irBuscar();
      if (e.target.closest('[data-rg="gps"]')) {
        if (!navigator.geolocation) return;
        q("dica").textContent = "Procurando sua localização…";
        navigator.geolocation.getCurrentPosition((p) => definirCentro({ lat: p.coords.latitude, lng: p.coords.longitude }),
          () => { q("dica").textContent = "Não consegui sua localização. Toque no mapa para marcar o centro."; }, { timeout: 12000 });
        return;
      }
      const ab = e.target.closest("[data-abrir]");
      if (ab && o.onAbrir) return o.onAbrir(ab.dataset.abrir);
      const it = e.target.closest(".rg-item");
      if (it) marcar(it.dataset.id, true);
    });
    q("dia").addEventListener("change", (e) => { st.dia = +e.target.value; desenhar(false); });
    q("hora").addEventListener("change", (e) => { st.hora = e.target.value || "19:00"; desenhar(false); });
    q("nicho").addEventListener("change", (e) => { st.nicho = e.target.value; desenhar(true); });
    q("uf").addEventListener("change", (e) => { st.uf = e.target.value; st.cidade = ""; st.regiao = ""; preencherRegioes().then(() => { desenhar(true); custo(); }); });
    q("cidade").addEventListener("change", (e) => { st.cidade = e.target.value; st.regiao = ""; preencherRegioes().then(() => { desenhar(true); custo(); }); });
    q("regiao").addEventListener("change", (e) => { st.regiao = e.target.value; desenhar(true); custo(); });
    q("bairro").addEventListener("input", (e) => { st.bairro = e.target.value; clearTimeout(q("bairro")._t); q("bairro")._t = setTimeout(() => { desenhar(true); custo(); }, 300); });
    q("termo").addEventListener("input", (e) => { st.termo = e.target.value; custo(); });
    q("termo").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); irBuscar(); } });
    q("raio").addEventListener("input", (e) => { st.raio = +e.target.value; q("raio-v").textContent = `${st.raio} km`; desenhar(false); custo(); });
    q("raio").addEventListener("change", () => desenhar(true));

    function definirCentro(c) {
      st.centro = c;
      if (st.area !== "raio") mudarArea("raio"); else desenhar(true);
      q("dica").textContent = "Centro marcado. Arraste o raio para abrir ou fechar a área.";
      custo();
    }

    q("busca").hidden = !o.buscar;
    preencherNichos();
    mudarArea(st.area);
    carregarLeaflet().then((Lf) => {
      L = Lf;
      mapa = L.map(q("mapa"), { scrollWheelZoom: false, zoomSnap: 0.25, zoomDelta: 0.5 });
      camadaBase(L).addTo(mapa);
      cMarcas = L.featureGroup().addTo(mapa);
      // Tocar no mapa marca o centro do raio (só no modo Raio, para não atrapalhar quem está navegando).
      mapa.on("click", (e) => { if (st.area === "raio" && !popupAberto) definirCentro({ lat: e.latlng.lat, lng: e.latlng.lng }); });
      mapa.on("popupclose", () => setTimeout(() => (popupAberto = false), 50));
      mapa.on("popupopen", (e) => {
        popupAberto = true;
        const b = e.popup.getElement().querySelector("[data-abrir]");
        if (b && o.onAbrir) b.onclick = () => o.onAbrir(b.dataset.abrir);
      });
      // Nomes no mapa: os 3 primeiros sempre; até o 10º quando aproxima; todos bem de perto.
      const perto = () => { const z = mapa.getZoom(); q("mapa").classList.toggle("medio", z >= 12.5); q("mapa").classList.toggle("perto", z >= 15); };
      mapa.on("zoomend", perto);
      mapa.on("moveend", () => { if (st.area === "visivel") desenhar(false, popupAberto); custo(); });
      mapa.setView([-22.9, -43.3], 10);
      desenhar(true); perto(); custo();
      setTimeout(() => mapa.invalidateSize(), 80);
    }).catch(() => { q("mapa").innerHTML = `<p class="rg-nota" style="padding:16px">Não consegui carregar o mapa (sem internet). O ranking abaixo funciona mesmo assim.</p>`; });

    return {
      atualizar(novas) {
        o = { ...o, ...novas };
        st.mostrar = 30; preencherNichos(); desenhar(st.area !== "visivel");
      },
      redimensionar() { if (mapa) setTimeout(() => mapa.invalidateSize(), 50); },
      destruir() { if (mapa) mapa.remove(); el.innerHTML = ""; },
    };
  }

  window.Regiao = { UFS, PRESETS, DIAS, caixaDaCidade, setoresDaCidade, cidadesDoEstado, distKm, caixaCirculo, tamanhoKm, dividir, gradePara, bboxUF, capitais,
    regioesDoEstado, abertoEm, abertoAgora, horarioHoje, indices, corIndice, carregarLeaflet, mapaArea, painelMapa, estilos };
})();
