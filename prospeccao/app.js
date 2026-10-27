// Prospecção — app de celular. Dados no Supabase (só o dono acessa); buscas pela API oficial do
// Google Places, via /api/buscar; e-mail e redes achados no site de cada empresa via /api/enriquecer.
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
  ["reuniao", "Reunião marcada"], ["fechado", "Fechou negócio"], ["descartado", "Descartado"],
];
const NOME_STATUS = Object.fromEntries(STATUS);
const TEMPLATES_PADRAO = [
  { id: "apresentacao", nome: "Primeiro contato",
    texto: "Olá, tudo bem? Encontrei a {nome} no Google Maps aqui em {cidade} e queria conversar rapidinho " +
      "sobre uma ideia para trazer mais clientes para vocês. Posso te mandar?" },
  { id: "sem_site", nome: "Para quem não tem site",
    texto: "Oi! Vi a {nome} no Google com ótimas avaliações, mas não encontrei um site de vocês. " +
      "Trabalho justamente ajudando {categoria} de {cidade} a aparecer melhor na internet. Posso te mostrar um exemplo?" },
  { id: "followup", nome: "Retomar conversa",
    texto: "Oi, tudo certo? Passando aqui para retomar nossa conversa sobre a {nome}. Conseguiu dar uma olhada?" },
];
const COTA_GRATIS = 1000; // chamadas grátis por mês no nível de preço usado (conferir no console do Google)
const POR_PAGINA = 60;

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

const estado = {
  usuario: null, config: null, leads: [], buscas: [], municipios: null,
  cidade: null, tamanho: "padrao", buscando: false,
  filtro: { status: "", texto: "", wa: false, email: false, semsite: false, nota: false, busca: "", ordem: "recentes" },
  mostrar: POR_PAGINA,
};

// ── Utilidades de interface ────────────────────────────────────────────────────
let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), 3200);
}

function irPara(tela) {
  for (const s of ["buscar", "leads", "ajustes"]) $(`#tela-${s}`).hidden = s !== tela;
  $$("#abas button").forEach((b) => b.setAttribute("aria-current", b.dataset.tela === tela ? "page" : "false"));
  $("#titulo").textContent = { buscar: "Buscar empresas", leads: "Meus leads", ajustes: "Ajustes" }[tela];
  if (tela === "leads") renderLeads();
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
    for (const s of ["buscar", "leads", "ajustes"]) $(`#tela-${s}`).hidden = true;
    $("#titulo").textContent = "Prospecção";
    return;
  }
  irPara("buscar");
  await Promise.all([carregarConfig(), carregarBuscas(), carregarLeads()]);
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
  if (!estado.config.templates?.length) estado.config.templates = TEMPLATES_PADRAO;
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
  fimBusca(trava, `Pronto! ${total} empresas (${novos} novas).`);
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

// Visita os sites para achar e-mail, WhatsApp e redes. Só preenche o que está vazio.
async function enriquecer(ids) {
  const alvo = estado.leads.filter((l) => ids.includes(l.id) && l.site && !l.enriquecido);
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
          if (r.email && !l.email) m.email = r.email;
          for (const k of ["instagram", "facebook", "linkedin"]) if (r[k] && !l[k]) m[k] = r[k];
          if (r.whatsapp && (!l.whatsapp || l.whatsapp_origem === "telefone")) { m.whatsapp = r.whatsapp; m.whatsapp_origem = "site"; }
          return salvarLead(l, m);
        }));
      } catch { /* segue com os próximos */ }
      feitos += lote.length;
      progresso(feitos / alvo.length, `Procurando e-mail e redes nos sites: ${feitos} de ${alvo.length}`,
        "Completando os contatos…");
    }
  };
  await Promise.all([trabalhar(), trabalhar()]);
}

function renderBuscar() {
  $("#aviso-chave").hidden = !!estado.config?.google_key;
  atualizarCusto();
  const el = $("#lista-buscas");
  if (!estado.buscas.length) { el.innerHTML = `<p class="dica" style="margin:0">Nenhuma busca ainda.</p>`; return; }
  el.innerHTML = estado.buscas.slice(0, 30).map((b) => `
    <button class="btn cheio" data-busca="${b.id}" style="justify-content:space-between; margin-bottom:8px; text-align:left; font-weight:400">
      <span><b>${esc(b.nichos.join(", "))}</b><br><small style="color:var(--sub)">${esc(b.bairro ? b.bairro + ", " : "")}${esc(b.cidade)} - ${b.uf} · ${new Date(b.criado_em).toLocaleDateString("pt-BR")}</small></span>
      <span style="flex:none">${b.total} <small style="color:var(--sub)">(${b.novos} novos)</small></span>
    </button>`).join("");
}

// ── Leads ──────────────────────────────────────────────────────────────────────
function filtrados() {
  const f = estado.filtro, termo = norm(f.texto);
  let lista = estado.leads.filter((l) =>
    (!f.status || l.status === f.status) && (!f.wa || l.whatsapp) && (!f.email || l.email) &&
    (!f.semsite || !l.site || /instagram|facebook|linktr|wa\.me/.test(l.site)) && (!f.nota || l.nota >= 4.5) &&
    (!f.busca || (l.buscas || []).includes(f.busca)) &&
    (!termo || norm(`${l.nome} ${l.bairro} ${l.categoria} ${l.cidade} ${l.nicho}`).includes(termo)));
  const ord = {
    recentes: (a, b) => b.criado_em.localeCompare(a.criado_em),
    avaliacoes: (a, b) => b.avaliacoes - a.avaliacoes,
    nota: (a, b) => b.nota - a.nota || b.avaliacoes - a.avaliacoes,
    nome: (a, b) => a.nome.localeCompare(b.nome),
  }[f.ordem];
  return lista.sort(ord);
}

function corStatus(s) { return `var(--s-${s})`; }

function cartaoLead(l) {
  const selos = [];
  if (l.whatsapp) selos.push("WhatsApp");
  if (l.email) selos.push("E-mail");
  if (l.instagram) selos.push("Instagram");
  if (!l.site) selos.push("Sem site");
  if (l.fechado) selos.push("Fechado");
  const nota = l.nota ? `<span class="estrela">★</span> ${String(l.nota).replace(".", ",")} (${l.avaliacoes})` : "Sem avaliações";
  return `<article class="lead" data-id="${l.id}">
    <div class="cab" data-abrir>
      <div>
        <h3>${esc(l.nome)}</h3>
        <div class="meta">${esc(l.categoria || l.nicho)}${l.bairro ? " · " + esc(l.bairro) : ""}</div>
        <div class="meta">${nota}</div>
      </div>
      <span class="status" style="--cor:${corStatus(l.status)}">${NOME_STATUS[l.status]}</span>
    </div>
    ${selos.length ? `<div class="selos">${selos.map((s) => `<span class="selo">${s}</span>`).join("")}</div>` : ""}
    <div class="acoes">
      <button class="btn wa" data-acao="wa" ${l.whatsapp ? "" : "disabled"}>WhatsApp</button>
      <a class="btn" data-acao="ligar" ${l.tel_digitos ? `href="tel:+${esc(l.tel_digitos)}"` : 'aria-disabled="true" style="opacity:.45"'}>Ligar</a>
      <button class="btn" data-abrir>Detalhes</button>
    </div>
  </article>`;
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
  const busca = estado.buscas.find((b) => b.id === f.busca);
  $("#f-busca-aviso").hidden = !busca;
  if (busca) $("#f-busca-aviso").innerHTML = `Mostrando a busca “${esc(busca.nichos.join(", "))}” em ${esc(busca.cidade)}. ` +
    `<a href="#" id="limpar-busca">Ver todos</a>`;

  const lista = filtrados();
  $("#lista-leads").innerHTML = lista.length ? lista.slice(0, estado.mostrar).map(cartaoLead).join("")
    : `<div class="vazio">${todos.length ? "Nenhum lead com esses filtros." : "Seus leads aparecem aqui depois da primeira busca."}</div>`;
  $("#btn-mais").hidden = lista.length <= estado.mostrar;
  $("#btn-mais").textContent = `Mostrar mais (${lista.length - estado.mostrar})`;
}

// ── Mensagens ──────────────────────────────────────────────────────────────────
function preencher(texto, l) {
  const cat = (l.categoria || l.nicho || "empresas").toLowerCase();
  return texto.replaceAll("{nome}", l.nome).replaceAll("{cidade}", l.cidade || "sua cidade")
    .replaceAll("{bairro}", l.bairro || l.cidade || "").replaceAll("{categoria}", cat);
}

function templateSugerido(l) {
  const ts = estado.config.templates;
  if (["contatado", "respondeu", "reuniao"].includes(l.status)) return ts.find((t) => t.id === "followup") || ts[0];
  if (!l.site) return ts.find((t) => t.id === "sem_site") || ts[0];
  return ts.find((t) => t.id === estado.config.padrao) || ts[0];
}

async function enviarWhatsApp(l, texto, nomeTemplate) {
  window.open(`https://wa.me/${l.whatsapp}?text=${encodeURIComponent(texto)}`, "_blank");
  const extra = { ultimo_contato: new Date().toISOString() };
  if (l.status === "novo" && estado.config.auto_contatado) extra.status = "contatado";
  await registrar(l, "whatsapp", `WhatsApp enviado: ${nomeTemplate}`, extra);
  if (!$("#tela-leads").hidden) renderLeads();
}

// ── Ficha do lead ──────────────────────────────────────────────────────────────
function abrirLead(id, focoWhats = false) {
  const l = estado.leads.find((x) => x.id === id);
  if (!l) return;
  const dlg = $("#folha-lead"), t = templateSugerido(l);
  const linha = (rotulo, valor) => valor ? `<div><dt>${rotulo}</dt><dd>${valor}</dd></div>` : "";
  const link = (url, txt) => `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(txt || url)}</a>`;
  const curto = (url) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  dlg.innerHTML = `
    <div class="barra">
      <h2>${esc(l.nome)}<br><small style="font-weight:400; color:var(--sub); font-size:14px">${esc(l.categoria)}${l.nota ? ` · <span class="estrela">★</span> ${String(l.nota).replace(".", ",")} (${l.avaliacoes})` : ""}</small></h2>
      <button class="fechar" data-fechar aria-label="Fechar">×</button>
    </div>
    <div class="corpo">
      <label class="campo" for="l-status" style="margin-top:0">Etapa</label>
      <select id="l-status">${STATUS.map(([s, n]) => `<option value="${s}" ${s === l.status ? "selected" : ""}>${n}</option>`).join("")}</select>

      <div class="cartao" style="margin-top:14px">
        <h2>Mensagem de WhatsApp</h2>
        ${l.whatsapp ? `
          <select id="l-template">${estado.config.templates.map((x) => `<option value="${esc(x.id)}" ${x.id === t.id ? "selected" : ""}>${esc(x.nome)}</option>`).join("")}</select>
          <textarea id="l-msg" style="margin-top:8px">${esc(preencher(t.texto, l))}</textarea>
          <button class="btn wa cheio" id="l-enviar" style="margin-top:8px">Abrir no WhatsApp</button>
          ${l.whatsapp_origem === "telefone" ? `<p class="dica">Número de celular do Google; confirme se é WhatsApp.</p>` : ""}`
        : `<p class="dica" style="margin:0">Sem WhatsApp encontrado${l.tel_tipo === "fixo" ? " (o telefone é fixo)" : ""}.</p>`}
      </div>

      <div class="grade2" style="margin-bottom:14px">
        ${l.tel_digitos ? `<a class="btn" id="l-ligar" href="tel:+${esc(l.tel_digitos)}">Ligar</a>` : ""}
        ${l.email ? `<a class="btn" href="mailto:${esc(l.email.split(",")[0].trim())}">E-mail</a>` : ""}
        ${l.maps ? `<a class="btn" href="${esc(l.maps)}" target="_blank" rel="noopener">Ver no Maps</a>` : ""}
        ${l.instagram ? `<a class="btn" href="${esc(l.instagram)}" target="_blank" rel="noopener">Instagram</a>` : ""}
      </div>

      <div class="cartao">
        <dl class="info" style="margin:0">
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

  $("#l-status", dlg).onchange = async (e) => {
    const s = e.target.value;
    await registrar(l, "status", `Etapa: ${NOME_STATUS[s]}`, { status: s });
    renderLeads();
  };
  const sel = $("#l-template", dlg);
  if (sel) {
    sel.onchange = () => {
      const x = estado.config.templates.find((y) => y.id === sel.value);
      $("#l-msg", dlg).value = preencher(x.texto, l);
    };
    $("#l-enviar", dlg).onclick = () => {
      const x = estado.config.templates.find((y) => y.id === sel.value);
      enviarWhatsApp(l, $("#l-msg", dlg).value, x?.nome || "mensagem").then(() => abrirLead(l.id));
    };
  }
  const ligar = $("#l-ligar", dlg);
  if (ligar) ligar.onclick = () => registrar(l, "ligacao", "Ligação feita", { ultimo_contato: new Date().toISOString() });
  $("#l-add-nota", dlg).onclick = async () => {
    const txt = $("#l-nota", dlg).value.trim();
    if (!txt) return;
    await registrar(l, "nota", txt);
    abrirLead(l.id);
  };
  $("#l-excluir", dlg).onclick = async () => {
    if (!confirm(`Excluir “${l.nome}”?`)) return;
    await sb.from("leads").delete().eq("id", l.id);
    estado.leads = estado.leads.filter((x) => x.id !== l.id);
    dlg.close(); renderLeads();
  };
  if (!dlg.open) dlg.showModal();
  if (focoWhats) $("#l-msg", dlg)?.focus();
}

// ── Exportar planilha (CSV que abre no Excel e no Google Planilhas) ─────────────
function exportar() {
  const lista = filtrados();
  if (!lista.length) { toast("Nada para exportar."); return; }
  const cols = [["nome", "Nome"], ["categoria", "Categoria"], ["telefone", "Telefone"], ["whatsapp", "WhatsApp"],
    ["email", "E-mail"], ["site", "Site"], ["instagram", "Instagram"], ["facebook", "Facebook"], ["endereco", "Endereço"],
    ["bairro", "Bairro"], ["cidade", "Cidade"], ["uf", "UF"], ["nota", "Nota"], ["avaliacoes", "Avaliações"],
    ["status", "Etapa"], ["maps", "Google Maps"]];
  const cel = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const linhas = [cols.map((c) => cel(c[1])).join(";"),
    ...lista.map((l) => cols.map(([k]) => cel(k === "status" ? NOME_STATUS[l.status] : k === "nota" ? String(l.nota).replace(".", ",") : l[k])).join(";"))];
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
    const t = templateSugerido(l);
    enviarWhatsApp(l, preencher(t.texto, l), t.nome);
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

// ── Início ─────────────────────────────────────────────────────────────────────
let sessaoAtual;
sb.auth.onAuthStateChange((_evento, sessao) => {
  const id = sessao?.user?.id || null;
  if (id === sessaoAtual) return; // renovação de token: nada muda na tela
  sessaoAtual = id;
  setTimeout(() => iniciar(sessao), 0); // fora do callback: o Supabase trava se esperarmos aqui dentro
});
if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
