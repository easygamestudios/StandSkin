/* StandSkin — промокоды.
 * Сами коды в коде сайта НЕ хранятся — только SHA-256 хэши, поэтому их нельзя подсмотреть в исходниках.
 * Новый код: node tools/promo.js КОД СУММА  → вставь строку в CODES ниже.
 */
(function (root) {
  'use strict';

  const SALT = 'standskin::';

  // хэш → сколько голды даёт
  const CODES = {
    '5514ebc0feec545224bd3924e4de4270892baaa0d3b7ead56aa6a774cc3ea670': 2,
    '75ab47b5a205aa9008981689fe95dc810603b27acb606ffd0beb5eb84c290985': 1,
    '9237dcae1d0db95c5fb5238e0b8635bcc87790822da9c866d8fef36961dc6353': 5,
    '32e22e2af26a21850548ed99b0fe7dbe57801d00e3882fe3559866e83f7c1671': 20000,
  };

  // Компактный синхронный SHA-256 (работает и с file://, без crypto.subtle)
  const K = [], H0 = [];
  (function primes() {
    const isComposite = {};
    for (let c = 2, i = 0; i < 64; c++) {
      if (isComposite[c]) continue;
      for (let j = c * c; j < 313; j += c) isComposite[j] = true;
      if (i < 8) H0[i] = (Math.pow(c, 1 / 2) * 4294967296) | 0;
      K[i++] = (Math.pow(c, 1 / 3) * 4294967296) | 0;
    }
  })();

  function sha256(str) {
    const bytes = Array.from(new TextEncoder().encode(str));
    const bitLen = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    for (let i = 7; i >= 0; i--) bytes.push(i >= 4 ? 0 : (bitLen >>> (i * 8)) & 255);

    const h = H0.slice();
    const w = new Array(64);
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));
    for (let off = 0; off < bytes.length; off += 64) {
      for (let i = 0; i < 16; i++) {
        const j = off + i * 4;
        w[i] = (bytes[j] << 24) | (bytes[j + 1] << 16) | (bytes[j + 2] << 8) | bytes[j + 3];
      }
      for (let i = 16; i < 64; i++) {
        const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      let [a, b, c, d, e, f, g, hh] = h;
      for (let i = 0; i < 64; i++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (hh + S1 + ch + K[i] + w[i]) | 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + maj) | 0;
        hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      h[0] = (h[0] + a) | 0; h[1] = (h[1] + b) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0;
      h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + hh) | 0;
    }
    return h.map((x) => (x >>> 0).toString(16).padStart(8, '0')).join('');
  }

  const normalize = (code) => String(code || '').replace(/\s+/g, '').toUpperCase();

  /** → { hash, amount } если код существует, иначе null */
  function check(code) {
    const c = normalize(code);
    if (!c) return null;
    const hash = sha256(SALT + c);
    return Object.prototype.hasOwnProperty.call(CODES, hash) ? { hash, amount: CODES[hash] } : null;
  }

  const PROMO = { check, sha256, SALT, normalize };
  if (typeof module !== 'undefined' && module.exports) module.exports = PROMO;
  else root.SS_PROMO = PROMO;
})(typeof window !== 'undefined' ? window : globalThis);
