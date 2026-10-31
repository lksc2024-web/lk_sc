// Melhores do momento: qual nicho abordar de manhã, à tarde e à noite, em cada dia da semana,
// no Brasil ou fora dele, e quais leads (com alguma forma de contato) valem mais agora.
// Usa o estado e as funções do app.js e as regras de vendas.js.
"use strict";

const mel = {
  dia: null,        // null = hoje (acompanha sozinho)
  periodo: null,    // null = agora
  nichos: [],       // nichos escolhidos para comparar (vazio = todos os que fazem sentido)
  area: "",         // "", "c:Cidade|UF" ou "b:Bairro|Cidade"
  raio: 0,          // km em volta da área (0 = só a área)
  mercado: "BR",    // "BR" ou o código do país
  verTodos: false,
};

function melFuso() {
  if (mel.mercado === "BR") return "America/Sao_Paulo";
  const P = estado.mundoDados?.paises[mel.mercado];
  return P?.cidades[0]?.[4] || "America/Sao_Paulo";
}
function melAgora() { return Vendas.horaEm(melFuso()); }
function melDia() { return mel.dia ?? melAgora().dow; }
function melPeriodo() {
  if (mel.periodo) return mel.periodo;
  const p = Vendas.periodoDe(melAgora().h);
  return p ? p.id : (melAgora().h < 7 ? "manha" : "manha");
}

// Leads do mercado escolhido (Brasil = sem país gravado ou BR).
function leadsDoMercado() {
  return estado.leads.filter((l) => {
    const p = l.dados?.geo?.pais || "BR";
    return mel.mercado === "BR" ? p === "BR" : p === mel.mercado;
  });
}

// Áreas que já têm leads: cidades e bairros, com o centro de cada uma (para o raio).
function areasDosLeads(leads) {
  const cid = {}, bai = {};
  for (const l of leads) {
    if (!l.cidade) continue;
    const kc = `c:${l.cidade}|${l.uf || ""}`; (cid[kc] ||= { n: 0, pts: [] }).n++;
    if (l.bairro) { const kb = `b:${l.bairro}|${l.cidade}`; (bai[kb] ||= { n: 0, pts: [] }).n++; if (l.dados?.geo) bai[kb].pts.push(l.dados.geo); }
    if (l.dados?.geo) cid[kc].pts.push(l.dados.geo);
  }
  const centro = (pts) => pts.length ? { lat: pts.reduce((s, p) => s + p.lat, 0) / pts.length, lng: pts.reduce((s, p) => s + p.lng, 0) / pts.length } : null;
  const lista = (o) => Object.entries(o).sort((a, b) => b[1].n - a[1].n).map(([k, v]) => ({ k, n: v.n, centro: centro(v.pts) }));
  return { cidades: lista(cid), bairros: lista(bai).slice(0, 40) };
}
function filtroArea(areas) {
  if (!mel.area) return null;
  const [tipo, resto] = [mel.area[0], mel.area.slice(2)];
  const [a, b] = resto.split("|");
  const info = [...areas.cidades, ...areas.bairros].find((x) => x.k === mel.area);
  const dentro = tipo === "c" ? (l) => l.cidade === a && (l.uf || "") === b : (l) => l.bairro === a && l.cidade === b;
  if (!mel.raio || !info?.centro) return dentro;
  return (l) => dentro(l) || (l.dados?.geo && Regiao.distKm(info.centro, l.dados.geo) <= mel.raio);
}
function rotuloArea() {
  if (!mel.area) return mel.mercado === "BR" ? "todas as áreas" : estado.mundoDados?.paises[mel.mercado]?.nome || "";
  const [a, b] = mel.area.slice(2).split("|");
  const base = mel.area[0] === "c" ? a : `${a}, ${b}`;
  return mel.raio ? `${base} + ${mel.raio} km` : base;
}

// Nichos em jogo: os escolhidos, ou todos (os seus primeiro, depois os de referência).
function nichosEmJogo(leads) {
  if (mel.nichos.length) return mel.nichos;
  // sem escolha: os seus nichos e um exemplo de cada setor que você ainda não tem (sem repetir setor)
  const seus = [...new Set(leads.map((l) => l.nicho).filter(Boolean))];
  const tipos = new Set(seus.map((n) => Vendas.rotinaDe(n).tipo));
  const ref = Vendas.ROTINA_NICHO.filter((r) => !tipos.has(r.tipo)).map((r) => r.exemplos[0]);
  return [...seus, ...ref];
}
const capN = (n) => n ? n[0].toUpperCase() + n.slice(1) : n;

function horaLocalRotulo(rotulo) {
  if (mel.mercado === "BR") return rotulo;
  const dif = Vendas.difFuso(melFuso());
  if (!dif) return rotulo;
  const [a, b] = rotulo.replace("h", "").split("–").map((x) => parseInt(x, 10));
  const br = (h) => ((h - dif) % 24 + 24) % 24;
  return `${rotulo} lá (${br(a)}–${br(b)}h em Brasília)`;
}

function renderMelhores() {
  if (mel.mercado !== "BR" && !estado.mundoDados) { carregarMundo().then(renderMelhores); return; }
  const leads = leadsDoMercado();
  const areas = areasDosLeads(leads);
  if (mel.area && ![...areas.cidades, ...areas.bairros].some((x) => x.k === mel.area)) mel.area = "";
  const fArea = filtroArea(areas);
  const naArea = fArea ? leads.filter(fArea) : leads;
  const dados = Vendas.desempenhoNichos(estado.leads);
  const dow = melDia(), per = melPeriodo(), agora = melAgora();
  const nichos = nichosEmJogo(leads);
  const comContato = (n) => naArea.filter((l) => Vendas.semAcento(l.nicho || "") === Vendas.semAcento(n) && Vendas.temContato(l) &&
    !["fechado", "descartado"].includes(l.status)).length;

  // ── Filtros ──
  const catalogo = Vendas.catalogoNichos(estado.leads);
  const visiveis = mel.verTodos ? catalogo : catalogo.slice(0, 16);
  const sel = new Set(mel.nichos.map(Vendas.semAcento));
  const M = estado.mundoDados;
  const paises = M ? ORDEM_CONTINENTES.filter((c) => M.continentes[c]).map((c) =>
    `<optgroup label="${c}">${M.continentes[c].filter((x) => x !== "BR").map((iso) => `<option value="${iso}"${iso === mel.mercado ? " selected" : ""}>${esc(M.paises[iso].nome)}</option>`).join("")}</optgroup>`).join("") : "";
  const dif = Vendas.difFuso(melFuso());
  $("#mel-filtros").innerHTML = `
    <h2>Onde e quando prospectar</h2>
    <div class="segmento" style="grid-template-columns:1fr 1fr" id="mel-mercado">
      <button type="button" data-m="BR" aria-pressed="${mel.mercado === "BR"}"><b>🇧🇷 Brasil</b><span>nacional</span></button>
      <button type="button" data-m="fora" aria-pressed="${mel.mercado !== "BR"}"><b>🌎 Fora do Brasil</b><span>internacional</span></button>
    </div>
    ${mel.mercado !== "BR" ? `<label class="campo" for="mel-pais">País</label><select id="mel-pais">${paises || `<option>Carregando…</option>`}</select>
      <p class="mel-fuso">Agora lá: <b>${agora.h}h de ${Vendas.DIAS_CURTO[agora.dow].toLowerCase()}</b>${dif ? ` · ${Math.abs(dif)}h ${dif > 0 ? "à frente de" : "atrás de"} Brasília` : ""}. Os horários abaixo são os de lá.</p>` : ""}
    <div class="linha-rotulo"><label class="campo">Dia</label><small>${mel.dia == null ? "acompanhando hoje" : ""}</small></div>
    <div class="chips quebra" id="mel-dia">
      <button class="chip" data-d="" aria-pressed="${mel.dia == null}">Hoje</button>
      ${[1, 2, 3, 4, 5, 6, 0].map((d) => `<button class="chip" data-d="${d}" aria-pressed="${mel.dia === d}">${Vendas.DIAS_CURTO[d]}</button>`).join("")}
    </div>
    <label class="campo">Período</label>
    <div class="chips quebra" id="mel-periodo">
      <button class="chip" data-p="" aria-pressed="${mel.periodo == null}">Agora</button>
      ${Vendas.PERIODOS.map((p) => `<button class="chip" data-p="${p.id}" aria-pressed="${mel.periodo === p.id}">${p.icone} ${p.nome}</button>`).join("")}
    </div>
    <div class="linha-rotulo"><label class="campo">Nichos para comparar</label><small>${mel.nichos.length ? `${mel.nichos.length} escolhidos · <a href="#" id="mel-limpar">limpar</a>` : "escolha dois ou mais"}</small></div>
    <div class="chips quebra" id="mel-nichos">
      ${visiveis.map((n) => `<button class="chip" data-n="${esc(n)}" aria-pressed="${sel.has(Vendas.semAcento(n))}">${esc(capN(n))}</button>`).join("")}
      <button class="chip" id="mel-ver-todos">${mel.verTodos ? "Mostrar menos" : `+ ${catalogo.length - visiveis.length} nichos`}</button>
    </div>
    <div class="grade2">
      <div><label class="campo" for="mel-area">Área</label>
        <select id="mel-area"><option value="">${mel.mercado === "BR" ? "Todas as áreas" : "Todo o país"}</option>
          ${areas.cidades.length ? `<optgroup label="Cidades">${areas.cidades.map((a) => `<option value="${esc(a.k)}"${a.k === mel.area ? " selected" : ""}>${esc(a.k.slice(2).replace("|", " - "))} (${a.n})</option>`).join("")}</optgroup>` : ""}
          ${areas.bairros.length ? `<optgroup label="Bairros">${areas.bairros.map((a) => `<option value="${esc(a.k)}"${a.k === mel.area ? " selected" : ""}>${esc(a.k.slice(2).replace("|", ", "))} (${a.n})</option>`).join("")}</optgroup>` : ""}
        </select></div>
      <div><label class="campo" for="mel-raio">Raio em volta: <b>${mel.raio ? mel.raio + " km" : "só a área"}</b></label>
        <input id="mel-raio" type="range" min="0" max="30" step="1" value="${mel.raio}" style="width:100%; accent-color:var(--pri)" ${mel.area ? "" : "disabled"}></div>
    </div>`;

  // ── Melhor nicho por período ──
  const ranking = Vendas.rankingPeriodos(nichos, dow, dados);
  const nomeDia = mel.dia == null ? `hoje (${Vendas.DIAS_CURTO[dow].toLowerCase()})` : Vendas.DIAS_CURTO[dow].toLowerCase();
  const topo = Math.max(...ranking.flatMap((p) => p.nichos.slice(0, 1).map((n) => n.taxa)), 0.01);
  $("#mel-periodos").innerHTML = `<h2>Melhor nicho por período · ${nomeDia}</h2>
    <p class="dica" style="margin:-6px 0 12px">Chance de resposta estimada pela rotina de cada setor${Object.keys(dados).length ? " e pelos seus envios" : ""}, em ${esc(rotuloArea())}. Toque num nicho para ver os leads ou buscar.</p>
    <div class="mel-periodos">${ranking.map((p) => `
      <div class="mel-per${p.id === per ? " sel" : ""}">
        <h3>${p.icone} ${p.nome}<small>${p.id === per && mel.dia == null && mel.periodo == null ? "agora" : ""}</small></h3>
        ${p.nichos.slice(0, 4).map((n) => {
          const c = comContato(n.nicho);
          return `<button class="mel-linha" data-nicho="${esc(n.nicho)}" data-tem="${c}">
            <b>${esc(capN(n.nicho))}</b><span class="pct">${Math.round(n.taxa * 100)}%</span>
            <span class="trilho"><i style="width:${Math.round(n.taxa / topo * 100)}%"></i></span>
            <small>${esc(horaLocalRotulo(n.rotulo))} · ${c ? `${c} lead${c > 1 ? "s" : ""} com contato` : `<span class="novo-nicho">ainda não buscado aqui</span>`}</small>
          </button>`; }).join("")}
      </div>`).join("")}</div>`;

  // ── Calendário da semana ──
  const semana = Vendas.semanaNichos(nichos.slice(0, 40), dados);
  const maxSem = Math.max(...semana.flatMap((d) => d.periodos.map((x) => x.taxa)), 0.01);
  const melhorSem = semana.flatMap((d) => d.periodos.map((x) => ({ ...x, dow: d.dow }))).sort((a, b) => b.taxa - a.taxa)[0];
  const fds = semana.filter((d) => d.dow === 0 || d.dow === 6).flatMap((d) => d.periodos.map((x) => ({ ...x, dow: d.dow }))).sort((a, b) => b.taxa - a.taxa)[0];
  const nomePer = (id) => Vendas.PERIODOS.find((p) => p.id === id).nome.toLowerCase();
  $("#mel-semana").innerHTML = `<h2>Calendário da semana</h2>
    <p class="dica" style="margin:-6px 0 12px">Em cada dia e período, o nicho que mais responde${mel.nichos.length ? " entre os escolhidos" : ""}. Toque para escolher o momento.</p>
    <div class="semana">
      <span></span>${Vendas.PERIODOS.map((p) => `<span class="cab">${p.icone} ${p.nome}</span>`).join("")}
      ${semana.map((d) => `<span class="dia${d.dow === agora.dow ? " hoje" : ""}">${d.dia}</span>` + d.periodos.map((x) =>
        `<button class="n${Math.min(4, Math.floor(x.taxa / maxSem * 4.99))}${d.dow === dow && x.periodo === per ? " sel" : ""}" data-sd="${d.dow}" data-sp="${x.periodo}" title="${esc(x.nicho)}: ${Math.round(x.taxa * 100)}% (${esc(x.rotulo)})">
          <b>${Math.round(x.taxa * 100)}%</b><span>${esc(capN(x.nicho))}</span></button>`).join("")).join("")}
    </div>
    <p class="mel-resumo">📅 Melhor momento da semana: <b>${Vendas.DIAS_CURTO[melhorSem.dow]} de ${nomePer(melhorSem.periodo)}</b>, ${esc(melhorSem.nicho)} (${Math.round(melhorSem.taxa * 100)}%, ${esc(horaLocalRotulo(melhorSem.rotulo))}).<br>
      🗓️ No fim de semana: <b>${Vendas.DIAS_CURTO[fds.dow]} de ${nomePer(fds.periodo)}</b>, ${esc(fds.nicho)} (${Math.round(fds.taxa * 100)}%).</p>`;

  // ── Melhores leads do momento ──
  const chave = mel.nichos.length ? new Set(mel.nichos.map(Vendas.semAcento)) : null;
  const top = Vendas.melhoresLeads(leads, { dow, periodo: per, nichos: chave, filtro: fArea, intervalos: estado.intervalos },
    analise, chanceDe, dados).slice(0, 12);
  const semContato = naArea.filter((l) => !Vendas.temContato(l) && !["fechado", "descartado"].includes(l.status)).length;
  $("#mel-leads").innerHTML = `<h2>Melhores leads · ${Vendas.DIAS_CURTO[dow].toLowerCase()}, ${nomePer(per)}</h2>
    <p class="dica" style="margin:-6px 0 8px">Só quem tem alguma forma de contato. A porcentagem junta a chance do lead com o horário do nicho dele.${semContato ? ` ${semContato} sem contato ficaram de fora.` : ""}</p>
    ${top.length ? top.map(({ l, a, pct, melhor, prox, canal, contatado }) => `
      <div class="mel-lead" data-id="${l.id}">
        <div style="min-width:0"><h3>${esc(l.nome)}</h3>
          <div class="meta">${esc(l.categoria || l.nicho)}${l.bairro ? " · " + esc(l.bairro) : l.cidade ? " · " + esc(l.cidade) : ""} · ${Vendas.GRUPOS[a.grupo]?.icone || ""} ${Vendas.GRUPOS[a.grupo]?.nome || ""}</div></div>
        <div class="pct-grande">${pct}%<small>${contatado ? "chance de fechar" : "potencial"}</small></div>
        <div class="acao-txt">${prox?.acao === "responder" ? "💬" : prox?.urgente ? "⏰" : "👉"} ${esc(prox?.texto || "Abordar")} · melhor ${esc(horaLocalRotulo(melhor))} · <span class="canal-ic">via ${NOME_CANAL[canal]}</span></div>
        <div class="acoes"><button class="btn ${CLASSE_CANAL[canal]}" data-mel="enviar">${prox?.acao === "responder" ? "Responder" : NOME_CANAL[canal]}</button><button class="btn" data-mel="ficha">Ficha</button></div>
      </div>`).join("")
    : `<p class="dica" style="margin:0">Nenhum lead com contato para esse filtro${mel.area ? " nesta área" : ""}. Veja abaixo os nichos para buscar.</p>`}`;

  // ── Nichos para explorar (ainda sem leads na área) ──
  const perObj = Vendas.PERIODOS.find((p) => p.id === per);
  // setores que já têm leads com contato nesta área não entram como ideia
  const tiposComLeads = new Set(naArea.filter((l) => Vendas.temContato(l)).map((l) => Vendas.rotinaDe(l.nicho || "").tipo));
  const ideias = Vendas.catalogoNichos([]).map((n) => ({ nicho: n, ...Vendas.notaNichoPeriodo(n, perObj, dados, dow) }))
    .filter((x) => !tiposComLeads.has(Vendas.rotinaDe(x.nicho).tipo)).sort((a, b) => b.taxa - a.taxa);
  const vistos = new Set(), unicas = ideias.filter((x) => { const t = Vendas.rotinaDe(x.nicho).tipo; if (vistos.has(t)) return false; vistos.add(t); return true; }).slice(0, 6);
  $("#mel-explorar").innerHTML = `<h2>Nichos para buscar ${mel.area ? "nesta área" : mel.mercado === "BR" ? "" : "neste país"}</h2>
    <p class="dica" style="margin:-6px 0 12px">Setores que costumam responder bem ${Vendas.DIAS_CURTO[dow].toLowerCase()} de ${nomePer(per)} e que você ainda não tem${mel.area ? " por aqui" : ""}.</p>
    <div class="explorar">${unicas.length ? "" : `<p class="dica" style="margin:0">Você já tem leads de todos os setores com bom horário agora.</p>`}${unicas.map((x) => `<div class="linha"><div><b>${esc(capN(x.nicho))}</b> · ${Math.round(x.taxa * 100)}%<small>${esc(Vendas.rotinaDe(x.nicho).tipo)}: ${esc(Vendas.rotinaDe(x.nicho).nota)} · melhor ${esc(horaLocalRotulo(x.rotulo))}</small></div>
      <button class="btn peq pri" data-buscar="${esc(x.nicho)}">Buscar</button></div>`).join("")}</div>`;
}

// Abre a busca já preenchida com o nicho e a área escolhida aqui.
async function buscarNichoDaqui(nicho) {
  irPara("buscar");
  $("#b-nichos").value = nicho;
  if (mel.mercado !== "BR") {
    await carregarMundo();
    mudarOnde("mundo");
    await carregarMundo();
    const P = estado.mundoDados.paises[mel.mercado];
    $("#b-continente").value = P.c; preencherMundo("pais");
    $("#b-pais").value = mel.mercado; preencherMundo("estado");
    if (mel.area) { const cid = mel.area.slice(2).split("|"); $("#b-cidade-mundo").value = mel.area[0] === "c" ? cid[0] : cid[1]; }
    preencherMundo("cidade");
  } else if (mel.area) {
    const lista = await municipios();
    const [a, b] = mel.area.slice(2).split("|");
    const nomeCidade = mel.area[0] === "c" ? a : b;
    const uf = mel.area[0] === "c" ? b : leadsDoMercado().find((l) => l.cidade === b)?.uf;
    const m = lista.find((x) => norm(x.n) === norm(nomeCidade) && (!uf || x.uf === uf));
    if (mel.raio) { mudarOnde("raio"); $("#b-raio").value = mel.raio; $("#b-raio-v").textContent = `${mel.raio} km`; }
    else mudarOnde("cidade");
    if (m) escolherCidade(m);
    if (mel.area[0] === "b" && !mel.raio) $("#b-bairro").value = a;
  }
  atualizarCusto();
  $("#btn-buscar").scrollIntoView({ block: "center" });
  toast(`Busca pronta para “${nicho}”. Confira e toque em Buscar empresas.`);
}

$("#tela-melhores").addEventListener("click", async (e) => {
  const t = e.target;
  const m = t.closest("#mel-mercado [data-m]");
  if (m) {
    if (m.dataset.m === "BR") mel.mercado = "BR";
    else { await carregarMundo(); if (mel.mercado === "BR") mel.mercado = "PT"; }
    mel.area = ""; mel.raio = 0; renderMelhores(); return;
  }
  const d = t.closest("#mel-dia [data-d]"); if (d) { mel.dia = d.dataset.d === "" ? null : +d.dataset.d; renderMelhores(); return; }
  const p = t.closest("#mel-periodo [data-p]"); if (p) { mel.periodo = p.dataset.p || null; renderMelhores(); return; }
  if (t.closest("#mel-ver-todos")) { mel.verTodos = !mel.verTodos; renderMelhores(); return; }
  if (t.closest("#mel-limpar")) { e.preventDefault(); mel.nichos = []; renderMelhores(); return; }
  const n = t.closest("#mel-nichos [data-n]");
  if (n) {
    const k = Vendas.semAcento(n.dataset.n), i = mel.nichos.findIndex((x) => Vendas.semAcento(x) === k);
    if (i >= 0) mel.nichos.splice(i, 1); else mel.nichos.push(n.dataset.n);
    renderMelhores(); return;
  }
  const cel = t.closest("[data-sd]");
  if (cel) { mel.dia = +cel.dataset.sd; mel.periodo = cel.dataset.sp; renderMelhores(); $("#mel-leads-card").scrollIntoView({ behavior: "smooth", block: "start" }); return; }
  const linha = t.closest(".mel-linha");
  if (linha) {
    if (+linha.dataset.tem) {
      mel.nichos = [linha.dataset.nicho];
      renderMelhores(); $("#mel-leads-card").scrollIntoView({ behavior: "smooth", block: "start" });
    } else buscarNichoDaqui(linha.dataset.nicho);
    return;
  }
  const b = t.closest("[data-buscar]"); if (b) { buscarNichoDaqui(b.dataset.buscar); return; }
  const acao = t.closest("[data-mel]");
  if (acao) {
    const l = estado.leads.find((x) => x.id === acao.closest(".mel-lead").dataset.id); if (!l) return;
    const prox = Vendas.proximaAcao(l, estado.intervalos);
    if (acao.dataset.mel === "ficha" || prox?.acao === "responder") { abrirLead(l.id); return; }
    const etapa = etapaSugerida(l);
    await enviarEtapa(l, etapa, Vendas.montarMensagem(l, etapa, analise(l), perfil()));
    renderMelhores();
  }
});
$("#tela-melhores").addEventListener("change", (e) => {
  if (e.target.id === "mel-pais") { mel.mercado = e.target.value; mel.area = ""; mel.raio = 0; renderMelhores(); }
  if (e.target.id === "mel-area") { mel.area = e.target.value; if (!mel.area) mel.raio = 0; renderMelhores(); }
  if (e.target.id === "mel-raio") { mel.raio = +e.target.value; renderMelhores(); }
});
$("#tela-melhores").addEventListener("input", (e) => {
  if (e.target.id === "mel-raio") { const b = e.target.previousElementSibling?.querySelector("b"); if (b) b.textContent = +e.target.value ? `${e.target.value} km` : "só a área"; }
});
// "Hoje" e "agora" acompanham o relógio: atualiza a cada 5 minutos se a tela estiver aberta.
setInterval(() => { if (!$("#tela-melhores").hidden && (mel.dia == null || mel.periodo == null)) renderMelhores(); }, 300000);
