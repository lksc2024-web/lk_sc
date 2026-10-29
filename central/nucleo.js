// Núcleo compartilhado entre a Central e o Assistente: entende nomes, datas, horas, valores,
// ações faladas e o tipo de resposta de um cliente. Tudo por regras, sem custo e sem enviar dados para fora.
(function () {
"use strict";
function n(v) { v = +v; return isFinite(v) ? v : 0; }
function inicioDoDia(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function norm(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9$:,./\s-]/g, " ").replace(/\s+/g, " ").trim(); }
var STOP = { de: 1, da: 1, do: 1, das: 1, dos: 1, e: 1, a: 1, o: 1, as: 1, os: 1, em: 1, na: 1, no: 1, com: 1, para: 1, pra: 1, ltda: 1, me: 1, eireli: 1, the: 1, and: 1 };
function radical(t) { return t.length > 3 && /s$/.test(t) ? t.replace(/(oes|aes|ais|eis|s)$/, function (x) { return x === "oes" || x === "aes" ? "ao" : x === "ais" ? "al" : x === "eis" ? "el" : ""; }) : t; }
function tokensNome(s) { return norm(s).split(" ").filter(function (t) { return (t.length >= 3 || /^\d+$/.test(t)) && !STOP[t]; }).map(radical); }
function candidatos(texto, base) {
  base = base || { leads: [], clientes: [], projetos: [] };
  var nt = norm(texto), tn = " " + nt + " ", toks = {}; nt.split(" ").forEach(function (t) { toks[t] = 1; toks[radical(t)] = 1; });
  var melhor = {};
  function testar(tipo, obj, nome) {
    if (!nome) return; var ts = tokensNome(nome); if (!ts.length) return;
    var hit = ts.filter(function (t) { return toks[t]; }).length; if (!hit) return;
    var sc = hit / ts.length, full = norm(nome);
    if (full.length >= 4 && tn.indexOf(" " + full + " ") >= 0) sc = Math.max(sc, 1.2);
    if (tipo === "cliente" && /\bcliente\b/.test(nt)) sc += 0.15;
    if (tipo === "lead" && /\blead\b/.test(nt)) sc += 0.15;
    if (tipo === "projeto" && /\b(projeto|produto|kit|pack|curso|venda|vendi)\b/.test(nt)) sc += 0.1;
    var k = tipo + ":" + obj.id;
    if (!melhor[k] || melhor[k].sc < sc) melhor[k] = { tipo: tipo, obj: obj, nome: nome, sc: sc, hit: hit };
  }
  (base.leads || []).forEach(function (l) { testar("lead", l, l.nome); });
  (base.clientes || []).forEach(function (c) { testar("cliente", c, c.nome); if (c.empresa && c.empresa !== c.nome) testar("cliente", c, c.empresa); });
  (base.projetos || []).forEach(function (p) { testar("projeto", p, p.nome); });
  return Object.keys(melhor).map(function (k) { return melhor[k]; }).filter(function (o) { return o.sc >= 0.5; }).sort(function (a, b) { return (b.sc - a.sc) || (b.hit - a.hit); }).slice(0, 8);
}
var NUMPAL = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, quinze: 15, trinta: 30 };
function numero(s) { return /^\d+$/.test(s) ? +s : (NUMPAL[s] || 1); }
function somaDias(d, q) { var x = new Date(d); x.setDate(x.getDate() + q); return x; }
function extrairData(texto) {
  var t = norm(texto), agora = new Date(), base = inicioDoDia(agora), d = null, m;
  var DOW = { domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6 };
  var MES = { janeiro: 0, fevereiro: 1, marco: 2, abril: 3, maio: 4, junho: 5, julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11 };
  if (/\bdepois de amanha\b/.test(t)) d = somaDias(base, 2);
  else if (/\bamanha\b/.test(t)) d = somaDias(base, 1);
  else if (/\bhoje\b/.test(t)) d = base;
  else if ((m = t.match(/\b(?:em|daqui a|daqui)\s+(\d+|um|uma|dois|duas|tres|quatro|cinco|seis|sete|quinze|trinta)\s+(dias?|semanas?|mes|meses)\b/))) { var q = numero(m[1]); d = /^dia/.test(m[2]) ? somaDias(base, q) : /^semana/.test(m[2]) ? somaDias(base, 7 * q) : new Date(base.getFullYear(), base.getMonth() + q, base.getDate()); }
  else if (/\b(semana que vem|proxima semana)\b/.test(t) && !/\b(segunda|terca|quarta|quinta|sexta|sabado|domingo)\b/.test(t)) d = somaDias(base, 7);
  else if (/\b(mes que vem|proximo mes)\b/.test(t)) d = new Date(base.getFullYear(), base.getMonth() + 1, base.getDate());
  else if ((m = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/))) { var ano = m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : base.getFullYear(); d = new Date(ano, +m[2] - 1, +m[1]); if (!m[3] && d < base) d.setFullYear(d.getFullYear() + 1); }
  else if ((m = t.match(/\bdia\s+(\d{1,2})(?:\s+de\s+([a-z]+))?/))) { var mes = m[2] && MES[m[2]] != null ? MES[m[2]] : base.getMonth(); d = new Date(base.getFullYear(), mes, +m[1]); if (d < base) { if (m[2] && MES[m[2]] != null) d.setFullYear(d.getFullYear() + 1); else d = new Date(base.getFullYear(), base.getMonth() + 1, +m[1]); } }
  else { for (var k in DOW) { if (new RegExp("\\b" + k + "\\b").test(t)) { var dif = (DOW[k] - base.getDay() + 7) % 7; var mesmoDia = dif === 0; if (mesmoDia) dif = 7; if (/\b(semana que vem|proxima semana)\b/.test(t) && dif < 7) dif += 7; d = somaDias(base, dif); if (mesmoDia && !/\b(semana que vem|proxima semana|que vem)\b/.test(t)) d.mesmoDia = true; break; } } }
  var h = null, mi = 0;
  if (/\bmeio[- ]?dia\b/.test(t)) h = 12;
  else if ((m = t.match(/\b(\d{1,2})(?::|h)(\d{2})\b/))) { h = +m[1]; mi = +m[2]; }
  else if ((m = t.match(/\b(?:as|a)\s+(\d{1,2})(?:\s*h(?:oras?)?)?(?:\s+e\s+(meia|\d{1,2}))?(?:\s+(?:da|de)\s+(manha|tarde|noite))?\b/))) { h = +m[1]; mi = m[2] === "meia" ? 30 : (m[2] ? +m[2] : 0); if ((m[3] === "tarde" || m[3] === "noite") && h < 12) h += 12; }
  else if ((m = t.match(/\b(\d{1,2})\s*h(?:oras?)?\b/))) h = +m[1];
  else if ((m = t.match(/\b(\d{1,2})\s+(?:da|de)\s+(manha|tarde|noite)\b/))) { h = +m[1]; if (m[2] !== "manha" && h < 12) h += 12; }
  if (h != null && (h > 23 || mi > 59)) { h = null; mi = 0; }
  if (!d && h == null) return null;
  if (d && d.mesmoDia && h != null) { var hj = new Date(base); hj.setHours(h, mi, 0, 0); if (hj > agora) d = base; }
  if (!d) { var teste = new Date(base); teste.setHours(h, mi, 0, 0); d = teste < agora ? somaDias(base, 1) : base; }
  var r = new Date(d); r.setHours(h == null ? 10 : h, h == null ? 0 : mi, 0, 0);
  return { data: r, semHora: h == null };
}
function extrairValor(texto) {
  var t = norm(texto).replace(/(\d)\.(\d{3})(?!\d)/g, "$1$2");
  var m = t.match(/r\$\s*(\d+(?:,\d{1,2})?)(\s*mil)?/) || t.match(/(\d+(?:,\d+)?)\s*(mil)?\s*(?:reais|real|conto)\b/) || t.match(/\b(?:por|valor de|valor|orcamento de|orcamento|proposta de|fechou em|fechamos em|pagou)\s+(\d+(?:,\d+)?)\s*(mil)?\b/) || t.match(/\b(\d+(?:,\d+)?)\s+(mil)\b/);
  if (!m) return /\bmil reais\b/.test(t) ? 1000 : null;
  var v = parseFloat(m[1].replace(",", ".")); if (m[2]) v *= 1000; return v > 0 ? v : null;
}
function extrairNomeNovo(texto) {
  var m = texto.match(/(?:novo cliente|cliente novo|cadastr\w* (?:o |a )?cliente|novo lead|lead novo|cadastr\w* (?:o |a )?lead|reuni[aã]o com|marquei com|agendei com|falei com|liguei (?:para|pra)|conversei com|fechei com|fechou com)\s+(?:o |a |os |as |com )?(.+)/i);
  if (!m) return "";
  var resto = m[1].split(/\s+(?:hoje|amanh[ãa]|depois|na |no |segunda|ter[çc]a|quarta|quinta|sexta|s[áa]bado|domingo|dia\s+\d|[àa]s\s+\d|\d{1,2}h|\d{1,2}:\d{2}|por\s|r\$|no valor|valor|quer|querem|precisa|precisam|para\s|pra\s|que\s|e\s+(?:quer|vai|ficou|pediu))|[,.;]/i)[0];
  return resto.trim().split(/\s+/).slice(0, 6).map(function (w) { return w.length > 2 ? w.charAt(0).toUpperCase() + w.slice(1) : w; }).join(" ");
}
function interpretar(texto, base) {
  var t = norm(texto);
  var I = {
    reuniao: /\b(reuniao|reunioes|agendei|agendad\w*|marquei|marcad\w*|encontro|call|visita|apresentacao)\b/.test(t),
    fechou: /\b(fechou|fechamos|fechei|fechad\w*|contratou|contrataram|aprovou|aprovaram|pagou|pagaram|recebi)\b/.test(t),
    respondeu: /\b(respondeu|responderam|retornou|retornaram|me chamou|me chamaram|interessad\w*|gostou|gostaram)\b/.test(t),
    descartar: /\b(descart\w*|sem interesse|nao tem interesse|nao quer|nao querem|recusou|recusaram|desistiu|desistiram)\b/.test(t),
    retomar: /\b(retomar|retomada|cobrar|voltar a falar|follow|lembrar de falar|lembra de falar|me lembra de falar|chamar de novo|falar de novo|recontatar|ligar de novo)\b/.test(t),
    tarefa: /\b(lembrete|me lembra|lembrar de|tarefa|nao esquecer|preciso)\b/.test(t),
    novoCliente: /\b(novo cliente|cliente novo|cadastr\w* (o |a )?cliente)\b/.test(t),
    novoLead: /\b(novo lead|lead novo|cadastr\w* (o |a )?lead)\b/.test(t),
    venda: /\b(vendi|venda|vendas|vendemos)\b/.test(t)
  };
  var cands = candidatos(texto, base), quando = extrairData(texto), valor = extrairValor(texto);
  var plano = { texto: texto, cands: cands, alvo: null, novoNome: "", status: "", agenda: null, valor: valor, nota: texto, venda: null, resumo: [] };
  var nomeNovo = extrairNomeNovo(texto);
  if (cands.length && !I.novoCliente && !I.novoLead && cands[0].sc >= 0.65) plano.alvo = cands[0];
  else if (nomeNovo) { plano.novoNome = nomeNovo; plano.novoTipo = I.novoCliente || I.fechou ? "cliente" : "lead"; }
  else if (cands.length) plano.alvo = cands[0];
  var tipoAlvo = plano.alvo ? plano.alvo.tipo : plano.novoNome ? plano.novoTipo : "";
  if (tipoAlvo === "projeto" && (I.venda || I.fechou)) {
    var mq = t.match(/\b(\d+|um|uma|dois|duas|tres|quatro|cinco)\s+(?:venda|vendas|unidade|unidades|kit|kits|pack|packs|curso|cursos)\b/);
    var qtd = mq ? numero(mq[1]) : 1;
    plano.venda = { qtd: qtd, receita: valor != null ? valor : qtd * n(plano.alvo.obj.preco) };
  } else {
    if (I.descartar) plano.status = "descartado";
    else if (I.fechou) plano.status = "fechado";
    else if (I.reuniao) plano.status = "reuniao";
    else if (I.respondeu) plano.status = "respondeu";
    else if (I.retomar && tipoAlvo === "cliente") plano.status = "retomar";
  }
  if (I.reuniao && !I.descartar) plano.agenda = { tipo: "reuniao", quando: quando ? quando.data : null, semHora: quando ? quando.semHora : true };
  else if (I.retomar || (quando && (tipoAlvo === "lead" || tipoAlvo === "cliente") && !I.fechou && !I.descartar)) { var q = quando ? quando.data : (function () { var x = somaDias(inicioDoDia(new Date()), 3); x.setHours(10, 0, 0, 0); return x; })(); plano.agenda = { tipo: "retomada", quando: q, semHora: quando ? quando.semHora : true }; }
  else if (I.tarefa && quando) plano.agenda = { tipo: "tarefa", quando: quando.data, semHora: quando.semHora };
  if (plano.agenda && !plano.agenda.quando) { var amanha = somaDias(inicioDoDia(new Date()), 1); amanha.setHours(10, 0, 0, 0); plano.agenda.quando = amanha; plano.agenda.semData = true; }
  return plano;
}
var GATILHOS = [
  { id: "remover", nome: "Pediu para não receber mais", rx: /(para|pare|parem) de (me )?mand|n[aã]o (me )?mand(e|em)|me (tira|remov)|sair da lista|bloque|denunci|n[aã]o (me )?(chama|ligue|liga|chamem) mais/, st: "descartado", tipo4: "rejeicao", cor: "bad", dica: "Respeite o pedido e não volte a chamar." },
  { id: "quem_e", nome: "Perguntou quem é você", rx: /quem (e|seria|fala|est[aá] falando)|como (voc[eê] |vc )?(conseguiu|achou|pegou|tem) (meu|o|esse|este) (n[uú]mero|contato|telefone)|de onde (voc[eê]|vc|[eé])|[eé] golpe|golpe/, st: "respondeu", tipo4: "atencao", cor: "warn", dica: "Desconfiança: apresente-se com clareza e ofereça parar." },
  { id: "ja_tem", nome: "Já tem site ou alguém cuidando", rx: /j[aá] (temos|tenho|possu\w*|fizemos|contratamos|tem)|temos (um |uma )?(site|ag[eê]ncia|pessoa|algu[eé]m|designer|programador|empresa)|j[aá] (cuida|faz|est[aá] (feito|resolvido))/, st: "descartado", tipo4: "rejeicao", cor: "bad", dica: "Negativa educada: deixe a porta aberta para o futuro.", agendaDias: 90 },
  { id: "horario", nome: "Sugeriu dia ou horário", rx: /que horas|qual (o )?(melhor )?hor[aá]rio|pode ser (amanh|hoje|segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado|depois)|(as|às) \d{1,2}(h|:| horas| da)|\d{1,2}h\d{0,2}\b|(amanh[aã]|segunda|ter[cç]a|quarta|quinta|sexta).{0,25}(pode|serve|fica bom|t[aá] bom|combinado)/, st: "reuniao", tipo4: "desejo", cor: "ok", dica: "Ótimo sinal: confirme e marque na agenda.", agendaReuniao: true },
  { id: "aprovacao", nome: "Aprovou", rx: /vamos (fazer|fechar)|pode (fazer|come[cç]ar|seguir|mandar a proposta|mandar o contrato)|\bfechado\b|\bfechou\b|quero contratar|manda (a proposta|o contrato|o pix|os dados)|\baceito\b|\bbora\b|t[oô] dentro/, st: "fechado", tipo4: "aprovacao", cor: "ok", dica: "Fechamento: peça os dados e mande a proposta." },
  { id: "caro", nome: "Achou caro ou sem verba", rx: /\bcaro\b|sem (verba|dinheiro|grana|or[cç]amento)|n[aã]o (tenho|temos) (como pagar|dinheiro|verba|grana)|fora do (or[cç]amento|meu or[cç]amento|nosso or[cç]amento)|apertad|n[aã]o cabe/, st: "respondeu", tipo4: "atencao", cor: "warn", dica: "Objeção de preço: ofereça algo menor ou parcelado." },
  { id: "sem_tempo", nome: "Sem tempo agora", rx: /(agora|momento|no momento) n[aã]o|n[aã]o [eé] (o|um bom) momento|depois (a gente|eu|conversa|vejo|falamos)|mais (pra|para) frente|semana que vem|m[eê]s que vem|sem tempo|correria|corrido|ocupad|me (chama|procura|liga|manda mensagem) (depois|mais tarde|outro dia|semana|no m[eê]s|daqui)|daqui a \w+ (dias|semanas|meses)|ano que vem/, st: "respondeu", tipo4: "atencao", cor: "warn", dica: "Não é um não: agende a retomada.", agendaDias: 15 },
  { id: "sem_interesse", nome: "Sem interesse", rx: /n[aã]o (tenho|temos) interesse|sem interesse|n[aã]o (quero|queremos|preciso|precisamos|vou querer|vamos querer)|n[aã]o,? obrigad|dispenso|n[aã]o rola|n[aã]o faz sentido|n[aã]o tenho necessidade/, st: "descartado", tipo4: "rejeicao", cor: "bad", dica: "Negativa: agradeça e pergunte o motivo, sem insistir." },
  { id: "pensar", nome: "Vai pensar ou consultar alguém", rx: /vou (pensar|ver|analisar|conversar|falar|consultar|avaliar)|preciso (pensar|ver|conversar|falar|consultar|avaliar)|deixa eu (ver|pensar)|vou te (falar|retornar|avisar|dar um retorno)|(meu|minha) (s[oó]ci|espos|marido|mulher|chefe|gerente|dono)/, st: "respondeu", tipo4: "atencao", cor: "warn", dica: "Está considerando: facilite a decisão e marque a retomada.", agendaDias: 3 },
  { id: "exemplos", nome: "Pediu exemplos", rx: /exemplo|portf[oó]lio|trabalhos (seus|anteriores|feitos)|j[aá] fez|mostra (algum|alguns|uns)|ver (algum|um|uns) (site|trabalho)/, st: "respondeu", tipo4: "atencao", cor: "info", dica: "Interesse com dúvida: mostre trabalhos parecidos." },
  { id: "preco", nome: "Perguntou o preço", rx: /quanto|valor|pre[cç]o|custa|or[cç]amento|investimento|cobra/, st: "respondeu", tipo4: "atencao", cor: "info", dica: "Pergunta de preço: dê uma faixa e puxe para o diagnóstico." },
  { id: "como_funciona", nome: "Perguntou como funciona", rx: /como funciona|como seria|o que (seria|[eé] isso)|explica|me fala mais|mais detalhes|mais informa|prazo|quanto tempo|como (voc[eê]s|vc) trabalha/, st: "respondeu", tipo4: "atencao", cor: "info", dica: "Dúvida: explique o processo em poucas linhas." },
  { id: "interesse", nome: "Mostrou interesse", rx: /\bquero\b|me manda|manda sim|pode mandar|gostei|tenho interesse|temos interesse|interessante|quero ver|me mostra|pode sim|sim,? pode|faz sentido|\bshow\b|\btop\b|\blegal\b|\bsim\b|\bclaro\b|\bok\b|beleza|\bblz\b/, st: "respondeu", tipo4: "desejo", cor: "ok", dica: "Interesse: avance para a conversa ou chamada." },
  { id: "outro", nome: "Resposta geral", rx: /.^/, st: "respondeu", tipo4: "atencao", cor: "info", dica: "Não reconheci o tipo: confira a resposta sugerida." }
];
function classificar(texto) {
  var t = norm(texto).replace(/\s+/g, " ");
  var tOrig = String(texto || "").toLowerCase();
  for (var i = 0; i < GATILHOS.length - 1; i++) { if (GATILHOS[i].rx.test(t) || GATILHOS[i].rx.test(tOrig)) return GATILHOS[i]; }
  return GATILHOS[GATILHOS.length - 1];
}
function limparOCR(txt) {
  return String(txt || "").split(/\n+/).map(function (l) { return l.trim(); }).filter(function (l) {
    if (l.length < 2) return false;
    if (/^\d{1,2}[:.]\d{2}(\s*[✓v√]+)?$/i.test(l)) return false;
    if (/^(hoje|ontem|online|digitando|visto por|mensagem|digite uma mensagem|as mensagens|criptografad|toque para)/i.test(norm(l))) return false;
    return true;
  }).map(function (l) { return l.replace(/\s+\d{1,2}[:.]\d{2}\s*[✓v√]*$/i, ""); }).join("\n").trim();
}

var NICHO_GRUPOS = [
  ["comida", /padaria|confeitaria|cafeteria|\bcafe\b|restaurante|lanchonete|hamburgu|burger|pizzaria|chopp|\bbar\b|churrascaria|acougue|doceria|gastronom|food|hortifruti|mercado/],
  ["pet", /\bpet\b|petshop|veterin|animal|banho e tosa/],
  ["beleza", /estetica|salao|beleza|barbearia|cabeleireir|manicure|\bspa\b|sobrancelha|maquiagem|cosmetic/],
  ["saude", /dentista|odonto|clinica|medic|fisioterap|psicolog|nutri|saude|pilates|academia|fitness|personal|crossfit/],
  ["imoveis", /imobili|imove|corretor|condominio|arquitet|interiores|construt|reforma/],
  ["auto", /oficina|automotiv|\bcarros?\b|veiculo|concession|\bmotos?\b|autopeca|auto peca|lava ?jato|superesportiv|import/],
  ["loja", /\bloja\b|moda|roupa|boutique|perfum|calcado|tenis|bijuter|acessorio|infantil|presente|varejo|e-?commerce/],
  ["servicos", /advoga|contab|consultor|agencia|escritorio|gestao|financ/]
];
function grupoNicho(txt) { var t = norm(txt); for (var i = 0; i < NICHO_GRUPOS.length; i++) if (NICHO_GRUPOS[i][1].test(t)) return NICHO_GRUPOS[i][0]; return ""; }
window.Nucleo = { grupoNicho: grupoNicho, NICHO_GRUPOS: NICHO_GRUPOS, norm: norm, radical: radical, tokensNome: tokensNome, candidatos: candidatos, numero: numero, somaDias: somaDias,
  extrairData: extrairData, extrairValor: extrairValor, extrairNomeNovo: extrairNomeNovo, interpretar: interpretar,
  GATILHOS: GATILHOS, classificar: classificar, limparOCR: limparOCR, inicioDoDia: inicioDoDia };
})();
