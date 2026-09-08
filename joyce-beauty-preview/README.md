# Joyce Beauty — Prévia da loja virtual

Prévia **comercial** (demonstrativa) da loja virtual do salão de beleza Joyce Beauty.
Serve para apresentação e aprovação visual: **não é o projeto definitivo** e não possui
back-end, cadastro real, integração de pagamento ou controle de estoque.

## Escopo desta prévia

- Front-end visual e responsivo (desktop, tablet e celular)
- Catálogo com **12 produtos demonstrativos** em 4 categorias
- Página de produto (galeria, variações, quantidade, abas e relacionados)
- Carrinho simples com persistência local (`localStorage`), cupom e frete simulados

Fora do escopo: checkout real, meios de pagamento, área do cliente, painel administrativo,
integração com ERP/estoque e SEO/analytics de produção.

## Como abrir

**Jeito mais simples (recomendado para apresentar):** abra
`dist/joyce-beauty-previa.html` com duplo clique. É um arquivo único e
autocontido — CSS, JavaScript e imagens embutidos, navegação entre as páginas
por hash. Funciona sem servidor, sem internet e pode ser enviado por e-mail ou
WhatsApp como um anexo só.

**Versão multipágina (para desenvolvimento):** abra `index.html` no navegador.
Para o carrinho persistir entre as páginas, use um servidor local:

```bash
cd joyce-beauty-preview
python3 -m http.server 8080
# acesse http://localhost:8080
```

## Como gerar o pacote

```bash
cd joyce-beauty-preview
python3 build.py
```

Gera em `dist/`:

- `joyce-beauty-previa.html` — arquivo único autocontido (~91 KB)
- `joyce-beauty-previa.zip` — pacote completo: site multipágina + arquivo único
  + este README, pronto para entregar ou hospedar

Rode o script sempre que alterar páginas, estilos, catálogo ou imagens.

## Estrutura

```
joyce-beauty-preview/
├── index.html          # home: vitrine, categorias, destaques, depoimentos
├── loja.html           # catálogo com filtro por categoria e ordenação
├── produto.html        # página de produto (?id=slug-do-produto)
├── carrinho.html       # sacola, cupom, frete e resumo do pedido
├── build.py            # empacotador: gera o arquivo único e o .zip
├── assets/
│   ├── css/styles.css  # estilos e breakpoints
│   ├── js/produtos.js  # catálogo demonstrativo (dados fictícios)
│   ├── js/app.js       # vitrine, filtros, página de produto e carrinho
│   └── img/*.svg       # ilustrações dos produtos (SVG local, sem rede)
└── dist/
    └── joyce-beauty-previa.html   # pacote de entrega (arquivo único)
```

O mesmo `app.js` roda nos dois modos: nas páginas separadas ele lê a query
string; no arquivo único, um roteador por hash mostra uma seção por vez.

## Dados de demonstração

Produtos, preços, avaliações e depoimentos são **fictícios**, criados apenas para
ilustrar o layout. Cupons aceitos na prévia: `JOYCE10` (10%) e `BEAUTY15` (15%).
Frete grátis simulado acima de R$ 249; caso contrário, R$ 24,90.
O botão "Finalizar compra" apenas exibe um aviso — nada é enviado ou cobrado.

## Observação de escopo

Este diretório é independente e não tem relação com qualquer outro projeto do
repositório ou de outros repositórios. Alterações aqui não afetam nenhum outro sistema.
