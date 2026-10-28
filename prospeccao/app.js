// Prospecção — app de celular. Dados no Supabase (só o dono acessa); buscas pela API oficial do
// Google Places, via /api/buscar; e-mail, redes e raio-X do site via /api/enriquecer. As regras de
// venda (grupos, oportunidades, mensagens do ciclo, chance de fechamento) ficam em vendas.js.
"use strict";

const SUPABASE_URL = "https://bxjyxfoisqjkijxoeysu.supabase.co";
const SUPABASE_KEY = "sb_publishable_em9lB9ZwTDvfHV3kds9jpg_D0oxdWJA";
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const TAMANHOS = {
  rapida: { paginas: 1, grade: 0 },
  padrao: { paginas: 3, grade: 0 },
  cidade: { paginas: 3, grade: 3 },
};
const STATUS = [
  ["novo", "Novo"], ["contatado", "Contatado"], ["respondeu", "Respondeu"],
  ["reuniao", "Reunião / proposta"], ["fechado", "Fechou negócio"], ["descartado", "Descartado"],
];
const NOME_STATUS = Object.fromEntries(STATUS);
const TEMPLATES_PADRAO = [
  { id: "apresentacao", nome: "Primeiro contato",
    texto: "Olá, tudo bem? Encontrei a {nome} no Google Maps aqui em {cidade} e queria conversar rapidinho " +
      "sobre uma ideia para trazer mais clientes para vocês. Posso te mandar?" },
  { id: "sem_site", nome: "Para quem não tem site",
    texto: "Oi! Vi a {nome} no Google com ótimas avaliações, mas não encontrei um site de vocês. " +
      "Trabalho justamente ajudando {categoria} de {cidade} a aparecer melhor na internet. Posso te mostrar um exemplo?" },
  { id: "com_site", nome: "Para quem já tem site",
    texto: "Oi! Vi o site da {nome} e as avaliações de vocês no Google. Trabalho ajudando {categoria} de {cidade} " +
      "a transformar as visitas do site em mais clientes. Posso te mostrar duas ideias rápidas?" },
  { id: "followup", nome: "Retomar conversa",
    texto: "Oi, tudo certo? Passando aqui para retomar nossa conversa sobre a {nome}. Conseguiu dar uma olhada?" },
];
const COTA_GRATIS = 1000; // chamadas grátis por mês no nível de preço usado (conferir no console do Google)
const POR_PAGINA = 60;

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

const FILTRO_PADRAO = { status: "", texto: "", wa: false, email: false, mensal: false, grupo: "", nota: false, busca: "", ordem: "recentes" };
const TELAS = { buscar: "Buscar empresas", leads: "Meus leads", painel: "Painel de vendas", ajustes: "Ajustes" };
const estado = {
  usuario: null, config: null, leads: [], buscas: [], municipios: null, medianas: {}, analisandoSites: false,
  intervalos: null, taxas: {},
  cidade: null, tamanho: "padrao", buscando: false,
  filtro: null, // preenchido com FILTRO_PADRAO logo abaixo
  mostrar: POR_PAGINA,
};

estado.filtro = { ...FILTRO_PADRAO };

// ── Utilidades de interface ────────────────────────────────────────────────────
let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), 3200);
}

function irPara(tela) {
  for (const s of Object.keys(TELAS)) $(`#tela-${s}`).hidden = s !== tela;
  $$("#abas button").forEach((b) => b.setAttribute("aria-current", b.dataset.tela === tela ? "page" : "false"));
  $("#titulo").textContent = TELAS[tela];
  if (tela === "leads") renderLeads();
  if (tela === "painel") renderPainel();
  if (tela === "ajustes") renderAjustes();
  window.scrollTo(0, 0);
}

function aplicarTema(t) {
  if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
}
try { aplicarTema(localStorage.getItem("tema") || ""); } catch { /* sem armazenamento */ }

async function api(rota, corpo) {
  const { data } = await sb.auth.getSession();
  const r = await fetch(rota, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token || ""}` },
    body: JSON.stringify(corpo),
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(json.erro || `Erro ${r.status}`), { chamadas: json.chamadas || 0 });
  return json;
}

// ── Login ──────────────────────────────────────────────────────────────────────
async function entrar(e) {
  e.preventDefault();
  const email = $("#login-email").value.trim(), senha = $("#login-senha").value;
  const err = $("#login-erro"); err.hidden = true;
  const { error } = await sb.auth.signInWithPassword({ email, password: senha });
  if (error) { err.textContent = "E-mail ou senha incorretos."; err.hidden = false; }
}

async function criarAcesso() {
  const email = $("#login-email").value.trim(), senha = $("#login-senha").value;
  const err = $("#login-erro"); err.hidden = true;
  if (senha.length < 6) { err.textContent = "Escolha uma senha com pelo menos 6 caracteres."; err.hidden = false; return; }
  const { error } = await sb.auth.signUp({ email, password: senha });
  if (error && !/already/i.test(error.message)) {
    err.textContent = /fechado|Database error/i.test(error.message)
      ? "Este app é de uso exclusivo do dono." : error.message;
    err.hidden = false; return;
  }
  const r = await sb.auth.signInWithPassword({ email, password: senha });
  if (r.error) { err.textContent = "Conta já existe. Use “Entrar” com a sua senha."; err.hidden = false; }
}

async function iniciar(sessao) {
  estado.usuario = sessao?.user || null;
  const logado = !!estado.usuario;
  $("#tela-login").hidden = logado;
  $("#abas").hidden = !logado;
  if (!logado) {
    for (const s of Object.keys(TELAS)) $(`#tela-${s}`).hidden = true;
    $("#titulo").textContent = "Prospecção";
    return;
  }
  irPara("buscar");
  await Promise.all([carregarConfig(), carregarBuscas(), carregarLeads()]);
  recalcular();
  renderBuscar();
}

// ── Dados ──────────────────────────────────────────────────────────────────────
async function carregarConfig() {
  let { data } = await sb.from("config").select("*").maybeSingle();
  if (!data) {
    const r = await sb.from("config").insert({ templates: TEMPLATES_PADRAO }).select().single();
    data = r.data;
  }
  estado.config = data || { google_key: "", templates: TEMPLATES_PADRAO, padrao: "apresentacao", auto_contatado: true };
  estado.config.perfil ||= {};
  if (!estado.config.templates?.length) estado.config.templates = TEMPLATES_PADRAO;
  // Contas criadas antes da mensagem “Para quem já tem site” recebem ela uma vez.
  let jaOferecida = false;
  try { jaOferecida = localStorage.getItem("msg_com_site") === "1"; localStorage.setItem("msg_com_site", "1"); } catch { /* sem armazenamento */ }
  if (data && !jaOferecida && !estado.config.templates.some((t) => t.id === "com_site")) {
    const nova = TEMPLATES_PADRAO.find((t) => t.id === "com_site");
    const i = estado.config.templates.findIndex((t) => t.id === "sem_site");
    estado.config.templates.splice(i < 0 ? estado.config.templates.length : i + 1, 0, nova);
    await sb.from("config").update({ templates: estado.config.templates }).eq("user_id", estado.usuario.id);
  }
}

async function carregarBuscas() {
  const { data } = await sb.from("buscas").select("*").order("criado_em", { ascending: false }).limit(200);
  estado.buscas = data || [];
}

async function carregarLeads() {
  const todos = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await sb.from("leads").select("*").order("criado_em", { ascending: false }).range(de, de + 999);
    if (error || !data) break;
    todos.push(...data);
    if (data.length < 1000) break;
  }
  estado.leads = todos;
  estado.medianas = Vendas.contextoComparacao(todos);
}

async function salvarLead(lead, mudancas) {
  Object.assign(lead, mudancas, { atualizado_em: new Date().toISOString() });
  const { error } = await sb.from("leads").update({ ...mudancas, atualizado_em: lead.atualizado_em }).eq("id", lead.id);
  if (error) toast("Não consegui salvar. Verifique a internet.");
}

function registrar(lead, tipo, txt, extra = {}) {
  const historico = [...(lead.historico || []), { t: new Date().toISOString(), tipo, txt }];
  return salvarLead(lead, { historico, ...extra });
}

// ── Municípios (autocompletar) ─────────────────────────────────────────────────
async function municipios() {
  if (!estado.municipios) {
    const lista = await (await fetch("/municipios.json")).json();
    estado.municipios = lista.map((m) => ({ ...m, chave: norm(m.n) }));
  }
  return estado.municipios;
}

let sugestoesAtuais = [];
async function sugerirCidades() {
  const termo = norm($("#b-cidade").value.split(" - ")[0]);
  estado.cidade = null;
  const ul = $("#b-sugestoes");
  if (termo.length < 2) { ul.hidden = true; return; }
  const lista = await municipios();
  sugestoesAtuais = lista.filter((m) => m.chave.startsWith(termo))
    .sort((a, b) => (b.cap - a.cap) || a.n.localeCompare(b.n)).slice(0, 8);
  if (sugestoesAtuais.length < 8)
    sugestoesAtuais.push(...lista.filter((m) => !m.chave.startsWith(termo) && m.chave.includes(termo)).slice(0, 8 - sugestoesAtuais.length));
  ul.innerHTML = sugestoesAtuais.map((m, i) => `<li data-i="${i}">${esc(m.n)} - ${m.uf}</li>`).join("");
  ul.hidden = !sugestoesAtuais.length;
}

function escolherCidade(m) {
  estado.cidade = m;
  $("#b-cidade").value = `${m.n} - ${m.uf}`;
  $("#b-sugestoes").hidden = true;
  atualizarCusto();
}

// ── Busca ──────────────────────────────────────────────────────────────────────
function nichosDigitados() {
  return [...new Set($("#b-nichos").value.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean))].slice(0, 10);
}

// Caixa aproximada da cidade (graus). Capitais são maiores.
function caixaCidade(m) {
  const d = m.cap ? 0.2 : 0.1;
  return { s: m.lat - d, n: m.lat + d, w: m.lon - d, e: m.lon + d };
}

function dividir(caixa, n) {
  if (!n) return [caixa];
  const dy = (caixa.n - caixa.s) / n, dx = (caixa.e - caixa.w) / n, out = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++)
    out.push({ s: caixa.s + i * dy, n: caixa.s + (i + 1) * dy, w: caixa.w + j * dx, e: caixa.w + (j + 1) * dx });
  return out;
}

function chamadasEstimadas() {
  const t = TAMANHOS[estado.tamanho], nichos = Math.max(1, nichosDigitados().length);
  const regioes = t.grade && !$("#b-bairro").value.trim() ? t.grade * t.grade : 1;
  return nichos * regioes * t.paginas;
}

function usoDoMes() {
  const inicio = new Date(); inicio.setDate(1); inicio.setHours(0, 0, 0, 0);
  return estado.buscas.filter((b) => new Date(b.criado_em) >= inicio).reduce((s, b) => s + (b.chamadas || 0), 0);
}

function atualizarCusto() {
  const n = chamadasEstimadas(), usado = usoDoMes();
  $("#b-custo").textContent = `Usa até ${n} ${n === 1 ? "chamada" : "chamadas"} do Google ` +
    `(este mês: ${usado} de ${COTA_GRATIS} grátis).`;
}

function progresso(fracao, etapa, titulo) {
  $("#prog-barra").style.width = `${Math.round(fracao * 100)}%`;
  if (etapa != null) $("#prog-etapa").textContent = etapa;
  if (titulo) $("#prog-titulo").textContent = titulo;
}

async function buscar(e) {
  e.preventDefault();
  if (estado.buscando) return;
  if (!estado.config?.google_key) { toast("Cadastre a chave do Google em Ajustes."); irPara("ajustes"); return; }
  const nichos = nichosDigitados();
  if (!nichos.length) { toast("Diga o que você procura."); return; }
  if (!estado.cidade) {
    await municipios();
    const [nome, uf] = $("#b-cidade").value.split(" - ").map((s) => s && s.trim());
    const m = estado.municipios.find((x) => x.chave === norm(nome) && (!uf || x.uf === uf.toUpperCase()));
    if (!m) { toast("Escolha a cidade na lista."); $("#b-cidade").focus(); return; }
    estado.cidade = m;
  }
  const cidade = estado.cidade, bairro = $("#b-bairro").value.trim(), t = TAMANHOS[estado.tamanho];
  const regioes = bairro ? [caixaCidade(cidade)] : dividir(caixaCidade(cidade), t.grade);
  const restrito = regioes.length > 1;
  const onde = bairro ? `${bairro}, ${cidade.n} - ${cidade.uf}` : `${cidade.n} - ${cidade.uf}`;

  estado.buscando = true;
  $("#b-erro").hidden = true;
  $("#btn-buscar").disabled = true;
  $("#painel-progresso").hidden = false;
  progresso(0, "Começando…", `Buscando ${nichos.join(", ")}`);
  const trava = await navigator.wakeLock?.request("screen").catch(() => null);

  const { data: busca, error } = await sb.from("buscas")
    .insert({ nichos, cidade: cidade.n, uf: cidade.uf, bairro, tamanho: estado.tamanho }).select().single();
  if (error) { fimBusca(trava, "Não consegui iniciar a busca. Verifique a internet."); return; }

  let chamadas = 0, total = 0, novos = 0, falhas = 0, ultimoErro = "";
  const ids = new Set(), passos = nichos.length * regioes.length;
  let passo = 0;
  for (const nicho of nichos) {
    const vistos = new Map();
    for (const [i, caixa] of regioes.entries()) {
      progresso(passo / passos, regioes.length > 1
        ? `“${nicho}” — região ${i + 1} de ${regioes.length}` : `Procurando “${nicho}” em ${onde}…`);
      try {
        const r = await api("/api/buscar", { consulta: `${nicho} em ${onde}`, nicho, retangulo: caixa, restrito, paginas: t.paginas });
        chamadas += r.chamadas;
        for (const l of r.leads) if (!vistos.has(l.place_id)) vistos.set(l.place_id, l);
      } catch (err) {
        chamadas += err.chamadas; falhas++; ultimoErro = err.message;
        if (/chave|recusou|login/i.test(err.message) && !vistos.size) break;
      }
      passo++;
    }
    const lista = [...vistos.values()];
    for (let i = 0; i < lista.length; i += 100) {
      const { data } = await sb.rpc("mesclar_leads", { p_busca: busca.id, p_itens: lista.slice(i, i + 100) });
      if (data) { total += data.total; novos += data.novos; data.ids.forEach((x) => ids.add(x)); }
    }
  }
  total = ids.size; // o mesmo lugar pode aparecer em mais de um tipo de busca
  await sb.from("buscas").update({ total, novos, chamadas }).eq("id", busca.id);
  await Promise.all([carregarBuscas(), carregarLeads()]);
  renderBuscar();

  if (!total) { fimBusca(trava, falhas ? ultimoErro : "Nenhuma empresa encontrada. Tente outro termo ou cidade.", true); return; }
  await enriquecer([...ids]);
  estado.medianas = Vendas.contextoComparacao(estado.leads);
  recalcular();
  const g = contarGrupos(estado.leads.filter((l) => ids.has(l.id)));
  fimBusca(trava, `Pronto! ${total} empresas: ${g.sem} sem presença, ${g.melhorar} a melhorar e ${g.boa} com presença boa.`);
  estado.filtro = { ...estado.filtro, busca: busca.id, status: "" };
  estado.mostrar = POR_PAGINA;
  irPara("leads");
}

// Erros ficam fixos na tela (o aviso rápido some antes de dar tempo de ler).
function fimBusca(trava, msg, fixo = false) {
  trava?.release?.();
  estado.buscando = false;
  $("#btn-buscar").disabled = false;
  $("#painel-progresso").hidden = true;
  $("#b-erro").hidden = !fixo;
  if (fixo) { $("#b-erro").textContent = msg; $("#b-erro").scrollIntoView({ block: "center" }); }
  else toast(msg);
}

// Visita os sites: e-mail, WhatsApp, redes e o raio-X do site. Só preenche o que está vazio.
async function enriquecer(ids) {
  const alvo = estado.leads.filter((l) => ids.includes(l.id) && l.site && (!l.enriquecido || Vendas.precisaAnalise(l)));
  if (!alvo.length) return;
  let feitos = 0;
  const lotes = [];
  for (let i = 0; i < alvo.length; i += 6) lotes.push(alvo.slice(i, i + 6));
  const trabalhar = async () => {
    while (lotes.length) {
      const lote = lotes.shift();
      try {
        const { resultados } = await api("/api/enriquecer", { sites: lote.map((l) => ({ id: l.id, site: l.site })) });
        await Promise.all(lote.map((l) => {
          const r = resultados[l.id] || {}, m = { enriquecido: true };
          if (r.diag) m.dados = { ...(l.dados || {}), diag: r.diag };
          if (r.email && !l.email) m.email = r.email;
          for (const k of ["instagram", "facebook", "linkedin"]) if (r[k] && !l[k]) m[k] = r[k];
          if (r.whatsapp && (!l.whatsapp || l.whatsapp_origem === "telefone")) { m.whatsapp = r.whatsapp; m.whatsapp_origem = "site"; }
          return salvarLead(l, m);
        }));
      } catch { /* segue com os próximos */ }
      feitos += lote.length;
      progresso(feitos / alvo.length, `Analisando os sites (celular, segurança, agendamento, anúncios): ${feitos} de ${alvo.length}`,
        "Fazendo o diagnóstico…");
    }
  };
  await Promise.all([trabalhar(), trabalhar()]);
}

function renderBuscar() {
  $("#aviso-chave").hidden = !!estado.config?.google_key;
  atualizarCusto();
  const el = $("#lista-buscas");
  if (!estado.buscas.length) { el.innerHTML = `<p class="dica" style="margin:0">Nenhuma busca ainda.</p>`; return; }
  el.innerHTML = estado.buscas.slice(0, 30).map((b) => {
    const g = contarGrupos(estado.leads.filter((l) => (l.buscas || []).includes(b.id)));
    return `
    <button class="btn cheio" data-busca="${b.id}" style="justify-content:space-between; margin-bottom:8px; text-align:left; font-weight:400">
      <span><b>${esc(b.nichos.join(", "))}</b><br><small style="color:var(--sub)">${esc(b.bairro ? b.bairro + ", " : "")}${esc(b.cidade)} - ${b.uf} · ${new Date(b.criado_em).toLocaleDateString("pt-BR")}</small></span>
      <span style="flex:none; text-align:right">${b.total} <small style="color:var(--sub)">(${b.novos} novos)</small>
        ${b.total ? `<br><small style="color:var(--sub)">🔴 ${g.sem} · 🟡 ${g.melhorar} · 🟢 ${g.boa}</small>` : ""}</span>
    </button>`;
  }).join("");
}

// ── Leads ──────────────────────────────────────────────────────────────────────
const analise = (l) => Vendas.analisar(l, estado.medianas);
const perfil = () => estado.config?.perfil || {};

function contarGrupos(lista) {
  const g = { sem: 0, melhorar: 0, boa: 0, analisando: 0 };
  for (const l of lista) g[analise(l).grupo]++;
  return g;
}

function chanceDe(l, a = analise(l)) {
  return Vendas.chanceFechamento(l, a, estado.taxas || {});
}

function filtrados(ignorarGrupo = false) {
  const f = estado.filtro, termo = norm(f.texto);
  let lista = estado.leads.filter((l) =>
    (!f.status || l.status === f.status) && (!f.wa || l.whatsapp) && (!f.email || l.email) &&
    (ignorarGrupo || !f.grupo || analise(l).grupo === f.grupo) && (!f.nota || l.nota >= 4.5) &&
    (!f.mensal || Vendas.planoMensal(l, analise(l), perfil())?.recomendado) &&
    (!f.busca || (l.buscas || []).includes(f.busca)) &&
    (!termo || norm(`${l.nome} ${l.bairro} ${l.categoria} ${l.cidade} ${l.nicho}`).includes(termo)));
  const ord = {
    recentes: (a, b) => b.criado_em.localeCompare(a.criado_em),
    potencial: (a, b) => analise(b).potencial - analise(a).potencial,
    chance: (a, b) => chanceDe(b).pct - chanceDe(a).pct,
    avaliacoes: (a, b) => b.avaliacoes - a.avaliacoes,
    nota: (a, b) => b.nota - a.nota || b.avaliacoes - a.avaliacoes,
    nome: (a, b) => a.nome.localeCompare(b.nome),
  }[f.ordem];
  return lista.sort(ord);
}

function corStatus(s) { return `var(--s-${s})`; }

function seloGrupo(g) {
  const G = Vendas.GRUPOS[g];
  return `<span class="selo-grupo" style="--cor:${G.cor}">${G.icone} ${G.nome}</span>`;
}

function cartaoLead(l) {
  const a = analise(l), ch = chanceDe(l, a), prox = Vendas.proximaAcao(l, estado.intervalos);
  const selos = [];
  if (l.whatsapp) selos.push("WhatsApp");
  if (l.email) selos.push("E-mail");
  if (l.instagram) selos.push("Instagram");
  if (l.fechado) selos.push("Fechado");
  const nota = l.nota ? `<span class="estrela">★</span> ${String(l.nota).replace(".", ",")} (${l.avaliacoes})` : "Sem avaliações";
  const contatado = l.status !== "novo";
  const medidor = contatado
    ? `${Vendas.termometro(ch.pct).icone} Chance de fechar: <b>${ch.pct}%</b>`
    : a.grupo === "analisando" ? "Analisando o site…" : `Potencial de abordagem: <b>${a.potencial}%</b>`;
  const acaoBtn = prox?.acao === "responder" ? "Responder" : prox?.acao === "lembrete" ? "Enviar lembrete" : "WhatsApp";
  return `<article class="lead" data-id="${l.id}">
    <div class="cab" data-abrir>
      <div>
        <h3>${esc(l.nome)}</h3>
        <div class="meta">${esc(l.categoria || l.nicho)}${l.bairro ? " · " + esc(l.bairro) : ""} · ${nota}</div>
      </div>
      <span class="status" style="--cor:${corStatus(l.status)}">${NOME_STATUS[l.status]}</span>
    </div>
    <div class="selos">${seloGrupo(a.grupo)}${selos.map((s) => `<span class="selo">${s}</span>`).join("")}</div>
    ${a.principal ? `<p class="oport">💡 ${esc(cap(blocoCurto(l, a)))}</p>` : ""}
    ${(() => { const pl = Vendas.planoMensal(l, a, perfil()); return pl?.recomendado ? `<p class="mensal">🔁 Vale plano mensal (${pl.nivel}): ${Vendas.fmtReais(pl.valor[0])} a ${Vendas.fmtReais(pl.valor[1])}/mês</p>` : ""; })()}
    <div class="medidor">${medidor}${prox?.urgente ? ` · <span class="urgente">${esc(prox.texto)} hoje</span>` : ""}</div>
    <div class="acoes">
      <button class="btn wa" data-acao="wa" ${l.whatsapp ? "" : "disabled"}>${acaoBtn}</button>
      <a class="btn" data-acao="ligar" ${l.tel_digitos ? `href="tel:+${esc(l.tel_digitos)}"` : 'aria-disabled="true" style="opacity:.45"'}>Ligar</a>
      <button class="btn" data-abrir>Detalhes</button>
    </div>
  </article>`;
}

const cap = (t) => t ? t[0].toUpperCase() + t.slice(1) : "";
// Frase curta da oportunidade principal, com os dados do lead já preenchidos.
function blocoCurto(l, a) {
  const p = Vendas.precoDe(a.principal.servico, perfil());
  return `${Vendas.montarMensagem(l, "_curto", a, { roteiro: { _curto: "{curto}" } })} → ${p.nome}`;
}

function renderLeads() {
  const f = estado.filtro, todos = estado.leads;
  const conta = (s) => todos.filter((l) => l.status === s).length;
  $("#resumo").innerHTML = `
    <div><b>${todos.length}</b><span>leads</span></div>
    <div><b>${todos.filter((l) => l.whatsapp).length}</b><span>com WhatsApp</span></div>
    <div><b>${conta("fechado")}</b><span>negócios fechados</span></div>`;
  $("#f-status").innerHTML = [["", "Todos", todos.length], ...STATUS.map(([s, n]) => [s, n, conta(s)])]
    .map(([s, n, c]) => `<button class="chip" data-s="${s}" aria-pressed="${f.status === s}">${n}<small>${c}</small></button>`).join("");
  $$("#f-extra .chip").forEach((b) => b.setAttribute("aria-pressed", !!f[b.dataset.f]));
  const base = filtrados(true), g = contarGrupos(base);
  $("#f-grupo").innerHTML = [["", "Todos os grupos", base.length], ["sem", "🔴 Sem presença", g.sem],
    ["melhorar", "🟡 A melhorar", g.melhorar], ["boa", "🟢 Presença boa", g.boa],
    ...(g.analisando ? [["analisando", "⏳ Analisando", g.analisando]] : [])]
    .map(([v, n, c]) => `<button class="chip" data-grupo="${v}" aria-pressed="${f.grupo === v}">${n}<small>${c}</small></button>`).join("");
  $("#btn-limpar-filtros").hidden = Object.keys(FILTRO_PADRAO).every((k) => f[k] === FILTRO_PADRAO[k]);
  const pendentes = todos.filter(Vendas.precisaAnalise).length;
  $("#btn-analisar").hidden = !pendentes || estado.analisandoSites;
  $("#btn-analisar").textContent = `Fazer o diagnóstico de ${pendentes} site${pendentes > 1 ? "s" : ""} pendente${pendentes > 1 ? "s" : ""}`;
  const busca = estado.buscas.find((b) => b.id === f.busca);
  $("#f-busca-aviso").hidden = !busca;
  if (busca) {
    const daBusca = todos.filter((l) => (l.buscas || []).includes(busca.id)), gb = contarGrupos(daBusca);
    $("#f-busca-aviso").innerHTML = `Busca “${esc(busca.nichos.join(", "))}” em ${esc(busca.cidade)}: <b>${daBusca.length} empresas</b> — ` +
      `🔴 ${gb.sem} sem presença, 🟡 ${gb.melhorar} a melhorar, 🟢 ${gb.boa} com presença boa. <a href="#" id="limpar-busca">Ver todos</a>`;
  }

  const lista = filtrados();
  $("#lista-leads").innerHTML = lista.length ? lista.slice(0, estado.mostrar).map(cartaoLead).join("")
    : `<div class="vazio">${todos.length ? "Nenhum lead com esses filtros." : "Seus leads aparecem aqui depois da primeira busca."}</div>`;
  $("#btn-mais").hidden = lista.length <= estado.mostrar;
  $("#btn-mais").textContent = `Mostrar mais (${lista.length - estado.mostrar})`;
}

async function analisarPendentes() {
  const ids = estado.leads.filter(Vendas.precisaAnalise).map((l) => l.id);
  if (!ids.length) return;
  estado.analisandoSites = true;
  renderLeads();
  toast(`Analisando ${ids.length} sites… pode continuar usando o app.`);
  await enriquecer(ids);
  estado.analisandoSites = false;
  recalcular();
  renderLeads();
  toast("Diagnóstico pronto.");
}

// Estatísticas que dependem de todos os leads (intervalos dos lembretes e taxas reais por etapa).
function recalcular() {
  estado.intervalos = Vendas.intervalos(estado.leads);
  estado.taxas = Vendas.taxasReais(estado.leads);
  atualizarBadgeHoje();
}

// ── Mensagens livres (as "Mensagens extras" dos Ajustes) ─────────────────────────
function preencher(texto, l) {
  const cat = (l.categoria || l.nicho || "empresas").toLowerCase();
  return texto.replaceAll("{nome}", l.nome).replaceAll("{cidade}", l.cidade || "sua cidade")
    .replaceAll("{bairro}", l.bairro || l.cidade || "").replaceAll("{categoria}", cat);
}

// ── Ciclo de conversa ──────────────────────────────────────────────────────────
// Etapa sugerida agora para o lead (primeiro contato, lembrete, resposta ao tipo de resposta...).
function etapaSugerida(l) {
  const prox = Vendas.proximaAcao(l, estado.intervalos);
  if (prox) return prox.etapa;
  const { respostas } = Vendas.ciclo(l);
  return respostas.length ? respostas[respostas.length - 1].tipo : l.status === "novo" ? "abordagem" : "retomar";
}

async function enviarEtapa(l, etapa, texto, nome) {
  window.open(`https://wa.me/${l.whatsapp}?text=${encodeURIComponent(texto)}`, "_blank");
  const agora = new Date();
  const c = Vendas.ciclo(l);
  const envio = { t: agora.toISOString(), etapa, dow: agora.getDay(), h: agora.getHours(), txt: texto.slice(0, 1000) };
  const dados = { ...(l.dados || {}), ciclo: { ...c, envios: [...c.envios, envio], encerrado: c.encerrado || etapa === "encerramento" } };
  const extra = { dados, ultimo_contato: envio.t };
  if (l.status === "novo" && estado.config.auto_contatado !== false) extra.status = "contatado";
  await registrar(l, "whatsapp", `WhatsApp enviado: ${nome || Vendas.NOME_ETAPA[etapa] || etapa}`, extra);
  recalcular();
  if (!$("#tela-leads").hidden) renderLeads();
  if (!$("#tela-painel").hidden) renderPainel();
}

async function registrarResposta(l, tipo, txt) {
  const c = Vendas.ciclo(l);
  const resp = { t: new Date().toISOString(), tipo, txt: (txt || "").slice(0, 1000) };
  const dados = { ...(l.dados || {}), ciclo: { ...c, respostas: [...c.respostas, resp] } };
  const extra = { dados };
  if (!["fechado", "descartado"].includes(l.status)) extra.status = tipo === "aprovacao" ? "reuniao" : "respondeu";
  await registrar(l, "resposta", `Cliente respondeu (${Vendas.NOME_RESPOSTA[tipo]})${txt ? `: “${txt.slice(0, 200)}”` : ""}`, extra);
  recalcular();
  renderLeads();
}

// ── Ficha do lead ──────────────────────────────────────────────────────────────
const ETAPAS_MSG = ["abordagem", "follow1", "follow2", "encerramento", "rejeicao", "atencao", "desejo", "valor", "aprovacao", "retomar"];

function itemDiag(ok, txt) {
  return `<li class="${ok ? "ok" : "falta"}"><span aria-hidden="true">${ok ? "✓" : "✗"}</span> ${txt}</li>`;
}

function htmlDiagnostico(l, a) {
  const d = l.dados?.diag;
  const linhas = [];
  if (!l.site) linhas.push(itemDiag(false, "Não tem site"));
  else if (Vendas.soRede(l.site)) linhas.push(itemDiag(false, "O link do Google leva só para rede social"));
  else if (!d) linhas.push(`<li>⏳ Site ainda não analisado</li>`);
  else if (!d.abre) linhas.push(itemDiag(false, "O site não abriu"));
  else {
    linhas.push(itemDiag(true, `Site abre (${(d.ms / 1000).toFixed(1).replace(".", ",")} s)`));
    linhas.push(itemDiag(d.responsivo, "Adaptado ao celular"));
    linhas.push(itemDiag(d.https, "Seguro (cadeado https)"));
    linhas.push(itemDiag(d.ms <= 4000, "Abre rápido"));
    linhas.push(itemDiag(d.whatsapp_site, "Botão de WhatsApp no site"));
    linhas.push(itemDiag(d.agendamento, "Agendamento ou reserva online"));
    linhas.push(itemDiag(d.chat, "Atendimento automático / chat"));
    linhas.push(itemDiag(d.pixel || d.google_tag, "Medição de anúncios (Pixel/Google)"));
    if (d.ano_rodape) linhas.push(itemDiag(d.ano_rodape >= new Date().getFullYear() - 1, `Rodapé atualizado (${d.ano_rodape})`));
    if (d.plataforma) linhas.push(`<li>ℹ️ Feito em ${esc(d.plataforma)}</li>`);
  }
  const med = a.ctx?.mediana;
  if (l.avaliacoes || med) linhas.push(itemDiag(!med || l.avaliacoes >= med * 0.4, `${l.avaliacoes} avaliações no Google${med ? ` (média da região: ${med})` : ""}`));
  return `<ul class="diag">${linhas.join("")}</ul>`;
}

function htmlOportunidades(l, a, escolhida) {
  if (!a.oportunidades.length) return `<p class="dica" style="margin:0">Aguardando o diagnóstico do site.</p>`;
  return a.oportunidades.slice(0, 5).map((o) => {
    const p = Vendas.precoDe(o.servico, perfil());
    return `<label class="oport-item">
      <input type="radio" name="l-oport" value="${o.id}" ${o.id === escolhida ? "checked" : ""}>
      <span><b>${esc(p.nome)}</b> — ${esc(Vendas.montarMensagem(l, "_c", a, { roteiro: { _c: "{curto}" } }, o))}<br>
      <small>💰 Sugestão de valor: ${Vendas.faixaPreco(p)} · prazo ${esc(perfil().prazo || p.prazo)}</small></span>
    </label>`;
  }).join("");
}

// Proposta de valor: onde o dinheiro entra, resultado, como usar, conta de retorno e plano mensal.
function htmlValor(l, a, op, conta) {
  const p = Vendas.precoDe(op.servico, perfil());
  const r = Vendas.retorno(l, { principal: op }, perfil(), conta.ticket, conta.clientes);
  const pl = Vendas.planoMensal(l, { ...a, principal: op }, perfil());
  return `<h2>💰 Proposta de valor: ${esc(p.nome)}</h2>
    <dl class="valor">
      <div><dt>Onde o dinheiro entra</dt><dd>${esc(cap(p.retorno))}.</dd></div>
      <div><dt>Resultado esperado</dt><dd>${esc(cap(p.resultado))}.</dd></div>
      <div><dt>Como eles usam</dt><dd>${esc(cap(p.uso))}.</dd></div>
    </dl>
    <h2 style="margin-top:16px">Conta de retorno</h2>
    <div class="grade2">
      <label class="campo" style="margin:0">Ticket médio (R$)<input id="l-ticket" type="number" inputmode="numeric" min="1" value="${conta.ticket}"></label>
      <label class="campo" style="margin:0">Clientes a mais/mês<input id="l-clientes" type="number" inputmode="numeric" min="1" value="${conta.clientes}"></label>
    </div>
    <p class="conta">Investimento médio ${Vendas.fmtReais(r.investimento)} · ganho de ${Vendas.fmtReais(r.ganhoMes)}/mês → <b>se paga em ~${r.meses} ${r.meses > 1 ? "meses" : "mês"}</b></p>
    <p class="dica" style="margin-top:0">O ticket é uma estimativa para o setor: pergunte ao cliente e ajuste.</p>
    <h2 style="margin-top:16px">Manutenção mensal</h2>
    ${pl && pl.valor ? `<p class="plano ${pl.recomendado ? "sim" : "nao"}"><b>${pl.recomendado ? "✅" : "➖"} ${esc(pl.nivel)}: ${Vendas.fmtReais(pl.valor[0])} a ${Vendas.fmtReais(pl.valor[1])}/mês</b><br>${esc(pl.motivo)}</p>
      ${p.manutencao ? `<p class="dica" style="margin-top:6px">Inclui: ${esc(p.manutencao)}.</p>` : ""}`
      : `<p class="dica" style="margin:0">${esc(pl?.motivo || "Sem mensalidade para este serviço.")}</p>`}
    <button class="btn cheio" id="l-usar-valor" style="margin-top:10px">Usar na mensagem (proposta de valor)</button>`;
}

function contextoIa(l, a, etapa) {
  const c = Vendas.ciclo(l);
  return {
    perfil: { nome: perfil().nome, marca: perfil().marca, portfolio: perfil().portfolio, prazo: perfil().prazo },
    precos: Object.fromEntries(Object.keys(Vendas.SERVICOS).map((k) => { const p = Vendas.precoDe(k, perfil()); return [p.nome, Vendas.faixaPreco(p)]; })),
    lead: { nome: l.nome, categoria: l.categoria, cidade: l.cidade, bairro: l.bairro, nota: l.nota, avaliacoes: l.avaliacoes,
      site: l.site || "não tem", grupo: Vendas.GRUPOS[a.grupo].nome, diagnostico_site: l.dados?.diag || null },
    oportunidades: a.oportunidades.slice(0, 4).map((o) => ({ servico: Vendas.precoDe(o.servico).nome, observado: Vendas.montarMensagem(l, "_p", a, { roteiro: { _p: "{problema}" } }, o) })),
    etapa_atual: Vendas.NOME_ETAPA[etapa] || etapa,
    plano_mensal: (() => { const pl = Vendas.planoMensal(l, a, perfil()); return pl ? { nivel: pl.nivel, recomendado: pl.recomendado, valor: pl.valor, motivo: pl.motivo } : null; })(),
    proposta_valor: a.principal ? (({ retorno, resultado, uso, manutencao }) => ({ retorno, resultado, uso, manutencao }))(Vendas.precoDe(a.principal.servico, perfil())) : null,
    conversa: [...c.envios.map((e) => ({ t: e.t, de: "vendedor", texto: e.txt })), ...c.respostas.map((r) => ({ t: r.t, de: "cliente", tipo: r.tipo, texto: r.txt }))]
      .sort((x, y) => x.t.localeCompare(y.t)).slice(-12),
  };
}

function abrirLead(id, opcoes = {}) {
  const l = estado.leads.find((x) => x.id === id);
  if (!l) return;
  const a = analise(l), ch = chanceDe(l, a), prox = Vendas.proximaAcao(l, estado.intervalos);
  const dlg = $("#folha-lead");
  let etapa = opcoes.etapa || etapaSugerida(l);
  let oportId = opcoes.oport || a.principal?.id;
  const conta = { ticket: opcoes.ticket || Vendas.ticketEstimado(l), clientes: opcoes.clientes || 2 };
  const oport = () => a.oportunidades.find((o) => o.id === oportId) || a.principal;
  const msgDe = (et) => et.startsWith("extra:")
    ? preencher(estado.config.templates.find((t) => t.id === et.slice(6))?.texto || "", l)
    : Vendas.montarMensagem(l, et, a, perfil(), oport(), conta);
  const linha = (rotulo, valor) => valor ? `<div><dt>${rotulo}</dt><dd>${valor}</dd></div>` : "";
  const link = (url, txt) => `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(txt || url)}</a>`;
  const curto = (url) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  const termo = Vendas.termometro(ch.pct);
  const c = Vendas.ciclo(l);
  const temIa = !!estado.config.ia_key;
  const p = a.principal ? Vendas.precoDe(oport().servico, perfil()) : null;

  dlg.innerHTML = `
    <div class="barra">
      <h2>${esc(l.nome)}<br><small style="font-weight:400; color:var(--sub); font-size:14px">${esc(l.categoria)}${l.nota ? ` · <span class="estrela">★</span> ${String(l.nota).replace(".", ",")} (${l.avaliacoes})` : ""}</small></h2>
      <button class="fechar" data-fechar aria-label="Fechar">×</button>
    </div>
    <div class="corpo">
      <div class="resumo-lead">
        <div>${seloGrupo(a.grupo)}</div>
        <div class="kpis-lead">
          <div><b>${a.potencial}%</b><span>potencial de abordagem</span></div>
          <div><b>${termo.icone} ${ch.pct}%</b><span>chance de fechar (${termo.nome.toLowerCase()}${ch.fonte ? ", " + ch.fonte : ""})</span></div>
        </div>
        ${prox ? `<p class="proximo ${prox.urgente ? "urgente" : ""}">Próximo passo: <b>${esc(prox.texto)}</b> ${prox.acao === "abordar" ? "(primeiro contato)" : prox.urgente ? "— agora" : `em ${prox.quando.toLocaleDateString("pt-BR")}`}</p>` : ""}
      </div>

      <div class="cartao">
        <h2>Mensagem</h2>
        ${l.whatsapp ? `
          <label class="campo" for="l-etapa" style="margin-top:0">Etapa do ciclo</label>
          <select id="l-etapa">
            ${ETAPAS_MSG.map((e) => `<option value="${e}" ${e === etapa ? "selected" : ""}>${Vendas.NOME_ETAPA[e]}</option>`).join("")}
            ${estado.config.templates.map((t) => `<option value="extra:${esc(t.id)}">Minha mensagem: ${esc(t.nome)}</option>`).join("")}
          </select>
          ${perfil().nome ? "" : `<p class="aviso" style="margin:8px 0 0">Para a mensagem dizer quem você é, preencha seu nome em <a href="#" data-ir="ajustes">Ajustes → Seu perfil</a>.</p>`}
          <textarea id="l-msg" style="margin-top:8px; min-height:170px">${esc(msgDe(etapa))}</textarea>
          <div class="grade2" style="margin-top:8px">
            <button class="btn wa" id="l-enviar">Abrir no WhatsApp</button>
            <button class="btn" id="l-ia-msg" ${temIa ? "" : "hidden"}>✨ Reescrever com IA</button>
          </div>
          <p class="dica" id="l-ia-status"></p>
          ${l.whatsapp_origem === "telefone" ? `<p class="dica">Número de celular do Google; confirme se é WhatsApp.</p>` : ""}`
        : `<p class="dica" style="margin:0">Sem WhatsApp encontrado${l.tel_tipo === "fixo" ? " (o telefone é fixo: ligue)" : ""}.</p>`}
      </div>

      <div class="cartao">
        <h2>O cliente respondeu?</h2>
        <textarea id="l-resposta" placeholder="Cole aqui a resposta dele (opcional): o app sugere o tipo e prepara a próxima mensagem"></textarea>
        <div class="tipos-resposta" role="group" aria-label="Tipo de resposta">
          ${["rejeicao", "atencao", "desejo", "aprovacao"].map((t) => `<button class="btn" data-tipo="${t}">${Vendas.ICONE_RESPOSTA[t]} ${Vendas.NOME_RESPOSTA[t]}</button>`).join("")}
        </div>
        <p class="dica" id="l-sugestao-tipo"></p>
        <button class="btn cheio" id="l-ia-resp" style="margin-top:6px" ${temIa ? "" : "hidden"}>✨ Analisar a resposta com IA</button>
        ${c.respostas.length ? `<p class="dica">Respostas registradas: ${c.respostas.map((r) => Vendas.ICONE_RESPOSTA[r.tipo]).join(" ")}</p>` : ""}
      </div>

      <div class="cartao">
        <h2>Diagnóstico</h2>
        ${htmlDiagnostico(l, a)}
        <h2 style="margin-top:16px">O que oferecer</h2>
        <div id="l-oports">${htmlOportunidades(l, a, oportId)}</div>
        ${p ? `<p class="dica">A mensagem usa a oportunidade marcada. Os valores são só para você (edite a tabela em Ajustes).</p>` : ""}
      </div>

      ${a.principal ? `<div class="cartao" id="l-valor">${htmlValor(l, a, oport(), conta)}</div>` : ""}

      <div class="grade2" style="margin-bottom:14px">
        ${l.tel_digitos ? `<a class="btn" id="l-ligar" href="tel:+${esc(l.tel_digitos)}">Ligar</a>` : ""}
        ${l.email ? `<a class="btn" href="mailto:${esc(l.email.split(",")[0].trim())}">E-mail</a>` : ""}
        ${l.maps ? `<a class="btn" href="${esc(l.maps)}" target="_blank" rel="noopener">Ver no Maps</a>` : ""}
        ${l.instagram ? `<a class="btn" href="${esc(l.instagram)}" target="_blank" rel="noopener">Instagram</a>` : ""}
      </div>

      <div class="cartao">
        <label class="campo" for="l-status" style="margin-top:0">Etapa do funil</label>
        <select id="l-status">${STATUS.map(([s, n]) => `<option value="${s}" ${s === l.status ? "selected" : ""}>${n}</option>`).join("")}</select>
        <dl class="info" style="margin:14px 0 0">
          ${linha("Telefone", esc(l.telefone))}
          ${linha("WhatsApp", l.whatsapp ? esc(l.whatsapp.replace(/^55/, "")) : "")}
          ${linha("E-mail", esc(l.email))}
          ${linha("Site", l.site ? link(l.site, curto(l.site)) : "<i>não tem</i>")}
          ${linha("Instagram", l.instagram ? link(l.instagram, curto(l.instagram)) : "")}
          ${linha("Facebook", l.facebook ? link(l.facebook, curto(l.facebook)) : "")}
          ${linha("LinkedIn", l.linkedin ? link(l.linkedin, curto(l.linkedin)) : "")}
          ${linha("Endereço", esc(l.endereco))}
          ${linha("Busca", esc(l.nicho))}
        </dl>
      </div>

      <div class="cartao">
        <h2>Anotações</h2>
        <textarea id="l-nota" placeholder="ex.: falar com a Ana à tarde"></textarea>
        <button class="btn cheio" id="l-add-nota" style="margin-top:8px">Adicionar anotação</button>
        <h2 style="margin-top:18px">Histórico</h2>
        <ul class="historico">${[...(l.historico || [])].reverse().map((h) =>
          `<li><time>${new Date(h.t).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</time>${esc(h.txt)}</li>`).join("")}</ul>
      </div>
      <button class="btn cheio perigo" id="l-excluir">Excluir lead</button>
    </div>`;

  const reabrir = (extra = {}) => abrirLead(l.id, { etapa, oport: oportId, ...extra });
  $("#l-status", dlg).onchange = async (e) => {
    const s = e.target.value;
    await registrar(l, "status", `Etapa: ${NOME_STATUS[s]}`, { status: s });
    recalcular(); renderLeads(); reabrir();
  };
  const selEtapa = $("#l-etapa", dlg);
  if (selEtapa) {
    selEtapa.onchange = () => { etapa = selEtapa.value; $("#l-msg", dlg).value = msgDe(etapa); };
    $("#l-enviar", dlg).onclick = () => {
      const nome = etapa.startsWith("extra:") ? estado.config.templates.find((t) => t.id === etapa.slice(6))?.nome : null;
      enviarEtapa(l, etapa.startsWith("extra:") ? "extra" : etapa, $("#l-msg", dlg).value, nome).then(() => abrirLead(l.id));
    };
  }
  const atualizarValor = () => {
    const box = $("#l-valor", dlg);
    if (box) box.innerHTML = htmlValor(l, a, oport(), conta);
    if ($("#l-msg", dlg) && !etapa.startsWith("extra:")) $("#l-msg", dlg).value = msgDe(etapa);
  };
  $("#l-oports", dlg).onchange = (e) => {
    if (e.target.name !== "l-oport") return;
    oportId = e.target.value;
    atualizarValor();
  };
  const boxValor = $("#l-valor", dlg);
  if (boxValor) {
    boxValor.addEventListener("change", (e) => {
      if (e.target.id === "l-ticket") conta.ticket = Math.max(1, +e.target.value || 1);
      if (e.target.id === "l-clientes") conta.clientes = Math.max(1, +e.target.value || 1);
      atualizarValor();
    });
    boxValor.addEventListener("click", (e) => {
      if (e.target.id !== "l-usar-valor") return;
      etapa = "valor";
      if (selEtapa) { selEtapa.value = "valor"; $("#l-msg", dlg).value = msgDe(etapa); $("#l-msg", dlg).scrollIntoView({ block: "center" }); }
    });
  }
  const campoResp = $("#l-resposta", dlg);
  campoResp.oninput = () => {
    const t = Vendas.classificarResposta(campoResp.value);
    $$("[data-tipo]", dlg).forEach((b) => b.classList.toggle("sugerido", b.dataset.tipo === t));
    $("#l-sugestao-tipo", dlg).textContent = t ? `Parece ${Vendas.NOME_RESPOSTA[t].toLowerCase()}. Toque no tipo para confirmar.` : "";
  };
  $$("[data-tipo]", dlg).forEach((b) => (b.onclick = async () => {
    await registrarResposta(l, b.dataset.tipo, campoResp.value.trim());
    abrirLead(l.id, { etapa: b.dataset.tipo, oport: oportId });
    toast("Resposta registrada. A próxima mensagem já está pronta.");
  }));

  const statusIa = $("#l-ia-status", dlg);
  const btnIaMsg = $("#l-ia-msg", dlg);
  if (btnIaMsg) btnIaMsg.onclick = async () => {
    statusIa.textContent = "A IA está escrevendo…"; btnIaMsg.disabled = true;
    try {
      const r = await api("/api/ia", { tarefa: "mensagem", contexto: contextoIa(l, a, etapa), texto: $("#l-msg", dlg).value });
      $("#l-msg", dlg).value = r.mensagem;
      statusIa.textContent = `${r.explicacao}${r.valor_sugerido ? ` · 💰 ${r.valor_sugerido}` : ""}`;
    } catch (err) { statusIa.textContent = err.message; }
    btnIaMsg.disabled = false;
  };
  $("#l-ia-resp", dlg).onclick = async () => {
    const txt = campoResp.value.trim();
    if (!txt) { toast("Cole a resposta do cliente primeiro."); return; }
    const st = $("#l-sugestao-tipo", dlg);
    st.textContent = "A IA está analisando…";
    try {
      const r = await api("/api/ia", { tarefa: "classificar", contexto: contextoIa(l, a, etapa), texto: txt });
      if (r.tipo_resposta === "nenhum") { st.textContent = r.explicacao; return; }
      await registrarResposta(l, r.tipo_resposta, txt);
      abrirLead(l.id, { etapa: r.tipo_resposta, oport: oportId });
      $("#l-msg", dlg) && ($("#l-msg", dlg).value = r.mensagem);
      $("#l-ia-status", dlg) && ($("#l-ia-status", dlg).textContent = `IA: ${Vendas.NOME_RESPOSTA[r.tipo_resposta]} — ${r.explicacao}${r.valor_sugerido ? ` · 💰 ${r.valor_sugerido}` : ""}`);
    } catch (err) { st.textContent = err.message; }
  };
  const ligar = $("#l-ligar", dlg);
  if (ligar) ligar.onclick = () => registrar(l, "ligacao", "Ligação feita", { ultimo_contato: new Date().toISOString() });
  $("#l-add-nota", dlg).onclick = async () => {
    const txt = $("#l-nota", dlg).value.trim();
    if (!txt) return;
    await registrar(l, "nota", txt);
    reabrir();
  };
  $("#l-excluir", dlg).onclick = async () => {
    if (!confirm(`Excluir “${l.nome}”?`)) return;
    await sb.from("leads").delete().eq("id", l.id);
    estado.leads = estado.leads.filter((x) => x.id !== l.id);
    dlg.close(); recalcular(); renderLeads();
  };
  if (!dlg.open) dlg.showModal();
}

// ── Painel de vendas ───────────────────────────────────────────────────────────
function fazerHoje() {
  const itens = [];
  for (const l of estado.leads) {
    const p = Vendas.proximaAcao(l, estado.intervalos);
    if (!p || !l.whatsapp) continue;
    if (p.acao === "responder") itens.push({ l, p, ordem: 0 });
    else if (p.acao === "lembrete" && p.urgente) itens.push({ l, p, ordem: 1 });
  }
  // completa com os melhores leads ainda não abordados
  const novos = estado.leads.filter((l) => l.status === "novo" && l.whatsapp && analise(l).grupo !== "analisando")
    .sort((a, b) => analise(b).potencial - analise(a).potencial).slice(0, 10);
  for (const l of novos) itens.push({ l, p: { texto: "Abordar", etapa: "abordagem" }, ordem: 2 });
  return itens.sort((a, b) => a.ordem - b.ordem);
}

function atualizarBadgeHoje() {
  if (!estado.leads.length && !estado.intervalos) return;
  estado.intervalos ||= Vendas.intervalos(estado.leads);
  const n = fazerHoje().filter((i) => i.ordem < 2).length;
  const b = $("#badge-hoje");
  b.hidden = !n; b.textContent = n;
}

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
// Soma da mensalidade média dos leads em que o plano mensal é recomendado.
function recorrente(lista) {
  return lista.reduce((s, l) => {
    const pl = Vendas.planoMensal(l, analise(l), perfil());
    return pl?.recomendado && pl.valor ? s + (pl.valor[0] + pl.valor[1]) / 2 : s;
  }, 0);
}

function renderPainel() {
  recalcular();
  const L = estado.leads;
  const abordados = L.filter((l) => Vendas.ciclo(l).envios.length);
  const responderam = abordados.filter((l) => Vendas.ciclo(l).respostas.length);
  const interessados = L.filter((l) => Vendas.ciclo(l).respostas.some((r) => ["desejo", "aprovacao"].includes(r.tipo)));
  const proposta = L.filter((l) => ["reuniao", "fechado"].includes(l.status));
  const fechados = L.filter((l) => l.status === "fechado");
  const emNegociacao = L.filter((l) => ["respondeu", "reuniao"].includes(l.status) &&
    Vendas.ciclo(l).respostas.some((r) => ["desejo", "aprovacao"].includes(r.tipo)));
  const valor = emNegociacao.reduce((s, l) => {
    const a = analise(l); if (!a.principal) return s;
    const p = Vendas.precoDe(a.principal.servico, perfil()); return s + (p.min + p.max) / 2;
  }, 0);

  // Fazer hoje
  const hoje = fazerHoje();
  $("#p-hoje").innerHTML = hoje.length ? hoje.slice(0, 15).map(({ l, p, ordem }) => `
    <button class="linha-hoje" data-lead="${l.id}" data-etapa="${p.etapa}">
      <span class="tag-hoje t${ordem}">${ordem === 0 ? "Responder" : ordem === 1 ? "Lembrete" : "Abordar"}</span>
      <span class="nome-hoje"><b>${esc(l.nome)}</b><small>${esc(p.texto)} · ${Vendas.GRUPOS[analise(l).grupo].icone} ${esc(l.categoria || l.nicho)}</small></span>
      <span class="pct-hoje">${ordem === 2 ? analise(l).potencial + "%" : chanceDe(l).pct + "%"}</span>
    </button>`).join("") : `<p class="dica" style="margin:0">Nada pendente. Faça uma busca para encontrar novos leads.</p>`;

  // Indicadores
  $("#p-kpis").innerHTML = `
    <div><b>${abordados.length}</b><span>abordados</span></div>
    <div><b>${pct(responderam.length, abordados.length)}%</b><span>responderam</span></div>
    <div><b>${interessados.length}</b><span>interessados</span></div>
    <div><b>${fechados.length}</b><span>fechados</span></div>
    <div><b>${pct(fechados.length, abordados.length)}%</b><span>de fechamento</span></div>
    <div><b>${Vendas.fmtReais(Math.round(valor))}</b><span>em negociação</span></div>
    <div><b>${Vendas.fmtReais(Math.round(recorrente(emNegociacao)))}</b><span>por mês em manutenção (negociando)</span></div>
    <div><b>${Vendas.fmtReais(Math.round(recorrente(fechados)))}</b><span>por mês em manutenção (fechados)</span></div>
    <div><b>${L.filter((l) => Vendas.planoMensal(l, analise(l), perfil())?.recomendado).length}</b><span>leads que valem plano mensal</span></div>`;

  // Funil
  const etapas = [["Encontrados", L.length], ["Abordados", abordados.length], ["Responderam", responderam.length],
    ["Interessados", interessados.length], ["Reunião / proposta", proposta.length], ["Fechados", fechados.length]];
  const max = Math.max(1, L.length);
  $("#p-funil").innerHTML = etapas.map(([n, v], i) => `
    <div class="barra-linha" title="${n}: ${v}">
      <span class="barra-rot">${n}</span>
      <span class="barra-trilho"><span class="barra-val" style="width:${Math.max(v ? 2 : 0, (v / max) * 100)}%"></span></span>
      <span class="barra-num">${v}${i > 0 ? ` <small>${pct(v, etapas[i - 1][1])}%</small>` : ""}</span>
    </div>`).join("");

  // Por grupo
  const linhasGrupo = ["sem", "melhorar", "boa"].map((g) => {
    const ls = L.filter((l) => analise(l).grupo === g), ab = ls.filter((l) => Vendas.ciclo(l).envios.length);
    const rs = ab.filter((l) => Vendas.ciclo(l).respostas.length), fe = ls.filter((l) => l.status === "fechado");
    return `<tr><td>${Vendas.GRUPOS[g].icone} ${Vendas.GRUPOS[g].nome}</td><td>${ls.length}</td><td>${ab.length}</td><td>${pct(rs.length, ab.length)}%</td><td>${pct(fe.length, ab.length)}%</td></tr>`;
  }).join("");
  $("#p-grupos").innerHTML = `<table class="tabela"><thead><tr><th>Grupo</th><th>Leads</th><th>Abordados</th><th>Resposta</th><th>Fechamento</th></tr></thead><tbody>${linhasGrupo}</tbody></table>`;

  // Por nicho: onde há mais oportunidade e mais resposta
  const nichos = {};
  for (const l of L) (nichos[l.nicho || "—"] ||= []).push(l);
  const linhasNicho = Object.entries(nichos).sort((a, b) => b[1].length - a[1].length).slice(0, 10).map(([n, ls]) => {
    const g = contarGrupos(ls), ab = ls.filter((l) => Vendas.ciclo(l).envios.length), rs = ab.filter((l) => Vendas.ciclo(l).respostas.length);
    return `<tr><td>${esc(n)}</td><td>${ls.length}</td><td>${pct(g.sem + g.melhorar, ls.length - g.analisando)}%</td><td>${ab.length ? pct(rs.length, ab.length) + "%" : "—"}</td></tr>`;
  }).join("");
  $("#p-nichos").innerHTML = linhasNicho ? `<table class="tabela"><thead><tr><th>Nicho</th><th>Leads</th><th>Com oportunidade</th><th>Resposta</th></tr></thead><tbody>${linhasNicho}</tbody></table>`
    : `<p class="dica" style="margin:0">Sem dados ainda.</p>`;

  renderHorarios();
  const it = estado.intervalos;
  $("#p-intervalos").innerHTML = `Lembrete 1 após <b>${it.follow1} dia${it.follow1 > 1 ? "s" : ""}</b>, lembrete 2 após mais <b>${it.follow2}</b>, encerramento após mais <b>${it.encerramento}</b>. ` +
    (it.fonte === "seus dados"
      ? `Calculado com as suas ${it.amostra} primeiras respostas: 80% chegaram em até ${it.p80.toFixed(1).replace(".", ",")} dias.`
      : `Usando o padrão de mercado (cadência 3-7-7). Com 10 respostas registradas (você tem ${it.amostra}), o app passa a usar o tempo real de resposta dos seus clientes.`);
  $("#p-ia").hidden = !estado.config.ia_key;
  $("#p-ia-off").hidden = !!estado.config.ia_key;
}

// Mapa de calor: taxa de resposta por dia da semana e faixa de horário em que a mensagem foi enviada.
const FAIXAS = [[7, 9, "7–9h"], [9, 11, "9–11h"], [11, 13, "11–13h"], [13, 15, "13–15h"], [15, 17, "15–17h"], [17, 19, "17–19h"], [19, 22, "19–22h"]];
const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function renderHorarios() {
  const cel = {};
  let total = 0;
  for (const l of estado.leads) {
    const { envios, respostas } = Vendas.ciclo(l);
    envios.forEach((e, i) => {
      if (!["abordagem", "follow1", "follow2"].includes(e.etapa)) return;
      const f = FAIXAS.findIndex(([a, b]) => e.h >= a && e.h < b);
      if (f < 0) return;
      const ate = envios[i + 1]?.t || "9999";
      const respondeu = respostas.some((r) => r.t > e.t && r.t < ate);
      const k = `${e.dow}-${f}`;
      cel[k] ||= { n: 0, r: 0 };
      cel[k].n++; if (respondeu) cel[k].r++;
      total++;
    });
  }
  const ordemDias = [1, 2, 3, 4, 5, 6, 0];
  let html = `<div class="mapa" role="table" aria-label="Taxa de resposta por dia e horário de envio"><div role="row" class="mapa-cab"><span></span>${FAIXAS.map((f) => `<span role="columnheader">${f[2]}</span>`).join("")}</div>`;
  for (const d of ordemDias) {
    html += `<div role="row"><span role="rowheader" class="mapa-dia">${DIAS[d]}</span>`;
    FAIXAS.forEach((_, f) => {
      const c = cel[`${d}-${f}`];
      const taxa = c ? c.r / c.n : null;
      const nivel = taxa == null ? "sem-dado" : `n${Math.min(4, Math.floor(taxa * 5))}`;
      html += `<span role="cell" class="mapa-cel ${nivel}" title="${DIAS[d]} ${FAIXAS[f][2]}: ${c ? `${c.r} de ${c.n} responderam (${Math.round(taxa * 100)}%)` : "sem envios"}">${c ? Math.round(taxa * 100) + "%" : ""}</span>`;
    });
    html += `</div>`;
  }
  html += `</div>`;
  $("#p-horarios").innerHTML = total >= 20 ? html
    : `<p class="dica" style="margin:0">Aparece depois de 20 mensagens enviadas pelo app (você tem ${total}). Até lá, use a referência de mercado abaixo.</p>${total ? html : ""}`;
}

// Referência de mercado (estudos públicos; aproximado, não é tempo real). Faixas = horários fortes.
const REFERENCIA = [
  { canal: "WhatsApp (prospecção B2B)", faixas: [[9, 12], [14, 18]], nota: "horário comercial" },
  { canal: "Instagram (feed)", faixas: [[9, 10], [19, 21]], nota: "pico às 20h" },
  { canal: "Instagram Reels", faixas: [[19, 21]], nota: "noite supera a manhã" },
  { canal: "TikTok", faixas: [[18, 24]], nota: "29% do uso entre 20h e 0h" },
  { canal: "YouTube (vídeos longos)", faixas: [[9, 11], [12, 15]], nota: "domingo de manhã" },
  { canal: "YouTube Shorts", faixas: [[16, 19]], nota: "fim de tarde" },
];

function renderReferencia() {
  const horas = Array.from({ length: 18 }, (_, i) => i + 6); // 6h às 23h
  $("#p-referencia").innerHTML = `<div class="ref">
    <div class="ref-linha ref-cab"><span></span><span class="ref-horas">${horas.map((h) => `<i>${h % 3 === 0 ? h + "h" : ""}</i>`).join("")}</span></div>
    ${REFERENCIA.map((r) => `<div class="ref-linha" title="${r.canal}: ${r.faixas.map(([a, b]) => `${a}h–${b}h`).join(", ")} (${r.nota})">
      <span class="ref-canal">${r.canal}<small>${r.nota}</small></span>
      <span class="ref-horas">${horas.map((h) => `<i class="${r.faixas.some(([a, b]) => h >= a && h < b) ? "on" : ""}"></i>`).join("")}</span>
    </div>`).join("")}
  </div>`;
}

async function perguntarIa() {
  const txt = $("#p-ia-pergunta").value.trim();
  if (!txt) return;
  const out = $("#p-ia-resposta");
  out.textContent = "Pensando…";
  try {
    const r = await api("/api/ia", { tarefa: "pergunta", contexto: {
      perfil: perfil(), resumo: { leads: estado.leads.length, grupos: contarGrupos(estado.leads),
        abordados: estado.leads.filter((l) => Vendas.ciclo(l).envios.length).length,
        fechados: estado.leads.filter((l) => l.status === "fechado").length } }, texto: txt });
    out.textContent = r.mensagem;
  } catch (err) { out.textContent = err.message; }
}

// ── Exportar planilha (CSV que abre no Excel e no Google Planilhas) ─────────────
function exportar() {
  const lista = filtrados();
  if (!lista.length) { toast("Nada para exportar."); return; }
  const cols = [["nome", "Nome"], ["categoria", "Categoria"], ["telefone", "Telefone"], ["whatsapp", "WhatsApp"],
    ["email", "E-mail"], ["site", "Site"], ["instagram", "Instagram"], ["facebook", "Facebook"], ["endereco", "Endereço"],
    ["bairro", "Bairro"], ["cidade", "Cidade"], ["uf", "UF"], ["nota", "Nota"], ["avaliacoes", "Avaliações"],
    ["status", "Etapa"], ["grupo", "Grupo"], ["oportunidade", "Oportunidade"], ["valor", "Valor sugerido"],
    ["chance", "Chance de fechar"], ["mensal", "Plano mensal"], ["maps", "Google Maps"]];
  const cel = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const valor = (l, k) => {
    const a = analise(l);
    if (k === "status") return NOME_STATUS[l.status];
    if (k === "nota") return String(l.nota).replace(".", ",");
    if (k === "grupo") return Vendas.GRUPOS[a.grupo].nome;
    if (k === "oportunidade") return a.principal ? Vendas.precoDe(a.principal.servico, perfil()).nome : "";
    if (k === "valor") return a.principal ? Vendas.faixaPreco(Vendas.precoDe(a.principal.servico, perfil())) : "";
    if (k === "chance") return chanceDe(l, a).pct + "%";
    if (k === "mensal") { const pl = Vendas.planoMensal(l, a, perfil()); return pl?.valor ? `${pl.nivel}: ${Vendas.fmtReais(pl.valor[0])} a ${Vendas.fmtReais(pl.valor[1])}/mês` : ""; }
    return l[k];
  };
  const linhas = [cols.map((c) => cel(c[1])).join(";"), ...lista.map((l) => cols.map(([k]) => cel(valor(l, k))).join(";"))];
  const blob = new Blob(["﻿" + linhas.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// ── Ajustes ────────────────────────────────────────────────────────────────────
function renderAjustes() {
  const c = estado.config;
  $("#a-chave").value = c.google_key || "";
  $("#a-chave-status").textContent = c.google_key ? "Chave cadastrada." : "Nenhuma chave cadastrada ainda.";
  const usado = usoDoMes();
  $("#a-uso").innerHTML = `<div class="progresso"><div style="width:${Math.min(100, usado / COTA_GRATIS * 100)}%"></div></div>
    <p class="dica" style="margin:0">${usado} de ${COTA_GRATIS} chamadas grátis usadas este mês (cada chamada traz até 20 empresas).
    Acima disso o Google cobra cerca de US$ 35 a cada 1.000 chamadas. Confira os valores no console do Google.</p>`;
  $("#a-templates").innerHTML = c.templates.map((t, i) => `
    <div class="cartao" style="padding:12px; box-shadow:none" data-i="${i}">
      <input type="text" data-k="nome" value="${esc(t.nome)}" aria-label="Nome da mensagem">
      <textarea data-k="texto" style="margin-top:8px" aria-label="Texto da mensagem">${esc(t.texto)}</textarea>
      <div class="linha-flex" style="margin-top:8px">
        <label class="linha-flex" style="gap:8px; flex:2"><input type="radio" name="padrao" value="${esc(t.id)}" ${t.id === c.padrao ? "checked" : ""} style="flex:none; width:20px; height:20px"> <span>Usar como padrão</span></label>
        <button class="btn peq perigo" data-remover="${i}" style="flex:none">Remover</button>
      </div>
    </div>`).join("");
  $("#a-auto").checked = c.auto_contatado !== false;
  const pf = c.perfil || {};
  for (const k of ["nome", "profissao", "marca", "portfolio", "prazo"]) $(`#a-p-${k}`).value = pf[k] || "";
  $("#a-p-profissao").placeholder = Vendas.PROFISSAO_PADRAO;
  $("#a-precos").innerHTML = Object.entries(Vendas.SERVICOS).map(([id]) => {
    const p = Vendas.precoDe(id, pf);
    return `<div class="preco-bloco" data-servico="${id}"><b>${esc(p.nome)}</b>
      <div class="preco-linha"><span>${p.mensal ? "Por mês" : "Projeto"}</span>
        <input type="number" inputmode="numeric" min="0" step="100" data-k="min" value="${p.min}" aria-label="${esc(p.nome)}: valor mínimo">
        <input type="number" inputmode="numeric" min="0" step="100" data-k="max" value="${p.max}" aria-label="${esc(p.nome)}: valor máximo"></div>
      ${p.mensal || !Vendas.SERVICOS[id].mmax ? "" : `<div class="preco-linha"><span>Manutenção/mês</span>
        <input type="number" inputmode="numeric" min="0" step="10" data-k="mmin" value="${p.mmin}" aria-label="${esc(p.nome)}: manutenção mínima">
        <input type="number" inputmode="numeric" min="0" step="10" data-k="mmax" value="${p.mmax}" aria-label="${esc(p.nome)}: manutenção máxima"></div>`}</div>`;
  }).join("");
  $("#a-roteiro").innerHTML = Object.keys(Vendas.ROTEIRO_PADRAO).map((e) => `
    <label class="campo" for="a-r-${e}">${Vendas.NOME_ETAPA[e]}</label>
    <textarea id="a-r-${e}" data-etapa="${e}" style="min-height:120px">${esc((pf.roteiro || {})[e] || Vendas.ROTEIRO_PADRAO[e])}</textarea>`).join("");
  $("#a-ia-chave").value = c.ia_key || "";
  $("#a-ia-status").textContent = c.ia_key ? "IA ligada." : "IA desligada (sem custo).";
  try { $("#a-tema").value = localStorage.getItem("tema") || ""; } catch { /* sem armazenamento */ }
}

function lerTemplates() {
  return $$("#a-templates [data-i]").map((el) => {
    const t = estado.config.templates[+el.dataset.i];
    return { id: t.id, nome: $("[data-k=nome]", el).value.trim() || "Mensagem", texto: $("[data-k=texto]", el).value };
  });
}

async function salvarConfig(mudancas, msg) {
  Object.assign(estado.config, mudancas);
  const { error } = await sb.from("config").update({ ...mudancas, atualizado_em: new Date().toISOString() })
    .eq("user_id", estado.usuario.id);
  toast(error ? "Não consegui salvar." : msg);
}

async function testarChave() {
  const st = $("#a-chave-status");
  st.textContent = "Testando (usa 1 chamada)…";
  try {
    const r = await api("/api/buscar", { consulta: "padaria em São Paulo - SP", retangulo: { s: -23.6, n: -23.5, w: -46.7, e: -46.6 }, paginas: 1 });
    await sb.from("buscas").insert({ nichos: ["teste da chave"], cidade: "São Paulo", uf: "SP", tamanho: "rapida", total: 0, chamadas: r.chamadas });
    await carregarBuscas();
    st.textContent = `Funcionou! O Google devolveu ${r.leads.length} empresas no teste.`;
  } catch (err) {
    st.textContent = err.message;
  }
}

function lerPerfil() {
  const pf = { ...(estado.config.perfil || {}) };
  for (const k of ["nome", "profissao", "marca", "portfolio", "prazo"]) pf[k] = $(`#a-p-${k}`).value.trim();
  pf.precos = {};
  for (const el of $$("#a-precos [data-servico]")) {
    const base = Vendas.SERVICOS[el.dataset.servico], ajuste = {};
    for (const k of ["min", "max", "mmin", "mmax"]) {
      const inp = $(`[data-k=${k}]`, el);
      if (inp && +inp.value !== base[k]) ajuste[k] = +inp.value || 0;
    }
    if (ajuste.max != null || ajuste.min != null) ajuste.max = Math.max(ajuste.min ?? base.min, ajuste.max ?? base.max);
    if (ajuste.mmax != null || ajuste.mmin != null) ajuste.mmax = Math.max(ajuste.mmin ?? base.mmin, ajuste.mmax ?? base.mmax);
    if (Object.keys(ajuste).length) pf.precos[el.dataset.servico] = ajuste;
  }
  pf.roteiro = {};
  for (const ta of $$("#a-roteiro [data-etapa]")) {
    const v = ta.value.trim();
    if (v && v !== Vendas.ROTEIRO_PADRAO[ta.dataset.etapa]) pf.roteiro[ta.dataset.etapa] = v;
  }
  return pf;
}

// ── Eventos ────────────────────────────────────────────────────────────────────
$("#form-login").addEventListener("submit", entrar);
$("#btn-criar").addEventListener("click", criarAcesso);
$("#abas").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) irPara(b.dataset.tela); });
document.addEventListener("click", (e) => {
  const ir = e.target.closest("[data-ir]");
  if (ir) { e.preventDefault(); irPara(ir.dataset.ir); }
});

$("#b-cidade").addEventListener("input", sugerirCidades);
$("#b-cidade").addEventListener("blur", () => setTimeout(() => ($("#b-sugestoes").hidden = true), 200));
$("#b-sugestoes").addEventListener("mousedown", (e) => e.preventDefault());
$("#b-sugestoes").addEventListener("click", (e) => { const li = e.target.closest("li"); if (li) escolherCidade(sugestoesAtuais[+li.dataset.i]); });
$("#b-nichos").addEventListener("input", atualizarCusto);
$("#b-bairro").addEventListener("input", atualizarCusto);
$("#b-tamanho").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  estado.tamanho = b.dataset.t;
  $$("#b-tamanho button").forEach((x) => x.setAttribute("aria-pressed", x === b));
  atualizarCusto();
});
$("#form-busca").addEventListener("submit", buscar);
$("#btn-limpar-busca").addEventListener("click", () => {
  if (estado.buscando) return;
  $("#form-busca").reset();
  estado.cidade = null;
  estado.tamanho = "padrao";
  $$("#b-tamanho button").forEach((x) => x.setAttribute("aria-pressed", x.dataset.t === "padrao"));
  $("#b-sugestoes").hidden = true;
  $("#b-erro").hidden = true;
  atualizarCusto();
  $("#b-nichos").focus();
});
$("#btn-limpar-filtros").addEventListener("click", () => {
  estado.filtro = { ...FILTRO_PADRAO };
  estado.mostrar = POR_PAGINA;
  $("#f-texto").value = "";
  $("#f-ordem").value = FILTRO_PADRAO.ordem;
  renderLeads();
});
$("#lista-buscas").addEventListener("click", (e) => {
  const b = e.target.closest("[data-busca]"); if (!b) return;
  estado.filtro = { ...estado.filtro, busca: b.dataset.busca, status: "" };
  estado.mostrar = POR_PAGINA;
  irPara("leads");
});

$("#f-texto").addEventListener("input", (e) => { estado.filtro.texto = e.target.value; estado.mostrar = POR_PAGINA; renderLeads(); });
$("#f-status").addEventListener("click", (e) => {
  const b = e.target.closest("[data-s]"); if (!b) return;
  estado.filtro.status = b.dataset.s; estado.mostrar = POR_PAGINA; renderLeads();
});
$("#f-extra").addEventListener("click", (e) => {
  const b = e.target.closest("[data-f]"); if (!b) return;
  estado.filtro[b.dataset.f] = !estado.filtro[b.dataset.f]; estado.mostrar = POR_PAGINA; renderLeads();
});
$("#f-grupo").addEventListener("click", (e) => {
  const b = e.target.closest("[data-grupo]"); if (!b) return;
  estado.filtro.grupo = b.dataset.grupo; estado.mostrar = POR_PAGINA; renderLeads();
});
$("#btn-analisar").addEventListener("click", analisarPendentes);
$("#f-ordem").addEventListener("change", (e) => { estado.filtro.ordem = e.target.value; renderLeads(); });
$("#f-busca-aviso").addEventListener("click", (e) => {
  if (e.target.id === "limpar-busca") { e.preventDefault(); estado.filtro.busca = ""; renderLeads(); }
});
$("#btn-mais").addEventListener("click", () => { estado.mostrar += POR_PAGINA; renderLeads(); });
$("#btn-exportar").addEventListener("click", exportar);
$("#lista-leads").addEventListener("click", (e) => {
  const card = e.target.closest(".lead"); if (!card) return;
  const l = estado.leads.find((x) => x.id === card.dataset.id);
  const acao = e.target.closest("[data-acao]");
  if (acao?.dataset.acao === "wa") {
    // resposta do cliente pede leitura: abre a ficha; o resto envia a mensagem da etapa na hora
    const prox = Vendas.proximaAcao(l, estado.intervalos);
    if (prox?.acao === "responder" || analise(l).grupo === "analisando") { abrirLead(l.id); return; }
    const etapa = etapaSugerida(l);
    enviarEtapa(l, etapa, Vendas.montarMensagem(l, etapa, analise(l), perfil()));
  } else if (acao?.dataset.acao === "ligar") {
    if (l.tel_digitos) registrar(l, "ligacao", "Ligação feita", { ultimo_contato: new Date().toISOString() });
  } else if (e.target.closest("[data-abrir]")) {
    abrirLead(l.id);
  }
});

const dlg = $("#folha-lead");
dlg.addEventListener("click", (e) => { if (e.target === dlg || e.target.closest("[data-fechar]")) dlg.close(); });

$("#btn-salvar-chave").addEventListener("click", () => {
  const chave = $("#a-chave").value.trim();
  salvarConfig({ google_key: chave }, chave ? "Chave salva." : "Chave removida.").then(renderAjustes);
});
$("#btn-testar-chave").addEventListener("click", async () => {
  const chave = $("#a-chave").value.trim();
  if (chave !== estado.config.google_key) await salvarConfig({ google_key: chave }, "Chave salva.");
  testarChave();
});
$("#btn-novo-template").addEventListener("click", () => {
  estado.config.templates = [...lerTemplates(), { id: "t" + Date.now(), nome: "Nova mensagem", texto: "Olá, {nome}! " }];
  renderAjustes();
});
$("#a-templates").addEventListener("click", (e) => {
  const b = e.target.closest("[data-remover]"); if (!b) return;
  const lista = lerTemplates();
  if (lista.length === 1) { toast("Mantenha pelo menos uma mensagem."); return; }
  lista.splice(+b.dataset.remover, 1);
  estado.config.templates = lista;
  renderAjustes();
});
$("#btn-salvar-templates").addEventListener("click", () => {
  const templates = lerTemplates();
  const padrao = $("input[name=padrao]:checked")?.value || templates[0].id;
  salvarConfig({ templates, padrao, auto_contatado: $("#a-auto").checked }, "Mensagens salvas.");
});
$("#a-tema").addEventListener("change", (e) => {
  try { localStorage.setItem("tema", e.target.value); } catch { /* sem armazenamento */ }
  aplicarTema(e.target.value);
});
$("#btn-sair").addEventListener("click", () => sb.auth.signOut());
$("#btn-salvar-perfil").addEventListener("click", () => salvarConfig({ perfil: lerPerfil() }, "Perfil e preços salvos."));
$("#btn-salvar-roteiro").addEventListener("click", () => salvarConfig({ perfil: lerPerfil() }, "Roteiro salvo."));
$("#btn-restaurar-roteiro").addEventListener("click", () => {
  if (!confirm("Voltar todas as mensagens do ciclo para o texto padrão?")) return;
  salvarConfig({ perfil: { ...lerPerfil(), roteiro: {} } }, "Roteiro padrão restaurado.").then(renderAjustes);
});
$("#btn-salvar-ia").addEventListener("click", () => {
  const ia_key = $("#a-ia-chave").value.trim();
  salvarConfig({ ia_key }, ia_key ? "IA ligada." : "IA desligada.").then(renderAjustes);
});
$("#btn-testar-ia").addEventListener("click", async () => {
  const ia_key = $("#a-ia-chave").value.trim();
  if (ia_key !== estado.config.ia_key) await salvarConfig({ ia_key }, "Chave salva.");
  $("#a-ia-status").textContent = "Testando…";
  try {
    const r = await api("/api/ia", { tarefa: "pergunta", contexto: {}, texto: "Responda só: IA funcionando." });
    $("#a-ia-status").textContent = `Funcionou: ${r.mensagem}`;
  } catch (err) { $("#a-ia-status").textContent = err.message; }
});
$("#p-hoje").addEventListener("click", (e) => {
  const b = e.target.closest("[data-lead]"); if (!b) return;
  abrirLead(b.dataset.lead, { etapa: b.dataset.etapa });
});
$("#btn-ia-perguntar").addEventListener("click", perguntarIa);
renderReferencia();

// ── Início ─────────────────────────────────────────────────────────────────────
let sessaoAtual;
sb.auth.onAuthStateChange((_evento, sessao) => {
  const id = sessao?.user?.id || null;
  if (id === sessaoAtual) return; // renovação de token: nada muda na tela
  sessaoAtual = id;
  setTimeout(() => iniciar(sessao), 0); // fora do callback: o Supabase trava se esperarmos aqui dentro
});
if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
