#!/usr/bin/env node
/* StandSkin — вспомогательный скрипт.
 *
 *   node tools/ss.js promo КОД СУММА   — сделать строку для нового промокода
 *   node tools/ss.js textures          — привязать картинки из textures/ к скинам
 */
const fs = require('fs');
const path = require('path');
const { SKINS } = require('../js/data.js');
const { sha256, SALT, normalize } = require('../js/promo.js');

const DIR = path.join(__dirname, '..', 'textures');
const EXT_PRIORITY = ['.webp', '.png', '.avif', '.gif', '.jpg', '.jpeg', '.svg'];
const norm = (s) => s.toLowerCase().replace(/ё/g, 'е').replace(/[^a-z0-9а-я]+/g, '');
const JUNK = /standoff2|standoff|so2|skin|скин|стандофф2|стендофф2|стандофф|стендофф/g;
const ALIASES = [
  [/^deagle/, 'deserteagle'], [/^дигл/, 'deserteagle'], [/^m9(?!bayonet)/, 'm9bayonet'],
  [/^glove(?!s)/, 'gloves'], [/^перчатки/, 'gloves'], [/^бабочка/, 'butterfly'], [/^керамбит/, 'karambit'],
];

function promo(code, amountRaw) {
  const amount = Number(amountRaw);
  if (!code || !Number.isFinite(amount) || amount <= 0) {
    console.error('Использование: node tools/ss.js promo КОД СУММА   (например: node tools/ss.js promo SUMMER25 10)');
    process.exit(1);
  }
  const c = normalize(code);
  console.log(`Код ${c} → ${amount} G. Вставь строку в CODES (js/promo.js):\n`);
  console.log(`    '${sha256(SALT + c)}': ${amount},`);
}

function textures() {
  // ключи сопоставления: id, «оружие+скин», уникальные названия скинов
  const byKey = new Map();
  const nameCount = {};
  SKINS.forEach((s) => { const k = norm(s.name); nameCount[k] = (nameCount[k] || 0) + 1; });
  SKINS.forEach((s) => {
    [s.id, s.weapon + s.name, s.name + s.weapon].forEach((k) => byKey.set(norm(k), s));
    if (nameCount[norm(s.name)] === 1) byKey.set(norm(s.name), s);
  });

  const match = (base) => {
    const n = norm(base);
    const clean = n.replace(JUNK, '');
    const tries = [n, clean, ...ALIASES.map(([re, rep]) => clean.replace(re, rep)), clean.replace(/\d+$/, '')];
    for (const t of tries) if (byKey.has(t)) return byKey.get(t);
    return null;
  };
  const lev = (a, b) => {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
    }
    return d[a.length][b.length];
  };
  const suggest = (base) => {
    const n = norm(base).replace(JUNK, '');
    let best = null, bestD = Infinity;
    SKINS.forEach((s) => { const dd = lev(n, norm(s.weapon + s.name)); if (dd < bestD) { bestD = dd; best = s; } });
    return bestD <= Math.max(3, Math.floor(n.length / 4)) ? best : null;
  };

  fs.mkdirSync(DIR, { recursive: true });
  const files = fs.readdirSync(DIR).filter((f) => EXT_PRIORITY.includes(path.extname(f).toLowerCase()));
  const goldFile = files.find((f) => norm(path.basename(f, path.extname(f))) === 'gold'); // иконка голды, не скин

  const found = {}, unmatched = [];
  files.filter((f) => f !== goldFile).forEach((f) => {
    const s = match(path.basename(f, path.extname(f)));
    if (s) (found[s.id] = found[s.id] || []).push(f);
    else unmatched.push(f);
  });

  const manifest = {}, dupes = [];
  Object.entries(found).forEach(([id, list]) => {
    list.sort((a, b) => EXT_PRIORITY.indexOf(path.extname(a).toLowerCase()) - EXT_PRIORITY.indexOf(path.extname(b).toLowerCase()));
    manifest[id] = list[0];
    if (list.length > 1) dupes.push(`${id}: взят «${list[0]}», лишние: ${list.slice(1).join(', ')}`);
  });

  const lines = SKINS.filter((s) => manifest[s.id]).map((s) => `  ${JSON.stringify(s.id)}: ${JSON.stringify(manifest[s.id])},`);
  if (goldFile) lines.unshift(`  "__gold": ${JSON.stringify(goldFile)},`);
  fs.writeFileSync(path.join(DIR, 'manifest.js'),
    `/* Сгенерировано: node tools/ss.js textures — вручную не редактировать */\nwindow.SS_TEXTURES = {\n${lines.join('\n')}${lines.length ? '\n' : ''}};\n`);

  const done = Object.keys(manifest).length;
  console.log(`Картинок привязано: ${done} из ${SKINS.length}`);
  console.log(goldFile ? `Иконка голды: ${goldFile}` : 'Иконки голды нет (положи textures/gold.png) — рисуется монета');
  if (dupes.length) console.log('\nНесколько файлов на один скин:\n  ' + dupes.join('\n  '));
  if (unmatched.length) {
    console.log('\nНе понял, к какому скину относятся:');
    unmatched.forEach((f) => {
      const s = suggest(path.basename(f, path.extname(f)));
      console.log(`  ${f}${s ? `   → может, ${s.weapon} | ${s.name}? (назови ${s.id}${path.extname(f)})` : ''}`);
    });
  }
  const missing = SKINS.filter((s) => !manifest[s.id]);
  if (missing.length) console.log(`\nБез картинки (${missing.length}): ` + missing.map((s) => `${s.weapon} ${s.name}`).join(', '));
  console.log('\nОбновлён textures/manifest.js');
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'promo') promo(args[0], args[1]);
else if (cmd === 'textures') textures();
else {
  console.log('Команды:\n  node tools/ss.js promo КОД СУММА   — строка для нового промокода\n  node tools/ss.js textures          — привязать картинки из textures/');
  process.exit(cmd ? 1 : 0);
}
