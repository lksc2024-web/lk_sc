// Regiao — áreas de busca (cidade, zona, região do estado, raio, estado, Brasil), índice de destaque
// dos negócios, horário de funcionamento e o painel de mapa com ranking. Usado pela Prospecção e pela
// Central (o mesmo arquivo nos dois apps). Mapa: Leaflet + mapa base CARTO/OpenStreetMap, sem chave.
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

  // Regiões oferecidas para um estado: as desenhadas à mão + capital e entorno + quadrantes do estado.
  function regioesDoEstado(uf, municipios) {
    const out = (PRESETS[uf] || []).slice();
    const c = bboxUF(uf, municipios);
    if (!c) return out;
    const cap = municipios.find((m) => m.uf === uf && m.cap);
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
    return L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 19, subdomains: "abcd",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
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
.rg-item{display:grid;grid-template-columns:34px minmax(0,1fr) 64px;gap:10px;align-items:center;border:1px solid var(--rg-linha);
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
.rg-pct span{font-size:11px;color:var(--rg-sub)}
.rg-aberto{color:#16a34a;font-weight:600}.rg-fechado{color:#b42318}
.rg-pino{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;color:#fff;font:700 12px/1 system-ui,sans-serif;
  border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)}
.rg-pop{font:13px/1.4 system-ui,sans-serif;min-width:190px}
.rg-pop b{font-size:14px}.rg-pop button{margin-top:6px;border:0;border-radius:8px;padding:6px 10px;background:#0f5f4f;color:#fff;cursor:pointer;font:600 13px system-ui}
.rg-mais{width:100%;margin-top:6px}
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

  // ── Painel completo: mapa + filtros + ranking com porcentagens ────────────
  // opcoes: { leads, area, chance(l) -> {pct} | número, onAbrir(id), titulo }
  function painelMapa(el, opcoes) {
    estilos();
    const st = { horario: "todos", dia: new Date().getDay(), hora: "19:00", top: false, nota45: false, nicho: "",
      centro: null, raio: 5, mostrar: 30, sel: null };
    let o = opcoes, L = null, mapa = null, cMarcas = null, cArea = null, cRaio = null, marcas = new Map();

    el.classList.add("rg");
    el.innerHTML = `
      <div class="rg-mapa" data-rg="mapa"></div>
      <div class="rg-barra">
        <button type="button" class="rg-chip" data-h="todos" aria-pressed="true">Qualquer horário</button>
        <button type="button" class="rg-chip" data-h="agora">Aberto agora</button>
        <button type="button" class="rg-chip" data-h="em">Aberto em…</button>
        <span data-rg="em" hidden>
          <select data-rg="dia">${DIAS.map((d, i) => `<option value="${i}">${d}</option>`).join("")}</select>
          <input type="time" data-rg="hora" value="19:00" step="900">
        </span>
      </div>
      <div class="rg-barra">
        <button type="button" class="rg-chip" data-f="top">Top 10</button>
        <button type="button" class="rg-chip" data-f="nota45">Nota 4,5+</button>
        <select data-rg="nicho"><option value="">Todos os nichos</option></select>
        <button type="button" class="rg-chip" data-rg="gps">Usar minha localização</button>
      </div>
      <div class="rg-barra">
        <label class="rg-raio"><span>Raio</span><input type="range" min="1" max="50" value="5" data-rg="raio"><b data-rg="raio-v">5 km</b></label>
        <button type="button" class="rg-chip" data-rg="limpar-raio" hidden>Tirar raio</button>
      </div>
      <p class="rg-nota" data-rg="dica">Toque no mapa para marcar um centro e ver só o que está dentro do raio.</p>
      <div class="rg-resumo" data-rg="resumo"></div>
      <p class="rg-nota" data-rg="sem-geo" hidden></p>
      <div class="rg-lista" data-rg="lista"></div>`;
    const q = (k) => el.querySelector(`[data-rg="${k}"]`);
    const valorChance = (l) => { const c = o.chance ? o.chance(l) : null; return c == null ? null : typeof c === "number" ? c : c.pct; };

    function filtrar() {
      const comGeo = o.leads.filter((l) => l.dados && l.dados.geo && l.dados.geo.lat != null);
      let lista = comGeo.filter((l) => !l.fechado && (!st.nicho || l.nicho === st.nicho));
      if (st.centro) lista = lista.filter((l) => distKm(st.centro, l.dados.geo) <= st.raio);
      if (st.horario === "agora") lista = lista.filter((l) => abertoAgora(l.dados.geo) === true);
      if (st.horario === "em") {
        const [h, m] = st.hora.split(":").map(Number);
        lista = lista.filter((l) => abertoEm(l.dados.geo.per, st.dia, h * 60 + m) === true);
      }
      if (st.nota45) lista = lista.filter((l) => (l.nota || 0) >= 4.5);
      const idx = indices(lista);
      lista.sort((a, b) => idx.get(a.id).pos - idx.get(b.id).pos);
      if (st.top) lista = lista.slice(0, 10);
      return { lista, idx, semGeo: o.leads.length - comGeo.length };
    }

    function linha(l, ix) {
      const g = l.dados.geo, ab = abertoAgora(g), hoje = horarioHoje(g), ch = valorChance(l);
      const dist = st.centro ? `${fmt1(distKm(st.centro, g))} km` : "";
      const info = [l.bairro || l.cidade, dist].filter(Boolean).map(esc).join(" · ");
      const hor = ab == null ? "sem horário" : `<span class="${ab ? "rg-aberto" : "rg-fechado"}">${ab ? "Aberto" : "Fechado"}</span>${hoje ? " · hoje " + esc(hoje) : ""}`;
      return `<button type="button" class="rg-item${st.sel === l.id ? " sel" : ""}" data-id="${esc(l.id)}">
        <span class="rg-pos" style="background:${corIndice(ix.indice)}">${ix.pos}</span>
        <span style="min-width:0">
          <span class="rg-nome" style="display:block">${esc(l.nome)}</span>
          <span class="rg-info" style="display:block">★ ${l.nota ? fmt1(l.nota) : "–"} (${int(l.avaliacoes || 0)}) · ${info}</span>
          <span class="rg-info" style="display:block">${ch != null ? `Chance <b style="color:var(--rg-txt)">${ch}%</b> · ` : ""}${hor}</span>
          <span class="rg-barrinha"><i style="width:${ix.indice}%;background:${corIndice(ix.indice)}"></i></span>
        </span>
        <span class="rg-pct"><b>${ix.indice}%</b><span>Top ${ix.top}%</span></span>
      </button>`;
    }

    function pino(L, ix) {
      const top = ix.pos <= 10;
      return L.divIcon({ className: "", iconSize: top ? [26, 26] : [14, 14], iconAnchor: top ? [13, 13] : [7, 7],
        html: top ? `<div class="rg-pino" style="background:${corIndice(ix.indice)}">${ix.pos}</div>`
          : `<div class="rg-pino" style="width:14px;height:14px;border-width:1.5px;background:${corIndice(ix.indice)}"></div>` });
    }

    function popup(l, ix) {
      const g = l.dados.geo, ab = abertoAgora(g), ch = valorChance(l), hoje = horarioHoje(g);
      return `<div class="rg-pop"><b>${ix.pos}º · ${esc(l.nome)}</b><br>
        Destaque <b>${ix.indice}%</b> · Top ${ix.top}%<br>
        ★ ${l.nota ? fmt1(l.nota) : "–"} (${int(l.avaliacoes || 0)} avaliações)<br>
        ${ab == null ? "Horário não informado" : ab ? "Aberto agora" : "Fechado agora"}${hoje ? " · hoje " + esc(hoje) : ""}
        ${ch != null ? `<br>Chance de fechar: <b>${ch}%</b>` : ""}
        ${o.onAbrir ? `<br><button type="button" data-abrir="${esc(l.id)}">Abrir lead</button>` : ""}</div>`;
    }

    function desenhar(ajustar) {
      const { lista, idx, semGeo } = filtrar();
      // resumo
      const abertos = lista.filter((l) => abertoAgora(l.dados.geo) === true).length;
      const media = lista.length ? lista.reduce((s, l) => s + (l.nota || 0), 0) / lista.length : 0;
      const chs = lista.map(valorChance).filter((x) => x != null);
      q("resumo").innerHTML = `
        <div><b>${lista.length}</b><span>no mapa</span></div>
        <div><b>${lista.length ? fmt1(media) : "–"}</b><span>nota média</span></div>
        <div><b>${lista.length ? Math.round((abertos / lista.length) * 100) + "%" : "–"}</b><span>abertos agora</span></div>
        <div><b>${chs.length ? Math.round(chs.reduce((a, b) => a + b, 0) / chs.length) + "%" : "–"}</b><span>chance média</span></div>`;
      q("sem-geo").hidden = !semGeo;
      q("sem-geo").textContent = semGeo ? `${semGeo} ${semGeo === 1 ? "lead veio" : "leads vieram"} de buscas antigas, sem localização. Eles aparecem no mapa quando forem encontrados de novo numa busca.` : "";
      const vis = lista.slice(0, st.mostrar);
      q("lista").innerHTML = vis.map((l) => linha(l, idx.get(l.id))).join("") +
        (lista.length > vis.length ? `<button type="button" class="rg-chip rg-mais" data-rg="mais">Mostrar mais (${lista.length - vis.length})</button>` : "") +
        (!lista.length ? `<p class="rg-nota">Nada com esses filtros aqui. Aumente o raio ou tire um filtro.</p>` : "");
      if (!mapa) return;
      cMarcas.clearLayers(); marcas = new Map();
      for (const l of [...lista].reverse()) { // os melhores ficam por cima
        const ix = idx.get(l.id);
        const mk = L.marker([l.dados.geo.lat, l.dados.geo.lng], { icon: pino(L, ix), zIndexOffset: 1000 - ix.pos })
          .bindPopup(popup(l, ix)).on("click", () => marcar(l.id, false));
        mk.addTo(cMarcas); marcas.set(l.id, mk);
      }
      if (cRaio) { cRaio.remove(); cRaio = null; }
      if (st.centro) cRaio = L.circle([st.centro.lat, st.centro.lng], { radius: st.raio * 1000, color: "#0f5f4f", weight: 2, fillOpacity: 0.07 }).addTo(mapa);
      if (ajustar) {
        const alvo = st.centro ? limitesArea({ circ: { ...st.centro, raio: st.raio } })
          : cMarcas.getLayers().length ? cMarcas.getBounds() : limitesArea(o.area);
        if (alvo) mapa.fitBounds(alvo, { padding: [24, 24], maxZoom: 15 }); else mapa.setView([-14.5, -51], 4);
      }
    }

    function marcar(id, voar) {
      st.sel = id;
      el.querySelectorAll(".rg-item").forEach((b) => b.classList.toggle("sel", b.dataset.id === id));
      const mk = marcas.get(id);
      if (mk && voar) { mapa.setView(mk.getLatLng(), Math.max(mapa.getZoom(), 15)); mk.openPopup(); }
    }

    function preencherNichos() {
      const ns = [...new Set(o.leads.map((l) => l.nicho).filter(Boolean))].sort();
      q("nicho").innerHTML = `<option value="">Todos os nichos</option>` + ns.map((n) => `<option${n === st.nicho ? " selected" : ""}>${esc(n)}</option>`).join("");
      if (st.nicho && !ns.includes(st.nicho)) st.nicho = "";
      q("nicho").hidden = ns.length < 2;
    }

    el.addEventListener("click", (e) => {
      const h = e.target.closest("[data-h]");
      if (h) {
        st.horario = h.dataset.h;
        el.querySelectorAll("[data-h]").forEach((b) => b.setAttribute("aria-pressed", b === h));
        q("em").hidden = st.horario !== "em";
        return desenhar(false);
      }
      const f = e.target.closest("[data-f]");
      if (f) { st[f.dataset.f] = !st[f.dataset.f]; f.setAttribute("aria-pressed", st[f.dataset.f]); return desenhar(false); }
      if (e.target.closest('[data-rg="mais"]')) { st.mostrar += 30; return desenhar(false); }
      if (e.target.closest('[data-rg="limpar-raio"]')) { st.centro = null; q("limpar-raio").hidden = true; return desenhar(true); }
      if (e.target.closest('[data-rg="gps"]')) {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition((p) => definirCentro({ lat: p.coords.latitude, lng: p.coords.longitude }),
          () => { q("dica").textContent = "Não consegui sua localização. Toque no mapa para marcar o centro."; }, { timeout: 10000 });
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
    q("raio").addEventListener("input", (e) => {
      st.raio = +e.target.value; q("raio-v").textContent = `${st.raio} km`;
      if (st.centro) desenhar(false);
    });
    q("raio").addEventListener("change", () => st.centro && desenhar(true));
    q("dia").value = String(st.dia);

    function definirCentro(c) {
      st.centro = c; q("limpar-raio").hidden = false;
      q("dica").textContent = "Centro marcado. Arraste o raio para abrir ou fechar a área.";
      desenhar(true);
    }

    preencherNichos();
    desenhar(false);
    carregarLeaflet().then((Lf) => {
      L = Lf;
      mapa = L.map(q("mapa"), { scrollWheelZoom: false });
      camadaBase(L).addTo(mapa);
      cArea = desenharArea(L, mapa, o.area);
      cMarcas = L.featureGroup().addTo(mapa);
      mapa.on("click", (e) => definirCentro({ lat: e.latlng.lat, lng: e.latlng.lng }));
      mapa.on("popupopen", (e) => {
        const b = e.popup.getElement().querySelector("[data-abrir]");
        if (b && o.onAbrir) b.onclick = () => o.onAbrir(b.dataset.abrir);
      });
      desenhar(true);
      setTimeout(() => mapa.invalidateSize(), 80);
    }).catch(() => { q("mapa").innerHTML = `<p class="rg-nota" style="padding:16px">Não consegui carregar o mapa (sem internet). O ranking abaixo funciona mesmo assim.</p>`; });

    return {
      atualizar(novas) {
        o = { ...o, ...novas };
        if (novas.area !== undefined && mapa) { if (cArea) cArea.remove(); cArea = desenharArea(L, mapa, o.area); }
        st.mostrar = 30; preencherNichos(); desenhar(true);
      },
      redimensionar() { if (mapa) setTimeout(() => mapa.invalidateSize(), 50); },
      destruir() { if (mapa) mapa.remove(); el.innerHTML = ""; },
    };
  }

  window.Regiao = { UFS, PRESETS, DIAS, distKm, caixaCirculo, tamanhoKm, dividir, gradePara, bboxUF, capitais,
    regioesDoEstado, abertoEm, abertoAgora, horarioHoje, indices, corIndice, carregarLeaflet, mapaArea, painelMapa, estilos };
})();
