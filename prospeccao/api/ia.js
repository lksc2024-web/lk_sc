// POST /api/ia — assistente de IA (Claude), opcional: só funciona com a chave cadastrada em Ajustes.
// Corpo: { tarefa: "mensagem" | "classificar" | "pergunta", contexto: {...}, texto: "..." }
// Devolve: { tipo_resposta, mensagem, explicacao, valor_sugerido }
import Anthropic from "@anthropic-ai/sdk";
import { autenticar, lerCorpo, responder, SUPABASE_KEY, SUPABASE_URL } from "./_lib.js";

const SISTEMA = `Você é o assistente comercial de um desenvolvedor brasileiro que vende: landing pages, sites, lojas virtuais, \
aplicativos, sistemas sob medida, CRM, automações e atendentes com inteligência artificial (WhatsApp/Instagram), \
gestão de tráfego pago e presença digital. Ele prospecta empresas locais encontradas no Google Maps pelo WhatsApp, \
sem que elas tenham pedido — então cada mensagem precisa gerar confiança e não parecer golpe nem spam.

Regras para mensagens de WhatsApp:
- Português do Brasil, tom humano e respeitoso, frases curtas, no máximo uns 600 caracteres. Sem emojis em excesso.
- Cite apenas fatos que estão no contexto (nota, avaliações, o que foi observado no site). Nunca invente dados, \
clientes, resultados ou links. Use o portfólio e o nome do vendedor só se vierem no perfil.
- Primeiro contato: um problema concreto observado, a solução e o benefício para o negócio; ofereça o diagnóstico \
gratuito e sem compromisso; não fale de preço; termine com uma pergunta simples; inclua uma saída educada \
("se não fizer sentido, é só me avisar").
- Respostas do cliente: rejeição -> agradeça, uma pergunta leve para entender o motivo e deixe a porta aberta, sem \
insistir; atenção (dúvida, "quanto custa", "como funciona") -> explique com clareza e conduza para o diagnóstico ou \
uma conversa rápida; desejo -> próximos passos concretos (prévia, chamada de 15 minutos); aprovação -> proposta, \
escopo, prazo e forma de contato para fechar.
- valor_sugerido: uma faixa em reais para o serviço mais adequado, baseada na tabela de preços do perfil quando houver; \
é só para o vendedor ver, nunca coloque o valor dentro da mensagem do primeiro contato.

Tarefas:
- "mensagem": escreva a próxima mensagem para o lead, de acordo com a etapa do contexto. tipo_resposta = "nenhum".
- "classificar": o texto é a resposta do cliente. Classifique em rejeicao, atencao, desejo ou aprovacao e escreva a \
mensagem para responder.
- "pergunta": o texto é uma pergunta do vendedor (estratégia, objeções, preço, abordagem). Responda em "mensagem" de \
forma prática e direta. tipo_resposta = "nenhum".
Em "explicacao", uma frase curta dizendo o porquê da sua escolha.`;

const FORMATO = {
  type: "json_schema",
  schema: {
    type: "object",
    properties: {
      tipo_resposta: { type: "string", enum: ["rejeicao", "atencao", "desejo", "aprovacao", "nenhum"] },
      mensagem: { type: "string" },
      explicacao: { type: "string" },
      valor_sugerido: { type: "string" },
    },
    required: ["tipo_resposta", "mensagem", "explicacao", "valor_sugerido"],
    additionalProperties: false,
  },
};

async function chaveIa(token) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/config?select=ia_key`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
  });
  if (!r.ok) return "";
  const linhas = await r.json();
  return (linhas[0] && linhas[0].ia_key) || "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") return responder(res, 405, { erro: "Use POST." });
  const sessao = await autenticar(req);
  if (!sessao) return responder(res, 401, { erro: "Faça login de novo." });
  const chave = await chaveIa(sessao.token);
  if (!chave) return responder(res, 400, { erro: "A IA está desligada. Cadastre a chave da Anthropic em Ajustes para usar." });

  const { tarefa = "pergunta", contexto = {}, texto = "" } = await lerCorpo(req);
  if (!["mensagem", "classificar", "pergunta"].includes(tarefa)) return responder(res, 400, { erro: "Tarefa inválida." });
  const pedido = `Tarefa: ${tarefa}\n\nContexto (JSON):\n${JSON.stringify(contexto).slice(0, 12000)}\n\n` +
    (texto ? `Texto:\n${String(texto).slice(0, 4000)}` : "");

  const client = new Anthropic({ apiKey: chave });
  try {
    const resp = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default", // se o modelo recusar, a API tenta o modelo recomendado na mesma chamada
      cache_control: { type: "ephemeral" },
      output_config: { effort: "low", format: FORMATO },
      system: SISTEMA,
      messages: [{ role: "user", content: pedido }],
    });
    if (resp.stop_reason === "refusal") return responder(res, 422, { erro: "A IA não quis responder a esse pedido. Tente reformular." });
    const txt = resp.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    let saida;
    try { saida = JSON.parse(txt); } catch { return responder(res, 502, { erro: "A IA respondeu fora do formato. Tente de novo." }); }
    return responder(res, 200, saida);
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return responder(res, 400, { erro: "Chave da Anthropic inválida. Confira em Ajustes." });
    if (e instanceof Anthropic.RateLimitError) return responder(res, 429, { erro: "Muitos pedidos à IA agora. Espere um minuto." });
    if (e instanceof Anthropic.BadRequestError) {
      console.error("IA 400", e.message);
      return responder(res, 400, { erro: `A IA recusou o pedido (confira o crédito da conta Anthropic): ${e.message}` });
    }
    if (e instanceof Anthropic.APIError) { console.error("IA", e.status, e.message); return responder(res, 502, { erro: "A IA está fora do ar. Tente daqui a pouco." }); }
    console.error("IA", e);
    return responder(res, 502, { erro: "Não consegui falar com a IA." });
  }
}
