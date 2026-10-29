# Central

Painel de controle de tudo o que é vendido: projetos e serviços, hospedagens (sites), investimento,
prospecção e leads, clientes e mensagens por nicho. Instalável no celular, abre no computador e no iPad.

- Mesmo Supabase e mesmo login do app `prospeccao/` (tabelas `leads`, `buscas`, `config` são compartilhadas).
- Tabelas próprias: `central_config`, `projetos`, `metricas`, `vendas`, `clientes`, `links`, `cliques`, `modelos`, `disparos` (RLS: só o dono).
- `api/kiwify.js`: webhook da Kiwify (`/api/kiwify?k=<chave>`), grava pela função `registrar_venda`.
- `api/r.js`: links rastreados (`/r/<final>`), conta pela função `registrar_clique`.
- `api/status.js`: verifica se os sites estão no ar.
- `cena3d.js`: cenas 3D (three.js) da entrada e da visão geral.

Variáveis de ambiente na Vercel: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `ALLOWED_EMAIL`.
