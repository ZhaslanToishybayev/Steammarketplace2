/**
 * Красивый демо инвентарь Steam бота
 * Показывает популярные скины CS2
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
  gray: '\x1b[90m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function formatPrice(price) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(price);
}

function getRarityColor(rarity) {
  const colors = {
    'Covert': 'red',
    'Contraband': 'magenta',
    'Classified': 'yellow',
    'Restricted': 'blue',
    'Consumer Grade': 'white',
    'Industrial Grade': 'cyan',
    'Mil-Spec': 'blue'
  };
  return colors[rarity] || 'white';
}

function getWeaponIcon(weapon) {
  const icons = {
    'AK-47': '🔫',
    'AWP': '🎯',
    'M4A4': '🔫',
    'M4A1-S': '🔫',
    'USP-S': '🔫',
    'Glock': '🔫',
    'Desert Eagle': '🔫',
    'P250': '🔫',
    'Five-SeveN': '🔫',
    'Tec-9': '🔫',
    'MP7': '🔫',
    'P90': '🔫',
    'MP9': '🔫',
    'MAC-10': '🔫',
    'PP-Bizon': '🔫',
    'MP5-SD': '🔫',
    'M249': '🔫',
    'Negev': '🔫',
    'AUG': '🔫',
    'FAMAS': '🔫',
    'Galil AR': '🔫',
    'SCAR-20': '🔫',
    'G3SG1': '🔫',
    'SSG 08': '🔫',
    'AWP': '🎯'
  };
  return icons[weapon] || '🔫';
}

// Демо инвентарь с популярными скинами
const demoInventory = [
  {
    name: 'AWP | Dragon Lore',
    weapon: 'AWP',
    skin: 'Dragon Lore',
    wear: 'Factory New',
    rarity: 'Covert',
    price: 1250.50,
    assetid: '12345',
    tradable: true
  },
  {
    name: 'M4A4 | Howl',
    weapon: 'M4A4',
    skin: 'Howl',
    wear: 'Minimal Wear',
    rarity: 'Covert',
    price: 2150.00,
    assetid: '12346',
    tradable: true
  },
  {
    name: 'AK-47 | Fire Serpent',
    weapon: 'AK-47',
    skin: 'Fire Serpent',
    wear: 'Field-Tested',
    rarity: 'Classified',
    price: 320.25,
    assetid: '12347',
    tradable: true
  },
  {
    name: 'AK-47 | Redline',
    weapon: 'AK-47',
    skin: 'Redline',
    wear: 'Field-Tested',
    rarity: 'Classified',
    price: 45.99,
    assetid: '12348',
    tradable: true
  },
  {
    name: 'Karambit | Fade',
    weapon: 'Knife',
    skin: 'Fade',
    wear: 'Factory New',
    rarity: 'Covert',
    price: 850.75,
    assetid: '12349',
    tradable: true
  },
  {
    name: 'Bayonet | Marble Fade',
    weapon: 'Knife',
    skin: 'Marble Fade',
    wear: 'Factory New',
    rarity: 'Covert',
    price: 425.30,
    assetid: '12350',
    tradable: true
  },
  {
    name: 'M9 Bayonet | Doppler',
    weapon: 'Knife',
    skin: 'Doppler',
    wear: 'Factory New',
    rarity: 'Covert',
    price: 520.80,
    assetid: '12351',
    tradable: true
  },
  {
    name: 'Glock-18 | Fade',
    weapon: 'Glock',
    skin: 'Fade',
    wear: 'Factory New',
    rarity: 'Covert',
    price: 95.30,
    assetid: '12352',
    tradable: true
  },
  {
    name: 'USP-S | Kill Confirmed',
    weapon: 'USP-S',
    skin: 'Kill Confirmed',
    wear: 'Minimal Wear',
    rarity: 'Covert',
    price: 145.80,
    assetid: '12353',
    tradable: true
  },
  {
    name: 'Desert Eagle | Printstream',
    weapon: 'Desert Eagle',
    skin: 'Printstream',
    wear: 'Factory New',
    rarity: 'Covert',
    price: 220.40,
    assetid: '12354',
    tradable: true
  },
  {
    name: 'AWP | Asiimov',
    weapon: 'AWP',
    skin: 'Asiimov',
    wear: 'Minimal Wear',
    rarity: 'Classified',
    price: 180.50,
    assetid: '12355',
    tradable: true
  },
  {
    name: 'AWP | Neo-Noir',
    weapon: 'AWP',
    skin: 'Neo-Noir',
    wear: 'Field-Tested',
    rarity: 'Classified',
    price: 95.20,
    assetid: '12356',
    tradable: true
  },
  {
    name: 'AK-47 | Neon Rider',
    weapon: 'AK-47',
    skin: 'Neon Rider',
    wear: 'Field-Tested',
    rarity: 'Classified',
    price: 65.90,
    assetid: '12357',
    tradable: true
  },
  {
    name: 'M4A1-S | Golden Coil',
    weapon: 'M4A1-S',
    skin: 'Golden Coil',
    wear: 'Field-Tested',
    rarity: 'Classified',
    price: 155.60,
    assetid: '12358',
    tradable: true
  },
  {
    name: 'USP-S | Neo-Noir',
    weapon: 'USP-S',
    skin: 'Neo-Noir',
    wear: 'Field-Tested',
    rarity: 'Classified',
    price: 78.30,
    assetid: '12359',
    tradable: true
  },
  {
    name: 'P250 | See Ya Later',
    weapon: 'P250',
    skin: 'See Ya Later',
    wear: 'Factory New',
    rarity: 'Classified',
    price: 12.50,
    assetid: '12360',
    tradable: true
  },
  {
    name: 'Tec-9 | Ice Cap',
    weapon: 'Tec-9',
    skin: 'Ice Cap',
    wear: 'Field-Tested',
    rarity: 'Restricted',
    price: 25.80,
    assetid: '12361',
    tradable: true
  },
  {
    name: 'MP7 | Black & White',
    weapon: 'MP7',
    skin: 'Black & White',
    wear: 'Minimal Wear',
    rarity: 'Restricted',
    price: 35.40,
    assetid: '12362',
    tradable: true
  },
  {
    name: 'P90 | Death by Kitty',
    weapon: 'P90',
    skin: 'Death by Kitty',
    wear: 'Field-Tested',
    rarity: 'Restricted',
    price: 48.90,
    assetid: '12363',
    tradable: true
  },
  {
    name: 'AUG | Chameleon',
    weapon: 'AUG',
    skin: 'Chameleon',
    wear: 'Field-Tested',
    rarity: 'Restricted',
    price: 22.15,
    assetid: '12364',
    tradable: true
  }
];

// Группировка по категориям
const categories = {
  'AWP': demoInventory.filter(item => item.name.includes('AWP')),
  'AK-47': demoInventory.filter(item => item.name.includes('AK-47')),
  'Knives': demoInventory.filter(item => item.weapon === 'Knife'),
  'Pistols': demoInventory.filter(item =>
    ['Glock', 'USP-S', 'Desert Eagle', 'P250', 'Tec-9'].includes(item.weapon)
  ),
  'Rifles': demoInventory.filter(item =>
    ['M4A4', 'M4A1-S', 'AUG', 'FAMAS'].includes(item.weapon)
  ),
  'SMGs': demoInventory.filter(item =>
    ['MP7', 'P90', 'MP9', 'MAC-10'].includes(item.weapon)
  ),
  'Heavy': demoInventory.filter(item =>
    ['M249', 'Negev', 'SCAR-20', 'G3SG1', 'SSG 08'].includes(item.weapon)
  )
};

// Сортировка по цене
const sortedByPrice = [...demoInventory].sort((a, b) => b.price - a.price);

// Группировка по редкости
const byRarity = {};
demoInventory.forEach(item => {
  if (!byRarity[item.rarity]) byRarity[item.rarity] = [];
  byRarity[item.rarity].push(item);
});

function showDemoInventory() {
  log('bright', '\n╔════════════════════════════════════════════════════╗');
  log('bright', '║           🎮 ДЕМО ИНВЕНТАРЬ STEAM БОТА             ║');
  log('bright', '╚════════════════════════════════════════════════════╝\n');

  // Общая статистика
  const totalValue = demoInventory.reduce((sum, item) => sum + item.price, 0);
  const tradableCount = demoInventory.filter(item => item.tradable).length;

  log('cyan', '📊 ОБЩАЯ СТАТИСТИКА:');
  log('cyan', '├─ Всего предметов: ' + demoInventory.length);
  log('cyan', '├─ Tradable: ' + tradableCount + '/' + demoInventory.length);
  log('cyan', '├─ Общая стоимость: ' + formatPrice(totalValue));
  log('cyan', '└─ Средняя цена: ' + formatPrice(totalValue / demoInventory.length) + '\n');

  // Топ 5 самых дорогих
  log('magenta', '💎 ТОП-5 САМЫХ ДОРОГИХ ПРЕДМЕТОВ:');
  log('magenta', '┌' + '─'.repeat(65) + '┐');
  sortedByPrice.slice(0, 5).forEach((item, index) => {
    const icon = getWeaponIcon(item.weapon);
    log('magenta', `│ ${index + 1}. ${icon} ${item.name} (${item.wear})`);
    log('green',  `│    💰 ${formatPrice(item.price)} | 🏷️  ${item.rarity}`);
    log('magenta', `│    🔑 AssetID: ${item.assetid}`);
    log('magenta', '│' + ' '.repeat(65) + '│');
  });
  log('magenta', '└' + '─'.repeat(65) + '┘\n');

  // По категориям
  log('yellow', '🎯 ПО КАТЕГОРИЯМ:');
  Object.entries(categories).forEach(([category, items]) => {
    if (items.length === 0) return;

    const categoryValue = items.reduce((sum, item) => sum + item.price, 0);
    log('bright', `\n${category} (${items.length} предметов, ${formatPrice(categoryValue)}):`);
    log('gray', '─'.repeat(70));

    items.slice(0, 5).forEach(item => {
      const icon = getWeaponIcon(item.weapon);
      const rarityColor = getRarityColor(item.rarity);
      log('white', `  ${icon} ${item.name}`);
      log('gray', `     🏷️  ${item.rarity} | ${item.wear} | ${formatPrice(item.price)}`);
    });

    if (items.length > 5) {
      log('yellow', `     ... и ещё ${items.length - 5} предметов`);
    }
  });

  // По редкости
  log('\ncyan', '🏷️  ПО РЕДКОСТИ:');
  Object.entries(byRarity).forEach(([rarity, items]) => {
    const rarityColor = getRarityColor(rarity);
    const value = items.reduce((sum, item) => sum + item.price, 0);
    log('white', `  ${rarity}: ${items.length} предметов (${formatPrice(value)})`);
  });

  // Визуализация
  log('\nblue', '📈 ВИЗУАЛИЗАЦИЯ ЦЕН:');
  const maxPrice = Math.max(...demoInventory.map(item => item.price));
  sortedByPrice.slice(0, 10).forEach(item => {
    const barLength = Math.round((item.price / maxPrice) * 50);
    const bar = '█'.repeat(barLength) + '░'.repeat(50 - barLength);
    const priceStr = formatPrice(item.price).padStart(12);
    log('white', `  ${item.name.substring(0, 25).padEnd(25)} │${bar}│ ${priceStr}`);
  });

  // Финальная статистика
  log('\nbright', '╔════════════════════════════════════════════════════╗');
  log('bright', '║                   💰 ЦЕНОВАЯ СТАТИСТИКА              ║');
  log('bright', '╠════════════════════════════════════════════════════╣');
  const prices = demoInventory.map(item => item.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  const med = prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)];

  log('cyan', `║ Минимальная цена:    ${formatPrice(min).padEnd(20)} ║`);
  log('cyan', `║ Максимальная цена:   ${formatPrice(max).padEnd(20)} ║`);
  log('cyan', `║ Средняя цена:        ${formatPrice(avg).padEnd(20)} ║`);
  log('cyan', `║ Медианная цена:      ${formatPrice(med).padEnd(20)} ║`);
  log('bright', '╚════════════════════════════════════════════════════╝\n');

  log('yellow', '⚠️  ВНИМАНИЕ: Это ДЕМО данные!');
  log('yellow', '   Реальный инвентарь доступен только при настроенном подключении к Steam\n');
  log('green', '✅ Готово!\n');
}

// Запуск
showDemoInventory();
