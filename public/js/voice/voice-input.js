(function () {
  'use strict';

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  const NUM_WORDS = {
    'ноль': 0, 'нуль': 0,
    'один': 1, 'одна': 1, 'одно': 1, 'раз': 1, 'одну': 1,
    'два': 2, 'две': 2, 'дві': 2,
    'три': 3,
    'четыре': 4, 'чотири': 4,
    'пять': 5, 'пʼять': 5, "п'ять": 5, 'п’ять': 5,
    'шесть': 6, 'шість': 6,
    'семь': 7, 'сім': 7,
    'восемь': 8, 'вісім': 8,
    'девять': 9, 'девʼять': 9, "дев'ять": 9, 'дев’ять': 9,
    'десять': 10,
    'одиннадцать': 11, 'одинадцять': 11,
    'двенадцать': 12, 'дванадцять': 12,
    'тринадцать': 13, 'тринадцять': 13,
    'четырнадцать': 14, 'чотирнадцять': 14,
    'пятнадцать': 15, 'пʼятнадцять': 15, "п'ятнадцять": 15, 'п’ятнадцять': 15,
    'шестнадцать': 16, 'шістнадцять': 16,
    'семнадцать': 17, 'сімнадцять': 17,
    'восемнадцать': 18, 'вісімнадцять': 18,
    'девятнадцать': 19, 'девʼятнадцять': 19, "дев'ятнадцять": 19, 'дев’ятнадцять': 19,
    'двадцать': 20, 'двадцять': 20,
    'тридцать': 30, 'тридцять': 30,
    'сорок': 40,
    'пятьдесят': 50, 'пʼятдесят': 50, "п'ятдесят": 50, 'п’ятдесят': 50,
    'шестьдесят': 60, 'шістдесят': 60,
    'семьдесят': 70, 'сімдесят': 70,
    'восемьдесят': 80, 'вісімдесят': 80,
    'девяносто': 90, 'девʼяносто': 90, "дев'яносто": 90, 'дев’яносто': 90,
    'сто': 100,
    'двести': 200, 'двісті': 200,
    'триста': 300,
    'четыреста': 400, 'чотириста': 400,
    'пятьсот': 500, 'пʼятсот': 500, "п'ятсот": 500, 'п’ятсот': 500,
    'шестьсот': 600, 'шістсот': 600,
    'семьсот': 700, 'сімсот': 700,
    'восемьсот': 800, 'вісімсот': 800,
    'девятьсот': 900, 'девʼятсот': 900, "дев'ятсот": 900, 'дев’ятсот': 900,
    'тысяча': 1000, 'тысяч': 1000, 'тысячи': 1000, 'тисяча': 1000, 'тисячі': 1000, 'тисяч': 1000,
  };
  const ORDINAL_WORD_FORMS = {
    'первый': 1, 'первая': 1, 'первое': 1, 'первые': 1, 'первом': 1, 'первую': 1, 'первого': 1, 'первой': 1, 'первых': 1,
    'второй': 2, 'вторая': 2, 'второе': 2, 'вторые': 2, 'втором': 2, 'вторую': 2, 'второго': 2, 'второй': 2, 'вторых': 2,
    'третий': 3, 'третья': 3, 'третье': 3, 'третьи': 3, 'третьем': 3, 'третью': 3, 'третьего': 3, 'третьей': 3, 'третьих': 3,
    'четвертый': 4, 'четвертая': 4, 'четвертое': 4, 'четвертые': 4, 'четвертом': 4, 'четвертую': 4, 'четвертого': 4, 'четвертой': 4, 'четвертых': 4,
    'пятый': 5, 'пятая': 5, 'пятое': 5, 'пятые': 5, 'пятом': 5, 'пятую': 5, 'пятого': 5, 'пятой': 5, 'пятых': 5,
    'шестой': 6, 'шестая': 6, 'шестое': 6, 'шестые': 6, 'шестом': 6, 'шестую': 6, 'шестого': 6, 'шестой': 6, 'шестых': 6,
    'седьмой': 7, 'седьмая': 7, 'седьмое': 7, 'седьмые': 7, 'седьмом': 7, 'седьмую': 7, 'седьмого': 7, 'седьмой': 7, 'седьмых': 7,
    'восьмой': 8, 'восьмая': 8, 'восьмое': 8, 'восьмые': 8, 'восьмом': 8, 'восьмую': 8, 'восьмого': 8, 'восьмой': 8, 'восьмых': 8,
    'девятый': 9, 'девятая': 9, 'девятое': 9, 'девятые': 9, 'девятом': 9, 'девятую': 9, 'девятого': 9, 'девятой': 9, 'девятых': 9,
    'десятый': 10, 'десятая': 10, 'десятое': 10, 'десятые': 10, 'десятом': 10, 'десятую': 10, 'десятого': 10, 'десятой': 10, 'десятых': 10,
    'перший': 1, 'перша': 1, 'перше': 1, 'перші': 1, 'першому': 1, 'першу': 1, 'першого': 1, 'першої': 1, 'перших': 1,
    'другий': 2, 'друга': 2, 'друге': 2, 'другі': 2, 'другому': 2, 'другу': 2, 'другого': 2, 'другої': 2, 'других': 2,
    'третій': 3, 'третя': 3, 'третє': 3, 'треті': 3, 'третьому': 3, 'третю': 3, 'третього': 3, 'третьої': 3, 'третіх': 3,
    'четвертий': 4, 'четверта': 4, 'четверте': 4, 'четверті': 4, 'четвертому': 4, 'четверту': 4, 'четвертого': 4, 'четвертої': 4, 'четвертих': 4,
    'пятий': 5, 'пята': 5, 'пяте': 5, 'пяті': 5, 'пятому': 5, 'пяту': 5, 'пятого': 5, 'пятої': 5, 'пятих': 5,
    "п'ятий": 5, "п'ята": 5, "п'яте": 5, "п'яті": 5, "п'ятому": 5, "п'яту": 5, "п'ятого": 5, "п'ятої": 5, "п'ятих": 5,
    'пʼятий': 5, 'пʼята': 5, 'пʼяте': 5, 'пʼяті': 5, 'пʼятому': 5, 'пʼяту': 5, 'пʼятого': 5, 'пʼятої': 5, 'пʼятих': 5,
    'п’ятий': 5, 'п’ята': 5, 'п’яте': 5, 'п’яті': 5, 'п’ятому': 5, 'п’яту': 5, 'п’ятого': 5, 'п’ятої': 5, 'п’ятих': 5,
    'шостий': 6, 'шоста': 6, 'шосте': 6, 'шості': 6, 'шостому': 6, 'шосту': 6, 'шостого': 6, 'шостої': 6, 'шостих': 6,
    'сьомий': 7, 'сьома': 7, 'сьоме': 7, 'сьомі': 7, 'сьомому': 7, 'сьому': 7, 'сьомого': 7, 'сьомої': 7, 'сьомих': 7,
    'восьмий': 8, 'восьма': 8, 'восьме': 8, 'восьмі': 8, 'восьмому': 8, 'восьму': 8, 'восьмого': 8, 'восьмої': 8, 'восьмих': 8,
    'девятий': 9, 'девята': 9, 'девяте': 9, 'девяті': 9, 'девятому': 9, 'девяту': 9, 'девятого': 9, 'девятої': 9, 'девятих': 9,
    "дев'ятий": 9, "дев'ята": 9, "дев'яте": 9, "дев'яті": 9, "дев'ятому": 9, "дев'яту": 9, "дев'ятого": 9, "дев'ятої": 9, "дев'ятих": 9,
    'девʼятий': 9, 'девʼята': 9, 'девʼяте': 9, 'девʼяті': 9, 'девʼятому': 9, 'девʼяту': 9, 'девʼятого': 9, 'девʼятої': 9, 'девʼятих': 9,
    'дев’ятий': 9, 'дев’ята': 9, 'дев’яте': 9, 'дев’яті': 9, 'дев’ятому': 9, 'дев’яту': 9, 'дев’ятого': 9, 'дев’ятої': 9, 'дев’ятих': 9,
    'десятий': 10, 'десята': 10, 'десяте': 10, 'десяті': 10, 'десятому': 10, 'десяту': 10, 'десятого': 10, 'десятої': 10, 'десятих': 10,
  };

  const APARTMENT_MARKER_RE = /^(?:\u043a\u0432(?:\.|\u0430\u0440\u0442\u0438\u0440\u0430)?|\u0441\u0442\u0440(?:\.|\u043e\u0435\u043d\u0438\u0435)?|\u0441\.)\s*(\d+)$/iu;
  const APARTMENT_CAPTURE_RE = /\s*((?:\u043a\u0432(?:\.|\u0430\u0440\u0442\u0438\u0440\u0430)?|\u0441\u0442\u0440(?:\.|\u043e\u0435\u043d\u0438\u0435)?|\u0441\.))\s*(\d+)\s*$/iu;
  const PHONE_ONLY_RE = /^\+?\d[\d\s().-]{7,}$/u;

  function extractPhoneLikeValue(value) {
    const source = String(value || '').trim();
    if (!source) return '';

    const compact = source.replace(/[^\d+]/g, '');
    if (/^\+\d{10,15}$/u.test(compact)) {
      return compact;
    }

    const digits = source.replace(/\D/g, '');
    if (/^\d{10,12}$/u.test(digits)) {
      return digits;
    }

    return '';
  }

  function wordsToNumber(words) {
    let total = 0;
    let current = 0;
    for (const word of words) {
      const value = NUM_WORDS[word];
      if (value === undefined) return null;
      if (value === 1000) {
        total += (current || 1) * 1000;
        current = 0;
      } else {
        current += value;
      }
    }
    return total + current;
  }

  function replaceOrdinalWords(text) {
    return String(text)
      .split(/(\s+|[^\p{L}\p{N}'’ʼ]+)/u)
      .map((token) => {
        const normalized = String(token).toLowerCase();
        const value = ORDINAL_WORD_FORMS[normalized];
        return value === undefined ? token : String(value);
      })
      .join('');
  }

  function replaceNumberWords(text) {
    const normalizedText = replaceOrdinalWords(text);
    const tokens = String(normalizedText).split(/(\s+|[^\p{L}\p{N}'’ʼ]+)/u);
    const out = [];
    let buffer = [];

    function flush() {
      if (!buffer.length) return;
      const number = wordsToNumber(buffer);
      out.push(number === null ? buffer.join(' ') : String(number));
      buffer = [];
    }

    for (const token of tokens) {
      const low = token.toLowerCase();
      if (NUM_WORDS[low] !== undefined) {
        buffer.push(low);
        continue;
      }
      if (/^\s+$/u.test(token)) {
        if (!buffer.length) out.push(token);
        continue;
      }
      flush();
      out.push(token);
    }

    flush();
    return out.join('').replace(/\s+/g, ' ').trim();
  }

  function normalizeZone(value) {
    if (!value) return '';
    const withDigits = replaceNumberWords(value);
    const apartmentLike = withDigits.match(/^(кв(?:\.|артира)?|стр(?:\.|оение)?|с\.)\s*(\d+)$/iu);
    if (apartmentLike) {
      return `${apartmentLike[1].trim()} ${apartmentLike[2]}`.replace(/\s+/g, ' ').trim();
    }
    const match = withDigits.match(/\d+/);
    return match ? match[0] : '';
  }

  function normalizeCode(value) {
    if (!value) return '';
    const withDigits = replaceNumberWords(value);
    const match = withDigits.match(/\d+/);
    return match ? match[0] : withDigits.replace(/[^\w\p{L}'’ʼ-]/gu, '').trim();
  }

  function normalizeAccessMarkers(value) {
    return String(value)
      .split(/(\s+|[^\p{L}\p{N}'’ʼ.]+)/u)
      .map((token) => {
        const normalized = String(token).toLowerCase();
        if (normalized === 'квартира') return 'кв.';
        if (normalized === 'кв') return 'кв.';
        return token;
      })
      .join('')
      .replace(/кв\.(?=\S)/giu, 'кв. ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeAccessCode(value) {
    if (!value) return '';
    const withDigits = replaceNumberWords(value);
    const phoneValue = extractPhoneLikeValue(withDigits);
    if (phoneValue) {
      return phoneValue;
    }
    const normalizedMarkers = normalizeAccessMarkers(withDigits);
    const apartmentLike = normalizedMarkers.match(APARTMENT_CAPTURE_RE);
    if (apartmentLike) {
      return `${normalizeAccessMarkers(apartmentLike[1]).trim()} ${apartmentLike[2]}`.replace(/\s+/g, ' ').trim();
    }
    let cleaned = normalizedMarkers
      .replace(/[.,;:]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleaned) return '';

    // Strip leading address-like patterns (street + number) from code
    const streetHouseMatch = cleaned.match(/^([\p{L}\s-]+?\s+\d+[\p{L}a-z'’ʼ]?)[,\s]+(.+)$/iu);
    if (streetHouseMatch && !isAccessDescription(streetHouseMatch[1])) {
      cleaned = streetHouseMatch[2].trim();
    }

    const markerMatch = cleaned.match(/^(?:номер|телефон|код|доступ|пароль|code|password)\s+(.+)$/iu);
    const content = trimLeadingNoiseToAccess(markerMatch ? markerMatch[1].trim() : cleaned);
    if (!content) return '';
    if (/^\d+$/u.test(content)) return content;
    if (!/\p{L}/u.test(content)) return normalizeCode(content);
    return content;
  }

  function normalizeAddress(value) {
    if (!value) return '';
    let text = replaceNumberWords(value).trim();
    text = text.replace(/[.,;:\s]+$/g, '').trim();
    if (!/\p{L}/u.test(text)) return '';
    if (!/\d/u.test(text)) return '';
    // Remove trailing access description (anything after a comma that looks like access info)
    const accessAfterComma = text.match(/,\s*(.+)$/);
    if (accessAfterComma && isAccessDescription(accessAfterComma[1])) {
      text = text.slice(0, accessAfterComma.index).trim();
    }
    // Remove trailing standalone number after comma (e.g., "Парковая, 107, 2580" -> "Парковая, 107")
    const doubleCommaNum = text.match(/^(.+?\d+[\p{L}a-z'’ʼ]?)\s*,\s*(\d{2,})\s*$/u);
    if (doubleCommaNum) {
      text = doubleCommaNum[1].trim();
    }
    // Strip trailing access markers that might be appended
    const accessSuffix = text.match(/^(.+?)\s+(подъезд|подьезд|парадн|этаж|домофон|калитк|калиточк|ворот|двер|вход|ключ|код|консьерж|вахтер|охран|диспетчер|жэк|жек|брелок|чип|магнит).*$/iu);
    if (accessSuffix) {
      text = accessSuffix[1].trim();
    }
    if (!/\p{L}/u.test(text)) return '';
    if (!/\d/u.test(text)) return '';
    text = text.replace(/^(\p{L})/u, (char) => char.toUpperCase());
    const match = text.match(/([^\d,]+?)\s+(\d+[\p{L}a-z'’ʼ]?)$/iu);
    if (match && !match[1].includes(',') && !match[1].trim().endsWith(',')) {
      text = `${match[1].trim()}, ${match[2]}`;
    }
    return text.replace(/\s+/g, ' ').replace(/\s*,\s*/g, ', ').trim();
  }

  function normalizeParsedParts(parts) {
    const safe = parts || {};
    let address = normalizeAddress(safe.address || '');
    let code = normalizeAccessCode(safe.code || '');
    const zone = normalizeZone(safe.zone || '');

    // If code contains a street+house pattern but no access description, it's likely an address split wrong
    if (!address && code) {
      // Skip if code starts with apartment/office markers
      const isApartmentCode = /^(?:кв\.|квартира|стр\.|с\.)\s*\d+/iu.test(code);
      const codeHasAddress = !isApartmentCode && /[\p{L}][^\d]{0,50}?\s+\d+[\p{L}a-z'’ʼ]?/iu.test(code);
      const codeHasAccess = isAccessDescription(code);
      if (codeHasAddress && !codeHasAccess) {
        address = normalizeAddress(code);
        code = '';
      }
    }

    // If address contains access markers, move to code
    if (address && !code && isAccessDescription(address)) {
      code = address;
      address = '';
    }

    // If address has extra parts after comma, only strip the last part to code if:
    // - there are 3+ parts (e.g. "Улица, 10, 2580" → "Улица, 10" + code "2580")
    // - OR the last part is clearly an access description (not a bare number)
    if (address) {
      const commaParts = address.split(',').map(s => s.trim());
      if (commaParts.length >= 3) {
        const lastPart = commaParts[commaParts.length - 1];
        if (!code) code = lastPart;
        address = commaParts.slice(0, -1).join(', ');
      } else if (commaParts.length === 2) {
        const lastPart = commaParts[1];
        if (isAccessDescription(lastPart)) {
          if (!code) code = lastPart;
          address = commaParts[0];
        }
      }
    }

    return {
      zone,
      address,
      code,
      confidence: Number.isFinite(safe.confidence) ? safe.confidence : 0,
    };
  }

  function hasRecognizedFields(parsed) {
    return !!(parsed && (parsed.zone || parsed.address || parsed.code));
  }

  const ACCESS_DESCRIPTION_MARKERS = [
    'подъезд',
    'подьезд',
    'парадн',
    'этаж',
    'домофон',
    'домофонн',
    'калитк',
    'калиточк',
    'ворот',
    'двер',
    'дверь',
    'вход',
    'входн',
    'кодов',
    'кодовый',
    'кодовом',
    'консьерж',
    'вахтер',
    'охран',
    'осбб',
    'управляющ',
    'диспетчер',
    'админист',
    'жэк',
    'жек',
    'ключ',
    'слесар',
    'вахт',
    'охрана',
    'ресепш',
    'админ',
    'регистратур',
    'стойк',
    'пропуск',
    'пропускн',
    'турникет',
    'шлагбаум',
    'переговор',
    'звонок',
    'брелок',
    'таблетк',
    'чип',
    'магнит',
    'открывается',
    'открыть',
    'откроет',
    'набрать',
    'звонить',
    'позвонить',
    'вызвать',
  ];
  const LEADING_NOISE_WORDS = new Set([
    'погода', 'сегодня', 'завтра', 'вчера', 'хорошая', 'хороший', 'хорошее', 'плохая',
    'плохой', 'плохое', 'отличная', 'классная', 'супер', 'нормальная', 'нормальный',
    'нормальное', 'ладно', 'короче', 'вообще', 'типа', 'вроде', 'кажется', 'запиши',
    'запишите', 'пожалуйста', 'спасибо', 'здравствуйте', 'привет', 'смотри', 'слушай',
    'значит', 'вот', 'это', 'ну', 'да', 'нет', 'хорошо', 'пойдем', 'давай',
    'добавь', 'добавить', 'добавляю', 'внести', 'вношу', 'введите',
    'информация', 'информацию', 'данные', 'данн',
  ]);

  function isAccessDescription(text) {
    if (!text) return false;
    const normalized = String(text).toLowerCase();
    return ACCESS_DESCRIPTION_MARKERS.some((marker) => normalized.includes(marker));
  }

  function trimLeadingNoiseToAccess(text) {
    if (!text) return '';
    const source = String(text).trim();
    const normalized = source.toLowerCase();
    let bestIndex = -1;

    for (const marker of ACCESS_DESCRIPTION_MARKERS) {
      const index = normalized.indexOf(marker);
      if (index >= 0 && (bestIndex === -1 || index < bestIndex)) {
        bestIndex = index;
      }
    }

    if (bestIndex <= 0) return source;
    const prefixWords = normalized
      .slice(0, bestIndex)
      .split(/\s+|[^\p{L}\p{N}'’ʼ]+/u)
      .filter(Boolean);
    if (!prefixWords.length || prefixWords.some((word) => !LEADING_NOISE_WORDS.has(word))) {
      return source;
    }
    return source.slice(bestIndex).trim();
  }

  function formatParsedSummary(parsed) {
    return [
      parsed.zone ? `зона ${parsed.zone}` : '',
      parsed.address ? `адрес ${parsed.address}` : '',
      parsed.code ? `код ${parsed.code}` : '',
    ].filter(Boolean).join(', ');
  }

  function shouldUseAiFallback(parsed, transcript, options) {
    if (!options || typeof options.aiParse !== 'function') return false;
    if (!transcript || !transcript.trim()) return false;
    const normalizedTranscript = replaceNumberWords(String(transcript)).toLowerCase();
    const meaningfulWords = normalizedTranscript
      .split(/\s+|[^\p{L}\p{N}'’ʼ]+/u)
      .filter(Boolean);
    const wordCount = meaningfulWords.length;
    const aiMode = options && options.aiMode === 'prefer' ? 'prefer' : 'fallback';
    const mentionsZone = /\b(зона|zone)\b/iu.test(transcript);
    const mentionsCode = /\b(код|пароль|доступ|номер|телефон|code|password)\b/iu.test(transcript);
    const hasLongAccessDescription = !!(parsed.code && /\p{L}/u.test(parsed.code) && wordCount >= 5);
    const hasComplexFreeformSpeech = wordCount >= 7;

    if (aiMode === 'prefer' && wordCount >= 3) return true;
    if (!parsed.address) return true;
    if (options.fields && options.fields.zone && mentionsZone && !parsed.zone) return true;
    if (options.fields && options.fields.code && mentionsCode && !parsed.code) return true;
    if (options.fields && options.fields.code && hasLongAccessDescription) return true;
    if (hasComplexFreeformSpeech && mentionsCode) return true;
    return false;
  }

  function getAiConfidenceThreshold(options) {
    if (!options || !Number.isFinite(options.aiConfidenceThreshold)) {
      return 70;
    }
    return Math.max(0, Math.min(100, Math.round(options.aiConfidenceThreshold)));
  }

  function parseTranscript(raw) {
    if (!raw) return { zone: '', address: '', code: '' };

    let text = String(raw)
      .replace(/\s+точка(?!\p{L})/giu, '.')
      .replace(/\s+запятая(?!\p{L})/giu, ',')
      .replace(/\s+кома(?!\p{L})/giu, ',')
      .trim();

    const markers = [
      { key: 'zone', re: /(^|[^\p{L}])(зон[аеуыіоюй]?|zone)(?![\p{L}])[.,:\-]*\s*/giu },
      { key: 'address', re: /(^|[^\p{L}])(адрес[аеу]?|адреса|вулиц[яією]|улиц[аеую]|address)(?![\p{L}])[.,:\-]*\s*/giu },
      { key: 'code', re: /(^|[^\p{L}])(код[ауы]?|пароль[\p{L}]*|доступ[\p{L}]*|номер|телефон|code|password)(?![\p{L}])[.,:\-]*\s*/giu },
    ];

    const hits = [];
    for (const marker of markers) {
      marker.re.lastIndex = 0;
      let match;
      while ((match = marker.re.exec(text)) !== null) {
        hits.push({
          key: marker.key,
          start: match.index + (match[1] || '').length,
          end: marker.re.lastIndex,
        });
      }
    }
    hits.sort((left, right) => left.start - right.start);

    const parts = { zone: '', address: '', code: '' };

    if (!hits.length) {
      text = replaceNumberWords(text);
      const noLettersTranscript = text.replace(/[^\d+]/g, '');
      if (!/\p{L}/u.test(text) && /\d/u.test(noLettersTranscript)) {
        return {
          zone: '',
          address: '',
          code: noLettersTranscript,
        };
      }
      const phoneOnlyTranscript = text.replace(/[^\d+\s().-]/g, '').trim();
      const normalizedPhoneOnly = extractPhoneLikeValue(phoneOnlyTranscript);
      if (PHONE_ONLY_RE.test(phoneOnlyTranscript) && normalizedPhoneOnly) {
        return {
          zone: '',
          address: '',
          code: normalizedPhoneOnly,
        };
      }
      let addressText = text;

      const apartmentMatch = addressText.match(/\s*(?:кв(?:\.|артира)?|стр(?:\.|оение)?|с\.)\s*(\d+)\s*$/iu);
      if (apartmentMatch) {
        parts.code = apartmentMatch[0].trim();
        addressText = addressText.slice(0, apartmentMatch.index).trim();
      }

      if (!parts.code) {
        const phoneMatch = addressText.match(/[\s,]*(\+?\d[\d\s().-]{7,})\s*$/u);
        if (phoneMatch) {
          const normalizedPhone = extractPhoneLikeValue(phoneMatch[1]);
          if (normalizedPhone) {
            parts.code = normalizedPhone;
            addressText = addressText.slice(0, phoneMatch.index).trim();
          }
        }
      }

      if (!parts.code) {
        const addressWithCodeMatch = addressText.match(/^(.+?\s+\d+[\p{L}a-z'’ʼ]?)[,\s]+(\d{2,})\s*$/iu);
        if (addressWithCodeMatch) {
          parts.address = addressWithCodeMatch[1].trim();
          parts.code = addressWithCodeMatch[2];
          addressText = parts.address;
        }
      }

      if (!parts.code) {
        const explicitTail = addressText.match(/(?:номер|телефон|код|доступ|кв)\s*(\d{2,})\s*$/iu);
        if (explicitTail) {
          parts.code = explicitTail[1];
          addressText = addressText.slice(0, explicitTail.index).trim();
        }
      }

      if (!parts.address) {
        const addressWithTailMatch = addressText.match(/^(.+?\s+\d+[\p{L}a-z'’ʼ]?)[,\s]+(.+)$/iu);
        if (addressWithTailMatch) {
          const candidateAddress = addressWithTailMatch[1].trim();
          if (!isAccessDescription(candidateAddress)) {
            parts.address = candidateAddress;
            parts.code = addressWithTailMatch[2].trim();
            addressText = parts.address;
          }
        }
      }

      addressText = addressText
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word && !LEADING_NOISE_WORDS.has(word))
        .join(' ');

      if (!parts.address) {
        const addressOnlyMatch = addressText.match(/([\p{L}][^\d]{0,50}?\s+\d+[\p{L}a-z'’ʼ]?)$/iu);
        if (addressOnlyMatch) {
          const candidateAddress = addressOnlyMatch[1].trim();
          if (!isAccessDescription(candidateAddress)) {
            parts.address = candidateAddress;
          }
        }
      }

      if (!parts.code) {
        const standaloneCode = addressText.match(/^\d{2,}$/u);
        if (standaloneCode) {
          parts.code = standaloneCode[0];
        }
      }

      if (!parts.address && !parts.code) {
        const cleanedTail = replaceNumberWords(String(raw))
          .replace(/[.,;:]+$/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        if (cleanedTail && /\p{L}/u.test(cleanedTail) && (/\d/u.test(cleanedTail) || isAccessDescription(cleanedTail))) {
          parts.code = trimLeadingNoiseToAccess(cleanedTail);
        }
      }
    } else {
      if (hits[0].start > 0) {
        const prefix = text.slice(0, hits[0].start).trim();
        if (prefix) parts.address = prefix;
      }
      for (let index = 0; index < hits.length; index += 1) {
        const hit = hits[index];
        const nextHit = hits[index + 1];
        const segment = text.slice(hit.end, nextHit ? nextHit.start : text.length).trim();
        if (segment) {
          parts[hit.key] = segment;
        }
      }
    }

    const normalized = normalizeParsedParts(parts);
    if (normalized.address && !normalized.code && isAccessDescription(normalized.address)) {
      normalized.code = normalized.address;
      normalized.address = '';
    }
    return {
      zone: normalized.zone,
      address: normalized.address,
      code: normalized.code,
    };
  }

  function errorMessage(errorCode) {
    switch (errorCode) {
      case 'not-allowed':
      case 'service-not-allowed':
        return 'Нет доступа к микрофону. Разрешите доступ в настройках браузера.';
      case 'no-speech':
        return 'Не услышал ничего. Попробуй ещё раз.';
      case 'audio-capture':
        return 'Микрофон не найден.';
      case 'network':
        return 'Сеть недоступна для распознавания речи.';
      case 'aborted':
        return '';
      default:
        return 'Ошибка распознавания речи: ' + errorCode;
    }
  }

  function isSecureContextOk() {
    if (typeof window === 'undefined') return true;
    if (window.isSecureContext) return true;
    const host = window.location && window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  }

  function createAiParser(config) {
    const options = Object.assign({
      endpoint: '/api/voice/parse',
      getAuthToken: null,
      fetchImpl: typeof fetch === 'function' ? fetch.bind(window) : null,
    }, config || {});

    return async function aiParse(transcript, rawParsed) {
      if (!options.fetchImpl || !transcript || !transcript.trim()) {
        return null;
      }

      const headers = { 'Content-Type': 'application/json' };
      if (typeof options.getAuthToken === 'function') {
        const token = options.getAuthToken();
        if (token) headers.Authorization = `Bearer ${token}`;
      }

      const body = { transcript };
      if (typeof options.getZoneNum === 'function') {
        const zoneNum = options.getZoneNum();
        if (zoneNum) body.zoneNum = zoneNum;
      }

      const response = await options.fetchImpl(options.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`AI parse failed with status ${response.status}`);
      }

      return response.json();
    };
  }

  function attach(button, opts) {
    const options = Object.assign({
      lang: 'ru-RU',
      fallbackLang: null,
      aiParse: null,
      aiMode: 'fallback',
      aiConfidenceThreshold: 70,
      fields: {},
      isActive: () => true,
      getZoneNum: null,
      showToast: () => {},
      onApplied: () => {},
    }, opts || {});

    if (!button) return { destroy() {}, start() {}, stop() {} };
    if (!SpeechRecognition) {
      button.style.display = 'none';
      return { destroy() {}, start() {}, stop() {} };
    }

    const secureOk = isSecureContextOk();
    const rootStyle = getComputedStyle(document.documentElement);
    const accentColor = rootStyle.getPropertyValue('--accent').trim() || '#4f8cff';
    const mutedColor = rootStyle.getPropertyValue('--text-muted').trim() || '#888';

    let recognition = null;
    let currentLang = options.lang;
    let triedFallback = false;
    let active = false;

    function createRecognition(lang) {
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.lang = lang;
      recognitionInstance.interimResults = false;
      recognitionInstance.maxAlternatives = 1;
      recognitionInstance.continuous = false;
      return recognitionInstance;
    }

    function setActive(flag) {
      active = flag;
      button.style.color = flag ? accentColor : mutedColor;
      button.classList.toggle('voice-input-btn--recording', flag);
      if (flag) {
        button.setAttribute('aria-pressed', 'true');
      } else {
        button.removeAttribute('aria-pressed');
      }
    }

    function applyParsed(parsed) {
      const { fields } = options;
      if (fields.zone && parsed.zone) fields.zone.value = parsed.zone;
      if (fields.address && parsed.address) fields.address.value = parsed.address;
      if (fields.code && parsed.code) fields.code.value = parsed.code;

      for (const name of ['zone', 'address', 'code']) {
        const field = fields[name];
        if (field && parsed[name]) {
          field.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }

      try { options.onApplied(parsed); } catch (error) { /* ignore */ }
    }

    async function handleResult(event) {
      const transcript = (event.results[0] && event.results[0][0] && event.results[0][0].transcript || '').trim();
      if (!transcript) {
        if (options.fallbackLang && !triedFallback) {
          triedFallback = true;
          currentLang = options.fallbackLang;
          bindAndStart();
          return;
        }
        options.showToast('Не услышал ничего. Попробуй ещё раз.');
        return;
      }

      let parsed = parseTranscript(transcript);
      let usedAi = false;

      if (shouldUseAiFallback(parsed, transcript, options)) {
        try {
          const aiParsed = normalizeParsedParts(await options.aiParse(transcript, parsed));
          if (hasRecognizedFields(aiParsed) && aiParsed.confidence >= getAiConfidenceThreshold(options)) {
            parsed = aiParsed;
            usedAi = true;
          } else if (hasRecognizedFields(aiParsed)) {
            options.showToast(`AI не уверен в результате (${aiParsed.confidence}%). Проверьте ввод вручную.`);
          }
        } catch (error) {
          console.warn('[VoiceInput] AI fallback failed:', error);
        }
      }

      if (!hasRecognizedFields(parsed)) {
        options.showToast(`Услышано: "${transcript}", но не удалось распознать поля`);
        return;
      }

      applyParsed(parsed);
      options.showToast(usedAi ? `AI уточнил: ${formatParsedSummary(parsed)}` : `Услышано: ${formatParsedSummary(parsed)}`);
    }

    function handleError(event) {
      console.warn('[VoiceInput] recognition error:', event.error);
      const message = errorMessage(event.error || 'unknown');
      if (message) options.showToast(message);
      setActive(false);
    }

    function handleEnd() {
      setActive(false);
    }

    function bindAndStart() {
      try {
        recognition = createRecognition(currentLang);
        recognition.addEventListener('result', handleResult);
        recognition.addEventListener('error', handleError);
        recognition.addEventListener('end', handleEnd);
        recognition.addEventListener('start', () => {
          options.showToast('🎙 Говорите…');
        });
        recognition.start();
        setActive(true);
      } catch (error) {
        console.error('[VoiceInput] start failed:', error);
        options.showToast('Не удалось запустить голосовой ввод: ' + (error && error.message ? error.message : error));
        setActive(false);
      }
    }

    function start() {
      if (active) {
        stop();
        return;
      }
      if (!secureOk) {
        options.showToast('Голосовой ввод требует HTTPS. Откройте сайт по https:// или через localhost.');
        return;
      }
      if (!options.isActive()) {
        options.showToast('Откройте форму адреса, чтобы использовать голосовой ввод');
        return;
      }
      triedFallback = false;
      currentLang = options.lang;
      bindAndStart();
    }

    function stop() {
      if (recognition && active) {
        try { recognition.stop(); } catch (error) { /* ignore */ }
      }
      setActive(false);
    }

    const clickHandler = (event) => {
      event.preventDefault();
      event.stopPropagation();
      start();
    };
    button.addEventListener('click', clickHandler);

    return {
      start,
      stop,
      destroy() {
        button.removeEventListener('click', clickHandler);
        stop();
      },
    };
  }

  window.VoiceInput = {
    attach,
    createAiParser,
    normalizeParsedParts,
    hasRecognizedFields,
    shouldUseAiFallback,
    getAiConfidenceThreshold,
    parseTranscript,
    replaceNumberWords,
    isSupported: () => !!SpeechRecognition,
  };
})();


