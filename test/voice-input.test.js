// Smoke-test for VoiceInput parser. Run with: node test/voice-input.test.js
global.window = global.window || {};
global.getComputedStyle = () => ({ getPropertyValue: () => '' });
global.document = { documentElement: {} };

require('../public/js/voice/voice-input.js');

const { parseTranscript, replaceNumberWords } = window.VoiceInput;

let failed = 0;
let passed = 0;

function eq(actual, expected, label) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    passed++;
    console.log('  OK   ' + label);
  } else {
    failed++;
    console.log('  FAIL ' + label);
    console.log('    expected: ' + JSON.stringify(expected));
    console.log('    actual:   ' + JSON.stringify(actual));
  }
}

console.log('replaceNumberWords:');
eq(replaceNumberWords('парковая сто семь'), 'парковая 107', 'сто семь -> 107');
eq(replaceNumberWords('две тысячи пятьсот восемьдесят'), '2580', '2580');
eq(replaceNumberWords("дев'ять"), '9', "дев'ять -> 9");
eq(replaceNumberWords('улица гагарина десять'), 'улица гагарина 10', 'десять -> 10');
eq(replaceNumberWords('осбб живет в третьем подьезде'), 'осбб живет в 3 подьезде', 'третьем -> 3');
eq(replaceNumberWords('нужно позвонить охране на пятом этаже'), 'нужно позвонить охране на 5 этаже', 'пятом -> 5');

console.log('\nparseTranscript (with markers):');
eq(
  parseTranscript('зона пять адрес Парковая сто семь код две тысячи пятьсот восемьдесят'),
  { zone: '5', address: 'Парковая, 107', code: '2580' },
  'full RU phrase'
);
eq(
  parseTranscript('адрес Гагарина 10 код 2580'),
  { zone: '', address: 'Гагарина, 10', code: '2580' },
  'without zone'
);
eq(
  parseTranscript('улица гагарина десять пароль две тысячи пятьсот восемьдесят'),
  { zone: '', address: 'Гагарина, 10', code: '2580' },
  'street + password'
);
eq(
  parseTranscript('зона 3 адрес Парковая 107'),
  { zone: '3', address: 'Парковая, 107', code: '' },
  'without code'
);

console.log('\nparseTranscript (without markers):');
eq(
  parseTranscript('Парковая 107 2580'),
  { zone: '', address: 'Парковая, 107', code: '2580' },
  'address + code at end'
);
eq(
  parseTranscript('Парковая 107'),
  { zone: '', address: 'Парковая, 107', code: '' },
  'address only'
);
eq(
  parseTranscript('Парковая 107 осбб живет в 3 подьезде'),
  { zone: '', address: 'Парковая, 107', code: 'осбб живет в 3 подьезде' },
  'address + access description'
);
eq(
  parseTranscript('\u041f\u0430\u0440\u043a\u043e\u0432\u0430\u044f 107 \u043a\u0432\u0430\u0440\u0442\u0438\u0440\u0430 54'),
  { zone: '', address: '\u041f\u0430\u0440\u043a\u043e\u0432\u0430\u044f, 107', code: '\u043a\u0432. 54' },
  'address + apartment marker'
);
eq(
  parseTranscript('осбб живет в 3 подьезде'),
  { zone: '', address: '', code: 'осбб живет в 3 подьезде' },
  'access description only'
);
eq(
  parseTranscript('осбб живет в третьем подьезде'),
  { zone: '', address: '', code: 'осбб живет в 3 подьезде' },
  'access description with ordinal'
);
eq(
  parseTranscript('Парковая 107 домофон 45К позвонить консьержу'),
  { zone: '', address: 'Парковая, 107', code: 'домофон 45К позвонить консьержу' },
  'address + intercom and concierge'
);
eq(
  parseTranscript('калитка открывается с брелока'),
  { zone: '', address: '', code: 'калитка открывается с брелока' },
  'gate access only'
);
eq(
  parseTranscript('Гагарина 10 вход со двора кодовый замок'),
  { zone: '', address: 'Гагарина, 10', code: 'вход со двора кодовый замок' },
  'address + yard entrance note'
);
eq(
  parseTranscript('нужно позвонить охране на 2 этаже'),
  { zone: '', address: '', code: 'нужно позвонить охране на 2 этаже' },
  'call security access note'
);
eq(
  parseTranscript('нужно позвонить охране на пятом этаже'),
  { zone: '', address: '', code: 'нужно позвонить охране на 5 этаже' },
  'call security note with ordinal'
);
eq(
  parseTranscript('квартира пятьдесят четыре'),
  { zone: '', address: '', code: 'кв. 54' },
  'apartment marker shortened'
);
eq(
  parseTranscript('Погода хорошая ключи у сантехника'),
  { zone: '', address: '', code: 'ключи у сантехника' },
  'noise before access description'
);
eq(
  parseTranscript('привет сегодня домофон 45К'),
  { zone: '', address: '', code: 'домофон 45К' },
  'greeting before access description'
);

console.log('\nparseTranscript (spoken punctuation):');
eq(
  parseTranscript('адрес Парковая запятая 107 код 2580'),
  { zone: '', address: 'Парковая, 107', code: '2580' },
  'spoken comma'
);

console.log('\nparseTranscript (UK):');
eq(
  parseTranscript('вулиця Паркова сто сім код дві тисячі пʼятсот вісімдесят'),
  { zone: '', address: 'Паркова, 107', code: '2580' },
  'UK: street + code'
);

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
