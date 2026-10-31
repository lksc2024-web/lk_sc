// Central: controle de projetos, serviços, hospedagens, prospecção, clientes e mensagens.
// Mesmo banco e mesmo login do app de Prospecção (Supabase). Front em JS puro, sem build.
(function () {
"use strict";
var SUPABASE_URL = "https://bxjyxfoisqjkijxoeysu.supabase.co";
var SUPABASE_KEY = "sb_publishable_em9lB9ZwTDvfHV3kds9jpg_D0oxdWJA";
var PROSPECCAO_URL = "https://prospeccao-lk.vercel.app";
var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
var REDUZ = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
var KIWIFY_TAXA = 0.0899, KIWIFY_FIXO = 2.49;

/* ───────────── utilidades ───────────── */
function $(s, r) { return (r || document).querySelector(s); }
function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function n(v) { v = +v; return isFinite(v) ? v : 0; }
function brl(v, d) { return n(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: d == null ? 2 : d, maximumFractionDigits: d == null ? 2 : d }); }
function int(v) { return Math.round(n(v)).toLocaleString("pt-BR"); }
function k(v) { v = n(v); if (Math.abs(v) >= 1e6) return (v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " mi"; if (Math.abs(v) >= 1e4) return (v / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " mil"; return int(v); }
function pct(v, d) { return n(v).toLocaleString("pt-BR", { minimumFractionDigits: d == null ? 1 : d, maximumFractionDigits: d == null ? 1 : d }) + "%"; }
function pad(x) { return String(x).padStart(2, "0"); }
function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
function diaDe(ts) { return ts ? iso(new Date(ts)) : ""; }
function addDias(s, q) { var p = s.split("-").map(Number); return iso(new Date(p[0], p[1] - 1, p[2] + q)); }
function curta(s) { var p = s.split("-"); return p[2] + "/" + p[1]; }
function hoje() { return iso(new Date()); }
function css(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }
function liquidoKiwify(p) { return Math.max(0, n(p) * (1 - KIWIFY_TAXA) - KIWIFY_FIXO); }
function primeiroNome(s) { return String(s || "").trim().split(/\s+/)[0] || ""; }
function slug(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 34) || "link"; }
function quando(ts) {
  if (!ts) return "—";
  var s = Math.round((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return "agora"; var m = Math.round(s / 60); if (m < 60) return m + " min";
  var h = Math.round(m / 60); if (h < 24) return h + " h"; var d = Math.round(h / 24); if (d < 30) return d + " d";
  return new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
function toast(msg) { var t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove("on"); }, 2800); }
function erro(e, padrao) { console.error(e); toast((e && e.message) ? "Não deu certo: " + e.message : (padrao || "Não deu certo. Tente de novo.")); }
function telWa(t) { var d = String(t || "").replace(/\D/g, ""); if (!d) return ""; if (d.length === 10 || d.length === 11) d = "55" + d; return d.length >= 12 ? d : ""; }
function copiar(txt) { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(function () { toast("Copiado."); }, function () { toast("Não deu para copiar. Segure e copie manualmente."); }); else toast("Segure e copie manualmente."); }
function sparkSVG(arr) {
  if (!arr.length) arr = [0, 0];
  var w = 160, h = 28, max = Math.max.apply(null, arr), min = Math.min.apply(null, arr), rg = (max - min) || 1;
  var pts = arr.map(function (v, i) { return [i * (w / (arr.length - 1 || 1)), h - 2 - (v - min) / rg * (h - 6)]; });
  var d = pts.map(function (p, i) { return (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" ");
  return '<svg class="spark" viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="none" aria-hidden="true"><path class="a" d="' + d + " L" + w + " " + h + " L0 " + h + ' Z"/><path class="s" d="' + d + '"/></svg>';
}
var ICON = {
  geral: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
  projetos: '<svg viewBox="0 0 24 24"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>',
  hospedagens: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01M11 7.5h6M11 16.5h6"/></svg>',
  investir: '<svg viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>',
  prospeccao: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.3-4.3"/><path d="M11 8v6M8 11h6"/></svg>',
  clientes: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 010 7M18 14.8c1.8.7 3 2.5 3.5 5.2"/></svg>',
  mensagens: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H8l-4 4V5z"/><path d="M8 9h8M8 12.5h5"/></svg>',
  conexoes: '<svg viewBox="0 0 24 24"><path d="M9 7V3M15 7V3"/><path d="M6 7h12v4a6 6 0 01-12 0V7z"/><path d="M12 17v4"/></svg>',
  agenda: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8 14h3"/></svg>',
  responder: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H8l-4 4V5z"/><path d="M13 8l-3 2.5 3 2.5"/><path d="M10 10.5h4.5a2 2 0 012 2v.5"/></svg>',
  portfolio: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M3 13l5-4 4 3 3-2 6 4"/><path d="M8 21h8M12 17v4"/></svg>',
  mic: '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21M8.5 21h7"/></svg>',
  mais: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
  mais_: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  wa: '<svg viewBox="0 0 24 24"><path d="M4 20l1.3-4A8 8 0 1112 20a8 8 0 01-3.9-1L4 20z"/></svg>',
  ext: '<svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5"/></svg>',
  copia: '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 011-1h10"/></svg>',
  cima: '<svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>',
  baixo: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>'
};
var TIPOS = { produto: "Produto digital", servico: "Serviço", site: "Site / hospedagem", lancamento: "Lançamento", conteudo: "Conteúdo / vídeos", outro: "Outro" };
var PLATAFORMAS = ["Kiwify", "Hotmart", "Eduzz", "Pix / direto", "Instagram", "TikTok", "YouTube", "Vercel", "Manual", "Outra"];
var CANAIS = ["TikTok", "Instagram", "YouTube", "Anúncios", "WhatsApp", "Indicação", "Google", "Geral"];
var LEAD_ST = [["novo", "Novo", "--muted"], ["contatado", "Contatado", "--info"], ["respondeu", "Respondeu", "--warn"], ["reuniao", "Reunião", "--accent"], ["fechado", "Fechado", "--ok"], ["descartado", "Descartado", "--bad"]];
var CLI_ST = [["ativo", "Ativo", "--ok"], ["recorrente", "Recorrente", "--info"], ["retomar", "Retomar", "--warn"], ["encerrado", "Encerrado", "--muted"]];
var OBJETIVOS = { prospeccao: "Prospecção", captacao: "Captação", retomada: "Retomada", continuidade: "Continuidade", pos_venda: "Pós-venda", resposta: "Resposta ao cliente", portfolio: "Envio de projeto" };

/* ───────────── estado ───────────── */
var S = {
  user: null, cfg: null, perfil: {},
  projetos: [], metricas: [], vendas: [], clientes: [], leads: [], links: [], cliques: [], modelos: [], disparos: [], agenda: [],
  dias: 30, view: "geral", status: {}, statusEm: null,
  filtro: { ptipo: "negocio", pbusca: "", lnicho: "", lbusca: "", lmodo: "kanban", cst: "", cbusca: "" },
  camp: { publico: "lead", nicho: "", st: ["novo"], modelo: "", feitos: {} },
  msgTab: "campanha"
};
var CH = {}, CENA = { login: null, hero: null };
function matarGraficos() { Object.keys(CH).forEach(function (id) { CH[id].destroy(); delete CH[id]; }); if (CENA.hero) { CENA.hero.parar(); CENA.hero = null; } }


/* núcleo compartilhado (nucleo.js) */
var NUC = window.Nucleo;
var norm = NUC.norm, radical = NUC.radical, tokensNome = NUC.tokensNome, numero = NUC.numero, somaDias = NUC.somaDias,
  extrairData = NUC.extrairData, extrairValor = NUC.extrairValor, extrairNomeNovo = NUC.extrairNomeNovo,
  GATILHOS = NUC.GATILHOS, classificar = NUC.classificar, limparOCR = NUC.limparOCR, grupoNicho = NUC.grupoNicho;
function baseNomes() { return { leads: S.leads, clientes: S.clientes, projetos: projetosNegocio() }; }
function candidatos(t) { return NUC.candidatos(t, baseNomes()); }
function interpretar(t) { return NUC.interpretar(t, baseNomes()); }

/* ───────────── login ───────────── */
function mostrarLogin() {
  $("#tela-app").hidden = true; $("#tela-login").hidden = false;
  if (!CENA.login && window.C3D) CENA.login = C3D.login($("#login-3d"));
  fimBoot();
}
function fimBoot() { $("#boot").classList.add("fora"); setTimeout(function () { $("#boot").hidden = true; }, 400); }
$("#form-login").addEventListener("submit", async function (e) {
  e.preventDefault();
  var email = $("#l-email").value.trim(), senha = $("#l-senha").value;
  if (!email || !senha) { $("#login-msg").textContent = "Preencha e-mail e senha."; return; }
  var b = $("#btn-entrar"); b.disabled = true; b.textContent = "Entrando…"; $("#login-msg").textContent = "";
  var r = await sb.auth.signInWithPassword({ email: email, password: senha });
  b.disabled = false; b.textContent = "Entrar";
  if (r.error) $("#login-msg").textContent = r.error.message === "Invalid login credentials" ? "E-mail ou senha incorretos." : r.error.message;
});
$("#btn-google").addEventListener("click", async function () {
  var r = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin } });
  if (r.error) $("#login-msg").textContent = /not enabled|Unsupported provider/i.test(r.error.message) ? "O login com Google ainda está sendo ativado. Por enquanto, entre com e-mail e senha." : r.error.message;
});
$("#btn-sair").addEventListener("click", function () { sb.auth.signOut(); });

var iniciado = false;
sb.auth.onAuthStateChange(function (ev, sessao) {
  if (sessao && sessao.user) { if (!iniciado || ev === "SIGNED_IN" && (!S.user || S.user.id !== sessao.user.id)) entrar(sessao.user); }
  else { iniciado = false; S.user = null; matarGraficos(); $("#fab-voz").hidden = true; mostrarLogin(); }
});

async function entrar(user) {
  iniciado = true; S.user = user;
  if (CENA.login) { CENA.login.parar(); CENA.login = null; }
  $("#tela-login").hidden = true;
  try { await carregarTudo(); } catch (e) { erro(e, "Não deu para carregar seus dados."); }
  $("#tela-app").hidden = false;
  fimBoot();
  montarMenu();
  var h = (location.hash || "").replace("#", "");
  if (lerCompartilhado()) h = "responder";
  ir(VIEWS.some(function (v) { return v[0] === h; }) ? h : "geral");
  ouvirAoVivo();
  $("#fab-voz").hidden = false;
  resumoDoDia(); checarLembretes();
}

/* ───────────── dados ───────────── */
async function carregarTudo() {
  var desde = addDias(hoje(), -400);
  var q = await Promise.all([
    sb.from("central_config").select("*").maybeSingle(),
    sb.from("config").select("perfil").maybeSingle(),
    sb.from("projetos").select("*").order("criado_em"),
    sb.from("metricas").select("*").gte("data", desde),
    sb.from("vendas").select("id,projeto_id,cliente_id,origem,status,produto_nome,valor_bruto,valor_liquido,cliente_nome,cliente_email,cliente_tel,canal,criado_em").gte("criado_em", desde).order("criado_em", { ascending: false }),
    sb.from("clientes").select("*").order("criado_em", { ascending: false }),
    sb.from("leads").select("id,nome,categoria,nicho,telefone,tel_digitos,tel_tipo,whatsapp,email,site,instagram,endereco,bairro,cidade,uf,nota,avaliacoes,maps,fechado,enriquecido,buscas,whatsapp_origem,facebook,linkedin,status,obs,historico,ultimo_contato,criado_em,atualizado_em,dados"),
    sb.from("links").select("*").order("criado_em"),
    sb.from("cliques").select("link_id,projeto_id,canal,criado_em").gte("criado_em", addDias(hoje(), -120)),
    sb.from("modelos").select("*").order("criado_em"),
    sb.from("disparos").select("*").gte("criado_em", addDias(hoje(), -120)),
    sb.from("agenda").select("*").or("status.eq.pendente,quando.gte." + addDias(hoje(), -60)).order("quando")
  ]);
  q.forEach(function (r) { if (r.error) throw r.error; });
  S.cfg = q[0].data;
  if (!S.cfg) { var c = await sb.from("central_config").insert({}).select().single(); if (c.error) throw c.error; S.cfg = c.data; }
  S.perfil = (q[1].data && q[1].data.perfil) || {};
  S.projetos = q[2].data || []; S.metricas = q[3].data || []; S.vendas = q[4].data || []; S.clientes = q[5].data || [];
  S.leads = q[6].data || []; S.links = q[7].data || []; S.cliques = q[8].data || []; S.modelos = q[9].data || []; S.disparos = q[10].data || []; S.agenda = q[11].data || [];
  $("#side-nome").textContent = S.perfil.nome ? "Olá, " + S.perfil.nome : (S.user.email || "");
}
function ouvirAoVivo() {
  try {
    sb.channel("central-vendas").on("postgres_changes", { event: "*", schema: "public", table: "vendas" }, function (p) {
      var v = p.new; if (!v || !v.id) return;
      var i = S.vendas.findIndex(function (x) { return x.id === v.id; });
      if (i >= 0) S.vendas[i] = v; else S.vendas.unshift(v);
      if (p.eventType === "INSERT" && v.status === "aprovada") toast("Venda aprovada · " + (v.produto_nome || "produto") + " · " + brl(v.valor_bruto));
      if (p.eventType === "INSERT" && v.status === "abandonada") toast("Carrinho abandonado · " + (v.produto_nome || "produto"));
      sb.from("projetos").select("*").order("criado_em").then(function (r) { if (!r.error) S.projetos = r.data; });
      sb.from("clientes").select("*").order("criado_em", { ascending: false }).then(function (r) { if (!r.error) { S.clientes = r.data; if (S.view === "geral" || S.view === "clientes") render(); } });
    }).subscribe(function (st) { $("#live").classList.toggle("off", st !== "SUBSCRIBED"); });
  } catch (e) { $("#live").classList.add("off"); }
}

/* ───────────── cálculos ───────────── */
function janela(off) { var fim = addDias(hoje(), -(off || 0) * S.dias), ini = addDias(fim, -(S.dias - 1)); return { ini: ini, fim: fim }; }
function dentro(d, w) { return d >= w.ini && d <= w.fim; }
function totais(w, filtroProj) {
  var t = { views: 0, cliques: 0, vendas: 0, receita: 0, gasto: 0, reemb: 0, abandonos: 0 };
  var ok = function (pid) { return !filtroProj || filtroProj(pid); };
  S.metricas.forEach(function (m) { if (dentro(m.data, w) && ok(m.projeto_id)) { t.views += n(m.views); t.cliques += n(m.cliques); t.vendas += n(m.vendas); t.receita += n(m.receita); t.gasto += n(m.gasto); } });
  S.vendas.forEach(function (v) {
    var d = diaDe(v.criado_em); if (!dentro(d, w) || !ok(v.projeto_id)) return;
    if (v.status === "aprovada") { t.vendas++; t.receita += n(v.valor_liquido); }
    else if (v.status === "reembolsada" || v.status === "chargeback") t.reemb++;
    else if (v.status === "abandonada") t.abandonos++;
  });
  S.cliques.forEach(function (c) { if (dentro(diaDe(c.criado_em), w) && ok(c.projeto_id)) t.cliques++; });
  t.lucro = t.receita - t.gasto;
  t.ctr = t.views ? t.cliques / t.views * 100 : 0;
  t.conv = t.cliques ? t.vendas / t.cliques * 100 : 0;
  t.roi = t.gasto ? (t.receita - t.gasto) / t.gasto : null;
  return t;
}
function serie(campo, filtroProj, w) {
  w = w || janela(0);
  var dias = [], idx = {};
  for (var d = w.ini; d <= w.fim; d = addDias(d, 1)) { idx[d] = dias.length; dias.push({ d: d, receita: 0, gasto: 0, vendas: 0, views: 0, cliques: 0 }); }
  var ok = function (pid) { return !filtroProj || filtroProj(pid); };
  S.metricas.forEach(function (m) { var i = idx[m.data]; if (i == null || !ok(m.projeto_id)) return; dias[i].receita += n(m.receita); dias[i].gasto += n(m.gasto); dias[i].vendas += n(m.vendas); dias[i].views += n(m.views); dias[i].cliques += n(m.cliques); });
  S.vendas.forEach(function (v) { var i = idx[diaDe(v.criado_em)]; if (i == null || !ok(v.projeto_id) || v.status !== "aprovada") return; dias[i].receita += n(v.valor_liquido); dias[i].vendas++; });
  S.cliques.forEach(function (c) { var i = idx[diaDe(c.criado_em)]; if (i == null || !ok(c.projeto_id)) return; dias[i].cliques++; });
  return campo ? dias.map(function (x) { return x[campo]; }) : dias;
}
function agrupar(dias, max) {
  if (dias.length <= max) return dias;
  var tam = Math.ceil(dias.length / max), out = [];
  for (var i = 0; i < dias.length; i += tam) {
    var g = { d: dias[i].d, receita: 0, gasto: 0, vendas: 0, views: 0, cliques: 0 };
    dias.slice(i, i + tam).forEach(function (x) { g.receita += x.receita; g.gasto += x.gasto; g.vendas += x.vendas; g.views += x.views; g.cliques += x.cliques; });
    out.push(g);
  }
  return out;
}
function delta(a, b) { if (!b) return { txt: a ? "novo no período" : "—", cls: "flat" }; var d = (a - b) / b * 100; return { txt: (d >= 0 ? "▲ " : "▼ ") + pct(Math.abs(d), 0) + " vs anterior", cls: Math.abs(d) < 1 ? "flat" : d > 0 ? "up" : "down" }; }
function indice(t) { if (t.views < 1000 || t.cliques < 30) return null; var a = Math.min(t.ctr / 1, 1), b = Math.min(t.conv / 2, 1); return Math.round(100 * (0.4 * a + 0.6 * b)); }
function decisao(p) {
  var t = totais(janela(0), function (pid) { return pid === p.id; });
  var w30 = { ini: addDias(hoje(), -29), fim: hoje() };
  var r30 = totais(w30, function (pid) { return pid === p.id; }).receita;
  var ix = indice(t), meta = n(p.meta_mensal), prog = meta ? r30 / meta : null;
  var o = { p: p, t: t, ix: ix, prog: prog };
  if (p.status !== "ativo") { o.tag = "dados"; o.lab = p.status === "pausado" ? "Pausado" : "Encerrado"; o.txt = "Projeto " + (p.status === "pausado" ? "pausado." : "encerrado."); return o; }
  if (!t.views && !t.vendas && !t.receita && !t.cliques) { o.tag = "dados"; o.lab = "Sem dados"; o.txt = p.plataforma === "Kiwify" ? "Assim que a Kiwify avisar a primeira venda, os números aparecem aqui." : "Registre o resultado do primeiro dia ou crie um link rastreado para começar a medir."; return o; }
  if (t.roi != null && t.roi < 0) { o.tag = "pausar"; o.lab = "Cortar gasto"; o.txt = "Cada R$ 1 investido volta " + brl(1 + t.roi) + ". Corte o anúncio e melhore a oferta antes de investir de novo."; return o; }
  if (prog != null && prog >= 1) { o.tag = "meta"; o.lab = "Meta batida"; o.txt = "Meta do mês em " + pct(prog * 100, 0) + ". Hora de subir a meta ou o preço."; return o; }
  if ((ix != null && ix >= 75) || (prog != null && prog >= 0.8)) { o.tag = "escalar"; o.lab = "Escalar"; o.txt = t.roi != null ? "Cada R$ 1 investido volta " + brl(1 + t.roi) + ". Aumente o investimento uns 20% por vez." : "Números acima da meta. Poste mais nesse formato e teste um anúncio pequeno."; return o; }
  if (ix != null && ix < 40) { o.tag = "pausar"; o.lab = "Repensar oferta"; o.txt = "Cliques e conversão abaixo da meta. Troque o ângulo antes de investir."; return o; }
  if (ix != null) { o.tag = "ajustar"; o.lab = "Ajustar"; o.txt = t.ctr < 1 ? "Pouca gente clica no link. Teste ganchos novos e uma chamada mais clara." : "Muita visita e pouca venda. Revise promessa, prova e preço da página."; return o; }
  if (prog != null) { o.tag = "ajustar"; o.lab = "Abaixo da meta"; o.txt = "Meta do mês em " + pct(prog * 100, 0) + ". Faltam " + brl(Math.max(0, meta - r30), 0) + "."; return o; }
  o.tag = "dados"; o.lab = "Medindo"; o.txt = "Vendas chegando. Registre views e use o link rastreado para medir a conversão."; return o;
}
function projetosNegocio() { return S.projetos.filter(function (p) { return p.tipo !== "site"; }); }
function sites() { return S.projetos.filter(function (p) { return p.tipo === "site"; }); }
function nomeProj(id) { var p = S.projetos.find(function (x) { return x.id === id; }); return p ? p.nome : ""; }

/* ───────────── navegação ───────────── */
var VIEWS = [
  ["geral", "Visão geral", "Geral", ""],
  ["projetos", "Projetos e serviços", "Projetos", "Negócio"],
  ["hospedagens", "Hospedagens", "Sites", "Negócio"],
  ["investir", "Investimento", "Investir", "Negócio"],
  ["agenda", "Agenda", "Agenda", "Relacionamento"],
  ["responder", "Responder cliente", "Responder", "Relacionamento"],
  ["portfolio", "Portfólio", "Portfólio", "Relacionamento"],
  ["prospeccao", "Prospecção e leads", "Leads", "Relacionamento"],
  ["clientes", "Clientes", "Clientes", "Relacionamento"],
  ["mensagens", "Mensagens", "Mensagens", "Relacionamento"],
  ["conexoes", "Conexões", "Conexões", "Sistema"]
];
function montarMenu() {
  var grp = "", h = "";
  VIEWS.forEach(function (v) {
    if (v[3] && v[3] !== grp) { grp = v[3]; h += '<div class="grp">' + grp + "</div>"; }
    var gA = v[0] === "agenda" ? agGrupos() : null;
    var badge = gA ? gA.atrasados.length + gA.hoje.length : v[0] === "prospeccao" ? S.leads.filter(function (l) { return l.status === "novo"; }).length : v[0] === "clientes" ? S.clientes.filter(function (c) { return c.status === "retomar"; }).length : 0;
    h += '<button type="button" data-v="' + v[0] + '">' + ICON[v[0]] + v[1] + (badge ? '<span class="badge">' + badge + "</span>" : "") + "</button>";
  });
  h += '<div class="grp">Fora do painel</div><a class="menu-link" href="/assistente/">' + ICON.mic + "Assistente</a>";
  $("#menu").innerHTML = h;
  var bot = ["geral", "agenda", "prospeccao", "clientes"];
  $("#bottom").innerHTML = bot.map(function (id) { var v = VIEWS.find(function (x) { return x[0] === id; }); return '<button type="button" data-v="' + id + '">' + ICON[id] + "<span>" + v[2] + "</span></button>"; }).join("") + '<button type="button" id="bot-mais">' + ICON.mais + "<span>Mais</span></button>";
  marcarMenu();
}
function marcarMenu() {
  $$("[data-v]").forEach(function (b) { if (b.dataset.v === S.view) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
  var bm = $("#bot-mais"); if (bm) { if (["responder", "portfolio", "projetos", "hospedagens", "investir", "mensagens", "conexoes"].indexOf(S.view) >= 0) bm.setAttribute("aria-current", "page"); else bm.removeAttribute("aria-current"); }
}
document.addEventListener("click", function (e) {
  var b = e.target.closest("[data-v]"); if (b && !b.closest(".modal")) { ir(b.dataset.v); return; }
  if (e.target.closest("#bot-mais")) abrirMais();
});
function abrirMais() {
  modal("Mais", '<div class="cl">' + ["responder", "portfolio", "projetos", "hospedagens", "mensagens", "investir", "conexoes"].map(function (id) { var v = VIEWS.find(function (x) { return x[0] === id; }); return '<button type="button" class="btn" style="justify-content:flex-start;padding:12px" data-ir="' + id + '">' + ICON[id] + v[1] + "</button>"; }).join("") +
    '<a class="btn" style="justify-content:flex-start;padding:12px" href="/assistente/">' + ICON.mic + 'Assistente (app separado)</a><button type="button" class="btn danger" style="justify-content:flex-start;padding:12px" id="m-sair">Sair da conta</button></div>', function (box) {
    $$("[data-ir]", box).forEach(function (b) { b.onclick = function () { fecharModal(); ir(b.dataset.ir); }; });
    $("#m-sair", box).onclick = function () { fecharModal(); sb.auth.signOut(); };
  });
}
function ir(v) {
  S.view = v; marcarMenu();
  var def = VIEWS.find(function (x) { return x[0] === v; });
  $("#vt").textContent = def ? def[1] : "";
  if (location.hash !== "#" + v) { try { history.replaceState(null, "", "#" + v); } catch (e) {} }
  render(); window.scrollTo(0, 0);
}
$("#seg-dias").addEventListener("click", function (e) {
  var b = e.target.closest("button"); if (!b) return; S.dias = +b.dataset.d;
  $$("button", this).forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); }); render();
});
function acaoTopo(txt, fn) { var b = $("#btn-acao"); if (!txt) { b.hidden = true; b.onclick = null; return; } b.hidden = false; b.innerHTML = ICON.mais_ + '<span class="hide-sm">' + esc(txt) + "</span>"; b.setAttribute("aria-label", txt); b.onclick = fn; }
function render() {
  matarGraficos();
  var usaPeriodo = ["geral", "projetos", "investir"].indexOf(S.view) >= 0;
  $("#seg-dias").hidden = !usaPeriodo;
  $("#btn-custom").hidden = S.view !== "geral";
  acaoTopo(null);
  var fn = { geral: vGeral, projetos: vProjetos, hospedagens: vHospedagens, investir: vInvestir, prospeccao: vProspeccao, clientes: vClientes, mensagens: vMensagens, conexoes: vConexoes, agenda: vAgenda, responder: vResponder, portfolio: vPortfolio }[S.view];
  try { fn($("#conteudo")); } catch (e) { console.error(e); $("#conteudo").innerHTML = '<div class="card vazio"><b>Algo deu errado nesta tela.</b>Recarregue a página. Se continuar, me avise.</div>'; }
}

/* ───────────── modal ───────────── */
function modal(titulo, html, aoMontar, largo) {
  Object.keys(CH).forEach(function (id) { if (id.indexOf("m-") === 0) { CH[id].destroy(); delete CH[id]; } });
  $("#modal-t").textContent = titulo; $("#modal-body").innerHTML = html;
  $(".modal-card").classList.toggle("largo", !!largo);
  $("#modal").hidden = false; document.body.style.overflow = "hidden";
  if (aoMontar) aoMontar($("#modal-body"));
}
function fecharModal() { $("#modal").hidden = true; document.body.style.overflow = ""; Object.keys(CH).forEach(function (id) { if (id.indexOf("m-") === 0) { CH[id].destroy(); delete CH[id]; } }); }
$("#modal").addEventListener("click", function (e) { if (e.target.closest("[data-fechar]")) fecharModal(); });
document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !$("#modal").hidden) fecharModal(); });

/* ───────────── gráficos ───────────── */
function opcoes(extra) {
  var mu = css("--muted"), li = css("--line");
  var o = {
    responsive: true, maintainAspectRatio: false, animation: REDUZ ? false : { duration: 800, easing: "easeOutQuart" },
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: true, position: "top", align: "end", labels: { color: mu, boxWidth: 10, boxHeight: 10, usePointStyle: true, pointStyle: "rectRounded", font: { family: "Geist", size: 12 } } },
      tooltip: { backgroundColor: css("--ink"), titleColor: css("--bg"), bodyColor: css("--bg"), padding: 10, cornerRadius: 8, titleFont: { family: "Geist", weight: "600" }, bodyFont: { family: "Geist Mono" } }
    },
    scales: {
      x: { grid: { display: false }, border: { color: li }, ticks: { color: mu, font: { family: "Geist", size: 11 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 7 } },
      y: { grid: { color: li }, border: { display: false }, ticks: { color: mu, font: { family: "Geist Mono", size: 11 }, maxTicksLimit: 5 }, beginAtZero: true }
    }
  };
  return Object.assign(o, extra || {});
}

/* ═════════════ VISÃO GERAL ═════════════ */
var WIDGETS = [
  { id: "kpis", nome: "Indicadores principais", w: "w-full" },
  { id: "agenda", nome: "Agenda de hoje e retomadas", w: "w-full" },
  { id: "hero", nome: "Receita x investimento em 3D", w: "w-2" },
  { id: "feed", nome: "Acontecendo agora", w: "w-1" },
  { id: "decisoes", nome: "Onde investir e onde cortar", w: "w-2" },
  { id: "metas", nome: "Metas do mês", w: "w-1" },
  { id: "crm", nome: "Funil de prospecção", w: "w-1" },
  { id: "ranking", nome: "Projetos por lucro", w: "w-1" },
  { id: "hosp", nome: "Sites no ar", w: "w-1" },
  { id: "receita", nome: "Receita por dia (gráfico)", w: "w-full" }
];
function layout() {
  var l = (S.cfg && S.cfg.layout) || {}; var ordem = Array.isArray(l.ordem) ? l.ordem.slice() : WIDGETS.map(function (w) { return w.id; });
  WIDGETS.forEach(function (w) { if (ordem.indexOf(w.id) < 0) { if (w.id === "agenda") { var ik = ordem.indexOf("kpis"); ordem.splice(ik >= 0 ? ik + 1 : 0, 0, w.id); } else ordem.push(w.id); } });
  ordem = ordem.filter(function (id) { return WIDGETS.some(function (w) { return w.id === id; }); });
  return { ordem: ordem, off: Array.isArray(l.off) ? l.off : ["receita"] };
}
async function salvarLayout(l) { S.cfg.layout = l; var r = await sb.from("central_config").update({ layout: l, atualizado_em: new Date().toISOString() }).eq("user_id", S.user.id); if (r.error) erro(r.error); }
$("#btn-custom").addEventListener("click", function () {
  function lista() {
    var l = layout();
    return l.ordem.map(function (id, i) { var w = WIDGETS.find(function (x) { return x.id === id; }); var on = l.off.indexOf(id) < 0;
      return '<div class="cl-i"><label><input type="checkbox" data-tg="' + id + '"' + (on ? " checked" : "") + ">" + esc(w.nome) + '</label><button type="button" data-up="' + id + '" aria-label="Subir"' + (i === 0 ? " disabled" : "") + ">" + ICON.cima + '</button><button type="button" data-dn="' + id + '" aria-label="Descer"' + (i === l.ordem.length - 1 ? " disabled" : "") + ">" + ICON.baixo + "</button></div>"; }).join("");
  }
  modal("Personalizar a visão geral", '<p class="hint">Ligue, desligue e mude a ordem dos blocos. Fica salvo na sua conta e vale em qualquer aparelho.</p><div class="cl" id="cl">' + lista() + '</div><div class="acoes"><button class="btn pri" data-fechar type="button">Pronto</button></div>', function (box) {
    var cl = $("#cl", box);
    cl.addEventListener("change", function (e) { var id = e.target.dataset.tg; if (!id) return; var l = layout(); var i = l.off.indexOf(id); if (e.target.checked) { if (i >= 0) l.off.splice(i, 1); } else if (i < 0) l.off.push(id); salvarLayout(l); render(); });
    cl.addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; var id = b.dataset.up || b.dataset.dn; var l = layout(); var o = l.ordem, i = o.indexOf(id), j = b.dataset.up ? i - 1 : i + 1; if (j < 0 || j >= o.length) return; o[i] = o[j]; o[j] = id; salvarLayout(l); cl.innerHTML = lista(); render(); });
  });
});
function vGeral(box) {
  var l = layout();
  box.innerHTML = '<div class="grid">' + l.ordem.filter(function (id) { return l.off.indexOf(id) < 0; }).map(function (id) {
    var w = WIDGETS.find(function (x) { return x.id === id; });
    return id === "kpis" ? '<div class="w-full" id="w-kpis"></div>' : '<div class="card ' + w.w + (id === "hero" ? " hero3d" : "") + '" id="w-' + id + '"></div>';
  }).join("") + "</div>";
  var fns = { agenda: wAgenda, kpis: wKpis, hero: wHero, feed: wFeed, decisoes: wDecisoes, metas: wMetas, crm: wCrm, ranking: wRanking, hosp: wHosp, receita: wReceita };
  l.ordem.forEach(function (id) { var el = $("#w-" + id); if (el) fns[id](el); });
}
function wKpis(el) {
  var w = janela(0), a = janela(1), T = totais(w), A = totais(a), s = serie(null);
  var leadsN = S.leads.filter(function (x) { return dentro(diaDe(x.criado_em), w); }).length, leadsA = S.leads.filter(function (x) { return dentro(diaDe(x.criado_em), a); }).length;
  var fech = S.leads.filter(function (x) { return x.status === "fechado"; }).length;
  var cliAtivos = S.clientes.filter(function (c) { return c.status === "ativo" || c.status === "recorrente"; }).length;
  var it = [
    { l: "Receita líquida", v: brl(T.receita, 0), d: delta(T.receita, A.receita), s: s.map(function (x) { return x.receita; }) },
    { l: "Lucro", v: brl(T.lucro, 0), d: delta(T.lucro, A.lucro), s: s.map(function (x) { return x.receita - x.gasto; }) },
    { l: "Vendas", v: int(T.vendas), d: delta(T.vendas, A.vendas), s: s.map(function (x) { return x.vendas; }) },
    { l: "Views", v: k(T.views), d: delta(T.views, A.views), s: s.map(function (x) { return x.views; }) },
    { l: "Leads novos", v: int(leadsN), d: delta(leadsN, leadsA), s: null, extra: fech + " fechados no total" },
    { l: "Clientes ativos", v: int(cliAtivos), d: { txt: S.clientes.filter(function (c) { return c.status === "retomar"; }).length + " para retomar", cls: "flat" }, s: null }
  ];
  el.innerHTML = '<div class="kpis">' + it.map(function (x) { return '<div class="kpi"><span class="l">' + x.l + '</span><span class="v num">' + x.v + '</span><span class="d ' + x.d.cls + '">' + x.d.txt + "</span>" + (x.s ? sparkSVG(x.s) : '<span class="sub" style="margin-top:6px">' + esc(x.extra || "") + "</span>") + "</div>"; }).join("") + "</div>";
}
function wHero(el) {
  var dias = agrupar(serie(null), 60), T = totais(janela(0));
  el.innerHTML = '<canvas aria-label="Gráfico 3D de receita e investimento por dia"></canvas><div class="over"><div><div class="lab">Receita líquida · ' + (S.dias === 365 ? "12 meses" : S.dias + " dias") + '</div><div class="big">' + brl(T.receita, 0) + '</div></div><div style="text-align:right"><div class="lab">Investido</div><div class="num" style="font-size:18px;font-weight:600">' + brl(T.gasto, 0) + '</div></div></div><div class="legend3d"><span><i style="background:var(--accent)"></i>Receita</span><span><i style="background:var(--info)"></i>Investimento</span><span>Arraste para girar</span></div>';
  if (!window.C3D || !C3D.disponivel()) return;
  CENA.hero = C3D.horizonte($("canvas", el), { a: dias.map(function (x) { return x.receita; }), b: dias.map(function (x) { return x.gasto; }), corA: css("--accent"), corB: css("--info"), chao: css("--panel-2"), linha: css("--line") });
}
function eventos() {
  var ev = [];
  S.vendas.slice(0, 40).forEach(function (v) {
    var m = { aprovada: ["ok", "R$", "Venda aprovada"], abandonada: ["warn", "!", "Carrinho abandonado"], reembolsada: ["bad", "↩", "Reembolso"], chargeback: ["bad", "↩", "Chargeback"], pendente: ["info", "…", "Pagamento pendente"], recusada: ["bad", "×", "Pagamento recusado"] }[v.status] || ["info", "•", v.status];
    ev.push({ t: v.criado_em, ic: m[0], s: m[1], titulo: m[2] + (v.status === "aprovada" || v.status === "reembolsada" ? " · " + brl(v.valor_bruto) : ""), sub: (v.produto_nome || "Produto") + (v.cliente_nome ? " · " + v.cliente_nome : "") });
  });
  S.disparos.slice(-40).forEach(function (d) { var alvo = d.publico === "lead" ? S.leads.find(function (l) { return l.id === d.destinatario_id; }) : S.clientes.find(function (c) { return c.id === d.destinatario_id; }); ev.push({ t: d.criado_em, ic: "info", s: "→", titulo: "Mensagem de " + (OBJETIVOS[d.objetivo] || "contato").toLowerCase(), sub: (alvo ? (alvo.nome || alvo.empresa) : "Contato") + " · " + (d.canal === "email" ? "E-mail" : "WhatsApp") }); });
  S.leads.forEach(function (l) { if (l.status === "respondeu" || l.status === "reuniao" || l.status === "fechado") ev.push({ t: l.atualizado_em, ic: l.status === "fechado" ? "ok" : "warn", s: l.status === "fechado" ? "✓" : "↩", titulo: l.status === "fechado" ? "Lead fechado" : l.status === "reuniao" ? "Reunião marcada" : "Lead respondeu", sub: l.nome + " · " + (l.nicho || l.categoria || "") }); });
  return ev.filter(function (e) { return e.t; }).sort(function (a, b) { return a.t < b.t ? 1 : -1; }).slice(0, 14);
}
function wFeed(el) {
  var ev = eventos();
  el.innerHTML = '<div class="card-h"><div><h2>Acontecendo agora</h2><p>Vendas, mensagens e respostas</p></div></div>' + (ev.length ? '<div class="feed">' + ev.map(function (e) { return '<div class="ev"><span class="ic ' + e.ic + '">' + e.s + "</span><div>" + esc(e.titulo) + "<small>" + esc(e.sub) + '</small></div><span class="t">' + quando(e.t) + "</span></div>"; }).join("") + "</div>" : '<div class="vazio"><b>Nada por aqui ainda.</b>Quando uma venda, resposta ou mensagem acontecer, aparece aqui na hora.</div>');
}
function wDecisoes(el) {
  var ds = projetosNegocio().filter(function (p) { return p.status === "ativo"; }).map(decisao).sort(function (a, b) { var o = { pausar: 0, escalar: 1, ajustar: 2, meta: 3, dados: 4 }; return (o[a.tag] - o[b.tag]) || (b.t.receita - a.t.receita); }).slice(0, 6);
  el.innerHTML = '<div class="card-h"><div><h2>Onde investir e onde cortar</h2><p>Recomendação automática pelos números do período</p></div><button class="btn sm" type="button" data-v="projetos">Ver todos</button></div>' +
    (ds.length ? '<div class="dec">' + ds.map(function (o) { return '<div class="dec-item" data-proj="' + o.p.id + '"><span class="tag t-' + o.tag + '">' + esc(o.lab) + "</span><div><b>" + esc(o.p.nome) + "</b><p>" + esc(o.txt) + '</p></div><div class="kv">' + brl(o.t.lucro, 0) + "<small>lucro no período</small></div></div>"; }).join("") + "</div>"
      : '<div class="vazio"><b>Nenhum projeto ainda.</b><button class="btn pri sm" type="button" id="w-novo-proj">Criar o primeiro projeto</button></div>');
  $$("[data-proj]", el).forEach(function (d) { d.onclick = function () { abrirProjeto(d.dataset.proj); }; });
  var b = $("#w-novo-proj", el); if (b) b.onclick = function () { formProjeto(); };
}
function wMetas(el) {
  var ps = projetosNegocio().filter(function (p) { return n(p.meta_mensal) > 0 && p.status === "ativo"; });
  var w30 = { ini: addDias(hoje(), -29), fim: hoje() };
  var meta = ps.reduce(function (s, p) { return s + n(p.meta_mensal); }, 0);
  var feito = ps.reduce(function (s, p) { return s + totais(w30, function (pid) { return pid === p.id; }).receita; }, 0);
  var C = 2 * Math.PI * 45, fr = meta ? Math.min(1, feito / meta) : 0;
  el.innerHTML = '<div class="card-h"><div><h2>Metas do mês</h2><p>Receita dos últimos 30 dias</p></div></div>' + (ps.length ?
    '<div class="meta"><svg class="ring" viewBox="0 0 110 110"><circle class="b" cx="55" cy="55" r="45"/><circle class="f" id="ring-m" cx="55" cy="55" r="45" stroke-dasharray="' + C.toFixed(2) + '" stroke-dashoffset="' + C.toFixed(2) + '"/><text x="55" y="55">' + pct(meta ? feito / meta * 100 : 0, 0) + '</text></svg><div class="meta-l">' +
    ps.slice(0, 4).map(function (p) { var f = totais(w30, function (pid) { return pid === p.id; }).receita; return '<div><div class="row"><span>' + esc(p.nome) + '</span><b class="num">' + pct(f / p.meta_mensal * 100, 0) + '</b></div><div class="minibar"><i style="width:' + Math.min(100, f / p.meta_mensal * 100) + '%"></i></div></div>'; }).join("") + "</div></div>"
    : '<div class="vazio">Defina uma meta mensal em qualquer projeto para acompanhar aqui.</div>');
  var r = $("#ring-m", el); if (r) requestAnimationFrame(function () { r.setAttribute("stroke-dashoffset", (C * (1 - fr)).toFixed(2)); });
}
function wCrm(el) {
  var c = {}; LEAD_ST.forEach(function (s) { c[s[0]] = 0; }); S.leads.forEach(function (l) { c[l.status] = (c[l.status] || 0) + 1; });
  var tot = S.leads.length || 1;
  var etapas = [["Leads", S.leads.length], ["Contatados", c.contatado + c.respondeu + c.reuniao + c.fechado], ["Responderam", c.respondeu + c.reuniao + c.fechado], ["Reunião", c.reuniao + c.fechado], ["Fechados", c.fechado]];
  el.innerHTML = '<div class="card-h"><div><h2>Funil de prospecção</h2><p>Todos os leads do app de prospecção</p></div><button class="btn sm" type="button" data-v="prospeccao">Abrir</button></div><div class="fun">' + etapas.map(function (e, i) {
    var w = i === 0 ? 100 : Math.max(3, Math.sqrt(e[1] / tot) * 100); var tx = i === 0 ? "100%" : pct(etapas[i - 1][1] ? e[1] / etapas[i - 1][1] * 100 : 0, 0) + " da anterior";
    return '<div class="fun-row"><span class="lab">' + e[0] + "<small>" + tx + '</small></span><div class="tr"><i data-w="' + w.toFixed(1) + '"></i></div><b>' + int(e[1]) + "</b></div>"; }).join("") + "</div>";
  $$("[data-w]", el).forEach(function (i) { requestAnimationFrame(function () { i.style.width = i.dataset.w + "%"; }); });
}
function wRanking(el) {
  var w = janela(0);
  var ls = projetosNegocio().map(function (p) { return { p: p, t: totais(w, function (pid) { return pid === p.id; }) }; }).filter(function (x) { return x.t.receita || x.t.gasto; }).sort(function (a, b) { return b.t.lucro - a.t.lucro; }).slice(0, 6);
  var max = Math.max.apply(null, ls.map(function (x) { return Math.abs(x.t.lucro); }).concat([1]));
  el.innerHTML = '<div class="card-h"><div><h2>Projetos por lucro</h2><p>No período</p></div></div>' + (ls.length ? '<div class="bars">' + ls.map(function (x) { return '<div class="bar-row"><span>' + esc(x.p.nome) + ' <span class="sub">· ' + int(x.t.vendas) + ' vendas</span></span><b class="' + (x.t.lucro >= 0 ? "" : "down") + '">' + brl(x.t.lucro, 0) + '</b><div class="tr"><i data-w="' + (Math.abs(x.t.lucro) / max * 100).toFixed(1) + '" style="background:' + (x.t.lucro >= 0 ? "var(--ok)" : "var(--bad)") + '"></i></div></div>'; }).join("") + "</div>" : '<div class="vazio">Nenhuma receita registrada no período.</div>');
  $$("[data-w]", el).forEach(function (i) { requestAnimationFrame(function () { i.style.width = i.dataset.w + "%"; }); });
}
function wHosp(el) {
  var ss = sites(), on = 0, off = 0; ss.forEach(function (s) { var st = S.status[s.id]; if (st) { if (st.ok) on++; else off++; } });
  el.innerHTML = '<div class="card-h"><div><h2>Sites no ar</h2><p>' + ss.length + ' sites hospedados</p></div><button class="btn sm" type="button" data-v="hospedagens">Abrir</button></div>' +
    (S.statusEm ? '<div class="stat-list"><div><span>No ar</span><b class="up">' + on + '</b></div><div><span>Fora do ar</span><b class="' + (off ? "down" : "") + '">' + off + "</b></div><div><span>Última verificação</span><b>" + quando(S.statusEm) + "</b></div></div>"
      : '<div class="stat-list"><div><span>Cadastrados</span><b>' + ss.length + '</b></div></div><p class="hint" style="margin-top:8px">Abra Hospedagens para verificar se todos estão no ar.</p>');
}
function wReceita(el) {
  el.innerHTML = '<div class="card-h"><div><h2>Receita por dia</h2><p>Receita líquida e investimento</p></div></div><div class="chart-box"><canvas></canvas></div>';
  var dias = serie(null), o = opcoes();
  o.scales.y.ticks.callback = function (v) { return "R$ " + k(v); };
  o.plugins.tooltip.callbacks = { label: function (c) { return " " + c.dataset.label + ": " + brl(c.parsed.y); } };
  CH.rec = new Chart($("canvas", el), { data: { labels: dias.map(function (x) { return curta(x.d); }), datasets: [
    { type: "line", label: "Receita líquida", data: dias.map(function (x) { return x.receita; }), borderColor: css("--accent"), backgroundColor: css("--accent") + "22", fill: true, tension: .35, pointRadius: 0, borderWidth: 2 },
    { type: "bar", label: "Investimento", data: dias.map(function (x) { return x.gasto; }), backgroundColor: css("--info"), borderRadius: 3, barPercentage: .6 }
  ] }, options: o });
}

/* ═════════════ PROJETOS ═════════════ */
function vProjetos(box) {
  acaoTopo("Novo projeto", function () { formProjeto(); });
  var f = S.filtro, todos = S.projetos;
  var cont = { negocio: projetosNegocio().length }; Object.keys(TIPOS).forEach(function (t) { cont[t] = todos.filter(function (p) { return p.tipo === t; }).length; });
  var chips = [["negocio", "Todos"]].concat(Object.keys(TIPOS).map(function (t) { return [t, TIPOS[t]]; })).filter(function (c) { return c[0] === "negocio" || cont[c[0]]; });
  var lista = todos.filter(function (p) { return (f.ptipo === "negocio" ? p.tipo !== "site" : p.tipo === f.ptipo) && (!f.pbusca || (p.nome + " " + p.nicho + " " + p.plataforma).toLowerCase().indexOf(f.pbusca.toLowerCase()) >= 0); });
  var ds = lista.map(decisao).sort(function (a, b) { return (a.p.status === "ativo" ? 0 : 1) - (b.p.status === "ativo" ? 0 : 1) || b.t.receita - a.t.receita; });
  var T = totais(janela(0), function (pid) { return lista.some(function (p) { return p.id === pid; }); });
  box.innerHTML = '<div class="kpis"><div class="kpi"><span class="l">Projetos</span><span class="v num">' + lista.length + '</span><span class="d flat">' + lista.filter(function (p) { return p.status === "ativo"; }).length + ' ativos</span></div><div class="kpi"><span class="l">Receita líquida</span><span class="v num">' + brl(T.receita, 0) + '</span><span class="d flat">no período</span></div><div class="kpi"><span class="l">Investido</span><span class="v num">' + brl(T.gasto, 0) + '</span><span class="d flat">' + (T.roi == null ? "sem anúncio" : brl(1 + T.roi) + " por R$ 1") + '</span></div><div class="kpi"><span class="l">Vendas</span><span class="v num">' + int(T.vendas) + '</span><span class="d flat">' + pct(T.conv, 2) + ' de conversão</span></div></div>' +
    '<div class="toolbar"><div class="chips" id="p-chips">' + chips.map(function (c) { return '<button class="chip" type="button" data-t="' + c[0] + '" aria-pressed="' + (f.ptipo === c[0]) + '">' + esc(c[1]) + '<span class="n">' + cont[c[0]] + "</span></button>"; }).join("") + '</div><input class="inp busca" id="p-busca" type="search" placeholder="Buscar projeto" value="' + esc(f.pbusca) + '"></div>' +
    (ds.length ? '<div class="pgrid">' + ds.map(cardProjeto).join("") + "</div>" : '<div class="card vazio"><b>Nenhum projeto aqui.</b>Cadastre um produto, serviço, lançamento ou qualquer coisa que você venda.<button class="btn pri" type="button" id="p-novo">Novo projeto</button></div>');
  $("#p-chips").onclick = function (e) { var b = e.target.closest("[data-t]"); if (b) { f.ptipo = b.dataset.t; render(); } };
  var bu = $("#p-busca"); bu.oninput = function () { f.pbusca = bu.value; clearTimeout(bu._t); bu._t = setTimeout(function () { render(); var x = $("#p-busca"); x.focus(); x.setSelectionRange(x.value.length, x.value.length); }, 250); };
  $$(".pcard", box).forEach(function (c) { c.onclick = function () { abrirProjeto(c.dataset.id); }; });
  var nv = $("#p-novo"); if (nv) nv.onclick = function () { formProjeto(); };
}
function cardProjeto(o) {
  var p = o.p, t = o.t;
  return '<button type="button" class="pcard k-' + o.tag + '" data-id="' + p.id + '"><div class="top"><div><h3>' + esc(p.nome) + '</h3><div class="tipo">' + esc(TIPOS[p.tipo] || p.tipo) + " · " + esc(p.plataforma) + (p.nicho ? " · " + esc(p.nicho) : "") + '</div></div><span class="tag t-' + o.tag + '">' + esc(o.lab) + '</span></div><div class="nums"><div><span>Receita</span><b>' + brl(t.receita, 0) + "</b></div><div><span>Vendas</span><b>" + int(t.vendas) + "</b></div><div><span>" + (t.views ? "Views" : "Cliques") + "</span><b>" + k(t.views || t.cliques) + '</b></div></div><div class="foot"><span>' + esc(o.txt.length > 74 ? o.txt.slice(0, 72) + "…" : o.txt) + "</span></div></button>";
}
function formProjeto(p, tipoPadrao) {
  p = p || { tipo: tipoPadrao || "produto", plataforma: tipoPadrao === "site" ? "Vercel" : "Kiwify", status: "ativo" };
  var opts = function (lista, atual) { return lista.map(function (x) { var v = Array.isArray(x) ? x[0] : x, l = Array.isArray(x) ? x[1] : x; return '<option value="' + esc(v) + '"' + (v === atual ? " selected" : "") + ">" + esc(l) + "</option>"; }).join(""); };
  var cli = '<option value="">Nenhum</option>' + S.clientes.map(function (c) { return '<option value="' + c.id + '"' + (c.id === p.cliente_id ? " selected" : "") + ">" + esc(c.nome || c.empresa) + "</option>"; }).join("");
  modal(p.id ? "Editar projeto" : "Novo projeto", '<form id="fp" class="form" novalidate>' +
    '<div class="f full"><label for="fp-nome">Nome</label><input class="inp" id="fp-nome" required value="' + esc(p.nome || "") + '" placeholder="Ex.: Kit Presente de Natal, Site da Oficina, Pacote de Reels"></div>' +
    '<div class="f"><label for="fp-tipo">Tipo</label><select class="inp" id="fp-tipo">' + opts(Object.keys(TIPOS).map(function (t) { return [t, TIPOS[t]]; }), p.tipo) + "</select></div>" +
    '<div class="f"><label for="fp-plat">Onde vende ou roda</label><select class="inp" id="fp-plat">' + opts(PLATAFORMAS, p.plataforma) + "</select></div>" +
    '<div class="f"><label for="fp-nicho">Nicho</label><input class="inp" id="fp-nicho" value="' + esc(p.nicho || "") + '" placeholder="Ex.: Pet shop, Presentes"></div>' +
    '<div class="f"><label for="fp-preco">Preço (R$)</label><input class="inp" id="fp-preco" type="number" min="0" step="0.01" inputmode="decimal" value="' + (p.preco || "") + '"></div>' +
    '<div class="f"><label for="fp-meta">Meta de receita por mês (R$)</label><input class="inp" id="fp-meta" type="number" min="0" step="1" inputmode="decimal" value="' + (p.meta_mensal || "") + '"></div>' +
    '<div class="f"><label for="fp-st">Status</label><select class="inp" id="fp-st">' + opts([["ativo", "Ativo"], ["pausado", "Pausado"], ["encerrado", "Encerrado"]], p.status) + "</select></div>" +
    '<div class="f"><label for="fp-url">Link (página, site ou checkout)</label><input class="inp" id="fp-url" type="url" value="' + esc(p.url || "") + '" placeholder="https://"></div>' +
    '<div class="f"><label for="fp-cli">Cliente</label><select class="inp" id="fp-cli">' + cli + "</select></div>" +
    '<div class="f full" id="fp-kw-box"><label for="fp-kw">ID do produto na Kiwify (opcional)</label><input class="inp" id="fp-kw" value="' + esc(p.kiwify_produto || "") + '" placeholder="Se vazio, liga pelo nome do produto"></div>' +
    '<div class="f full"><label for="fp-obs">Anotações</label><textarea class="inp" id="fp-obs" style="min-height:70px">' + esc(p.obs || "") + "</textarea></div></form>" +
    '<div class="acoes">' + (p.id ? '<button class="btn danger esq" type="button" id="fp-del">Excluir</button>' : "") + '<button class="btn" type="button" data-fechar>Cancelar</button><button class="btn pri" type="button" id="fp-ok">' + (p.id ? "Salvar" : "Criar projeto") + "</button></div>", function (bx) {
    var kwBox = $("#fp-kw-box", bx), plat = $("#fp-plat", bx);
    function vis() { kwBox.hidden = plat.value !== "Kiwify"; } plat.onchange = vis; vis();
    $("#fp-ok", bx).onclick = async function () {
      var nome = $("#fp-nome", bx).value.trim(); if (!nome) { toast("Dê um nome ao projeto."); return; }
      var url = $("#fp-url", bx).value.trim();
      var d = { nome: nome, tipo: $("#fp-tipo", bx).value, plataforma: plat.value, nicho: $("#fp-nicho", bx).value.trim(), preco: n($("#fp-preco", bx).value), meta_mensal: n($("#fp-meta", bx).value), status: $("#fp-st", bx).value, url: url, dominio: url ? url.replace(/^https?:\/\//, "").replace(/\/.*$/, "") : "", cliente_id: $("#fp-cli", bx).value || null, kiwify_produto: $("#fp-kw", bx).value.trim(), obs: $("#fp-obs", bx).value, atualizado_em: new Date().toISOString() };
      var r = p.id ? await sb.from("projetos").update(d).eq("id", p.id).select().single() : await sb.from("projetos").insert(d).select().single();
      if (r.error) return erro(r.error);
      if (p.id) S.projetos = S.projetos.map(function (x) { return x.id === p.id ? r.data : x; }); else S.projetos.push(r.data);
      fecharModal(); toast(p.id ? "Projeto salvo." : "Projeto criado."); render();
    };
    var del = $("#fp-del", bx);
    if (del) del.onclick = async function () {
      if (del.dataset.c !== "1") { del.dataset.c = "1"; del.textContent = "Confirmar exclusão"; return; }
      var r = await sb.from("projetos").delete().eq("id", p.id); if (r.error) return erro(r.error);
      S.projetos = S.projetos.filter(function (x) { return x.id !== p.id; }); S.metricas = S.metricas.filter(function (m) { return m.projeto_id !== p.id; });
      fecharModal(); toast("Projeto excluído."); render();
    };
  });
}
function abrirProjeto(id) {
  var p = S.projetos.find(function (x) { return x.id === id; }); if (!p) return;
  var o = decisao(p), t = o.t, dias = serie(null, function (pid) { return pid === p.id; });
  var links = S.links.filter(function (l) { return l.projeto_id === p.id; });
  var vendas = S.vendas.filter(function (v) { return v.projeto_id === p.id; }).slice(0, 8);
  var cli = p.cliente_id ? S.clientes.find(function (c) { return c.id === p.cliente_id; }) : null;
  modal(p.nome, '<div class="kpis"><div class="kpi"><span class="l">Receita líquida</span><span class="v num">' + brl(t.receita, 0) + '</span></div><div class="kpi"><span class="l">Lucro</span><span class="v num">' + brl(t.lucro, 0) + '</span></div><div class="kpi"><span class="l">Vendas</span><span class="v num">' + int(t.vendas) + '</span></div><div class="kpi"><span class="l">Views</span><span class="v num">' + k(t.views) + '</span></div><div class="kpi"><span class="l">Cliques</span><span class="v num">' + int(t.cliques) + '</span></div><div class="kpi"><span class="l">Conversão</span><span class="v num">' + pct(t.conv, 2) + "</span></div></div>" +
    '<div class="det"><div class="card"><div class="card-h"><div><h2>Por dia</h2><p>' + (S.dias === 365 ? "12 meses" : S.dias + " dias") + '</p></div><span class="tag t-' + o.tag + '">' + esc(o.lab) + '</span></div><div class="chart-box"><canvas id="m-c"></canvas></div><div class="reco" style="margin-top:12px"><b>Recomendação:</b> ' + esc(o.txt) + "</div></div>" +
    '<div style="display:grid;gap:16px;align-content:start"><div class="card"><div class="card-h"><div><h2>Ficha</h2></div><button class="btn sm" type="button" id="pd-ed">Editar</button></div><div class="stat-list">' +
    [["Tipo", TIPOS[p.tipo] || p.tipo], ["Plataforma", p.plataforma], ["Nicho", p.nicho || "—"], ["Preço", p.preco ? brl(p.preco) : "—"], ["Meta mensal", p.meta_mensal ? brl(p.meta_mensal, 0) + (o.prog != null ? " · " + pct(o.prog * 100, 0) : "") : "—"], ["Investido no período", brl(t.gasto, 0)], ["Reembolsos", int(t.reemb)], ["Carrinhos abandonados", int(t.abandonos)], ["Cliente", cli ? (cli.nome || cli.empresa) : "—"]].map(function (x) { return "<div><span>" + x[0] + "</span><b>" + esc(x[1]) + "</b></div>"; }).join("") +
    "</div>" + (p.url ? '<a class="btn sm" style="margin-top:10px" href="' + esc(p.url) + '" target="_blank" rel="noopener">' + ICON.ext + "Abrir link</a>" : "") + '</div>' +
    '<div class="card"><div class="card-h"><div><h2>Resultado do dia</h2><p>Para o que não chega sozinho</p></div></div><button class="btn pri full" type="button" id="pd-dia">Registrar views, vendas ou gasto</button></div>' +
    '<div class="card"><div class="card-h"><div><h2>Links rastreados</h2><p>Contam cliques por canal</p></div><button class="btn sm" type="button" id="pd-link">Criar link</button></div>' + (links.length ? '<div class="stat-list">' + links.map(function (l) { return '<div><span>' + esc(l.canal || "Geral") + " · /r/" + esc(l.slug) + '</span><b>' + int(l.cliques) + ' <button class="btn sm ghost" type="button" data-cp="' + esc(location.origin + "/r/" + l.slug) + '" aria-label="Copiar link">' + ICON.copia + "</button></b></div>"; }).join("") + "</div>" : '<p class="hint">Crie um link por canal (bio do TikTok, bio do Instagram, WhatsApp) e veja de onde vêm os cliques.</p>') + "</div>" +
    (vendas.length ? '<div class="card"><div class="card-h"><div><h2>Últimas vendas</h2></div></div><div class="stat-list">' + vendas.map(function (v) { return "<div><span>" + esc(v.cliente_nome || "Cliente") + " · " + quando(v.criado_em) + "</span><b>" + (v.status === "aprovada" ? "" : esc(v.status) + " · ") + brl(v.valor_bruto) + "</b></div>"; }).join("") + "</div></div>" : "") +
    "</div></div>", function (bx) {
    var o2 = opcoes(); o2.scales.y1 = { position: "right", grid: { display: false }, border: { display: false }, ticks: { color: css("--muted"), font: { family: "Geist Mono", size: 11 }, maxTicksLimit: 5, callback: function (v) { return "R$ " + k(v); } }, beginAtZero: true };
    o2.plugins.tooltip.callbacks = { label: function (c) { return " " + c.dataset.label + ": " + (c.dataset.yAxisID === "y1" ? brl(c.parsed.y) : int(c.parsed.y)); } };
    var dd = agrupar(dias, 90);
    CH["m-c"] = new Chart($("#m-c", bx), { data: { labels: dd.map(function (x) { return curta(x.d); }), datasets: [
      { type: "line", label: t.views ? "Views" : "Cliques", data: dd.map(function (x) { return t.views ? x.views : x.cliques; }), borderColor: css("--muted"), borderWidth: 1.6, pointRadius: 0, tension: .35, yAxisID: "y" },
      { type: "bar", label: "Receita", data: dd.map(function (x) { return x.receita; }), backgroundColor: css("--accent"), borderRadius: 3, yAxisID: "y1", barPercentage: .6 }
    ] }, options: o2 });
    $("#pd-ed", bx).onclick = function () { formProjeto(p); };
    $("#pd-dia", bx).onclick = function () { formDia(p); };
    $("#pd-link", bx).onclick = function () { formLink(p); };
    $$("[data-cp]", bx).forEach(function (b) { b.onclick = function () { copiar(b.dataset.cp); }; });
  }, true);
}
function formDia(p) {
  modal("Resultado do dia · " + p.nome, '<form class="form" novalidate>' +
    '<div class="f"><label for="fd-data">Data</label><input class="inp" id="fd-data" type="date" value="' + hoje() + '"></div>' +
    '<div class="f"><label for="fd-canal">Canal</label><select class="inp" id="fd-canal">' + CANAIS.map(function (c) { return "<option>" + c + "</option>"; }).join("") + "</select></div>" +
    '<div class="f"><label for="fd-views">Views</label><input class="inp" id="fd-views" type="number" min="0" inputmode="numeric" placeholder="0"></div>' +
    '<div class="f"><label for="fd-cliques">Cliques</label><input class="inp" id="fd-cliques" type="number" min="0" inputmode="numeric" placeholder="0"></div>' +
    '<div class="f"><label for="fd-vendas">Vendas fora da Kiwify</label><input class="inp" id="fd-vendas" type="number" min="0" inputmode="numeric" placeholder="0"></div>' +
    '<div class="f"><label for="fd-rec">Receita dessas vendas (R$)</label><input class="inp" id="fd-rec" type="number" min="0" step="0.01" inputmode="decimal" placeholder="' + (p.preco ? "auto: vendas × " + brl(p.preco) : "0,00") + '"></div>' +
    '<div class="f"><label for="fd-gasto">Gasto com anúncio (R$)</label><input class="inp" id="fd-gasto" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0,00"></div>' +
    '<div class="f"><label for="fd-seg">Seguidores ganhos</label><input class="inp" id="fd-seg" type="number" min="0" inputmode="numeric" placeholder="0"></div></form>' +
    '<p class="hint">Vendas da Kiwify e cliques dos links rastreados entram sozinhos. Repetir a mesma data e canal atualiza o registro.</p><div class="acoes"><button class="btn" type="button" data-fechar>Cancelar</button><button class="btn pri" type="button" id="fd-ok">Salvar</button></div>', function (bx) {
    $("#fd-ok", bx).onclick = async function () {
      var vendas = n($("#fd-vendas", bx).value), rec = $("#fd-rec", bx).value === "" ? vendas * n(p.preco) : n($("#fd-rec", bx).value);
      var d = { projeto_id: p.id, data: $("#fd-data", bx).value || hoje(), canal: $("#fd-canal", bx).value, views: n($("#fd-views", bx).value), cliques: n($("#fd-cliques", bx).value), vendas: vendas, receita: rec, gasto: n($("#fd-gasto", bx).value), seguidores: n($("#fd-seg", bx).value) };
      var r = await sb.from("metricas").upsert(d, { onConflict: "projeto_id,data,canal" }).select().single();
      if (r.error) return erro(r.error);
      S.metricas = S.metricas.filter(function (m) { return m.id !== r.data.id && !(m.projeto_id === d.projeto_id && m.data === d.data && m.canal === d.canal); }); S.metricas.push(r.data);
      fecharModal(); toast("Resultado salvo."); render();
    };
  });
}
function formLink(p) {
  modal("Novo link rastreado", '<form class="form" novalidate><div class="f full"><label for="fl-dest">Para onde o link leva</label><input class="inp" id="fl-dest" type="url" value="' + esc((p && p.url) || "") + '" placeholder="https://pay.kiwify.com.br/..."></div>' +
    '<div class="f"><label for="fl-canal">Canal</label><select class="inp" id="fl-canal">' + CANAIS.map(function (c) { return "<option>" + c + "</option>"; }).join("") + "</select></div>" +
    '<div class="f"><label for="fl-slug">Final do link</label><input class="inp" id="fl-slug" value="' + slug(p ? p.nome : "") + '"></div>' +
    (p ? "" : '<div class="f full"><label for="fl-proj">Projeto</label><select class="inp" id="fl-proj"><option value="">Nenhum</option>' + projetosNegocio().map(function (x) { return '<option value="' + x.id + '">' + esc(x.nome) + "</option>"; }).join("") + "</select></div>") +
    '</form><div class="code"><span id="fl-prev"></span></div><div class="acoes"><button class="btn" type="button" data-fechar>Cancelar</button><button class="btn pri" type="button" id="fl-ok">Criar link</button></div>', function (bx) {
    var sl = $("#fl-slug", bx), ca = $("#fl-canal", bx);
    function prev() { $("#fl-prev", bx).textContent = location.origin + "/r/" + slug(sl.value); }
    ca.onchange = function () { if (!sl._mexeu) { sl.value = slug((p ? p.nome : "link") + "-" + ca.value); prev(); } };
    sl.oninput = function () { sl._mexeu = true; prev(); }; ca.onchange(); prev();
    $("#fl-ok", bx).onclick = async function () {
      var dest = $("#fl-dest", bx).value.trim(); if (!/^https?:\/\//.test(dest)) { toast("Cole o endereço completo, começando com https://"); return; }
      var d = { slug: slug(sl.value), destino: dest, canal: ca.value, projeto_id: p ? p.id : ($("#fl-proj", bx).value || null) };
      var r = await sb.from("links").insert(d).select().single();
      if (r.error) return erro(r.error.code === "23505" ? { message: "esse final de link já existe. Escolha outro." } : r.error);
      S.links.push(r.data); copiar(location.origin + "/r/" + r.data.slug); fecharModal(); toast("Link criado e copiado."); if (p) abrirProjeto(p.id); else render();
    };
  });
}

/* ═════════════ HOSPEDAGENS ═════════════ */
async function verificarSites(forcar) {
  var ss = sites().filter(function (s) { return s.url; });
  if (!ss.length || (!forcar && S.statusEm && Date.now() - S.statusEm < 5 * 60000)) return;
  try {
    var sess = (await sb.auth.getSession()).data.session;
    var r = await fetch("/api/status", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + (sess ? sess.access_token : "") }, body: JSON.stringify({ urls: ss.map(function (s) { return s.url; }) }) });
    if (!r.ok) throw new Error("verificação indisponível (" + r.status + ")");
    var j = await r.json();
    ss.forEach(function (s) { var x = j.resultados && j.resultados[s.url]; if (x) S.status[s.id] = x; });
    S.statusEm = Date.now();
    if (S.view === "hospedagens" || S.view === "geral") render();
  } catch (e) { if (forcar) erro(e); }
}
function vHospedagens(box) {
  acaoTopo("Adicionar site", function () { formProjeto(null, "site"); });
  var ss = sites(), on = 0, off = 0, ms = [];
  ss.forEach(function (s) { var st = S.status[s.id]; if (st) { if (st.ok) { on++; ms.push(st.ms); } else off++; } });
  var med = ms.length ? ms.reduce(function (a, b) { return a + b; }, 0) / ms.length : 0;
  box.innerHTML = '<div class="kpis"><div class="kpi"><span class="l">Sites</span><span class="v num">' + ss.length + '</span><span class="d flat">hospedados</span></div><div class="kpi"><span class="l">No ar</span><span class="v num up">' + (S.statusEm ? on : "—") + '</span><span class="d flat">' + (S.statusEm ? "verificado " + quando(S.statusEm) : "verificando…") + '</span></div><div class="kpi"><span class="l">Fora do ar</span><span class="v num ' + (off ? "down" : "") + '">' + (S.statusEm ? off : "—") + '</span><span class="d flat">precisam de atenção</span></div><div class="kpi"><span class="l">Tempo de resposta</span><span class="v num">' + (med ? int(med) + " ms" : "—") + '</span><span class="d flat">média</span></div></div>' +
    '<div class="toolbar"><button class="btn" type="button" id="h-check">Verificar agora</button><span class="hint">Os sites da sua Vercel já foram importados. Ligue cada um ao cliente em Editar.</span></div>' +
    (ss.length ? '<div class="tbl"><table><thead><tr><th>Site</th><th>Status</th><th class="r">Resposta</th><th>Cliente</th><th>Plataforma</th><th></th></tr></thead><tbody>' + ss.map(function (s) {
      var st = S.status[s.id], cli = s.cliente_id ? S.clientes.find(function (c) { return c.id === s.cliente_id; }) : null;
      var stt = !st ? '<span class="sub">—</span>' : st.ok ? '<span><i class="dot ok"></i>No ar</span>' : '<span class="down"><i class="dot bad"></i>' + esc(st.erro || "Fora do ar") + "</span>";
      return '<tr class="click" data-id="' + s.id + '"><td><div class="cell2"><b>' + esc(s.nome) + "</b><small>" + esc(s.dominio || s.url) + "</small></div></td><td>" + stt + '</td><td class="r">' + (st && st.ok ? int(st.ms) + " ms" : "—") + "</td><td>" + esc(cli ? (cli.nome || cli.empresa) : "—") + "</td><td>" + esc(s.plataforma) + '</td><td><a class="btn sm ghost" href="' + esc(s.url) + '" target="_blank" rel="noopener" aria-label="Abrir site">' + ICON.ext + "</a></td></tr>";
    }).join("") + "</tbody></table></div>" : '<div class="card vazio"><b>Nenhum site cadastrado.</b></div>');
  $("#h-check").onclick = function () { toast("Verificando os sites…"); verificarSites(true); };
  $$("tr[data-id]", box).forEach(function (tr) { tr.onclick = function (e) { if (e.target.closest("a")) return; formProjeto(S.projetos.find(function (p) { return p.id === tr.dataset.id; })); }; });
  verificarSites(false);
}

/* ═════════════ INVESTIMENTO ═════════════ */
function baseConversao(p) {
  var w = { ini: addDias(hoje(), -59), fim: hoje() };
  var t = totais(w, function (pid) { return pid === p.id; });
  if (t.views >= 1000 && t.cliques >= 30) return { ctr: t.ctr, conv: t.cliques ? Math.max(0.1, t.conv) : 1, fonte: "números reais dos últimos 60 dias, com desconto de 20% por segurança", fator: 0.8 };
  return { ctr: 1, conv: 1.5, fonte: "estimativa padrão (ainda faltam dados deste projeto)", fator: 1 };
}
function simular(p, inv, cpm, dias) {
  var b = baseConversao(p), tot = inv * dias, views = tot / cpm * 1000, cl = views * b.ctr / 100 * b.fator, ve = cl * b.conv / 100;
  var unit = p.plataforma === "Kiwify" ? liquidoKiwify(p.preco) : n(p.preco);
  return { b: b, tot: tot, ve: ve, rec: ve * unit, luc: ve * unit - tot, cpa: ve ? tot / ve : null, max: unit };
}
function vInvestir(box) {
  var ps = projetosNegocio().filter(function (p) { return p.status === "ativo" && n(p.preco) > 0; });
  if (!ps.length) { box.innerHTML = '<div class="card vazio"><b>Cadastre um projeto com preço para simular.</b><button class="btn pri" type="button" id="i-novo">Novo projeto</button></div>'; $("#i-novo").onclick = function () { formProjeto(); }; return; }
  box.innerHTML = '<div class="sim"><div class="card"><div class="card-h"><div><h2>Simulador de investimento</h2><p>Usa a conversão real do projeto quando já tem dados</p></div></div>' +
    '<div class="campo"><label for="s-p">Projeto</label><select class="inp" id="s-p">' + ps.map(function (p) { return '<option value="' + p.id + '">' + esc(p.nome) + "</option>"; }).join("") + "</select></div>" +
    '<div class="campo"><label for="s-inv">Anúncio por dia <b id="s-inv-v"></b></label><input type="range" id="s-inv" min="0" max="500" step="10" value="50"></div>' +
    '<div class="campo"><label for="s-cpm">Custo por mil views (CPM) <b id="s-cpm-v"></b></label><input type="range" id="s-cpm" min="3" max="50" step="1" value="10"></div>' +
    '<div class="campo"><label for="s-d">Duração <b id="s-d-v"></b></label><input type="range" id="s-d" min="3" max="30" step="1" value="7"></div></div>' +
    '<div class="card"><div class="card-h"><div><h2>Resultado projetado</h2><p id="s-base"></p></div></div><div class="out"><div><span>Investimento total</span><b id="o1"></b></div><div><span>Vendas previstas</span><b id="o2"></b></div><div><span>Receita líquida</span><b id="o3"></b></div><div><span>Lucro sobre o anúncio</span><b id="o4"></b></div><div><span>Custo por venda</span><b id="o5"></b></div><div><span>Custo máximo por venda</span><b id="o6"></b></div></div><div class="verdict" id="o-v"></div></div></div>' +
    '<div class="card"><div class="card-h"><div><h2>Onde colocar os próximos R$ 100</h2><p>Retorno estimado de R$ 100 em anúncio em cada projeto</p></div></div><div class="bars" id="rank"></div></div>';
  function calc() {
    var p = ps.find(function (x) { return x.id === $("#s-p").value; }), inv = +$("#s-inv").value, cpm = +$("#s-cpm").value, d = +$("#s-d").value;
    $("#s-inv-v").textContent = brl(inv, 0); $("#s-cpm-v").textContent = brl(cpm, 0); $("#s-d-v").textContent = d + " dias";
    var r = simular(p, inv, cpm, d), roi = r.tot ? r.luc / r.tot : 0;
    $("#s-base").textContent = "Base: " + r.b.fonte + " · cliques " + pct(r.b.ctr, 2) + " · conversão " + pct(r.b.conv, 2);
    $("#o1").textContent = brl(r.tot, 0); $("#o2").textContent = int(r.ve); $("#o3").textContent = brl(r.rec, 0); $("#o4").textContent = brl(r.luc, 0); $("#o4").className = r.luc >= 0 ? "up" : "down";
    $("#o5").textContent = r.cpa == null ? "—" : brl(r.cpa); $("#o6").textContent = brl(r.max);
    var v = $("#o-v");
    if (!inv) { v.className = "verdict v-warn"; v.innerHTML = "<b>Sem investimento</b><span>Arraste o controle para simular um anúncio.</span>"; }
    else if (roi > 0.3) { v.className = "verdict v-ok"; v.innerHTML = "<b>Vale investir</b><span>Cada R$ 1 volta cerca de " + brl(1 + roi) + ". Comece com metade do valor por 3 dias e confira se o custo por venda fica abaixo de " + brl(r.max) + ".</span>"; }
    else if (roi >= 0) { v.className = "verdict v-warn"; v.innerHTML = "<b>Teste pequeno</b><span>Empata ou lucra pouco. Teste com no máximo " + brl(Math.max(20, inv / 2), 0) + " por dia e melhore a página.</span>"; }
    else { v.className = "verdict v-bad"; v.innerHTML = "<b>Não invista ainda</b><span>Cada R$ 1 volta " + brl(1 + roi) + ". O custo por venda passa do máximo de " + brl(r.max) + ". Melhore a conversão primeiro.</span>"; }
    var rk = ps.map(function (x) { var s = simular(x, 100, cpm, 1); return { p: x, ret: s.rec }; }).sort(function (a, b) { return b.ret - a.ret; });
    var mx = Math.max.apply(null, rk.map(function (x) { return x.ret; }).concat([100]));
    $("#rank").innerHTML = rk.map(function (x) { var l = x.ret - 100; return '<div class="bar-row"><span>' + esc(x.p.nome) + ' <span class="sub">· R$ 100 viram ' + brl(x.ret, 0) + '</span></span><b class="' + (l >= 0 ? "up" : "down") + '">' + (l >= 0 ? "+" : "") + brl(l, 0) + '</b><div class="tr"><i style="width:' + (x.ret / mx * 100).toFixed(1) + "%;background:" + (l >= 0 ? "var(--ok)" : "var(--bad)") + '"></i></div></div>'; }).join("");
  }
  ["#s-p", "#s-inv", "#s-cpm", "#s-d"].forEach(function (s) { $(s).addEventListener("input", calc); }); calc();
}

/* ═════════════ PROSPECÇÃO ═════════════ */
function vProspeccao(box) {
  acaoTopo("Buscar empresas", function () { window.open(PROSPECCAO_URL, "_blank", "noopener"); });
  var f = S.filtro;
  var nichos = {}; S.leads.forEach(function (l) { var nn = l.nicho || l.categoria || "Sem nicho"; nichos[nn] = (nichos[nn] || 0) + 1; });
  var lista = S.leads.filter(function (l) { return (!f.lnicho || (l.nicho || l.categoria || "Sem nicho") === f.lnicho) && (!f.lbusca || (l.nome + " " + l.cidade + " " + l.bairro + " " + l.categoria).toLowerCase().indexOf(f.lbusca.toLowerCase()) >= 0); });
  var c = {}; LEAD_ST.forEach(function (s) { c[s[0]] = 0; }); lista.forEach(function (l) { c[l.status]++; });
  var cont = c.contatado + c.respondeu + c.reuniao + c.fechado, resp = c.respondeu + c.reuniao + c.fechado;
  box.innerHTML = '<div class="kpis"><div class="kpi"><span class="l">Leads</span><span class="v num">' + int(lista.length) + '</span><span class="d flat">' + c.novo + ' ainda sem contato</span></div><div class="kpi"><span class="l">Contatados</span><span class="v num">' + int(cont) + '</span><span class="d flat">' + pct(lista.length ? cont / lista.length * 100 : 0, 0) + ' do total</span></div><div class="kpi"><span class="l">Responderam</span><span class="v num">' + int(resp) + '</span><span class="d flat">' + pct(cont ? resp / cont * 100 : 0, 0) + ' dos contatados</span></div><div class="kpi"><span class="l">Reuniões</span><span class="v num">' + int(c.reuniao) + '</span><span class="d flat">em andamento</span></div><div class="kpi"><span class="l">Fechados</span><span class="v num up">' + int(c.fechado) + '</span><span class="d flat">' + pct(cont ? c.fechado / cont * 100 : 0, 1) + ' de fechamento</span></div></div>' +
    '<div class="toolbar"><div class="chips" id="l-nichos"><button class="chip" type="button" data-n="" aria-pressed="' + (!f.lnicho) + '">Todos os nichos<span class="n">' + S.leads.length + "</span></button>" + Object.keys(nichos).sort(function (a, b) { return nichos[b] - nichos[a]; }).map(function (nn) { return '<button class="chip" type="button" data-n="' + esc(nn) + '" aria-pressed="' + (f.lnicho === nn) + '">' + esc(nn) + '<span class="n">' + nichos[nn] + "</span></button>"; }).join("") + '</div></div>' +
    '<div class="toolbar"><input class="inp busca" id="l-busca" type="search" placeholder="Buscar por nome, bairro ou cidade" value="' + esc(f.lbusca) + '"><div class="seg" id="l-modo"><button type="button" data-m="kanban" aria-pressed="' + (f.lmodo === "kanban") + '">Funil</button><button type="button" data-m="lista" aria-pressed="' + (f.lmodo === "lista") + '">Lista</button><button type="button" data-m="mapa" aria-pressed="' + (f.lmodo === "mapa") + '">Mapa</button></div></div>' +
    (S.leads.length ? (f.lmodo === "kanban" ? kanbanLeads(lista) : f.lmodo === "mapa" ? '<div class="card" style="padding:14px"><div class="toolbar" style="margin:0 0 10px"><select class="inp" id="l-mbusca" style="max-width:100%"><option value="">Todos os leads filtrados</option></select></div><p class="sub" style="margin:0 0 10px;font-size:12.5px;color:var(--muted)">A porcentagem é o índice de destaque: nota no Google pesada pelo número de avaliações, comparada com os outros da mesma área. A chance de fechar vem das mesmas regras do app de Prospecção.</p><div id="l-mapa"></div></div>' : listaLeads(lista)) : '<div class="card vazio"><b>Nenhum lead ainda.</b>Use o app de Prospecção para buscar empresas por nicho e cidade. Eles aparecem aqui sozinhos.<a class="btn pri" href="' + PROSPECCAO_URL + '" target="_blank" rel="noopener">Abrir Prospecção</a></div>');
  $("#l-nichos").onclick = function (e) { var b = e.target.closest("[data-n]"); if (b) { f.lnicho = b.dataset.n; render(); } };
  $("#l-modo").onclick = function (e) { var b = e.target.closest("[data-m]"); if (b) { f.lmodo = b.dataset.m; render(); } };
  var bu = $("#l-busca"); bu.oninput = function () { f.lbusca = bu.value; clearTimeout(bu._t); bu._t = setTimeout(function () { render(); var x = $("#l-busca"); x.focus(); x.setSelectionRange(x.value.length, x.value.length); }, 300); };
  $$("[data-lead]", box).forEach(function (el) { el.onclick = function () { abrirLead(el.dataset.lead); }; });
  if (f.lmodo === "mapa" && S.leads.length) mapaLeads(lista);
}
// Modo mapa: ranking dos melhores por área, raio e horário (regiao.js) + chance de fechar (vendas.js da Prospecção).
var MAPA = { buscas: null, vendas: null };
function carregarVendas() {
  if (window.Vendas) return Promise.resolve(window.Vendas);
  if (MAPA.vendas) return MAPA.vendas;
  MAPA.vendas = fetch(PROSPECCAO_URL + "/vendas.js").then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then(function (txt) { new Function(txt)(); return window.Vendas; }) // roda isolado: os nomes de lá não colidem com os daqui
    .catch(function () { MAPA.vendas = null; return null; });
  return MAPA.vendas;
}
async function mapaLeads(lista) {
  var el = $("#l-mapa"), sel = $("#l-mbusca"), f = S.filtro;
  if (!MAPA.buscas) { var r = await sb.from("buscas").select("id,nichos,cidade,uf,bairro,area,criado_em").order("criado_em", { ascending: false }).limit(40); MAPA.buscas = r.data || []; }
  var V = await carregarVendas();
  if (!el.isConnected) return;
  sel.innerHTML = '<option value="">Todos os leads filtrados</option>' + MAPA.buscas.map(function (b) {
    var onde = (b.area && b.area.rotulo) || ((b.bairro ? b.bairro + ", " : "") + b.cidade + " - " + b.uf);
    return '<option value="' + b.id + '"' + (f.lmbusca === b.id ? " selected" : "") + ">" + esc((b.nichos || []).join(", ") + " · " + onde + " · " + new Date(b.criado_em).toLocaleDateString("pt-BR")) + "</option>";
  }).join("");
  sel.onchange = function () { f.lmbusca = sel.value; render(); };
  var b = MAPA.buscas.find(function (x) { return x.id === f.lmbusca; });
  var leads = b ? lista.filter(function (l) { return (l.buscas || []).indexOf(b.id) >= 0; }) : lista;
  var chance = null;
  if (V) {
    var ctx = V.contextoComparacao(S.leads), taxas = V.taxasReais(S.leads);
    chance = function (l) { try { return V.chanceFechamento(l, V.analisar(l, ctx), taxas).pct; } catch (e) { return null; } };
  }
  Regiao.painelMapa(el, { leads: leads, area: b ? b.area : null, chance: chance, onAbrir: function (id) { abrirLead(id); } });
}
function tagsLead(l) { var t = []; if (l.whatsapp) t.push("WhatsApp"); if (!l.site) t.push("sem site"); if (l.instagram) t.push("Instagram"); return t; }
function kanbanLeads(lista) {
  return '<div class="kan">' + LEAD_ST.map(function (s) {
    var ls = lista.filter(function (l) { return l.status === s[0]; }).sort(function (a, b) { return (b.atualizado_em || "") < (a.atualizado_em || "") ? -1 : 1; });
    return '<div class="col"><div class="col-h"><span style="color:var(--ink);font-weight:600"><i style="background:var(' + s[2] + ')"></i>' + s[1] + "</span><span>" + ls.length + "</span></div>" +
      ls.slice(0, 30).map(function (l) { return '<button type="button" class="lc" data-lead="' + l.id + '"><b>' + esc(l.nome) + '</b><div class="m"><span>' + esc(l.nicho || l.categoria || "") + (l.bairro ? " · " + esc(l.bairro) : "") + "</span><span>" + (n(l.nota) ? "★ " + n(l.nota).toFixed(1) : "") + '</span></div><div class="tags">' + tagsLead(l).map(function (t) { return '<span class="mini-tag">' + t + "</span>"; }).join("") + (l.ultimo_contato ? '<span class="mini-tag">contato ' + quando(l.ultimo_contato) + "</span>" : "") + "</div></button>"; }).join("") +
      (ls.length > 30 ? '<p class="mais">+ ' + (ls.length - 30) + " leads. Use a busca ou a lista.</p>" : "") + "</div>";
  }).join("") + "</div>";
}
function listaLeads(lista) {
  var st = {}; LEAD_ST.forEach(function (s) { st[s[0]] = s; });
  return '<div class="tbl"><table><thead><tr><th>Empresa</th><th>Nicho</th><th>Status</th><th>Contato</th><th class="r">Nota</th><th>Último contato</th></tr></thead><tbody>' + lista.slice(0, 400).map(function (l) {
    var s = st[l.status] || LEAD_ST[0];
    return '<tr class="click" data-lead="' + l.id + '"><td><div class="cell2"><b>' + esc(l.nome) + "</b><small>" + esc([l.bairro, l.cidade].filter(Boolean).join(" · ")) + "</small></div></td><td>" + esc(l.nicho || l.categoria || "—") + '</td><td><span><i class="dot" style="background:var(' + s[2] + ')"></i>' + s[1] + "</span></td><td>" + esc(tagsLead(l).join(", ") || "—") + '</td><td class="r">' + (n(l.nota) ? n(l.nota).toFixed(1) : "—") + "</td><td>" + quando(l.ultimo_contato) + "</td></tr>";
  }).join("") + "</tbody></table></div>";
}
function preencher(txt, alvo, tipo) {
  var nome = tipo === "lead" ? alvo.nome : primeiroNome(alvo.nome) || alvo.empresa;
  var prod = ""; if (tipo === "cliente") { var v = S.vendas.find(function (x) { return x.cliente_id === alvo.id && x.status === "aprovada"; }); prod = v ? v.produto_nome : ""; }
  return String(txt || "").replace(/\{nome\}/g, nome || "").replace(/\{empresa\}/g, alvo.empresa || alvo.nome || "").replace(/\{cidade\}/g, alvo.cidade || "").replace(/\{bairro\}/g, alvo.bairro || alvo.cidade || "").replace(/\{categoria\}/g, alvo.categoria || alvo.nicho || "").replace(/\{nicho\}/g, alvo.nicho || alvo.categoria || "").replace(/\{produto\}/g, prod || "produto");
}
async function salvarLead(l, mud) {
  mud.atualizado_em = new Date().toISOString();
  var r = await sb.from("leads").update(mud).eq("id", l.id).select("id,nome,categoria,nicho,telefone,tel_digitos,tel_tipo,whatsapp,email,site,instagram,endereco,bairro,cidade,uf,nota,avaliacoes,maps,fechado,enriquecido,buscas,whatsapp_origem,facebook,linkedin,status,obs,historico,ultimo_contato,criado_em,atualizado_em,dados").single();
  if (r.error) { erro(r.error); return null; }
  S.leads = S.leads.map(function (x) { return x.id === l.id ? r.data : x; }); return r.data;
}
async function registrarDisparo(publico, alvo, modelo, canal, txt) {
  var agora = new Date();
  var d = { publico: publico, destinatario_id: alvo.id, canal: canal, modelo_id: modelo ? modelo.id : null, objetivo: modelo ? modelo.objetivo : "", nicho: alvo.nicho || alvo.categoria || "" };
  sb.from("disparos").insert(d).select().single().then(function (r) { if (!r.error) S.disparos.push(r.data); });
  if (publico === "lead") {
    var dados = Object.assign({}, alvo.dados || {}); var c = dados.ciclo || {};
    var envio = { t: agora.toISOString(), etapa: alvo.status === "novo" ? "abordagem" : "retomar", dow: agora.getDay(), h: agora.getHours(), txt: String(txt || "").slice(0, 1000) };
    dados.ciclo = { envios: (c.envios || []).concat([envio]), respostas: c.respostas || [], encerrado: !!c.encerrado };
    var mud = { dados: dados, ultimo_contato: envio.t, historico: (alvo.historico || []).concat([{ t: envio.t, tipo: canal, txt: (canal === "email" ? "E-mail" : "WhatsApp") + " enviado pela Central" + (modelo ? ": " + modelo.nome : "") }]) };
    if (alvo.status === "novo") mud.status = "contatado";
    return salvarLead(alvo, mud);
  } else {
    var r = await sb.from("clientes").update({ ultimo_contato: agora.toISOString(), historico: (alvo.historico || []).concat([{ t: agora.toISOString(), tipo: canal, txt: "Mensagem enviada" + (modelo ? ": " + modelo.nome : "") }]) }).eq("id", alvo.id).select().single();
    if (!r.error) S.clientes = S.clientes.map(function (x) { return x.id === alvo.id ? r.data : x; });
    return r.data;
  }
}
function numeroDe(publico, alvo) { return publico === "lead" ? (alvo.whatsapp || alvo.tel_digitos || telWa(alvo.telefone)) : telWa(alvo.telefone); }
function telVisivel(d) { d = String(d || "").replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, ""); if (d.length === 11) return "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7); if (d.length === 10) return "(" + d.slice(0, 2) + ") " + d.slice(2, 6) + "-" + d.slice(6); return d; }
function emReuniao(publico, alvo) {
  if (publico === "lead" && alvo.status === "reuniao") return true;
  return agPend().some(function (a) { return (a.tipo === "reuniao" || a.tipo === "retomada") && (a.lead_id === alvo.id || a.cliente_id === alvo.id); });
}
var NOME_RETOMAR = "Retomar conversa da reunião";
function blocoMensagem(publico, alvo, objetivosPref, contexto) {
  var num = numeroDe(publico, alvo), fixo = publico === "lead" && !alvo.whatsapp && alvo.tel_tipo === "fixo";
  var reun = contexto === "reuniao" || emReuniao(publico, alvo);
  var pref = reun ? ["retomada"] : objetivosPref;
  var mods = S.modelos.filter(function (m) { return m.objetivo !== "resposta" && m.objetivo !== "portfolio"; }).sort(function (a, b) { return (pref.indexOf(a.objetivo) < 0) - (pref.indexOf(b.objetivo) < 0); });
  var canalPref = num || !alvo.email ? "whatsapp" : "email";
  var esc0 = reun ? (mods.find(function (m) { return m.nome.indexOf(NOME_RETOMAR) === 0 && m.canal === canalPref; }) || mods.find(function (m) { return m.nome.indexOf(NOME_RETOMAR) === 0; })) : null;
  var selId = esc0 ? esc0.id : (mods[0] ? mods[0].id : "");
  return '<div class="card"><div class="card-h"><div><h2>Enviar mensagem</h2><p>' + (reun ? "Foco em retomar a conversa da reunião" : "Escolha o modelo e ajuste o texto") + '</p></div></div>' +
    '<div class="form"><div class="f"><label for="mm-num">WhatsApp</label><input class="inp" id="mm-num" type="tel" inputmode="tel" value="' + esc(telVisivel(num)) + '" placeholder="(21) 99999-9999">' + (fixo ? '<span class="hint">Número fixo: funciona se a empresa usa WhatsApp Business.</span>' : !num ? '<span class="hint">Sem número cadastrado. Digite para enviar e salvar.</span>' : "") + '</div>' +
    '<div class="f"><label for="mm-email">E-mail</label><input class="inp" id="mm-email" type="email" inputmode="email" value="' + esc(alvo.email || "") + '" placeholder="nome@empresa.com.br">' + (!alvo.email ? '<span class="hint">Sem e-mail cadastrado. Digite para enviar e salvar.</span>' : "") + "</div>" +
    '<div class="f full"><label for="mm-mod">Modelo</label><select class="inp" id="mm-mod">' + mods.map(function (m) { return '<option value="' + m.id + '"' + (m.id === selId ? " selected" : "") + ">" + esc(OBJETIVOS[m.objetivo] + " · " + m.nome) + (m.canal === "email" && m.nome.indexOf("e-mail") < 0 ? " (e-mail)" : "") + "</option>"; }).join("") + '</select></div>' +
    '<div class="f full"><textarea class="inp" id="mm-txt"></textarea></div></div>' +
    '<div class="acoes"><button class="btn ghost" type="button" id="mm-copiar">' + ICON.copia + 'Copiar</button>' + (num ? '<a class="btn ghost" id="mm-ligar" href="tel:+' + esc(num) + '">Ligar</a>' : "") + '<button class="btn" type="button" id="mm-mail">Enviar e-mail</button><button class="btn wa" type="button" id="mm-wa">' + ICON.wa + "Abrir no WhatsApp</button></div></div>";
}
function ligarMensagem(bx, publico, alvo, depois) {
  var sel = $("#mm-mod", bx), tx = $("#mm-txt", bx), inNum = $("#mm-num", bx), inMail = $("#mm-email", bx);
  if (!sel) return;
  function modelo() { return S.modelos.find(function (x) { return x.id === sel.value; }); }
  function aplicar() { var m = modelo(); tx.value = m ? preencher(m.corpo, alvo, publico) : ""; }
  sel.onchange = aplicar; aplicar();
  async function guardar(campo, valor) {
    if (publico === "lead") { var nv = await salvarLead(alvo, campo === "tel" ? { whatsapp: valor } : { email: valor }); if (nv) alvo = nv; }
    else { var r = await sb.from("clientes").update(campo === "tel" ? { telefone: valor } : { email: valor }).eq("id", alvo.id).select().single(); if (!r.error) { S.clientes = S.clientes.map(function (x) { return x.id === alvo.id ? r.data : x; }); alvo = r.data; } }
  }
  $("#mm-copiar", bx).onclick = function () { copiar(tx.value); };
  $("#mm-wa", bx).onclick = async function () {
    var d = telWa(inNum.value);
    if (!d) { toast("Digite o número com DDD, por exemplo (21) 99999-9999."); inNum.focus(); return; }
    var antes = numeroDe(publico, alvo);
    window.open("https://wa.me/" + d + "?text=" + encodeURIComponent(tx.value), "_blank");
    if (d !== antes && !(publico === "lead" && d === alvo.tel_digitos && !alvo.whatsapp)) await guardar("tel", d);
    await registrarDisparo(publico, alvo, modelo(), "whatsapp", tx.value); toast("Mensagem registrada."); if (depois) depois();
  };
  $("#mm-mail", bx).onclick = async function () {
    var em = inMail.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) { toast("Digite um e-mail válido."); inMail.focus(); return; }
    var m = modelo(), assunto = m && m.assunto ? preencher(m.assunto, alvo, publico) : "Retomando nossa conversa";
    location.href = "mailto:" + encodeURIComponent(em) + "?subject=" + encodeURIComponent(assunto) + "&body=" + encodeURIComponent(tx.value);
    if (em !== (alvo.email || "")) await guardar("email", em);
    await registrarDisparo(publico, alvo, m, "email", tx.value); if (depois) depois();
  };
}
function abrirLead(id, contexto) {
  var l = S.leads.find(function (x) { return x.id === id; }); if (!l) return;
  var info = [["Telefone", l.telefone], ["WhatsApp", l.whatsapp ? l.whatsapp.replace(/^55/, "") : ""], ["E-mail", l.email], ["Site", l.site], ["Instagram", l.instagram], ["Endereço", [l.endereco || "", l.bairro, l.cidade].filter(Boolean).join(" · ")], ["Nota no Google", n(l.nota) ? n(l.nota).toFixed(1) + " (" + int(l.avaliacoes) + " avaliações)" : ""]].filter(function (x) { return x[1]; });
  modal(l.nome, '<div class="det"><div style="display:grid;gap:16px;align-content:start"><div class="card"><div class="card-h"><div><h2>' + esc(l.nicho || l.categoria || "Lead") + '</h2><p>Entrou ' + quando(l.criado_em) + '</p></div></div><div class="chips" id="ld-st">' + LEAD_ST.map(function (s) { return '<button class="chip" type="button" data-s="' + s[0] + '" aria-pressed="' + (l.status === s[0]) + '">' + s[1] + "</button>"; }).join("") + '</div><div class="stat-list" style="margin-top:10px">' + info.map(function (x) { var v = x[1]; var link = x[0] === "Site" ? '<a href="' + esc(/^http/.test(v) ? v : "https://" + v) + '" target="_blank" rel="noopener">' + esc(v.replace(/^https?:\/\//, "").slice(0, 40)) + "</a>" : esc(v); return "<div><span>" + x[0] + "</span><b>" + link + "</b></div>"; }).join("") + "</div>" + (l.maps ? '<a class="btn sm" style="margin-top:10px" href="' + esc(l.maps) + '" target="_blank" rel="noopener">' + ICON.ext + "Ver no Google Maps</a>" : "") + '</div>' + blocoMensagem("lead", l, l.status === "novo" ? ["prospeccao", "captacao"] : ["retomada", "continuidade"], contexto) + '</div>' +
    '<div style="display:grid;gap:16px;align-content:start"><div class="card"><div class="card-h"><div><h2>Anotações</h2></div></div><textarea class="inp" id="ld-obs" style="min-height:90px">' + esc(l.obs || "") + '</textarea><div class="acoes"><button class="btn sm" type="button" id="ld-obs-ok">Salvar anotação</button></div></div>' +
    '<div class="card"><div class="card-h"><div><h2>Histórico</h2></div></div>' + ((l.historico || []).length ? '<ul class="hist">' + l.historico.slice().reverse().slice(0, 30).map(function (h) { return "<li>" + esc(h.txt || h.tipo) + "<small>" + (h.t ? new Date(h.t).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "") + "</small></li>"; }).join("") + "</ul>" : '<p class="hint">Sem registros ainda.</p>') + "</div>" +
    '<div class="card"><div class="card-h"><div><h2>O lead respondeu?</h2><p>Cole a resposta e receba a mensagem pronta</p></div></div><button class="btn full" type="button" id="ld-resp">' + ICON.responder + 'Colar resposta do cliente</button></div>' +
    '<div class="card"><div class="card-h"><div><h2>Fechou negócio?</h2><p>Leva o lead para Clientes</p></div></div><button class="btn full" type="button" id="ld-cli">Transformar em cliente</button></div></div></div>', function (bx) {
    $("#ld-st", bx).onclick = async function (e) { var b = e.target.closest("[data-s]"); if (!b || b.dataset.s === l.status) return;
      var nova = await salvarLead(l, { status: b.dataset.s, historico: (l.historico || []).concat([{ t: new Date().toISOString(), tipo: "status", txt: "Status: " + LEAD_ST.find(function (s) { return s[0] === b.dataset.s; })[1] + " (pela Central)" }]) });
      if (nova) { toast("Status atualizado."); render(); abrirLead(l.id); } };
    $("#ld-resp", bx).onclick = function () { S.resp = { texto: "", alvo: "lead:" + l.id, resultado: null }; fecharModal(); ir("responder"); setTimeout(function () { var t = $("#rp-txt"); if (t) t.focus(); }, 100); };
    $("#ld-obs-ok", bx).onclick = async function () { if (await salvarLead(l, { obs: $("#ld-obs", bx).value })) toast("Anotação salva."); };
    $("#ld-cli", bx).onclick = async function () {
      var ja = S.clientes.find(function (c) { return c.lead_id === l.id; }); if (ja) { fecharModal(); ir("clientes"); abrirCliente(ja.id); return; }
      var r = await sb.from("clientes").insert({ nome: l.nome, empresa: l.nome, nicho: l.nicho || l.categoria || "", telefone: l.whatsapp || l.telefone || "", email: l.email || "", origem: "prospecção", lead_id: l.id, status: "ativo" }).select().single();
      if (r.error) return erro(r.error);
      S.clientes.unshift(r.data); if (l.status !== "fechado") await salvarLead(l, { status: "fechado" });
      toast("Cliente criado."); fecharModal(); ir("clientes"); abrirCliente(r.data.id);
    };
    ligarMensagem(bx, "lead", l, function () { render(); abrirLead(l.id, contexto); });
  }, true);
}

/* ═════════════ CLIENTES ═════════════ */
function vClientes(box) {
  acaoTopo("Novo cliente", function () { formCliente(); });
  var f = S.filtro, c = {}; CLI_ST.forEach(function (s) { c[s[0]] = 0; }); S.clientes.forEach(function (x) { c[x.status]++; });
  var lista = S.clientes.filter(function (x) { return (!f.cst || x.status === f.cst) && (!f.cbusca || (x.nome + " " + x.empresa + " " + x.email + " " + x.nicho).toLowerCase().indexOf(f.cbusca.toLowerCase()) >= 0); });
  var total = S.clientes.reduce(function (s, x) { return s + n(x.valor_total); }, 0);
  box.innerHTML = '<div class="kpis"><div class="kpi"><span class="l">Clientes</span><span class="v num">' + S.clientes.length + '</span><span class="d flat">' + c.ativo + ' ativos</span></div><div class="kpi"><span class="l">Recorrentes</span><span class="v num">' + c.recorrente + '</span><span class="d flat">compraram mais de uma vez</span></div><div class="kpi"><span class="l">Para retomar</span><span class="v num ' + (c.retomar ? "down" : "") + '">' + c.retomar + '</span><span class="d flat">inclui carrinhos abandonados</span></div><div class="kpi"><span class="l">Receita acumulada</span><span class="v num">' + brl(total, 0) + '</span><span class="d flat">' + brl(S.clientes.length ? total / S.clientes.length : 0, 0) + " por cliente</span></div></div>" +
    '<div class="toolbar"><div class="chips" id="c-st"><button class="chip" type="button" data-s="" aria-pressed="' + (!f.cst) + '">Todos</button>' + CLI_ST.map(function (s) { return '<button class="chip" type="button" data-s="' + s[0] + '" aria-pressed="' + (f.cst === s[0]) + '">' + s[1] + '<span class="n">' + c[s[0]] + "</span></button>"; }).join("") + '</div><input class="inp busca" id="c-busca" type="search" placeholder="Buscar cliente" value="' + esc(f.cbusca) + '"></div>' +
    (lista.length ? '<div class="tbl"><table><thead><tr><th>Cliente</th><th>Nicho</th><th>Origem</th><th>Status</th><th class="r">Total</th><th>Último contato</th></tr></thead><tbody>' + lista.map(function (x) { var s = CLI_ST.find(function (y) { return y[0] === x.status; }) || CLI_ST[0];
      return '<tr class="click" data-cli="' + x.id + '"><td><div class="cell2"><b>' + esc(x.nome || x.empresa || "Sem nome") + "</b><small>" + esc(x.empresa && x.empresa !== x.nome ? x.empresa : (x.email || x.telefone || "")) + "</small></div></td><td>" + esc(x.nicho || "—") + "</td><td>" + esc(x.origem) + '</td><td><span><i class="dot" style="background:var(' + s[2] + ')"></i>' + s[1] + '</span></td><td class="r">' + brl(x.valor_total, 0) + "</td><td>" + quando(x.ultimo_contato) + "</td></tr>"; }).join("") + "</tbody></table></div>"
      : '<div class="card vazio"><b>Nenhum cliente aqui.</b>Quem compra na Kiwify entra sozinho. Leads fechados viram cliente com um toque.</div>');
  $("#c-st").onclick = function (e) { var b = e.target.closest("[data-s]"); if (b) { f.cst = b.dataset.s; render(); } };
  var bu = $("#c-busca"); bu.oninput = function () { f.cbusca = bu.value; clearTimeout(bu._t); bu._t = setTimeout(function () { render(); var x = $("#c-busca"); x.focus(); x.setSelectionRange(x.value.length, x.value.length); }, 300); };
  $$("[data-cli]", box).forEach(function (tr) { tr.onclick = function () { abrirCliente(tr.dataset.cli); }; });
}
function formCliente(c) {
  c = c || { status: "ativo", origem: "manual" };
  modal(c.id ? "Editar cliente" : "Novo cliente", '<form class="form" novalidate>' +
    '<div class="f"><label for="fc-nome">Nome</label><input class="inp" id="fc-nome" value="' + esc(c.nome || "") + '"></div><div class="f"><label for="fc-emp">Empresa</label><input class="inp" id="fc-emp" value="' + esc(c.empresa || "") + '"></div>' +
    '<div class="f"><label for="fc-tel">WhatsApp / telefone</label><input class="inp" id="fc-tel" inputmode="tel" value="' + esc(c.telefone || "") + '"></div><div class="f"><label for="fc-email">E-mail</label><input class="inp" id="fc-email" type="email" value="' + esc(c.email || "") + '"></div>' +
    '<div class="f"><label for="fc-nicho">Nicho</label><input class="inp" id="fc-nicho" value="' + esc(c.nicho || "") + '"></div><div class="f"><label for="fc-st">Status</label><select class="inp" id="fc-st">' + CLI_ST.map(function (s) { return '<option value="' + s[0] + '"' + (c.status === s[0] ? " selected" : "") + ">" + s[1] + "</option>"; }).join("") + "</select></div>" +
    '<div class="f"><label for="fc-val">Valor total recebido (R$)</label><input class="inp" id="fc-val" type="number" min="0" step="0.01" inputmode="decimal" value="' + (c.valor_total || "") + '"></div><div class="f"><label for="fc-or">Origem</label><input class="inp" id="fc-or" value="' + esc(c.origem || "manual") + '"></div>' +
    '<div class="f full"><label for="fc-obs">Anotações</label><textarea class="inp" id="fc-obs" style="min-height:70px">' + esc(c.obs || "") + "</textarea></div></form>" +
    '<div class="acoes">' + (c.id ? '<button class="btn danger esq" type="button" id="fc-del">Excluir</button>' : "") + '<button class="btn" type="button" data-fechar>Cancelar</button><button class="btn pri" type="button" id="fc-ok">Salvar</button></div>', function (bx) {
    $("#fc-ok", bx).onclick = async function () {
      var d = { nome: $("#fc-nome", bx).value.trim(), empresa: $("#fc-emp", bx).value.trim(), telefone: $("#fc-tel", bx).value.trim(), email: $("#fc-email", bx).value.trim(), nicho: $("#fc-nicho", bx).value.trim(), status: $("#fc-st", bx).value, valor_total: n($("#fc-val", bx).value), origem: $("#fc-or", bx).value.trim() || "manual", obs: $("#fc-obs", bx).value, atualizado_em: new Date().toISOString() };
      if (!d.nome && !d.empresa) { toast("Preencha o nome ou a empresa."); return; }
      var r = c.id ? await sb.from("clientes").update(d).eq("id", c.id).select().single() : await sb.from("clientes").insert(d).select().single();
      if (r.error) return erro(r.error.code === "23505" ? { message: "já existe um cliente com esse e-mail." } : r.error);
      if (c.id) S.clientes = S.clientes.map(function (x) { return x.id === c.id ? r.data : x; }); else S.clientes.unshift(r.data);
      fecharModal(); toast("Cliente salvo."); render();
    };
    var del = $("#fc-del", bx);
    if (del) del.onclick = async function () { if (del.dataset.c !== "1") { del.dataset.c = "1"; del.textContent = "Confirmar exclusão"; return; } var r = await sb.from("clientes").delete().eq("id", c.id); if (r.error) return erro(r.error); S.clientes = S.clientes.filter(function (x) { return x.id !== c.id; }); fecharModal(); toast("Cliente excluído."); render(); };
  });
}
function abrirCliente(id, contexto) {
  var c = S.clientes.find(function (x) { return x.id === id; }); if (!c) return;
  var compras = S.vendas.filter(function (v) { return v.cliente_id === c.id; });
  var projs = S.projetos.filter(function (p) { return p.cliente_id === c.id; });
  modal(c.nome || c.empresa || "Cliente", '<div class="det"><div style="display:grid;gap:16px;align-content:start"><div class="card"><div class="card-h"><div><h2>' + esc(c.empresa || c.nicho || "Cliente") + '</h2><p>Desde ' + new Date(c.criado_em).toLocaleDateString("pt-BR") + " · origem " + esc(c.origem) + '</p></div><button class="btn sm" type="button" id="cd-ed">Editar</button></div><div class="chips" id="cd-st">' + CLI_ST.map(function (s) { return '<button class="chip" type="button" data-s="' + s[0] + '" aria-pressed="' + (c.status === s[0]) + '">' + s[1] + "</button>"; }).join("") + '</div><div class="stat-list" style="margin-top:10px"><div><span>Total recebido</span><b>' + brl(c.valor_total) + "</b></div><div><span>Telefone</span><b>" + esc(c.telefone || "—") + "</b></div><div><span>E-mail</span><b>" + esc(c.email || "—") + "</b></div><div><span>Último contato</span><b>" + quando(c.ultimo_contato) + "</b></div></div></div>" + blocoMensagem("cliente", c, c.status === "retomar" ? ["retomada"] : ["continuidade", "pos_venda", "retomada"], contexto) + "</div>" +
    '<div style="display:grid;gap:16px;align-content:start"><div class="card"><div class="card-h"><div><h2>O cliente respondeu?</h2></div></div><button class="btn full" type="button" id="cd-resp">' + ICON.responder + 'Colar resposta do cliente</button></div><div class="card"><div class="card-h"><div><h2>Compras e projetos</h2></div></div>' + (compras.length || projs.length ? '<div class="stat-list">' + compras.map(function (v) { return "<div><span>" + esc(v.produto_nome) + " · " + quando(v.criado_em) + "</span><b>" + (v.status !== "aprovada" ? esc(v.status) + " · " : "") + brl(v.valor_bruto) + "</b></div>"; }).join("") + projs.map(function (p) { return '<div><span>' + esc(TIPOS[p.tipo]) + "</span><b>" + esc(p.nome) + "</b></div>"; }).join("") + "</div>" : '<p class="hint">Nenhuma compra ou projeto ligado ainda.</p>') + "</div>" +
    '<div class="card"><div class="card-h"><div><h2>Histórico</h2></div></div>' + ((c.historico || []).length ? '<ul class="hist">' + c.historico.slice().reverse().slice(0, 30).map(function (h) { return "<li>" + esc(h.txt) + "<small>" + (h.t ? new Date(h.t).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "") + "</small></li>"; }).join("") + "</ul>" : '<p class="hint">Sem registros ainda.</p>') + "</div></div></div>", function (bx) {
    $("#cd-ed", bx).onclick = function () { formCliente(c); };
    var cr = $("#cd-resp", bx); if (cr) cr.onclick = function () { S.resp = { texto: "", alvo: "cliente:" + c.id, resultado: null }; fecharModal(); ir("responder"); };
    $("#cd-st", bx).onclick = async function (e) { var b = e.target.closest("[data-s]"); if (!b || b.dataset.s === c.status) return; var r = await sb.from("clientes").update({ status: b.dataset.s, atualizado_em: new Date().toISOString() }).eq("id", c.id).select().single(); if (r.error) return erro(r.error); S.clientes = S.clientes.map(function (x) { return x.id === c.id ? r.data : x; }); toast("Status atualizado."); render(); abrirCliente(c.id); };
    ligarMensagem(bx, "cliente", c, function () { abrirCliente(c.id, contexto); });
  }, true);
}

/* ═════════════ MENSAGENS ═════════════ */
function vMensagens(box) {
  acaoTopo("Novo modelo", function () { formModelo(); });
  var w30 = addDias(hoje(), -29), ds = S.disparos.filter(function (d) { return diaDe(d.criado_em) >= w30; });
  var leadsMsg = {}; ds.forEach(function (d) { if (d.publico === "lead") leadsMsg[d.destinatario_id] = 1; });
  var respond = S.leads.filter(function (l) { return leadsMsg[l.id] && ["respondeu", "reuniao", "fechado"].indexOf(l.status) >= 0; }).length;
  var porObj = {}; ds.forEach(function (d) { porObj[d.objetivo || "outro"] = (porObj[d.objetivo || "outro"] || 0) + 1; });
  box.innerHTML = '<div class="kpis"><div class="kpi"><span class="l">Mensagens em 30 dias</span><span class="v num">' + ds.length + '</span><span class="d flat">' + Object.keys(porObj).map(function (o) { return (OBJETIVOS[o] || o) + " " + porObj[o]; }).join(" · ") + '</span></div><div class="kpi"><span class="l">Leads que responderam</span><span class="v num">' + respond + '</span><span class="d flat">' + pct(Object.keys(leadsMsg).length ? respond / Object.keys(leadsMsg).length * 100 : 0, 0) + ' de quem recebeu</span></div><div class="kpi"><span class="l">Modelos</span><span class="v num">' + S.modelos.length + '</span><span class="d flat">por objetivo e nicho</span></div></div>' +
    '<div class="tabs" role="tablist"><button type="button" role="tab" data-tab="campanha" aria-selected="' + (S.msgTab === "campanha") + '">Disparar</button><button type="button" role="tab" data-tab="modelos" aria-selected="' + (S.msgTab === "modelos") + '">Modelos</button></div><div id="msg-c"></div>';
  $(".tabs", box).onclick = function (e) { var b = e.target.closest("[data-tab]"); if (b) { S.msgTab = b.dataset.tab; render(); } };
  if (S.msgTab === "modelos") tabModelos($("#msg-c")); else tabCampanha($("#msg-c"));
}
function tabModelos(el) {
  var grupos = {}; S.modelos.forEach(function (m) { (grupos[m.objetivo] = grupos[m.objetivo] || []).push(m); });
  el.innerHTML = Object.keys(OBJETIVOS).filter(function (o) { return grupos[o]; }).map(function (o) {
    return '<div class="card" style="margin-bottom:14px"><div class="card-h"><div><h2>' + OBJETIVOS[o] + '</h2><p>' + grupos[o].length + ' modelos</p></div></div><div class="stat-list">' + grupos[o].map(function (m) { return '<div><span style="color:var(--ink)">' + esc(m.nome) + (m.gatilho ? ' <span class="sub">· ' + esc((GATILHOS.find(function (g) { return g.id === m.gatilho; }) || {}).nome || m.gatilho) + "</span>" : "") + (m.nicho ? ' <span class="sub">· ' + esc(m.nicho) + "</span>" : "") + ' <span class="sub">· ' + (m.canal === "email" ? "e-mail" : "WhatsApp") + '</span></span><b><button class="btn sm" type="button" data-ed="' + m.id + '">Editar</button></b></div>'; }).join("") + "</div></div>";
  }).join("") || '<div class="card vazio"><b>Nenhum modelo.</b></div>';
  $$("[data-ed]", el).forEach(function (b) { b.onclick = function () { formModelo(S.modelos.find(function (m) { return m.id === b.dataset.ed; })); }; });
}
function formModelo(m) {
  m = m || { objetivo: "captacao", canal: "whatsapp" };
  modal(m.id ? "Editar modelo" : "Novo modelo", '<form class="form" novalidate><div class="f full"><label for="fm-nome">Nome</label><input class="inp" id="fm-nome" value="' + esc(m.nome || "") + '" placeholder="Ex.: Retomar cliente de site"></div>' +
    '<div class="f"><label for="fm-obj">Objetivo</label><select class="inp" id="fm-obj">' + Object.keys(OBJETIVOS).map(function (o) { return '<option value="' + o + '"' + (m.objetivo === o ? " selected" : "") + ">" + OBJETIVOS[o] + "</option>"; }).join("") + '</select></div><div class="f"><label for="fm-canal">Canal</label><select class="inp" id="fm-canal"><option value="whatsapp"' + (m.canal !== "email" ? " selected" : "") + '>WhatsApp</option><option value="email"' + (m.canal === "email" ? " selected" : "") + ">E-mail</option></select></div>" +
    '<div class="f full" id="fm-gat-box"><label for="fm-gat">Quando usar (tipo de resposta do cliente)</label><select class="inp" id="fm-gat">' + GATILHOS.map(function (g) { return '<option value="' + g.id + '"' + (m.gatilho === g.id ? " selected" : "") + ">" + esc(g.nome) + "</option>"; }).join("") + "</select></div>" +
    '<div class="f"><label for="fm-nicho">Nicho (opcional)</label><input class="inp" id="fm-nicho" value="' + esc(m.nicho || "") + '" placeholder="Vale para todos se vazio"></div><div class="f"><label for="fm-ass">Assunto do e-mail</label><input class="inp" id="fm-ass" value="' + esc(m.assunto || "") + '"></div>' +
    '<div class="f full"><label for="fm-corpo">Mensagem</label><textarea class="inp" id="fm-corpo" style="min-height:150px">' + esc(m.corpo || "") + '</textarea><span class="hint">Use {nome}, {empresa}, {cidade}, {nicho} ou {produto}: cada pessoa recebe com os próprios dados.</span></div></form>' +
    '<div class="acoes">' + (m.id ? '<button class="btn danger esq" type="button" id="fm-del">Excluir</button>' : "") + '<button class="btn" type="button" data-fechar>Cancelar</button><button class="btn pri" type="button" id="fm-ok">Salvar</button></div>', function (bx) {
    var ob = $("#fm-obj", bx); function visG() { $("#fm-gat-box", bx).hidden = ob.value !== "resposta"; } ob.addEventListener("change", visG); visG();
    $("#fm-ok", bx).onclick = async function () {
      var d = { nome: $("#fm-nome", bx).value.trim(), objetivo: $("#fm-obj", bx).value, gatilho: $("#fm-obj", bx).value === "resposta" ? $("#fm-gat", bx).value : "", canal: $("#fm-canal", bx).value, nicho: $("#fm-nicho", bx).value.trim(), assunto: $("#fm-ass", bx).value.trim(), corpo: $("#fm-corpo", bx).value.trim() };
      if (!d.nome || !d.corpo) { toast("Preencha o nome e a mensagem."); return; }
      var r = m.id ? await sb.from("modelos").update(d).eq("id", m.id).select().single() : await sb.from("modelos").insert(d).select().single();
      if (r.error) return erro(r.error);
      if (m.id) S.modelos = S.modelos.map(function (x) { return x.id === m.id ? r.data : x; }); else S.modelos.push(r.data);
      fecharModal(); toast("Modelo salvo."); render();
    };
    var del = $("#fm-del", bx);
    if (del) del.onclick = async function () { if (del.dataset.c !== "1") { del.dataset.c = "1"; del.textContent = "Confirmar exclusão"; return; } var r = await sb.from("modelos").delete().eq("id", m.id); if (r.error) return erro(r.error); S.modelos = S.modelos.filter(function (x) { return x.id !== m.id; }); fecharModal(); render(); };
  });
}
function tabCampanha(el) {
  var c = S.camp, ehLead = c.publico === "lead";
  var base = ehLead ? S.leads : S.clientes, sts = ehLead ? LEAD_ST : CLI_ST;
  if (!c.st.every(function (s) { return sts.some(function (x) { return x[0] === s; }); })) c.st = [sts[0][0]];
  var nichos = {}; base.forEach(function (x) { var nn = x.nicho || x.categoria || ""; if (nn) nichos[nn] = (nichos[nn] || 0) + 1; });
  var alvo = base.filter(function (x) { return c.st.indexOf(x.status) >= 0 && (!c.nicho || (x.nicho || x.categoria) === c.nicho); });
  var comCanal = alvo.filter(function (x) { return ehLead ? (x.whatsapp || x.tel_digitos || x.email) : (telWa(x.telefone) || x.email); });
  var mods = S.modelos.filter(function (m) { return m.objetivo !== "resposta" && m.objetivo !== "portfolio" && (!m.nicho || !c.nicho || m.nicho === c.nicho); });
  if (!c.modeloManual) { var querRetomar = (ehLead && c.st.indexOf("reuniao") >= 0) || (!ehLead && c.st.indexOf("retomar") >= 0); var mr = querRetomar && mods.find(function (m) { return m.nome.indexOf(NOME_RETOMAR) === 0 && m.canal === "whatsapp"; }); if (mr) c.modelo = mr.id; }
  if (!mods.some(function (m) { return m.id === c.modelo; })) c.modelo = mods[0] ? mods[0].id : "";
  var mod = S.modelos.find(function (m) { return m.id === c.modelo; });
  var feitos = comCanal.filter(function (x) { return c.feitos[x.id]; }).length;
  el.innerHTML = '<div class="det"><div class="card" style="align-self:start"><div class="card-h"><div><h2>Para quem</h2><p>Escolha o público, o nicho e a etapa</p></div></div>' +
    '<div class="campo"><label>Público</label><div class="chips" id="cp-pub"><button class="chip" type="button" data-p="lead" aria-pressed="' + ehLead + '">Leads da prospecção</button><button class="chip" type="button" data-p="cliente" aria-pressed="' + !ehLead + '">Clientes</button></div></div>' +
    '<div class="campo"><label for="cp-nicho">Nicho</label><select class="inp" id="cp-nicho"><option value="">Todos os nichos</option>' + Object.keys(nichos).sort().map(function (nn) { return '<option value="' + esc(nn) + '"' + (c.nicho === nn ? " selected" : "") + ">" + esc(nn) + " (" + nichos[nn] + ")</option>"; }).join("") + "</select></div>" +
    '<div class="campo"><label>Etapa</label><div class="chips" id="cp-st">' + sts.map(function (s) { var q = base.filter(function (x) { return x.status === s[0] && (!c.nicho || (x.nicho || x.categoria) === c.nicho); }).length; return '<button class="chip" type="button" data-s="' + s[0] + '" aria-pressed="' + (c.st.indexOf(s[0]) >= 0) + '">' + s[1] + '<span class="n">' + q + "</span></button>"; }).join("") + "</div></div>" +
    '<div class="campo"><label for="cp-mod">Modelo</label><select class="inp" id="cp-mod">' + mods.map(function (m) { return '<option value="' + m.id + '"' + (m.id === c.modelo ? " selected" : "") + ">" + esc(OBJETIVOS[m.objetivo] + " · " + m.nome) + "</option>"; }).join("") + "</select></div>" +
    (mod && comCanal[0] ? '<div class="campo"><label>Prévia com ' + esc(comCanal[0].nome || comCanal[0].empresa) + '</label><div class="prev">' + esc(preencher(mod.corpo, comCanal[0], c.publico)) + "</div></div>" : "") +
    '<p class="hint">WhatsApp abre um por vez com a mensagem pronta, no seu número. Isso evita bloqueio. Disparo automático em massa pela API oficial da Meta fica para a próxima etapa.</p></div>' +
    '<div class="card" style="align-self:start"><div class="card-h"><div><h2>' + comCanal.length + " contatos</h2><p>" + feitos + " de " + comCanal.length + " enviados nesta sessão" + (alvo.length - comCanal.length ? " · " + (alvo.length - comCanal.length) + " sem WhatsApp ou e-mail" : "") + "</p></div>" + (mod && mod.canal === "email" ? '<button class="btn sm" type="button" id="cp-mails">Copiar e-mails</button>' : "") + "</div>" +
    '<div class="minibar" style="margin-bottom:8px"><i style="width:' + (comCanal.length ? feitos / comCanal.length * 100 : 0) + '%"></i></div>' +
    (comCanal.length ? comCanal.slice(0, 150).map(function (x) {
      var wa = ehLead ? (x.whatsapp || x.tel_digitos) : telWa(x.telefone);
      var porEmail = mod && mod.canal === "email";
      var pode = porEmail ? !!x.email : !!wa;
      return '<div class="dest' + (c.feitos[x.id] ? " feito" : "") + '"><div><b>' + esc(x.nome || x.empresa) + '</b><div class="sub">' + esc([x.nicho || x.categoria, x.bairro || x.cidade, x.ultimo_contato ? "contato " + quando(x.ultimo_contato) : ""].filter(Boolean).join(" · ")) + "</div></div>" +
        (pode ? '<button class="btn sm ' + (porEmail ? "" : "wa") + '" type="button" data-env="' + x.id + '">' + (c.feitos[x.id] ? "Enviado" : porEmail ? "E-mail" : ICON.wa + "Enviar") + "</button>" : '<span class="sub">sem ' + (porEmail ? "e-mail" : "WhatsApp") + "</span>") + "</div>";
    }).join("") + (comCanal.length > 150 ? '<p class="hint">Mostrando os 150 primeiros. Filtre por nicho para ver o resto.</p>' : "") : '<div class="vazio">Ninguém com esse filtro.</div>') + "</div></div>";
  $("#cp-pub", el).onclick = function (e) { var b = e.target.closest("[data-p]"); if (b) { c.publico = b.dataset.p; c.st = [b.dataset.p === "lead" ? "novo" : "retomar"]; c.nicho = ""; c.modeloManual = false; render(); } };
  $("#cp-nicho", el).onchange = function () { c.nicho = this.value; render(); };
  $("#cp-st", el).onclick = function (e) { var b = e.target.closest("[data-s]"); if (!b) return; var i = c.st.indexOf(b.dataset.s); if (i >= 0) { if (c.st.length > 1) c.st.splice(i, 1); } else c.st.push(b.dataset.s); c.modeloManual = false; render(); };
  $("#cp-mod", el).onchange = function () { c.modelo = this.value; c.modeloManual = true; render(); };
  var cm = $("#cp-mails", el); if (cm) cm.onclick = function () { copiar(comCanal.map(function (x) { return x.email; }).filter(Boolean).join(", ")); };
  $$("[data-env]", el).forEach(function (b) { b.onclick = async function () {
    var x = base.find(function (y) { return y.id === b.dataset.env; }); if (!x || !mod) return;
    var txt = preencher(mod.corpo, x, c.publico);
    if (mod.canal === "email") location.href = "mailto:" + encodeURIComponent(x.email) + "?subject=" + encodeURIComponent(preencher(mod.assunto || "Contato", x, c.publico)) + "&body=" + encodeURIComponent(txt);
    else window.open("https://wa.me/" + (ehLead ? (x.whatsapp || x.tel_digitos) : telWa(x.telefone)) + "?text=" + encodeURIComponent(txt), "_blank");
    c.feitos[x.id] = 1; await registrarDisparo(c.publico, x, mod, mod.canal, txt); render();
  }; });
}

/* ═════════════ CONEXÕES ═════════════ */
function vConexoes(box) {
  var url = location.origin + "/api/kiwify?k=" + (S.cfg ? S.cfg.webhook_chave : "");
  var kwOn = S.cfg && S.cfg.ultimo_webhook;
  var cards = [
    { n: "Kiwify", st: kwOn ? ["on", "Recebendo"] : ["wait", "Falta colar o endereço"], html: '<p>Vendas, reembolsos, chargebacks e carrinhos abandonados entram sozinhos, na hora, e criam o projeto e o cliente se ainda não existirem.</p><div class="code"><span>' + esc(url) + '</span><button class="btn sm" type="button" data-cp="' + esc(url) + '">' + ICON.copia + 'Copiar</button></div><ol class="steps"><li>Na Kiwify, abra <b>Apps → Webhooks → Criar webhook</b>.</li><li>Cole o endereço acima em <b>URL do webhook</b>.</li><li>Em produtos, escolha <b>Todos</b>. Em eventos, marque <b>todos</b>.</li><li>Salve e toque em <b>Testar webhook</b>. O status aqui muda para Recebendo.</li></ol>' + (kwOn ? '<p class="sub">Último aviso recebido ' + quando(S.cfg.ultimo_webhook) + ".</p>" : "") },
    { n: "Links rastreados", st: S.links.length ? ["on", S.links.length + " ativos"] : ["off", "Nenhum ainda"], html: "<p>Cada link conta cliques por projeto e por canal antes de levar para a página de venda. Use um na bio do TikTok, outro na do Instagram.</p>" + (S.links.length ? '<div class="stat-list">' + S.links.map(function (l) { return "<div><span>/r/" + esc(l.slug) + " · " + esc(nomeProj(l.projeto_id) || "sem projeto") + "</span><b>" + int(l.cliques) + ' <button class="btn sm ghost" type="button" data-cp="' + esc(location.origin + "/r/" + l.slug) + '" aria-label="Copiar">' + ICON.copia + "</button></b></div>"; }).join("") + "</div>" : "") + '<button class="btn sm" type="button" id="cx-link">Criar link</button>' },
    { n: "Prospecção", st: ["on", "Conectado"], html: "<p>Mesmo banco do app de Prospecção: " + int(S.leads.length) + " leads aparecem aqui, e o que você muda na Central vale lá também.</p>" + '<a class="btn sm" href="' + PROSPECCAO_URL + '" target="_blank" rel="noopener">' + ICON.ext + "Abrir Prospecção</a>" },
    { n: "Sites da Vercel", st: ["on", sites().length + " importados"], html: "<p>Os sites da sua conta já estão em Hospedagens, com verificação de quem está no ar. A importação automática de sites novos entra na próxima etapa.</p>" },
    { n: "HubSpot", st: ["wait", "Próxima etapa"], html: "<p>Sincroniza leads e clientes com o HubSpot nos dois sentidos.</p><ol class=\"steps\"><li>Precisa de uma <b>chave de app privado</b> do HubSpot, criada nas configurações dele.</li></ol>" },
    { n: "Instagram", st: ["wait", "Próxima etapa"], html: "<p>Views, alcance e seguidores de cada Reels, puxados todo dia.</p><ol class=\"steps\"><li>Conta profissional (criador ou empresa).</li><li>App da Meta criado uma vez, com passo a passo.</li></ol>" },
    { n: "TikTok", st: ["off", "Depende de aprovação"], html: "<p>Views de cada vídeo, depois que o TikTok aprovar o app. Até lá, registre as views do dia no projeto.</p>" },
    { n: "E-mail automático", st: ["off", "Próxima etapa"], html: "<p>Disparo de e-mail em massa pela própria Central. Precisa de uma conta gratuita no Resend e de um domínio seu.</p>" },
    { n: "Login com Google", st: ["wait", "Falta a chave do Google"], html: "<p>O botão já está na tela de entrada. Para funcionar, falta criar a chave de login no Google Cloud e colar no Supabase. Eu te passo o passo a passo.</p>" }
  ];
  box.innerHTML = '<div class="cons">' + cards.map(function (c) { return '<div class="card con"><div class="con-h"><b>' + c.n + '</b><span class="st ' + c.st[0] + '">' + esc(c.st[1]) + "</span></div>" + c.html + "</div>"; }).join("") + '</div><div class="card"><div class="card-h"><div><h2>Sua conta</h2><p>' + esc(S.user.email) + '</p></div><button class="btn" type="button" id="cx-sair">Sair</button></div><p class="hint">Instale no celular: no Chrome, toque nos três pontos e em <b>Instalar app</b>. No iPhone ou iPad, toque em Compartilhar e em <b>Adicionar à Tela de Início</b>.</p></div>';
  $$("[data-cp]", box).forEach(function (b) { b.onclick = function () { copiar(b.dataset.cp); }; });
  $("#cx-link").onclick = function () { formLink(null); };
  $("#cx-sair").onclick = function () { sb.auth.signOut(); };
}

/* ═════════════ AGENDA ═════════════ */
var TIPO_AG = { reuniao: ["Reunião", "info"], retomada: ["Retomada", "warn"], tarefa: ["Tarefa", "dados"] };
function agPend() { return S.agenda.filter(function (a) { return a.status === "pendente"; }).sort(function (a, b) { return a.quando < b.quando ? -1 : 1; }); }
function fimDoDia(d) { var x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
function inicioDoDia(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function agGrupos() {
  var agora = new Date(), hj0 = inicioDoDia(agora), hj1 = fimDoDia(agora);
  var g = { atrasados: [], hoje: [], proximos: [] };
  agPend().forEach(function (a) { var q = new Date(a.quando); if (q < hj0 || (q < agora && q <= hj1 && agora - q > 3600000)) g.atrasados.push(a); else if (q <= hj1) g.hoje.push(a); else g.proximos.push(a); });
  return g;
}
function alvoDe(a) {
  if (a.lead_id) { var l = S.leads.find(function (x) { return x.id === a.lead_id; }); if (l) return { tipo: "lead", obj: l, nome: l.nome }; }
  if (a.cliente_id) { var c = S.clientes.find(function (x) { return x.id === a.cliente_id; }); if (c) return { tipo: "cliente", obj: c, nome: c.nome || c.empresa }; }
  if (a.projeto_id) { var p = S.projetos.find(function (x) { return x.id === a.projeto_id; }); if (p) return { tipo: "projeto", obj: p, nome: p.nome }; }
  return null;
}
function hora(ts) { return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); }
function diaLongo(ts) {
  var d = inicioDoDia(new Date(ts)), h = inicioDoDia(new Date()), dif = Math.round((d - h) / 864e5);
  if (dif === 0) return "Hoje"; if (dif === 1) return "Amanhã"; if (dif === -1) return "Ontem";
  return new Date(ts).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "short" }).replace(/^./, function (c) { return c.toUpperCase(); });
}
function linkGoogleAgenda(a) {
  var al = alvoDe(a), ini = new Date(a.quando), fim = new Date(ini.getTime() + (a.duracao_min || 60) * 60000);
  var f = function (d) { return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""); };
  var titulo = (TIPO_AG[a.tipo] ? TIPO_AG[a.tipo][0] : "Compromisso") + (al ? " · " + al.nome : "") + (a.titulo && (!al || a.titulo.indexOf(al.nome) < 0) ? " · " + a.titulo : "");
  return "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + encodeURIComponent(titulo) + "&dates=" + f(ini) + "/" + f(fim) + "&details=" + encodeURIComponent((a.obs || "") + (a.valor ? "\nValor: " + brl(a.valor) : "") + "\n\nCriado pela Central");
}
var DISPENSADAS = (function () { try { return JSON.parse(localStorage.getItem("central-dispensadas") || "{}"); } catch (e) { return {}; } })();
function dispensar(id) { DISPENSADAS[id] = Date.now(); try { localStorage.setItem("central-dispensadas", JSON.stringify(DISPENSADAS)); } catch (e) {} }
function sugestoes() {
  var out = [], agora = Date.now(), D = 864e5;
  var comPend = {}; agPend().forEach(function (a) { if (a.lead_id) comPend[a.lead_id] = 1; if (a.cliente_id) comPend[a.cliente_id] = 1; });
  var ok = function (id) { return !comPend[id] && !(DISPENSADAS[id] && agora - DISPENSADAS[id] < 7 * D); };
  S.leads.forEach(function (l) {
    if (!ok(l.id)) return;
    var dias = l.ultimo_contato ? Math.floor((agora - new Date(l.ultimo_contato)) / D) : null;
    if (l.status === "contatado" && dias != null && dias >= 3) out.push({ id: l.id, tipo: "lead", obj: l, nome: l.nome, motivo: "Sem resposta há " + dias + " dias", peso: 2 });
    else if (l.status === "respondeu" && (dias == null || dias >= 1)) out.push({ id: l.id, tipo: "lead", obj: l, nome: l.nome, motivo: "Respondeu e está esperando retorno", peso: 4 });
    else if (l.status === "reuniao") out.push({ id: l.id, tipo: "lead", obj: l, nome: l.nome, motivo: "Em reunião, mas sem data marcada", peso: 3 });
  });
  S.clientes.forEach(function (c) {
    if (!ok(c.id)) return;
    var ref = c.ultimo_contato || c.criado_em, dias = Math.floor((agora - new Date(ref)) / D);
    if (c.status === "retomar") out.push({ id: c.id, tipo: "cliente", obj: c, nome: c.nome || c.empresa, motivo: c.origem === "kiwify" ? "Carrinho abandonado ou compra parada" : "Marcado para retomar", peso: 3 });
    else if ((c.status === "ativo" || c.status === "recorrente") && dias >= 30) out.push({ id: c.id, tipo: "cliente", obj: c, nome: c.nome || c.empresa, motivo: "Sem contato há " + dias + " dias", peso: 1 });
  });
  return out.sort(function (a, b) { return b.peso - a.peso; });
}
async function criarAgenda(d) {
  var r = await sb.from("agenda").insert(d).select().single();
  if (r.error) { erro(r.error); return null; }
  S.agenda.push(r.data); return r.data;
}
async function mudarAgenda(a, mud) {
  var r = await sb.from("agenda").update(mud).eq("id", a.id).select().single();
  if (r.error) { erro(r.error); return null; }
  S.agenda = S.agenda.map(function (x) { return x.id === a.id ? r.data : x; }); return r.data;
}
function itemAgenda(a, atrasado) {
  var al = alvoDe(a), t = TIPO_AG[a.tipo] || ["Compromisso", "dados"];
  return '<div class="ag-item' + (atrasado ? " atrasado" : "") + '" data-ag="' + a.id + '"><div class="ag-hora num">' + hora(a.quando) + '</div><div class="ag-txt"><div class="ag-top"><span class="tag t-' + t[1] + '">' + t[0] + "</span>" + (atrasado ? '<span class="sub down">' + diaLongo(a.quando) + "</span>" : "") + "</div><b>" + esc(al ? al.nome : (a.titulo || "Sem título")) + "</b>" + (a.titulo && al ? '<span class="sub">' + esc(a.titulo) + "</span>" : "") + (a.obs ? '<span class="sub ag-obs">' + esc(a.obs.slice(0, 140)) + "</span>" : "") + (a.valor ? '<span class="sub">Valor ' + brl(a.valor, 0) + "</span>" : "") + '</div><div class="ag-acoes"><button class="btn sm" type="button" data-feito="' + a.id + '" aria-label="Marcar como feito">✓ Feito</button><button class="btn sm ghost" type="button" data-adiar="' + a.id + '">Adiar 1 dia</button>' + (al && al.tipo !== "projeto" ? '<button class="btn sm ghost" type="button" data-abrir="' + a.id + '">' + ICON.wa + "Mensagem</button>" : "") + '<a class="btn sm ghost" href="' + esc(linkGoogleAgenda(a)) + '" target="_blank" rel="noopener">Google Agenda</a><button class="btn sm ghost" type="button" data-ed-ag="' + a.id + '" aria-label="Editar">Editar</button></div></div>';
}
function ligarItensAgenda(box) {
  $$("[data-feito]", box).forEach(function (b) { b.onclick = async function () { var a = S.agenda.find(function (x) { return x.id === b.dataset.feito; }); if (a && await mudarAgenda(a, { status: "feito", concluido_em: new Date().toISOString() })) { toast("Feito."); render(); montarMenu(); } }; });
  $$("[data-adiar]", box).forEach(function (b) { b.onclick = async function () { var a = S.agenda.find(function (x) { return x.id === b.dataset.adiar; }); if (!a) return; var q = new Date(a.quando); var base = q < new Date() ? new Date() : q; base.setDate(base.getDate() + 1); base.setHours(q.getHours(), q.getMinutes(), 0, 0); if (await mudarAgenda(a, { quando: base.toISOString() })) { toast("Adiado para " + diaLongo(base).toLowerCase() + "."); render(); montarMenu(); } }; });
  $$("[data-abrir]", box).forEach(function (b) { b.onclick = function () { var a = S.agenda.find(function (x) { return x.id === b.dataset.abrir; }); var al = a && alvoDe(a); if (!al) return; var ctx = a.tipo === "reuniao" || a.tipo === "retomada" ? "reuniao" : ""; if (al.tipo === "lead") abrirLead(al.obj.id, ctx); else abrirCliente(al.obj.id, ctx); }; });
  $$("[data-ed-ag]", box).forEach(function (b) { b.onclick = function () { formAgenda(S.agenda.find(function (x) { return x.id === b.dataset.edAg; })); }; });
}
function vAgenda(box) {
  acaoTopo("Novo compromisso", function () { formAgenda(); });
  var g = agGrupos(), sug = sugestoes();
  var sete = g.proximos.filter(function (a) { return new Date(a.quando) - new Date() < 7 * 864e5; }).length;
  var perm = "Notification" in window ? Notification.permission : "indisponivel";
  box.innerHTML = '<div class="kpis"><div class="kpi"><span class="l">Atrasados</span><span class="v num ' + (g.atrasados.length ? "down" : "") + '">' + g.atrasados.length + '</span><span class="d flat">resolva primeiro</span></div><div class="kpi"><span class="l">Hoje</span><span class="v num">' + g.hoje.length + '</span><span class="d flat">' + (g.hoje[0] ? "próximo às " + hora(g.hoje[0].quando) : "dia livre") + '</span></div><div class="kpi"><span class="l">Próximos 7 dias</span><span class="v num">' + sete + '</span><span class="d flat">reuniões, retomadas e tarefas</span></div><div class="kpi"><span class="l">Retomadas sugeridas</span><span class="v num">' + sug.length + '</span><span class="d flat">leads e clientes parados</span></div></div>' +
    (perm === "default" ? '<div class="card aviso-card"><div><b>Ative os avisos no celular</b><p class="sub">A Central avisa 15 minutos antes de cada compromisso enquanto estiver aberta ou instalada. Para lembrete garantido com o app fechado, use o botão Google Agenda em cada item.</p></div><button class="btn pri" type="button" id="ag-perm">Ativar avisos</button></div>' : "") +
    '<div class="det"><div style="display:grid;gap:16px;align-content:start">' +
    (g.atrasados.length ? '<div class="card"><div class="card-h"><div><h2 class="down">Atrasados</h2><p>Passaram do horário e não foram marcados como feitos</p></div></div><div class="ag-lista">' + g.atrasados.map(function (a) { return itemAgenda(a, true); }).join("") + "</div></div>" : "") +
    '<div class="card"><div class="card-h"><div><h2>Hoje</h2><p>' + new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }) + "</p></div></div>" + (g.hoje.length ? '<div class="ag-lista">' + g.hoje.map(function (a) { return itemAgenda(a); }).join("") + "</div>" : '<div class="vazio">Nada marcado para hoje. Fale no microfone para agendar.</div>') + "</div>" +
    '<div class="card"><div class="card-h"><div><h2>Próximos dias</h2></div></div>' + (g.proximos.length ? (function () { var html = "", dia = ""; g.proximos.slice(0, 60).forEach(function (a) { var dl = diaLongo(a.quando); if (dl !== dia) { dia = dl; html += '<div class="ag-dia">' + esc(dl) + "</div>"; } html += itemAgenda(a); }); return '<div class="ag-lista">' + html + "</div>"; })() : '<div class="vazio">Nenhum compromisso futuro.</div>') + "</div></div>" +
    '<div class="card" style="align-self:start"><div class="card-h"><div><h2>Retomadas sugeridas</h2><p>Quem está parado e merece um contato</p></div></div>' + (sug.length ? '<div class="ag-lista">' + sug.slice(0, 40).map(function (s) {
      return '<div class="sug" data-sug="' + s.id + '"><div><b>' + esc(s.nome) + '</b><span class="sub">' + (s.tipo === "lead" ? "Lead · " : "Cliente · ") + esc(s.motivo) + '</span></div><div class="ag-acoes"><button class="btn sm" type="button" data-sg-ag="' + s.id + '">Agendar amanhã</button><button class="btn sm wa" type="button" data-sg-msg="' + s.id + '">' + ICON.wa + 'Falar agora</button><button class="btn sm ghost" type="button" data-sg-x="' + s.id + '">Ignorar</button></div></div>'; }).join("") + "</div>" : '<div class="vazio">Ninguém parado. Bom trabalho.</div>') + "</div></div>";
  ligarItensAgenda(box);
  var bp = $("#ag-perm"); if (bp) bp.onclick = function () { Notification.requestPermission().then(function (p) { toast(p === "granted" ? "Avisos ativados." : "Avisos não foram permitidos."); render(); }); };
  $$("[data-sg-ag]", box).forEach(function (b) { b.onclick = async function () { var s = sug.find(function (x) { return x.id === b.dataset.sgAg; }); var q = new Date(); q.setDate(q.getDate() + 1); q.setHours(10, 0, 0, 0); var d = { tipo: s.tipo === "lead" && s.obj.status === "reuniao" ? "reuniao" : "retomada", titulo: s.motivo, quando: q.toISOString(), origem: "sugestao" }; d[s.tipo === "lead" ? "lead_id" : "cliente_id"] = s.id; if (await criarAgenda(d)) { toast("Agendado para amanhã às 10h."); render(); montarMenu(); } }; });
  $$("[data-sg-msg]", box).forEach(function (b) { b.onclick = function () { var s = sug.find(function (x) { return x.id === b.dataset.sgMsg; }); if (s.tipo === "lead") abrirLead(s.id); else abrirCliente(s.id); }; });
  $$("[data-sg-x]", box).forEach(function (b) { b.onclick = function () { dispensar(b.dataset.sgX); toast("Ignorado por 7 dias."); render(); }; });
}
function valorDataLocal(d) { var x = new Date(d); return x.getFullYear() + "-" + pad(x.getMonth() + 1) + "-" + pad(x.getDate()) + "T" + pad(x.getHours()) + ":" + pad(x.getMinutes()); }
function opcoesAlvo(sel) {
  var h = '<option value="">Sem vínculo</option><optgroup label="Leads">' + S.leads.slice().sort(function (a, b) { return a.nome.localeCompare(b.nome); }).map(function (l) { return '<option value="lead:' + l.id + '"' + (sel === "lead:" + l.id ? " selected" : "") + ">" + esc(l.nome) + "</option>"; }).join("") + '</optgroup><optgroup label="Clientes">' + S.clientes.map(function (c) { return '<option value="cliente:' + c.id + '"' + (sel === "cliente:" + c.id ? " selected" : "") + ">" + esc(c.nome || c.empresa) + "</option>"; }).join("") + '</optgroup><optgroup label="Projetos">' + projetosNegocio().map(function (p) { return '<option value="projeto:' + p.id + '"' + (sel === "projeto:" + p.id ? " selected" : "") + ">" + esc(p.nome) + "</option>"; }).join("") + "</optgroup>";
  return h;
}
function formAgenda(a) {
  var q = new Date(); q.setDate(q.getDate() + 1); q.setHours(10, 0, 0, 0);
  a = a || { tipo: "reuniao", quando: q.toISOString(), duracao_min: 60 };
  var sel = a.lead_id ? "lead:" + a.lead_id : a.cliente_id ? "cliente:" + a.cliente_id : a.projeto_id ? "projeto:" + a.projeto_id : "";
  modal(a.id ? "Editar compromisso" : "Novo compromisso", '<form class="form" novalidate><div class="f"><label for="fa-tipo">Tipo</label><select class="inp" id="fa-tipo">' + Object.keys(TIPO_AG).map(function (t) { return '<option value="' + t + '"' + (a.tipo === t ? " selected" : "") + ">" + TIPO_AG[t][0] + "</option>"; }).join("") + '</select></div><div class="f"><label for="fa-q">Quando</label><input class="inp" id="fa-q" type="datetime-local" value="' + valorDataLocal(a.quando) + '"></div>' +
    '<div class="f full"><label for="fa-alvo">Com quem</label><select class="inp" id="fa-alvo">' + opcoesAlvo(sel) + '</select></div><div class="f full"><label for="fa-tit">Assunto</label><input class="inp" id="fa-tit" value="' + esc(a.titulo || "") + '" placeholder="Ex.: Apresentar proposta do site"></div>' +
    '<div class="f"><label for="fa-dur">Duração (min)</label><input class="inp" id="fa-dur" type="number" min="5" step="5" value="' + (a.duracao_min || 60) + '"></div><div class="f"><label for="fa-val">Valor em jogo (R$)</label><input class="inp" id="fa-val" type="number" min="0" step="0.01" value="' + (a.valor || "") + '"></div>' +
    '<div class="f full"><label for="fa-obs">Anotações</label><textarea class="inp" id="fa-obs" style="min-height:80px">' + esc(a.obs || "") + "</textarea></div></form>" +
    '<div class="acoes">' + (a.id ? '<button class="btn danger esq" type="button" id="fa-del">Cancelar compromisso</button>' : "") + '<button class="btn" type="button" data-fechar>Fechar</button><button class="btn pri" type="button" id="fa-ok">Salvar</button></div>', function (bx) {
    $("#fa-ok", bx).onclick = async function () {
      var al = $("#fa-alvo", bx).value.split(":"), qv = $("#fa-q", bx).value;
      if (!qv) { toast("Escolha dia e hora."); return; }
      var d = { tipo: $("#fa-tipo", bx).value, quando: new Date(qv).toISOString(), titulo: $("#fa-tit", bx).value.trim(), duracao_min: n($("#fa-dur", bx).value) || 60, valor: n($("#fa-val", bx).value), obs: $("#fa-obs", bx).value, lead_id: al[0] === "lead" ? al[1] : null, cliente_id: al[0] === "cliente" ? al[1] : null, projeto_id: al[0] === "projeto" ? al[1] : null };
      var ok = a.id ? await mudarAgenda(a, d) : await criarAgenda(d);
      if (ok) { fecharModal(); toast("Compromisso salvo."); render(); montarMenu(); }
    };
    var del = $("#fa-del", bx);
    if (del) del.onclick = async function () { if (await mudarAgenda(a, { status: "cancelado" })) { fecharModal(); toast("Compromisso cancelado."); render(); montarMenu(); } };
  });
}
function wAgenda(el) {
  var g = agGrupos(), sug = sugestoes(), lista = g.atrasados.concat(g.hoje).slice(0, 6);
  el.innerHTML = '<div class="card-h"><div><h2>Agenda de hoje</h2><p>' + (g.atrasados.length ? '<span class="down">' + g.atrasados.length + " atrasados</span> · " : "") + g.hoje.length + " hoje · " + sug.length + ' retomadas sugeridas</p></div><button class="btn sm" type="button" data-v="agenda">Abrir</button></div>' +
    (lista.length ? '<div class="ag-lista compacta">' + lista.map(function (a) { var al = alvoDe(a), t = TIPO_AG[a.tipo]; var atr = g.atrasados.indexOf(a) >= 0; return '<div class="ag-mini' + (atr ? " atrasado" : "") + '"><span class="num">' + (atr ? curta(diaDe(a.quando)) : hora(a.quando)) + '</span><span class="tag t-' + t[1] + '">' + t[0] + "</span><b>" + esc(al ? al.nome : a.titulo) + "</b></div>"; }).join("") + "</div>" : '<div class="vazio">Nada para hoje. ' + (sug.length ? sug.length + " contatos esperando retomada." : "") + "</div>");
}

/* ───────────── lembretes ───────────── */
var AVISADOS = (function () { try { return JSON.parse(localStorage.getItem("central-avisados") || "{}"); } catch (e) { return {}; } })();
function avisar(titulo, corpo, tag) {
  toast(titulo + " · " + corpo);
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  var op = { body: corpo, icon: "/icone-192.png", badge: "/icone-192.png", tag: tag, renotify: true };
  if (navigator.serviceWorker && navigator.serviceWorker.ready) navigator.serviceWorker.ready.then(function (r) { r.showNotification(titulo, op); }).catch(function () { try { new Notification(titulo, op); } catch (e) {} });
  else { try { new Notification(titulo, op); } catch (e) {} }
}
function checarLembretes() {
  if (!S.user) return;
  var agora = Date.now();
  agPend().forEach(function (a) {
    var q = new Date(a.quando).getTime(), chave = a.id + "@" + a.quando;
    if (AVISADOS[chave]) return;
    if (q - agora <= 15 * 60000 && q - agora > -10 * 60000) {
      AVISADOS[chave] = agora;
      var al = alvoDe(a), t = TIPO_AG[a.tipo] ? TIPO_AG[a.tipo][0] : "Compromisso";
      avisar(t + (q > agora ? " às " + hora(a.quando) : " agora"), (al ? al.nome : a.titulo) + (a.titulo && al ? " · " + a.titulo : ""), a.id);
    }
  });
  Object.keys(AVISADOS).forEach(function (k) { if (agora - AVISADOS[k] > 3 * 864e5) delete AVISADOS[k]; });
  try { localStorage.setItem("central-avisados", JSON.stringify(AVISADOS)); } catch (e) {}
}
function resumoDoDia() {
  var chave = "central-resumo-" + hoje(); try { if (localStorage.getItem(chave)) return; localStorage.setItem(chave, "1"); } catch (e) {}
  var g = agGrupos(), sug = sugestoes().length;
  if (g.atrasados.length || g.hoje.length || sug) setTimeout(function () { toast("Hoje: " + g.hoje.length + (g.hoje.length === 1 ? " compromisso" : " compromissos") + (g.atrasados.length ? ", " + g.atrasados.length + (g.atrasados.length === 1 ? " atrasado" : " atrasados") : "") + (sug ? " e " + sug + (sug === 1 ? " retomada sugerida" : " retomadas sugeridas") : "") + "."); }, 1500);
}

/* ═════════════ RESPONDER CLIENTE ═════════════ */
// Cada gatilho: como reconhecer, o que significa, o status sugerido e o que agendar. O texto da resposta vem dos modelos (editáveis).
function respostasDe(gatilho) { return S.modelos.filter(function (m) { return m.objetivo === "resposta" && m.gatilho === gatilho; }); }
function carregarOCR() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  return new Promise(function (ok, falha) { var s = document.createElement("script"); s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js"; s.onload = function () { ok(window.Tesseract); }; s.onerror = function () { falha(new Error("não deu para carregar o leitor de prints")); }; document.head.appendChild(s); });
}
async function lerPrint(arquivo, aoProgresso) {
  var T = await carregarOCR();
  var r = await T.recognize(arquivo, "por", { logger: function (m) { if (m.status === "recognizing text" && aoProgresso) aoProgresso(Math.round(m.progress * 100)); } });
  return r.data.text || "";
}
function portfolioTexto() {
  var p = S.perfil && S.perfil.portfolio;
  if (p) return p;
  var orla = sites().find(function (s) { return /orla/i.test(s.nome); });
  return orla ? orla.url : "posso te mandar os links por aqui";
}
function quandoTexto(d, comHora) {
  var dif = Math.round((inicioDoDia(d) - inicioDoDia(new Date())) / 864e5), dow = d.getDay();
  var nomes = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  var s = dif === 0 ? "hoje" : dif === 1 ? "amanhã" : dif > 1 && dif < 7 ? (dow === 0 || dow === 6 ? "no " : "na ") + nomes[dow] + " (" + pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + ")" : "no dia " + pad(d.getDate()) + "/" + pad(d.getMonth() + 1);
  if (comHora) s += " às " + d.getHours() + "h" + (d.getMinutes() ? pad(d.getMinutes()) : "");
  return s;
}
S.resp = S.resp || { texto: "", alvo: "", resultado: null };
function vResponder(box) {
  var r = S.resp;
  var ult = S.disparos.filter(function (d) { return d.objetivo === "resposta"; }).slice(-12).reverse();
  box.innerHTML = '<div class="det"><div class="card" style="align-self:start"><div class="card-h"><div><h2>Resposta do cliente</h2><p>Cole o que ele escreveu ou envie o print da conversa</p></div></div>' +
    '<textarea class="inp" id="rp-txt" style="min-height:140px" placeholder="Ex.: Obrigado, mas já temos um site e no momento não temos interesse.">' + esc(r.texto) + "</textarea>" +
    '<div class="acoes" style="margin-top:10px;justify-content:flex-start"><button class="btn" type="button" id="rp-colar">' + ICON.copia + 'Colar</button><label class="btn" for="rp-img" style="cursor:pointer">Enviar print</label><input type="file" id="rp-img" accept="image/*" hidden><span class="hint" id="rp-ocr"></span></div>' +
    '<div class="campo" style="margin-top:12px"><label for="rp-alvo">De quem é</label><select class="inp" id="rp-alvo">' + opcoesAlvo(r.alvo) + "</select></div>" +
    '<button class="btn pri full" type="button" id="rp-ok">Analisar e sugerir resposta</button>' +
    '<p class="hint" style="margin-top:10px">Dica: no celular, com a Central instalada, você pode compartilhar o print ou o texto direto do WhatsApp para a Central.</p></div>' +
    '<div id="rp-res" style="display:grid;gap:16px;align-content:start">' + (r.resultado ? "" : '<div class="card vazio"><b>A resposta sugerida aparece aqui.</b>A Central identifica se foi uma negativa, dúvida de preço, falta de tempo, interesse ou aprovação, e já deixa a mensagem pronta.</div>') + "</div></div>" +
    (ult.length ? '<div class="card"><div class="card-h"><div><h2>Últimas respostas enviadas</h2></div></div><div class="stat-list">' + ult.map(function (d) { var a = d.publico === "lead" ? S.leads.find(function (l) { return l.id === d.destinatario_id; }) : S.clientes.find(function (c) { return c.id === d.destinatario_id; }); var m = S.modelos.find(function (x) { return x.id === d.modelo_id; }); return "<div><span>" + esc(a ? (a.nome || a.empresa) : "Contato") + " · " + esc(m ? m.nome : "resposta") + "</span><b>" + quando(d.criado_em) + "</b></div>"; }).join("") + "</div></div>" : "");
  var tx = $("#rp-txt"), al = $("#rp-alvo");
  tx.oninput = function () { r.texto = tx.value; };
  al.onchange = function () { r.alvo = al.value; };
  $("#rp-colar").onclick = function () { if (navigator.clipboard && navigator.clipboard.readText) navigator.clipboard.readText().then(function (t) { tx.value = t; r.texto = t; analisar(); }, function () { toast("Não deu para colar automático. Segure no campo e cole."); tx.focus(); }); else { toast("Segure no campo e cole."); tx.focus(); } };
  $("#rp-img").onchange = function () { var f = this.files && this.files[0]; if (f) processarPrint(f); this.value = ""; };
  $("#rp-ok").onclick = analisar;
  if (r.resultado) mostrarSugestao();
}
async function processarPrint(arquivo) {
  var info = $("#rp-ocr"); if (info) info.textContent = "Lendo o print…";
  try {
    var bruto = await lerPrint(arquivo, function (p) { var i = $("#rp-ocr"); if (i) i.textContent = "Lendo o print… " + p + "%"; });
    var limpo = limparOCR(bruto);
    S.resp.texto = limpo;
    if (!S.resp.alvo) { var c = candidatos(bruto).filter(function (x) { return x.tipo !== "projeto"; })[0]; if (c) S.resp.alvo = c.tipo + ":" + c.obj.id; }
    if (S.view !== "responder") ir("responder"); else render();
    var i2 = $("#rp-ocr"); if (i2) i2.textContent = "Confira o texto e apague o que não for do cliente.";
    if (limpo) analisar();
  } catch (e) { erro(e); var i3 = $("#rp-ocr"); if (i3) i3.textContent = ""; }
}
function analisar() {
  var r = S.resp, tx = $("#rp-txt"), al = $("#rp-alvo");
  if (tx) r.texto = tx.value.trim(); if (al) r.alvo = al.value;
  if (!r.texto) { toast("Cole a mensagem do cliente ou envie o print."); return; }
  if (!r.alvo) { var c = candidatos(r.texto).filter(function (x) { return x.tipo !== "projeto"; })[0]; if (c && c.sc >= 0.65) { r.alvo = c.tipo + ":" + c.obj.id; if (al) al.value = r.alvo; } }
  var g = classificar(r.texto), dt = extrairData(r.texto);
  var quandoD = dt ? dt.data : null;
  if (!quandoD && (g.agendaDias || g.agendaReuniao)) { quandoD = somaDias(inicioDoDia(new Date()), g.agendaReuniao ? 1 : g.agendaDias); while (quandoD.getDay() === 0 || quandoD.getDay() === 6) quandoD = somaDias(quandoD, 1); quandoD.setHours(10, 0, 0, 0); }
  r.resultado = { g: g, quando: quandoD, temData: !!dt, comHora: !!(dt && !dt.semHora) || !!g.agendaReuniao };
  mostrarSugestao();
}
function alvoResp() { var p = (S.resp.alvo || "").split(":"); if (p[0] === "lead") return { tipo: "lead", obj: S.leads.find(function (x) { return x.id === p[1]; }) }; if (p[0] === "cliente") return { tipo: "cliente", obj: S.clientes.find(function (x) { return x.id === p[1]; }) }; return null; }
function mostrarSugestao() {
  var box = $("#rp-res"); if (!box || !S.resp.resultado) return;
  var res = S.resp.resultado, g = res.g, al = alvoResp(), mods = respostasDe(g.id);
  if (!mods.length) mods = respostasDe("outro");
  var outros = S.modelos.filter(function (m) { return m.objetivo === "resposta" && m.gatilho !== g.id; });
  var num = al && al.obj ? numeroDe(al.tipo, al.obj) : "";
  var temAgenda = !!(g.agendaDias || g.agendaReuniao || res.temData);
  box.innerHTML = '<div class="card plano"><div class="card-h"><div><h2>Resposta sugerida</h2><p>' + esc(g.dica) + '</p></div><span class="tag t-' + g.cor + '">' + esc(g.nome) + "</span></div>" +
    '<div class="campo"><label for="rs-mod">Modelo</label><select class="inp" id="rs-mod">' + mods.map(function (m) { return '<option value="' + m.id + '">' + esc(m.nome) + "</option>"; }).join("") + (outros.length ? '<optgroup label="Outros tipos de resposta">' + outros.map(function (m) { return '<option value="' + m.id + '">' + esc(m.nome) + "</option>"; }).join("") + "</optgroup>" : "") + "</select></div>" +
    '<textarea class="inp" id="rs-txt" style="min-height:120px"></textarea>' +
    '<div class="form" style="margin-top:12px">' + (al ? '<div class="f full chk"><label><input type="checkbox" id="rs-st-on" checked> Atualizar status para</label><select class="inp" id="rs-st">' + (al.tipo === "lead" ? LEAD_ST : CLI_ST).map(function (s) { return '<option value="' + s[0] + '">' + s[1] + "</option>"; }).join("") + "</select></div>" : '<p class="hint full">Escolha de quem é a mensagem para atualizar o status e o histórico automaticamente.</p>') +
    '<div class="f full chk"><label><input type="checkbox" id="rs-ag-on"' + (temAgenda && g.id !== "remover" && g.id !== "sem_interesse" ? " checked" : "") + '> Agendar ' + (g.agendaReuniao ? "reunião" : "retomada") + '</label><input class="inp" id="rs-ag-q" type="datetime-local" value="' + valorDataLocal(res.quando || somaDias(new Date(), 15)) + '"></div>' +
    '<div class="f"><label for="rs-num">WhatsApp</label><input class="inp" id="rs-num" type="tel" inputmode="tel" value="' + esc(telVisivel(num)) + '" placeholder="(21) 99999-9999"></div></div>' +
    '<div class="acoes"><button class="btn ghost" type="button" id="rs-copiar">' + ICON.copia + 'Copiar</button><button class="btn" type="button" id="rs-salvar">Só registrar</button><button class="btn wa" type="button" id="rs-wa">' + ICON.wa + "Enviar no WhatsApp</button></div></div>";
  var sel = $("#rs-mod", box), tx = $("#rs-txt", box);
  function aplicar() {
    var m = S.modelos.find(function (x) { return x.id === sel.value; }); var alvo = al && al.obj ? al.obj : { nome: "" };
    var q = $("#rs-ag-q", box).value ? new Date($("#rs-ag-q", box).value) : res.quando;
    var txt = m ? preencher(m.corpo, alvo, al ? al.tipo : "lead") : "";
    txt = txt.replace(/\{portfolio\}/g, portfolioTexto()).replace(/\{quando\}/g, q ? quandoTexto(q, res.comHora) : "em breve");
    if (!al || !al.obj) txt = txt.replace(/^(Olá|Oi),\s*!/, "$1!").replace(/,\s*!/, "!");
    tx.value = txt;
  }
  sel.onchange = aplicar; $("#rs-ag-q", box).onchange = aplicar; aplicar();
  if (al) { var stSel = $("#rs-st", box); var sug = g.st; if (al.tipo === "cliente") sug = { descartado: "encerrado", fechado: "ativo", reuniao: al.obj.status, respondeu: al.obj.status }[g.st] || al.obj.status; stSel.value = sug; if (al.obj && al.obj.status === sug) $("#rs-st-on", box).checked = false; }
  $("#rs-copiar", box).onclick = function () { copiar(tx.value); };
  $("#rs-salvar", box).onclick = function () { concluirResposta(box, false); };
  $("#rs-wa", box).onclick = function () { concluirResposta(box, true); };
}
async function concluirResposta(box, enviar) {
  var res = S.resp.resultado, g = res.g, al = alvoResp(), txt = $("#rs-txt", box).value.trim();
  var m = S.modelos.find(function (x) { return x.id === $("#rs-mod", box).value; });
  if (enviar) {
    var d = telWa($("#rs-num", box).value);
    if (!d) { toast("Digite o número com DDD para enviar no WhatsApp."); $("#rs-num", box).focus(); return; }
    window.open("https://wa.me/" + d + "?text=" + encodeURIComponent(txt), "_blank");
    if (al && al.obj && d !== numeroDe(al.tipo, al.obj) && !(al.tipo === "lead" && d === al.obj.tel_digitos)) { if (al.tipo === "lead") { var nl = await salvarLead(al.obj, { whatsapp: d }); if (nl) al.obj = nl; } else { var rc = await sb.from("clientes").update({ telefone: d }).eq("id", al.obj.id).select().single(); if (!rc.error) { S.clientes = S.clientes.map(function (x) { return x.id === al.obj.id ? rc.data : x; }); al.obj = rc.data; } } }
  }
  var feito = [], agora = new Date();
  try {
    if (al && al.obj) {
      var stOn = $("#rs-st-on", box) && $("#rs-st-on", box).checked, st = $("#rs-st", box) ? $("#rs-st", box).value : "";
      if (al.tipo === "lead") {
        var l = al.obj, dados = Object.assign({}, l.dados || {}), c = dados.ciclo || {};
        var respostas = (c.respostas || []).concat([{ t: agora.toISOString(), tipo: g.tipo4, txt: S.resp.texto.slice(0, 1000) }]);
        var envios = c.envios || []; if (enviar) envios = envios.concat([{ t: agora.toISOString(), etapa: g.tipo4, dow: agora.getDay(), h: agora.getHours(), txt: txt.slice(0, 1000) }]);
        dados.ciclo = { envios: envios, respostas: respostas, encerrado: !!c.encerrado || g.id === "remover" };
        if (g.id === "remover") dados.nao_contatar = true;
        var hist = (l.historico || []).concat([{ t: agora.toISOString(), tipo: "resposta", txt: "Cliente respondeu (" + g.nome.toLowerCase() + "): " + S.resp.texto.slice(0, 300) }]);
        if (enviar) hist.push({ t: agora.toISOString(), tipo: "whatsapp", txt: "Resposta enviada pela Central: " + (m ? m.nome : "") });
        var mud = { dados: dados, historico: hist, ultimo_contato: agora.toISOString() };
        if (stOn && st && st !== l.status) { mud.status = st; feito.push("status " + LEAD_ST.find(function (s) { return s[0] === st; })[1].toLowerCase()); }
        await salvarLead(l, mud);
        if (stOn && st === "fechado" && !S.clientes.some(function (x) { return x.lead_id === l.id; })) { var nc = await sb.from("clientes").insert({ nome: l.nome, empresa: l.nome, nicho: l.nicho || l.categoria || "", telefone: l.whatsapp || l.telefone || "", email: l.email || "", origem: "prospecção", lead_id: l.id, status: "ativo" }).select().single(); if (!nc.error) { S.clientes.unshift(nc.data); feito.push("virou cliente"); } }
      } else {
        var cl = al.obj, mc = { historico: (cl.historico || []).concat([{ t: agora.toISOString(), tipo: "resposta", txt: "Cliente respondeu (" + g.nome.toLowerCase() + "): " + S.resp.texto.slice(0, 300) }]), ultimo_contato: agora.toISOString(), atualizado_em: agora.toISOString() };
        if (stOn && st && st !== cl.status) { mc.status = st; feito.push("status " + st); }
        var ru = await sb.from("clientes").update(mc).eq("id", cl.id).select().single(); if (ru.error) throw ru.error; S.clientes = S.clientes.map(function (x) { return x.id === cl.id ? ru.data : x; });
      }
      if (enviar) { var dp = await sb.from("disparos").insert({ publico: al.tipo, destinatario_id: al.obj.id, canal: "whatsapp", modelo_id: m ? m.id : null, objetivo: "resposta", nicho: al.obj.nicho || al.obj.categoria || "" }).select().single(); if (!dp.error) S.disparos.push(dp.data); }
    }
    if ($("#rs-ag-on", box).checked && $("#rs-ag-q", box).value) {
      var ag = { tipo: g.agendaReuniao ? "reuniao" : "retomada", quando: new Date($("#rs-ag-q", box).value).toISOString(), titulo: g.nome, obs: "Cliente disse: " + S.resp.texto.slice(0, 300), origem: "resposta" };
      if (al && al.obj) ag[al.tipo === "lead" ? "lead_id" : "cliente_id"] = al.obj.id; else ag.titulo = "Retomar: " + S.resp.texto.slice(0, 60);
      if (await criarAgenda(ag)) feito.push((g.agendaReuniao ? "reunião " : "retomada ") + diaLongo(ag.quando).toLowerCase());
    }
    if (enviar) feito.unshift("resposta enviada");
    S.resp = { texto: "", alvo: "", resultado: null };
    montarMenu(); render();
    toast(feito.length ? "Pronto: " + feito.join(", ") + "." : "Registrado.");
  } catch (e) { erro(e); }
}
function lerCompartilhado() {
  var q = new URLSearchParams(location.search);
  if (!q.has("compartilhado") && !q.has("texto")) return false;
  var txt = [q.get("titulo"), q.get("texto"), q.get("link")].filter(Boolean).join("\n").trim();
  try { history.replaceState(null, "", "/#responder"); } catch (e) {}
  if (txt) { S.resp.texto = txt; }
  if (q.get("compartilhado") === "img" && window.caches) {
    caches.open("central-compartilhado").then(function (c) { return c.match("/__compartilhado").then(function (r) { if (!r) return; return r.blob().then(function (b) { c.delete("/__compartilhado"); processarPrint(b); }); }); }).catch(function () {});
  } else if (txt) setTimeout(analisar, 300);
  return true;
}


/* ═════════════ PORTFÓLIO ═════════════ */
function vitrine() { return S.projetos.filter(function (p) { return p.dados && p.dados.vitrine && p.url; }).sort(function (a, b) { return (b.dados.destaque ? 1 : 0) - (a.dados.destaque ? 1 : 0); }); }
function urlPortfolio() { return location.origin + "/portfolio"; }
function thumb(url) { return "https://s.wordpress.com/mshots/v1/" + encodeURIComponent(url) + "?w=640&h=400"; }
function rankProjetos(alvo, textoExtra) {
  var base = ((alvo && (alvo.nicho || alvo.categoria)) || "") + " " + ((alvo && alvo.nome) || "");
  var g = grupoNicho(textoExtra || "") || grupoNicho(base), tk = tokensNome(base + " " + (textoExtra || ""));
  return vitrine().map(function (p) {
    var desc = (p.dados && p.dados.descricao_vitrine) || "", gp = grupoNicho(p.nicho + " " + p.nome + " " + desc);
    var sc = g && gp === g ? 3 : 0, tp = tokensNome(p.nicho + " " + p.nome + " " + desc);
    tk.forEach(function (t) { if (tp.indexOf(t) >= 0) sc += 1; });
    if (p.dados.destaque) sc += 0.5;
    return { p: p, sc: sc, mesmo: !!(g && gp === g) };
  }).sort(function (a, b) { return b.sc - a.sc; });
}
S.port = { texto: "", alvo: "", projeto: "", modelo: "" };
function alvoPort() { var p = (S.port.alvo || "").split(":"); if (p[0] === "lead") return { tipo: "lead", obj: S.leads.find(function (x) { return x.id === p[1]; }) }; if (p[0] === "cliente") return { tipo: "cliente", obj: S.clientes.find(function (x) { return x.id === p[1]; }) }; return null; }
function opcoesPessoas(sel) {
  return '<option value="">Escolha o lead ou cliente</option><optgroup label="Leads">' + S.leads.slice().sort(function (a, b) { return a.nome.localeCompare(b.nome); }).map(function (l) { return '<option value="lead:' + l.id + '"' + (sel === "lead:" + l.id ? " selected" : "") + ">" + esc(l.nome) + (l.nicho || l.categoria ? " · " + esc(l.nicho || l.categoria) : "") + "</option>"; }).join("") + '</optgroup><optgroup label="Clientes">' + S.clientes.map(function (c) { return '<option value="cliente:' + c.id + '"' + (sel === "cliente:" + c.id ? " selected" : "") + ">" + esc(c.nome || c.empresa) + "</option>"; }).join("") + "</optgroup>";
}
function vPortfolio(box) {
  var vt = vitrine(), todos = S.projetos.filter(function (p) { return p.url; }).sort(function (a, b) { return ((b.dados && b.dados.vitrine) ? 1 : 0) - ((a.dados && a.dados.vitrine) ? 1 : 0) || a.nome.localeCompare(b.nome); });
  box.innerHTML = '<div class="det"><div class="card" style="align-self:start"><div class="card-h"><div><h2>Enviar um projeto</h2><p>Fale ou escreva para quem e de que tipo</p></div></div>' +
    '<div class="port-cmd"><textarea class="inp" id="pf-txt" style="min-height:70px" placeholder="Ex.: manda um projeto de padaria para a Padaria Vera Cruz">' + esc(S.port.texto) + '</textarea><button type="button" class="btn mic-mini" id="pf-mic" aria-label="Falar">' + ICON.mic + '</button></div>' +
    '<div class="acoes" style="margin-top:8px"><button class="btn" type="button" id="pf-ok">Entender</button></div>' +
    '<div class="form" style="margin-top:6px"><div class="f full"><label for="pf-alvo">Para quem</label><select class="inp" id="pf-alvo">' + opcoesPessoas(S.port.alvo) + "</select></div>" +
    '<div class="f full"><label for="pf-proj">Projeto</label><select class="inp" id="pf-proj"></select></div>' +
    '<div class="f full"><label for="pf-mod">Mensagem</label><select class="inp" id="pf-mod">' + S.modelos.filter(function (m) { return m.objetivo === "portfolio"; }).map(function (m) { return '<option value="' + m.id + '"' + (m.id === S.port.modelo ? " selected" : "") + ">" + esc(m.nome) + "</option>"; }).join("") + "</select></div>" +
    '<div class="f full"><textarea class="inp" id="pf-msg" style="min-height:120px"></textarea></div>' +
    '<div class="f"><label for="pf-num">WhatsApp</label><input class="inp" id="pf-num" type="tel" inputmode="tel" placeholder="(21) 99999-9999"></div></div>' +
    '<div class="acoes"><button class="btn ghost" type="button" id="pf-copiar">' + ICON.copia + 'Copiar</button><button class="btn wa" type="button" id="pf-wa">' + ICON.wa + "Enviar no WhatsApp</button></div></div>" +
    '<div style="display:grid;gap:16px;align-content:start"><div class="card"><div class="card-h"><div><h2>Seu portfólio público</h2><p>' + vt.length + (vt.length === 1 ? " projeto à mostra" : " projetos à mostra") + '</p></div></div>' +
    (vt.length ? '<div class="code"><span>' + esc(urlPortfolio()) + '</span><button class="btn sm" type="button" data-cp="' + esc(urlPortfolio()) + '">' + ICON.copia + 'Copiar</button><a class="btn sm" href="/portfolio" target="_blank" rel="noopener">' + ICON.ext + "Abrir</a></div>" : '<p class="hint">Você ainda não marcou nenhum projeto para mostrar. Marque abaixo os que podem ir para clientes.</p>') +
    '<p class="hint" style="margin-top:10px">Uma página só com os projetos marcados, para mandar a qualquer cliente. Prévias feitas para clientes reais só devem ir para o portfólio com a autorização deles.</p></div>' +
    '<div class="card"><div class="card-h"><div><h2>Nichos cobertos</h2><p>Para ter sempre um exemplo parecido com o cliente</p></div></div>' + coberturaNichos() + "</div></div></div>" +
    '<div class="card"><div class="card-h"><div><h2>Projetos hospedados</h2><p>Marque o que pode ser mostrado. A estrela coloca no topo.</p></div></div><div class="port-grid">' + todos.map(function (p) { var on = p.dados && p.dados.vitrine; return '<div class="port-card' + (on ? " on" : "") + '"><a class="port-img" href="' + esc(p.url) + '" target="_blank" rel="noopener"><img loading="lazy" alt="Prévia de ' + esc(p.nome) + '" src="' + esc(thumb(p.url)) + '"></a><div class="port-info"><b>' + esc(p.nome) + '</b><span class="sub">' + esc(p.nicho || "Sem nicho definido") + "</span>" + (p.dados && p.dados.descricao_vitrine ? '<span class="sub">' + esc(p.dados.descricao_vitrine) + "</span>" : "") + '</div><div class="port-acoes"><label class="tg"><input type="checkbox" data-vt="' + p.id + '"' + (on ? " checked" : "") + '> No portfólio</label><button class="btn sm ghost" type="button" data-dq="' + p.id + '" aria-label="Destaque">' + (p.dados && p.dados.destaque ? "★" : "☆") + '</button><button class="btn sm ghost" type="button" data-pe="' + p.id + '">Editar</button>' + (on ? '<button class="btn sm" type="button" data-envia="' + p.id + '">Enviar</button>' : "") + "</div></div>"; }).join("") + "</div></div>";
  ligarPortfolio(box);
}
function coberturaNichos() {
  var nomes = { comida: "Alimentação", pet: "Pet", beleza: "Beleza e estética", saude: "Saúde e bem-estar", imoveis: "Imóveis e arquitetura", auto: "Automotivo", loja: "Lojas", servicos: "Serviços" };
  var tem = {}; vitrine().forEach(function (p) { var g = grupoNicho(p.nicho + " " + p.nome + " " + ((p.dados && p.dados.descricao_vitrine) || "")); if (g) tem[g] = (tem[g] || 0) + 1; });
  var leadsPor = {}; S.leads.forEach(function (l) { var g = grupoNicho((l.nicho || "") + " " + (l.categoria || "")); if (g) leadsPor[g] = (leadsPor[g] || 0) + 1; });
  return '<div class="stat-list">' + Object.keys(nomes).map(function (g) { return "<div><span>" + nomes[g] + (leadsPor[g] ? ' <span class="sub">· ' + leadsPor[g] + " leads</span>" : "") + "</span><b class=\"" + (tem[g] ? "up" : leadsPor[g] ? "down" : "") + "\">" + (tem[g] ? tem[g] + (tem[g] > 1 ? " projetos" : " projeto") : leadsPor[g] ? "falta exemplo" : "—") + "</b></div>"; }).join("") + "</div>";
}
function ligarPortfolio(box) {
  var al = $("#pf-alvo", box), pj = $("#pf-proj", box), md = $("#pf-mod", box), msg = $("#pf-msg", box), num = $("#pf-num", box), tx = $("#pf-txt", box);
  function encherProjetos(textoExtra) {
    var a = alvoPort(), rk = rankProjetos(a && a.obj, textoExtra);
    var sel = S.port.projeto || (rk[0] ? rk[0].p.id : "todos");
    pj.innerHTML = '<option value="todos"' + (sel === "todos" ? " selected" : "") + ">Portfólio completo (" + vitrine().length + " projetos)</option>" + rk.map(function (r) { return '<option value="' + r.p.id + '"' + (r.p.id === sel ? " selected" : "") + ">" + esc(r.p.nome) + (r.mesmo ? " · mesmo nicho" : "") + "</option>"; }).join("");
    if (!vitrine().length) pj.innerHTML = '<option value="todos">Nenhum projeto marcado ainda</option>';
  }
  function montar() {
    var a = alvoPort(), m = S.modelos.find(function (x) { return x.id === md.value; }), pid = pj.value;
    var p = pid !== "todos" ? S.projetos.find(function (x) { return x.id === pid; }) : null;
    if (m && !p && m.corpo.indexOf("{portfolio}") < 0) { var mc = S.modelos.find(function (x) { return x.objetivo === "portfolio" && x.corpo.indexOf("{portfolio}") >= 0; }); if (mc) { md.value = mc.id; m = mc; } }
    var link = p ? p.url : urlPortfolio();
    var corpo = m ? m.corpo : "Olá, {nome}! Segue: {link}";
    var t = preencher(corpo, (a && a.obj) || { nome: "" }, a ? a.tipo : "lead").replace(/\{link\}/g, link).replace(/\{projeto\}/g, p ? p.nome : "meus trabalhos").replace(/\{portfolio\}/g, urlPortfolio());
    if (!a || !a.obj) t = t.replace(/^(Olá|Oi),?\s+([!,])/, "$1$2");
    msg.value = t;
    num.value = a && a.obj ? telVisivel(numeroDe(a.tipo, a.obj)) : num.value;
  }
  encherProjetos(S.port.texto); montar();
  al.onchange = function () { S.port.alvo = al.value; S.port.projeto = ""; encherProjetos(tx.value); montar(); };
  pj.onchange = function () { S.port.projeto = pj.value; montar(); };
  md.onchange = function () { S.port.modelo = md.value; montar(); };
  tx.oninput = function () { S.port.texto = tx.value; };
  $("#pf-ok", box).onclick = function () {
    var t = tx.value.trim(); if (!t) { toast("Diga para quem e que tipo de projeto."); return; }
    var c = candidatos(t).filter(function (x) { return x.tipo !== "projeto"; })[0];
    if (c) { S.port.alvo = c.tipo + ":" + c.obj.id; al.value = S.port.alvo; }
    S.port.projeto = ""; encherProjetos(t.replace(c ? new RegExp(c.nome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") : /$^/, ""));
    if (/\b(despedi|encerr|sem compromisso|porta aberta|ultim)/.test(norm(t))) { var mp = S.modelos.find(function (x) { return x.objetivo === "portfolio" && /porta/i.test(x.nome); }); if (mp) md.value = mp.id; }
    if (/\b(todos|portfolio|varios|alguns)\b/.test(norm(t))) { pj.value = "todos"; }
    montar(); toast(c ? "Entendi: " + c.nome + "." : "Não achei o nome. Escolha na lista.");
  };
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition, mic = $("#pf-mic", box);
  if (!SR) mic.hidden = true; else mic.onclick = function () {
    var rec = new SR(); rec.lang = "pt-BR"; rec.interimResults = true; mic.classList.add("ouvindo");
    rec.onresult = function (e) { var s = ""; for (var i = 0; i < e.results.length; i++) s += e.results[i][0].transcript; tx.value = s; S.port.texto = s; };
    rec.onend = function () { mic.classList.remove("ouvindo"); if (tx.value.trim()) $("#pf-ok", box).click(); };
    rec.onerror = function () { mic.classList.remove("ouvindo"); };
    try { rec.start(); } catch (e) { mic.classList.remove("ouvindo"); }
  };
  $("#pf-copiar", box).onclick = function () { copiar(msg.value); };
  $("#pf-wa", box).onclick = async function () {
    var d = telWa(num.value); if (!d) { toast("Digite o número com DDD."); num.focus(); return; }
    var a = alvoPort(), m = S.modelos.find(function (x) { return x.id === md.value; });
    window.open("https://wa.me/" + d + "?text=" + encodeURIComponent(msg.value), "_blank");
    if (a && a.obj) { await registrarDisparo(a.tipo, a.obj, m, "whatsapp", msg.value); }
    toast("Projeto enviado e registrado.");
  };
  $$("[data-cp]", box).forEach(function (b) { b.onclick = function () { copiar(b.dataset.cp); }; });
  $$("[data-vt]", box).forEach(function (c) { c.onchange = function () { mudarVitrine(c.dataset.vt, { vitrine: c.checked }); }; });
  $$("[data-dq]", box).forEach(function (b) { b.onclick = function () { var p = S.projetos.find(function (x) { return x.id === b.dataset.dq; }); mudarVitrine(p.id, { destaque: !(p.dados && p.dados.destaque) }); }; });
  $$("[data-pe]", box).forEach(function (b) { b.onclick = function () { editarVitrine(S.projetos.find(function (x) { return x.id === b.dataset.pe; })); }; });
  $$("[data-envia]", box).forEach(function (b) { b.onclick = function () { S.port.projeto = b.dataset.envia; render(); window.scrollTo({ top: 0, behavior: REDUZ ? "auto" : "smooth" }); }; });
}
async function mudarVitrine(id, campos, extra) {
  var p = S.projetos.find(function (x) { return x.id === id; }); if (!p) return;
  var d = Object.assign({}, p.dados || {}, campos), mud = Object.assign({ dados: d, atualizado_em: new Date().toISOString() }, extra || {});
  var r = await sb.from("projetos").update(mud).eq("id", id).select().single(); if (r.error) return erro(r.error);
  S.projetos = S.projetos.map(function (x) { return x.id === id ? r.data : x; });
  if (campos.vitrine === true && !p.nicho && !(extra && extra.nicho)) { toast("Marcado. Defina o nicho para a Central sugerir certo."); editarVitrine(r.data); return; }
  toast(campos.vitrine === false ? "Saiu do portfólio." : "Portfólio atualizado."); render();
}
function editarVitrine(p) {
  modal("Projeto no portfólio", '<form class="form" novalidate><div class="f full"><label for="ev-nicho">Nicho</label><input class="inp" id="ev-nicho" value="' + esc(p.nicho || "") + '" placeholder="Ex.: Padaria, Pet shop, Clínica, Oficina"></div><div class="f full"><label for="ev-desc">Descrição curta</label><textarea class="inp" id="ev-desc" style="min-height:80px" placeholder="Ex.: Site com cardápio, pedidos pelo WhatsApp e mapa">' + esc((p.dados && p.dados.descricao_vitrine) || "") + '</textarea></div><div class="f full"><label for="ev-url">Endereço</label><input class="inp" id="ev-url" type="url" value="' + esc(p.url || "") + '"></div><div class="f full chk"><label><input type="checkbox" id="ev-on"' + (p.dados && p.dados.vitrine ? " checked" : "") + "> Mostrar no portfólio</label></div></form>" +
    '<div class="acoes"><button class="btn" type="button" data-fechar>Cancelar</button><button class="btn pri" type="button" id="ev-ok">Salvar</button></div>', function (bx) {
    $("#ev-ok", bx).onclick = async function () { fecharModal(); await mudarVitrine(p.id, { vitrine: $("#ev-on", bx).checked, descricao_vitrine: $("#ev-desc", bx).value.trim() }, { nicho: $("#ev-nicho", bx).value.trim(), url: $("#ev-url", bx).value.trim() || p.url }); };
  });
}


/* ═════════════ ASSISTENTE DE VOZ (gratuito, por regras) ═════════════ */
var STATUS_TXT = { reuniao: "Reunião", fechado: "Fechado", respondeu: "Respondeu", descartado: "Descartado", retomar: "Retomar", contatado: "Contatado" };
function opcoesAlvoVoz(plano) {
  var h = '<option value="">Sem vínculo (só agenda ou anotação)</option>';
  plano.cands.forEach(function (c) { h += '<option value="' + c.tipo + ":" + c.obj.id + '"' + (plano.alvo && plano.alvo.obj.id === c.obj.id ? " selected" : "") + ">" + (c.tipo === "lead" ? "Lead · " : c.tipo === "cliente" ? "Cliente · " : "Projeto · ") + esc(c.nome) + "</option>"; });
  var nome = plano.novoNome || "";
  h += '<option value="novo-lead"' + (plano.novoNome && plano.novoTipo === "lead" ? " selected" : "") + ">Criar lead novo" + (nome ? ": " + esc(nome) : "") + "</option>";
  h += '<option value="novo-cliente"' + (plano.novoNome && plano.novoTipo === "cliente" ? " selected" : "") + ">Criar cliente novo" + (nome ? ": " + esc(nome) : "") + "</option>";
  h += '<option value="outro">Escolher outro na lista…</option>';
  return h;
}
function abrirVoz() {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  modal("Assistente", '<div class="voz">' +
    '<button type="button" class="mic-grande" id="vz-mic" aria-label="Falar">' + ICON.mic + '</button><p class="vz-status" id="vz-status">' + (SR ? "Toque no microfone e fale" : "Digite o comando abaixo ou use o microfone do teclado") + '</p>' +
    '<textarea class="inp" id="vz-txt" placeholder="Ex.: Marquei reunião com a Padaria Pão Dourado quinta às 15h, querem site com cardápio, orçamento de 1.500"></textarea>' +
    '<div class="acoes" style="margin-top:0"><button class="btn" type="button" id="vz-ex">Ver exemplos</button><button class="btn pri" type="button" id="vz-ok">Organizar</button></div>' +
    '<div id="vz-ajuda" hidden><ul class="steps"><li><b>Reunião:</b> "Marquei reunião com o Pet Shop Amigo amanhã às 10h"</li><li><b>Retomada:</b> "Retomar a Clínica Sorriso em 3 dias"</li><li><b>Resposta:</b> "A Padaria Central respondeu, gostou da proposta"</li><li><b>Fechamento:</b> "Fechei com a Imobiliária Lar por 2 mil"</li><li><b>Descarte:</b> "Estética Bela não tem interesse"</li><li><b>Cliente novo:</b> "Novo cliente João da Oficina Turbo, quer landing page"</li><li><b>Venda fora da Kiwify:</b> "Vendi 2 kits de Natal hoje"</li><li><b>Tarefa:</b> "Me lembra sexta às 9h de mandar o orçamento"</li></ul></div>' +
    '<div id="vz-plano"></div></div>', function (bx) {
    var tx = $("#vz-txt", bx), st = $("#vz-status", bx), mic = $("#vz-mic", bx), rec = null, ouvindo = false;
    $("#vz-ex", bx).onclick = function () { var a = $("#vz-ajuda", bx); a.hidden = !a.hidden; };
    $("#vz-ok", bx).onclick = function () { if (!tx.value.trim()) { toast("Fale ou digite um comando."); return; } mostrarPlano(bx, interpretar(tx.value.trim())); };
    if (!SR) { mic.disabled = true; mic.classList.add("off"); return; }
    mic.onclick = function () {
      if (ouvindo && rec) { rec.stop(); return; }
      rec = new SR(); rec.lang = "pt-BR"; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
      var final = tx.value ? tx.value.trim() + " " : "";
      rec.onstart = function () { ouvindo = true; mic.classList.add("ouvindo"); st.textContent = "Ouvindo… fale com calma"; };
      rec.onresult = function (e) { var inter = ""; for (var i = e.resultIndex; i < e.results.length; i++) { if (e.results[i].isFinal) final += e.results[i][0].transcript + " "; else inter += e.results[i][0].transcript; } tx.value = (final + inter).trim(); };
      rec.onerror = function (e) { st.textContent = e.error === "not-allowed" ? "Permita o uso do microfone nas configurações do navegador." : e.error === "no-speech" ? "Não ouvi nada. Toque e tente de novo." : "Não deu para ouvir. Tente de novo ou digite."; };
      rec.onend = function () { ouvindo = false; mic.classList.remove("ouvindo"); if (tx.value.trim()) { st.textContent = "Entendi. Confira abaixo antes de salvar."; mostrarPlano(bx, interpretar(tx.value.trim())); } else if (!/Permita|Não/.test(st.textContent)) st.textContent = "Toque no microfone e fale"; };
      try { rec.start(); } catch (e) { st.textContent = "Não deu para ligar o microfone."; }
    };
  });
}
function mostrarPlano(bx, plano) {
  var box = $("#vz-plano", bx);
  var sel = plano.alvo ? plano.alvo.tipo + ":" + plano.alvo.obj.id : plano.novoNome ? "novo-" + plano.novoTipo : "";
  var nada = !plano.alvo && !plano.novoNome && !plano.agenda;
  box.innerHTML = '<div class="card plano"><div class="card-h"><div><h2>Vou fazer isto</h2><p>Confira e ajuste se precisar</p></div></div>' +
    (nada ? '<p class="hint">Não reconheci nenhum nome cadastrado nem uma data. Escolha abaixo com quem é, ou fale de novo citando o nome do lead, cliente ou projeto.</p>' : "") +
    '<div class="form"><div class="f full"><label for="vp-alvo">Com quem</label><select class="inp" id="vp-alvo">' + opcoesAlvoVoz(plano) + '</select></div>' +
    '<div class="f full" id="vp-outro-box" hidden><label for="vp-outro">Escolha na lista</label><select class="inp" id="vp-outro">' + opcoesAlvo("") + "</select></div>" +
    '<div class="f full" id="vp-nome-box" hidden><label for="vp-nome">Nome do novo contato</label><input class="inp" id="vp-nome" value="' + esc(plano.novoNome) + '"></div>' +
    '<div class="f full chk" id="vp-st-box"><label><input type="checkbox" id="vp-st-on"' + (plano.status ? " checked" : "") + '> Mudar status para</label><select class="inp" id="vp-st"><option value="contatado">Contatado</option><option value="respondeu">Respondeu</option><option value="reuniao">Reunião</option><option value="fechado">Fechado</option><option value="descartado">Descartado</option><option value="retomar">Retomar (cliente)</option></select></div>' +
    '<div class="f full chk"><label><input type="checkbox" id="vp-ag-on"' + (plano.agenda ? " checked" : "") + '> Agendar</label><div class="linha"><select class="inp" id="vp-ag-tipo">' + Object.keys(TIPO_AG).map(function (k) { return '<option value="' + k + '"' + (plano.agenda && plano.agenda.tipo === k ? " selected" : "") + ">" + TIPO_AG[k][0] + "</option>"; }).join("") + '</select><input class="inp" id="vp-ag-q" type="datetime-local" value="' + valorDataLocal(plano.agenda ? plano.agenda.quando : somaDias(new Date(), 1)) + '"></div>' + (plano.agenda && (plano.agenda.semHora || plano.agenda.semData) ? '<span class="hint">' + (plano.agenda.semData ? "Não ouvi o dia: deixei amanhã às 10h." : "Não ouvi a hora: deixei 10h.") + " Ajuste se precisar.</span>" : "") + "</div>" +
    '<div class="f chk"><label><input type="checkbox" id="vp-val-on"' + (plano.valor ? " checked" : "") + '> Valor</label><input class="inp" id="vp-val" type="number" min="0" step="0.01" value="' + (plano.valor || "") + '"></div>' +
    (plano.venda ? '<div class="f chk"><label><input type="checkbox" id="vp-venda-on" checked> Registrar venda</label><input class="inp" id="vp-venda" type="number" min="1" step="1" value="' + plano.venda.qtd + '"></div>' : "") +
    '<div class="f full chk"><label><input type="checkbox" id="vp-nota-on" checked> Anotar</label><textarea class="inp" id="vp-nota" style="min-height:70px">' + esc(plano.nota) + "</textarea></div></div>" +
    '<div class="acoes"><button class="btn" type="button" data-fechar>Cancelar</button><button class="btn pri" type="button" id="vp-ok">Confirmar e salvar</button></div></div>';
  if (plano.status) $("#vp-st", box).value = plano.status;
  var alvoSel = $("#vp-alvo", box);
  function vis() { var v = alvoSel.value; $("#vp-outro-box", box).hidden = v !== "outro"; $("#vp-nome-box", box).hidden = v.indexOf("novo-") !== 0; var tipo = v.indexOf("projeto:") === 0 ? "projeto" : v ? "pessoa" : ""; $("#vp-st-box", box).hidden = tipo !== "pessoa"; }
  alvoSel.onchange = vis; vis();
  box.scrollIntoView({ behavior: REDUZ ? "auto" : "smooth", block: "start" });
  $("#vp-ok", box).onclick = function () { executarPlano(box, plano); };
}
async function executarPlano(box, plano) {
  var b = $("#vp-ok", box); b.disabled = true; b.textContent = "Salvando…";
  try {
    var v = $("#vp-alvo", box).value; if (v === "outro") v = $("#vp-outro", box).value;
    var tipo = "", obj = null, feito = [];
    if (v.indexOf("novo-") === 0) {
      var nome = $("#vp-nome", box).value.trim(); if (!nome) { toast("Diga o nome do novo contato."); b.disabled = false; b.textContent = "Confirmar e salvar"; return; }
      if (v === "novo-lead") { var rl = await sb.from("leads").insert({ place_id: "manual-" + Date.now(), nome: nome, status: "novo", historico: [{ t: new Date().toISOString(), tipo: "voz", txt: "Criado por voz na Central" }] }).select("id,nome,categoria,nicho,telefone,tel_digitos,tel_tipo,whatsapp,email,site,instagram,endereco,bairro,cidade,uf,nota,avaliacoes,maps,fechado,enriquecido,buscas,whatsapp_origem,facebook,linkedin,status,obs,historico,ultimo_contato,criado_em,atualizado_em,dados").single(); if (rl.error) throw rl.error; S.leads.push(rl.data); tipo = "lead"; obj = rl.data; feito.push("lead criado"); }
      else { var rc = await sb.from("clientes").insert({ nome: nome, origem: "voz", status: "ativo" }).select().single(); if (rc.error) throw rc.error; S.clientes.unshift(rc.data); tipo = "cliente"; obj = rc.data; feito.push("cliente criado"); }
    } else if (v) {
      var p = v.split(":"); tipo = p[0];
      obj = (tipo === "lead" ? S.leads : tipo === "cliente" ? S.clientes : S.projetos).find(function (x) { return x.id === p[1]; });
    }
    var agora = new Date().toISOString(), nota = $("#vp-nota-on", box).checked ? $("#vp-nota", box).value.trim() : "";
    var valor = $("#vp-val-on", box).checked ? n($("#vp-val", box).value) : 0;
    var stOn = $("#vp-st-on", box) && $("#vp-st-on", box).checked && !$("#vp-st-box", box).hidden, st = $("#vp-st", box).value;
    if (tipo === "lead" && obj) {
      var mud = {}, hist = (obj.historico || []).slice();
      if (stOn && st !== "retomar" && st !== obj.status) { mud.status = st; hist.push({ t: agora, tipo: "status", txt: "Status: " + STATUS_TXT[st] + " (por voz)" }); feito.push("status " + STATUS_TXT[st].toLowerCase()); }
      if (nota) { hist.push({ t: agora, tipo: "voz", txt: nota }); mud.obs = ((obj.obs ? obj.obs + "\n" : "") + "[" + new Date().toLocaleDateString("pt-BR") + "] " + nota).slice(-4000); feito.push("anotação"); }
      if (valor) { mud.dados = Object.assign({}, obj.dados || {}, { valor_proposta: valor }); }
      if (stOn && (st === "reuniao" || st === "respondeu" || st === "fechado")) mud.ultimo_contato = agora;
      mud.historico = hist;
      obj = await salvarLead(obj, mud) || obj;
      if (stOn && st === "fechado" && !S.clientes.some(function (c) { return c.lead_id === obj.id; })) {
        var nc = await sb.from("clientes").insert({ nome: obj.nome, empresa: obj.nome, nicho: obj.nicho || obj.categoria || "", telefone: obj.whatsapp || obj.telefone || "", email: obj.email || "", origem: "prospecção", lead_id: obj.id, status: "ativo", valor_total: valor || 0 }).select().single();
        if (!nc.error) { S.clientes.unshift(nc.data); feito.push("virou cliente"); }
      }
    } else if (tipo === "cliente" && obj) {
      var mc = { historico: (obj.historico || []).concat(nota ? [{ t: agora, tipo: "voz", txt: nota }] : []), atualizado_em: agora };
      if (stOn) { var mapa = { fechado: "ativo", descartado: "encerrado", retomar: "retomar", reuniao: obj.status, respondeu: obj.status, contatado: obj.status }; if (mapa[st] !== obj.status) { mc.status = mapa[st]; feito.push("status " + mc.status); } mc.ultimo_contato = agora; }
      if (nota) { mc.obs = ((obj.obs ? obj.obs + "\n" : "") + "[" + new Date().toLocaleDateString("pt-BR") + "] " + nota).slice(-4000); feito.push("anotação"); }
      if (valor && stOn && st === "fechado") { mc.valor_total = n(obj.valor_total) + valor; feito.push("valor somado"); }
      var ru = await sb.from("clientes").update(mc).eq("id", obj.id).select().single(); if (ru.error) throw ru.error; S.clientes = S.clientes.map(function (x) { return x.id === obj.id ? ru.data : x; });
    } else if (tipo === "projeto" && obj && $("#vp-venda-on", box) && $("#vp-venda-on", box).checked) {
      var qtd = n($("#vp-venda", box).value) || 1, rec = valor || qtd * n(obj.preco), dia = hoje();
      var ex = S.metricas.find(function (m) { return m.projeto_id === obj.id && m.data === dia && m.canal === "Geral"; });
      var dm = { projeto_id: obj.id, data: dia, canal: "Geral", views: ex ? ex.views : 0, cliques: ex ? ex.cliques : 0, vendas: (ex ? n(ex.vendas) : 0) + qtd, receita: (ex ? n(ex.receita) : 0) + rec, gasto: ex ? ex.gasto : 0, seguidores: ex ? ex.seguidores : 0 };
      var rm = await sb.from("metricas").upsert(dm, { onConflict: "projeto_id,data,canal" }).select().single(); if (rm.error) throw rm.error;
      S.metricas = S.metricas.filter(function (m) { return m.id !== rm.data.id; }); S.metricas.push(rm.data); feito.push(qtd + (qtd > 1 ? " vendas" : " venda") + " em " + obj.nome);
    }
    if ($("#vp-ag-on", box).checked) {
      var qv = $("#vp-ag-q", box).value;
      if (qv) {
        var d = { tipo: $("#vp-ag-tipo", box).value, quando: new Date(qv).toISOString(), titulo: "", obs: nota, valor: valor, origem: "voz" };
        if (tipo === "lead" && obj) d.lead_id = obj.id; if (tipo === "cliente" && obj) d.cliente_id = obj.id; if (tipo === "projeto" && obj) d.projeto_id = obj.id;
        if (!obj) d.titulo = nota.slice(0, 120);
        if (await criarAgenda(d)) feito.push(TIPO_AG[d.tipo][0].toLowerCase() + " " + diaLongo(d.quando).toLowerCase() + " às " + hora(d.quando));
      }
    }
    fecharModal(); montarMenu(); render();
    toast(feito.length ? "Pronto: " + feito.join(", ") + "." : "Nada para salvar.");
  } catch (e) { b.disabled = false; b.textContent = "Confirmar e salvar"; erro(e); }
}
$("#fab-voz").addEventListener("click", function () { abrirVoz(); });


/* ───────────── início ───────────── */
setInterval(checarLembretes, 30000);
document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") checarLembretes(); });
var mq = window.matchMedia("(prefers-color-scheme: dark)"); if (mq.addEventListener) mq.addEventListener("change", function () { if (S.user) render(); });
var rz; window.addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(function () { Object.keys(CH).forEach(function (id) { CH[id].resize(); }); }, 150); });
setInterval(function () { if (S.user && S.view === "geral" && document.visibilityState === "visible") { var f = $("#w-feed"); if (f) wFeed(f); } }, 60000);
if ("serviceWorker" in navigator) addEventListener("load", function () { navigator.serviceWorker.register("/sw.js").catch(function () {}); });
sb.auth.getSession().then(function (r) { if (!r.data.session) mostrarLogin(); });
})();
