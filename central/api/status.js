// Verifica se os sites estão no ar (resposta e tempo). Só para o dono logado.
import { responder, lerCorpo, autenticar } from "./_lib.js";

async function checar(url) {
  const t0 = Date.now();
  const ctl = new AbortController();
  const tm = setTimeout(() => ctl.abort(), 9000);
  try {
    const r = await fetch(url, { method: "GET", redirect: "follow", signal: ctl.signal, headers: { "User-Agent": "Central-Monitor/1.0" } });
    const ms = Date.now() - t0;
    if (r.status === 401 || r.status === 403) return { ok: true, ms, codigo: r.status, aviso: "protegido por senha" };
    return r.status < 400 ? { ok: true, ms, codigo: r.status } : { ok: false, ms, codigo: r.status, erro: "Erro " + r.status };
  } catch (e) {
    return { ok: false, ms: Date.now() - t0, erro: e.name === "AbortError" ? "Não respondeu" : "Fora do ar" };
  } finally { clearTimeout(tm); }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return responder(res, 405, { erro: "Use POST" });
  const sessao = await autenticar(req);
  if (!sessao) return responder(res, 401, { erro: "Entre na Central para verificar os sites" });
  const { urls } = await lerCorpo(req);
  const lista = (Array.isArray(urls) ? urls : []).filter((u) => /^https?:\/\//.test(u)).slice(0, 60);
  const resultados = {};
  let i = 0;
  async function trabalhador() { while (i < lista.length) { const u = lista[i++]; resultados[u] = await checar(u); } }
  await Promise.all(Array.from({ length: 8 }, trabalhador));
  responder(res, 200, { resultados, em: new Date().toISOString() });
}
