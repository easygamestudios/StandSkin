/* StandSkin — векторная графика: силуэты оружия, узоры, кейсы */
(function () {
  'use strict';
  const { SKINS, CASES } = window.SS_DATA;

  // Силуэты нарисованы стволом вправо в поле 200×80, при выводе отражаются (как в игре — ствол влево)
  const SHAPES = {
    pistol: `
      <rect x="54" y="22" width="92" height="16" rx="2"/>
      <rect x="142" y="25" width="12" height="10" rx="1"/>
      <rect x="60" y="19" width="6" height="4"/><rect x="138" y="19" width="5" height="4"/>
      <path d="M58 38H136V45H58Z"/>
      <path d="M60 44H86L78 76H50Z"/>
      <path d="M86 45Q88 60 106 56V51Q93 54 91 45Z"/>`,
    deagle: `
      <rect x="44" y="18" width="112" height="21" rx="2"/>
      <rect x="150" y="22" width="12" height="12" rx="1"/>
      <rect x="48" y="14" width="7" height="5"/><rect x="146" y="14" width="6" height="5"/>
      <path d="M50 39H140V47H50Z"/>
      <path d="M52 46H84L75 78H42Z"/>
      <path d="M84 47Q86 62 106 58V53Q91 56 90 47Z"/>`,
    smg: `
      <path d="M40 26H150V44H40Z"/>
      <rect x="150" y="30" width="28" height="7"/><rect x="174" y="28" width="6" height="11"/>
      <rect x="60" y="20" width="72" height="6"/>
      <path d="M106 44H120L126 74H112Z"/>
      <path d="M72 44H88L82 70H66Z"/>
      <path d="M40 29L12 31L10 48H19L23 39L40 41Z"/>`,
    ak: `
      <path d="M58 27H138V42H58Z"/>
      <path d="M138 30H170V41H138Z"/>
      <rect x="138" y="25" width="32" height="5"/>
      <rect x="170" y="32" width="26" height="4"/><rect x="185" y="26" width="3" height="7"/>
      <path d="M112 42H126Q128 60 142 72L130 79Q112 64 112 42Z"/>
      <path d="M80 42H92L86 66H74Z"/>
      <path d="M58 30L10 36L8 54L20 55L58 42Z"/>`,
    m4: `
      <path d="M60 26H132V42H60Z"/>
      <rect x="68" y="19" width="56" height="7" rx="1"/>
      <rect x="132" y="27" width="38" height="13" rx="2"/>
      <rect x="170" y="31" width="22" height="4"/><rect x="188" y="29" width="9" height="8" rx="1"/>
      <path d="M110 42H124L129 72H115Z"/>
      <path d="M80 42H92L86 66H74Z"/>
      <path d="M60 30H26L14 27V53H24L34 42H60Z"/>`,
    sniper: `
      <path d="M8 38L20 30H60L70 34H132V44H96L86 54H62L54 46L32 48L22 57H8Z"/>
      <rect x="132" y="36" width="58" height="5"/><rect x="186" y="33" width="11" height="10" rx="1"/>
      <rect x="70" y="18" width="52" height="9" rx="4"/>
      <path d="M62 15H76V30H62Z"/><path d="M116 16H128V29H116Z"/>
      <rect x="84" y="27" width="5" height="7"/><rect x="104" y="27" width="5" height="7"/>
      <rect x="98" y="44" width="12" height="11"/>`,
    shotgun: `
      <path d="M60 27H122V44H60Z"/>
      <rect x="122" y="28" width="72" height="6"/>
      <rect x="122" y="36" width="62" height="7" rx="2"/>
      <rect x="64" y="23" width="50" height="4"/>
      <path d="M60 30L14 36L12 55H24L60 44Z"/>
      <path d="M72 44H84L78 64H66Z"/>`,
    blade: `
      <path d="M92 29H166L196 37Q182 49 158 49H92Z"/>
      <rect x="108" y="33" width="50" height="3" rx="1.5"/>
      <rect x="82" y="22" width="11" height="34" rx="3"/>
      <path d="M22 31H82V49H22Q12 49 12 40Q12 31 22 31Z"/>`,
    claw: `
      <path d="M96 42C122 44 150 38 168 18C172 13 180 16 177 23C166 50 134 60 98 58Z"/>
      <path d="M40 42H100V58H40Z"/>
      <path fill-rule="evenodd" d="M16 50a14 14 0 1 0 28 0a14 14 0 1 0-28 0ZM23 50a7 7 0 1 1 14 0a7 7 0 1 1-14 0Z"/>`,
    butterfly: `
      <path d="M102 33H172Q190 35 198 40Q188 45 172 47H102Z"/>
      <path d="M14 29H102V38H14Q8 33.5 14 29Z"/>
      <path d="M14 42H102V51H14Q8 46.5 14 42Z"/>
      <rect x="98" y="30" width="8" height="20" rx="3"/>
      <rect x="6" y="36" width="10" height="8" rx="2"/>`,
    gloves: `
      <g transform="rotate(-14 100 44)">
        <rect x="74" y="34" width="50" height="30" rx="9"/>
        <rect x="75" y="10" width="11" height="30" rx="5.5"/>
        <rect x="88" y="5" width="11" height="34" rx="5.5"/>
        <rect x="101" y="7" width="11" height="32" rx="5.5"/>
        <rect x="114" y="14" width="10" height="26" rx="5"/>
        <rect x="118" y="44" width="28" height="11" rx="5.5" transform="rotate(-35 118 49)"/>
        <rect x="72" y="60" width="54" height="16" rx="3"/>
      </g>`,
  };

  const PATTERNS = `
    <pattern id="p-camo" patternUnits="userSpaceOnUse" width="44" height="30">
      <ellipse cx="8" cy="8" rx="9" ry="5" fill="rgba(0,0,0,.28)"/>
      <ellipse cx="30" cy="20" rx="11" ry="6" fill="rgba(0,0,0,.22)"/>
      <ellipse cx="24" cy="5" rx="6" ry="3" fill="rgba(255,255,255,.14)"/>
      <ellipse cx="6" cy="24" rx="5" ry="3" fill="rgba(255,255,255,.12)"/>
    </pattern>
    <pattern id="p-carbon" patternUnits="userSpaceOnUse" width="6" height="6">
      <rect width="3" height="3" fill="rgba(0,0,0,.28)"/><rect x="3" y="3" width="3" height="3" fill="rgba(0,0,0,.28)"/>
    </pattern>
    <pattern id="p-stripes" patternUnits="userSpaceOnUse" width="14" height="14" patternTransform="rotate(35)">
      <rect width="5" height="14" fill="rgba(0,0,0,.3)"/>
    </pattern>
    <pattern id="p-hex" patternUnits="userSpaceOnUse" width="18" height="15.6">
      <path d="M4.5 0H13.5L18 7.8L13.5 15.6H4.5L0 7.8Z" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="1"/>
    </pattern>
    <pattern id="p-dots" patternUnits="userSpaceOnUse" width="13" height="11">
      <circle cx="3" cy="3" r="1.3" fill="rgba(255,255,255,.55)"/><circle cx="9.5" cy="8" r=".8" fill="rgba(255,255,255,.4)"/>
    </pattern>
    <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".45"/>
      <stop offset=".42" stop-color="#fff" stop-opacity=".06"/>
      <stop offset=".55" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".3"/>
    </linearGradient>`;

  function skinGradient(s) {
    const [a, b, c] = s.colors;
    return `<linearGradient id="g-${s.id}" gradientUnits="userSpaceOnUse" x1="10" y1="8" x2="190" y2="74">
      <stop offset="0" stop-color="${a}"/><stop offset=".55" stop-color="${b}"/><stop offset="1" stop-color="${c}"/>
    </linearGradient>`;
  }

  function caseGradient(c) {
    return `<linearGradient id="cg-${c.id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${c.color}"/><stop offset="1" stop-color="${shade(c.color, -0.55)}"/>
    </linearGradient>
    <radialGradient id="cglow-${c.id}"><stop offset="0" stop-color="${c.color}" stop-opacity=".55"/>
      <stop offset="1" stop-color="${c.color}" stop-opacity="0"/></radialGradient>`;
  }

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
    r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function init() {
    const defs = Object.entries(SHAPES).map(([k, v]) => `<g id="w-${k}">${v}</g>`).join('')
      + PATTERNS + SKINS.map(skinGradient).join('') + CASES.map(caseGradient).join('');
    const holder = document.createElement('div');
    holder.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    holder.setAttribute('aria-hidden', 'true');
    holder.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0"><defs>${defs}</defs></svg>`;
    document.body.prepend(holder);
  }

  function skinLayers(s) {
    const shape = `#w-${s.shape}`;
    const pat = s.pattern && s.pattern !== 'none'
      ? `<use href="${shape}" fill="url(#p-${s.pattern})" stroke="none"/>` : '';
    return `<g transform="translate(200 0) scale(-1 1)">
      <use href="${shape}" fill="url(#g-${s.id})" stroke="rgba(0,0,0,.65)" stroke-width="1.3" stroke-linejoin="round"/>
      ${pat}<use href="${shape}" fill="url(#shine)" stroke="none"/></g>`;
  }

  // Настоящие картинки из textures/ (см. tools/textures.js); без картинки — рисованный силуэт
  const TEX = window.SS_TEXTURES || {};
  const texUrl = (s) => (TEX[s.id] ? 'textures/' + encodeURIComponent(TEX[s.id]) : null);

  function skin(s, cls = '') {
    const url = texUrl(s);
    if (url) return `<img class="skin-svg skin-img ${cls}" src="${url}" alt="" draggable="false" decoding="async">`;
    return `<svg class="skin-svg ${cls}" viewBox="0 0 200 80" aria-hidden="true">${skinLayers(s)}</svg>`;
  }

  function caseArt(c) {
    return `<svg class="case-svg" viewBox="0 0 200 170" aria-hidden="true">
      <circle cx="100" cy="92" r="92" fill="url(#cglow-${c.id})"/>
      <rect x="30" y="72" width="140" height="80" rx="8" fill="url(#cg-${c.id})" stroke="rgba(0,0,0,.5)" stroke-width="2"/>
      <rect x="30" y="128" width="140" height="10" fill="url(#p-stripes)"/>
      <rect x="54" y="72" width="14" height="80" fill="rgba(0,0,0,.22)"/>
      <rect x="132" y="72" width="14" height="80" fill="rgba(0,0,0,.22)"/>
      <rect x="24" y="58" width="152" height="22" rx="6" fill="${shade(c.color, 0.18)}" stroke="rgba(0,0,0,.5)" stroke-width="2"/>
      <rect x="24" y="58" width="152" height="8" rx="4" fill="rgba(255,255,255,.25)"/>
      <rect x="87" y="72" width="26" height="24" rx="4" fill="#161a24" stroke="${c.color}" stroke-width="2"/>
      <circle cx="100" cy="82" r="3.5" fill="${c.color}"/><rect x="98.5" y="84" width="3" height="7" rx="1.5" fill="${c.color}"/>
      ${texUrl(c.hero)
    ? `<image href="${texUrl(c.hero)}" x="8" y="0" width="184" height="74" preserveAspectRatio="xMidYMid meet" transform="rotate(-9 100 37)"/>`
    : `<svg x="8" y="2" width="184" height="74" viewBox="0 0 200 80" overflow="visible">
        <g transform="rotate(-9 100 40)">${skinLayers(c.hero)}</g>
      </svg>`}
    </svg>`;
  }

  // Иконка голды: картинка textures/gold.png, если её положили, иначе рисованная монета
  const goldIcon = (cls = '') => {
    if (TEX.__gold) {
      return `<img class="g-icon ${cls}" src="textures/${encodeURIComponent(TEX.__gold)}" alt="G" draggable="false">`;
    }
    return `<svg class="g-icon ${cls}" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill="#ffb400"/><circle cx="10" cy="10" r="7" fill="#ffd54a"/>
      <text x="10" y="14" text-anchor="middle" font-size="10" font-weight="900" fill="#b36b00" font-family="Arial,sans-serif">G</text></svg>`;
  };

  window.SS_ART = { init, skin, caseArt, goldIcon, shade };
})();
