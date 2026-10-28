# Prospecção (app de celular)

Versão para celular do painel de prospecção do
[google-maps-claude-kit-sales](https://github.com/herbertcarnaubadesouza/google-maps-claude-kit-sales).
Em vez de raspar o Google Maps com um navegador no Docker, usa a **API oficial do Google Places**.

- `index.html`, `app.js`: o app (instalável na tela inicial, funciona no celular e no computador).
- `api/buscar.js`: busca empresas no Google Places (Text Search). A chave do Google fica salva nos Ajustes do app.
- `api/enriquecer.js`: visita o site de cada empresa: e-mail, WhatsApp, redes sociais e o raio-X do site
  (abre? celular? https? velocidade? agendamento? chat? Pixel/Google? rodapé desatualizado?).
- `vendas.js`: motor de vendas por regras, sem custo: grupo (sem presença / a melhorar / boa), oportunidades,
  tabela de preços, mensagens do ciclo (abordagem, lembretes 3-7-7, respostas a rejeição/atenção/desejo/aprovação),
  intervalos que se ajustam ao tempo real de resposta e chance de fechamento.
- `api/ia.js`: assistente de IA opcional (Claude), só com a chave da Anthropic cadastrada em Ajustes.
- Aba Painel: "Fazer hoje", funil, resultado por grupo e nicho, mapa de calor dos melhores horários (dados próprios)
  e referência de mercado dos horários de redes sociais.
- Dados (leads, buscas, mensagens) no Supabase, protegidos por login. Só o e-mail do dono pode criar conta.
- `municipios.json`: municípios do IBGE (via kelvins/municipios-brasileiros), copiado do kit original.

Variáveis de ambiente na Vercel: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `ALLOWED_EMAIL`.
