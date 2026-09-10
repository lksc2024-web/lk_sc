# LR Studio de Beleza — prévia do site

Página única, estática, sem dependências e sem etapa de build.
Basta abrir `index.html` no navegador ou publicar a pasta em qualquer hospedagem
de arquivos estáticos.

Para testar localmente com um servidor:

```bash
python3 -m http.server 8080
# depois acesse http://localhost:8080
```

## Estrutura

```
index.html
assets/
  css/estilo.css
  js/config.js      ← contatos do estúdio
  js/site.js
  img/
    logo/           logo do estúdio e ícones do navegador
    capa/           fotos da primeira dobra
    servicos/       unhas, cabelos e sobrancelhas
    unhas/          seção de unhas
    cabelos/        seção de cabelos
    galeria/        seção "Resultados reais"
    ambiente/       foto do estúdio
```

## Contatos

Tudo o que muda com o tempo está em `assets/js/config.js`:

| Campo            | O que é                                                              |
| ---------------- | -------------------------------------------------------------------- |
| `whatsappLink`   | Link de agendamento usado hoje (o mesmo da bio do Instagram)          |
| `whatsappNumero` | Número com DDI e DDD, só dígitos. Se for preenchido, passa a valer no lugar do link e cada botão abre a conversa com a mensagem do serviço já escrita |
| `mensagem`       | Texto que aparece pronto na conversa (usado junto com o número)       |
| `instagram`      | Perfil do estúdio                                                     |
| `endereco`       | Endereço usado no botão "Como chegar"                                 |

Todos os botões de agendamento da página leem esse arquivo — não é preciso
mexer no HTML.

## Imagens

Todas as fotos da página são trabalhos reais do LR Studio, junto com a logo do
estúdio. Elas foram recortadas do material enviado, então estão limitadas à
resolução da origem (cerca de 400 px de largura).

Para a versão final, o ideal é substituir cada arquivo pela foto original, em
alta, mantendo o mesmo nome e a mesma proporção. O layout se ajusta sozinho.

## Pendências para a versão oficial

- Fotos originais em alta resolução e a logo em arquivo vetorial ou PNG grande.
- Horário de funcionamento completo.
- Confirmação dos serviços e da forma de atendimento a serem listados.
- Domínio próprio e hospedagem.
