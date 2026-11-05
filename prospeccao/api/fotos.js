// POST /api/fotos — fotos para a prévia de um lead.
// Corpo: { place_id, site }. Devolve: { fotos: [{ url, fonte: "google" | "site", autor }] }
// Google: as fotos do perfil da empresa no Maps (com o nome de quem tirou, que a prévia mostra como crédito).
// Site: a imagem de destaque e as fotos grandes do site da própria empresa.
import { autenticar, baixarPagina, chaveGoogle, lerCorpo, responder, urlPublica } from "./_lib.js";

async function fotosGoogle(placeId, chave) {
  if (!placeId || !chave) return [];
  try {
    const r = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      headers: { "X-Goog-Api-Key": chave, "X-Goog-FieldMask": "photos" },
    });
    if (!r.ok) return [];
    const { photos = [] } = await r.json();
    const lista = await Promise.all(photos.slice(0, 8).map(async (p) => {
      try {
        const m = await fetch(`https://places.googleapis.com/v1/${p.name}/media?maxWidthPx=1600&skipHttpRedirect=true`, {
          headers: { "X-Goog-Api-Key": chave },
        });
        if (!m.ok) return null;
        const { photoUri } = await m.json();
        const a = (p.authorAttributions || [])[0] || {};
        return photoUri ? { url: photoUri, fonte: "google", autor: a.displayName || "", largura: p.widthPx || 0, altura: p.heightPx || 0 } : null;
      } catch { return null; }
    }));
    return lista.filter(Boolean);
  } catch { return []; }
}

// Imagens do próprio site: og:image primeiro, depois <img> que não pareçam logo, ícone ou rastreador.
export function imagensDoSite(html, base) {
  if (!html) return [];
  const abs = (u) => { try { return new URL(u.replace(/&amp;/g, "&"), base).href; } catch { return ""; } };
  const out = [];
  const meta = html.match(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*>/gi) || [];
  for (const m of meta) { const c = m.match(/content=["']([^"']+)["']/i); if (c) out.push(abs(c[1])); }
  const imgs = html.match(/<img[^>]+>/gi) || [];
  for (const tag of imgs) {
    const src = (tag.match(/\s(?:data-src|data-lazy-src|src)=["']([^"']+)["']/i) || [])[1];
    if (!src || /^data:/i.test(src)) continue;
    const w = +((tag.match(/\swidth=["']?(\d+)/i) || [])[1] || 0);
    if (w && w < 300) continue;
    if (/logo|icon|favicon|sprite|pixel|avatar|badge|seal|selo|whats|banner-cookie|loading|placeholder|\.svg|\.gif/i.test(src + tag)) continue;
    out.push(abs(src));
  }
  return [...new Set(out.filter((u) => /^https:\/\//.test(u)))].slice(0, 6).map((url) => ({ url, fonte: "site", autor: "" }));
}

export default async function handler(req, res) {
  if (req.method !== "POST") return responder(res, 405, { erro: "Use POST." });
  const sessao = await autenticar(req);
  if (!sessao) return responder(res, 401, { erro: "Faça login de novo." });
  const { place_id = "", site = "" } = await lerCorpo(req);
  const [google, doSite] = await Promise.all([
    chaveGoogle(sessao.token).then((k) => fotosGoogle(String(place_id), k)),
    site && urlPublica(site) ? baixarPagina(site, 7000).then((p) => imagensDoSite(p.html, urlPublica(site))) : Promise.resolve([]),
  ]);
  return responder(res, 200, { fotos: [...google, ...doSite] });
}
