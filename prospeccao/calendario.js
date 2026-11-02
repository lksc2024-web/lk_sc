// Calendário de datas: feriados (país, estado e capital), vésperas, pontes e datas comerciais.
// Diz como cada dia mexe com a rotina de cada setor e quais nichos estão na janela certa para
// receber uma proposta (semanas antes da data em que eles mais vendem). Usado pela Prospecção e pela Central.
(function () {
  "use strict";
  const semAcento = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const DIA = 86400000;
  const iso = (t) => new Date(t).toISOString().slice(0, 10);
  const tempo = (s) => { const [a, m, d] = s.split("-").map(Number); return Date.UTC(a, m - 1, d, 12); };
  const somar = (s, n) => iso(tempo(s) + n * DIA);
  const dif = (a, b) => Math.round((tempo(b) - tempo(a)) / DIA); // dias de a até b
  const dowDe = (s) => new Date(tempo(s)).getUTCDay();
  const D = (a, m, d) => iso(Date.UTC(a, m - 1, d, 12));
  function pascoa(a) { // algoritmo de Meeus
    const b = a % 19, c = Math.floor(a / 100), d = a % 100, e = Math.floor(c / 4), f = c % 4, g = Math.floor((c + 8) / 25),
      h = Math.floor((c - g + 1) / 3), i = (19 * b + c - e - h + 15) % 30, k = Math.floor(d / 4), l = d % 4,
      m = (32 + 2 * f + 2 * k - i - l) % 7, n = Math.floor((b + 11 * i + 22 * m) / 451), mes = Math.floor((i + m - 7 * n + 114) / 31);
    return D(a, mes, ((i + m - 7 * n + 114) % 31) + 1);
  }
  function enesimo(a, mes, dow, n) { // n-ésimo dia da semana do mês (n = 2: segundo domingo...)
    let s = D(a, mes, 1); while (dowDe(s) !== dow) s = somar(s, 1); return somar(s, 7 * (n - 1));
  }
  const blackFriday = (a) => somar(enesimo(a, 11, 4, 4), 1);
  const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  const curta = (s) => { const [, m, d] = s.split("-").map(Number); return `${d}/${MESES[m - 1]}`; };
  const longa = (s) => { const [a, m, d] = s.split("-").map(Number); return `${DIAS[dowDe(s)]}, ${d} de ${MESES[m - 1]} de ${a}`; };

  // Datas comerciais do Brasil. inicio/fim: quando o negócio está no pico (ocupado);
  // antes/ate: janela para oferecer site ou campanha, em dias antes do início (ex.: 45 a 5 dias antes).
  function comerciaisBR(a) {
    const P = pascoa(a), bf = blackFriday(a);
    return [
      { id: "janeiro-branco", nome: "Janeiro Branco", icone: "🤍", inicio: D(a, 1, 1), fim: D(a, 1, 31), antes: 35, ate: 3, tipos: [], re: /psic|terap|psiquiat/, sugestoes: ["psicólogo", "terapeuta"], oferta: "página de agendamento de sessões" },
      { id: "volta-aulas", nome: "Volta às aulas", icone: "🎒", inicio: enesimo(a, 2, 1, 1), fim: somar(enesimo(a, 2, 1, 1), 10), antes: 50, ate: 7, tipos: ["Educação"], re: /papelar|uniforme|livrar/, sugestoes: ["papelaria", "escola", "curso de idiomas"], oferta: "página de matrícula e lista de material" },
      { id: "carnaval", nome: "Carnaval", icone: "🎭", dia: somar(P, -47), inicio: somar(P, -50), fim: somar(P, -46), antes: 40, ate: 4, tipos: ["Restaurantes e bares", "Eventos"], re: /fantasia|maquia|bloco/, sugestoes: ["bar", "loja de fantasias", "salão de festas"], oferta: "página do evento com reservas" },
      { id: "mulher", nome: "Dia da Mulher", icone: "🌷", inicio: D(a, 3, 8), fim: D(a, 3, 8), antes: 30, ate: 3, tipos: ["Beleza"], re: /floricult|perfum|cosmet|joalher/, sugestoes: ["salão de beleza", "estética", "floricultura"], oferta: "pacote promocional com agendamento", desconto: true },
      { id: "consumidor", nome: "Dia do Consumidor", icone: "🏷️", inicio: D(a, 3, 15), fim: D(a, 3, 15), antes: 30, ate: 4, tipos: ["Lojas"], sugestoes: ["loja de roupas", "ótica", "loja de móveis"], oferta: "página de ofertas com cupom", desconto: true },
      { id: "pascoa", nome: "Páscoa", icone: "🐣", dia: P, inicio: somar(P, -6), fim: P, antes: 45, ate: 7, tipos: ["Padarias e cafés"], re: /chocolat|doce|confeit/, sugestoes: ["confeitaria", "chocolateria", "padaria"], oferta: "catálogo de encomendas pelo WhatsApp" },
      { id: "ir", nome: "Temporada do Imposto de Renda", icone: "🧾", inicio: D(a, 4, 15), fim: D(a, 5, 31), antes: 50, ate: 5, tipos: [], re: /contab|contador/, sugestoes: ["contabilidade"], oferta: "página para captar declarações de IR" },
      { id: "maes", nome: "Dia das Mães", icone: "💐", inicio: somar(enesimo(a, 5, 0, 2), -3), fim: enesimo(a, 5, 0, 2), antes: 40, ate: 4, tipos: ["Lojas", "Beleza", "Restaurantes e bares", "Padarias e cafés"], re: /floricult|perfum|joalher|cesta/, sugestoes: ["floricultura", "perfumaria", "restaurante", "salão de beleza"], oferta: "vitrine de presentes e reservas", desconto: true },
      { id: "namorados", nome: "Dia dos Namorados", icone: "❤️", inicio: D(a, 6, 12), fim: D(a, 6, 12), antes: 35, ate: 3, tipos: ["Restaurantes e bares", "Lojas", "Beleza"], re: /floricult|perfum|joalher|chocolat|cesta/, sugestoes: ["restaurante", "joalheria", "floricultura"], oferta: "reservas e kits de presente", desconto: true },
      { id: "juninas", nome: "Festas juninas", icone: "🌽", dia: D(a, 6, 24), inicio: D(a, 6, 6), fim: D(a, 6, 29), antes: 40, ate: 5, tipos: ["Eventos"], re: /quadrilha|festa|buffet|doce|milho/, sugestoes: ["buffet", "salão de festas", "confeitaria"], oferta: "página de encomendas e eventos juninos" },
      { id: "ferias-julho", nome: "Férias de julho", icone: "🏖️", inicio: D(a, 7, 1), fim: D(a, 7, 31), antes: 35, ate: 5, tipos: ["Turismo e hospedagem"], re: /coloni|recrea|brinqued|infantil/, sugestoes: ["pousada", "colônia de férias", "buffet infantil"], oferta: "página de reservas e inscrições" },
      { id: "viagem-julho", nome: "Revisão para viagens de julho", icone: "🚗", inicio: D(a, 7, 1), fim: D(a, 7, 15), antes: 30, ate: 3, tipos: ["Automotivo"], sugestoes: ["oficina mecânica", "autopeças", "loja de pneus"], oferta: "agendamento de revisão online" },
      { id: "pais", nome: "Dia dos Pais", icone: "👔", inicio: somar(enesimo(a, 8, 0, 2), -3), fim: enesimo(a, 8, 0, 2), antes: 35, ate: 3, tipos: ["Lojas", "Restaurantes e bares"], re: /barbe|churrasc|cervej/, sugestoes: ["barbearia", "loja de roupas", "churrascaria"], oferta: "vitrine de presentes e combos", desconto: true },
      { id: "cliente", nome: "Dia do Cliente", icone: "🤝", inicio: D(a, 9, 15), fim: D(a, 9, 15), antes: 25, ate: 3, tipos: ["Lojas", "Beleza", "Pet", "Automotivo"], sugestoes: ["pet shop", "ótica", "loja de roupas"], oferta: "campanha de fidelidade com cupom", desconto: true },
      { id: "criancas", nome: "Dia das Crianças", icone: "🧸", inicio: D(a, 10, 12), fim: D(a, 10, 12), antes: 35, ate: 3, tipos: ["Eventos"], re: /brinqued|infantil|kids/, sugestoes: ["loja de brinquedos", "buffet infantil", "escola infantil"], oferta: "catálogo e reservas de festa", desconto: true },
      { id: "outubro-rosa", nome: "Outubro Rosa", icone: "🎗️", inicio: D(a, 10, 1), fim: D(a, 10, 31), antes: 30, ate: 3, tipos: ["Saúde"], peso: 0.6, re: /mastolog|ginecolog|mamograf|imagem|laborat/, sugestoes: ["clínica de imagem", "ginecologista", "laboratório"], oferta: "campanha de prevenção com agendamento" },
      { id: "finados", nome: "Finados", icone: "🌼", inicio: D(a, 11, 2), fim: D(a, 11, 2), antes: 20, ate: 2, tipos: [], re: /floricult|flores|funerar|marmor/, sugestoes: ["floricultura"], oferta: "catálogo de coroas e arranjos com entrega" },
      { id: "novembro-azul", nome: "Novembro Azul", icone: "💙", inicio: D(a, 11, 1), fim: D(a, 11, 30), antes: 30, ate: 3, tipos: ["Saúde"], peso: 0.6, re: /urolog|laborat|check.?up/, sugestoes: ["urologista", "laboratório", "clínica"], oferta: "campanha de prevenção com agendamento" },
      { id: "black-friday", nome: "Black Friday", icone: "🖤", dia: bf, inicio: somar(bf, -1), fim: somar(bf, 3), antes: 50, ate: 5, tipos: ["Lojas", "Academias e estúdios", "Educação", "Beleza", "Pet"], sugestoes: ["loja de roupas", "loja de móveis", "academia", "curso de idiomas"], oferta: "página de ofertas com contagem regressiva", desconto: true },
      { id: "confra", nome: "Confraternizações de fim de ano", icone: "🥂", inicio: D(a, 11, 25), fim: D(a, 12, 20), antes: 45, ate: 5, tipos: ["Restaurantes e bares", "Eventos"], sugestoes: ["restaurante", "churrascaria", "buffet", "salão de festas"], oferta: "reservas para grupos e empresas" },
      { id: "matriculas", nome: "Matrículas do próximo ano", icone: "📝", inicio: D(a, 12, 1), fim: D(a + 1, 1, 31), antes: 75, ate: 0, tipos: ["Educação"], sugestoes: ["escola", "escola infantil", "curso de idiomas"], oferta: "página de matrícula com formulário" },
      { id: "reformas", nome: "Reformas antes das festas", icone: "🛠️", inicio: D(a, 12, 15), fim: D(a, 12, 24), antes: 70, ate: 20, tipos: ["Obras e serviços"], re: /moveis|decora|planejad/, sugestoes: ["marcenaria", "vidraçaria", "loja de móveis"], oferta: "página de orçamento rápido" },
      { id: "natal", nome: "Natal", icone: "🎄", dia: D(a, 12, 25), inicio: D(a, 12, 15), fim: D(a, 12, 25), antes: 50, ate: 5, tipos: ["Lojas", "Padarias e cafés"], re: /cesta|panetone|chocolat|perfum|brinqued|joalher/, sugestoes: ["loja de roupas", "confeitaria", "perfumaria", "loja de brinquedos"], oferta: "catálogo de presentes e encomendas de ceia", desconto: true },
      { id: "viagem-dezembro", nome: "Revisão para viagens de fim de ano", icone: "🚗", inicio: D(a, 12, 18), fim: D(a, 12, 31), antes: 35, ate: 3, tipos: ["Automotivo"], sugestoes: ["oficina mecânica", "autopeças", "loja de pneus"], oferta: "agendamento de revisão online" },
      { id: "verao", nome: "Verão", icone: "☀️", inicio: D(a, 12, 21), fim: D(a + 1, 2, 28), antes: 100, ate: 10, tipos: ["Academias e estúdios", "Beleza", "Turismo e hospedagem"], re: /ar.?condicionado|climatiz|piscina|praia|biquini|sorvet|acai/, sugestoes: ["academia", "estética", "ar-condicionado", "pousada"], oferta: "campanha de verão com agendamento online" },
      { id: "reveillon", nome: "Réveillon", icone: "🎆", dia: D(a, 12, 31), inicio: D(a, 12, 31), fim: D(a + 1, 1, 1), antes: 50, ate: 7, tipos: ["Restaurantes e bares", "Eventos", "Turismo e hospedagem"], sugestoes: ["restaurante", "salão de festas", "pousada"], oferta: "venda de ingressos e reservas da virada" },
    ];
  }
  // Fora do Brasil: as datas que valem em quase todo lugar, mais Dia das Mães, dos Pais e dos Namorados de cada país.
  function comerciaisFora(a, obs) {
    const base = comerciaisBR(a).filter((e) => ["black-friday", "natal", "reveillon", "pascoa", "confra"].includes(e.id));
    const modelo = Object.fromEntries(comerciaisBR(a).map((e) => [e.id, e]));
    for (const [data, , nome] of obs) {
      if (!data.startsWith(String(a))) continue;
      const n = semAcento(nome);
      const id = /mae|mother|madre|mere|mutter|madri|moeder|mama/.test(n) ? "maes" : /pai|father|padre|pere|vater|vader|papa/.test(n) ? "pais" : /valent|namorad|enamorad/.test(n) ? "namorados" : null;
      if (id) base.push({ ...modelo[id], nome: nome, inicio: somar(data, id === "namorados" ? 0 : -3), fim: data });
    }
    return base;
  }

  // Como um dia fora do comum mexe com cada setor (multiplica a chance de resposta).
  const FERIADO = { "Restaurantes e bares": 0.35, "Padarias e cafés": 0.45, "Saúde": 0.5, "Beleza": 0.5, "Academias e estúdios": 0.55, "Pet": 0.55,
    "Imobiliário": 0.5, "Escritórios": 0.45, "Automotivo": 0.6, "Obras e serviços": 0.62, "Lojas": 0.35, "Educação": 0.45, "Eventos": 0.3, "Turismo e hospedagem": 0.3, "Outros": 0.5 };
  const PONTE = { "Escritórios": 0.6, "Educação": 0.6, "Saúde": 0.75, "Imobiliário": 0.7, "Turismo e hospedagem": 0.5, "Restaurantes e bares": 0.8, "Lojas": 0.8 };
  const VESPERA = { "Restaurantes e bares": 0.8, "Lojas": 0.85, "Eventos": 0.85, "Padarias e cafés": 0.85, "Turismo e hospedagem": 0.75 };

  const C = { dados: null, promessa: null };
  function carregar(url) {
    if (C.dados) return Promise.resolve(C.dados);
    if (!C.promessa) C.promessa = fetch(url).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then((j) => { C.dados = j; return j; }).catch(() => { C.promessa = null; return null; });
    return C.promessa;
  }
  // Feriados de um lugar: país, e no Brasil também o estado e a capital (quando for a cidade).
  function feriadosDe(local = {}) {
    const F = C.dados; if (!F) return [];
    const pais = local.pais || "BR";
    const out = (F.paises[pais] || []).map((x) => ({ data: x[0], tipo: x[1], nome: x[2], nivel: "nacional" }));
    if (pais === "BR" && local.uf) {
      (F.br.uf[local.uf] || []).forEach((x) => out.push({ data: x[0], tipo: x[1], nome: x[2], nivel: "estadual" }));
      if (local.cidade) {
        const k = Object.keys(F.br.cidade).find((c) => semAcento(c) === semAcento(`${local.cidade}|${local.uf}`));
        (k ? F.br.cidade[k] : []).forEach((x) => out.push({ data: x[0], tipo: x[1], nome: x[2], nivel: "municipal" }));
      }
    }
    return out;
  }
  const cacheCom = {};
  function comerciais(ano, local = {}) {
    const pais = local.pais || "BR", k = `${pais}${ano}`;
    if (!cacheCom[k]) {
      const obs = C.dados ? (C.dados.paises[pais] || []).filter((x) => x[1] === "o") : [];
      cacheCom[k] = pais === "BR" ? comerciaisBR(ano) : comerciaisFora(ano, obs);
    }
    return cacheCom[k];
  }

  // Feriados que viram feriadão (sexta, segunda, ou terça/quinta com ponte) geram uma janela para turismo e lazer.
  function feriadoes(ano, local) {
    return feriadosDe(local).filter((f) => f.tipo === "f" && f.data.startsWith(String(ano)) && [1, 2, 4, 5].includes(dowDe(f.data)))
      .map((f) => ({ id: "feriadao-" + f.data, nome: `Feriadão: ${f.nome}`, icone: "🧳", inicio: f.data, fim: f.data, antes: 30, ate: 4,
        tipos: ["Turismo e hospedagem"], re: /pousada|hotel|turism|passeio|temporada|camping|chale/, sugestoes: ["pousada", "hotel", "agência de turismo"], oferta: "página de reservas para o feriadão" }));
  }
  // dia: a data que dá nome ao evento (o pico pode começar antes, como na Black Friday)
  const diaDoEvento = (e) => e.dia || (dif(e.inicio, e.fim) <= 3 ? e.fim : e.inicio);
  function eventosPerto(data, local) {
    const a = +data.slice(0, 4);
    return [a - 1, a, a + 1].flatMap((x) => comerciais(x, local).concat(feriadoes(x, local))).map((e) => (e.dia ? e : { ...e, dia: diaDoEvento(e) }));
  }

  // Força de uma data comercial para um nicho num dia: 0 (fora da janela) a 1 (melhor momento de oferecer).
  function forcaJanela(ev, data) {
    const d = dif(data, ev.inicio); // dias até o início do pico
    if (d > ev.antes || dif(ev.fim, data) > 0) return { v: 0, d, fase: "fora" };
    if (d <= 0) return { v: 0, d, fase: "pico" };
    if (d < ev.ate) return { v: 0.3, d, fase: "em cima" };
    const span = ev.antes - ev.ate, pos = (ev.antes - d) / (span || 1); // 0 no começo da janela, 1 no fim
    const v = pos < 0.25 ? 0.45 + pos / 0.25 * 0.55 : pos > 0.8 ? 1 - (pos - 0.8) / 0.2 * 0.35 : 1;
    return { v, d, fase: pos < 0.25 ? "começo" : pos > 0.8 ? "reta final" : "ideal" };
  }
  const casa = (ev, nicho, tipo) => (ev.re && ev.re.test(semAcento(nicho))) || ev.sugestoes.some((s) => semAcento(s) === semAcento(nicho)) ? 1
    : ev.tipos.includes(tipo) ? (ev.peso || 1) : 0;

  // Contexto de um dia (AAAA-MM-DD) num lugar: feriado, véspera, ponte, datas comerciais em jogo
  // e as duas funções que vendas.js usa: fatorDia(tipo) e oportunidade(nicho, tipo).
  const cacheCtx = {};
  function contextoDia(data, local = {}) {
    const k = `${data}|${local.pais || "BR"}|${local.uf || ""}|${local.cidade || ""}|${C.dados ? 1 : 0}`;
    if (cacheCtx[k]) return cacheCtx[k];
    const fer = feriadosDe(local);
    const no = (s) => fer.filter((f) => f.data === s && f.tipo !== "o");
    const hoje = no(data), amanha = no(somar(data, 1)), dow = dowDe(data);
    const feriado = hoje.find((f) => f.tipo === "f") || null;
    const facultativo = !feriado ? hoje.find((f) => f.tipo === "p") || null : null;
    const vespera = !feriado && amanha.some((f) => f.tipo === "f") ? amanha.find((f) => f.tipo === "f") : null;
    const ponte = !feriado && ((dow === 1 && no(somar(data, 1)).some((f) => f.tipo === "f")) || (dow === 5 && no(somar(data, -1)).some((f) => f.tipo === "f")));
    const eventos = eventosPerto(data, local).map((ev) => ({ ev, ...forcaJanela(ev, data) })).filter((x) => x.fase !== "fora");
    const pico = eventos.filter((x) => x.fase === "pico");
    const fimDeSemana = dow === 0 || dow === 6;
    const ctx = {
      data, dow, feriado, facultativo, vespera, ponte, eventos, pico,
      observancias: fer.filter((f) => f.data === data && f.tipo === "o"),
      fatorDia(tipo) {
        let m = 1;
        if (feriado) m *= fimDeSemana ? 0.9 : (FERIADO[tipo] ?? 0.5);
        else if (facultativo) m *= fimDeSemana ? 0.95 : (1 + (FERIADO[tipo] ?? 0.5)) / 2;
        if (ponte) m *= PONTE[tipo] ?? 0.85;
        if (vespera) m *= VESPERA[tipo] ?? 0.95;
        if (pico.some((x) => x.ev.tipos.includes(tipo))) m *= 0.8; // no pico da data o dono está ocupado vendendo
        return m;
      },
      oportunidade(nicho, tipo) {
        let melhor = { v: 0 };
        for (const x of eventos) {
          if (x.v <= 0) continue;
          const c = casa(x.ev, nicho, tipo); if (!c) continue;
          const v = x.v * c; if (v > melhor.v) melhor = { v, ev: x.ev, dias: x.d, fase: x.fase };
        }
        return melhor;
      },
    };
    cacheCtx[k] = ctx;
    return ctx;
  }

  // O que o dia significa para quem prospecta, em uma frase.
  function resumoDia(ctx) {
    const nivel = (f) => f.nivel === "nacional" ? "Feriado nacional" : f.nivel === "estadual" ? "Feriado estadual" : "Feriado municipal";
    if (ctx.feriado) return { titulo: `${nivel(ctx.feriado)}: ${ctx.feriado.nome}`, tipo: "feriado",
      texto: "Escritórios, clínicas e escolas fechados; restaurantes, lojas de shopping e turismo cheios. Quem trabalha em campo (oficinas, obras) responde melhor. Bom dia para montar a lista e deixar os envios para o próximo dia útil." };
    if (ctx.facultativo) return { titulo: `Ponto facultativo: ${ctx.facultativo.nome}`, tipo: "facultativo",
      texto: "Muita gente folga. Mande cedo e priorize quem costuma abrir nesses dias." };
    if (ctx.ponte) return { titulo: "Dia de ponte (emenda de feriado)", tipo: "ponte",
      texto: "Escritórios e escolas costumam emendar. Comércio e serviços de rua seguem abertos." };
    if (ctx.vespera) return { titulo: `Véspera de feriado: ${ctx.vespera.nome}`, tipo: "vespera",
      texto: "Manhã rende; à tarde o movimento cai e restaurantes e lojas se preparam para o feriado." };
    if (ctx.dow === 0 || ctx.dow === 6) return { titulo: "Fim de semana", tipo: "fds", texto: "Quem atende no sábado está ocupado; serviços de campo respondem mais." };
    return { titulo: "Dia útil comum", tipo: "util", texto: "Siga os horários de cada setor." };
  }

  // Datas que mexem com o dia escolhido: oportunidades abertas (ordem: mais forte primeiro) e picos.
  function oportunidadesDoDia(ctx) {
    return ctx.eventos.filter((x) => x.v > 0).sort((a, b) => b.v - a.v || a.d - b.d);
  }

  // Plano em sequência: semana a semana, quais datas chegam e quais nichos abordar em cada uma.
  function planoSemanas(data, n, local) {
    let seg = data; while (dowDe(seg) !== 1) seg = somar(seg, -1);
    const vistos = {};
    const out = [];
    for (let w = 0; w < n; w++) {
      const ini = somar(seg, 7 * w), fim = somar(ini, 6), meio = somar(ini, 2);
      const fer = feriadosDe(local).filter((f) => f.tipo !== "o" && f.data >= ini && f.data <= fim);
      const evs = eventosPerto(meio, local);
      const datas = fer.map((f) => ({ data: f.data, nome: f.nome, tipo: f.tipo === "f" ? "feriado" : "facultativo", icone: f.tipo === "f" ? "🔴" : "🟠" }))
        .concat(evs.filter((e) => e.dia >= ini && e.dia <= fim && !e.id.startsWith("feriadao") && !fer.some((f) => f.data === e.dia))
          .map((e) => ({ data: e.dia, nome: e.nome, tipo: "comercial", icone: e.icone, desconto: !!e.desconto })))
        .sort((a, b) => a.data.localeCompare(b.data));
      const foco = evs.map((ev) => ({ ev, ...forcaJanela(ev, meio) })).filter((x) => x.v >= 0.45 && x.fase !== "em cima")
        .sort((a, b) => b.v * (b.ev.peso || 1) - a.v * (a.ev.peso || 1) || a.d - b.d).slice(0, 4)
        .map((x) => {
          const etapa = !vistos[x.ev.id] ? "começar" : x.fase === "reta final" ? "última chamada" : "continuar";
          vistos[x.ev.id] = 1;
          return { ...x, etapa, prazo: somar(x.ev.inicio, -x.ev.ate) };
        });
      out.push({ ini, fim, rotulo: `${curta(ini)} a ${curta(fim)}`, datas, foco });
    }
    return out;
  }

  // Data de hoje no fuso do mercado (o "hoje" de Lisboa pode ser amanhã em Brasília).
  function hojeEm(tz) {
    try { return new Intl.DateTimeFormat("en-CA", { timeZone: tz || "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
    catch { return iso(Date.now()); }
  }

  window.Calendario = { carregar, pronto: () => !!C.dados, contextoDia, resumoDia, oportunidadesDoDia, planoSemanas, feriadosDe, hojeEm,
    somar, dif, dowDe, curta, longa, pascoa, blackFriday, comerciais, FERIADO };
})();
