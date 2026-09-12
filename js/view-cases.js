/* StandSkin — список кейсов и открытие кейса (рулетка) */
(function () {
  'use strict';
  const SS = window.SS, { D, ART, $, $$, esc, gold, fmt } = SS;

  const payback = (c) => c.drops.filter((d) => d.skin.price > c.price).reduce((s, d) => s + d.chance, 0);

  // ───────── главная: список кейсов ─────────
  SS.registerView('cases', (root) => {
    const maxDrop = Math.max(...D.CASES.flatMap((c) => c.drops.map((d) => d.skin.price)));
    const groups = [
      ['Бюджетные', 'для старта с промокодов', (c) => c.price < 1000],
      ['Средние', 'легендарки и первые ножи', (c) => c.price >= 1000 && c.price < 50000],
      ['Премиум', 'ножи, перчатки и Nameless', (c) => c.price >= 50000],
    ];
    const card = (c) => `<a class="case-card ${SS.canAfford(c.price) ? '' : 'cant'}" href="#/case/${c.id}" style="--cc:${c.color}">
        ${c.tag ? `<span class="cc-tag">${esc(c.tag)}</span>` : ''}
        ${ART.caseArt(c)}
        <div class="cc-name">${esc(c.name)}</div>
        <div class="cc-price">${ART.goldIcon()}${fmt(c.price)}</div>
      </a>`;

    root.innerHTML = `
      <section class="hero">
        <div>
          <h1>Кейсы <span>Standoff 2</span></h1>
          <div class="hero-actions">
            <a class="btn btn-primary btn-lg" href="#cases-list" id="hero-open">Открыть кейс</a>
            <button class="btn btn-lg" id="hero-promo" type="button">🎁 Ввести промокод</button>
          </div>
          <div class="hero-stats">
            <div><b>${D.CASES.length}</b>кейсов</div>
            <div><b>${D.SKINS.length}</b>скинов</div>
            <div><b>${fmt(maxDrop)} G</b>макс. дроп</div>
          </div>
        </div>
        <div class="hero-art">
          ${ART.skin(D.SKIN_BY_KEY['AWM|Sport'], 'h1')}
          ${ART.skin(D.SKIN_BY_KEY['Karambit|Gold'], 'h2')}
          ${ART.skin(D.SKIN_BY_KEY['Desert Eagle|Dragon Glass'], 'h3')}
        </div>
      </section>
      <div id="cases-list">
        ${groups.map(([title, sub, fn]) => `
          <h2 class="section-title">${title} <small>${sub}</small></h2>
          <div class="case-grid">${D.CASES.filter(fn).map(card).join('')}</div>`).join('')}
      </div>`;

    $('#hero-promo', root).addEventListener('click', SS.openPromo);
    $('#hero-open', root).addEventListener('click', (e) => {
      e.preventDefault();
      $('#cases-list').scrollIntoView({ behavior: 'smooth' });
    });
    return SS.onChange(() => {
      $$('.case-card', root).forEach((el) => {
        const c = D.CASE_BY_ID[el.getAttribute('href').split('/').pop()];
        el.classList.toggle('cant', !SS.canAfford(c.price));
      });
    });
  });

  // ───────── страница кейса ─────────
  const STRIP_LEN = 64, WIN_INDEX = 56;

  SS.registerView('case', (root, [id]) => {
    const c = D.CASE_BY_ID[id];
    if (!c) { location.hash = '#/'; return null; }

    let count = 1, fast = false, spinning = false, raf = 0;
    const timers = [];

    root.innerHTML = `
      <a class="back-link" href="#/">← Все кейсы</a>
      <div class="case-head">
        ${ART.caseArt(c)}
        <div>
          <h1>${esc(c.name)}</h1>
          <div class="case-meta">
            <span>Цена: <b>${fmt(c.price)} G</b></span>
            <span>Предметов: <b>${c.drops.length}</b></span>
            <span>Шанс окупить: <b>${(payback(c) * 100).toFixed(1)}%</b></span>
            <span>Лучший дроп: <b>${esc(c.drops[0].skin.weapon)} | ${esc(c.drops[0].skin.name)}</b></span>
          </div>
        </div>
      </div>
      <div class="roulette-wrap"><div class="roulette" id="roulette"></div></div>
      <div class="open-bar">
        <div class="counts" id="counts">
          ${[1, 2, 3, 4, 5].map((n) => `<button class="chip ${n === 1 ? 'active' : ''}" data-n="${n}" type="button">x${n}</button>`).join('')}
        </div>
        <div class="right">
          <label class="toggle"><input type="checkbox" id="fast"><i></i>Быстро</label>
          <button class="btn btn-primary btn-lg" id="open-btn" type="button"></button>
        </div>
      </div>
      <div id="result"></div>
      <h2 class="section-title">Содержимое кейса <small>шансы выпадения</small></h2>
      <div class="items-grid">${c.drops.map((d) => SS.itemCard(d.skin, { chance: d.chance })).join('')}</div>`;

    const rouletteEl = $('#roulette', root), openBtn = $('#open-btn', root), resultEl = $('#result', root);

    const filler = () => (SS.rand() < 0.3
      ? c.drops[Math.floor(SS.rand() * c.drops.length)].skin
      : SS.pickWeighted(c.drops).skin);

    function rowsHtml(strips) {
      rouletteEl.className = 'roulette' + (count > 1 ? ' multi m' + count : '');
      rouletteEl.innerHTML = strips.map((skins) => `<div class="r-row"><div class="r-marker"></div>
        <div class="r-strip">${skins.map((s) => SS.itemCard(s)).join('')}</div></div>`).join('');
    }
    const cardStep = (strip) => strip.children[1].offsetLeft - strip.children[0].offsetLeft;
    const cardW = (strip) => strip.children[0].offsetWidth;

    function renderIdle() {
      rowsHtml(Array.from({ length: count }, () => Array.from({ length: 24 }, filler)));
      requestAnimationFrame(() => {
        $$('.r-strip', rouletteEl).forEach((strip) => {
          const row = strip.parentElement;
          const x = 12 * cardStep(strip) + cardW(strip) / 2 - row.clientWidth / 2;
          strip.style.transform = `translateX(${-x}px)`;
        });
      });
    }

    function updateButton() {
      const total = c.price * count;
      if (spinning) { openBtn.disabled = true; openBtn.innerHTML = 'Открываем...'; return; }
      openBtn.disabled = false;
      openBtn.innerHTML = SS.canAfford(total)
        ? `Открыть за ${gold(total)}`
        : `Не хватает ${gold(total - SS.state.balance)}`;
      openBtn.classList.toggle('btn-primary', SS.canAfford(total));
    }

    function setBusy(b) {
      spinning = b;
      $$('#counts .chip', root).forEach((ch) => { ch.disabled = b; });
      $('#fast', root).disabled = b;
      updateButton();
    }

    async function open() {
      if (spinning) return;
      const total = c.price * count;
      if (!SS.canAfford(total)) {
        SS.toast('Недостаточно голды. Введи промокод или продай скины.', 'bad');
        SS.openPromo();
        return;
      }
      SS.spend(total);
      SS.state.stats.opened += count;
      SS.state.stats.spent += total;
      const wins = Array.from({ length: count }, () => SS.pickWeighted(c.drops).skin);
      const items = wins.map((s) => SS.addItem(s.id, { silent: true }));
      SS.changed(-total);
      resultEl.innerHTML = '';
      setBusy(true);
      SS.sfx.open();

      rowsHtml(wins.map((win) => {
        const arr = Array.from({ length: STRIP_LEN }, filler);
        arr[WIN_INDEX] = win;
        return arr;
      }));
      const strips = $$('.r-strip', rouletteEl);
      await new Promise((r) => requestAnimationFrame(r));

      const dur = fast ? 1600 : 6800;
      let longest = 0;
      strips.forEach((strip, i) => {
        const row = strip.parentElement;
        const step = cardStep(strip), w = cardW(strip);
        const jitter = (SS.rand() - 0.5) * w * 0.84;
        const target = WIN_INDEX * step + w / 2 - row.clientWidth / 2 + jitter;
        const d = dur + (fast ? 0 : i * 220);
        longest = Math.max(longest, d);
        strip.style.transform = 'translateX(0px)';
        void strip.offsetWidth;
        strip.style.transition = `transform ${d}ms cubic-bezier(.08,.62,.1,1)`;
        strip.style.transform = `translateX(${-target}px)`;
      });

      // щелчки при прохождении карточек через маркер
      const first = strips[0], step0 = cardStep(first), rowW = first.parentElement.clientWidth;
      let lastIdx = -1;
      const tickLoop = () => {
        const m = new DOMMatrixReadOnly(getComputedStyle(first).transform);
        const idx = Math.floor((-m.m41 + rowW / 2) / step0);
        if (idx !== lastIdx) { if (lastIdx !== -1) SS.sfx.tick(); lastIdx = idx; }
        raf = requestAnimationFrame(tickLoop);
      };
      raf = requestAnimationFrame(tickLoop);

      timers.push(setTimeout(() => finish(strips, wins, items), longest + 150));
    }

    function finish(strips, wins, items) {
      cancelAnimationFrame(raf);
      strips.forEach((strip) => strip.children[WIN_INDEX].classList.add('win'));
      wins.forEach((s) => SS.pushFeed(s, 'Вы', true));
      const best = wins.reduce((a, b) => (b.price > a.price ? b : a));
      if (best.knife || best.price >= c.price * 3) { SS.sfx.big(); SS.burstAt(strips[0].children[WIN_INDEX], SS.rarityOf(best).color); }
      else if (best.price >= c.price) SS.sfx.win();
      else SS.sfx.click();
      setBusy(false);
      showResult(items);
    }

    function showResult(items) {
      const sum = () => items.filter((it) => SS.getItem(it.id)).reduce((s, it) => s + D.SKIN_BY_ID[it.s].price, 0);
      const spent = c.price * items.length;
      const got = items.reduce((s, it) => s + D.SKIN_BY_ID[it.s].price, 0);
      const diff = got - spent;
      resultEl.innerHTML = `<div class="result-panel">
        <h3>${items.length > 1 ? 'Твой дроп' : 'Выпало'} · <span style="color:${diff >= 0 ? 'var(--green)' : 'var(--red)'}">
          ${diff >= 0 ? '+' : '−'}${fmt(Math.abs(diff))} G</span></h3>
        <div class="result-items">${items.map((it) => {
          const s = D.SKIN_BY_ID[it.s];
          return `<div class="res">${SS.itemCard(s, { cls: 'big' })}
            <button class="btn btn-green btn-sm" data-sell="${it.id}" type="button">Продать за ${gold(s.price)}</button></div>`;
        }).join('')}</div>
        <div class="result-actions">
          ${items.length > 1 ? `<button class="btn btn-green" id="sell-all" type="button">Продать всё за ${gold(sum())}</button>` : ''}
          <button class="btn btn-primary" id="again" type="button">Открыть ещё</button>
          <button class="btn" id="to-upg" type="button">⬆ В апгрейд</button>
          <a class="btn" href="#/inventory">Инвентарь</a>
        </div></div>`;

      const markSold = (btn) => { btn.disabled = true; btn.textContent = 'Продано'; };
      $$('[data-sell]', resultEl).forEach((btn) => btn.addEventListener('click', () => {
        const id = +btn.dataset.sell;
        if (!SS.getItem(id)) return markSold(btn);
        const got = SS.sellItems([id]);
        SS.toast(`Продано за ${gold(got)}`, 'good');
        markSold(btn);
        const all = $('#sell-all', resultEl);
        if (all) { const left = sum(); if (left) all.innerHTML = `Продать всё за ${gold(left)}`; else markSold(all); }
      }));
      const sellAll = $('#sell-all', resultEl);
      if (sellAll) sellAll.addEventListener('click', () => {
        const ids = items.map((it) => it.id).filter((i) => SS.getItem(i));
        const got = SS.sellItems(ids);
        if (got) SS.toast(`Продано ${ids.length} шт. за ${gold(got)}`, 'good');
        $$('[data-sell]', resultEl).forEach(markSold);
        markSold(sellAll);
      });
      $('#again', resultEl).addEventListener('click', () => { resultEl.innerHTML = ''; open(); });
      $('#to-upg', resultEl).addEventListener('click', () => {
        SS.pendingUpgrade = items.map((it) => it.id).filter((i) => SS.getItem(i));
        location.hash = '#/upgrade';
      });
      resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    $$('#counts .chip', root).forEach((ch) => ch.addEventListener('click', () => {
      if (spinning) return;
      count = +ch.dataset.n;
      $$('#counts .chip', root).forEach((x) => x.classList.toggle('active', x === ch));
      resultEl.innerHTML = '';
      renderIdle();
      updateButton();
      SS.sfx.click();
    }));
    $('#fast', root).addEventListener('change', (e) => { fast = e.target.checked; });
    openBtn.addEventListener('click', open);

    renderIdle();
    updateButton();
    const off = SS.onChange(updateButton);
    const onResize = () => { if (!spinning) renderIdle(); };
    window.addEventListener('resize', onResize);

    return () => {
      off();
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      window.removeEventListener('resize', onResize);
    };
  });
})();
