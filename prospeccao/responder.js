// O cliente respondeu: cola o texto ou manda o print da conversa. O app lê o print, descobre de quem é,
// separa resposta automática de resposta de verdade e monta a próxima mensagem conforme o que ele disse.
"use strict";

const resp = { texto: "", leadId: "", busca: "" };

function carregarOCR() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  return new Promise((ok, falha) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
    s.onload = () => ok(window.Tesseract);
    s.onerror = () => falha(new Error("Não deu para carregar o leitor de prints. Verifique a internet."));
    document.head.appendChild(s);
  });
}
async function lerPrint(arquivo, aoProgresso) {
  const T = await carregarOCR();
  const r = await T.recognize(arquivo, "por+eng", { logger: (m) => { if (m.status === "recognizing text" && aoProgresso) aoProgresso(Math.round(m.progress * 100)); } });
  return r.data.text || "";
}

// De quem é: pelo nome da empresa no texto (Nucleo.candidatos) ou por um número de telefone que apareça no print.
function candidatosResposta(texto) {
  const porNome = Nucleo.candidatos(texto, { leads: estado.leads }).filter((c) => c.tipo === "lead").map((c) => c.obj);
  const nums = (String(texto).match(/\+?\d[\d\s().-]{7,}\d/g) || []).map((n) => n.replace(/\D/g, "")).filter((n) => n.length >= 8);
  const porNumero = nums.length ? estado.leads.filter((l) => nums.some((n) => [l.whatsapp, l.tel_digitos].some((x) => x && (x.endsWith(n.slice(-8)))))) : [];
  const vistos = new Set();
  return [...porNumero, ...porNome].filter((l) => !vistos.has(l.id) && vistos.add(l.id)).slice(0, 5);
}

function quandoTexto(d) {
  if (!d) return "";
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  const dif = Math.round((x - hoje) / 864e5);
  const nomes = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  let s = dif === 0 ? "hoje" : dif === 1 ? "amanhã" : dif > 1 && dif < 7 ? `${d.getDay() === 0 || d.getDay() === 6 ? "no" : "na"} ${nomes[d.getDay()]}`
    : `no dia ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  if (d.getHours() !== 10 || d.getMinutes()) s += ` às ${d.getHours()}h${d.getMinutes() ? String(d.getMinutes()).padStart(2, "0") : ""}`;
  return s;
}

// Mensagens por tipo de resposta. Os {campos} são os mesmos do roteiro (vendas.js); {quando} vem da resposta.
const RESPOSTA_POR_GATILHO = {
  automatica: "Oi! Recebi a resposta automática, sem pressa. Quando o responsável pela {nome} puder, queria mostrar em 2 minutos uma ideia sobre {curto}. Pode ser por aqui mesmo?",
  quem_e: "Desculpe não ter me apresentado direito! {apresentacao} Encontrei a {nome} pesquisando {categoria} {em_cidade} e vi um ponto que dá para melhorar: {curto}. Se preferir que eu não mande mais mensagens, é só me avisar.",
  horario: "Combinado! Fica marcado {quando}. Até lá!",
  pensar: "Claro, fique à vontade! Se ajudar na decisão, te mando um resumo curto com o que muda, o prazo ({prazo}) e o valor. Te chamo {quando} para saber o que achou, pode ser?",
  exemplos: "Claro!{exemplos}{portfolio_frase2}\n\nQuer que eu prepare algo parecido para a {nome}?",
  preco: "Depende do que vocês precisam: {servico} costuma ficar entre {min} e {max}, com prazo de {prazo}. Antes, faço um diagnóstico gratuito da {nome} para chegar no valor certo. Posso preparar?",
};
// Para os demais, usa a etapa do ciclo equivalente (atenção, desejo, aprovação, rejeição).
function respostaModulada(l, g, texto) {
  const a = analise(l);
  const dt = Nucleo.extrairData(texto);
  let quando = dt ? dt.data : null;
  if (!quando && (g.agendaDias || g.agendaReuniao)) { quando = new Date(); quando.setDate(quando.getDate() + (g.agendaReuniao ? 1 : g.agendaDias)); quando.setHours(10, 0, 0, 0); }
  // Negativas, objeções e respostas ambíguas: a leitura vem de Estrategias (a mesma usada pela Central).
  const plano = window.Estrategias?.respostaAoCliente ? Estrategias.respostaAoCliente(l, g, texto, Vendas.ciclo(l)) : null;
  if (plano) {
    let txt = Vendas.montarMensagem(l, "resposta", a, perfil(), null, { modelo: plano.modelo });
    txt = txt.replaceAll("{quando}", quando ? quandoTexto(quando) : "daqui a umas semanas");
    return { txt, quando, plano };
  }
  const modelo = RESPOSTA_POR_GATILHO[g.id];
  let txt;
  if (modelo) {
    const pf = perfil(), op = a.principal || a.oportunidades?.[0];
    const p = op ? Vendas.precoDe(op.servico, pf) : null;
    txt = Vendas.montarMensagem(l, "_resp", a, { ...pf, roteiro: { ...(pf.roteiro || {}), _resp: modelo } });
    txt = txt.replaceAll("{quando}", quando ? quandoTexto(quando) : "em alguns dias")
      .replaceAll("{servico}", p ? p.nome.toLowerCase() : "um projeto assim")
      .replaceAll("{min}", p ? Vendas.fmtReais(p.min) : "").replaceAll("{max}", p ? Vendas.fmtReais(p.max) : "");
  } else {
    // a resposta de agora ainda não foi registrada: entra na conta para o texto saber que ele disse sim
    const c = Vendas.ciclo(l), comResp = { ...l, dados: { ...(l.dados || {}), ciclo: { ...c, respostas: [...c.respostas, { t: new Date().toISOString(), tipo: g.tipo4 }] } } };
    txt = Vendas.montarMensagem(comResp, g.tipo4 || "atencao", a, perfil());
  }
  return { txt, quando };
}

function htmlResponder() {
  const l = estado.leads.find((x) => x.id === resp.leadId);
  const cands = resp.texto ? candidatosResposta(resp.texto).filter((c) => c.id !== resp.leadId) : [];
  const termo = norm(resp.busca);
  const achados = termo.length >= 2 ? estado.leads.filter((x) => norm(`${x.nome} ${x.bairro} ${x.cidade}`).includes(termo)).slice(0, 6) : [];
  const g = resp.texto.trim() ? Nucleo.classificar(resp.texto) : null;
  const r = g && l ? respostaModulada(l, g, resp.texto) : null;
  const canais = l ? Vendas.canais(l) : [];
  return `<div class="barra"><div style="flex:1"><h2 style="margin:0; font-size:18px">O cliente respondeu</h2>
      <div class="dica" style="margin:2px 0 0">Cole a mensagem ou envie o print. O app separa resposta automática de resposta de verdade.</div></div>
      <button class="btn peq" data-r="fechar" aria-label="Fechar">✕</button></div>
    <div class="corpo">
      <textarea id="r-texto" style="min-height:120px" placeholder="Ex.: Obrigado pela mensagem! Quanto fica um site assim?">${esc(resp.texto)}</textarea>
      <div class="linha-flex" style="margin-top:8px; gap:8px; justify-content:flex-start">
        <button class="btn peq" data-r="colar" type="button">📋 Colar</button>
        <label class="btn peq" for="r-img" style="cursor:pointer">📷 Enviar print</label>
        <input type="file" id="r-img" accept="image/*" hidden>
        <span class="dica" id="r-ocr" style="margin:0"></span>
      </div>

      <label class="campo">De quem é</label>
      ${l ? `<div class="r-tipo" style="margin-top:0"><span style="flex:1"><b>${esc(l.nome)}</b><br><small>${esc(l.categoria || l.nicho)} · ${esc(l.bairro || l.cidade || "")} · ${NOME_STATUS[l.status]}</small></span><button class="btn peq" data-r="trocar">Trocar</button></div>`
        : `<input id="r-busca" type="search" placeholder="Digite o nome da empresa…" value="${esc(resp.busca)}">`}
      ${!l && (cands.length || achados.length) ? `<div class="r-cands">${[...cands, ...achados.filter((x) => !cands.includes(x))].slice(0, 8).map((x) =>
        `<button class="chip" data-lead="${x.id}">${esc(x.nome)}<small>${esc(x.bairro || x.cidade || "")}</small></button>`).join("")}</div>` : ""}
      ${!l && resp.texto && !cands.length && !achados.length ? `<p class="dica">Não achei a empresa pelo texto. Digite o nome acima.</p>` : ""}

      ${g ? `<div class="r-tipo ${g.id === "automatica" ? "auto" : g.cor === "bad" ? "ruim" : ""}"><span>${g.id === "automatica" ? "🤖" : Vendas.ICONE_RESPOSTA[g.tipo4] || "💬"}</span>
        <span><b>${esc(g.nome)}</b><br><small>${esc(r?.plano ? r.plano.leitura : g.dica)}</small></span></div>` : ""}
      ${r?.plano ? `<div class="r-leitura${r.plano.conferir ? " conferir" : ""}"><b>${r.plano.encerrar ? "Encerrar" : "Como responder"}:</b> ${esc(r.plano.estrategia)}</div>` : ""}

      ${r && l && ["desejo", "aprovacao"].includes(g.tipo4) && !l.dados?.previa ? `<button class="btn cheio" type="button" data-r="previa" style="margin-top:10px">Criar prévia e mandar o link na resposta</button>` : ""}
      ${r ? `<label class="campo" for="r-msg">Resposta sugerida</label>
        <textarea id="r-msg" style="min-height:150px">${esc(r.txt)}</textarea>
        <div class="grade2" style="margin-top:8px">
          ${canais.map((c) => `<button class="btn ${CLASSE_CANAL[c]}" data-r="enviar" data-canal="${c}">${c === "whatsapp" ? "Registrar e abrir no WhatsApp" : `Registrar e ${ROTULO_ENVIO[c].toLowerCase()}`}</button>`).join("")}
          <button class="btn" data-r="registrar">Só registrar</button>
          <button class="btn" data-r="copiar">Copiar</button>
        </div>` : g && !l ? `<p class="dica">Escolha a empresa para montar a resposta.</p>` : ""}
    </div>`;
}

function abrirResponder(opcoes = {}) {
  const dlg = $("#folha-responder");
  if (opcoes.lead) resp.leadId = opcoes.lead;
  if (opcoes.texto != null) resp.texto = opcoes.texto;
  dlg.innerHTML = htmlResponder();
  if (!dlg.open) dlg.showModal();
  const tx = $("#r-texto", dlg);
  if (!resp.texto) tx.focus();
}

async function processarPrint(arquivo) {
  const info = () => $("#r-ocr");
  info().textContent = "Lendo o print…";
  try {
    const bruto = await lerPrint(arquivo, (p) => { if (info()) info().textContent = `Lendo o print… ${p}%`; });
    if (!resp.leadId) { const c = candidatosResposta(bruto)[0]; if (c) resp.leadId = c.id; }
    // o print costuma trazer a sua mensagem também: fica só o que o cliente escreveu
    const l = estado.leads.find((x) => x.id === resp.leadId);
    resp.texto = Nucleo.mensagemDoCliente(bruto, l ? Vendas.ciclo(l).envios.map((e) => e.txt || "") : []);
    abrirResponder();
    if (info()) info().textContent = "Confira o texto e apague o que não for do cliente.";
  } catch (err) { if (info()) info().textContent = err.message; }
}

async function concluirResposta(enviar, canal) {
  const l = estado.leads.find((x) => x.id === resp.leadId); if (!l) return;
  const g = Nucleo.classificar(resp.texto), msg = $("#r-msg").value.trim();
  // lido antes de registrar: a resposta de agora não pode contar como "já tinha recusado antes"
  const plano = window.Estrategias?.respostaAoCliente ? Estrategias.respostaAoCliente(l, g, resp.texto, Vendas.ciclo(l)) : null;
  if (g.id === "automatica") {
    // robô do WhatsApp Business: fica registrado, mas não conta como resposta do cliente
    await registrar(l, "nota", `Resposta automática recebida: “${resp.texto.slice(0, 200)}”`);
  } else {
    await registrarResposta(l, g.tipo4 || "atencao", resp.texto.trim());
    if (g.id === "remover" || plano?.encerrar) {
      const atual = estado.leads.find((x) => x.id === l.id) || l, c = Vendas.ciclo(atual);
      // relacionamento futuro: sem lembretes, mas o lead não vai para descartados
      if (plano?.futuro) await salvarLead(atual, { dados: { ...(atual.dados || {}), relacionamento_futuro: true, ciclo: { ...c, encerrado: true } } });
      else await salvarLead(atual, { status: "descartado", dados: { ...(atual.dados || {}), ...(g.id === "remover" || plano?.nao_contatar ? { nao_contatar: true } : {}), ciclo: { ...c, encerrado: true } } });
    }
  }
  if (enviar) await enviarEtapa(l, g.id === "automatica" ? "extra" : g.tipo4 || "atencao", msg, `Resposta: ${g.nome.toLowerCase()}`, canal);
  else recalcular();
  $("#folha-responder").close();
  resp.texto = ""; resp.leadId = ""; resp.busca = "";
  toast(enviar ? "Resposta registrada e mensagem pronta para enviar." : "Resposta registrada.");
  for (const t of ["leads", "contatos", "painel", "melhores"]) if (!$(`#tela-${t}`).hidden) irPara(t);
}

$("#folha-responder").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-r]");
  const lead = e.target.closest("[data-lead]");
  if (lead) { resp.leadId = lead.dataset.lead; abrirResponder(); return; }
  if (!b) return;
  const acao = b.dataset.r;
  if (acao === "fechar") $("#folha-responder").close();
  if (acao === "trocar") { resp.leadId = ""; abrirResponder(); }
  if (acao === "colar") {
    try { resp.texto = await navigator.clipboard.readText(); abrirResponder(); }
    catch { toast("Não deu para colar sozinho. Segure no campo e cole."); $("#r-texto").focus(); }
  }
  if (acao === "copiar") { await copiarTexto($("#r-msg").value); toast("Resposta copiada."); }
  if (acao === "previa") {
    const l = estado.leads.find((x) => x.id === resp.leadId); if (!l) return;
    b.disabled = true; b.textContent = "Criando a prévia…";
    if (await criarPrevia(l)) { toast("Prévia pronta: o link já está na resposta."); abrirResponder(); }
    else { b.disabled = false; b.textContent = "Criar prévia e mandar o link na resposta"; }
  }
  if (acao === "registrar") concluirResposta(false);
  if (acao === "enviar") concluirResposta(true, b.dataset.canal);
});
let respTimer;
$("#folha-responder").addEventListener("input", (e) => {
  if (e.target.id === "r-texto") {
    resp.texto = e.target.value;
    clearTimeout(respTimer);
    respTimer = setTimeout(() => {
      const pos = e.target.selectionStart;
      abrirResponder();
      const t = $("#r-texto"); t.focus(); t.setSelectionRange(pos, pos);
    }, 600);
  }
  if (e.target.id === "r-busca") {
    resp.busca = e.target.value;
    clearTimeout(respTimer);
    respTimer = setTimeout(() => { abrirResponder(); const t = $("#r-busca"); if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); } }, 300);
  }
});
$("#folha-responder").addEventListener("change", (e) => {
  if (e.target.id === "r-img") { const f = e.target.files?.[0]; if (f) processarPrint(f); }
});
$("#btn-responder").addEventListener("click", () => abrirResponder());
$("#c-responder").addEventListener("click", () => abrirResponder());

// Compartilhar do WhatsApp para o app (texto ou imagem), quando instalado: /?responder=texto
(function () {
  const q = new URLSearchParams(location.search);
  const t = q.get("responder") || q.get("text");
  if (t) setTimeout(() => { if (estado.usuario) abrirResponder({ texto: t }); }, 2500);
})();
