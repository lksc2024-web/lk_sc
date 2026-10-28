// Funções compartilhadas pelas rotas /api (Vercel). Só biblioteca padrão do Node.
export const SUPABASE_URL = process.env.SUPABASE_URL;
export const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
const DONO = (process.env.ALLOWED_EMAIL || "").toLowerCase();

export function responder(res, status, corpo) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(corpo));
}

export async function lerCorpo(req) {
  if (req.body && typeof req.body === "object") return req.body;
  let txt = "";
  for await (const parte of req) txt += parte;
  try { return JSON.parse(txt || "{}"); } catch { return {}; }
}

// Confere o login (token do Supabase) e devolve { token, usuario }. Só o dono passa.
export async function autenticar(req) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
  });
  if (!r.ok) return null;
  const usuario = await r.json();
  if (DONO && (usuario.email || "").toLowerCase() !== DONO) return null;
  return { token, usuario };
}

// Lê a chave do Google gravada nos Ajustes (a política RLS só mostra a linha do próprio usuário).
export async function chaveGoogle(token) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/config?select=google_key`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
  });
  if (!r.ok) return "";
  const linhas = await r.json();
  return (linhas[0] && linhas[0].google_key) || "";
}

// ── Normalização brasileira (mesma regra do painel original) ───────────────────
export function telefoneBr(bruto) {
  let d = String(bruto || "").replace(/\D/g, "");
  if (/^0(800|300|500|900)/.test(d)) return { digitos: d, tipo: "0800" };
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) d = d.slice(2);
  if (d.startsWith("0") && (d.length === 11 || d.length === 12)) d = d.slice(1);
  if (d.length === 11 && d[2] === "9") return { digitos: "55" + d, tipo: "celular" };
  if (d.length === 10) return { digitos: "55" + d, tipo: "6789".includes(d[2]) ? "celular" : "fixo" };
  return { digitos: d, tipo: "" };
}

export function formataTel(d55) {
  const d = d55.startsWith("55") ? d55.slice(2) : d55;
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d55;
}

const WA_RE = /(?:wa\.me\/|api\.whatsapp\.com\/send\/?\?phone=|whatsapp\.com\/send\/?\?phone=|web\.whatsapp\.com\/send\?phone=)\+?(\d{10,13})/gi;

export function whatsappEm(texto) {
  for (const m of String(texto || "").matchAll(WA_RE)) {
    const { digitos, tipo } = telefoneBr(m[1]);
    if (tipo === "celular" || tipo === "fixo") return digitos;
  }
  return "";
}

// ── Extração de e-mail e redes a partir do HTML do site ────────────────────────
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const EMAIL_EXATO = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const MAILTO_RE = /mailto:([^"'>\s?]+)/gi;
const LIXO_EXT = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".css", ".js"];
const LIXO_DOMINIO = ["example", "sentry", "wixpress", "wix.com", "godaddy", "squarespace", "wordpress",
  "domain.com", "email.com", "yourdomain", "seudominio", "schema.org", "w3.org"];
const LIXO_LOCAL = new Set(["name", "email", "user", "you", "someone", "seuemail", "nome", "contato@email"]);

export function host(url) {
  try {
    const h = new URL(/^https?:\/\//i.test(url) ? url : "http://" + url).hostname.toLowerCase();
    return h.startsWith("www.") ? h.slice(4) : h;
  } catch { return ""; }
}

export function extrairEmails(html, site) {
  const dominio = host(site || "");
  const achados = [];
  const brutos = [...String(html || "").matchAll(MAILTO_RE)].map((m) => m[1])
    .concat(String(html || "").match(EMAIL_RE) || []);
  for (let e of brutos) {
    try { e = decodeURIComponent(e); } catch { /* mantém como veio */ }
    e = e.trim().toLowerCase();
    const i = e.lastIndexOf("@");
    const local = e.slice(0, i), dom = e.slice(i + 1);
    if (!EMAIL_EXATO.test(e) || LIXO_EXT.some((x) => e.endsWith(x)) || LIXO_LOCAL.has(local)
        || LIXO_DOMINIO.some((j) => dom.includes(j)) || achados.includes(e)) continue;
    achados.push(e);
  }
  const doSite = (e) => dominio && (e.endsWith("@" + dominio) || e.endsWith("." + dominio));
  return achados.sort((a, b) => doSite(b) - doSite(a)).slice(0, 3);
}

const REDES_RE = {
  instagram: /https?:\/\/(?:www\.)?instagram\.com\/([A-Za-z0-9_.]+)/gi,
  facebook: /https?:\/\/(?:www\.|m\.|web\.)?facebook\.com\/([A-Za-z0-9_.\-]+)/gi,
  linkedin: /https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/(?:company|in|school)\/([A-Za-z0-9_.\-%]+)/gi,
};
const PULAR = new Set(["", "home", "pages", "people", "help", "about", "policies", "policy", "legal", "tos",
  "privacy", "settings", "sharer", "tr", "profile.php", "plugins", "dialog", "intent", "login", "share.php",
  "permalink.php", "p", "reel", "reels", "explore", "stories", "tv", "watch", "events", "groups",
  "marketplace", "gaming", "photo", "hashtag", "search"]);

export function acharRedes(html) {
  const out = { instagram: "", facebook: "", linkedin: "" };
  for (const [rede, rx] of Object.entries(REDES_RE)) {
    for (const m of String(html || "").matchAll(rx)) {
      const h = m[1].toLowerCase();
      if (PULAR.has(h)) continue;
      if (rede === "facebook" && (/^\d+$/.test(h) || h.length < 3)) continue;
      out[rede] = m[0].replace(/["'/\\]+$/, "");
      break;
    }
  }
  return out;
}

const HREF_RE = /<a\s[^>]*?href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
const CONTATO_RE = /contato|fale|sobre|quem-somos|quem_somos|atendimento|contact|about/i;
const CAMINHOS = ["/contato", "/fale-conosco", "/sobre", "/quem-somos", "/contact"];

export function linksContato(html, base) {
  if (!/^https?:\/\//i.test(base)) base = "http://" + base;
  const h = host(base), out = [];
  for (const m of String(html || "").matchAll(HREF_RE)) {
    if (!CONTATO_RE.test(m[1] + " " + m[2])) continue;
    try {
      const u = new URL(m[1].trim(), base); u.hash = "";
      if (/^https?:$/.test(u.protocol) && host(u.href) === h && !out.includes(u.href)) out.push(u.href);
    } catch { /* link inválido */ }
  }
  for (const p of CAMINHOS) {
    const u = new URL(p, base).href;
    if (out.length < 3 && !out.includes(u)) out.push(u);
  }
  return out.slice(0, 3);
}

// Bloqueia endereços internos: a função só deve visitar sites públicos.
export function urlPublica(url) {
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : "http://" + url);
    if (!/^https?:$/.test(u.protocol)) return null;
    const h = u.hostname.toLowerCase();
    if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || /^[\d.]+$/.test(h) || h.includes(":"))
      return null;
    return u.href;
  } catch { return null; }
}

// Baixa uma página e mede: { html, ok, ms, https, status }. ok=false quando o site não abre.
export async function baixarPagina(url, ms = 8000) {
  const alvo = urlPublica(url);
  if (!alvo) return { html: "", ok: false, ms: 0, https: false, status: 0 };
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  const inicio = Date.now();
  try {
    const r = await fetch(alvo, {
      signal: ctl.signal, redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Prospeccao/1.0)", Accept: "text/html" },
    });
    const html = r.ok && (r.headers.get("content-type") || "").includes("html") ? (await r.text()).slice(0, 400000) : "";
    return { html, ok: r.ok, ms: Date.now() - inicio, https: (r.url || alvo).startsWith("https:"), status: r.status };
  } catch {
    return { html: "", ok: false, ms: Date.now() - inicio, https: false, status: 0 };
  } finally { clearTimeout(t); }
}

export async function baixarHtml(url, ms = 8000) {
  return (await baixarPagina(url, ms)).html;
}

// Raio-X do site a partir do HTML: só sinais objetivos, que dá para citar na mensagem.
const SINAIS = {
  agendamento: /agend|reserv|marcar (?:consulta|horário|horario|visita)|calendly|doctoralia|booking|simplybook|trinks|avec\.app|agendor/i,
  chat: /tawk\.to|jivosite|jivochat|zendesk|intercom|crisp\.chat|manychat|blip\.ai|octadesk|botpress|chatbot|tidio|kommo|rd-?station|huggy/i,
  pixel: /fbq\(|connect\.facebook\.net|facebook\.com\/tr\?/i,
  google_tag: /gtag\(|googletagmanager\.com|google-analytics\.com|googleadservices/i,
  loja: /woocommerce|shopify|nuvemshop|lojaintegrada|tray\.com|vtex|add[-_]to[-_]cart|carrinho/i,
  formulario: /<form[\s>]/i,
};
const PLATAFORMAS = [["Wix", /wix\.com|wixstatic/i], ["WordPress", /wp-content|wordpress/i], ["Squarespace", /squarespace/i],
  ["Webflow", /webflow/i], ["Google Sites", /sites\.google/i], ["Linktree", /linktr\.ee/i]];

export function diagnosticar(pagina, site) {
  const h = pagina.html || "";
  const d = {
    abre: pagina.ok && !!h, https: pagina.https, ms: pagina.ms,
    responsivo: /<meta[^>]+name=["']viewport["']/i.test(h),
    titulo: (h.match(/<title[^>]*>([^<]{0,120})/i) || [])[1]?.trim() || "",
    descricao: /<meta[^>]+name=["']description["'][^>]+content=["'][^"']{20,}/i.test(h),
    whatsapp_site: !!whatsappEm(h) || /wa\.me|api\.whatsapp\.com/i.test(h),
    plataforma: (PLATAFORMAS.find(([, rx]) => rx.test(h)) || [""])[0],
  };
  for (const [k, rx] of Object.entries(SINAIS)) d[k] = rx.test(h);
  // ano mais recente perto do © no rodapé: site parado há anos é um bom gancho
  const anos = [...h.matchAll(/(?:©|&copy;|copyright)[^<]{0,40}?((?:19|20)\d{2})(?:\s*[-–]\s*((?:19|20)\d{2}))?/gi)]
    .flatMap((m) => [m[1], m[2]]).filter(Boolean).map(Number);
  d.ano_rodape = anos.length ? Math.max(...anos) : 0;
  d.dominio = host(site);
  return d;
}
