(function () {
  'use strict';

  var dados = window.LR || {};
  var perfilInstagram = dados.instagram || 'https://www.instagram.com/lrstudiodedebelezailha/';

  /* ---------------------------------------------------------- agendamento */

  function enderecoDeAgendamento(mensagem) {
    var numero = (dados.whatsappNumero || '').replace(/\D/g, '');
    if (numero) {
      var texto = mensagem || dados.mensagem || '';
      return 'https://wa.me/' + numero + (texto ? '?text=' + encodeURIComponent(texto) : '');
    }
    return dados.whatsappLink || perfilInstagram;
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-agendar]'), function (el) {
    el.setAttribute('href', enderecoDeAgendamento(el.getAttribute('data-msg')));
    el.setAttribute('target', '_blank');
    el.setAttribute('rel', 'noopener');
  });

  /* ----------------------------------------------------------------- topo */

  var topo = document.getElementById('topo');
  var flutuante = document.querySelector('.flutuante');
  var capa = document.getElementById('inicio');

  function aoRolar() {
    var y = window.pageYOffset || document.documentElement.scrollTop;
    topo.classList.toggle('is-rolado', y > 24);
    if (flutuante) {
      var limite = capa ? capa.offsetHeight * 0.7 : 500;
      flutuante.classList.toggle('is-ativo', y > limite);
    }
  }
  window.addEventListener('scroll', aoRolar, { passive: true });
  window.addEventListener('resize', aoRolar);
  aoRolar();

  /* ----------------------------------------------------------- menu móvel */

  var botaoMenu = document.getElementById('abrirMenu');
  var menu = document.getElementById('menu');
  var veu = document.createElement('div');
  veu.className = 'veu';
  document.body.appendChild(veu);

  function fecharMenu() {
    menu.classList.remove('is-aberto');
    veu.classList.remove('is-ativo');
    botaoMenu.setAttribute('aria-expanded', 'false');
    botaoMenu.querySelector('.sr').textContent = 'Abrir menu';
    document.body.classList.remove('is-travado');
  }

  function abrirMenu() {
    menu.classList.add('is-aberto');
    veu.classList.add('is-ativo');
    botaoMenu.setAttribute('aria-expanded', 'true');
    botaoMenu.querySelector('.sr').textContent = 'Fechar menu';
    document.body.classList.add('is-travado');
    // o painel só fica focável depois de sair de visibility:hidden
    window.setTimeout(function () {
      var primeiro = menu.querySelector('a');
      if (primeiro && menu.classList.contains('is-aberto')) primeiro.focus();
    }, 80);
  }

  botaoMenu.addEventListener('click', function () {
    if (botaoMenu.getAttribute('aria-expanded') === 'true') { fecharMenu(); botaoMenu.focus(); }
    else abrirMenu();
  });

  veu.addEventListener('click', fecharMenu);

  Array.prototype.forEach.call(menu.querySelectorAll('a'), function (a) {
    a.addEventListener('click', fecharMenu);
  });

  var consultaLarga = window.matchMedia('(min-width: 900px)');
  function ajustarMenu() { if (consultaLarga.matches) fecharMenu(); }
  if (consultaLarga.addEventListener) consultaLarga.addEventListener('change', ajustarMenu);
  else if (consultaLarga.addListener) consultaLarga.addListener(ajustarMenu);

  /* -------------------------------------------------------- fotos surgem */

  var animar = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var reveladas = document.querySelectorAll('[data-rev]');

  if (animar && 'IntersectionObserver' in window) {
    Array.prototype.forEach.call(reveladas, function (el) { el.classList.add('rev'); });

    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (entrada.isIntersecting) {
          entrada.target.classList.add('is-visivel');
          observador.unobserve(entrada.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });

    Array.prototype.forEach.call(reveladas, function (el) { observador.observe(el); });
  }

  /* ----------------------------------------------------------------- lupa */

  var galeria = document.getElementById('galeria');
  var lupa = document.getElementById('lupa');

  if (galeria && lupa) {
    var itens = Array.prototype.slice.call(galeria.querySelectorAll('.galeria__item'));
    var imagemLupa = document.getElementById('lupaImagem');
    var atual = 0;
    var origem = null;

    function mostrar(indice) {
      atual = (indice + itens.length) % itens.length;
      var img = itens[atual].querySelector('img');
      imagemLupa.setAttribute('src', img.getAttribute('src'));
      imagemLupa.setAttribute('alt', img.getAttribute('alt') || '');
    }

    function abrirLupa(indice, botao) {
      origem = botao;
      mostrar(indice);
      lupa.hidden = false;
      document.body.classList.add('is-travado');
      window.requestAnimationFrame(function () { lupa.classList.add('is-aberta'); });
      document.getElementById('lupaFechar').focus();
      if (flutuante) flutuante.style.visibility = 'hidden';
    }

    function fecharLupa() {
      lupa.classList.remove('is-aberta');
      document.body.classList.remove('is-travado');
      if (flutuante) flutuante.style.visibility = '';
      window.setTimeout(function () { lupa.hidden = true; }, 260);
      if (origem) origem.focus();
    }

    itens.forEach(function (botao, i) {
      botao.addEventListener('click', function () { abrirLupa(i, botao); });
    });

    document.getElementById('lupaFechar').addEventListener('click', fecharLupa);
    document.getElementById('lupaAnterior').addEventListener('click', function () { mostrar(atual - 1); });
    document.getElementById('lupaProxima').addEventListener('click', function () { mostrar(atual + 1); });

    lupa.addEventListener('click', function (evento) {
      if (evento.target === lupa || evento.target.classList.contains('lupa__palco')) fecharLupa();
    });

    document.addEventListener('keydown', function (evento) {
      if (lupa.hidden) return;
      if (evento.key === 'Escape') fecharLupa();
      if (evento.key === 'ArrowLeft') mostrar(atual - 1);
      if (evento.key === 'ArrowRight') mostrar(atual + 1);
      if (evento.key === 'Tab') {
        var focaveis = lupa.querySelectorAll('button');
        var primeiro = focaveis[0];
        var ultimo = focaveis[focaveis.length - 1];
        if (evento.shiftKey && document.activeElement === primeiro) { evento.preventDefault(); ultimo.focus(); }
        else if (!evento.shiftKey && document.activeElement === ultimo) { evento.preventDefault(); primeiro.focus(); }
      }
    });
  }

  document.addEventListener('keydown', function (evento) {
    if (evento.key === 'Escape' && menu.classList.contains('is-aberto')) {
      fecharMenu();
      botaoMenu.focus();
    }
  });

  /* -------------------------------------------------------------- links */

  if (dados.instagram) {
    Array.prototype.forEach.call(document.querySelectorAll('#linkInstagram, .js-instagram'), function (a) {
      a.setAttribute('href', dados.instagram);
    });
  }

  if (dados.endereco) {
    var rota = 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(dados.endereco);
    Array.prototype.forEach.call(document.querySelectorAll('#linkMapa, .js-mapa'), function (a) {
      a.setAttribute('href', rota);
    });
  }

})();
