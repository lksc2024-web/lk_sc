/* ==========================================================================
   Joyce Beauty — Lógica da prévia (front-end apenas)
   Carrinho persistido em localStorage. Nenhuma integração de pagamento.
   ========================================================================== */

(function () {
  'use strict';

  const STORAGE_KEY = 'jb_preview_cart_v1';
  const FRETE_GRATIS_A_PARTIR_DE = 249;
  const FRETE_PADRAO = 24.9;
  const CUPONS = { JOYCE10: 0.10, BEAUTY15: 0.15 };

  /* ------------------------------ utilitários ---------------------------- */

  const brl = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const byId = id => PRODUTOS.find(p => p.id === id);
  const catNome = id => (CATEGORIAS.find(c => c.id === id) || {}).nome || id;
  const escape = s => String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  function estrelas(nota) {
    const cheias = Math.round(nota);
    return '★'.repeat(cheias) + '☆'.repeat(5 - cheias);
  }

  function toast(msg) {
    let el = $('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('is-visible');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('is-visible'), 2600);
  }

  /* -------------------------------- carrinho ----------------------------- */

  function lerCarrinho() {
    try {
      const dados = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(dados) ? dados.filter(i => byId(i.id)) : [];
    } catch (e) {
      return [];
    }
  }

  function salvarCarrinho(itens) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(itens));
    } catch (e) {
      /* modo privativo: a prévia segue funcionando na sessão atual */
    }
    Cart.itens = itens;
    atualizarContador();
  }

  const Cart = {
    itens: lerCarrinho(),

    chave(id, variacao) { return id + '::' + (variacao || ''); },

    adicionar(id, qtd = 1, variacao = null) {
      const produto = byId(id);
      if (!produto) return;
      const chave = this.chave(id, variacao);
      const existente = this.itens.find(i => this.chave(i.id, i.variacao) === chave);
      if (existente) existente.qtd += qtd;
      else this.itens.push({ id, qtd, variacao });
      salvarCarrinho(this.itens);
      toast(`${produto.nome} adicionado à sacola`);
    },

    definirQtd(chave, qtd) {
      const item = this.itens.find(i => this.chave(i.id, i.variacao) === chave);
      if (!item) return;
      item.qtd = Math.max(1, Math.min(99, qtd));
      salvarCarrinho(this.itens);
    },

    remover(chave) {
      this.itens = this.itens.filter(i => this.chave(i.id, i.variacao) !== chave);
      salvarCarrinho(this.itens);
    },

    limpar() { salvarCarrinho([]); },

    quantidade() { return this.itens.reduce((t, i) => t + i.qtd, 0); },

    subtotal() {
      return this.itens.reduce((t, i) => {
        const p = byId(i.id);
        return t + (p ? p.preco * i.qtd : 0);
      }, 0);
    }
  };

  function atualizarContador() {
    const total = Cart.quantidade();
    $$('[data-cart-count]').forEach(el => {
      el.textContent = total;
      el.hidden = total === 0;
    });
  }

  /* ------------------------------- componentes --------------------------- */

  const FLAGS = { sale: ['flag--sale', 'Oferta'], new: ['flag--new', 'Novidade'], best: ['', 'Mais vendido'] };

  function cardProduto(p) {
    const flag = p.flag && FLAGS[p.flag]
      ? `<div class="card__flags"><span class="flag ${FLAGS[p.flag][0]}">${FLAGS[p.flag][1]}</span></div>` : '';
    const de = p.precoDe ? `<span class="price__old">${brl(p.precoDe)}</span>` : '';
    const link = `produto.html?id=${encodeURIComponent(p.id)}`;
    return `
      <article class="card">
        <a class="card__media" href="${link}" aria-label="Ver ${escape(p.nome)}">
          ${flag}
          <img src="${p.img}" alt="${escape(p.nome)}" loading="lazy" width="200" height="240">
        </a>
        <div class="card__body">
          <span class="card__cat">${escape(catNome(p.categoria))}</span>
          <h3 class="card__title"><a href="${link}">${escape(p.nome)}</a></h3>
          <p class="rating"><span class="rating__stars" aria-hidden="true">${estrelas(p.rating)}</span>
             ${p.rating.toFixed(1).replace('.', ',')} · ${p.avaliacoes} avaliações</p>
          <div class="price">
            <span class="price__now">${brl(p.preco)}</span>${de}
          </div>
          <span class="price__note">ou 3x de ${brl(p.preco / 3)} sem juros</span>
        </div>
        <div class="card__actions">
          <button class="btn btn--primary" data-add="${p.id}">Adicionar</button>
          <a class="btn btn--light" href="${link}">Detalhes</a>
        </div>
      </article>`;
  }

  /* ---------------------------- vitrine / catálogo ----------------------- */

  function initVitrine() {
    const grade = $('[data-grid]');
    if (!grade) return;

    const estado = {
      categoria: new URLSearchParams(location.search).get('cat') || 'todos',
      ordem: 'destaque',
      limite: parseInt(grade.dataset.limit || '0', 10)
    };

    function ordenar(lista) {
      const copia = lista.slice();
      if (estado.ordem === 'menor') copia.sort((a, b) => a.preco - b.preco);
      if (estado.ordem === 'maior') copia.sort((a, b) => b.preco - a.preco);
      if (estado.ordem === 'nota')  copia.sort((a, b) => b.rating - a.rating);
      return copia;
    }

    function render() {
      let lista = estado.categoria === 'todos'
        ? PRODUTOS
        : PRODUTOS.filter(p => p.categoria === estado.categoria);
      lista = ordenar(lista);
      if (estado.limite) lista = lista.slice(0, estado.limite);

      grade.innerHTML = lista.length
        ? lista.map(cardProduto).join('')
        : '<p class="empty">Nenhum produto nesta categoria na prévia.</p>';

      const contador = $('[data-count]');
      if (contador) {
        contador.textContent = `${lista.length} ${lista.length === 1 ? 'produto' : 'produtos'}`;
      }
    }

    $$('[data-filter]').forEach(chip => {
      chip.setAttribute('aria-pressed', String(chip.dataset.filter === estado.categoria));
      chip.addEventListener('click', () => {
        estado.categoria = chip.dataset.filter;
        $$('[data-filter]').forEach(c => c.setAttribute('aria-pressed', String(c === chip)));
        render();
      });
    });

    const ordenacao = $('[data-sort]');
    if (ordenacao) {
      ordenacao.addEventListener('change', () => {
        estado.ordem = ordenacao.value;
        render();
      });
    }

    render();
  }

  /* ---------------------------- página de produto ------------------------ */

  function initProduto() {
    const raiz = $('[data-pdp]');
    if (!raiz) return;

    const id = new URLSearchParams(location.search).get('id');
    const p = byId(id) || PRODUTOS[0];
    let variacao = p.variacoes ? p.variacoes.opcoes[0] : null;

    document.title = `${p.nome} · Joyce Beauty`;

    const de = p.precoDe ? `<span class="price__old">${brl(p.precoDe)}</span>` : '';
    const economia = p.precoDe
      ? `<span class="flag flag--sale">-${Math.round((1 - p.preco / p.precoDe) * 100)}%</span>` : '';

    const blocoVariacoes = p.variacoes ? `
      <div class="field">
        <label id="lbl-var">${escape(p.variacoes.rotulo)}</label>
        <div class="options" role="group" aria-labelledby="lbl-var">
          ${p.variacoes.opcoes.map((o, i) => `
            <button type="button" class="option" data-option="${escape(o)}" aria-pressed="${i === 0}">${escape(o)}</button>`).join('')}
        </div>
      </div>` : '';

    raiz.innerHTML = `
      <div class="gallery">
        <div class="gallery__main"><img id="pdp-img" src="${p.img}" alt="${escape(p.nome)}" width="200" height="240"></div>
        <div class="gallery__thumbs">
          ${[0, 1, 2].map(i => `
            <button class="thumb" type="button" data-thumb="${i}" aria-pressed="${i === 0}" aria-label="Imagem ${i + 1}">
              <img src="${p.img}" alt="" width="200" height="240">
            </button>`).join('')}
        </div>
      </div>
      <div class="pdp__info">
        <span class="card__cat">${escape(catNome(p.categoria))}</span>
        <h1>${escape(p.nome)}</h1>
        <p class="rating"><span class="rating__stars" aria-hidden="true">${estrelas(p.rating)}</span>
           ${p.rating.toFixed(1).replace('.', ',')} · ${p.avaliacoes} avaliações</p>
        <div class="pdp__price"><span class="price__now">${brl(p.preco)}</span>${de} ${economia}</div>
        <span class="price__note">ou 3x de ${brl(p.preco / 3)} sem juros · frete grátis acima de ${brl(FRETE_GRATIS_A_PARTIR_DE)}</span>
        <p class="pdp__desc">${escape(p.resumo)}</p>
        ${blocoVariacoes}
        <div class="field">
          <label for="pdp-qtd">Quantidade</label>
          <div class="qty">
            <button type="button" data-step="-1" aria-label="Diminuir">−</button>
            <input id="pdp-qtd" type="number" value="1" min="1" max="99" inputmode="numeric">
            <button type="button" data-step="1" aria-label="Aumentar">+</button>
          </div>
        </div>
        <div class="pdp__buy">
          <button class="btn btn--primary" data-pdp-add>Adicionar à sacola</button>
          <a class="btn btn--ghost" href="carrinho.html">Ver sacola</a>
        </div>
        <ul class="split__list">
          <li>${iconeCheck()}<span>Retirada sem custo no salão Joyce Beauty</span></li>
          <li>${iconeCheck()}<span>Entrega em todo o Brasil · 3 a 8 dias úteis</span></li>
          <li>${iconeCheck()}<span>Troca garantida em até 7 dias</span></li>
        </ul>
      </div>`;

    /* abas */
    const abas = $('[data-tabs]');
    if (abas) {
      $('#tab-descricao').innerHTML = `<p>${escape(p.descricao)}</p>`;
      $('#tab-uso').innerHTML = `<ul>${p.comoUsar.map(t => `<li>${escape(t)}</li>`).join('')}</ul>`;
      $('#tab-specs').innerHTML = `<dl class="spec">${Object.entries(p.specs)
        .map(([k, v]) => `<div><dt>${escape(k)}</dt><dd>${escape(v)}</dd></div>`).join('')}</dl>`;

      $$('[data-tab]', abas).forEach(btn => {
        btn.addEventListener('click', () => {
          $$('[data-tab]', abas).forEach(b => b.setAttribute('aria-selected', String(b === btn)));
          $$('.tabs__panel', abas).forEach(pan => { pan.hidden = pan.id !== 'tab-' + btn.dataset.tab; });
        });
      });
    }

    /* migalhas */
    const migalha = $('[data-crumb]');
    if (migalha) migalha.textContent = p.nome;

    /* interações */
    const campoQtd = $('#pdp-qtd', raiz);

    raiz.addEventListener('click', ev => {
      const passo = ev.target.closest('[data-step]');
      if (passo) {
        campoQtd.value = Math.max(1, Math.min(99, (parseInt(campoQtd.value, 10) || 1) + Number(passo.dataset.step)));
        return;
      }
      const opcao = ev.target.closest('[data-option]');
      if (opcao) {
        variacao = opcao.dataset.option;
        $$('[data-option]', raiz).forEach(o => o.setAttribute('aria-pressed', String(o === opcao)));
        return;
      }
      const thumb = ev.target.closest('[data-thumb]');
      if (thumb) {
        $$('[data-thumb]', raiz).forEach(t => t.setAttribute('aria-pressed', String(t === thumb)));
        return;
      }
      if (ev.target.closest('[data-pdp-add]')) {
        Cart.adicionar(p.id, parseInt(campoQtd.value, 10) || 1, variacao);
      }
    });

    /* relacionados */
    const relacionados = $('[data-related]');
    if (relacionados) {
      const lista = PRODUTOS.filter(x => x.categoria === p.categoria && x.id !== p.id).slice(0, 3);
      const complemento = PRODUTOS.filter(x => x.id !== p.id && !lista.includes(x)).slice(0, 3 - lista.length);
      relacionados.innerHTML = lista.concat(complemento).map(cardProduto).join('');
    }
  }

  function iconeCheck() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  /* ------------------------------ página carrinho ------------------------ */

  function initCarrinho() {
    const raiz = $('[data-cart-page]');
    if (!raiz) return;

    let desconto = 0;
    let cupomAplicado = '';

    function render() {
      if (!Cart.itens.length) {
        raiz.innerHTML = `
          <div class="cart-empty">
            <h2>Sua sacola está vazia</h2>
            <p>Explore os produtos demonstrativos da prévia e adicione seus favoritos.</p>
            <a class="btn btn--primary" href="loja.html">Ver a loja</a>
          </div>`;
        return;
      }

      const subtotal = Cart.subtotal();
      const valorDesconto = subtotal * desconto;
      const base = subtotal - valorDesconto;
      const frete = base >= FRETE_GRATIS_A_PARTIR_DE ? 0 : FRETE_PADRAO;
      const total = base + frete;
      const faltando = Math.max(0, FRETE_GRATIS_A_PARTIR_DE - base);
      const progresso = Math.min(100, (base / FRETE_GRATIS_A_PARTIR_DE) * 100);

      raiz.innerHTML = `
        <div class="cart-layout">
          <div>
            <div class="cart-list">
              ${Cart.itens.map(item => {
                const p = byId(item.id);
                const chave = Cart.chave(item.id, item.variacao);
                return `
                <article class="cart-item">
                  <div class="cart-item__media"><img src="${p.img}" alt="${escape(p.nome)}" width="200" height="240"></div>
                  <div>
                    <h3 class="serif"><a href="produto.html?id=${encodeURIComponent(p.id)}">${escape(p.nome)}</a></h3>
                    <p class="cart-item__meta">${escape(catNome(p.categoria))}${item.variacao ? ' · ' + escape(item.variacao) : ''} · ${brl(p.preco)} cada</p>
                    <div class="qty">
                      <button type="button" data-cart-step="-1" data-key="${escape(chave)}" aria-label="Diminuir">−</button>
                      <input type="number" value="${item.qtd}" min="1" max="99" data-cart-qty="${escape(chave)}" inputmode="numeric" aria-label="Quantidade de ${escape(p.nome)}">
                      <button type="button" data-cart-step="1" data-key="${escape(chave)}" aria-label="Aumentar">+</button>
                    </div>
                  </div>
                  <div class="cart-item__right">
                    <strong class="price__now">${brl(p.preco * item.qtd)}</strong>
                    <button class="link-del" data-cart-remove="${escape(chave)}">Remover</button>
                  </div>
                </article>`;
              }).join('')}
            </div>
            <p class="hint" style="margin-top:16px">
              <button class="link-del" data-cart-clear>Esvaziar sacola</button> ·
              <a href="loja.html" style="text-decoration:underline">continuar comprando</a>
            </p>
          </div>

          <aside class="summary">
            <h2>Resumo</h2>
            <div class="progress"><i style="width:${progresso}%"></i></div>
            <p class="hint">${faltando > 0
              ? `Faltam <strong>${brl(faltando)}</strong> para o frete grátis.`
              : '<span class="hint--ok">Você garantiu o frete grátis!</span>'}</p>

            <div class="coupon">
              <input type="text" id="cupom" placeholder="Cupom (JOYCE10)" aria-label="Cupom de desconto" value="${escape(cupomAplicado)}">
              <button class="btn btn--light" data-coupon>Aplicar</button>
            </div>
            <p class="hint" data-coupon-msg>${cupomAplicado
              ? `<span class="hint--ok">Cupom ${escape(cupomAplicado)} aplicado.</span>`
              : 'Cupons de demonstração: JOYCE10 e BEAUTY15.'}</p>

            <div class="summary__row"><span>Subtotal</span><span>${brl(subtotal)}</span></div>
            ${valorDesconto > 0 ? `<div class="summary__row"><span>Desconto</span><span class="free">− ${brl(valorDesconto)}</span></div>` : ''}
            <div class="summary__row"><span>Frete</span><span>${frete === 0 ? '<span class="free">Grátis</span>' : brl(frete)}</span></div>
            <div class="summary__row summary__row--total"><span>Total</span><span>${brl(total)}</span></div>
            <p class="price__note" style="display:block;margin:6px 0 18px">em até 3x de ${brl(total / 3)} sem juros</p>

            <button class="btn btn--primary btn--block" data-checkout>Finalizar compra</button>
            <p class="hint" style="text-align:center;margin-top:12px">Prévia comercial — nenhum pagamento é processado.</p>
          </aside>
        </div>`;
    }

    raiz.addEventListener('click', ev => {
      const passo = ev.target.closest('[data-cart-step]');
      if (passo) {
        const campo = $(`[data-cart-qty="${CSS.escape(passo.dataset.key)}"]`, raiz);
        Cart.definirQtd(passo.dataset.key, (parseInt(campo.value, 10) || 1) + Number(passo.dataset.cartStep));
        render();
        return;
      }
      const remover = ev.target.closest('[data-cart-remove]');
      if (remover) { Cart.remover(remover.dataset.cartRemove); toast('Produto removido da sacola'); render(); return; }

      if (ev.target.closest('[data-cart-clear]')) { Cart.limpar(); render(); return; }

      if (ev.target.closest('[data-coupon]')) {
        const codigo = ($('#cupom', raiz).value || '').trim().toUpperCase();
        if (CUPONS[codigo]) { desconto = CUPONS[codigo]; cupomAplicado = codigo; toast(`Cupom ${codigo} aplicado`); }
        else { desconto = 0; cupomAplicado = ''; toast('Cupom inválido nesta prévia'); }
        render();
        return;
      }

      if (ev.target.closest('[data-checkout]')) {
        toast('Checkout indisponível: esta é uma prévia comercial.');
      }
    });

    raiz.addEventListener('change', ev => {
      const campo = ev.target.closest('[data-cart-qty]');
      if (campo) { Cart.definirQtd(campo.dataset.cartQty, parseInt(campo.value, 10) || 1); render(); }
    });

    render();
  }

  /* ------------------------------ interações gerais ---------------------- */

  function initGlobal() {
    atualizarContador();

    const alternar = $('[data-menu-toggle]');
    const menu = $('#nav-principal');
    if (alternar && menu) {
      alternar.addEventListener('click', () => {
        const aberto = menu.classList.toggle('is-open');
        alternar.setAttribute('aria-expanded', String(aberto));
      });
    }

    document.addEventListener('click', ev => {
      const botao = ev.target.closest('[data-add]');
      if (botao) { ev.preventDefault(); Cart.adicionar(botao.dataset.add, 1); }
    });

    $$('[data-demo-form]').forEach(form => {
      form.addEventListener('submit', ev => {
        ev.preventDefault();
        form.reset();
        toast('Cadastro simulado: a prévia não envia dados.');
      });
    });

    const ano = $('[data-year]');
    if (ano) ano.textContent = new Date().getFullYear();
  }

  document.addEventListener('DOMContentLoaded', () => {
    initGlobal();
    initVitrine();
    initProduto();
    initCarrinho();
  });
})();
