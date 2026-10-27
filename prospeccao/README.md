# Prospecção (app de celular)

Versão para celular do painel de prospecção do
[google-maps-claude-kit-sales](https://github.com/herbertcarnaubadesouza/google-maps-claude-kit-sales).
Em vez de raspar o Google Maps com um navegador no Docker, usa a **API oficial do Google Places**.

- `index.html`, `app.js`: o app (instalável na tela inicial, funciona no celular e no computador).
- `api/buscar.js`: busca empresas no Google Places (Text Search). A chave do Google fica salva nos Ajustes do app.
- `api/enriquecer.js`: visita o site de cada empresa e procura e-mail, WhatsApp e redes sociais.
- Dados (leads, buscas, mensagens) no Supabase, protegidos por login. Só o e-mail do dono pode criar conta.
- `municipios.json`: municípios do IBGE (via kelvins/municipios-brasileiros), copiado do kit original.

Variáveis de ambiente na Vercel: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `ALLOWED_EMAIL`.
