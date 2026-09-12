/* StandSkin — ядро: состояние, баланс, инвентарь, звук, модалки, промокоды, live-лента, роутер */
(function () {
  'use strict';
  const D = window.SS_DATA, ART = window.SS_ART, PROMO = window.SS_PROMO;
  const STORE_KEY = 'standskin_v1';
  // отдельно от прогресса, чтобы «сброс прогресса» не давал активировать коды снова.
  // Номер версии сбрасывает историю кодов у всех игроков — каждый может ввести все коды ещё раз.
  const CODES_KEY = 'standskin_codes_v3';

  // ───────── утилиты ─────────
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (c) => {
    const v = c / 100;
    return v.toLocaleString('ru-RU', { minimumFractionDigits: v < 100 ? 2 : 0, maximumFractionDigits: 2 });
  };
  const gold = (c, cls = '') => `<span class="gold ${cls}">${ART.goldIcon()}${fmt(c)}</span>`;
  const fmtChance = (p) => {
    const v = p * 100;
    if (v >= 10) return v.toFixed(1) + '%';
    if (v >= 1) return v.toFixed(2) + '%';
    if (v >= 0.01) return v.toFixed(3) + '%';
    return v.toFixed(4) + '%';
  };
  const rand = () => {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] / 4294967296;
  };
  const randInt = (min, max) => min + Math.floor(rand() * (max - min + 1));
  /** list: [{chance, ...}] → один элемент с учётом шансов */
  function pickWeighted(list, key = 'chance') {
    const total = list.reduce((s, x) => s + x[key], 0);
    let r = rand() * total;
    for (const x of list) { r -= x[key]; if (r <= 0) return x; }
    return list[list.length - 1];
  }
  const rarityOf = (skin) => D.RARITIES[skin.rarity];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ───────── состояние ─────────
  const defaultStats = () => ({ opened: 0, spent: 0, upgrades: 0, upWins: 0, contracts: 0, promo: 0, sold: 0, best: null });
  const defaultState = () => ({ balance: 0, inv: [], nextId: 1, stats: defaultStats() });

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY));
      if (s && Number.isFinite(s.balance) && Array.isArray(s.inv)) {
        s.inv = s.inv.filter((i) => i && D.SKIN_BY_ID[i.s]);
        s.stats = Object.assign(defaultStats(), s.stats);
        s.nextId = Math.max(s.nextId || 1, ...s.inv.map((i) => i.id + 1), 1);
        // незавершённый апгрейд: страницу закрыли посреди прокрутки — выдаём выигранный скин
        if (s.pending && D.SKIN_BY_ID[s.pending]) s.inv.push({ id: s.nextId++, s: s.pending, t: Date.now() });
        s.pending = null;
        return s;
      }
    } catch (e) { /* повреждённое сохранение — начинаем заново */ }
    return defaultState();
  }
  let state = load();
  let usedCodes = (() => {
    try { const u = JSON.parse(localStorage.getItem(CODES_KEY)); return Array.isArray(u) ? u : []; } catch (e) { return []; }
  })();
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* приватный режим */ }
  }
  function saveCodes() {
    try { localStorage.setItem(CODES_KEY, JSON.stringify(usedCodes)); } catch (e) { /* ignore */ }
  }

  const listeners = new Set();
  const onChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
  function changed(delta = 0) {
    save();
    updateHeader(delta);
    listeners.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
  }

  const canAfford = (c) => state.balance >= c;
  function addBalance(delta) {
    state.balance = Math.max(0, Math.round(state.balance + delta));
    changed(delta);
  }
  function spend(c) {
    if (!canAfford(c)) return false;
    state.balance = Math.round(state.balance - c);
    return true;
  }
  function addItem(skinId, { silent = false } = {}) {
    const item = { id: state.nextId++, s: skinId, t: Date.now() };
    state.inv.push(item);
    const skin = D.SKIN_BY_ID[skinId];
    const best = state.stats.best && D.SKIN_BY_ID[state.stats.best];
    if (!best || skin.price > best.price) state.stats.best = skinId;
    if (!silent) pushFeed(skin, 'Вы', true);
    return item;
  }
  function removeItems(ids) {
    const set = new Set(ids);
    state.inv = state.inv.filter((i) => !set.has(i.id));
  }
  const getItem = (id) => state.inv.find((i) => i.id === id);
  const invItems = () => state.inv.map((i) => ({ id: i.id, t: i.t, skin: D.SKIN_BY_ID[i.s] }));
  function sellItems(ids) {
    const set = new Set(ids);
    let sum = 0;
    state.inv.forEach((i) => { if (set.has(i.id)) sum += D.SKIN_BY_ID[i.s].price; });
    if (!sum) return 0;
    removeItems(ids);
    state.stats.sold += sum;
    state.balance += sum;
    changed(sum);
    sfx.coin();
    return sum;
  }
  function resetProgress() {
    state = defaultState();
    changed(0);
  }

  // ───────── шапка ─────────
  let shownBalance = 0, balAnim = null;
  function updateHeader(delta = 0) {
    const el = $('#balance-value'), box = $('#balance');
    const from = shownBalance, to = state.balance;
    cancelAnimationFrame(balAnim);
    const t0 = performance.now(), dur = from === to ? 0 : 600;
    const step = (t) => {
      const k = dur ? Math.min(1, (t - t0) / dur) : 1;
      const e = 1 - Math.pow(1 - k, 3);
      shownBalance = Math.round(from + (to - from) * e);
      el.textContent = fmt(shownBalance);
      if (k < 1) balAnim = requestAnimationFrame(step);
    };
    balAnim = requestAnimationFrame(step);
    if (delta) {
      box.classList.remove('up', 'down');
      void box.offsetWidth;
      box.classList.add(delta > 0 ? 'up' : 'down');
      clearTimeout(box._t);
      box._t = setTimeout(() => box.classList.remove('up', 'down'), 900);
    }
    $('#inv-count').textContent = state.inv.length;
    // пустой баланс подсвечиваем — намёк, что промокод вводится нажатием на него
    box.classList.toggle('empty', state.balance === 0 && state.inv.length === 0);
  }

  // ───────── звук (WebAudio, без файлов) ─────────
  let actx = null;
  function audio() {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      actx = new AC();
    }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }
  function tone(freq, dur, type = 'sine', vol = 0.12, when = 0, slideTo = null) {
    const ac = audio();
    if (!ac) return;
    const t = ac.currentTime + when;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ac.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  const sfx = {
    tick: () => tone(1500 + rand() * 250, 0.03, 'square', 0.035),
    open: () => { tone(180, 0.12, 'sawtooth', 0.06, 0, 320); tone(320, 0.1, 'triangle', 0.05, 0.08); },
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', 0.12, i * 0.075)),
    big: () => [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.28, 'triangle', 0.14, i * 0.085)),
    lose: () => { tone(320, 0.4, 'sawtooth', 0.07, 0, 90); },
    coin: () => { tone(1250, 0.07, 'square', 0.05); tone(1880, 0.12, 'square', 0.045, 0.06); },
    click: () => tone(900, 0.025, 'square', 0.03),
    promo: () => [660, 880, 1100, 1320].forEach((f, i) => tone(f, 0.16, 'triangle', 0.13, i * 0.07)),
  };

  // ───────── тосты, модалки, частицы ─────────
  function toast(html, type = '') {
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.innerHTML = html;
    $('#toasts').appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, 3200);
  }

  function openModal(html, onMount) {
    const root = $('#modal-root');
    const ov = document.createElement('div');
    ov.className = 'modal-overlay';
    ov.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
    root.appendChild(ov);
    const close = () => { document.removeEventListener('keydown', onKey); ov.remove(); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    ov.addEventListener('mousedown', (e) => { if (e.target === ov) close(); });
    $$('[data-close]', ov).forEach((b) => b.addEventListener('click', close));
    if (onMount) onMount($('.modal', ov), close);
    return close;
  }

  function confirmModal(title, text, okLabel = 'Да', danger = false) {
    return new Promise((resolve) => {
      let done = false;
      const close = openModal(`<button class="modal-close" data-close>✕</button>
        <h2>${title}</h2><p>${text}</p>
        <div class="modal-actions"><button class="btn" data-close>Отмена</button>
        <button class="btn ${danger ? 'btn-red' : 'btn-primary'}" id="cm-ok">${okLabel}</button></div>`, (m, cl) => {
        $('#cm-ok', m).addEventListener('click', () => { done = true; cl(); resolve(true); });
      });
      const obs = new MutationObserver(() => {
        if (!document.body.contains($('#cm-ok'))) { obs.disconnect(); if (!done) resolve(false); }
      });
      obs.observe($('#modal-root'), { childList: true });
      void close;
    });
  }

  function burst(x, y, color = '#ffb800', count = 36) {
    const colors = [color, '#fff', '#ffb800'];
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'burst';
      p.style.left = x + 'px'; p.style.top = y + 'px';
      p.style.background = colors[i % colors.length];
      document.body.appendChild(p);
      const a = rand() * Math.PI * 2, v = 90 + rand() * 220;
      const dx = Math.cos(a) * v, dy = Math.sin(a) * v - 80;
      p.animate([
        { transform: 'translate(0,0) rotate(0)', opacity: 1 },
        { transform: `translate(${dx}px, ${dy + 160}px) rotate(${rand() * 720}deg)`, opacity: 0 },
      ], { duration: 900 + rand() * 600, easing: 'cubic-bezier(.2,.7,.4,1)' }).onfinish = () => p.remove();
    }
  }
  function burstAt(el, color) {
    const r = el.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, color);
  }

  // ───────── кошелёк: промокод и пополнение ─────────
  const PACKS = [
    { gold: 100, price: 99 },
    { gold: 500, price: 449, badge: '+5%' },
    { gold: 1000, price: 849, badge: '+15%' },
    { gold: 5000, price: 3990, badge: 'ХИТ' },
    { gold: 10000, price: 7490, badge: '+20%' },
    { gold: 25000, price: 16990, badge: 'MAX' },
  ];
  const ru = (n) => n.toLocaleString('ru-RU');

  function openWallet(tab = 'promo') {
    openModal(`<button class="modal-close" data-close aria-label="Закрыть">✕</button>
      <h2>Баланс</h2>
      <div class="wallet-sum">${ART.goldIcon()}<span id="wallet-value">${fmt(state.balance)}</span></div>
      <div class="tabs">
        <button class="tab" data-tab="promo" type="button">🎁 Промокод</button>
        <button class="tab" data-tab="buy" type="button">💳 Пополнить</button>
      </div>
      <div id="wallet-body"></div>`, (m, close) => {
      const body = $('#wallet-body', m);

      const showPromo = () => {
        body.innerHTML = `<p>Введи секретный промокод — голда сразу упадёт на баланс. Каждый код активируется только один раз.</p>
          <form id="promo-form" autocomplete="off">
            <input class="promo-input" id="promo-in" maxlength="24" autocomplete="off" spellcheck="false" placeholder="••••••" aria-label="Промокод">
            <div class="promo-msg" id="promo-msg"></div>
            <button class="btn btn-primary btn-lg" id="promo-go" type="submit">Активировать</button>
          </form>`;
        const inp = $('#promo-in', body), msg = $('#promo-msg', body), btn = $('#promo-go', body);
        const setMsg = (text, cls) => {
          msg.textContent = text; msg.className = 'promo-msg ' + cls;
          inp.classList.remove('bad', 'good'); void inp.offsetWidth; inp.classList.add(cls);
        };
        const go = () => {
          if (!PROMO.normalize(inp.value)) return setMsg('Введи промокод', 'bad');
          const r = PROMO.check(inp.value);
          if (!r) { sfx.lose(); return setMsg('Такого промокода не существует', 'bad'); }
          if (usedCodes.includes(r.hash)) { sfx.lose(); return setMsg('Этот промокод уже активирован', 'bad'); }
          usedCodes.push(r.hash);
          saveCodes();
          const c = Math.round(r.amount * 100);
          state.stats.promo += c;
          state.balance += c;
          changed(c);
          sfx.promo();
          setMsg(`+${fmt(c)} G зачислено на баланс!`, 'good');
          $('#wallet-value', m).textContent = fmt(state.balance);
          burstAt(btn, '#3ddc84');
          btn.disabled = true;
          setTimeout(close, 1500);
        };
        // submit вместо click: иначе форма уходит на перезагрузку и выкидывает на главную
        $('#promo-form', body).addEventListener('submit', (e) => { e.preventDefault(); go(); });
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
        inp.addEventListener('input', () => { msg.textContent = ''; inp.classList.remove('bad', 'good'); });
        setTimeout(() => inp.focus(), 50);
      };

      const showPacks = () => {
        body.innerHTML = `<div class="packs">${PACKS.map((p, i) => `
          <button class="pack" data-pack="${i}" type="button">
            ${p.badge ? `<span class="p-badge">${p.badge}</span>` : ''}
            <span class="p-gold">${ART.goldIcon()}${ru(p.gold)}</span>
            <span class="p-price">${ru(p.price)} ₽</span>
          </button>`).join('')}</div>`;
        $$('[data-pack]', body).forEach((b) => b.addEventListener('click', () => showCheckout(PACKS[+b.dataset.pack])));
      };

      const showCheckout = (p) => {
        body.innerHTML = `
          <div class="co-row"><span class="muted">Пакет</span><b>${ru(p.gold)} G</b></div>
          <div class="co-row"><span class="muted">К оплате</span><b>${ru(p.price)} ₽</b></div>
          <div class="co-note">Оплата в демо-режиме не проводится — голда начисляется по промокодам.</div>
          <div class="modal-actions">
            <button class="btn" id="co-back" type="button">← Пакеты</button>
            <button class="btn btn-primary" id="co-promo" type="button">🎁 Промокод</button>
          </div>`;
        $('#co-back', body).addEventListener('click', showPacks);
        $('#co-promo', body).addEventListener('click', () => setTab('promo'));
      };

      const setTab = (name) => {
        $$('.tab', m).forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
        if (name === 'promo') showPromo(); else showPacks();
      };
      $$('.tab', m).forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));
      setTab(tab);
    });
  }

  // ───────── карточка предмета ─────────
  function itemCard(skin, opts = {}) {
    const r = rarityOf(skin);
    return `<div class="item-card ${opts.cls || ''}" style="--rc:${r.color}" ${opts.attrs || ''}
      title="${esc(skin.weapon + ' | ' + skin.name + ' · ' + r.name)}">
      ${skin.knife ? '<span class="ic-star">★</span>' : ''}
      ${opts.chance != null ? `<span class="ic-chance">${opts.chanceText || fmtChance(opts.chance)}</span>` : ''}
      ${ART.skin(skin)}
      <div class="ic-name"><span>${esc(skin.weapon)}</span><b>${esc(skin.name)}</b></div>
      ${opts.price === false ? '' : `<div class="ic-price">${gold(skin.price)}</div>`}
      ${opts.extra || ''}
    </div>`;
  }

  // ───────── live-лента ─────────
  const BOTS = ['toxic_sniper', 'Kirill_SO2', 'xX_AWPer_Xx', 'Dima228', 'n1ck', 'Лёха', 'ghost.so2', 'Artem_pro',
    'Makar', 'sasha_standoff', 'Vlad', 'KrutoyPapka', 'edik_1337', 'mishka', 'Zhenya', 'killa', 'Tima',
    'nastya_plays', 'roman.exe', 'Deni4', 'pomidor', 'lil_rusher', 'Max', 'Egor2010', 'SnowFox', 'бабуля_с_awm'];
  const BOT_CASE_WEIGHTS = [30, 26, 18, 12, 8, 5, 3, 2, 1.1, 0.35, 0.12];

  function pushFeed(skin, user, mine = false) {
    const track = $('#live-track');
    if (!track) return;
    const el = document.createElement('div');
    el.className = 'live-item' + (mine ? ' mine' : '');
    el.style.setProperty('--rc', rarityOf(skin).color);
    el.title = `${user}: ${skin.weapon} | ${skin.name} — ${fmt(skin.price)} G`;
    el.innerHTML = `${ART.skin(skin)}<div class="li-user">${esc(user)}</div>
      <div class="li-name"><b>${esc(skin.name)}</b><span>${esc(skin.weapon)}</span></div>`;
    track.prepend(el);
    while (track.children.length > 30) track.lastChild.remove();
  }
  function botDrop() {
    const weighted = D.CASES.map((c, i) => ({ c, w: BOT_CASE_WEIGHTS[i] || 0.1 }));
    const { c } = pickWeighted(weighted, 'w');
    const d = pickWeighted(c.drops);
    pushFeed(d.skin, BOTS[randInt(0, BOTS.length - 1)]);
  }
  function initFeed() {
    for (let i = 0; i < 16; i++) botDrop();
    const loop = () => { if (!document.hidden) botDrop(); setTimeout(loop, 1400 + rand() * 2600); };
    setTimeout(loop, 1500);
  }

  // ───────── роутер ─────────
  const views = {};
  let cleanup = null;
  const registerView = (name, fn) => { views[name] = fn; };
  function route() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    const name = views[parts[0]] ? parts[0] : 'cases';
    if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
    const root = $('#view');
    root.innerHTML = '';
    cleanup = views[name](root, parts.slice(1)) || null;
    const navKey = name === 'case' ? 'cases' : name;
    $$('.nav a').forEach((a) => a.classList.toggle('active', a.dataset.nav === navKey));
    window.scrollTo(0, 0);
  }

  function initHeader() {
    $('#balance-ico').innerHTML = ART.goldIcon();
    $('#balance').addEventListener('click', () => openWallet());
    shownBalance = state.balance;
    updateHeader(0);
  }

  window.SS = {
    D, ART, $, $$, esc, fmt, gold, fmtChance, rand, randInt, pickWeighted, rarityOf, sleep,
    get state() { return state; },
    save, changed, onChange, canAfford, addBalance, spend, addItem, removeItems, getItem, invItems, sellItems, resetProgress,
    sfx, toast, openModal, confirmModal, burst, burstAt, openWallet, openPromo: openWallet, itemCard, pushFeed,
    registerView, route, initHeader, initFeed,
  };
})();
