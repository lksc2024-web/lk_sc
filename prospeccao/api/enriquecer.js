// POST /api/enriquecer — visita o site de cada lead: procura e-mail, WhatsApp e redes sociais e
// faz o raio-X do site (abre? celular? segurança? agendamento? anúncios?) para o diagnóstico.
// Corpo: { sites: [{ id, site }] } (até 6 por chamada). Devolve: { resultados: { id: {...} } }
import { acharRedes, autenticar, baixarHtml, baixarPagina, diagnosticar, extrairEmails, lerCorpo, linksContato, responder, whatsappEm } from "./_lib.js";

const SO_REDE = ["instagram.com", "facebook.com", "wa.me", "whatsapp.com", "linktr.ee"];

// Nome de quem responde pela empresa, quando o próprio site diz: "Dra. Ana Souza", "Arq. Paula", "Fundadora: Carla Lima",
// "Ana Souza | CRO-RJ 12345". Só nomes próprios com título ou cargo; nada de chute.
export function responsavelNoSite(html) {
  const txt = String(html || "").replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/\s+/g, " ").slice(0, 200000);
  const N = "([A-ZÀ-Ú][a-zà-ú]{2,}(?: (?:d[aeo]s? )?[A-ZÀ-Ú][a-zà-ú]{2,}){0,2})";
  const regras = [
    [new RegExp("\\b(Dra?|Arq|Prof)\\.\\s+" + N), (m) => `${m[1]}. ${m[2].split(" ")[0]}`],
    [new RegExp("\\b(?:[Ff]undador(?:a)?|[Pp]ropriet[aá]ri[oa]|[Ss][oó]ci[oa][- ]fundador(?:a)?|[Rr]espons[aá]vel t[eé]cnic[oa])\\s*[:\\-–]?\\s+" + N), (m) => m[1].split(" ")[0]],
    [new RegExp(N + "\\s*[|,\\-–]?\\s*(?:CRO|CRM|CREFITO|CRN|CRP|CAU|OAB|CREA)[\\s\\-/]"), (m) => m[1].split(" ")[0]],
  ];
  for (const [rx, nome] of regras) { const m = txt.match(rx); if (m) return nome(m); }
  return "";
}

export async function enriquecerSite(site) {
  const out = { email: "", whatsapp: "", instagram: "", facebook: "", linkedin: "", diag: null };
  if (SO_REDE.some((h) => site.includes(h))) {
    // o "site" cadastrado no Google é na verdade uma rede social ou link de WhatsApp
    if (site.includes("instagram.com")) out.instagram = site;
    else if (site.includes("facebook.com")) out.facebook = site;
    out.whatsapp = whatsappEm(site);
    return out;
  }
  const pagina = await baixarPagina(site);
  out.diag = diagnosticar(pagina, site);
  const home = pagina.html;
  if (!home) return out;
  Object.assign(out, acharRedes(home));
  out.responsavel = responsavelNoSite(home);
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
