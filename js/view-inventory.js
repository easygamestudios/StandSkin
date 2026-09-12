/* StandSkin — инвентарь и статистика */
(function () {
  'use strict';
  const SS = window.SS, { D, $, $$, gold, esc } = SS;

  SS.registerView('inventory', (root) => {
    let sel = new Set();
    let sort = 'desc', rarity = 'all';

    root.innerHTML = `
      <h1 class="page-title">Инвентарь</h1>
      <div class="inv-toolbar">
        <select class="select" id="i-sort">
          <option value="desc">Сначала дорогие</option><option value="asc">Сначала дешёвые</option><option value="new">Сначала новые</option>
        </select>
        <select class="select" id="i-rarity"><option value="all">Все редкости</option>
          ${Object.entries(D.RARITIES).map(([k, r]) => `<option value="${k}">${r.name}</option>`).join('')}</select>
        <div class="spacer"></div>
        <button class="btn btn-sm" id="i-selall" type="button">Выбрать все</button>
        <button class="btn btn-sm" id="i-upg" type="button">⬆ В апгрейд</button>
        <button class="btn btn-green btn-sm" id="i-sellsel" type="button"></button>
        <button class="btn btn-red btn-sm" id="i-sellall" type="button">Продать всё</button>
      </div>
      <div class="items-grid" id="i-grid"></div>
      <div style="margin-top:40px;text-align:center">
        <button class="btn btn-sm btn-red" id="i-reset" type="button">Сбросить прогресс</button>
      </div>`;

    const el = (id) => $('#' + id, root);

    function visible() {
      let list = SS.invItems();
      if (rarity !== 'all') list = list.filter((x) => x.skin.rarity === rarity);
      if (sort === 'desc') list.sort((a, b) => b.skin.price - a.skin.price);
      else if (sort === 'asc') list.sort((a, b) => a.skin.price - b.skin.price);
      else list.sort((a, b) => b.t - a.t);
      return list;
    }

    function render() {
      const all = SS.invItems();
      [...sel].forEach((id) => { if (!SS.getItem(id)) sel.delete(id); });

      const list = visible();
      el('i-grid').innerHTML = list.length
        ? list.map((x) => SS.itemCard(x.skin, {
          cls: 'clickable' + (sel.has(x.id) ? ' selected' : ''), attrs: `data-id="${x.id}"`,
          extra: `<div class="inv-card-actions"><button class="btn btn-green" data-sell="${x.id}" type="button">Продать</button>
            <button class="btn" data-upg="${x.id}" type="button" title="В апгрейд">⬆</button></div>`,
        })).join('')
        : `<div class="empty" style="grid-column:1/-1"><b>${all.length ? 'Нет предметов этой редкости' : 'Инвентарь пуст'}</b>
            ${all.length ? '' : 'Открой кейс или активируй промокод, чтобы получить голду.'}
            <div style="display:flex;gap:8px"><a class="btn btn-primary btn-sm" href="#/">К кейсам</a>
            <button class="btn btn-sm" data-promo type="button">🎁 Промокод</button></div></div>`;

      const selSum = [...sel].reduce((s, id) => s + D.SKIN_BY_ID[SS.getItem(id).s].price, 0);
      el('i-sellsel').innerHTML = `Продать выбранные (${sel.size}) · ${gold(selSum)}`;
      el('i-sellsel').disabled = !sel.size;
      el('i-upg').disabled = !sel.size;
      el('i-sellall').disabled = !all.length;
      el('i-selall').textContent = sel.size && sel.size === list.length ? 'Снять выбор' : 'Выбрать все';
    }

    root.addEventListener('click', (e) => {
      const sell = e.target.closest('[data-sell]');
      const upg = e.target.closest('[data-upg]');
      const card = e.target.closest('#i-grid [data-id]');
      if (e.target.closest('[data-promo]')) return SS.openPromo();
      if (sell) {
        const got = SS.sellItems([+sell.dataset.sell]);
        if (got) SS.toast(`Продано за ${gold(got)}`, 'good');
      } else if (upg) {
        SS.pendingUpgrade = [+upg.dataset.upg];
        location.hash = '#/upgrade';
      } else if (card) {
        const id = +card.dataset.id;
        sel.has(id) ? sel.delete(id) : sel.add(id);
        SS.sfx.click();
        render();
      }
    });
    el('i-sort').addEventListener('change', (e) => { sort = e.target.value; render(); });
    el('i-rarity').addEventListener('change', (e) => { rarity = e.target.value; sel.clear(); render(); });
    el('i-selall').addEventListener('click', () => {
      const list = visible();
      if (sel.size === list.length) sel.clear(); else list.forEach((x) => sel.add(x.id));
      render();
    });
    el('i-sellsel').addEventListener('click', () => {
      const n = sel.size, got = SS.sellItems([...sel]);
      sel.clear();
      if (got) SS.toast(`Продано ${n} шт. за ${gold(got)}`, 'good');
    });
    el('i-upg').addEventListener('click', () => {
      SS.pendingUpgrade = [...sel].slice(0, 6);
      location.hash = '#/upgrade';
    });
    el('i-sellall').addEventListener('click', async () => {
      const all = SS.invItems();
      const sum = all.reduce((s, x) => s + x.skin.price, 0);
      if (!(await SS.confirmModal('Продать всё?', `${all.length} предметов за ${sum / 100} G`, 'Продать'))) return;
      const got = SS.sellItems(all.map((x) => x.id));
      if (got) SS.toast(`Инвентарь продан за ${gold(got)}`, 'good');
    });
    el('i-reset').addEventListener('click', async () => {
      const ok = await SS.confirmModal('Сбросить прогресс?',
        'Баланс, инвентарь и статистика обнулятся. Уже активированные промокоды повторно не сработают.', 'Сбросить', true);
      if (ok) { SS.resetProgress(); SS.toast('Прогресс сброшен'); }
    });

    render();
    return SS.onChange(render);
  });
})();
