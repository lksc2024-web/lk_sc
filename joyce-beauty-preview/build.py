#!/usr/bin/env python3
"""
Empacota a prévia Joyce Beauty.

Gera, em dist/:
  - joyce-beauty-previa.html  : arquivo ÚNICO e autocontido (CSS, JS e imagens
    embutidos; navegação por hash). Abre com duplo clique, sem servidor.
  - joyce-beauty-previa.zip   : pacote completo (site multipágina + arquivo único).

Uso:  python3 build.py
"""

import base64
import pathlib
import re
import zipfile

RAIZ = pathlib.Path(__file__).resolve().parent
DIST = RAIZ / 'dist'
PAGINAS = ['index.html', 'loja.html', 'produto.html', 'carrinho.html']
ROTAS = ['home', 'loja', 'produto', 'carrinho']


def ler(caminho: str) -> str:
    return (RAIZ / caminho).read_text(encoding='utf-8')


def trecho(html: str, padrao: str, nome: str) -> str:
    achado = re.search(padrao, html, re.S)
    if not achado:
        raise SystemExit(f'não encontrei {nome} — o HTML mudou de estrutura?')
    return achado.group(0)


def imagens_em_data_uri() -> dict:
    mapa = {}
    for svg in sorted((RAIZ / 'assets' / 'img').glob('*.svg')):
        b64 = base64.b64encode(svg.read_bytes()).decode('ascii')
        mapa[f'assets/img/{svg.name}'] = f'data:image/svg+xml;base64,{b64}'
    return mapa


def embutir_imagens(texto: str, mapa: dict) -> str:
    for caminho, uri in mapa.items():
        texto = texto.replace(caminho, uri)
    return texto


ROTEADOR = r"""
/* Roteador do pacote único: troca de "página" pelo hash, sem recarregar. */
(function () {
  'use strict';
  var ROTAS = __ROTAS__;
  var TITULOS = {
    home: 'Joyce Beauty · Loja virtual (prévia)',
    loja: 'Loja · Joyce Beauty (prévia)',
    produto: 'Produto · Joyce Beauty (prévia)',
    carrinho: 'Sacola · Joyce Beauty (prévia)'
  };
  var secoes = {};
  ROTAS.forEach(function (r) { secoes[r] = document.querySelector('[data-route="' + r + '"]'); });

  function rotaAtual() {
    var h = (location.hash || '').replace(/^#\/?/, '');
    return h.split('?')[0] || 'home';
  }

  function marcarMenu(nome) {
    Array.prototype.forEach.call(document.querySelectorAll('#nav-principal a'), function (a) {
      var alvo = (a.getAttribute('href') || '').replace(/^#\//, '').split('?')[0] || 'home';
      if (alvo === nome && a.getAttribute('href').indexOf('?') === -1) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  function mostrar(nome) {
    ROTAS.forEach(function (r) { secoes[r].hidden = (r !== nome); });
    var JB = window.JoyceBeauty;
    if (nome === 'home' || nome === 'loja') JB.initVitrine(secoes[nome]);
    if (nome === 'produto') JB.initProduto(secoes[nome]);
    if (nome === 'carrinho') JB.initCarrinho(secoes[nome]);
    JB.atualizarContador();
    if (nome !== 'produto') document.title = TITULOS[nome];
    marcarMenu(nome);
    var menu = document.getElementById('nav-principal');
    if (menu) menu.classList.remove('is-open');
  }

  function algumaVisivel() {
    return ROTAS.some(function (r) { return !secoes[r].hidden; });
  }

  function navegar(inicial) {
    var nome = rotaAtual();
    if (ROTAS.indexOf(nome) === -1) {          /* âncora interna, ex.: #destaques */
      if (!algumaVisivel()) mostrar('home');
      var alvo = document.getElementById(nome);
      if (alvo) alvo.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    mostrar(nome);
    if (!inicial) window.scrollTo({ top: 0, behavior: 'auto' });
  }

  /* Links do site continuam apontando para *.html: traduzimos para rotas. */
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest ? ev.target.closest('a[href]') : null;
    if (!a) return;
    var m = /^(index|loja|produto|carrinho)\.html(\?.*)?$/.exec(a.getAttribute('href') || '');
    if (!m) return;
    ev.preventDefault();
    var destino = '#/' + (m[1] === 'index' ? '' : m[1]) + (m[2] || '');
    if (location.hash === destino) navegar(false);
    else location.hash = destino;
  });

  window.addEventListener('hashchange', function () { navegar(false); });
  document.addEventListener('DOMContentLoaded', function () { navegar(true); });
})();
"""


def gerar_arquivo_unico() -> pathlib.Path:
    imagens = imagens_em_data_uri()
    index = ler('index.html')

    topo = trecho(index, r'<div class="preview-bar">.*?</header>', 'topo (faixa + header)')
    rodape = trecho(index, r'<footer class="footer">.*?</footer>', 'rodapé')

    secoes = []
    for rota, pagina in zip(ROTAS, PAGINAS):
        main = trecho(ler(pagina), r'<main>.*?</main>', f'<main> de {pagina}')
        secoes.append(f'<section class="route" data-route="{rota}" hidden>\n{main}\n</section>')

    css = ler('assets/css/styles.css')
    js = ler('assets/js/produtos.js') + '\n' + ler('assets/js/app.js')
    roteador = ROTEADOR.replace('__ROTAS__', repr(ROTAS).replace("'", '"'))

    doc = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Joyce Beauty · Loja virtual (prévia)</title>
<meta name="description" content="Prévia comercial da loja virtual do salão Joyce Beauty — arquivo único, sem servidor.">
<meta name="robots" content="noindex, nofollow">
<link rel="icon" href="assets/img/p06.svg">
<style>
{css}
</style>
</head>
<body>

{topo}

{chr(10).join(secoes)}

{rodape}

<script>window.JB_BUNDLE = true;</script>
<script>
{js}
</script>
<script>
{roteador}
</script>
</body>
</html>
"""
    doc = embutir_imagens(doc, imagens)

    DIST.mkdir(exist_ok=True)
    destino = DIST / 'joyce-beauty-previa.html'
    destino.write_text(doc, encoding='utf-8')
    return destino


def gerar_zip(arquivo_unico: pathlib.Path) -> pathlib.Path:
    destino = DIST / 'joyce-beauty-previa.zip'
    itens = [RAIZ / p for p in PAGINAS] + [RAIZ / 'README.md', RAIZ / 'build.py']
    itens += sorted((RAIZ / 'assets').rglob('*'))
    itens.append(arquivo_unico)

    with zipfile.ZipFile(destino, 'w', zipfile.ZIP_DEFLATED) as z:
        for item in itens:
            if item.is_file():
                z.write(item, pathlib.Path('joyce-beauty-previa') / item.relative_to(RAIZ))
    return destino


if __name__ == '__main__':
    unico = gerar_arquivo_unico()
    pacote = gerar_zip(unico)
    for f in (unico, pacote):
        print(f'{f.relative_to(RAIZ)} — {f.stat().st_size / 1024:.0f} KB')
