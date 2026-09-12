/* StandSkin — контракты: 3–10 скинов → 1 случайный скин (в среднем 90% стоимости, разброс x0.25–x4) */
(function () {
  'use strict';
  const SS = window.SS, { D, $, $$, gold, fmt, esc } = SS;
  const { CONTRACT_RTP, CONTRACT_MIN, CONTRACT_MAX } = D.CONFIG;

  /** Возможные исходы контракта на сумму total */
  function contractPool(total) {
    let pool = D.SKINS.filter((s) => s.price >= total * 0.25 && s.price <= total * 4);
    const hasBelow = pool.some((s) => s.price < total * CONTRACT_RTP);
    const hasAbove = pool.some((s) => s.price > total);
    if (pool.length < 6 || !hasBelow || !hasAbove) {
      pool = [...D.SKINS].sort((a, b) => Math.abs(Math.log(a.price / total)) - Math.abs(Math.log(b.price / total))).slice(0, 10);
    }
    const probs = D.solveOdds(pool.map((s) => s.price), total * CONTRACT_RTP);
    return pool.map((s, i) => ({ skin: s, chance: probs[i] })).sort((a, b) => b.skin.price - a.skin.price);
  }

  SS.registerView('contracts', (root) => {
    let sel = [], busy = false;
    const timers = [];

    root.innerHTML = `
      <h1 class="page-title">Контракты</h1>
      <p class="page-sub">Положи от ${CONTRACT_MIN} до ${CONTRACT_MAX} скинов — получишь один случайный скин.
        Он может оказаться в 4 раза дороже или в 4 раза дешевле вложенного.</p>
      <div class="contract-top">
        <div class="panel" style="padding:16px">
          <div class="contract-slots" id="k-slots"></div>
          <div class="contract-stage" id="k-stage" style="margin-top:14px">
            <div class="stage-idle">Выбери скины из инвентаря ниже</div></div>
        </div>
        <div class="contract-info">
          <div class="info-row"><span>Предметов</span><b id="k-n"></b></div>
          <div class="info-row"><span>Стоимость</span><b id="k-total"></b></div>
          <div class="info-row"><span>Возможный дроп</span><b id="k-range">—</b></div>
          <div class="info-row"><span>Шанс окупить</span><b id="k-profit">—</b></div>
          <button class="btn btn-primary btn-lg" id="k-go" type="button">Подписать контракт</button>
          <button class="btn" id="k-auto" type="button">Добавить дешёвые автоматически</button>
          <button class="btn btn-sm" id="k-clear" type="button">Очистить</button>
        </div>
      </div>
      <h2 class="section-title">Инвентарь <small>нажми, чтобы добавить</small></h2>
      <div class="items-grid sm" id="k-inv"></div>
      <h2 class="section-title" id="k-pool-title" hidden>Возможные предметы</h2>
      <div class="items-grid sm" id="k-pool"></div>`;

    const el = (id) => $('#' + id, root);
    const selItems = () => sel.map((id) => SS.getItem(id)).filter(Boolean);
    const total = () => selItems().reduce((s, it) => s + D.SKIN_BY_ID[it.s].price, 0);

    function render() {
      sel = sel.filter((id) => SS.getItem(id));
      const items = selItems();
      el('k-slots').innerHTML = Array.from({ length: CONTRACT_MAX }, (_, i) => {
        const it = items[i];
        return it ? SS.itemCard(D.SKIN_BY_ID[it.s], { cls: 'clickable', attrs: `data-rm="${it.id}"` }) : '<div class="slot">+</div>';
      }).join('');
      el('k-n').textContent = `${items.length} / ${CONTRACT_MAX}`;
      el('k-total').innerHTML = gold(total());

      const t = total();
      const pool = items.length >= CONTRACT_MIN ? contractPool(t) : null;
      if (pool) {
        el('k-range').innerHTML = `${fmt(pool[pool.length - 1].skin.price)} – ${fmt(pool[0].skin.price)} G`;
        const p = pool.filter((d) => d.skin.price > t).reduce((s, d) => s + d.chance, 0);
        el('k-profit').textContent = (p * 100).toFixed(1) + '%';
        el('k-pool-title').hidden = false;
        el('k-pool').innerHTML = pool.map((d) => SS.itemCard(d.skin, { chance: d.chance })).join('');
      } else {
        el('k-range').textContent = '—';
        el('k-profit').textContent = '—';
        el('k-pool-title').hidden = true;
        el('k-pool').innerHTML = '';
      }
      const go = el('k-go');
      // не блокируем: по заблокированной кнопке клик не проходит и кажется, что кнопка сломана
      go.disabled = busy;
      go.classList.toggle('btn-primary', !busy && items.length >= CONTRACT_MIN);
      go.classList.toggle('is-idle', !busy && items.length < CONTRACT_MIN);
      go.textContent = busy ? 'Подписываем...' : items.length < CONTRACT_MIN ? `Нужно минимум ${CONTRACT_MIN}` : 'Подписать контракт';

      const inv = SS.invItems().sort((a, b) => a.skin.price - b.skin.price);
      el('k-inv').innerHTML = inv.length
        ? inv.map((x) => SS.itemCard(x.skin, { cls: 'clickable' + (sel.includes(x.id) ? ' selected' : ''), attrs: `data-id="${x.id}"` })).join('')
        : '<div class="empty" style="grid-column:1/-1"><b>Инвентарь пуст</b><a class="btn btn-primary btn-sm" href="#/">Открыть кейс</a></div>';
    }

    function toggle(id) {
      if (busy) return;
      if (sel.includes(id)) sel = sel.filter((x) => x !== id);
      else if (sel.length >= CONTRACT_MAX) { SS.toast(`Максимум ${CONTRACT_MAX} предметов`, 'bad'); return; }
      else sel.push(id);
      SS.sfx.click();
      render();
    }

    function go() {
      if (busy) return;
      const items = selItems();
      if (items.length < CONTRACT_MIN) return SS.toast(`Добавь минимум ${CONTRACT_MIN} скина в контракт`, 'bad');
      const t = total();
      const pool = contractPool(t);
      const prize = SS.pickWeighted(pool).skin;
      SS.removeItems(items.map((i) => i.id));
      SS.addItem(prize.id, { silent: true });
      SS.state.stats.contracts++;
      SS.changed(0);
      sel = [];
      busy = true;
      render();

      // «перебор» вариантов с замедлением
      const stage = el('k-stage');
      const steps = 22;
      let i = 0;
      const show = (skin, cls = '') => { stage.innerHTML = SS.itemCard(skin, { cls }); };
      const next = () => {
        if (i < steps) {
          show(pool[Math.floor(SS.rand() * pool.length)].skin);
          SS.sfx.tick();
          i++;
          timers.push(setTimeout(next, 45 + i * i * 0.9));
          return;
        }
        show(prize, 'win');
        busy = false;
        render();
        const good = prize.price > t;
        if (good) { SS.sfx.big(); SS.burstAt(stage, SS.rarityOf(prize).color); } else SS.sfx.click();
        SS.pushFeed(prize, 'Вы', true);
        SS.toast(`Контракт: ${esc(prize.weapon)} | ${esc(prize.name)} — ${gold(prize.price)}`, good ? 'good' : '');
      };
      next();
    }

    root.addEventListener('click', (e) => {
      const a = e.target.closest('#k-inv [data-id]');
      const r = e.target.closest('#k-slots [data-rm]');
      if (a) toggle(+a.dataset.id);
      if (r) toggle(+r.dataset.rm);
    });
    el('k-go').addEventListener('click', go);
    el('k-clear').addEventListener('click', () => { if (!busy) { sel = []; render(); } });
    el('k-auto').addEventListener('click', () => {
      if (busy) return;
      const free = SS.invItems().filter((x) => !sel.includes(x.id)).sort((a, b) => a.skin.price - b.skin.price);
      free.slice(0, CONTRACT_MAX - sel.length).forEach((x) => sel.push(x.id));
      render();
    });

    render();
    const off = SS.onChange(() => { if (!busy) render(); });
    return () => { off(); timers.forEach(clearTimeout); };
  });
})();
