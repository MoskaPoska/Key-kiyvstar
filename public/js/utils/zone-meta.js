(function () {
  'use strict';

  const displayNames = {
    1: '\uD83D\uDC8E1 \u0417\u043E\u043D\u0430 -> \u042E\u0433\u043E-\u0437\u0430\u043F\u0430\u0434',
    2: '\uD83D\uDD312 \u0417\u043E\u043D\u0430 -> \u041C\u0438\u0442\u043D\u0438\u0446\u044F',
    3: '\uD83D\uDD313 \u0417\u043E\u043D\u0430 -> \u041C\u0438\u0442\u043D\u0438\u0446\u044F',
    4: '\uD83D\uDC8E4 \u0417\u043E\u043D\u0430 -> \u042E\u0433\u043E-\u0437\u0430\u043F\u0430\u0434',
    5: '\uD83D\uDC8E5 \u0417\u043E\u043D\u0430 -> \u042E\u0433\u043E-\u0437\u0430\u043F\u0430\u0434',
    6: '\uD83D\uDEEB6 \u0417\u043E\u043D\u0430 -> \u0421\u0430\u043C\u043E\u043B\u0451\u0442',
    7: '\u269C\uFE0F7 \u0417\u043E\u043D\u0430 -> \u0426\u0435\u043D\u0442\u0440',
    8: '\u269C\uFE0F8 \u0417\u043E\u043D\u0430 -> \u0426\u0435\u043D\u0442\u0440',
    9: '\uD83D\uDEA29 \u0417\u043E\u043D\u0430 -> \u0420\u0438\u0447\u043F\u043E\u0440\u0442-\u0421\u0435\u0434\u043E\u0432\u0430',
    10: '\uD83D\uDEA210 \u0417\u043E\u043D\u0430 -> \u0420\u0438\u0447\u043F\u043E\u0440\u0442-\u0421\u0435\u0434\u043E\u0432\u0430',
    11: '\uD83C\uDFD7\uFE0F11 \u0417\u043E\u043D\u0430 -> \u0420\u0430\u0439\u043D\u043E \u0414',
    12: '\uD83C\uDFD4\uFE0F12 \u0417\u043E\u043D\u0430 -> \u041A\u0430\u0437\u0431\u0435\u0442',
    15: '\uD83D\uDE8415 \u0417\u043E\u043D\u0430 -> \u0412\u043E\u043A\u0437\u0430\u043B',
    16: '\uD83C\uDF4016 \u0417\u043E\u043D\u0430 -> \u0417\u0435\u043B\u0435\u043D\u0430',
    17: '\uD83C\uDF0A17 \u0417\u043E\u043D\u0430 -> \u0412\u043E\u0434\u043E\u043A\u0430\u043D\u0430\u043B',
    18: '\uD83D\uDD2E18 \u0417\u043E\u043D\u0430 -> \u0425\u0438\u043C\u043F\u0430\u0441'
  };

  function getDisplayName(zoneNum) {
    return displayNames[zoneNum] || ('Зона ' + zoneNum);
  }

  function getBundleId(zoneId, tkdRange) {
    return zoneId + '_' + tkdRange;
  }

  function getZoneOrderNumber(name) {
    const match = String(name || '').match(/\d+/);
    return match ? parseInt(match[0], 10) : 999;
  }

  function sortZones(zones) {
    return [...zones].sort((a, b) => {
      const numA = getZoneOrderNumber(a.name);
      const numB = getZoneOrderNumber(b.name);
      if (numA !== numB) return numA - numB;
      return a.name.localeCompare(b.name, 'uk', { numeric: true });
    });
  }

  window.ZoneMeta = {
    displayNames,
    getDisplayName,
    getBundleId,
    getZoneOrderNumber,
    sortZones,
  };
})();
