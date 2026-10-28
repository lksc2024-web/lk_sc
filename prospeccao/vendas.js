// Motor de vendas por regras (sem IA, sem custo): diagnóstico -> grupo -> oportunidade -> mensagem ->
// ciclo de conversa -> chance de fechamento. Tudo baseado em fatos observados no Google e no site.
"use strict";

// Tabela de preços padrão (estimativas de mercado no Brasil; o vendedor ajusta em Ajustes).
const SERVICOS = {
  landing: { nome: "Landing page", min: 1500, max: 4000, prazo: "7 dias" },
  site: { nome: "Site profissional", min: 2500, max: 8000, prazo: "10 a 20 dias" },
  reforma: { nome: "Reforma e otimização de site", min: 800, max: 3000, prazo: "5 a 10 dias" },
  whatsapp_botao: { nome: "Botão de WhatsApp e captação", min: 300, max: 1200, prazo: "2 a 3 dias" },
  agendamento: { nome: "Agendamento online", min: 1500, max: 5000, prazo: "7 a 15 dias" },
  avaliacoes: { nome: "Automação de avaliações no Google", min: 800, max: 2500, prazo: "5 dias" },
  trafego: { nome: "Gestão de tráfego pago", min: 1200, max: 3500, mensal: true, prazo: "início em 5 dias" },
  ia_atendente: { nome: "Atendente com IA no WhatsApp", min: 2500, max: 8000, prazo: "10 a 20 dias", obs: "+ mensalidade de manutenção" },
  crm: { nome: "CRM e automação de vendas", min: 4000, max: 15000, prazo: "20 a 40 dias" },
  app: { nome: "Aplicativo próprio", min: 15000, max: 60000, prazo: "45 a 90 dias" },
  sistema: { nome: "Sistema sob medida", min: 10000, max: 50000, prazo: "30 a 90 dias" },
};

const GRUPOS = {
  sem: { nome: "Sem presença digital", icone: "🔴", cor: "var(--g-sem)" },
  melhorar: { nome: "Presença a melhorar", icone: "🟡", cor: "var(--g-melhorar)" },
  boa: { nome: "Presença boa", icone: "🟢", cor: "var(--g-boa)" },
  analisando: { nome: "Analisando o site", icone: "⏳", cor: "var(--sub)" },
};

const AGENDA_RE = /cl[ií]nica|est[eé]tica|dent|odonto|sal[aã]o|barbe|spa\b|fisio|psic|nutri|m[eé]dic|veterin|pet|academia|personal|est[uú]dio|studio|imobili|advoca|advogad|restaurante|beleza|manicure|depila|massag|tatu/i;
const APP_RE = /academia|restaurante|cl[ií]nica|pet|sal[aã]o|barbe|est[eé]tica|delivery|pizzaria|hamburg/i;
const ANO = new Date().getFullYear();

function fmtNota(n) { return String(n).replace(".", ","); }
// Lead com site próprio que ainda não passou pelo raio-X (busca nova ou anterior a esta versão).
function precisaAnalise(l) { return !!l.site && !soRede(l.site) && !l.dados?.diag; }
function soRede(site) { return /instagram\.com|facebook\.com|linktr\.ee|wa\.me|whatsapp\.com/i.test(site || ""); }
function pluralPalavra(p) {
  return /s$/.test(p) ? p : p.replace(/ão$/, "ões").replace(/el$/, "éis").replace(/ol$/, "óis").replace(/([aeiouáéíóú])$/, "$1s").replace(/([rz])$/, "$1es").replace(/l$/, "is");
}
// "Clínica de estética" -> "clínicas de estética"; "Imobiliária" -> "imobiliárias"; casos difíceis -> genérico
function plural(cat) {
  const p = (cat || "").toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (p.length === 1) return pluralPalavra(p[0]);
  if (p.length > 1 && ["de", "do", "da", "dos", "das", "para"].includes(p[1])) return [pluralPalavra(p[0]), ...p.slice(1)].join(" ");
  return "negócios como o de vocês";
}
// "em Curitiba", mas "no Rio de Janeiro"
function emCidade(c) {
  if (!c) return "na sua cidade";
  return /^rio\b|^recife$/i.test(c) ? `no ${c}` : `em ${c}`;
}

// Cada oportunidade: quando se aplica, qual serviço resolve e os blocos de texto da mensagem.
// Os textos usam só o que foi observado; {x} é trocado pelos dados do lead.
const OPORTUNIDADES = [
  { id: "site_fora", grupo: "presenca", servico: "site", peso: 25,
    quando: (l, d) => l.site && !soRede(l.site) && d && !d.abre,
    problema: "tentei abrir o site de vocês ({dominio}) e ele não carregou",
    impacto: "Quem clica no Google e encontra o site fora do ar costuma desistir e procurar outra opção",
    solucao: "sites rápidos e estáveis, pensados para o celular", curto: "o site fora do ar",
    beneficio: "com o site no ar de novo, todo cliente que chega pelo Google encontra vocês na hora" },
  { id: "sem_site", grupo: "presenca", servico: "site", peso: 20,
    quando: (l) => !l.site,
    problema: "não encontrei um site da {nome}: no Google aparecem só o endereço e o telefone",
    impacto: "Quem procura {categoria} {em_cidade} e quer ver serviços, fotos e como agendar acaba escolhendo quem mostra isso",
    solucao: "sites profissionais, rápidos e feitos para o celular, com botão de WhatsApp", curto: "um site para a {nome}",
    beneficio: "um site bem feito transforma quem pesquisa no Google em cliente chamando no WhatsApp" },
  { id: "so_rede", grupo: "presenca", servico: "landing", peso: 18,
    quando: (l) => soRede(l.site),
    problema: "o link do Google de vocês leva direto para uma rede social, sem uma página própria",
    impacto: "Na rede social o cliente não encontra fácil serviços, preços e como agendar, e o Google valoriza quem tem página própria",
    solucao: "páginas próprias (landing pages) ligadas ao Instagram, com serviços e botão de agendamento", curto: "uma página própria",
    beneficio: "a página própria faz o Google e o Instagram trabalharem juntos para trazer clientes" },
  { id: "nao_responsivo", grupo: "melhoria", servico: "reforma", peso: 16,
    quando: (l, d) => d && d.abre && !d.responsivo,
    problema: "abri o site pelo celular e ele não se ajusta à tela",
    impacto: "A maioria das pessoas pesquisa pelo celular, e um site difícil de ler faz o cliente sair em segundos",
    solucao: "sites 100% adaptados ao celular", curto: "o site no celular",
    beneficio: "com o site certinho no celular, mais visitas viram contato" },
  { id: "sem_agendamento", grupo: "melhoria", servico: "agendamento", peso: 12,
    quando: (l, d) => d && d.abre && !d.agendamento && AGENDA_RE.test(`${l.categoria} ${l.nicho}`),
    problema: "não vi um jeito de agendar direto pelo site",
    impacto: "Agendamento online pega o cliente na hora em que ele decide, inclusive à noite e no fim de semana",
    solucao: "agendamento online integrado ao WhatsApp, com lembrete automático", curto: "o agendamento online",
    beneficio: "agenda cheia sem depender de alguém respondendo mensagem o tempo todo" },
  { id: "sem_https", grupo: "melhoria", servico: "reforma", peso: 10,
    quando: (l, d) => d && d.abre && !d.https,
    problema: "o site aparece como \"não seguro\" no navegador (sem o cadeado)",
    impacto: "Esse aviso passa desconfiança logo na primeira impressão",
    solucao: "sites seguros, com certificado e boa avaliação no Google", curto: "a segurança do site",
    beneficio: "o cadeado de segurança passa confiança e ajuda o site a aparecer melhor no Google" },
  { id: "lento", grupo: "melhoria", servico: "reforma", peso: 10,
    quando: (l, d) => d && d.abre && d.ms > 4000,
    problema: "o site demorou uns {segundos} segundos para abrir",
    impacto: "A cada segundo a mais, parte dos visitantes desiste antes de ver a página",
    solucao: "otimização para o site abrir em menos de 2 segundos", curto: "a velocidade do site",
    beneficio: "site rápido segura o visitante e melhora a posição no Google" },
  { id: "desatualizado", grupo: "melhoria", servico: "reforma", peso: 9,
    quando: (l, d) => d && d.abre && d.ano_rodape && d.ano_rodape <= ANO - 2,
    problema: "o rodapé do site ainda mostra {ano}",
    impacto: "Passa a impressão de empresa parada, o que não combina com a reputação que vocês têm",
    solucao: "repaginadas de site com visual atual", curto: "a atualização do site",
    beneficio: "um visual atual mostra que a empresa está ativa e passa mais confiança" },
  { id: "poucas_avaliacoes", grupo: "melhoria", servico: "avaliacoes", peso: 9,
    quando: (l, d, c) => c.mediana >= 20 && l.avaliacoes < Math.max(10, c.mediana * 0.4),
    problema: "vocês têm {avaliacoes} avaliações no Google, enquanto empresas parecidas na região têm por volta de {mediana}",
    impacto: "No Google, quem tem mais avaliações aparece primeiro e passa mais confiança",
    solucao: "automações que pedem avaliação aos clientes satisfeitos pelo WhatsApp", curto: "as avaliações no Google",
    beneficio: "mais avaliações = mais destaque no Google e mais clientes escolhendo vocês" },
  { id: "nota_baixa", grupo: "melhoria", servico: "avaliacoes", peso: 8,
    quando: (l) => l.nota > 0 && l.nota < 4.2 && l.avaliacoes >= 5,
    problema: "a nota de vocês no Google está em {nota}",
    impacto: "Muitos clientes só olham empresas com nota acima de 4,5 antes de escolher",
    solucao: "sistemas para responder avaliações e coletar novas dos clientes satisfeitos", curto: "a nota no Google",
    beneficio: "subir a nota no Google muda quantas pessoas chegam até vocês" },
  { id: "sem_whatsapp_site", grupo: "melhoria", servico: "whatsapp_botao", peso: 8,
    quando: (l, d) => d && d.abre && !d.whatsapp_site,
    problema: "o site não tem um botão de WhatsApp para o cliente chamar na hora",
    impacto: "Quem está decidindo quer falar rápido, e sem o botão muita gente fecha a página",
    solucao: "botão de WhatsApp e formulários que já chegam organizados", curto: "o botão de WhatsApp no site",
    beneficio: "contato em um toque aumenta o número de pedidos" },
  { id: "sem_chat", grupo: "crescimento", servico: "ia_atendente", peso: 10,
    quando: (l, d) => d && d.abre && !d.chat,
    problema: "não encontrei atendimento automático no site",
    impacto: "Mensagem que chega fora do horário e demora a ser respondida costuma virar cliente do concorrente",
    solucao: "atendentes com inteligência artificial que respondem na hora, 24h, tiram dúvidas e agendam", curto: "o atendimento automático com IA",
    beneficio: "nenhum cliente fica sem resposta, nem de madrugada" },
  { id: "sem_pixel", grupo: "crescimento", servico: "trafego", peso: 8,
    quando: (l, d) => d && d.abre && !d.pixel && !d.google_tag,
    problema: "o site não tem as ferramentas de medição de anúncios (Pixel da Meta e Google)",
    impacto: "Sem isso não dá para anunciar de forma inteligente nem saber de onde vêm os clientes",
    solucao: "campanhas de tráfego pago focadas {em_cidade}, com medição de cada contato", curto: "os anúncios e a medição",
    beneficio: "anúncio bem medido traz cliente da região pagando só pelo que funciona" },
  { id: "crm", grupo: "crescimento", servico: "crm", peso: 7,
    quando: (l) => l.avaliacoes >= 100 || /imobili/i.test(`${l.categoria} ${l.nicho}`),
    problema: "vocês já têm uma presença forte no Google ({avaliacoes} avaliações)",
    impacto: "Com esse volume de contatos, organizar o retorno de cada cliente faz muita diferença no fechamento",
    solucao: "CRMs sob medida com follow-up automático pelo WhatsApp", curto: "a organização dos contatos (CRM)",
    beneficio: "nenhum contato esquecido e mais vendas fechadas com o mesmo movimento" },
  { id: "app", grupo: "crescimento", servico: "app", peso: 5,
    quando: (l) => l.avaliacoes >= 300 && APP_RE.test(`${l.categoria} ${l.nicho}`),
    problema: "com a base de clientes que vocês já têm ({avaliacoes} avaliações)",
    impacto: "Um canal próprio faz o cliente voltar mais vezes sem depender de anúncio",
    solucao: "aplicativos próprios de agendamento e fidelidade", curto: "um aplicativo próprio",
    beneficio: "cliente fiel voltando pelo app, com promoções direto no celular dele" },
];

function mediana(nums) {
  const v = nums.filter((n) => n > 0).sort((a, b) => a - b);
  return v.length ? v[Math.floor(v.length / 2)] : 0;
}

// Contexto de comparação: mediana de avaliações por nicho (dos leads já encontrados).
function contextoComparacao(leads) {
  const porNicho = {};
  for (const l of leads) (porNicho[l.nicho] ||= []).push(l.avaliacoes);
  const out = {};
  for (const [n, v] of Object.entries(porNicho)) out[n] = mediana(v);
  return out;
}

// Diagnóstico completo de um lead -> { grupo, oportunidades, principal, potencial }
function analisar(l, medianas = {}) {
  const d = l.dados?.diag || null;
  const temSiteProprio = l.site && !soRede(l.site);
  if (temSiteProprio && !d) return { grupo: "analisando", oportunidades: [], principal: null, potencial: 0, ctx: {} };
  const ctx = { mediana: medianas[l.nicho] || 0 };
  // primeiro o que falta (presença), depois o que está errado (melhoria), por último o crescimento
  const ORDEM = { presenca: 0, melhoria: 1, crescimento: 2 };
  const ops = OPORTUNIDADES.filter((o) => { try { return o.quando(l, d, ctx); } catch { return false; } })
    .sort((a, b) => ORDEM[a.grupo] - ORDEM[b.grupo] || b.peso - a.peso);
  const grupo = ops.some((o) => o.grupo === "presenca") ? "sem" : ops.some((o) => o.grupo === "melhoria") ? "melhorar" : "boa";
  // presença boa sem nenhum sinal: oferece organização (CRM) mesmo assim
  if (!ops.length) ops.push(OPORTUNIDADES.find((o) => o.id === "crm"));
  let potencial = { sem: 55, melhorar: 50, boa: 30 }[grupo] + ops[0].peso * 0.8;
  potencial += l.whatsapp ? 8 : -15;
  if (l.avaliacoes >= 50) potencial += 5;
  if (l.nota >= 4.5) potencial += 3;
  if (l.fechado) potencial = 0;
  return { grupo, oportunidades: ops, principal: ops[0], potencial: Math.round(Math.max(0, Math.min(95, potencial))), ctx };
}

// ── Mensagens do ciclo (modulares: cada {bloco} vem do diagnóstico do lead) ────────
const ROTEIRO_PADRAO = {
  abordagem: "Olá, tudo bem? {apresentacao}\n\n{elogio} Dei uma olhada na presença digital de vocês: {problema}. " +
    "{impacto}.\n\nEu desenvolvo {solucao} para {categorias}{portfolio_frase}\n\n" +
    "Posso te mandar um diagnóstico gratuito da {nome}, sem compromisso? Se não fizer sentido agora, é só me avisar que não volto a mandar mensagem.",
  follow1: "Oi! Passando só para saber se você viu minha mensagem sobre {curto}. O diagnóstico é gratuito e leva 2 minutos para ler. Quer que eu te mande?",
  follow2: "Olá! Uma última ideia para a {nome}: {beneficio}. Se quiser, preparo uma prévia de como ficaria, sem custo nenhum. Posso?",
  encerramento: "Vou parar por aqui para não incomodar. Se em algum momento quiserem melhorar {curto}, é só me chamar. Sucesso para a {nome}!",
  rejeicao: "Entendo, obrigado por responder! Só para eu entender melhor: vocês já têm alguém cuidando disso ou não é prioridade agora? " +
    "Se mudar, fico à disposição, e o diagnóstico gratuito continua valendo.",
  atencao: "Claro! Funciona assim: primeiro faço um diagnóstico gratuito da {nome} e te mostro o que dá para melhorar ({curto} é o ponto principal). " +
    "Depois, se fizer sentido, te passo uma proposta fechada, com escopo, prazo ({prazo}) e valor, sem surpresa.{portfolio_frase2} Posso preparar o diagnóstico?",
  desejo: "Que ótimo! Vou preparar a prévia da {nome}. Para acertar em cheio, me conta: hoje a maioria dos clientes chega por onde (Instagram, Google, indicação)? " +
    "E prefere que eu apresente numa chamada rápida de 15 minutos ou mando tudo por aqui?",
  aprovacao: "Perfeito, vamos nessa! Vou te enviar a proposta com escopo, prazo ({prazo}) e valores. Qual o melhor e-mail e o nome do responsável? Assim que aprovar, já começo.",
  retomar: "Oi! Passando para retomar nossa conversa sobre {curto} da {nome}. Conseguiu ver? Fico à disposição para qualquer dúvida.",
};
const NOME_ETAPA = {
  abordagem: "Primeiro contato", follow1: "Lembrete 1", follow2: "Lembrete 2 (valor)", encerramento: "Encerramento",
  rejeicao: "Resposta a rejeição", atencao: "Resposta a dúvida", desejo: "Resposta a interesse", aprovacao: "Fechamento",
  retomar: "Retomar conversa",
};

function preencherBlocos(texto, vars) {
  return texto.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

function precoDe(servicoId, perfil = {}) {
  const base = SERVICOS[servicoId] || SERVICOS.site;
  const ajuste = (perfil.precos || {})[servicoId] || {};
  return { ...base, ...ajuste, id: servicoId };
}

function fmtReais(v) { return "R$ " + Number(v || 0).toLocaleString("pt-BR"); }
function faixaPreco(p) { return `${fmtReais(p.min)} a ${fmtReais(p.max)}${p.mensal ? "/mês" : ""}${p.obs ? " " + p.obs : ""}`; }

function montarMensagem(l, etapa, analise, perfil = {}, oportunidade = null) {
  const op = oportunidade || analise.principal || OPORTUNIDADES[1];
  const d = l.dados?.diag || {};
  const servico = precoDe(op.servico, perfil);
  const base = {
    nome: l.nome, cidade: l.cidade || "sua cidade", em_cidade: emCidade(l.cidade), categoria: (l.categoria || l.nicho || "empresas").toLowerCase(),
    categorias: plural(l.categoria || l.nicho), avaliacoes: l.avaliacoes, nota: fmtNota(l.nota), mediana: analise.ctx?.mediana || "",
    dominio: d.dominio || (l.site || "").replace(/^https?:\/\/(www\.)?/, "").replace(/\/.*/, ""),
    segundos: d.ms ? Math.round(d.ms / 1000) : "", ano: d.ano_rodape || "",
  };
  const bloco = (t) => preencherBlocos(t, base);
  const elogio = l.nota >= 4.5 && l.avaliacoes >= 20
    ? `Vi a ${l.nome} no Google, nota ${fmtNota(l.nota)} com ${l.avaliacoes} avaliações. Parabéns pelo trabalho!`
    : `Encontrei a ${l.nome} pesquisando ${base.categoria} ${base.em_cidade}.`;
  const apres = perfil.nome ? `Aqui é ${perfil.nome}${perfil.marca ? `, da ${perfil.marca}` : ""}.` : "";
  const vars = {
    ...base, apresentacao: apres, elogio, problema: bloco(op.problema), impacto: bloco(op.impacto), solucao: bloco(op.solucao),
    beneficio: bloco(op.beneficio), curto: bloco(op.curto), prazo: perfil.prazo || servico.prazo,
    portfolio_frase: perfil.portfolio ? `. Alguns trabalhos estão aqui: ${perfil.portfolio}` : ", sempre com escopo e prazo combinados antes de começar.",
    portfolio_frase2: perfil.portfolio ? ` Exemplos do meu trabalho: ${perfil.portfolio}.` : "",
  };
  const roteiro = { ...ROTEIRO_PADRAO, ...(perfil.roteiro || {}) };
  return preencherBlocos(roteiro[etapa] || roteiro.abordagem, vars).replace(/\.\./g, ".").replace(/[ \t]+\n/g, "\n").trim();
}

// ── Classificação da resposta do cliente (palavras-chave; a IA pode refinar) ─────────
const PADROES = [
  ["rejeicao", /n[aã]o (tenho|temos) interesse|sem interesse|n[aã]o quero|n[aã]o preciso|n[aã]o precisamos|j[aá] (temos|tenho|possu)|n[aã]o,? obrigad|para de|pare de|n[aã]o mand|me (tira|remov)|sair da lista|n[aã]o [eé] o momento|agora n[aã]o/i],
  ["aprovacao", /vamos fazer|pode fazer|fechado|fechou|pode come[cç]ar|quero contratar|manda a proposta|manda o contrato|aceito|bora|vamos fechar|pode mandar a proposta|t[oô] dentro/i],
  ["desejo", /quero|me manda|manda sim|pode mandar|gostei|tenho interesse|temos interesse|interessante|quero ver|me mostra|mostra sim|pode sim|sim,? pode|faz sentido|show/i],
  ["atencao", /quanto|valor|pre[cç]o|custa|como funciona|o que seria|explica|qual|quem [eé]|como assim|onde|prazo|\?/i],
];
function classificarResposta(texto) {
  const t = String(texto || "").trim();
  if (!t) return null;
  for (const [tipo, rx] of PADROES) if (rx.test(t)) return tipo;
  return /^(sim|ok|pode|claro|beleza|blz)\b/i.test(t) ? "desejo" : "atencao";
}

const NOME_RESPOSTA = { rejeicao: "Rejeição", atencao: "Atenção / dúvida", desejo: "Desejo / interesse", aprovacao: "Aprovação" };
const ICONE_RESPOSTA = { rejeicao: "❌", atencao: "👀", desejo: "🔥", aprovacao: "✅" };

// ── Ciclo: em que ponto o lead está e qual a próxima ação ────────────────────────────
function ciclo(l) {
  const c = l.dados?.ciclo || {};
  return { envios: c.envios || [], respostas: c.respostas || [], encerrado: !!c.encerrado };
}

const DIA = 86400000;
// Intervalos dos lembretes. Padrão de mercado (cadência 3-7-7: dias 3, 10 e 17); com dados próprios
// suficientes, o 1º lembrete passa a ser o tempo em que 80% das suas respostas já chegaram.
function intervalos(leads) {
  const atrasos = [];
  for (const l of leads) {
    const { envios, respostas } = ciclo(l);
    const primeiroEnvio = envios.find((e) => e.etapa === "abordagem");
    const primeiraResp = respostas[0];
    if (primeiroEnvio && primeiraResp && primeiraResp.t > primeiroEnvio.t) atrasos.push((Date.parse(primeiraResp.t) - Date.parse(primeiroEnvio.t)) / DIA);
  }
  atrasos.sort((a, b) => a - b);
  if (atrasos.length >= 10) {
    const p80 = atrasos[Math.floor(atrasos.length * 0.8)];
    const f1 = Math.max(1, Math.min(5, Math.ceil(p80)));
    return { follow1: f1, follow2: Math.min(7, f1 * 2), encerramento: Math.min(7, f1 * 2), fonte: "seus dados", amostra: atrasos.length, p80 };
  }
  return { follow1: 3, follow2: 7, encerramento: 7, fonte: "padrão de mercado", amostra: atrasos.length };
}

// -> { acao, etapa, quando (Date), urgente, texto }
function proximaAcao(l, inter) {
  if (["fechado", "descartado"].includes(l.status) || l.fechado) return null;
  const { envios, respostas, encerrado } = ciclo(l);
  const ultEnvio = envios[envios.length - 1];
  const ultResp = respostas[respostas.length - 1];
  if (ultResp && (!ultEnvio || ultResp.t > ultEnvio.t)) {
    return { acao: "responder", etapa: ultResp.tipo, quando: new Date(ultResp.t), urgente: true, texto: `Responder (${NOME_RESPOSTA[ultResp.tipo]})` };
  }
  if (encerrado) return null;
  if (!ultEnvio) return l.status === "novo" ? { acao: "abordar", etapa: "abordagem", quando: new Date(l.criado_em), urgente: false, texto: "Abordar" } : null;
  const seq = { abordagem: "follow1", follow1: "follow2", follow2: "encerramento" };
  let prox = seq[ultEnvio.etapa];
  let dias = prox ? inter[prox] : 2;
  if (!prox) {
    if (ultEnvio.etapa === "encerramento") return null;
    prox = "retomar"; // conversa parou depois de uma resposta nossa
  }
  if (ultEnvio.etapa === "retomar") return null;
  const quando = new Date(Date.parse(ultEnvio.t) + dias * DIA);
  return { acao: "lembrete", etapa: prox, quando, urgente: quando <= new Date(), texto: NOME_ETAPA[prox] };
}

// ── Chance de fechamento ─────────────────────────────────────────────────────────────
// Por etapa (estimativa de partida). Com 10+ leads finalizados numa etapa, usa a sua taxa real.
const CHANCE_BASE = { novo: 10, abordagem: 8, follow1: 6, follow2: 4, encerrado: 1, rejeicao: 3, atencao: 25, desejo: 45, aprovacao: 75 };

function etapaChance(l) {
  if (l.status === "fechado") return "fechado";
  if (l.status === "descartado") return "descartado";
  const { envios, respostas, encerrado } = ciclo(l);
  const ultResp = respostas[respostas.length - 1];
  if (ultResp) return ultResp.tipo;
  if (encerrado) return "encerrado";
  const ult = envios[envios.length - 1];
  return ult ? (CHANCE_BASE[ult.etapa] != null ? ult.etapa : "abordagem") : "novo";
}

function taxasReais(leads) {
  const conta = {};
  for (const l of leads) {
    if (!["fechado", "descartado"].includes(l.status)) continue;
    const etapas = new Set(["novo"]);
    const { envios, respostas } = ciclo(l);
    envios.forEach((e) => etapas.add(e.etapa));
    respostas.forEach((r) => etapas.add(r.tipo));
    for (const e of etapas) {
      conta[e] ||= { total: 0, fechados: 0 };
      conta[e].total++;
      if (l.status === "fechado") conta[e].fechados++;
    }
  }
  const out = {};
  for (const [e, c] of Object.entries(conta)) if (c.total >= 10) out[e] = Math.round((c.fechados / c.total) * 100);
  return out;
}

function chanceFechamento(l, analise, reais = {}) {
  const e = etapaChance(l);
  if (e === "fechado") return { pct: 100, fonte: "", etapa: e };
  if (e === "descartado") return { pct: 0, fonte: "", etapa: e };
  let pct, fonte;
  if (reais[e] != null) { pct = reais[e]; fonte = "seus dados"; }
  else {
    pct = CHANCE_BASE[e] ?? 8;
    // o potencial de abordagem ajusta a estimativa para mais ou para menos
    pct = Math.round(pct * (0.6 + (analise.potencial || 40) / 100));
    fonte = "estimativa";
  }
  return { pct: Math.max(0, Math.min(99, pct)), fonte, etapa: e };
}

function termometro(pct) {
  if (pct >= 40) return { nome: "Quente", icone: "🔥" };
  if (pct >= 15) return { nome: "Morno", icone: "🌤️" };
  return { nome: "Frio", icone: "❄️" };
}

window.Vendas = {
  SERVICOS, GRUPOS, OPORTUNIDADES, ROTEIRO_PADRAO, NOME_ETAPA, NOME_RESPOSTA, ICONE_RESPOSTA,
  contextoComparacao, analisar, montarMensagem, classificarResposta, ciclo, intervalos, proximaAcao,
  taxasReais, chanceFechamento, termometro, precoDe, faixaPreco, fmtReais, soRede, precisaAnalise, etapaChance,
};
