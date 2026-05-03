const fs = require('fs');

const filePath = 'public/app.js';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Добавляем декларации переменных после "const toggleHistoryBtn = document.getElementById('toggle-history-btn');"
const varDeclarations = `
// Modal for adding address to any zone
const addAddressModal = document.getElementById('add-address-modal');
const btnAddAddressAllZones = document.getElementById('btn-add-address-all-zones');
const closeAddAddressModal = document.getElementById('close-add-address-modal');
const modalAddZone = document.getElementById('modal-add-zone');
const modalAddCancel = document.getElementById('modal-add-cancel');
const modalAddConfirm = document.getElementById('modal-add-confirm');

// Voice input for address modal and edit form
const voiceInputBtnModal = document.getElementById('voice-input-btn');
const modalAddAddress = document.getElementById('modal-add-address');
const modalAddCode = document.getElementById('modal-add-code');

const voiceInputBtnEdit = document.getElementById('voice-input-edit-address');
const editFormAddress = document.getElementById('access-form-address');
const editFormCode = document.getElementById('access-form-code');
`;

const targetVar = "const toggleHistoryBtn = document.getElementById('toggle-history-btn');";
if (content.includes(targetVar) && !content.includes('const addAddressModal')) {
  content = content.replace(targetVar, targetVar + varDeclarations);
  console.log('1. Added variable declarations');
} else if (!content.includes('const addAddressModal')) {
  console.log('1. ERROR: Could not find toggleHistoryBtn!');
} else {
  console.log('1. Variables already exist');
}

// 2. Добавляем populateModalZoneSelect перед "function renderZoneSelect()"
const populateModalFunc = `
function populateModalZoneSelect() {
  const modalZoneSelect = document.getElementById('modal-add-zone');
  if (!modalZoneSelect) return;
  modalZoneSelect.innerHTML = '<option value="">\\u2014 \\u0417\\u043E\\u043D\\u0430 \\u2014</option>';
  getZonesSorted().forEach((z) => {
    const opt = document.createElement('option');
    opt.value = z.id;
    opt.textContent = z.name;
    modalZoneSelect.appendChild(opt);
  });
}


`;

const targetFunc = 'function renderZoneSelect() {';
if (!content.includes('function populateModalZoneSelect()')) {
  content = content.replace(targetFunc, populateModalFunc + targetFunc);
  console.log('2. Added populateModalZoneSelect function');
} else {
  console.log('2. populateModalZoneSelect already exists');
}

// 3. Добавляем логику модального окна и микрофонов перед "  // Инициализация"
const modalAndMicCode = `
  // Initialize modal zone select
  populateModalZoneSelect();

  if (btnAddAddressAllZones) {
    btnAddAddressAllZones.addEventListener('click', () => {
      modalAddZone.value = '';
      modalAddAddress.value = '';
      modalAddCode.value = '';
      addAddressModal.style.display = '';
    });
  }

  if (closeAddAddressModal) {
    closeAddAddressModal.addEventListener('click', () => {
      addAddressModal.style.display = 'none';
    });
  }

  if (modalAddCancel) {
    modalAddCancel.addEventListener('click', () => {
      addAddressModal.style.display = 'none';
    });
  }

  if (modalAddConfirm) {
    modalAddConfirm.addEventListener('click', () => {
      const zoneNum = modalAddZone.value;
      const address = modalAddAddress.value.trim();
      const code = modalAddCode.value.trim();

      if (!zoneNum) {
        alert('\\u0412\\u044B\\u0431\\u0435\\u0440\\u0438 \\u0437\\u043E\\u043D\\u0443');
        return;
      }

      if (!address) {
        alert('\\u0412\\u0432\\u0435\\u0434\\u0438 \\u0430\\u0434\\u0440\\u0435\\u0441');
        return;
      }

      if (!zoneAccessData[zoneNum]) {
        zoneAccessData[zoneNum] = [];
      }

      zoneAccessData[zoneNum].push({
        address: address,
        code: code || '',
        tkdEntries: []
      });

      saveZoneAccessData();
      alert('\\u0410\\u0434\\u0440\\u0435\\u0441 \\u0434\\u043E\\u0431\\u0430\\u0432\\u043B\\u0435\\u043D');
      addAddressModal.style.display = 'none';
    });
  }

  if (addAddressModal) {
    addAddressModal.addEventListener('click', (e) => {
      if (e.target === addAddressModal) {
        addAddressModal.style.display = 'none';
      }
    });
  }

  // Check if speech recognition is available
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition && voiceInputBtnModal && voiceInputBtnEdit) {
    const rootStyle = getComputedStyle(document.documentElement);
    const accentColor = rootStyle.getPropertyValue('--accent').trim();
    const mutedColor = rootStyle.getPropertyValue('--text-muted').trim();

    // --- Modal voice input (add address modal) - ISOLATED instance ---
    const recognitionModal = new SpeechRecognition();
    recognitionModal.lang = 'ru-RU';
    recognitionModal.interimResults = false;
    recognitionModal.maxAlternatives = 1;

    voiceInputBtnModal.addEventListener('click', () => {
      if (addAddressModal.style.display === 'block' || addAddressModal.style.display === '') {
        recognitionModal.start();
        voiceInputBtnModal.style.color = accentColor;
      }
    });

    recognitionModal.addEventListener('result', (event) => {
      const transcript = event.results[0][0].transcript.trim();
      if (transcript) {
        const codeMatch = transcript.match(/\\b\\d{4}\\b/);
        let address = transcript;
        let code = '';

        if (codeMatch) {
          code = codeMatch[0];
          address = transcript.replace(codeMatch[0], '').trim();
          address = address.replace(/[,\\s]+$/g, '').trim();
        }

        modalAddAddress.value = address;
        modalAddCode.value = code;
      }
      voiceInputBtnModal.style.color = mutedColor;
    });

    recognitionModal.addEventListener('end', () => {
      voiceInputBtnModal.style.color = mutedColor;
    });

    recognitionModal.addEventListener('error', (event) => {
      console.error('Speech recognition error (modal):', event.error);
      voiceInputBtnModal.style.color = mutedColor;
    });

    // --- Edit form voice input (zone edit form) - ISOLATED instance ---
    const recognitionEdit = new SpeechRecognition();
    recognitionEdit.lang = 'ru-RU';
    recognitionEdit.interimResults = false;
    recognitionEdit.maxAlternatives = 1;

    voiceInputBtnEdit.addEventListener('click', () => {
      const editForm = document.getElementById('zone-edit-form');
      if (editForm && (editForm.style.display === 'flex' || editForm.style.display === 'block' || editForm.style.display === '')) {
        recognitionEdit.start();
        voiceInputBtnEdit.style.color = accentColor;
      }
    });

    recognitionEdit.addEventListener('result', (event) => {
      const transcript = event.results[0][0].transcript.trim();
      if (transcript) {
        const codeMatch = transcript.match(/\\b\\d{4}\\b/);
        let address = transcript;
        let code = '';

        if (codeMatch) {
          code = codeMatch[0];
          address = transcript.replace(codeMatch[0], '').trim();
          address = address.replace(/[,\\s]+$/g, '').trim();
        }

        editFormAddress.value = address;
        editFormCode.value = code;
      }
      voiceInputBtnEdit.style.color = mutedColor;
    });

    recognitionEdit.addEventListener('end', () => {
      voiceInputBtnEdit.style.color = mutedColor;
    });

    recognitionEdit.addEventListener('error', (event) => {
      console.error('Speech recognition error (edit):', event.error);
      voiceInputBtnEdit.style.color = mutedColor;
    });
  } else {
    if (voiceInputBtnModal) voiceInputBtnModal.style.display = 'none';
    if (voiceInputBtnEdit) voiceInputBtnEdit.style.display = 'none';
  }

`;

const targetInit = '  // Инициализация';
if (!content.includes('// --- Modal voice input')) {
  content = content.replace(targetInit, modalAndMicCode + '\n' + targetInit);
  console.log('3. Added modal and mic code');
} else {
  console.log('3. Modal and mic code already exists');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done! File updated successfully.');

// Verify syntax
try {
  require('fs').readFileSync(filePath, 'utf8');
  console.log('File read successfully');
} catch(e) {
  console.error('Error:', e);
}