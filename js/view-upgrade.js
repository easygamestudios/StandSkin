/* StandSkin — апгрейд скинов.
 * Правила экрана:
 *  — выбор игрока (ставка и цель) не сбрасывается сам, никогда;
 *  — порядок действий любой: сначала цель или сначала ставка;
 *  — множитель при ставке подбирает цель, а при выбранной цели — подставляет ставку;
 *  — строка состояния под колесом всегда объясняет, что происходит.
 */
(function () {
  'use strict';
  const SS = window.SS, { D, $, $$, esc, gold, fmt } = SS;
  const { UPGRADE_FACTOR, UPGRADE_MIN, UPGRADE_MAX } = D.CONFIG;
  const MAX_ITEMS = 6;
  const MULTS = [1.5, 2, 3, 5, 10, 20];
  const R = 112, C = 2 * Math.PI * R;

  SS.registerView('upgrade', (root) => {
    let sel = new Set((SS.pendingUpgrade || []).slice(0, MAX_ITEMS));
    SS.pendingUpgrade = null;
    let addGold = 0, target = null, busy = false, fast = false, angle = 0, raf = 0;
    // снимок ставки на время прокрутки: шанс, дуга и карточки не меняются, пока крутится
    let lockedStake = [], lockedGold = 0;
    const timers = [];

    root.innerHTML = `
      <h1 class="page-title">Апгрейд</h1>
      <p class="page-sub">Ставка и цель выбираются в любом порядке. Чем дороже цель, тем ниже шанс.</p>
      <div class="upg-top">
        <div class="upg-slot">
          <h3>Ваша ставка</h3>
          <div class="slot-body" id="u-input"></div>
          <div class="slot-balance">
            <input class="input" id="u-gold" type="number" min="0" step="0.01" placeholder="+ голда с баланса">
            <button class="btn btn-sm" id="u-max" type="button">Всё</button>
          </div>
          <div class="slot-foot"><span class="muted">Ставка</span><b id="u-value"></b></div>
        </div>
        <div class="upg-center">
          <div class="wheel" id="u-wheel">
            <svg viewBox="0 0 260 260" aria-hidden="true">
              <defs><linearGradient id="u-wg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#ffd23a"/><stop offset="1" stop-color="#ff7a00"/></linearGradient></defs>
              <circle cx="130" cy="130" r="${R}" fill="none" stroke="#1d2330" stroke-width="20"/>
              <circle id="u-arc" cx="130" cy="130" r="${R}" fill="none" stroke="url(#u-wg)" stroke-width="20"
                stroke-dasharray="0 ${C}" transform="rotate(-90 130 130)" style="transition:stroke-dasharray .35s"/>
              ${Array.from({ length: 48 }, (_, i) => `<line x1="130" y1="${130 - R - 16}" x2="130" y2="${130 - R - 12}"
                stroke="#3a4254" stroke-width="2" transform="rotate(${i * 7.5} 130 130)"/>`).join('')}
              <circle cx="130" cy="130" r="92" fill="#11141b" stroke="#232a38"/>
              <g class="w-arrow" id="u-arrow"><path d="M130 4 L141 24 L119 24Z" fill="#fff"/>
                <line x1="130" y1="24" x2="130" y2="34" stroke="#fff" stroke-width="3" stroke-linecap="round"/></g>
            </svg>
            <div class="wheel-center"><div class="pct" id="u-pct">—</div><div class="lbl">шанс</div>
              <div class="mult" id="u-mult"></div></div>
          </div>
          <div class="upg-status" id="u-status"></div>
          <div class="mult-row" id="u-mults">${MULTS.map((m) => `<button class="chip" data-m="${m}" type="button">x${m}</button>`).join('')}</div>
          <button class="btn btn-lg upg-btn is-idle" id="u-go" type="button">Апгрейд</button>
          <label class="toggle"><input type="checkbox" id="u-fast"><i></i>Быстро</label>
        </div>
        <div class="upg-slot target" id="u-target-slot">
          <h3>Цель</h3>
          <div class="slot-body" id="u-target"></div>
          <div class="slot-foot"><span class="muted">Получишь</span><b id="u-tvalue">—</b></div>
        </div>
      </div>
      <div class="upg-lists">
        <div class="list-panel">
          <div class="list-head"><h3>Инвентарь <span class="muted" id="u-inv-n"></span></h3>
            <button class="btn btn-sm" id="u-clear" type="button">Сбросить</button></div>
          <div class="list-scroll"><div class="items-grid sm" id="u-inv"></div></div>
        </div>
        <div class="list-panel">
          <div class="list-head"><h3>Выбери цель</h3>
            <input class="input" id="u-search" placeholder="Поиск скина">
            <select class="select" id="u-sort"><option value="asc">Дешевле</option><option value="desc">Дороже</option></select>
          </div>
          <div class="list-scroll"><div class="items-grid sm" id="u-list"></div></div>
        </div>
      </div>`;

    const el = (id) => $('#' + id, root);
    const arrow = el('u-arrow'), wheel = el('u-wheel');

    const stakeValue = () => [...sel].reduce((s, id) => {
      const it = SS.getItem(id);
      return it ? s + D.SKIN_BY_ID[it.s].price : s;
    }, 0) + addGold;
    const lockedValue = () => lockedStake.reduce((s, sk) => s + sk.price, 0) + lockedGold;
    const chanceFor = (v, skin) => (v > 0 && skin.price > v ? Math.min(UPGRADE_MAX, (v / skin.price) * UPGRADE_FACTOR * 100) : 0);

    /** Что мешает крутить прямо сейчас. reason = null → всё готово */
    function state() {
      const v = stakeValue();
      const ch = target ? chanceFor(v, target) : 0;
      let reason = null;
      if (!v && !target) reason = 'empty';
      else if (!v) reason = 'no-stake';
      else if (!target) reason = 'no-target';
      else if (target.price <= v) reason = 'cheap-target';
      else if (ch < UPGRADE_MIN) reason = 'low-chance';
      else if (addGold > SS.state.balance) reason = 'no-money';
      return { v, ch, reason, ok: !reason };
    }

    // ───────── отрисовка ─────────
    function renderStake() {
      if (busy) { // пока крутится — показываем замороженную ставку
        el('u-input').innerHTML = lockedStake.length
          ? `<div class="slot-items ${lockedStake.length === 1 ? 'one' : ''}">${lockedStake.map((s) =>
            SS.itemCard(s, { cls: 'disabled' })).join('')}</div>`
          : `<div class="slot-empty"><span class="big-plus">◈</span>Ставка: ${fmt(lockedGold)} G</div>`;
        el('u-value').innerHTML = gold(lockedValue());
        return;
      }
      [...sel].forEach((id) => { if (!SS.getItem(id)) sel.delete(id); });
      const items = [...sel].map((id) => SS.getItem(id)).map((it) => ({ id: it.id, skin: D.SKIN_BY_ID[it.s] }));
      el('u-input').innerHTML = items.length
        ? `<div class="slot-items ${items.length === 1 ? 'one' : ''}">${items.map((x) =>
          SS.itemCard(x.skin, { cls: 'clickable', attrs: `data-rm="${x.id}"` })).join('')}</div>`
        : `<div class="slot-empty"><span class="big-plus">+</span>Выбери до ${MAX_ITEMS} скинов из инвентаря<br>или добавь голду</div>`;
      el('u-value').innerHTML = gold(stakeValue());
    }

    function renderTarget() {
      const slot = el('u-target-slot');
      if (!target) {
        el('u-target').innerHTML = '<div class="slot-empty"><span class="big-plus">?</span>Выбери скин в списке справа<br>или нажми множитель</div>';
        el('u-tvalue').textContent = '—';
        slot.style.removeProperty('--rc');
        return;
      }
      el('u-target').innerHTML = `<div class="slot-items one">${SS.itemCard(target, { cls: 'big clickable', attrs: 'data-clear-target="1"' })}</div>`;
      el('u-tvalue').innerHTML = gold(target.price);
      slot.style.setProperty('--rc', SS.rarityOf(target).color);
    }

    function renderWheel() {
      if (busy) return; // во время прокрутки дуга и процент остаются на месте
      const { v, ch, reason, ok } = state();
      el('u-arc').setAttribute('stroke-dasharray', `${(ok ? ch / 100 : 0) * C} ${C}`);
      el('u-pct').textContent = ok ? ch.toFixed(2) + '%' : '—';
      el('u-mult').textContent = ok ? 'x' + (target.price / v).toFixed(2) : '';

      const go = el('u-go');
      go.disabled = false;
      go.classList.toggle('btn-primary', ok);
      go.classList.toggle('is-idle', !ok);
      go.textContent = 'Апгрейд';

      const st = el('u-status');
      const texts = {
        empty: 'Поставь скины из инвентаря или голду — и выбери цель. Порядок любой.',
        'no-stake': `Цель: <b>${esc(target ? target.weapon + ' | ' + target.name : '')}</b> за ${fmt(target ? target.price : 0)} G. Добавь ставку — или нажми множитель, он подставит нужную сумму.`,
        'no-target': `Ставка <b>${fmt(v)} G</b>. Выбери цель дороже ставки — или нажми множитель, он подберёт её сам.`,
        'cheap-target': `Ставка <b>${fmt(v)} G</b> дороже цели (${fmt(target ? target.price : 0)} G). Выбери цель подороже или уменьши ставку.`,
        'low-chance': `Цель слишком дорогая: шанс ниже ${UPGRADE_MIN}%. Выбери цель подешевле или подними ставку.`,
        'no-money': 'На балансе меньше голды, чем в ставке. Уменьши сумму.',
      };
      st.className = 'upg-status' + (ok ? '' : ' warn');
      st.innerHTML = ok
        ? `Ставка <b>${fmt(v)} G</b> → <b>${esc(target.weapon)} | ${esc(target.name)}</b> за ${fmt(target.price)} G`
        : texts[reason];
    }

    function renderInv() {
      const list = SS.invItems().sort((a, b) => b.skin.price - a.skin.price);
      el('u-inv-n').textContent = list.length ? `· ${list.length}` : '';
      el('u-inv').innerHTML = list.length
        ? list.map((x) => SS.itemCard(x.skin, {
          cls: 'clickable' + (sel.has(x.id) ? ' selected' : ''), attrs: `data-id="${x.id}"`,
        })).join('')
        : '<div class="empty" style="grid-column:1/-1"><b>Пусто</b>Открой кейс или ставь голду напрямую</div>';
    }

    // список целей показывает все скины всегда — иначе выбранная цель исчезает из списка
    function renderList() {
      const v = stakeValue();
      const q = el('u-search').value.trim().toLowerCase();
      const dir = el('u-sort').value === 'desc' ? -1 : 1;
      const list = D.SKINS
        .filter((s) => !q || (s.weapon + ' ' + s.name).toLowerCase().includes(q))
        .sort((a, b) => (a.price - b.price) * dir);
      el('u-list').innerHTML = list.map((s) => {
        const ch = chanceFor(v, s);
        const cheap = v && s.price <= v;
        const low = v && !cheap && ch < UPGRADE_MIN;
        return SS.itemCard(s, {
          cls: 'clickable' + (target === s ? ' selected' : '') + (cheap || low ? ' faded' : ''),
          attrs: `data-skin="${s.id}"`,
          chance: v ? 1 : null,
          chanceText: v ? (cheap ? 'дешевле' : ch.toFixed(2) + '%') : null,
        });
      }).join('') || '<div class="empty" style="grid-column:1/-1">Ничего не найдено</div>';
    }

    function renderAll() { renderStake(); renderTarget(); renderWheel(); renderInv(); renderList(); }
    const clearMultActive = () => $$('#u-mults .chip', root).forEach((c) => c.classList.remove('active'));

    // ───────── действия ─────────
    function setGold(c) {
      addGold = Math.max(0, Math.min(c, SS.state.balance));
      el('u-gold').value = addGold ? (addGold / 100).toFixed(2) : '';
    }

    function pickMult(m) {
      const v = stakeValue();
      if (v) { // ставка есть → подбираем цель под множитель
        const want = v * m;
        const cands = D.SKINS.filter((s) => s.price > v && chanceFor(v, s) >= UPGRADE_MIN);
        if (!cands.length) return SS.toast('Для такой ставки нет подходящей цели — уменьши ставку', 'bad');
        target = cands.reduce((a, b) => (Math.abs(Math.log(b.price / want)) < Math.abs(Math.log(a.price / want)) ? b : a));
      } else if (target) { // цель есть, ставки нет → подставляем ставку под множитель
        const need = Math.max(1, Math.round(target.price / m));
        if (need > SS.state.balance) {
          return SS.toast(`Для x${m} нужна ставка ${fmt(need)} G, а на балансе ${fmt(SS.state.balance)} G`, 'bad');
        }
        setGold(need);
      } else {
        return SS.toast('Сначала выбери цель или поставь скины', 'bad');
      }
      $$('#u-mults .chip', root).forEach((c) => c.classList.toggle('active', +c.dataset.m === m));
      SS.sfx.click();
      renderAll();
    }

    function go() {
      if (busy) return;
      const { v, ch, reason } = state();
      if (reason) { // кнопка всегда отвечает, почему нельзя
        const msg = {
          empty: 'Поставь скины или голду и выбери цель',
          'no-stake': 'Добавь ставку — скины или голду',
          'no-target': 'Выбери цель в списке справа',
          'cheap-target': 'Цель должна быть дороже ставки',
          'low-chance': `Шанс ниже ${UPGRADE_MIN}% — выбери цель подешевле`,
          'no-money': 'Недостаточно голды на балансе',
        };
        SS.toast(msg[reason], 'bad');
        return;
      }
      const roll = SS.rand();
      const win = roll < ch / 100;
      const ids = [...sel].filter((id) => SS.getItem(id)); // предмет мог исчезнуть — продали в другой вкладке
      const prize = target;
      // busy до изменений состояния, иначе перерисовка обнулит дугу шанса
      busy = true;
      lockedStake = ids.map((id) => D.SKIN_BY_ID[SS.getItem(id).s]);
      lockedGold = addGold;
      SS.spend(addGold);
      SS.removeItems(ids);
      SS.state.stats.upgrades++;
      // приз выдаём только после анимации, чтобы инвентарь не выдал результат заранее;
      // pending подстрахует, если страницу закроют посреди прокрутки
      if (win) { SS.state.stats.upWins++; SS.state.pending = prize.id; }
      SS.changed(-addGold);
      sel = new Set(); addGold = 0; el('u-gold').value = '';
      wheel.classList.remove('win', 'lose');
      el('u-go').disabled = true;
      el('u-go').textContent = 'Крутим...';
      el('u-pct').textContent = ch.toFixed(2) + '%';
      el('u-status').innerHTML = `Крутим: <b>${fmt(lockedValue())} G</b> → <b>${esc(prize.weapon)} | ${esc(prize.name)}</b>`;
      renderStake(); renderInv();

      const dur = fast ? 1300 : 5200;
      const base = Math.ceil(angle / 360) * 360;
      angle = base + 360 * (fast ? 2 : 5) + roll * 360;
      arrow.style.transition = `transform ${dur}ms cubic-bezier(.12,.7,.12,1)`;
      arrow.style.transform = `rotate(${angle}deg)`;
      let last = null;
      const tick = () => {
        const m = new DOMMatrixReadOnly(getComputedStyle(arrow).transform);
        const a = Math.floor(((Math.atan2(m.b, m.a) * 180) / Math.PI + 360) / 15);
        if (last !== null && a !== last) SS.sfx.tick();
        last = a;
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);

      timers.push(setTimeout(() => {
        cancelAnimationFrame(raf);
        busy = false;
        lockedStake = []; lockedGold = 0;
        SS.state.pending = null;
        if (win) SS.addItem(prize.id, { silent: true }); // вот теперь предмет появляется в инвентаре
        SS.changed(0);
        wheel.classList.add(win ? 'win' : 'lose');
        el('u-pct').textContent = win ? 'WIN' : 'LOSE';
        if (win) {
          SS.pushFeed(prize, 'Вы', true);
          SS.toast(`Апгрейд удался! ${esc(prize.weapon)} | ${esc(prize.name)} — ${gold(prize.price)}`, 'good');
          prize.knife || ch < 20 ? SS.sfx.big() : SS.sfx.win();
          SS.burstAt(wheel, SS.rarityOf(prize).color);
        } else {
          SS.sfx.lose();
          SS.toast('Не повезло — ставка сгорела', 'bad');
        }
        el('u-status').className = 'upg-status' + (win ? ' good' : ' warn');
        el('u-status').innerHTML = win
          ? `Забрал <b>${esc(prize.weapon)} | ${esc(prize.name)}</b> — скин уже в инвентаре`
          : 'Ставка сгорела. Цель осталась выбранной — собери новую ставку.';
        renderStake(); renderInv(); renderList(); renderTarget();
        // только снимаем подсветку колеса; выбор игрока не трогаем
        timers.push(setTimeout(() => { wheel.classList.remove('win', 'lose'); renderWheel(); }, 1600));
      }, dur + 100));
    }

    // ───────── события ─────────
    root.addEventListener('click', (e) => {
      if (busy) return;
      const inv = e.target.closest('#u-inv [data-id]');
      const rm = e.target.closest('[data-rm]');
      const sk = e.target.closest('#u-list [data-skin]');
      const mult = e.target.closest('#u-mults [data-m]');
      const clearTarget = e.target.closest('[data-clear-target]');
      if (inv || rm) {
        const id = +(inv ? inv.dataset.id : rm.dataset.rm);
        if (sel.has(id)) sel.delete(id);
        else if (sel.size >= MAX_ITEMS) return SS.toast(`Максимум ${MAX_ITEMS} предметов в ставке`, 'bad');
        else sel.add(id);
        SS.sfx.click();
        clearMultActive();
        renderAll();
      } else if (clearTarget) {
        target = null;
        clearMultActive();
        SS.sfx.click();
        renderAll();
      } else if (sk) {
        target = D.SKIN_BY_ID[sk.dataset.skin];
        clearMultActive();
        SS.sfx.click();
        renderAll();
      } else if (mult) pickMult(+mult.dataset.m);
    });
    el('u-gold').addEventListener('input', (e) => {
      const typed = Math.max(0, Math.round((parseFloat(e.target.value) || 0) * 100));
      addGold = Math.min(typed, SS.state.balance);
      if (typed > SS.state.balance) e.target.value = (addGold / 100).toFixed(2);
      clearMultActive();
      renderAll();
    });
    el('u-max').addEventListener('click', () => {
      if (busy) return;
      setGold(SS.state.balance);
      clearMultActive();
      renderAll();
    });
    el('u-clear').addEventListener('click', () => {
      if (busy) return;
      sel = new Set(); setGold(0); target = null;
      clearMultActive();
      renderAll();
    });
    el('u-search').addEventListener('input', renderList);
    el('u-sort').addEventListener('change', renderList);
    el('u-fast').addEventListener('change', (e) => { fast = e.target.checked; });
    el('u-go').addEventListener('click', go);

    renderAll();
    const off = SS.onChange(() => {
      if (busy) return;
      if (addGold > SS.state.balance) setGold(SS.state.balance); // баланс изменился в другом месте
      renderAll();
    });
    return () => { off(); cancelAnimationFrame(raf); timers.forEach(clearTimeout); };
  });
})();
