/* StandSkin — данные: редкости, скины, кейсы, балансировка шансов */
(function (root) {
  'use strict';

  // RTP — сколько в среднем возвращается игроку (как на реальных рулетках: 85–90%)
  const CONFIG = {
    CASE_RTP: 0.92,        // кейсы: матожидание дропа = 92% цены кейса
    UPGRADE_FACTOR: 0.95,  // апгрейд: шанс = (ставка / цель) * 0.95 (x2 → 47.5%)
    UPGRADE_MIN: 1,        // мин. шанс апгрейда, %
    UPGRADE_MAX: 85,       // макс. шанс апгрейда, %
    CONTRACT_RTP: 0.94,    // контракт: матожидание = 94% вложенного
    CONTRACT_MIN: 3,
    CONTRACT_MAX: 10,
  };

  const RARITIES = {
    common:    { name: 'Common',    ru: 'Обычный',      color: '#b4bcc8', order: 0 },
    uncommon:  { name: 'Uncommon',  ru: 'Необычный',    color: '#5fc6f5', order: 1 },
    rare:      { name: 'Rare',      ru: 'Редкий',       color: '#3d6bff', order: 2 },
    epic:      { name: 'Epic',      ru: 'Эпический',    color: '#9d4dff', order: 3 },
    legendary: { name: 'Legendary', ru: 'Легендарный',  color: '#e53ee8', order: 4 },
    arcane:    { name: 'Arcane',    ru: 'Тайный',       color: '#f2453b', order: 5 },
    nameless:  { name: 'Nameless',  ru: 'Безымянный',   color: '#ffc43d', order: 6 },
  };

  // Какой силуэт рисовать для оружия
  const SHAPES = {
    'G22': 'pistol', 'USP': 'pistol', 'P350': 'pistol', 'F/S': 'pistol', 'TEC-9': 'pistol',
    'Desert Eagle': 'deagle',
    'UMP45': 'smg', 'MP7': 'smg', 'P90': 'smg', 'MAC10': 'smg',
    'AKR': 'ak', 'AKR12': 'ak',
    'M4': 'm4', 'M4A1': 'm4', 'M16': 'm4', 'FN FAL': 'm4',
    'AWM': 'sniper', 'M110': 'sniper',
    'SM1014': 'shotgun',
    'M9 Bayonet': 'blade', 'Kunai': 'blade', 'Tanto': 'blade', 'Stiletto': 'blade',
    'Flip': 'blade', 'Kukri': 'blade', 'Dual Daggers': 'blade',
    'Karambit': 'claw', 'Mantis': 'claw', 'Sting': 'claw', 'Fang': 'claw', 'Scorpion': 'claw',
    'Butterfly': 'butterfly',
    'Gloves': 'gloves',
  };
  const KNIFE_SHAPES = { blade: 1, claw: 1, butterfly: 1, gloves: 1 };

  // [оружие, скин, редкость, цена G, [цвет1, цвет2, цвет3], узор]
  const RAW = [
    // ── Common
    ['G22', 'Pixel Camouflage', 'common', 0.03, ['#e0c68e', '#a57f47', '#6b5230'], 'camo'],
    ['M4', 'Tiger', 'common', 0.06, ['#ffa436', '#e0701a', '#2a1a0e'], 'stripes'],
    ['P350', 'Savannah', 'common', 0.03, ['#e2c77a', '#b48a3e', '#6f5a2e'], 'camo'],
    ['UMP45', 'Pixel', 'common', 0.04, ['#8c9aa9', '#56626e', '#2c333b'], 'carbon'],
    ['FN FAL', 'Acid Carbon', 'common', 0.05, ['#b4ff4a', '#4f8a1e', '#1d2a12'], 'carbon'],
    ['SM1014', 'Blaster', 'common', 0.03, ['#6aaaff', '#2c5aa8', '#1a2c4f'], 'none'],
    ['MP7', 'Thorn', 'common', 0.04, ['#7f8d66', '#4a5539', '#21281b'], 'stripes'],
    ['P90', 'Jungle', 'common', 0.04, ['#6a9a55', '#35552a', '#1d2e17'], 'camo'],
    ['G22', 'White Carbon', 'common', 0.07, ['#f2f4f7', '#b9c0cb', '#6b7380'], 'carbon'],
    ['AKR', 'Carbon', 'common', 0.09, ['#50565f', '#2a2e35', '#111316'], 'carbon'],
    // ── Uncommon
    ['P90', 'Radiation', 'uncommon', 0.15, ['#e6f23a', '#3a3a2a', '#e6f23a'], 'stripes'],
    ['Desert Eagle', 'Blood', 'uncommon', 0.38, ['#e02424', '#7d0f0f', '#2a0505'], 'none'],
    ['M16', 'Camouflage', 'uncommon', 0.17, ['#8a9a6a', '#56633f', '#2f3622'], 'camo'],
    ['SM1014', 'Facet', 'uncommon', 0.14, ['#8fd3ff', '#3f7fb8', '#1e3a57'], 'hex'],
    ['AKR', 'Worm', 'uncommon', 0.42, ['#ff7ab8', '#b83a7a', '#4a1030'], 'none'],
    ['TEC-9', 'Aurora', 'uncommon', 0.22, ['#4dffc3', '#3a7dff', '#8a3aff'], 'none'],
    ['UMP45', 'Pixel V2', 'uncommon', 0.16, ['#6fd1ff', '#3a5aa8', '#1d2640'], 'carbon'],
    ['USP', 'Fiend', 'uncommon', 0.31, ['#ff5a3a', '#7a1f1f', '#1a0a0a'], 'none'],
    // ── Rare
    ['AKR12', 'Pixel Camouflage', 'rare', 0.85, ['#a9b9cc', '#566478', '#2a3140'], 'carbon'],
    ['AWM', 'Phoenix', 'rare', 2.4, ['#ffb13d', '#ff5a1f', '#7a1a0a'], 'none'],
    ['SM1014', 'Pathfinder', 'rare', 0.7, ['#c9a76a', '#6f8a4a', '#3a3222'], 'camo'],
    ['Desert Eagle', 'Predator', 'rare', 1.65, ['#7dff5a', '#2a6e2a', '#101a10'], 'stripes'],
    ['F/S', 'Tactical', 'rare', 0.78, ['#727d65', '#3c4435', '#1f231b'], 'none'],
    ['G22', 'Starfall', 'rare', 1.2, ['#6a7bff', '#2a2f8a', '#0e0f3a'], 'dots'],
    ['M110', 'Cyber', 'rare', 1.1, ['#3affef', '#1f6f8a', '#0e1f2a'], 'hex'],
    ['Desert Eagle', 'Ace', 'rare', 1.9, ['#f5f5f5', '#d42020', '#1a1a1a'], 'none'],
    ['AKR', 'Icewing', 'rare', 1.45, ['#cff3ff', '#5ab8ff', '#1e4f8a'], 'hex'],
    ['USP', 'Chameleon', 'rare', 2.2, ['#3aff8a', '#3a8aff', '#b03aff'], 'none'],
    // ── Epic
    ['AKR12', 'Geometric', 'epic', 4.6, ['#ffffff', '#4a4a4a', '#ff9f1c'], 'hex'],
    ['UMP45', 'Cyberpunk', 'epic', 5.2, ['#fff03a', '#ff3a8a', '#2a0a3a'], 'hex'],
    ['FN FAL', 'Tactical', 'epic', 5.5, ['#9a9f8a', '#4a4f3a', '#20231a'], 'carbon'],
    ['P350', 'Neon', 'epic', 5.8, ['#ff3af0', '#3af0ff', '#1a0a2a'], 'stripes'],
    ['P90', 'Ghoul', 'epic', 7.1, ['#8aff5a', '#3a5a2a', '#0a1a0a'], 'none'],
    ['UMP45', 'Cerberus', 'epic', 8.3, ['#ff6a1f', '#8a1f0a', '#1a0505'], 'none'],
    ['USP', 'Pisces', 'epic', 9.4, ['#3ad7ff', '#3a5aff', '#ff8ad7'], 'dots'],
    ['M4A1', 'Sparkling Gaze', 'epic', 13.9, ['#ff8ae2', '#a23aff', '#3a1a5a'], 'dots'],
    ['AWM', 'BOOM', 'epic', 17.5, ['#ffe23a', '#ff3ad7', '#3a3aff'], 'stripes'],
    // ── Legendary
    ['MP7', 'Lich', 'legendary', 29, ['#5affd2', '#1f5a6a', '#0a151a'], 'none'],
    ['TEC-9', 'Fable', 'legendary', 34, ['#ffd23a', '#ff6a3a', '#5a1a3a'], 'dots'],
    ['M16', 'Winged', 'legendary', 37, ['#ffffff', '#ffd23a', '#8a6a1a'], 'stripes'],
    ['AKR12', 'Railgun', 'legendary', 44, ['#3af0ff', '#1f5aff', '#0a0f2a'], 'hex'],
    ['M4', 'Necromancer', 'legendary', 62, ['#8a4aff', '#2a0f5a', '#0a0515'], 'none'],
    ['AKR12', 'Emberbird', 'legendary', 71, ['#ffd23a', '#ff5a1f', '#6a0f0a'], 'none'],
    ['M4', 'Lizard', 'legendary', 86, ['#5aff3a', '#1f8a3a', '#0a2a14'], 'camo'],
    ['AWM', 'Sport', 'legendary', 120, ['#ff3a3a', '#ffffff', '#1a1a1a'], 'stripes'],
    ['AWM', 'Genesis', 'legendary', 175, ['#fff6d8', '#ffc83a', '#a8741a'], 'none'],
    // ── Arcane (оружие)
    ['Desert Eagle', 'Dragon Glass', 'arcane', 210, ['#ff9a3a', '#c21b6a', '#2a0a3a'], 'hex'],
    ['F/S', 'Venom', 'arcane', 265, ['#5aff3a', '#0a3a0a', '#000000'], 'none'],
    ['G22', 'Nest', 'arcane', 340, ['#ffe28a', '#c28a3a', '#4a2a0a'], 'none'],
    ['M4', 'Samurai', 'arcane', 890, ['#ff2a2a', '#1a1a1a', '#ffd23a'], 'stripes'],
    ['AKR', 'Treasure Hunter', 'arcane', 1450, ['#ffd23a', '#2a6aff', '#0a1a4a'], 'dots'],
    // ── Перчатки
    ['Gloves', 'Geometric', 'arcane', 480, ['#ffe28a', '#c28a3a', '#4a2a0a'], 'none'],
    ['Gloves', 'Retro Wave', 'arcane', 720, ['#ffd23a', '#ff6a3a', '#5a1a3a'], 'dots'],
    ['Gloves', 'Autumn', 'arcane', 950, ['#ffa436', '#e0701a', '#1a0e05'], 'stripes'],
    ['Gloves', 'Dragon Glass', 'arcane', 2400, ['#ff9a3a', '#c21b6a', '#2a0a3a'], 'hex'],
    // ── Ножи
    ['Flip', 'Stone Cold', 'arcane', 620, ['#50565f', '#2a2e35', '#111316'], 'carbon'],
    ['Kukri', 'Ares', 'arcane', 690, ['#e0c68e', '#a57f47', '#6b5230'], 'camo'],
    ['Kunai', 'Cold Flame', 'arcane', 740, ['#e6fbff', '#7fd3ff', '#2a6a9a'], 'hex'],
    ['Scorpion', 'Scratch', 'arcane', 880, ['#d8dde3', '#8a939e', '#3a4048'], 'stripes'],
    ['Fang', 'Flare', 'arcane', 980, ['#ff3af0', '#3af0ff', '#1a0a2a'], 'stripes'],
    ['Stiletto', 'Viper', 'arcane', 1150, ['#ff5a1f', '#8a0f0a', '#1a0505'], 'hex'],
    ['Tanto', 'Glitch', 'arcane', 1800, ['#3affc8', '#ff3a9a', '#1a1a2a'], 'carbon'],
    ['M9 Bayonet', 'Ancient', 'arcane', 2300, ['#d8b87a', '#7a5a2a', '#2a1a0a'], 'dots'],
    ['Tanto', 'Retro Arcade', 'arcane', 2600, ['#ffe23a', '#3a9aff', '#ff3a6a'], 'carbon'],
    ['Butterfly', 'Legacy', 'arcane', 3500, ['#c8a0ff', '#6a3ac2', '#1a0a3a'], 'none'],
    ['Butterfly', 'Black Widow', 'arcane', 6400, ['#ff2a2a', '#2a0a0a', '#000000'], 'hex'],
    ['Butterfly', 'Starfall', 'arcane', 9100, ['#6a7bff', '#2a2f8a', '#0e0f3a'], 'dots'],
    ['Butterfly', 'Dragon Glass', 'arcane', 16000, ['#ff9a3a', '#c21b6a', '#2a0a3a'], 'hex'],
    ['M9 Bayonet', 'Blue Blood', 'arcane', 20000, ['#3a8aff', '#0a2a8a', '#050a2a'], 'none'],
    ['Karambit', 'Dragon Glass', 'arcane', 25500, ['#ff9a3a', '#c21b6a', '#2a0a3a'], 'hex'],
    ['M9 Bayonet', 'Universe', 'arcane', 30000, ['#b03aff', '#3a1a8a', '#05051a'], 'dots'],
    ['M9 Bayonet', 'Scratch', 'arcane', 37000, ['#e8ecf0', '#8a939e', '#2a3038'], 'stripes'],
    ['Mantis', 'Eclipse', 'arcane', 47000, ['#f2f2f2', '#3a3a3a', '#0a0a0a'], 'stripes'],
    ['M9 Bayonet', 'Dragon Glass', 'arcane', 59000, ['#ff9a3a', '#c21b6a', '#2a0a3a'], 'hex'],
    ['Dual Daggers', 'Harmony', 'arcane', 79000, ['#ffe6f0', '#ff8ac2', '#8a3a6a'], 'dots'],
    ['Butterfly', 'Fire Storm', 'arcane', 414500, ['#ff3a3a', '#ff9a1f', '#3a0a0a'], 'hex'],
    // ── Nameless
    ['MAC10', 'Ruby Shadow', 'nameless', 100000, ['#ff2a5a', '#8a0a2a', '#1a0005'], 'hex'],
    ['Sting', 'Mimicry', 'nameless', 105000, ['#9affd2', '#2a8a6a', '#0a2a20'], 'camo'],
    ['Karambit', 'Gold', 'nameless', 130000, ['#fff3b0', '#ffc43d', '#9a6a0a'], 'none'],
    ['Butterfly', 'Ripple', 'nameless', 999999, ['#ffb86a', '#b03aff', '#1a0a3a'], 'dots'],
  ];

  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const SKINS = RAW.map(([weapon, name, rarity, price, colors, pattern]) => {
    const shape = SHAPES[weapon];
    if (!shape) throw new Error('Нет силуэта для ' + weapon);
    return {
      id: slug(weapon + '-' + name),
      weapon, name, rarity, colors, pattern, shape,
      price: Math.round(price * 100), // в сотых долях голды
      knife: !!KNIFE_SHAPES[shape],
    };
  });
  const SKIN_BY_ID = {};
  const SKIN_BY_KEY = {};
  SKINS.forEach((s) => {
    if (SKIN_BY_ID[s.id]) throw new Error('Дубль id ' + s.id);
    SKIN_BY_ID[s.id] = s;
    SKIN_BY_KEY[s.weapon + '|' + s.name] = s;
  });

  // ───────── Кейсы ─────────
  // items: 'Оружие|Скин'
  const CASES_RAW = [
    {
      id: 'recruit', name: 'Новобранец', price: 0.5, color: '#8a93a3', tag: 'СТАРТ', hero: 'G22|Starfall',
      items: ['G22|Pixel Camouflage', 'M4|Tiger', 'P350|Savannah', 'UMP45|Pixel', 'FN FAL|Acid Carbon',
        'SM1014|Blaster', 'MP7|Thorn', 'P90|Jungle', 'G22|White Carbon', 'AKR|Carbon',
        'P90|Radiation', 'M16|Camouflage', 'SM1014|Facet', 'UMP45|Pixel V2', 'TEC-9|Aurora', 'USP|Fiend',
        'Desert Eagle|Blood', 'AKR|Worm', 'SM1014|Pathfinder', 'F/S|Tactical', 'AKR12|Pixel Camouflage',
        'G22|Starfall', 'AKR12|Geometric', 'P350|Neon'],
    },
    {
      id: 'sandstone', name: 'Сэндстоун', price: 1, color: '#d9a55a', tag: 'ХИТ', hero: 'Desert Eagle|Predator',
      items: ['G22|White Carbon', 'AKR|Carbon', 'P90|Radiation', 'M16|Camouflage', 'SM1014|Facet',
        'TEC-9|Aurora', 'USP|Fiend', 'Desert Eagle|Blood', 'AKR|Worm', 'SM1014|Pathfinder', 'F/S|Tactical',
        'AKR12|Pixel Camouflage', 'M110|Cyber', 'G22|Starfall', 'AKR|Icewing', 'Desert Eagle|Predator',
        'Desert Eagle|Ace', 'AKR12|Geometric', 'UMP45|Cyberpunk', 'P90|Ghoul', 'MP7|Lich'],
    },
    {
      id: 'province', name: 'Провинция', price: 3, color: '#6fb55a', tag: '', hero: 'P350|Neon',
      items: ['USP|Fiend', 'Desert Eagle|Blood', 'AKR|Worm', 'SM1014|Pathfinder', 'F/S|Tactical',
        'AKR12|Pixel Camouflage', 'M110|Cyber', 'G22|Starfall', 'AKR|Icewing', 'Desert Eagle|Predator',
        'Desert Eagle|Ace', 'USP|Chameleon', 'AWM|Phoenix', 'AKR12|Geometric', 'UMP45|Cyberpunk',
        'FN FAL|Tactical', 'P350|Neon', 'P90|Ghoul', 'UMP45|Cerberus', 'MP7|Lich', 'TEC-9|Fable'],
    },
    {
      id: 'rust', name: 'Раст', price: 8, color: '#c8643a', tag: '', hero: 'M16|Winged',
      items: ['AKR12|Pixel Camouflage', 'M110|Cyber', 'G22|Starfall', 'AKR|Icewing', 'Desert Eagle|Predator',
        'Desert Eagle|Ace', 'USP|Chameleon', 'AWM|Phoenix', 'AKR12|Geometric', 'UMP45|Cyberpunk',
        'FN FAL|Tactical', 'P350|Neon', 'P90|Ghoul', 'UMP45|Cerberus', 'USP|Pisces', 'M4A1|Sparkling Gaze',
        'AWM|BOOM', 'MP7|Lich', 'TEC-9|Fable', 'M16|Winged', 'AKR12|Railgun', 'M4|Necromancer'],
    },
    {
      id: 'zone9', name: 'Зона 9', price: 20, color: '#3ac8b4', tag: 'NEW', hero: 'AKR12|Railgun',
      items: ['Desert Eagle|Ace', 'USP|Chameleon', 'AWM|Phoenix', 'AKR12|Geometric', 'UMP45|Cyberpunk',
        'FN FAL|Tactical', 'P350|Neon', 'P90|Ghoul', 'UMP45|Cerberus', 'USP|Pisces', 'M4A1|Sparkling Gaze',
        'AWM|BOOM', 'MP7|Lich', 'TEC-9|Fable', 'M16|Winged', 'AKR12|Railgun', 'M4|Necromancer',
        'AKR12|Emberbird', 'M4|Lizard', 'Desert Eagle|Dragon Glass', 'F/S|Venom'],
    },
    {
      id: 'hanami', name: 'Ханами', price: 50, color: '#ff7ab8', tag: '', hero: 'M4|Lizard',
      items: ['P90|Ghoul', 'UMP45|Cerberus', 'USP|Pisces', 'M4A1|Sparkling Gaze', 'AWM|BOOM', 'MP7|Lich',
        'TEC-9|Fable', 'M16|Winged', 'AKR12|Railgun', 'M4|Necromancer', 'AKR12|Emberbird', 'M4|Lizard',
        'AWM|Sport', 'AWM|Genesis', 'Desert Eagle|Dragon Glass', 'F/S|Venom', 'G22|Nest', 'Gloves|Geometric',
        'Flip|Stone Cold'],
    },
    {
      id: 'origin', name: 'Origin', price: 120, color: '#4a8aff', tag: 'КОЛЛЕКЦИЯ', hero: 'AKR|Treasure Hunter',
      items: ['M16|Winged', 'AKR12|Railgun', 'M4|Necromancer', 'AKR12|Emberbird', 'AWM|Sport', 'AWM|Genesis',
        'Desert Eagle|Dragon Glass', 'G22|Nest', 'AKR|Treasure Hunter', 'M9 Bayonet|Ancient', 'M9 Bayonet|Universe'],
    },
    {
      id: 'butterfly', name: 'Бабочка', price: 400, color: '#b06aff', tag: 'НОЖИ', hero: 'Butterfly|Starfall',
      items: ['AWM|Sport', 'AWM|Genesis', 'Desert Eagle|Dragon Glass', 'F/S|Venom', 'G22|Nest', 'Gloves|Geometric',
        'Gloves|Retro Wave', 'M4|Samurai', 'Butterfly|Legacy', 'Butterfly|Black Widow', 'Butterfly|Starfall',
        'Butterfly|Dragon Glass'],
    },
    {
      id: 'predator', name: 'Хищник', price: 600, color: '#ff5a3a', tag: 'НОЖИ', hero: 'Stiletto|Viper',
      items: ['M4|Lizard', 'AWM|Sport', 'AWM|Genesis', 'Desert Eagle|Dragon Glass', 'F/S|Venom', 'G22|Nest',
        'Gloves|Geometric', 'Flip|Stone Cold', 'Kukri|Ares', 'Gloves|Retro Wave', 'Kunai|Cold Flame', 'Scorpion|Scratch',
        'M4|Samurai', 'Gloves|Autumn', 'Fang|Flare', 'Stiletto|Viper', 'AKR|Treasure Hunter', 'Tanto|Glitch',
        'M9 Bayonet|Ancient', 'Tanto|Retro Arcade'],
    },
    {
      id: 'dragon', name: 'Dragon Glass', price: 3000, color: '#ff8a2a', tag: 'ELITE', hero: 'Karambit|Dragon Glass',
      items: ['AKR|Treasure Hunter', 'Stiletto|Viper', 'Tanto|Glitch', 'M9 Bayonet|Ancient', 'Gloves|Dragon Glass',
        'Tanto|Retro Arcade', 'Butterfly|Legacy', 'Butterfly|Black Widow', 'Butterfly|Starfall',
        'Butterfly|Dragon Glass', 'M9 Bayonet|Blue Blood', 'Karambit|Dragon Glass', 'M9 Bayonet|Dragon Glass'],
    },
    {
      id: 'nameless', name: 'Nameless', price: 15000, color: '#ffc43d', tag: 'LEGEND', hero: 'Karambit|Gold',
      items: ['Butterfly|Black Widow', 'Butterfly|Starfall', 'Butterfly|Dragon Glass', 'M9 Bayonet|Blue Blood',
        'Karambit|Dragon Glass', 'M9 Bayonet|Universe', 'M9 Bayonet|Scratch', 'Mantis|Eclipse',
        'M9 Bayonet|Dragon Glass', 'Dual Daggers|Harmony', 'MAC10|Ruby Shadow', 'Sting|Mimicry',
        'Karambit|Gold', 'Butterfly|Fire Storm', 'Butterfly|Ripple'],
    },
  ];

  /**
   * Подбирает шансы w_i ∝ price_i^(-k) так, чтобы матожидание = target.
   * Дорогие скины автоматически получают маленький шанс.
   */
  function solveOdds(prices, target) {
    const logs = prices.map((p) => Math.log(p));
    const probsFor = (k) => {
      const lw = logs.map((l) => -k * l);
      const m = Math.max(...lw);
      const w = lw.map((x) => Math.exp(x - m));
      const sum = w.reduce((a, b) => a + b, 0);
      return w.map((x) => x / sum);
    };
    const evFor = (k) => probsFor(k).reduce((s, p, i) => s + p * prices[i], 0);
    let lo = 0, hi = 20;
    if (evFor(0) <= target) return probsFor(0);
    for (let i = 0; i < 80; i++) {
      const mid = (lo + hi) / 2;
      if (evFor(mid) > target) lo = mid; else hi = mid;
    }
    return probsFor((lo + hi) / 2);
  }

  const CASES = CASES_RAW.map((c) => {
    const skins = c.items.map((k) => {
      const s = SKIN_BY_KEY[k];
      if (!s) throw new Error('Кейс ' + c.id + ': нет скина ' + k);
      return s;
    });
    const price = Math.round(c.price * 100);
    const probs = solveOdds(skins.map((s) => s.price), price * CONFIG.CASE_RTP);
    const drops = skins
      .map((s, i) => ({ skin: s, chance: probs[i] }))
      .sort((a, b) => b.skin.price - a.skin.price);
    const hero = SKIN_BY_KEY[c.hero];
    return { id: c.id, name: c.name, price, color: c.color, tag: c.tag, hero, drops };
  });
  const CASE_BY_ID = {};
  CASES.forEach((c) => { CASE_BY_ID[c.id] = c; });

  const DATA = { CONFIG, RARITIES, SKINS, SKIN_BY_ID, SKIN_BY_KEY, CASES, CASE_BY_ID, solveOdds };
  if (typeof module !== 'undefined' && module.exports) module.exports = DATA;
  else root.SS_DATA = DATA;
})(typeof window !== 'undefined' ? window : globalThis);
