// Link rastreado: /r/<final> conta o clique e manda para o destino.
import { rpc } from "./_lib.js";

export default async function handler(req, res) {
  const url = new URL(req.url, "http://x");
  const s = String((req.query && req.query.s) || url.searchParams.get("s") || "").toLowerCase();
  let destino = null;
  if (/^[a-z0-9-]{2,40}$/.test(s)) {
    try { destino = await rpc("registrar_clique", { p_slug: s, p_ref: String(req.headers.referer || "").slice(0, 300) }); } catch { destino = null; }
  }
  if (typeof destino === "string" && /^https?:\/\//.test(destino)) {
    res.statusCode = 302;
    res.setHeader("Location", destino);
    res.setHeader("Cache-Control", "no-store");
    return res.end();
  }
  res.statusCode = 404;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end('<!DOCTYPE html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Link não encontrado</title><body style="font:16px system-ui;display:grid;place-items:center;height:100vh;margin:0;background:#0c0f0e;color:#e9edeb"><p>Este link não existe ou foi removido.</p></body>');
}
