// Recebe os avisos (webhooks) da Kiwify: venda aprovada, reembolso, chargeback, Pix/boleto gerado,
// pagamento recusado e carrinho abandonado. Normaliza e grava pelo registrar_venda do banco.
// Endereço: /api/kiwify?k=<chave da Central>  (a chave aparece em Conexões).
import { responder, lerCorpo, rpc } from "./_lib.js";

const TAXA = 0.0899, FIXO = 2.49;

// A Kiwify manda valores em centavos ("9700" = R$ 97,00). Se vier com ponto decimal, já está em reais.
function reais(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isInteger(v) ? v / 100 : v;
  const s = String(v).trim();
  if (/^\d+$/.test(s)) return Number(s) / 100;
  const x = Number(s.replace(",", "."));
  return Number.isFinite(x) ? x : null;
}

function statusDe(b, o) {
  const ev = String(b.webhook_event_type || b.event || b.type || o.webhook_event_type || "").toLowerCase();
  const st = String(o.order_status || o.status || b.order_status || b.status || "").toLowerCase();
  if (/abandon/.test(ev) || st === "abandoned" || (o.checkout_link && !o.order_id)) return "abandonada";
  if (/refund/.test(ev) || st === "refunded") return "reembolsada";
  if (/charge_?back/.test(ev) || st === "chargedback" || st === "chargeback") return "chargeback";
  if (/reject|refus/.test(ev) || st === "refused" || st === "rejected") return "recusada";
  if (/approved|paid|renewed/.test(ev) || st === "paid" || st === "approved" || st === "completed") return "aprovada";
  if (/billet|pix|waiting|created/.test(ev) || st === "waiting_payment" || st === "pending") return "pendente";
  return st ? "pendente" : "aprovada";
}

export default async function handler(req, res) {
  if (req.method === "GET") return responder(res, 200, { ok: true, servico: "Central · webhook Kiwify" });
  if (req.method !== "POST") return responder(res, 405, { erro: "Use POST" });
  const chave = String((req.query && req.query.k) || new URL(req.url, "http://x").searchParams.get("k") || "");
  if (!chave) return responder(res, 401, { erro: "Falta a chave" });

  const b = await lerCorpo(req);
  const o = b.order || b.data || b;
  const prod = o.Product || o.product || b.Product || {};
  const cli = o.Customer || o.customer || b.Customer || {};
  const com = o.Commissions || o.commissions || b.Commissions || {};
  const trk = o.TrackingParameters || o.tracking_parameters || b.TrackingParameters || {};

  const status = statusDe(b, o);
  const externo = String(o.order_id || o.id || b.order_id || b.id || o.order_ref || "");
  const produtoId = String(prod.product_id || prod.id || o.product_id || "");
  const produtoNome = String(prod.product_name || prod.name || o.product_name || "");
  let bruto = reais(com.charge_amount ?? com.product_base_price ?? o.charge_amount ?? o.amount ?? o.price);
  let liquido = reais(com.my_commission ?? com.settlement_amount ?? o.net_amount);
  if (bruto == null) bruto = 0;
  if (liquido == null) liquido = bruto ? Math.max(0, bruto * (1 - TAXA) - FIXO) : 0;
  const nome = String(cli.full_name || cli.name || [cli.first_name, cli.last_name].filter(Boolean).join(" ") || o.name || "");
  const email = String(cli.email || o.email || "").trim();
  const tel = String(cli.mobile || cli.phone || o.phone || o.mobile || "").replace(/\D/g, "");
  const canal = String(trk.utm_source || trk.src || trk.sck || o.utm_source || "");

  try {
    const r = await rpc("registrar_venda", {
      p_chave: chave, p_origem: "kiwify", p_externo: externo, p_status: status,
      p_produto_id: produtoId, p_produto_nome: produtoNome, p_bruto: bruto, p_liquido: liquido,
      p_nome: nome, p_email: email, p_tel: tel, p_canal: canal, p_payload: b,
    });
    if (r === "chave_invalida") return responder(res, 401, { erro: "Chave inválida" });
    return responder(res, 200, { ok: true, status });
  } catch (e) {
    return responder(res, 500, { erro: e.message });
  }
}
