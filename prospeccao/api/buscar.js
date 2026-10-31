// POST /api/buscar — uma busca na API oficial do Google Places (Text Search, versão nova).
// Corpo: { consulta, nicho, retangulo: {s, n, w, e}, circulo: {lat, lng, raio(m)}, restrito, paginas (1–3),
//         abertoAgora, notaMin }
// Devolve: { leads: [...], chamadas } — cada página de até 20 resultados é uma chamada cobrada.
import { autenticar, chaveGoogle, formataTel, lerCorpo, responder, telefoneBr, whatsappEm } from "./_lib.js";

const CAMPOS = [
  "places.id", "places.displayName", "places.formattedAddress", "places.addressComponents",
  "places.internationalPhoneNumber", "places.nationalPhoneNumber", "places.websiteUri", "places.rating",
  "places.userRatingCount", "places.primaryTypeDisplayName", "places.googleMapsUri", "places.businessStatus",
  "places.location", "places.regularOpeningHours", "places.currentOpeningHours",
  "nextPageToken",
].join(",");

function componente(lugar, tipo, curto = false) {
  const c = (lugar.addressComponents || []).find((x) => (x.types || []).includes(tipo));
  return c ? (curto ? c.shortText : c.longText) || "" : "";
}

// Horário compacto: [[diaAbre, hAbre, mAbre, diaFecha, hFecha, mFecha], ...] (dia 0 = domingo).
function horario(lugar) {
  const h = lugar.regularOpeningHours || {};
  const per = (h.periods || []).map((p) => {
    const a = p.open || {}, f = p.close;
    return f ? [a.day ?? 0, a.hour ?? 0, a.minute ?? 0, f.day ?? 0, f.hour ?? 0, f.minute ?? 0]
      : [a.day ?? 0, a.hour ?? 0, a.minute ?? 0, a.day ?? 0, a.hour ?? 0, a.minute ?? 0]; // sem fechamento = aberto 24h, todos os dias
  });
  return { per, txt: h.weekdayDescriptions || [] };
}

export function geoDe(lugar) {
  const loc = lugar.location || {};
  if (loc.latitude == null) return null;
  const { per, txt } = horario(lugar);
  const aberto = lugar.currentOpeningHours ? !!lugar.currentOpeningHours.openNow : null;
  return { lat: +loc.latitude.toFixed(6), lng: +loc.longitude.toFixed(6), per, txt, aberto, quando: new Date().toISOString() };
}

export function leadDe(lugar, nicho) {
  const { digitos, tipo } = telefoneBr(lugar.internationalPhoneNumber || lugar.nationalPhoneNumber);
  const site = lugar.websiteUri || "";
  let whatsapp = whatsappEm(site), origem = whatsapp ? "site" : "";
  if (!whatsapp && tipo === "celular") { whatsapp = digitos; origem = "telefone"; }
  return {
    place_id: lugar.id,
    nome: (lugar.displayName && lugar.displayName.text) || "",
    categoria: (lugar.primaryTypeDisplayName && lugar.primaryTypeDisplayName.text) || "",
    nicho,
    telefone: tipo === "celular" || tipo === "fixo" ? formataTel(digitos)
      : lugar.nationalPhoneNumber || lugar.internationalPhoneNumber || "",
    tel_digitos: digitos,
    tel_tipo: tipo,
    whatsapp,
    whatsapp_origem: origem,
    site,
    endereco: (lugar.formattedAddress || "").replace(/,\s*Brasil$|,\s*Brazil$/, ""),
    bairro: componente(lugar, "sublocality_level_1") || componente(lugar, "sublocality"),
    cidade: componente(lugar, "administrative_area_level_2"),
    uf: componente(lugar, "administrative_area_level_1", true),
    nota: lugar.rating || 0,
    avaliacoes: lugar.userRatingCount || 0,
    maps: lugar.googleMapsUri || "",
    fechado: lugar.businessStatus === "CLOSED_PERMANENTLY",
    geo: geoDe(lugar),
  };
}

// Traduz o erro do Google para o que a pessoa precisa fazer no console.
const MOTIVOS = {
  API_KEY_INVALID: "A chave do Google está incorreta. Copie de novo em Credenciais e cole em Ajustes.",
  SERVICE_DISABLED: "A “Places API (New)” não está ativada. No console do Google: APIs e serviços → Biblioteca → Places API (New) → Ativar.",
  BILLING_DISABLED: "O faturamento não está ativado no projeto do Google. Ative em Faturamento (é exigido mesmo para a cota grátis).",
  API_KEY_SERVICE_BLOCKED: "A chave está restrita e não libera a “Places API (New)”. Em Credenciais → sua chave → Restrições de API, marque Places API (New).",
  API_KEY_HTTP_REFERRER_BLOCKED: "A chave está restrita a sites. Em Credenciais → sua chave → Restrições do aplicativo, escolha “Nenhum”.",
  API_KEY_IP_ADDRESS_BLOCKED: "A chave está restrita a endereços IP. Em Credenciais → sua chave → Restrições do aplicativo, escolha “Nenhum”.",
  RATE_LIMIT_EXCEEDED: "Limite de buscas do Google atingido (cota diária). Tente amanhã ou aumente a cota no console.",
  RESOURCE_EXHAUSTED: "Limite de buscas do Google atingido (cota diária). Tente amanhã ou aumente a cota no console.",
};

export function explicarErro(status, dados) {
  const e = (dados && dados.error) || {};
  const motivos = (e.details || []).map((d) => d.reason).filter(Boolean);
  const msg = e.message || `HTTP ${status}`;
  let motivo = motivos.find((m) => MOTIVOS[m]);
  if (!motivo && /billing/i.test(msg)) motivo = "BILLING_DISABLED";
  if (!motivo && /has not been used|is disabled/i.test(msg)) motivo = "SERVICE_DISABLED";
  if (!motivo && /api key not valid/i.test(msg)) motivo = "API_KEY_INVALID";
  if (!motivo && e.status === "RESOURCE_EXHAUSTED") motivo = "RESOURCE_EXHAUSTED";
  return `${motivo ? MOTIVOS[motivo] : "O Google recusou a busca."} (Google: ${msg})`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return responder(res, 405, { erro: "Use POST." });
  const sessao = await autenticar(req);
  if (!sessao) return responder(res, 401, { erro: "Faça login de novo." });
  const chave = await chaveGoogle(sessao.token);
  if (!chave) return responder(res, 400, { erro: "Cadastre a chave do Google em Ajustes." });

  const { consulta, nicho = "", retangulo, circulo, restrito = false, paginas = 3, abertoAgora = false, notaMin = 0 }
    = await lerCorpo(req);
  if (!consulta || (!retangulo && !circulo)) return responder(res, 400, { erro: "Busca incompleta." });
  const ret = retangulo && { rectangle: {
    low: { latitude: +retangulo.s, longitude: +retangulo.w },
    high: { latitude: +retangulo.n, longitude: +retangulo.e },
  } };
  // O Google só aceita círculo como preferência (bias); para restringir, usamos o retângulo em volta do círculo.
  const circ = circulo && { circle: {
    center: { latitude: +circulo.lat, longitude: +circulo.lng },
    radius: Math.min(50000, Math.max(100, +circulo.raio || 5000)),
  } };
  const corpo = { textQuery: String(consulta).slice(0, 200), languageCode: "pt-BR", regionCode: "BR", pageSize: 20 };
  if (restrito && ret) corpo.locationRestriction = ret;
  else corpo.locationBias = circ || ret;
  if (abertoAgora) corpo.openNow = true;
  const nota = Math.round((+notaMin || 0) * 2) / 2;
  if (nota >= 1 && nota <= 5) corpo.minRating = nota;

  const leads = [];
  let chamadas = 0, token = "";
  for (let i = 0; i < Math.min(3, Math.max(1, +paginas || 1)); i++) {
    const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": chave, "X-Goog-FieldMask": CAMPOS },
      body: JSON.stringify(token ? { ...corpo, pageToken: token } : corpo),
    });
    const dados = await r.json().catch(() => ({}));
    if (r.ok) chamadas++; // chamada recusada não é cobrada pelo Google
    if (!r.ok) {
      const erro = explicarErro(r.status, dados);
      console.error("Google Places", r.status, JSON.stringify(dados.error || dados).slice(0, 1000));
      if (leads.length) break; // devolve o que já veio
      return responder(res, r.status === 403 || r.status === 400 ? 400 : 502, { erro, chamadas });
    }
    for (const p of dados.places || []) leads.push(leadDe(p, nicho));
    token = dados.nextPageToken;
    if (!token) break;
  }
  return responder(res, 200, { leads, chamadas });
}
