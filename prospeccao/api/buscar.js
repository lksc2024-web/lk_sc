// POST /api/buscar — uma busca na API oficial do Google Places (Text Search, versão nova).
// Corpo: { consulta, nicho, retangulo: {s, n, w, e}, restrito, paginas (1–3) }
// Devolve: { leads: [...], chamadas } — cada página de até 20 resultados é uma chamada cobrada.
import { autenticar, chaveGoogle, formataTel, lerCorpo, responder, telefoneBr, whatsappEm } from "./_lib.js";

const CAMPOS = [
  "places.id", "places.displayName", "places.formattedAddress", "places.addressComponents",
  "places.internationalPhoneNumber", "places.nationalPhoneNumber", "places.websiteUri", "places.rating",
  "places.userRatingCount", "places.primaryTypeDisplayName", "places.googleMapsUri", "places.businessStatus",
  "nextPageToken",
].join(",");

function componente(lugar, tipo, curto = false) {
  const c = (lugar.addressComponents || []).find((x) => (x.types || []).includes(tipo));
  return c ? (curto ? c.shortText : c.longText) || "" : "";
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
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return responder(res, 405, { erro: "Use POST." });
  const sessao = await autenticar(req);
  if (!sessao) return responder(res, 401, { erro: "Faça login de novo." });
  const chave = await chaveGoogle(sessao.token);
  if (!chave) return responder(res, 400, { erro: "Cadastre a chave do Google em Ajustes." });

  const { consulta, nicho = "", retangulo, restrito = false, paginas = 3 } = await lerCorpo(req);
  if (!consulta || !retangulo) return responder(res, 400, { erro: "Busca incompleta." });
  const area = { rectangle: {
    low: { latitude: +retangulo.s, longitude: +retangulo.w },
    high: { latitude: +retangulo.n, longitude: +retangulo.e },
  } };
  const corpo = { textQuery: String(consulta).slice(0, 200), languageCode: "pt-BR", regionCode: "BR", pageSize: 20,
    [restrito ? "locationRestriction" : "locationBias"]: area };

  const leads = [];
  let chamadas = 0, token = "";
  for (let i = 0; i < Math.min(3, Math.max(1, +paginas || 1)); i++) {
    const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": chave, "X-Goog-FieldMask": CAMPOS },
      body: JSON.stringify(token ? { ...corpo, pageToken: token } : corpo),
    });
    chamadas++;
    const dados = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = (dados.error && dados.error.message) || `HTTP ${r.status}`;
      if (leads.length) break; // devolve o que já veio
      return responder(res, r.status === 403 || r.status === 400 ? 400 : 502,
        { erro: `O Google recusou a busca: ${msg}`, chamadas });
    }
    for (const p of dados.places || []) leads.push(leadDe(p, nicho));
    token = dados.nextPageToken;
    if (!token) break;
  }
  return responder(res, 200, { leads, chamadas });
}
