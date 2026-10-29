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
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch { return parseForm(req.body); } }
  let txt = "";
  for await (const parte of req) txt += parte;
  try { return JSON.parse(txt || "{}"); } catch { return parseForm(txt); }
}
function parseForm(txt) { const o = {}; for (const [k, v] of new URLSearchParams(txt || "")) o[k] = v; return o; }

// Confere o login (token do Supabase). Só o dono passa.
export async function autenticar(req) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  const usuario = await r.json();
  if (DONO && (usuario.email || "").toLowerCase() !== DONO) return null;
  return { token, usuario };
}

// Chama uma função do banco (as funções públicas validam a chave por conta própria).
export async function rpc(nome, args) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${nome}`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const txt = await r.text();
  let dado; try { dado = JSON.parse(txt); } catch { dado = txt; }
  if (!r.ok) throw new Error(typeof dado === "object" && dado && dado.message ? dado.message : `rpc ${nome}: ${r.status}`);
  return dado;
}
