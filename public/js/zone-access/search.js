(function () {
  'use strict';

  // ===== Утилиты для ленивого (нечёткого) поиска =====

  // Карта раскладки EN -> RU (на случай, если пользователь забыл переключить раскладку)
  const EN_TO_RU_LAYOUT = {
    q: 'й', w: 'ц', e: 'у', r: 'к', t: 'е', y: 'н', u: 'г', i: 'ш', o: 'щ', p: 'з',
    '[': 'х', ']': 'ъ',
    a: 'ф', s: 'ы', d: 'в', f: 'а', g: 'п', h: 'р', j: 'о', k: 'л', l: 'д',
    ';': 'ж', "'": 'э',
    z: 'я', x: 'ч', c: 'с', v: 'м', b: 'и', n: 'т', m: 'ь',
    ',': 'б', '.': 'ю', '/': '.',
    '`': 'ё',
  };

  // Карта раскладки RU -> EN (обратная)
  const RU_TO_EN_LAYOUT = {};
  Object.keys(EN_TO_RU_LAYOUT).forEach((k) => {
    RU_TO_EN_LAYOUT[EN_TO_RU_LAYOUT[k]] = k;
  });

  // Часто встречающиеся сокращения, которые нужно вычищать/нормализовать перед сравнением
  const ABBREVIATIONS = [
    /\bул(ица)?\.?/gi,
    /\bпр(оспект|осп|-?т)?\.?/gi,
    /\bпер(еулок|еул)?\.?/gi,
    /\bб(уль)?в(ар)?\.?/gi,
    /\bбульв(ар)?\.?/gi,
    /\bпл(ощадь|ощ)?\.?/gi,
    /\bш(оссе|осс)?\.?/gi,
    /\bдом\.?/gi,
    /\bд\./gi,
    /\bкорп(ус)?\.?/gi,
    /\bкв(артира)?\.?/gi,
    /\bстр(оение)?\.?/gi,
  ];

  // Перевести строку из EN раскладки в RU (если пользователь забыл переключить)
  function toRussianLayout(str) {
    let result = '';
    for (const ch of str) {
      const lower = ch.toLowerCase();
      if (EN_TO_RU_LAYOUT[lower]) {
        result += EN_TO_RU_LAYOUT[lower];
      } else {
        result += lower;
      }
    }
    return result;
  }

  // Перевести строку из RU раскладки в EN
  function toEnglishLayout(str) {
    let result = '';
    for (const ch of str) {
      const lower = ch.toLowerCase();
      if (RU_TO_EN_LAYOUT[lower]) {
        result += RU_TO_EN_LAYOUT[lower];
      } else {
        result += lower;
      }
    }
    return result;
  }

  // Нормализация: lower-case, ё->е, замена украинских букв на близкие, удаление пунктуации, сокращений
  function normalize(str) {
    if (!str) return '';
    let s = String(str).toLowerCase().trim();
    s = s.replace(/ё/g, 'е');
    // украинские буквы -> похожие русские (на случай если адрес написан на русском, а пользователь вводит украинскую)
    s = s.replace(/і/g, 'и').replace(/ї/g, 'и').replace(/є/g, 'е').replace(/ґ/g, 'г');
    // убрать сокращения
    ABBREVIATIONS.forEach((re) => {
      s = s.replace(re, ' ');
    });
    // оставить только буквы/цифры/пробелы
    s = s.replace(/[^a-zа-я0-9\s]/gi, ' ');
    // схлопнуть пробелы
    s = s.replace(/\s+/g, ' ').trim();
    return s;
  }

  // Расстояние Левенштейна (с ранним выходом по maxDist для производительности)
  function levenshtein(a, b, maxDist) {
    if (a === b) return 0;
    const al = a.length;
    const bl = b.length;
    if (al === 0) return bl;
    if (bl === 0) return al;
    if (Math.abs(al - bl) > (maxDist != null ? maxDist : Infinity)) {
      return maxDist + 1;
    }

    let prev = new Array(bl + 1);
    let curr = new Array(bl + 1);
    for (let j = 0; j <= bl; j++) prev[j] = j;

    for (let i = 1; i <= al; i++) {
      curr[0] = i;
      let rowMin = curr[0];
      for (let j = 1; j <= bl; j++) {
        const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
        curr[j] = Math.min(
          curr[j - 1] + 1,
          prev[j] + 1,
          prev[j - 1] + cost
        );
        if (curr[j] < rowMin) rowMin = curr[j];
      }
      if (maxDist != null && rowMin > maxDist) {
        return maxDist + 1;
      }
      const tmp = prev;
      prev = curr;
      curr = tmp;
    }
    return prev[bl];
  }

  // Допустимое расстояние Левенштейна в зависимости от длины слова
  function allowedDistance(len) {
    if (len <= 3) return 0;       // слишком короткое — только точное
    if (len <= 5) return 1;       // 1 опечатка
    if (len <= 8) return 2;       // 2 опечатки
    return 3;                     // длинные слова — до 3 опечаток
  }

  // Подсчёт «сколько токенов запроса найдено в тексте» с учётом нечёткого совпадения.
  // Возвращает { score, matched } где score — суммарный «штраф» (меньше = лучше),
  // matched — все ли токены запроса совпали хотя бы с чем-то.
  function fuzzyScore(queryTokens, textTokens) {
    if (!queryTokens.length) return { score: Infinity, matched: false };

    let totalScore = 0;
    let allMatched = true;

    for (const qt of queryTokens) {
      // числовые токены (номер дома, ТКД и т.п.) — только точное совпадение / startsWith
      const isNumeric = /^\d+$/.test(qt);
      let bestDist = Infinity;

      for (const tt of textTokens) {
        if (isNumeric) {
          if (tt === qt) { bestDist = 0; break; }
          if (tt.startsWith(qt) || qt.startsWith(tt)) {
            bestDist = Math.min(bestDist, 1);
          }
          continue;
        }

        // быстрая проверка: подстрока — самое лучшее совпадение
        if (tt.includes(qt) || qt.includes(tt)) {
          bestDist = 0;
          break;
        }

        // сравниваем по Левенштейну, но префикс с тем же началом — приоритетнее
        const maxLen = Math.max(qt.length, tt.length);
        const allowed = allowedDistance(Math.min(qt.length, tt.length));
        const d = levenshtein(qt, tt, allowed);
        if (d <= allowed) {
          // нормализуем в "относительную дистанцию" чтобы коротким словам штраф был меньше
          const rel = d / Math.max(1, maxLen);
          if (rel < bestDist) bestDist = rel;
        }
      }

      if (bestDist === Infinity) {
        allMatched = false;
      } else {
        totalScore += bestDist;
      }
    }

    return { score: totalScore, matched: allMatched };
  }

  // Главная функция: проверить совпадение запроса с текстом и вернуть оценку.
  // Возвращает число >= 0 если совпало (меньше = лучше), либо -1 если не совпало.
  function matchScore(rawQuery, rawText) {
    if (!rawQuery || !rawText) return -1;

    const normQuery = normalize(rawQuery);
    const normText = normalize(rawText);

    if (!normQuery || !normText) return -1;

    // 1) Самое лучшее: прямое вхождение подстроки (включая исходную пунктуацию)
    if (normText.includes(normQuery)) {
      // бонус: чем раньше в тексте — тем лучше
      const pos = normText.indexOf(normQuery);
      return 0 + pos / 1000;
    }

    const queryTokens = normQuery.split(' ').filter(Boolean);
    const textTokens = normText.split(' ').filter(Boolean);

    // 2) Нечёткое совпадение по токенам
    const direct = fuzzyScore(queryTokens, textTokens);
    if (direct.matched) return 1 + direct.score;

    // 3) Попробовать перекладку (англ. -> рус.) — если пользователь не переключил раскладку
    const translatedQuery = normalize(toRussianLayout(rawQuery));
    if (translatedQuery && translatedQuery !== normQuery) {
      if (normText.includes(translatedQuery)) {
        return 0.5 + normText.indexOf(translatedQuery) / 1000;
      }
      const trTokens = translatedQuery.split(' ').filter(Boolean);
      const trScore = fuzzyScore(trTokens, textTokens);
      if (trScore.matched) return 1.5 + trScore.score;
    }

    // 4) Попробовать обратную перекладку (рус. -> англ.)
    const translatedQueryEn = normalize(toEnglishLayout(rawQuery));
    if (translatedQueryEn && translatedQueryEn !== normQuery) {
      if (normText.includes(translatedQueryEn)) {
        return 0.5 + normText.indexOf(translatedQueryEn) / 1000;
      }
    }

    return -1;
  }

  // Экспорт в window для использования и из других модулей при желании
  window.FuzzySearch = {
    normalize,
    matchScore,
    levenshtein,
  };

  // ===== Поиск по адресам/ТКД в активити "Доступ" =====

   function init(config) {
     const {
       searchInput,
       resultsEl,
       zoneAccessData,
       formatAddress,
       formatTkdLineHtml,
       escapeHtml,
       setCurrentZoneNum,
       showZoneAccessView,
       getZoneDisplayName,
     } = config;

    let searchQuery = '';

    function filterAddressesBySearch() {
      const results = [];
      const rawQuery = searchQuery.trim();

      if (!rawQuery) return results;

      Object.keys(zoneAccessData).forEach((zoneNum) => {
        const addresses = zoneAccessData[zoneNum] || [];
        addresses.forEach((addr, addressIdx) => {
          const fullAddress = addr.address || '';
          const accessCode = String(addr.code || '').trim();

          const addressScore = matchScore(rawQuery, fullAddress);
          const codeScore = accessCode ? matchScore(rawQuery, accessCode) : -1;

          if (addr.tkdEntries && addr.tkdEntries.length > 0) {
            addr.tkdEntries.forEach((tkdEntry, tkdIdx) => {
              const tkdNumber = String(tkdEntry.tkd || '').trim();
              const entrance = String(tkdEntry.entrance || '').trim();
              const place = String(tkdEntry.place || '').trim();

              const tkdScore = tkdNumber ? matchScore(rawQuery, tkdNumber) : -1;
              const entranceScore = entrance ? matchScore(rawQuery, entrance) : -1;
              const placeScore = place ? matchScore(rawQuery, place) : -1;

              // собираем минимальный (лучший) score по всем полям
              const scores = [addressScore, codeScore, tkdScore, entranceScore, placeScore]
                .filter((s) => s >= 0);

              if (scores.length > 0) {
                const bestScore = Math.min(...scores);
                results.push({
                  zoneNum,
                  zoneName: getZoneDisplayName(zoneNum),
                  address: addr.address,
                  addressIdx,
                  tkdEntry: { tkd: tkdNumber, entrance, place, tkdIdx },
                  score: bestScore,
                });
              }
            });
          } else {
            const scores = [addressScore, codeScore].filter((s) => s >= 0);
            if (scores.length > 0) {
              const bestScore = Math.min(...scores);
              results.push({
                zoneNum,
                zoneName: getZoneDisplayName(zoneNum),
                address: addr.address,
                addressIdx,
                tkdEntry: null,
                score: bestScore,
              });
            }
          }
        });
      });

      // сортировка по релевантности (меньший score = лучше)
      results.sort((a, b) => a.score - b.score);

      return results;
    }

    function renderResults() {
      if (!resultsEl) return;

      const list = filterAddressesBySearch();
      resultsEl.innerHTML = '';

      if (!list.length) {
        resultsEl.innerHTML = '<p class="search-no-results">Ничего не найдено</p>';
        resultsEl.style.display = '';
        return;
      }

      const grouped = {};
      // сохраняем порядок: первый встреченный адрес определяет позицию (у нас уже отсортировано по score)
      list.forEach((item) => {
        const key = `${item.zoneNum}_${item.addressIdx}`;
        if (!grouped[key]) {
          grouped[key] = {
            zoneNum: item.zoneNum,
            zoneName: item.zoneName,
            addressIdx: item.addressIdx,
            tkdEntries: [],
            score: item.score,
          };
        } else {
          // обновим score если нашли лучше
          if (item.score < grouped[key].score) grouped[key].score = item.score;
        }
        if (item.tkdEntry) {
          grouped[key].tkdEntries.push(item.tkdEntry);
        }
      });

      // повторная сортировка после группировки
      const groupedList = Object.values(grouped).sort((a, b) => a.score - b.score);

      groupedList.forEach((item) => {
        const zoneNum = item.zoneNum;
        const addresses = zoneAccessData[zoneNum] || [];
        const addr = addresses[item.addressIdx] || {};
        const el = document.createElement('div');
        let tkdDetailsHtml = '';

        el.className = 'address-card search-result-address-card';
        el.style.cursor = 'pointer';

        if (item.tkdEntries.length > 0) {
          tkdDetailsHtml = `
            <div class="address-card__details" style="display: block;">
              <div class="address-card__tkd-list">
                ${item.tkdEntries.map((tkd, idx) => `
                  <div class="address-card__tkd-item">${formatTkdLineHtml(tkd.entrance, tkd.tkd, tkd.place)}</div>
                  ${idx < item.tkdEntries.length - 1 ? '<div class="address-card__tkd-separator"></div>' : ''}
                `).join('')}
              </div>
            </div>
          `;
        }

        el.innerHTML = `
          <div class="address-card__header">
            <div class="address-card__info">
              <span class="address-card__pin">📍</span>
              <span class="address-card__street">${escapeHtml(formatAddress(addr.address))}</span>
              <span class="address-card__zone-label" style="font-size: 0.85em; color: #666; margin-left: 0.5em;">${escapeHtml(item.zoneName)}</span>
            </div>
            <div class="address-card__chips">
              ${addr.code ? `<div class="address-card__chip address-card__chip--code"><span class="address-card__chip-icon">🔑</span> Доступ: ${escapeHtml(addr.code)}</div>` : ''}
            </div>
          </div>
          ${tkdDetailsHtml}
        `;

        el.addEventListener('click', () => {
          setCurrentZoneNum(parseInt(item.zoneNum, 10));
          showZoneAccessView();
          clear();
        });

        resultsEl.appendChild(el);
      });

      resultsEl.style.display = '';
    }

    function resizeSearchInput() {
      if (!searchInput) return;

      const value = searchInput.value || searchInput.placeholder || '';
      const measure = document.createElement('span');
      const computed = window.getComputedStyle(searchInput);

      measure.style.position = 'absolute';
      measure.style.visibility = 'hidden';
      measure.style.whiteSpace = 'pre';
      measure.style.font = computed.font;
      measure.style.letterSpacing = computed.letterSpacing;
      measure.textContent = value;

      document.body.appendChild(measure);
      const nextWidth = Math.max(200, Math.ceil(measure.getBoundingClientRect().width + 28));
      document.body.removeChild(measure);

      searchInput.style.width = nextWidth + 'px';
    }

    function clear() {
      if (searchInput) {
        searchInput.value = '';
      }
      searchQuery = '';
      resizeSearchInput();
      if (resultsEl) {
        resultsEl.style.display = 'none';
      }
    }

    function bind() {
      if (!searchInput) return;

      resizeSearchInput();
      searchInput.addEventListener('input', () => {
        resizeSearchInput();
        searchQuery = searchInput.value;
        if (searchQuery.trim()) {
          renderResults();
        } else if (resultsEl) {
          resultsEl.style.display = 'none';
        }
      });

      searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          clear();
        }
      });
    }

    bind();

    return {
      clear,
      renderResults,
      resizeSearchInput,
    };
  }

  window.ZoneAccessSearch = {
    init,
  };
})();
