// POST /api/enriquecer — visita o site de cada lead e procura e-mail, WhatsApp e redes sociais.
// Corpo: { sites: [{ id, site }] } (até 6 por chamada). Devolve: { resultados: { id: {...} } }
import { acharRedes, autenticar, baixarHtml, extrairEmails, lerCorpo, linksContato, responder, whatsappEm } from "./_lib.js";

const SO_REDE = ["instagram.com", "facebook.com", "wa.me", "whatsapp.com", "linktr.ee"];

export async function enriquecerSite(site) {
  const out = { email: "", whatsapp: "", instagram: "", facebook: "", linkedin: "" };
  if (SO_REDE.some((h) => site.includes(h))) {
    // o "site" cadastrado no Google é na verdade uma rede social ou link de WhatsApp
    if (site.includes("instagram.com")) out.instagram = site;
    else if (site.includes("facebook.com")) out.facebook = site;
    out.whatsapp = whatsappEm(site);
    return out;
  }
  const home = await baixarHtml(site);
  if (!home) return out;
  Object.assign(out, acharRedes(home));
  out.whatsapp = whatsappEm(home);
  let emails = extrairEmails(home, site);
  if (!emails.length || !out.whatsapp) {
    const paginas = (await Promise.all(linksContato(home, site).map((u) => baixarHtml(u, 6000)))).join("");
    if (!emails.length) emails = extrairEmails(paginas, site);
    if (!out.whatsapp) out.whatsapp = whatsappEm(paginas);
  }
  out.email = emails.join(", ");
  return out;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return responder(res, 405, { erro: "Use POST." });
  if (!(await autenticar(req))) return responder(res, 401, { erro: "Faça login de novo." });
  const { sites = [] } = await lerCorpo(req);
  const lote = sites.filter((s) => s && s.id && s.site).slice(0, 6);
  const resultados = {};
  await Promise.all(lote.map(async ({ id, site }) => { resultados[id] = await enriquecerSite(String(site)); }));
  return responder(res, 200, { resultados });
}
