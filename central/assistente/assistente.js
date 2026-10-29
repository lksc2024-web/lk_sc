/* Assistente — consulta pessoal por voz ou texto, usando os mesmos dados da Central */
(function () {
"use strict";
var SUPABASE_URL = "https://bxjyxfoisqjkijxoeysu.supabase.co";
var SUPABASE_KEY = "sb_publishable_em9lB9ZwTDvfHV3kds9jpg_D0oxdWJA";
var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
var NUC = window.Nucleo, norm = NUC.norm;
var COLS_LEAD = "id,nome,categoria,nicho,telefone,tel_digitos,tel_tipo,whatsapp,email,site,instagram,endereco,bairro,cidade,uf,nota,avaliacoes,maps,status,obs,historico,ultimo_contato,criado_em,atualizado_em,dados";
var D = 864e5;
var S = { user: null, leads: [], clientes: [], agenda: [], metricas: [], projetos: [], modelos: [], notas: [], carregado: 0 };
var STATUS_TXT = { novo: "Novo", contatado: "Contatado", respondeu: "Respondeu", reuniao: "Reunião", fechado: "Fechado", descartado: "Descartado", retomar: "Retomar" };
var TIPO_AG = { reuniao: ["Reunião", "info"], retomada: ["Retomada", "warn"], tarefa: ["Tarefa", "ok"] };
var HIST_KEY = "assistente-conversa", VOZ_KEY = "assistente-voz";

/* ───── utilidades ───── */
function $(s, r) { return (r || document).querySelector(s); }
function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function n(v) { var x = Number(v); return isFinite(x) ? x : 0; }
function brl(v) { return n(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }); }
function hora(d) { d = new Date(d); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }
function ini(d) { d = new Date(d); d.setHours(0, 0, 0, 0); return d; }
function diaLongo(d) {
  d = new Date(d); var h = ini(new Date()), x = ini(d), dd = Math.round((x - h) / D);
  if (dd === 0) return "Hoje"; if (dd === 1) return "Amanhã"; if (dd === -1) return "Ontem";
  var s = d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function primeiroNome(s) { return String(s || "").trim().split(/\s+/)[0] || ""; }
function telWa(t) { var d = String(t || "").replace(/\D/g, ""); if (!d) return ""; if (d.length === 10 || d.length === 11) d = "55" + d; return d.length >= 12 ? d : ""; }
function waDe(tipo, o) { return tipo === "lead" ? (o.whatsapp || "") : telWa(o.telefone); }
function plural(q, s, p) { return q + " " + (q === 1 ? s : p); }
function dataLocal(d) { d = new Date(d); var z = d.getTimezoneOffset() * 6e4; return new Date(d - z).toISOString().slice(0, 16); }
function hojeISO() { return dataLocal(new Date()).slice(0, 10); }
function copiar(t) { if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { statusVoz("Copiado."); }); }
var ICON = {
  wa: '<svg viewBox="0 0 24 24"><path d="M4 20l1.3-4A8 8 0 1112 20a8 8 0 01-4-1.1L4 20z"/></svg>',
  ir: '<svg viewBox="0 0 24 24"><path d="M7 17L17 7M9 7h8v8"/></svg>',
  ok: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  cp: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3"/></svg>'
};

/* ───── dados ───── */
function base() { return { leads: S.leads, clientes: S.clientes, projetos: S.projetos.filter(function (p) { return p.tipo !== "site"; }) }; }
function basePessoas() { return { leads: S.leads, clientes: S.clientes, projetos: [] }; }
async function carregar() {
  var d90 = new Date(Date.now() - 90 * D).toISOString().slice(0, 10), d7 = new Date(Date.now() - 7 * D).toISOString();
  var r = await Promise.all([
    sb.from("leads").select(COLS_LEAD),
    sb.from("clientes").select("*").order("criado_em", { ascending: false }),
    sb.from("agenda").select("*").or("status.eq.pendente,quando.gte." + d7).order("quando"),
    sb.from("metricas").select("*").gte("data", d90),
    sb.from("projetos").select("*").order("criado_em"),
    sb.from("modelos").select("*").order("criado_em"),
    sb.from("notas").select("*").order("criado_em", { ascending: false }).limit(200)
  ]);
  var k = ["leads", "clientes", "agenda", "metricas", "projetos", "modelos", "notas"];
  r.forEach(function (x, i) { if (!x.error) S[k[i]] = x.data || []; });
  S.carregado = Date.now();
}
function alvoAg(a) {
  if (a.lead_id) { var l = S.leads.find(function (x) { return x.id === a.lead_id; }); if (l) return { tipo: "lead", obj: l, nome: l.nome }; }
  if (a.cliente_id) { var c = S.clientes.find(function (x) { return x.id === a.cliente_id; }); if (c) return { tipo: "cliente", obj: c, nome: c.nome || c.empresa }; }
  if (a.projeto_id) { var p = S.projetos.find(function (x) { return x.id === a.projeto_id; }); if (p) return { tipo: "projeto", obj: p, nome: p.nome }; }
  return null;
}
function pend() { return S.agenda.filter(function (a) { return a.status === "pendente"; }).sort(function (a, b) { return new Date(a.quando) - new Date(b.quando); }); }
function vitrine() { return S.projetos.filter(function (p) { return p.dados && p.dados.vitrine && p.url; }); }
function rankProjetos(alvo) {
  var txt = ((alvo && (alvo.nicho || alvo.categoria)) || "") + " " + ((alvo && alvo.nome) || "");
  var g = NUC.grupoNicho(txt), tk = NUC.tokensNome(txt);
  return vitrine().map(function (p) {
    var desc = (p.dados && p.dados.descricao_vitrine) || "", gp = NUC.grupoNicho(p.nicho + " " + p.nome + " " + desc);
    var sc = g && gp === g ? 3 : 0, tp = NUC.tokensNome(p.nicho + " " + p.nome + " " + desc);
    tk.forEach(function (t) { if (tp.indexOf(t) >= 0) sc += 1; });
    if (p.dados.destaque) sc += 0.5;
    return { p: p, sc: sc, mesmo: !!(g && gp === g) };
  }).sort(function (a, b) { return b.sc - a.sc; });
}
function sugestoes() {
  var out = [], agora = Date.now(), com = {};
  pend().forEach(function (a) { if (a.lead_id) com[a.lead_id] = 1; if (a.cliente_id) com[a.cliente_id] = 1; });
  S.leads.forEach(function (l) {
    if (com[l.id]) return;
    var dias = l.ultimo_contato ? Math.floor((agora - new Date(l.ultimo_contato)) / D) : null;
    if (l.status === "respondeu" && (dias == null || dias >= 1)) out.push({ tipo: "lead", obj: l, nome: l.nome, motivo: "Respondeu e espera retorno", peso: 4 });
    else if (l.status === "reuniao") out.push({ tipo: "lead", obj: l, nome: l.nome, motivo: "Em reunião, sem data marcada", peso: 3 });
    else if (l.status === "contatado" && dias != null && dias >= 3) out.push({ tipo: "lead", obj: l, nome: l.nome, motivo: "Sem resposta há " + dias + " dias", peso: 2 });
  });
  S.clientes.forEach(function (c) {
    if (com[c.id]) return;
    var dias = Math.floor((agora - new Date(c.ultimo_contato || c.criado_em)) / D);
    if (c.status === "retomar") out.push({ tipo: "cliente", obj: c, nome: c.nome || c.empresa, motivo: "Marcado para retomar", peso: 3 });
    else if ((c.status === "ativo" || c.status === "recorrente") && dias >= 30) out.push({ tipo: "cliente", obj: c, nome: c.nome || c.empresa, motivo: "Sem contato há " + dias + " dias", peso: 1 });
  });
  return out.sort(function (a, b) { return b.peso - a.peso; });
}
function preencher(txt, o, tipo, extra) {
  var nome = tipo === "lead" ? o.nome : primeiroNome(o.nome) || o.empresa;
  var s = String(txt || "").replace(/\{nome\}/g, nome || "").replace(/\{empresa\}/g, o.empresa || o.nome || "").replace(/\{cidade\}/g, o.cidade || "").replace(/\{bairro\}/g, o.bairro || o.cidade || "").replace(/\{categoria\}/g, o.categoria || o.nicho || "").replace(/\{nicho\}/g, o.nicho || o.categoria || "").replace(/\{produto\}/g, "produto");
  if (extra) Object.keys(extra).forEach(function (k) { s = s.split("{" + k + "}").join(extra[k]); });
  return s;
}

/* ───── conversa ───── */
var conversa = [];
function salvarConversa() { try { localStorage.setItem(HIST_KEY, JSON.stringify(conversa.slice(-30))); } catch (e) {} }
function rolar() { var c = $("#conversa"); c.scrollTop = c.scrollHeight; }
function bolhaEu(t) {
  var el = document.createElement("div"); el.className = "msg eu"; el.textContent = t; $("#conversa").appendChild(el); rolar();
}
function bolhaEle(html, fala, guardar) {
  var el = document.createElement("div"); el.className = "msg ele"; el.innerHTML = '<div class="bolha">' + html + "</div>";
  $("#conversa").appendChild(el); rolar();
  if (guardar !== false) { conversa.push({ q: "ele", h: html }); salvarConversa(); }
  if (fala) falar(fala);
  return el;
}
function restaurar() {
  try { conversa = JSON.parse(localStorage.getItem(HIST_KEY) || "[]"); } catch (e) { conversa = []; }
  conversa.forEach(function (m) {
    if (m.q === "eu") bolhaEu(m.t);
    else { var el = bolhaEle(m.h, "", false); $$("button,a.btn", el).forEach(function (b) { if (b.tagName === "BUTTON") b.disabled = true; }); }
  });
}

/* ───── voz ───── */
var lerVoz = false;
try { lerVoz = localStorage.getItem(VOZ_KEY) === "1"; } catch (e) {}
function falar(t) {
  if (!lerVoz || !("speechSynthesis" in window) || !t) return;
  speechSynthesis.cancel();
  var u = new SpeechSynthesisUtterance(t); u.lang = "pt-BR"; u.rate = 1.05;
  var v = speechSynthesis.getVoices().find(function (x) { return /pt(-|_)BR/i.test(x.lang); }); if (v) u.voice = v;
  speechSynthesis.speak(u);
}
function statusVoz(t) { $("#status-voz").textContent = t || ""; }
var rec = null, ouvindo = false;
function microfone() {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { statusVoz("Este navegador não reconhece voz. No celular, use o microfone do teclado."); $("#entrada").focus(); return; }
  if (ouvindo && rec) { rec.stop(); return; }
  rec = new SR(); rec.lang = "pt-BR"; rec.interimResults = true; rec.continuous = false;
  var final = "", ent = $("#entrada"), antes = ent.value ? ent.value + " " : "";
  rec.onstart = function () { ouvindo = true; $("#b-mic").classList.add("ouvindo"); statusVoz("Ouvindo… toque de novo para parar."); };
  rec.onresult = function (e) {
    var parc = ""; for (var i = e.resultIndex; i < e.results.length; i++) { if (e.results[i].isFinal) final += e.results[i][0].transcript; else parc += e.results[i][0].transcript; }
    ent.value = antes + final + parc; ajustar();
  };
  rec.onerror = function (e) { statusVoz(e.error === "not-allowed" ? "Permita o microfone nas configurações do navegador." : "Não entendi. Tente de novo."); };
  rec.onend = function () { ouvindo = false; $("#b-mic").classList.remove("ouvindo"); if (final.trim()) { statusVoz(""); enviar(); } else if ($("#status-voz").textContent.indexOf("Ouvindo") === 0) statusVoz(""); };
  rec.start();
}

/* ───── entender o pedido ───── */
var RX_PERGUNTA = /^(o que|oque|quem|quantos|quantas|quanto|qual|quais|como|cade|tenho|tem|ha|me (mostra|diz|fala)|mostra|lista|ver)\b/;
var RX_ACAO = /\b(marquei|agendei|agendad\w*|fechou|fechamos|fechei|respondeu|responderam|descart\w*|desistiu|recusou|vendi|vendemos|novo lead|novo cliente|cliente novo|lead novo|me lembra|lembrar de|retomar com|cobrar o|cobrar a|ligar pr\w*|falei com|conversei com)\b/;

async function responder(texto) {
  if (Date.now() - S.carregado > 120000) await carregar();
  var t = norm(texto), pergunta = RX_PERGUNTA.test(t) || /\?\s*$/.test(texto);

  if (/^(ajuda|help|o que (voce|vc) faz|comandos|como (te )?uso)/.test(t)) return ajuda();

  var mResp = texto.match(/^\s*(?:o\s+)?(?:cliente|lead|ele|ela|[^:]{2,40}?)\s+(?:disse|falou|respondeu|mandou|escreveu)\s*:\s*([\s\S]+)$/i);
  if (mResp) return respostaCliente(texto.slice(0, texto.indexOf(":")), mResp[1]);

  if (/^(anota|anote|anotar|nota|ideia)\b[:\s]/.test(t + " ") || (/^lembrete\b/.test(t) && !NUC.extrairData(texto))) return anotar(texto.replace(/^\s*(anota(r)?|anote|nota|lembrete|ideia)\s*(que|isso|ai|aí)?\s*:?\s*/i, ""));
  if (/\b(minhas (anotacoes|notas|ideias)|o que (eu )?anotei|ver (as )?(anotacoes|notas))\b/.test(t)) return listarNotas();

  if (/\b(prepar\w*|briefing|me (fala|conta) (sobre|do|da|de)|quem e (o|a)?|resumo (do|da|de)|ficha (do|da|de)|situacao (do|da|de)|como (esta|ta) (o|a))\b/.test(t)) {
    var c = NUC.candidatos(texto, basePessoas());
    if (c.length) return briefing(c[0], c.slice(1, 4));
    if (/reuniao/.test(t)) { var prox = pend().find(function (a) { return a.tipo === "reuniao" && new Date(a.quando) > Date.now() - 36e5 && alvoAg(a); }); if (prox) { var al = alvoAg(prox); return briefing({ tipo: al.tipo, obj: al.obj, nome: al.nome }, [], prox); } return bolhaEle("<p>Não encontrei reunião marcada com contato. Diga o nome: <b>preparar reunião com a Padaria Vera Cruz</b>.</p>", "Não encontrei reunião marcada. Diga o nome do contato."); }
  }

  if (/\b(enviar|envia|mandar|manda|mande|mostrar)\b.*\b(projeto|portfolio|exemplo|trabalho|site pronto)\b/.test(t)) return enviarProjeto(texto);

  if (!RX_ACAO.test(t) || pergunta) {
    if (/\b(vend\w*|fatur\w*|receita|ganhei|entrou)\b/.test(t)) return vendas(texto);
    if (/\b(resumo da semana|como foi (a|minha) semana)\b/.test(t)) return resumoSemana();
    if (/\b(retomar|retomada|cobrar|follow|quem (eu )?(devo|preciso|tenho que) (chamar|ligar|cobrar|responder)|pendente|parado|esperando)\b/.test(t)) return retomar();
    if (/\b(quantos leads|leads?|prospec\w*|funil)\b/.test(t) && !/\b(agenda|reuni\w*)\b/.test(t)) return statsLeads(texto);
    if (/\b(agenda|compromisso\w*|reuni\w*|o que tenho|tenho (hoje|amanha|algo)|meu dia|proxim\w* (reuniao|compromisso)|hoje|amanha|semana)\b/.test(t)) return agenda(texto);
    if (/\b(clientes?)\b/.test(t) && pergunta) return statsClientes();
  }

  var plano = NUC.interpretar(texto, base());
  if (plano.alvo || plano.novoNome || plano.agenda) return confirmar(plano);
  if (pergunta) {
    var c2 = NUC.candidatos(texto, basePessoas());
    if (c2.length && c2[0].sc >= 0.65) return briefing(c2[0], c2.slice(1, 4));
  }
  return naoEntendi();
}

/* ───── respostas ───── */
function ajuda() {
  bolhaEle('<h3>O que posso fazer</h3><div class="lista">' +
    [["Agenda", "O que tenho hoje? · Próxima reunião · Agenda da semana"], ["Reuniões", "Preparar reunião com a Padaria Vera Cruz"], ["Retomadas", "Quem preciso retomar?"], ["Números", "Quanto vendi este mês? · Como estão os leads?"], ["Projetos", "Enviar projeto para a Pet Shop Amigo"], ["Organizar", "Marquei reunião com o Studio Bela quinta às 15h"], ["Respostas", "Cliente disse: vou pensar e te falo"], ["Anotações", "Anota: ligar para o contador · Minhas anotações"]]
      .map(function (x) { return '<div class="it"><span class="tag">' + x[0] + "</span><span>" + esc(x[1]) + "</span><span></span></div>"; }).join("") +
    '</div><p class="sub">Pode falar do jeito que vier. Antes de salvar qualquer coisa eu mostro o que entendi.</p>', "Posso consultar sua agenda, preparar reuniões, mostrar quem retomar, números, enviar projetos e organizar o que você me contar.");
}
function naoEntendi() {
  bolhaEle("<p>Não peguei o que fazer com isso. Tente uma destas:</p>" + chipsHtml(["O que tenho hoje?", "Quem preciso retomar?", "Preparar próxima reunião", "Anota: …"]), "Não entendi. Tente perguntar da agenda, de retomadas ou de uma reunião.");
}
function chipsHtml(arr) { return '<div class="acoes">' + arr.map(function (c) { return '<button class="btn" type="button" data-chip="' + esc(c) + '">' + esc(c) + "</button>"; }).join("") + "</div>"; }
function linhaAg(a) {
  var al = alvoAg(a), tp = TIPO_AG[a.tipo] || ["Compromisso", ""], atras = new Date(a.quando) < Date.now() && a.status === "pendente";
  return '<div class="it"><span class="h num">' + hora(a.quando) + '</span><span><b>' + esc(al ? al.nome : a.titulo || "Sem título") + "</b><small>" + esc((atras ? "Atrasado · " + diaLongo(a.quando) + " · " : "") + (a.titulo && al ? a.titulo : a.obs ? a.obs.slice(0, 90) : "")) + '</small></span><span class="tag t-' + (atras ? "bad" : tp[1]) + '">' + tp[0] + "</span></div>";
}
function agenda(texto) {
  var t = norm(texto), lista = pend(), agora = new Date(), h0 = ini(agora), titulo, sel;
  var dataPedida = NUC.extrairData(texto);
  if (/\bproxim\w* (reuniao|compromisso)\b/.test(t)) {
    var p = lista.find(function (a) { return new Date(a.quando) >= agora && (!/reuniao/.test(t) || a.tipo === "reuniao"); });
    if (!p) return bolhaEle("<p>Nada marcado daqui para frente.</p>" + chipsHtml(["Quem preciso retomar?"]), "Nada marcado daqui para frente.");
    var al = alvoAg(p);
    return bolhaEle("<h3>" + esc(diaLongo(p.quando)) + " às " + hora(p.quando) + '</h3><div class="lista">' + linhaAg(p) + "</div>" + (al && al.tipo !== "projeto" ? chipsHtml(["Preparar reunião com " + al.nome]) : ""), "Sua próxima é " + diaLongo(p.quando).toLowerCase() + " às " + hora(p.quando) + (al ? ", com " + al.nome : "") + ".");
  }
  if (/\bsemana\b/.test(t)) { titulo = "Próximos 7 dias"; sel = lista.filter(function (a) { return new Date(a.quando) < h0.getTime() + 7 * D; }); }
  else if (dataPedida && !/\bhoje\b/.test(t)) { var d0 = ini(dataPedida.data); titulo = diaLongo(d0); sel = lista.filter(function (a) { return ini(a.quando).getTime() === d0.getTime(); }); }
  else { titulo = "Hoje"; sel = lista.filter(function (a) { return new Date(a.quando) < h0.getTime() + D; }); }
  if (!sel.length) {
    var prox = lista.find(function (a) { return new Date(a.quando) >= agora; });
    return bolhaEle("<h3>" + esc(titulo) + "</h3><p>Nada marcado." + (prox ? " O próximo é " + esc(diaLongo(prox.quando).toLowerCase()) + " às " + hora(prox.quando) + "." : "") + "</p>" + chipsHtml(["Quem preciso retomar?"]), titulo + ", nada marcado.");
  }
  var grupos = {}; sel.forEach(function (a) { var k = new Date(a.quando) < h0 ? "Atrasados" : diaLongo(a.quando); (grupos[k] = grupos[k] || []).push(a); });
  var html = "<h3>" + esc(titulo) + " · " + plural(sel.length, "compromisso", "compromissos") + "</h3>";
  Object.keys(grupos).forEach(function (k) { html += (Object.keys(grupos).length > 1 ? '<div class="sec">' + esc(k) + "</div>" : "") + '<div class="lista">' + grupos[k].map(linhaAg).join("") + "</div>"; });
  var reun = sel.find(function (a) { return a.tipo === "reuniao" && alvoAg(a) && new Date(a.quando) >= h0; });
  html += '<div class="acoes">' + (reun ? '<button class="btn" type="button" data-chip="Preparar reunião com ' + esc(alvoAg(reun).nome) + '">Preparar a reunião</button>' : "") + '<a class="btn" href="/#agenda">' + ICON.ir + "Abrir agenda</a></div>";
  var atras = sel.filter(function (a) { return new Date(a.quando) < agora; }).length;
  bolhaEle(html, titulo + ", " + plural(sel.length, "compromisso", "compromissos") + (atras ? ", " + atras + " já passou do horário" : "") + ". " + sel.slice(0, 3).map(function (a) { var al = alvoAg(a); return hora(a.quando) + " " + (al ? al.nome : a.titulo || ""); }).join(". "));
}
function retomar() {
  var s = sugestoes(), atras = pend().filter(function (a) { return a.tipo === "retomada" && new Date(a.quando) < Date.now() + D; });
  if (!s.length && !atras.length) return bolhaEle("<p>Ninguém esperando por você agora. Bom momento para prospectar.</p>" + chipsHtml(["Como estão os leads?"]), "Ninguém esperando retorno agora.");
  var html = "";
  if (atras.length) html += '<div class="sec">Retomadas marcadas</div><div class="lista">' + atras.slice(0, 6).map(linhaAg).join("") + "</div>";
  if (s.length) html += '<div class="sec">Sugestões</div><div class="lista">' + s.slice(0, 8).map(function (x) {
    return '<div class="it"><span class="tag t-' + (x.peso >= 4 ? "ok" : x.peso >= 3 ? "warn" : "info") + '">' + (x.tipo === "lead" ? "Lead" : "Cliente") + "</span><span><b>" + esc(x.nome) + "</b><small>" + esc(x.motivo) + '</small></span><button class="btn" type="button" data-chip="Preparar reunião com ' + esc(x.nome) + '">Ver</button></div>';
  }).join("") + "</div>";
  html += '<div class="acoes"><a class="btn" href="/#agenda">' + ICON.ir + "Abrir na Central</a></div>";
  var tot = atras.length + s.length;
  bolhaEle(html, plural(tot, "contato", "contatos") + " para retomar. " + (s[0] ? "Comece por " + s[0].nome + ": " + s[0].motivo.toLowerCase() + "." : ""));
}
function briefing(c, outros, reuniao) {
  var o = c.obj, tipo = c.tipo, ehLead = tipo === "lead", nome = c.nome || o.nome || o.empresa;
  var ag = reuniao || pend().find(function (a) { return (ehLead ? a.lead_id : a.cliente_id) === o.id; });
  var hist = (o.historico || []).slice(-4).reverse();
  var valor = ehLead ? o.dados && o.dados.valor_proposta : o.valor_total;
  var semSite = ehLead && !o.site, nicho = o.nicho || o.categoria || "";
  var proj = rankProjetos(o)[0];
  var html = "<h3>" + esc(nome) + "</h3>";
  html += '<div class="kv"><div><span>Situação</span><b style="font-size:15px">' + esc(STATUS_TXT[o.status] || o.status || "—") + "</b></div>" +
    (nicho ? '<div><span>Nicho</span><b style="font-size:15px">' + esc(nicho) + "</b></div>" : "") +
    (ehLead && o.nota ? '<div><span>Google</span><b style="font-size:15px">' + esc(String(o.nota).replace(".", ",")) + " ★ <small class=\"sub\">(" + n(o.avaliacoes) + ")</small></b></div>" : "") +
    (valor ? '<div><span>' + (ehLead ? "Proposta" : "Já pagou") + "</span><b>" + brl(valor) + "</b></div>" : "") + "</div>";
  var info = [];
  if (ehLead) info.push(o.site ? "Tem site: " + o.site.replace(/^https?:\/\//, "").slice(0, 40) : "Sem site");
  if (o.instagram) info.push("Instagram " + o.instagram);
  if (o.cidade || o.bairro) info.push([o.bairro, o.cidade].filter(Boolean).join(", "));
  var tel = ehLead ? (o.whatsapp ? "WhatsApp " + o.whatsapp.replace(/^55/, "") : o.telefone ? "Fixo " + o.telefone : "") : o.telefone;
  if (tel) info.push(tel);
  if (info.length) html += '<p class="sub">' + esc(info.join(" · ")) + "</p>";
  if (ag) html += '<div class="sec">Próximo compromisso</div><div class="lista">' + linhaAg(ag) + "</div>";
  if (hist.length) html += '<div class="sec">Últimos registros</div><div class="lista">' + hist.map(function (h) { return '<div class="it"><span class="h num">' + new Date(h.t).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + "</span><span>" + esc(String(h.txt || "").slice(0, 140)) + "</span><span></span></div>"; }).join("") + "</div>";
  else if (o.obs) html += '<div class="sec">Anotações</div><p class="prev">' + esc(String(o.obs).slice(-300)) + "</p>";
  var notas = S.notas.filter(function (x) { return (ehLead ? x.lead_id : x.cliente_id) === o.id && !x.feita; });
  if (notas.length) html += '<div class="sec">Suas notas</div><div class="lista">' + notas.slice(0, 3).map(function (x) { return '<div class="it"><span class="tag">Nota</span><span>' + esc(x.texto) + "</span><span></span></div>"; }).join("") + "</div>";
  var passos = [];
  if (ehLead) {
    passos.push("Pergunte como os clientes chegam até eles hoje (Instagram, Google, indicação).");
    passos.push(semSite ? "Mostre o que perdem sem site: quem procura " + (nicho ? nicho.toLowerCase() : "o serviço") + " no Google cai no concorrente." : "Pergunte o que o site atual traz de contato por mês e o que falta nele.");
    if (proj) passos.push("Mostre um trabalho" + (proj.mesmo ? " do mesmo nicho" : "") + ": " + proj.p.nome + ".");
    passos.push(valor ? "Retome a proposta de " + brl(valor) + " e pergunte o que falta para decidir." : "Ofertas: pré-orçamento a partir de R$ 697 · catálogo R$ 897 · landing R$ 1.497 · site completo perto de R$ 3.000.");
    passos.push("Saia com o próximo passo marcado: dia e hora, não “depois a gente vê”.");
  } else {
    passos.push("Pergunte como está o resultado do que já foi entregue.");
    passos.push("Procure a próxima necessidade: manutenção, novas páginas, campanha.");
    passos.push("Peça uma indicação ou depoimento se o cliente estiver satisfeito.");
  }
  html += '<div class="sec">Roteiro sugerido</div><ol class="passos">' + passos.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ol>";
  var wa = waDe(tipo, o);
  html += '<div class="acoes">' + (wa ? '<a class="btn wa" target="_blank" rel="noopener" href="https://wa.me/' + wa + '">' + ICON.wa + "WhatsApp</a>" : "") +
    (proj ? '<button class="btn" type="button" data-chip="Enviar projeto para ' + esc(nome) + '">Enviar projeto</button>' : "") +
    '<a class="btn" href="/#' + (ehLead ? "prospeccao" : "clientes") + '">' + ICON.ir + "Abrir na Central</a></div>";
  if (outros && outros.length) html += '<p class="sub">Não era esse? ' + outros.map(function (x) { return '<button class="btn" type="button" data-chip="Preparar reunião com ' + esc(x.nome) + '">' + esc(x.nome) + "</button>"; }).join(" ") + "</p>";
  var fala = nome + ". " + (STATUS_TXT[o.status] || "") + ". " + (ag ? (TIPO_AG[ag.tipo] || ["Compromisso"])[0] + " " + diaLongo(ag.quando).toLowerCase() + " às " + hora(ag.quando) + ". " : "") + (ehLead ? (semSite ? "Não tem site. " : "Já tem site. ") : "") + (proj ? "Mostre o projeto " + proj.p.nome + "." : "");
  bolhaEle(html, fala);
}
function somaMet(desde) { var r = 0, v = 0; S.metricas.forEach(function (m) { if (m.data >= desde) { r += n(m.receita); v += n(m.vendas); } }); return { r: r, v: v }; }
function vendas(texto) {
  var t = norm(texto), hoje = hojeISO(), d = new Date();
  var seg = new Date(d); seg.setDate(d.getDate() - ((d.getDay() + 6) % 7)); var semana = dataLocal(seg).slice(0, 10);
  var mes = hoje.slice(0, 8) + "01";
  var H = somaMet(hoje), W = somaMet(semana), M = somaMet(mes);
  var foco = /\bhoje\b/.test(t) ? ["hoje", H] : /\bsemana\b/.test(t) ? ["nesta semana", W] : ["neste mês", M];
  var porProj = {}; S.metricas.forEach(function (m) { if (m.data >= mes && n(m.receita)) porProj[m.projeto_id] = (porProj[m.projeto_id] || 0) + n(m.receita); });
  var top = Object.keys(porProj).sort(function (a, b) { return porProj[b] - porProj[a]; }).slice(0, 3).map(function (id) { var p = S.projetos.find(function (x) { return x.id === id; }); return { nome: p ? p.nome : "Projeto", v: porProj[id] }; });
  var html = '<div class="kv"><div><span>Hoje</span><b>' + brl(H.r) + '</b></div><div><span>Semana</span><b>' + brl(W.r) + '</b></div><div><span>Mês</span><b>' + brl(M.r) + "</b></div></div>";
  html += '<p class="sub">' + plural(M.v, "venda", "vendas") + " no mês.</p>";
  if (top.length) html += '<div class="sec">O que mais vendeu no mês</div><div class="lista">' + top.map(function (x) { return '<div class="it"><span class="tag">Projeto</span><span>' + esc(x.nome) + '</span><span class="num">' + brl(x.v) + "</span></div>"; }).join("") + "</div>";
  html += '<div class="acoes"><a class="btn" href="/#projetos">' + ICON.ir + "Ver projetos</a></div>";
  bolhaEle(html, "Você faturou " + brl(foco[1].r) + " " + foco[0] + ", " + plural(foco[1].v, "venda", "vendas") + ".");
}
function statsLeads(texto) {
  var g = NUC.grupoNicho(texto), L = S.leads.filter(function (l) { return !g || NUC.grupoNicho((l.nicho || "") + " " + (l.categoria || "")) === g; });
  var cont = {}; L.forEach(function (l) { cont[l.status] = (cont[l.status] || 0) + 1; });
  var nichos = {}; L.forEach(function (l) { var k = l.nicho || l.categoria || "Outros"; nichos[k] = (nichos[k] || 0) + 1; });
  var semana = Date.now() - 7 * D, contSemana = L.filter(function (l) { return l.ultimo_contato && new Date(l.ultimo_contato) > semana; }).length;
  var html = "<h3>" + plural(L.length, "lead", "leads") + (g ? " · " + esc(g) : "") + '</h3><div class="kv">' +
    ["novo", "contatado", "respondeu", "reuniao", "fechado", "descartado"].map(function (s) { return "<div><span>" + STATUS_TXT[s] + "</span><b>" + (cont[s] || 0) + "</b></div>"; }).join("") + "</div>";
  html += '<p class="sub">' + plural(contSemana, "contato", "contatos") + " nos últimos 7 dias · " + L.filter(function (l) { return l.whatsapp; }).length + " com WhatsApp.</p>";
  if (!g) html += '<div class="sec">Por nicho</div><div class="lista">' + Object.keys(nichos).sort(function (a, b) { return nichos[b] - nichos[a]; }).slice(0, 6).map(function (k) { return '<div class="it"><span class="tag">Nicho</span><span>' + esc(k) + '</span><span class="num">' + nichos[k] + "</span></div>"; }).join("") + "</div>";
  html += '<div class="acoes"><a class="btn" href="/#prospeccao">' + ICON.ir + "Abrir prospecção</a></div>";
  bolhaEle(html, plural(L.length, "lead", "leads") + ". " + (cont.novo || 0) + " ainda não contatados, " + (cont.respondeu || 0) + " responderam e " + (cont.reuniao || 0) + " em reunião.");
}
function statsClientes() {
  var c = {}; S.clientes.forEach(function (x) { c[x.status] = (c[x.status] || 0) + 1; });
  var tot = S.clientes.reduce(function (s, x) { return s + n(x.valor_total); }, 0);
  bolhaEle("<h3>" + plural(S.clientes.length, "cliente", "clientes") + '</h3><div class="kv"><div><span>Ativos</span><b>' + (c.ativo || 0) + '</b></div><div><span>Recorrentes</span><b>' + (c.recorrente || 0) + '</b></div><div><span>Retomar</span><b>' + (c.retomar || 0) + '</b></div><div><span>Total pago</span><b>' + brl(tot) + '</b></div></div><div class="acoes"><a class="btn" href="/#clientes">' + ICON.ir + "Abrir clientes</a></div>", plural(S.clientes.length, "cliente", "clientes") + ", " + (c.retomar || 0) + " para retomar.");
}
function resumoSemana() {
  var semana = Date.now() - 7 * D, d = new Date(), seg = new Date(d); seg.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  var W = somaMet(dataLocal(seg).slice(0, 10));
  var contatos = S.leads.filter(function (l) { return l.ultimo_contato && new Date(l.ultimo_contato) > semana; }).length;
  var resp = S.leads.filter(function (l) { return (l.historico || []).some(function (h) { return h.tipo === "resposta" && new Date(h.t) > semana; }); }).length;
  var feitos = S.agenda.filter(function (a) { return a.status === "feito" && a.concluido_em && new Date(a.concluido_em) > semana; }).length;
  var prox = pend().filter(function (a) { return new Date(a.quando) >= Date.now() && new Date(a.quando) < Date.now() + 7 * D; }).length;
  bolhaEle('<h3>Sua semana</h3><div class="kv"><div><span>Faturado</span><b>' + brl(W.r) + '</b></div><div><span>Leads contatados</span><b>' + contatos + '</b></div><div><span>Respostas</span><b>' + resp + '</b></div><div><span>Compromissos feitos</span><b>' + feitos + '</b></div></div><p class="sub">' + plural(prox, "compromisso marcado", "compromissos marcados") + " para os próximos 7 dias.</p>" + chipsHtml(["Agenda da semana", "Quem preciso retomar?"]), "Nesta semana: " + brl(W.r) + " faturados, " + contatos + " leads contatados e " + resp + " respostas.");
}
async function anotar(txt) {
  txt = String(txt || "").trim();
  if (!txt) return bolhaEle("<p>O que quer anotar? Ex.: <b>Anota: pedir depoimento para a Orla</b>.</p>", "O que quer anotar?");
  var c = NUC.candidatos(txt, basePessoas()), al = c.length && c[0].sc >= 0.65 ? c[0] : null;
  var d = { texto: txt.slice(0, 1000), origem: "assistente" };
  if (al) d[al.tipo === "lead" ? "lead_id" : "cliente_id"] = al.obj.id;
  var r = await sb.from("notas").insert(d).select().single();
  if (r.error) return bolhaEle('<p>Não consegui salvar a nota agora. Tente de novo em instantes.</p><p class="sub">' + esc(r.error.message || "") + "</p>");
  S.notas.unshift(r.data);
  bolhaEle('<p><b>Anotado.</b> ' + esc(txt) + "</p>" + (al ? '<p class="sub">Ligado a ' + esc(al.nome) + ".</p>" : ""), "Anotado.");
}
function listarNotas() {
  var L = S.notas.filter(function (x) { return !x.feita; });
  if (!L.length) return bolhaEle("<p>Nenhuma anotação aberta. Diga <b>Anota:</b> e o que quiser guardar.</p>", "Nenhuma anotação aberta.");
  var el = bolhaEle("<h3>" + plural(L.length, "anotação", "anotações") + '</h3><div class="lista">' + L.slice(0, 12).map(function (x) {
    return '<div class="it"><span class="h num">' + new Date(x.criado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + "</span><span>" + esc(x.texto) + '</span><button class="btn" type="button" data-nota="' + x.id + '" aria-label="Marcar como feita">' + ICON.ok + "</button></div>";
  }).join("") + "</div>", plural(L.length, "anotação aberta", "anotações abertas") + ". " + L.slice(0, 3).map(function (x) { return x.texto; }).join(". "));
  $$("[data-nota]", el).forEach(function (b) {
    b.onclick = async function () { b.disabled = true; var r = await sb.from("notas").update({ feita: true }).eq("id", b.dataset.nota); if (!r.error) { var x = S.notas.find(function (k) { return k.id === b.dataset.nota; }); if (x) x.feita = true; b.closest(".it").style.opacity = ".45"; } else b.disabled = false; };
  });
}
function enviarProjeto(texto) {
  var t = norm(texto), c = NUC.candidatos(texto, basePessoas()), al = c.length ? c[0] : null;
  var vit = vitrine(), url = location.origin + "/portfolio";
  if (!vit.length) return bolhaEle('<p>Nenhum projeto marcado no portfólio ainda. Marque em <b>Portfólio</b> na Central.</p><div class="acoes"><a class="btn" href="/#portfolio">' + ICON.ir + "Abrir portfólio</a></div>", "Nenhum projeto no portfólio ainda.");
  var todos = /\b(todos|portfolio|trabalhos)\b/.test(t), porta = /\b(despedida|encerrar|porta aberta|nao fechou|perdeu|futuro)\b/.test(t);
  var rank = rankProjetos(al ? al.obj : null), proj = rank[0].p;
  var mods = S.modelos.filter(function (m) { return m.objetivo === "portfolio"; });
  var mod = mods.find(function (m) { return todos ? /completo|portf/i.test(m.nome) : porta ? /porta/i.test(m.nome) : /combinado/i.test(m.nome); }) || mods[0];
  var alvoObj = al ? al.obj : { nome: "" }, tipo = al ? al.tipo : "lead";
  var corpo = mod ? mod.corpo : "Oi {nome}, como combinamos, segue um projeto que fiz: {link}\n\nOutros trabalhos: {portfolio}";
  var msg = preencher(corpo, alvoObj, tipo, { link: todos ? url : proj.url, projeto: proj.nome, portfolio: url }).replace(/^(Olá|Oi),?\s+([!,])/, "$1$2");
  var wa = al ? waDe(al.tipo, al.obj) : "";
  var id = "p" + Date.now();
  var html = "<h3>" + (al ? "Para " + esc(al.nome) : "Mensagem com projeto") + "</h3>" +
    '<p class="sub">' + (todos ? "Portfólio completo" : "Projeto: " + esc(proj.nome) + (rank[0].mesmo ? " · mesmo nicho" : "")) + "</p>" +
    '<textarea class="prev" id="' + id + '" rows="5" style="width:100%;resize:vertical">' + esc(msg) + "</textarea>" +
    '<div class="acoes">' + (wa ? '<button class="btn wa" type="button" data-wa="' + wa + '" data-tx="' + id + '">' + ICON.wa + "Abrir no WhatsApp</button>" : '<span class="sub">Sem WhatsApp no cadastro.</span>') +
    '<button class="btn" type="button" data-cp="' + id + '">' + ICON.cp + "Copiar</button>" +
    '<a class="btn" href="/#portfolio">' + ICON.ir + "Escolher outro</a></div>" +
    (!rank[0].mesmo && al && !todos ? '<p class="sub">Ainda não há projeto do mesmo nicho no portfólio.</p>' : "");
  var el = bolhaEle(html, al ? "Mensagem pronta para " + al.nome + ", com " + (todos ? "o portfólio" : proj.nome) + ". Confira e envie." : "Mensagem pronta. Diga para quem é, ou copie.");
  ligarEnvio(el, al, mod, todos ? "portfolio" : proj.nome);
}
function ligarEnvio(el, al, mod, rotulo) {
  $$("[data-cp]", el).forEach(function (b) { b.onclick = function () { copiar($("#" + b.dataset.cp).value); }; });
  $$("[data-wa]", el).forEach(function (b) {
    b.onclick = function () {
      var txt = $("#" + b.dataset.tx).value;
      window.open("https://wa.me/" + b.dataset.wa + "?text=" + encodeURIComponent(txt), "_blank");
      if (al) registrar(al, mod, txt);
    };
  });
}
async function registrar(al, mod, txt) {
  var agora = new Date(), o = al.obj;
  sb.from("disparos").insert({ publico: al.tipo, destinatario_id: o.id, canal: "whatsapp", modelo_id: mod ? mod.id : null, objetivo: mod ? mod.objetivo : "", nicho: o.nicho || o.categoria || "" }).then(function () {});
  if (al.tipo === "lead") {
    var dados = Object.assign({}, o.dados || {}); dados.ciclo = Object.assign({ envios: [] }, dados.ciclo || {});
    dados.ciclo.envios = (dados.ciclo.envios || []).concat([{ t: agora.toISOString(), etapa: mod ? mod.objetivo : "assistente", dow: agora.getDay(), h: agora.getHours(), txt: txt.slice(0, 500) }]);
    var mud = { dados: dados, historico: (o.historico || []).concat([{ t: agora.toISOString(), tipo: "envio", txt: "WhatsApp pelo Assistente: " + txt.slice(0, 120) }]), ultimo_contato: agora.toISOString(), atualizado_em: agora.toISOString() };
    if (o.status === "novo") mud.status = "contatado";
    var r = await sb.from("leads").update(mud).eq("id", o.id).select(COLS_LEAD).single();
    if (!r.error) S.leads = S.leads.map(function (x) { return x.id === o.id ? r.data : x; });
  } else {
    await sb.from("clientes").update({ ultimo_contato: agora.toISOString(), historico: (o.historico || []).concat([{ t: agora.toISOString(), tipo: "envio", txt: "WhatsApp pelo Assistente: " + txt.slice(0, 120) }]) }).eq("id", o.id);
  }
}
function respostaCliente(quem, txt) {
  var g = NUC.classificar(txt), c = NUC.candidatos(quem + " " + txt, basePessoas()), al = c.length && c[0].sc >= 0.5 ? c[0] : null;
  var mods = S.modelos.filter(function (m) { return m.objetivo === "resposta" && m.gatilho === g.id; });
  var mod = mods[0], o = al ? al.obj : { nome: "" }, msg = mod ? preencher(mod.corpo, o, al ? al.tipo : "lead", { portfolio: location.origin + "/portfolio" }).replace(/^(Olá|Oi),?\s+([!,])/, "$1$2") : "";
  var wa = al ? waDe(al.tipo, al.obj) : "", id = "r" + Date.now();
  var html = '<div class="acoes"><span class="tag t-' + (g.cor || "info") + '">' + esc(g.nome) + "</span>" + (al ? '<span class="sub">' + esc(al.nome) + "</span>" : "") + '</div><p class="sub">' + esc(g.dica) + "</p>" +
    (msg ? '<div class="sec">Resposta sugerida</div><textarea class="prev" id="' + id + '" rows="5" style="width:100%;resize:vertical">' + esc(msg) + '</textarea><div class="acoes">' + (wa ? '<button class="btn wa" type="button" data-wa="' + wa + '" data-tx="' + id + '">' + ICON.wa + "Abrir no WhatsApp</button>" : "") + '<button class="btn" type="button" data-cp="' + id + '">' + ICON.cp + "Copiar</button></div>" : "") +
    '<div class="acoes"><a class="btn" href="/?compartilhado=1&texto=' + encodeURIComponent(txt) + '#responder">' + ICON.ir + "Registrar na Central</a></div>" +
    '<p class="sub">Para atualizar o status e a agenda junto, use "Registrar na Central".</p>';
  var el = bolhaEle(html, g.nome + ". " + g.dica);
  ligarEnvio(el, al, mod, "resposta");
}

/* ───── organizar (confirmação antes de salvar) ───── */
function confirmar(plano) {
  var id = "c" + Date.now(), topo = plano.cands.length ? plano.cands[0].sc : 0, cands = plano.cands.filter(function (x) { return (x.tipo !== "projeto" || plano.venda) && x.sc >= topo * 0.8; }).slice(0, 4);
  var alvoSel = plano.alvo ? plano.alvo.tipo + ":" + plano.alvo.obj.id : plano.novoNome ? "novo-" + (plano.novoTipo || "lead") : "";
  var opts = cands.map(function (x) { var v = x.tipo + ":" + x.obj.id; return '<option value="' + v + '"' + (v === alvoSel ? " selected" : "") + ">" + esc(x.nome) + " · " + (x.tipo === "lead" ? "lead" : x.tipo === "cliente" ? "cliente" : "projeto") + "</option>"; }).join("");
  if (plano.novoNome) opts += '<option value="novo-lead"' + (alvoSel === "novo-lead" ? " selected" : "") + ">Novo lead: " + esc(plano.novoNome) + '</option><option value="novo-cliente"' + (alvoSel === "novo-cliente" ? " selected" : "") + ">Novo cliente: " + esc(plano.novoNome) + "</option>";
  opts = '<option value=""' + (!alvoSel ? " selected" : "") + ">Sem contato (só agenda)</option>" + opts;
  var st = plano.status, ag = plano.agenda;
  var html = "<h3>Entendi assim</h3>" +
    '<div class="lista">' +
    '<div class="it"><span class="tag">Quem</span><select id="' + id + '-alvo" class="prev" style="padding:6px">' + opts + "</select><span></span></div>" +
    (st ? '<div class="it"><span class="tag">Status</span><label><input type="checkbox" id="' + id + '-st" checked> ' + esc(STATUS_TXT[st]) + "</label><span></span></div>" : "") +
    (plano.venda ? '<div class="it"><span class="tag">Venda</span><label><input type="checkbox" id="' + id + '-vd" checked> ' + plural(plano.venda.qtd, "venda", "vendas") + " · " + brl(plano.venda.receita) + "</label><span></span></div>" : "") +
    (plano.valor && !plano.venda ? '<div class="it"><span class="tag">Valor</span><label><input type="checkbox" id="' + id + '-vl" checked> ' + brl(plano.valor) + "</label><span></span></div>" : "") +
    (ag ? '<div class="it"><span class="tag t-' + TIPO_AG[ag.tipo][1] + '">' + TIPO_AG[ag.tipo][0] + '</span><input type="datetime-local" id="' + id + '-q" class="prev" style="padding:6px" value="' + dataLocal(ag.quando) + '"><label class="sub"><input type="checkbox" id="' + id + '-ag" checked> agendar</label></div>' : "") +
    '<div class="it"><span class="tag">Nota</span><label><input type="checkbox" id="' + id + '-nt" checked> guardar o que você disse no histórico</label><span></span></div>' +
    "</div>" + (ag && (ag.semData || ag.semHora) ? '<p class="sub">' + (ag.semData ? "Não ouvi a data: deixei amanhã às 10h. " : "Não ouvi a hora: deixei às 10h. ") + "Ajuste acima se precisar.</p>" : "") +
    '<div class="acoes"><button class="btn pri" type="button" id="' + id + '-ok">' + ICON.ok + 'Confirmar e salvar</button><button class="btn" type="button" id="' + id + '-x">Cancelar</button></div>';
  var resumo = [];
  if (plano.alvo) resumo.push(plano.alvo.nome); else if (plano.novoNome) resumo.push("novo contato " + plano.novoNome);
  if (st) resumo.push("status " + STATUS_TXT[st].toLowerCase());
  if (ag) resumo.push(TIPO_AG[ag.tipo][0].toLowerCase() + " " + diaLongo(ag.quando).toLowerCase() + " às " + hora(ag.quando));
  var el = bolhaEle(html, "Entendi: " + resumo.join(", ") + ". Confirma?");
  $("#" + id + "-x", el).onclick = function () { el.querySelector(".bolha").innerHTML = '<p class="sub">Cancelado. Nada foi salvo.</p>'; };
  $("#" + id + "-ok", el).onclick = function () { executar(el, id, plano); };
}
function marcado(el, sel) { var x = $(sel, el); return !!(x && x.checked); }
async function executar(el, id, plano) {
  var b = $("#" + id + "-ok", el); b.disabled = true; b.textContent = "Salvando…";
  try {
    var v = $("#" + id + "-alvo", el).value, tipo = "", obj = null, feito = [], agora = new Date().toISOString();
    var nota = marcado(el, "#" + id + "-nt") ? plano.texto : "", st = marcado(el, "#" + id + "-st") ? plano.status : "";
    var valor = marcado(el, "#" + id + "-vl") ? n(plano.valor) : 0;
    if (v.indexOf("novo-") === 0) {
      if (v === "novo-lead") { var rl = await sb.from("leads").insert({ place_id: "manual-" + Date.now(), nome: plano.novoNome, status: "novo", historico: [{ t: agora, tipo: "voz", txt: "Criado pelo Assistente" }] }).select(COLS_LEAD).single(); if (rl.error) throw rl.error; S.leads.push(rl.data); tipo = "lead"; obj = rl.data; feito.push("lead criado"); }
      else { var rc = await sb.from("clientes").insert({ nome: plano.novoNome, origem: "assistente", status: "ativo" }).select().single(); if (rc.error) throw rc.error; S.clientes.unshift(rc.data); tipo = "cliente"; obj = rc.data; feito.push("cliente criado"); }
    } else if (v) {
      var p = v.split(":"); tipo = p[0];
      obj = (tipo === "lead" ? S.leads : tipo === "cliente" ? S.clientes : S.projetos).find(function (x) { return x.id === p[1]; });
    }
    var dia = "[" + new Date().toLocaleDateString("pt-BR") + "] ";
    if (tipo === "lead" && obj) {
      var mud = { atualizado_em: agora }, hist = (obj.historico || []).slice();
      if (st && st !== "retomar" && st !== obj.status) { mud.status = st; hist.push({ t: agora, tipo: "status", txt: "Status: " + STATUS_TXT[st] + " (pelo Assistente)" }); feito.push("status " + STATUS_TXT[st].toLowerCase()); }
      if (nota) { hist.push({ t: agora, tipo: "voz", txt: nota }); mud.obs = ((obj.obs ? obj.obs + "\n" : "") + dia + nota).slice(-4000); feito.push("anotação"); }
      if (valor) mud.dados = Object.assign({}, obj.dados || {}, { valor_proposta: valor });
      if (st === "reuniao" || st === "respondeu" || st === "fechado") mud.ultimo_contato = agora;
      mud.historico = hist;
      var ru = await sb.from("leads").update(mud).eq("id", obj.id).select(COLS_LEAD).single(); if (ru.error) throw ru.error;
      S.leads = S.leads.map(function (x) { return x.id === obj.id ? ru.data : x; }); obj = ru.data;
      if (st === "fechado" && !S.clientes.some(function (c) { return c.lead_id === obj.id; })) {
        var nc = await sb.from("clientes").insert({ nome: obj.nome, empresa: obj.nome, nicho: obj.nicho || obj.categoria || "", telefone: obj.whatsapp || obj.telefone || "", email: obj.email || "", origem: "prospecção", lead_id: obj.id, status: "ativo", valor_total: valor || 0 }).select().single();
        if (!nc.error) { S.clientes.unshift(nc.data); feito.push("virou cliente"); }
      }
    } else if (tipo === "cliente" && obj) {
      var mc = { historico: (obj.historico || []).concat(nota ? [{ t: agora, tipo: "voz", txt: nota }] : []), atualizado_em: agora };
      if (st) { var mapa = { fechado: "ativo", descartado: "encerrado", retomar: "retomar" }; if (mapa[st] && mapa[st] !== obj.status) { mc.status = mapa[st]; feito.push("status " + mc.status); } mc.ultimo_contato = agora; }
      if (nota) { mc.obs = ((obj.obs ? obj.obs + "\n" : "") + dia + nota).slice(-4000); feito.push("anotação"); }
      if (valor && st === "fechado") { mc.valor_total = n(obj.valor_total) + valor; feito.push("valor somado"); }
      var rcu = await sb.from("clientes").update(mc).eq("id", obj.id).select().single(); if (rcu.error) throw rcu.error;
      S.clientes = S.clientes.map(function (x) { return x.id === obj.id ? rcu.data : x; });
    } else if (tipo === "projeto" && obj && plano.venda && marcado(el, "#" + id + "-vd")) {
      var hoje = hojeISO(), ex = S.metricas.find(function (m) { return m.projeto_id === obj.id && m.data === hoje && m.canal === "Geral"; });
      var dm = { projeto_id: obj.id, data: hoje, canal: "Geral", views: ex ? ex.views : 0, cliques: ex ? ex.cliques : 0, vendas: (ex ? n(ex.vendas) : 0) + plano.venda.qtd, receita: (ex ? n(ex.receita) : 0) + plano.venda.receita, gasto: ex ? ex.gasto : 0, seguidores: ex ? ex.seguidores : 0 };
      var rm = await sb.from("metricas").upsert(dm, { onConflict: "projeto_id,data,canal" }).select().single(); if (rm.error) throw rm.error;
      S.metricas = S.metricas.filter(function (m) { return m.id !== rm.data.id; }); S.metricas.push(rm.data); feito.push(plural(plano.venda.qtd, "venda", "vendas") + " em " + obj.nome);
    }
    if (plano.agenda && marcado(el, "#" + id + "-ag")) {
      var q = $("#" + id + "-q", el).value;
      if (q) {
        var d = { tipo: plano.agenda.tipo, quando: new Date(q).toISOString(), titulo: obj ? "" : plano.texto.slice(0, 120), obs: nota, valor: valor || null, origem: "assistente" };
        if (tipo === "lead" && obj) d.lead_id = obj.id; if (tipo === "cliente" && obj) d.cliente_id = obj.id; if (tipo === "projeto" && obj) d.projeto_id = obj.id;
        var ra = await sb.from("agenda").insert(d).select().single(); if (ra.error) throw ra.error;
        S.agenda.push(ra.data); feito.push(TIPO_AG[d.tipo][0].toLowerCase() + " " + diaLongo(d.quando).toLowerCase() + " às " + hora(d.quando));
      }
    }
    var txt = feito.length ? "Pronto: " + feito.join(", ") + "." : "Nada para salvar.";
    el.querySelector(".bolha").innerHTML = "<p><b>" + esc(txt) + "</b></p>" + (obj && tipo !== "projeto" ? chipsHtml(["Preparar reunião com " + (obj.nome || obj.empresa)]) : "");
    conversa[conversa.length - 1] = { q: "ele", h: el.querySelector(".bolha").innerHTML }; salvarConversa();
    falar(txt);
  } catch (e) {
    b.disabled = false; b.innerHTML = ICON.ok + "Confirmar e salvar";
    var p = document.createElement("p"); p.className = "sub"; p.textContent = "Não salvou: " + (e.message || e); el.querySelector(".bolha").appendChild(p);
  }
}

/* ───── envio ───── */
function ajustar() { var e = $("#entrada"); e.style.height = "auto"; e.style.height = Math.min(140, e.scrollHeight) + "px"; }
async function enviar(texto) {
  var e = $("#entrada"), t = String(texto != null ? texto : e.value).trim();
  if (!t) return;
  if (t === "Anota: …") { e.value = "Anota: "; e.focus(); ajustar(); return; }
  e.value = ""; ajustar();
  bolhaEu(t); conversa.push({ q: "eu", t: t }); salvarConversa();
  try { await responder(t); } catch (err) { bolhaEle('<p>Algo deu errado aqui. Tente de novo.</p><p class="sub">' + esc(err.message || err) + "</p>"); }
}
function montarChips() {
  var hora = new Date().getHours();
  var c = hora < 12 ? ["O que tenho hoje?", "Quem preciso retomar?", "Preparar próxima reunião", "Anota: …", "Como estão os leads?"] : hora < 18 ? ["Preparar próxima reunião", "Quem preciso retomar?", "Agenda de amanhã", "Quanto vendi este mês?", "Anota: …"] : ["Agenda de amanhã", "Resumo da semana", "Minhas anotações", "Quanto vendi hoje?", "Anota: …"];
  $("#chips").innerHTML = c.map(function (x) { return '<button class="chip" type="button" data-chip="' + esc(x) + '">' + esc(x) + "</button>"; }).join("");
}

/* ───── início ───── */
function iniciarApp() {
  $("#tela-login").hidden = true; $("#tela-app").hidden = false;
  montarChips(); restaurar();
  carregar().then(function () {
    if (!conversa.length) {
      var h = new Date().getHours(), saud = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
      var hoje = pend().filter(function (a) { return new Date(a.quando) < ini(new Date()).getTime() + D; }).length, s = sugestoes().length;
      bolhaEle("<p><b>" + saud + ".</b> Hoje você tem " + plural(hoje, "compromisso", "compromissos") + " e " + plural(s, "contato", "contatos") + " para retomar.</p><p class=\"sub\">Fale ou escreva. Diga <b>ajuda</b> para ver o que eu faço.</p>", "");
    }
  });
}
function mostrarLogin() { $("#tela-app").hidden = true; $("#tela-login").hidden = false; }
$("#form-login").addEventListener("submit", async function (e) {
  e.preventDefault(); var m = $("#l-msg"); m.textContent = "Entrando…";
  var r = await sb.auth.signInWithPassword({ email: $("#l-email").value.trim(), password: $("#l-senha").value });
  if (r.error) m.textContent = "E-mail ou senha incorretos.";
});
document.addEventListener("click", function (e) { var c = e.target.closest("[data-chip]"); if (c) enviar(c.dataset.chip); });
$("#b-enviar").addEventListener("click", function () { enviar(); });
$("#b-mic").addEventListener("click", microfone);
$("#entrada").addEventListener("input", ajustar);
$("#entrada").addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } });
var bv = $("#b-voz"); bv.setAttribute("aria-pressed", lerVoz ? "true" : "false");
bv.addEventListener("click", function () { lerVoz = !lerVoz; bv.setAttribute("aria-pressed", lerVoz ? "true" : "false"); try { localStorage.setItem(VOZ_KEY, lerVoz ? "1" : "0"); } catch (x) {} if (!lerVoz && "speechSynthesis" in window) speechSynthesis.cancel(); statusVoz(lerVoz ? "Vou ler as respostas em voz alta." : "Leitura em voz alta desligada."); });
document.addEventListener("keydown", function (e) { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); $("#entrada").focus(); } });
sb.auth.onAuthStateChange(function (ev, ses) { if (ses && ses.user) { if (!S.user) { S.user = ses.user; iniciarApp(); } } else { S.user = null; mostrarLogin(); } });
sb.auth.getSession().then(function (r) { if (!r.data.session) mostrarLogin(); });
if ("serviceWorker" in navigator) addEventListener("load", function () { navigator.serviceWorker.register("/sw.js").catch(function () {}); });
})();
