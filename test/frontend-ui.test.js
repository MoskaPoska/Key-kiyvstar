const test = require('node:test');
const assert = require('node:assert/strict');
const {
  FakeDocument,
  appendElement,
  createBrowserContext,
  loadBrowserScript,
} = require('./helpers/fake-dom');

function createBaseGlobals(overrides = {}) {
  return {
    alert: () => {},
    confirm: () => true,
    prompt: () => null,
    ...overrides,
  };
}

test('HistoryUI renders, filters, and toggles history safely', () => {
  const document = new FakeDocument();
  const historySection = appendElement(document, 'section', 'history-section');
  historySection.style.display = 'none';
  const historyList = appendElement(document, 'div', 'history-list');
  const toggleHistoryBtn = appendElement(document, 'button', 'toggle-history-btn');
  const toggleHistoryHideBtn = appendElement(document, 'button', 'toggle-history');
  const historyPersonFilter = appendElement(document, 'select', 'history-person-filter');
  const historyBundleFilter = appendElement(document, 'input', 'history-bundle-filter');

  const history = [
    { personName: 'Alice', bundleId: 'zone_1_1001', action: 'take', timestamp: '2026-04-01T10:00:00Z' },
    { personName: 'Bob', bundleId: 'zone_2_2002', action: 'return', timestamp: '2026-04-01T12:00:00Z' },
  ];

  let filterPerson = '';
  let filterBundle = '';

  const context = createBrowserContext(document, createBaseGlobals());
  loadBrowserScript('public/js/history/ui.js', context);

  const ui = context.window.HistoryUI.init({
    escapeHtml: (value) => String(value),
    getHistory: () => history,
    getHistoryFilterPerson: () => filterPerson,
    setHistoryFilterPerson: (value) => {
      filterPerson = value;
    },
    getHistoryFilterBundle: () => filterBundle,
    setHistoryFilterBundle: (value) => {
      filterBundle = value;
    },
  });

  const liveToggleHistoryBtn = document.getElementById('toggle-history-btn');
  const liveToggleHistoryHideBtn = document.getElementById('toggle-history');
  const liveHistoryPersonFilter = document.getElementById('history-person-filter');
  const liveHistoryBundleFilter = document.getElementById('history-bundle-filter');

  ui.updateHistoryPersonFilter();
  assert.equal(liveHistoryPersonFilter.children.length, 3);

  ui.renderHistory();
  assert.equal(historyList.children.length, 2);
  assert.match(historyList.children[0].textContent, /Bob/);

  liveHistoryBundleFilter.value = '2002';
  liveHistoryBundleFilter.dispatchEvent({ type: 'input' });
  assert.equal(filterBundle, '2002');
  assert.equal(historyList.children.length, 1);

  liveToggleHistoryBtn.click();
  assert.equal(historySection.style.display, 'block');
  assert.equal(liveToggleHistoryBtn.classList.contains('active'), true);

  liveToggleHistoryHideBtn.click();
  assert.equal(historySection.style.display, 'none');
  assert.equal(liveToggleHistoryBtn.classList.contains('active'), false);
});

test('KeysUI covers empty state, selected bundles, people list, and view panel', () => {
  const document = new FakeDocument();
  const bundleList = appendElement(document, 'div', 'bundle-list');
  const selectedBundles = appendElement(document, 'div', 'selected-bundles');
  const selectedBundlesList = document.createElement('div');
  selectedBundlesList.className = 'selected-bundles__list';
  selectedBundles.appendChild(selectedBundlesList);

  const peopleSection = appendElement(document, 'section', 'people-section');
  const peopleList = appendElement(document, 'div', 'people-list');
  const viewPanel = appendElement(document, 'div', 'view-panel');
  const viewPersonName = appendElement(document, 'h3', 'view-person-name');
  const viewPersonPhone = appendElement(document, 'a', 'view-person-phone');
  const viewKeysInfo = appendElement(document, 'div', 'view-keys-info');
  const viewBundles = appendElement(document, 'div', 'view-bundles');
  const viewButtons = appendElement(document, 'div', 'view-buttons');

  let selectedPerson = 'Alice';
  let searchQuery = 'zzz';
  const selectedBundleIds = new Set(['zone_1_101-1010']);
  let selectedReturnBundleIds = new Set();
  const returnCalls = [];

  const zones = [
    { id: 'zone_1', name: 'Zone 1', bundles: ['101-1010', '102-1020'] },
    { id: 'zone_2', name: 'Zone 2', bundles: ['201-2010'] },
  ];
  const people = [
    { id: 1, name: 'Alice', phone: '+380111111111' },
    { id: 2, name: 'Bob', phone: '' },
  ];
  const state = {
    'zone_1_101-1010': { personName: 'Alice', takenAt: 1710000000000, comment: '' },
    'zone_1_102-1020': { personName: 'Bob', takenAt: 1710003600000, comment: 'check' },
  };

  const context = createBrowserContext(document, createBaseGlobals());
  loadBrowserScript('public/js/keys/ui.js', context);

  const ui = context.window.KeysUI.init({
    escapeHtml: (value) => String(value),
    getZones: () => zones,
    getState: () => state,
    getPeople: () => people,
    getSelectedPerson: () => selectedPerson,
    setSelectedPerson: (value) => {
      selectedPerson = value;
    },
    getSelectedBundleIds: () => selectedBundleIds,
    getSelectedReturnBundleIds: () => selectedReturnBundleIds,
    setSelectedReturnBundleIds: (value) => {
      selectedReturnBundleIds = value;
    },
    getBundleSearchQuery: () => searchQuery,
    getZoneValue: () => '',
    getBundleId: (zoneId, range) => `${zoneId}_${range}`,
    isAdmin: () => false,
    updatePerson: async () => {},
    returnKeys: async (bundleIds) => {
      returnCalls.push(bundleIds);
    },
    updateAdminMode: () => {},
    formatTime: () => 'formatted',
  });

  ui.updateSelectedBundlesDisplay();
  assert.equal(selectedBundles.classList.contains('selected-bundles--visible'), true);
  assert.equal(selectedBundlesList.children.length, 1);
  selectedBundlesList.querySelector('.selected-bundles__remove').click();
  assert.equal(selectedBundleIds.size, 0);
  assert.equal(selectedBundles.classList.contains('selected-bundles--visible'), false);

  ui.renderBundleSelect();
  assert.equal(bundleList.children.length, 1);
  assert.equal(bundleList.children[0].className, 'bundle-empty');

  searchQuery = '';
  ui.renderBundleSelect();
  const firstCheckbox = bundleList.querySelector('input');
  firstCheckbox.checked = true;
  firstCheckbox.dispatchEvent({ type: 'change' });
  assert.equal(selectedBundleIds.has('zone_1_101-1010'), true);

  ui.renderPeople();
  assert.equal(peopleSection.style.display, '');
  assert.equal(peopleList.children.length, 2);

  ui.renderViewPanel();
  assert.equal(viewPanel.style.display, '');
  assert.equal(viewBundles.children.length, 1);
  assert.equal(viewButtons.children.length, 3);

  viewButtons.children[2].click();
  assert.equal(selectedPerson, null);
  assert.equal(returnCalls.length, 0);

  void viewPersonName;
  void viewPersonPhone;
  void viewKeysInfo;
});

test('KeysUI bundle search respects explicit zone prefix', () => {
  const document = new FakeDocument();
  const bundleList = appendElement(document, 'div', 'bundle-list');
  appendElement(document, 'div', 'selected-bundles');
  appendElement(document, 'section', 'people-section');
  appendElement(document, 'div', 'people-list');
  appendElement(document, 'div', 'view-panel');
  appendElement(document, 'h3', 'view-person-name');
  appendElement(document, 'a', 'view-person-phone');
  appendElement(document, 'div', 'view-keys-info');
  appendElement(document, 'div', 'view-bundles');
  appendElement(document, 'div', 'view-buttons');

  let searchQuery = '1_101';
  const selectedBundleIds = new Set();
  let selectedReturnBundleIds = new Set();

  const zones = [
    { id: 'zone_1', name: 'Zone 1', bundles: ['101-1010', '121-1211', '181-1812', '191-1912', '202-2020'] },
    { id: 'zone_4', name: 'Zone 4', bundles: ['101-1010'] },
  ];

  const context = createBrowserContext(document, createBaseGlobals());
  loadBrowserScript('public/js/keys/ui.js', context);

  const ui = context.window.KeysUI.init({
    escapeHtml: (value) => String(value),
    getZones: () => zones,
    getState: () => ({}),
    getPeople: () => [],
    getSelectedPerson: () => null,
    setSelectedPerson: () => {},
    getSelectedBundleIds: () => selectedBundleIds,
    getSelectedReturnBundleIds: () => selectedReturnBundleIds,
    setSelectedReturnBundleIds: (value) => {
      selectedReturnBundleIds = value;
    },
    getBundleSearchQuery: () => searchQuery,
    getZoneValue: () => '',
    getBundleId: (zoneId, range) => `${zoneId}_${range}`,
    isAdmin: () => false,
    updatePerson: async () => {},
    returnKeys: async () => {},
    updateAdminMode: () => {},
    formatTime: () => 'formatted',
  });

  ui.renderBundleSelect();
  assert.equal(bundleList.children.length, 1);
  assert.match(bundleList.textContent, /Zone 1/);
  assert.doesNotMatch(bundleList.textContent, /Zone 4/);

  searchQuery = '1_';
  ui.renderBundleSelect();
  assert.equal(bundleList.children.length, 5);
  assert.match(bundleList.textContent, /Zone 1/);
  assert.doesNotMatch(bundleList.textContent, /Zone 4/);

  searchQuery = '1_12';
  ui.renderBundleSelect();
  assert.equal(bundleList.children.length, 1);
  assert.match(bundleList.textContent, /121-1211/);
  assert.doesNotMatch(bundleList.textContent, /181-1812/);
  assert.doesNotMatch(bundleList.textContent, /191-1912/);

  searchQuery = '1_125';
  ui.renderBundleSelect();
  assert.equal(bundleList.children.length, 1);
  assert.match(bundleList.textContent, /121-1211/);

  searchQuery = '1_10210';
  ui.renderBundleSelect();
  assert.equal(bundleList.children.length, 1);
  assert.match(bundleList.textContent, /121-1211/);

  searchQuery = '1_1214231123131';
  ui.renderBundleSelect();
  assert.equal(bundleList.children.length, 1);
  assert.equal(bundleList.children[0].className, 'bundle-empty');

  searchQuery = '1-101';
  ui.renderBundleSelect();
  assert.equal(bundleList.children.length, 1);
  assert.match(bundleList.textContent, /Zone 1/);
  assert.doesNotMatch(bundleList.textContent, /Zone 4/);
});

test('AuthPeopleUI updates login screen and user management modal behavior', () => {
  const document = new FakeDocument();
  const loginScreen = appendElement(document, 'div', 'login-screen');
  const btnLogin = appendElement(document, 'button', 'btn-login');
  const btnLogout = appendElement(document, 'button', 'btn-logout');
  const loginName = appendElement(document, 'input', 'login-name');
  const loginPassword = appendElement(document, 'input', 'login-password');
  const peopleModal = appendElement(document, 'div', 'people-modal');
  const btnManagePeople = appendElement(document, 'button', 'btn-manage-people');
  appendElement(document, 'button', 'close-people-modal');
  appendElement(document, 'input', 'new-person-name');
  appendElement(document, 'input', 'new-person-phone');
  appendElement(document, 'input', 'new-person-password');
  appendElement(document, 'select', 'new-person-role');
  appendElement(document, 'button', 'btn-add-person');
  const peopleManageList = appendElement(document, 'div', 'people-manage-list');
  const personName = appendElement(document, 'select', 'person-name');
  const passwordModal = appendElement(document, 'div', 'password-modal');
  appendElement(document, 'button', 'close-password-modal');
  appendElement(document, 'div', 'password-modal-current');
  appendElement(document, 'input', 'password-modal-new');
  appendElement(document, 'button', 'password-modal-cancel');
  appendElement(document, 'button', 'password-modal-save');
  appendElement(document, 'div', 'edit-person-modal');
  appendElement(document, 'button', 'close-edit-person-modal');
  appendElement(document, 'input', 'edit-person-modal-name');
  appendElement(document, 'input', 'edit-person-modal-phone');
  appendElement(document, 'input', 'edit-person-modal-role');
  appendElement(document, 'button', 'edit-person-modal-cancel');
  appendElement(document, 'button', 'edit-person-modal-save');

  let currentUser = null;
  let isAdminMode = false;
  const people = [
    { id: 1, name: 'Alice', phone: '+380111111111', isAdmin: false },
    { id: 2, name: 'Bob', phone: '+380222222222', isAdmin: true },
  ];

  const context = createBrowserContext(document, createBaseGlobals());
  loadBrowserScript('public/js/auth-people/ui.js', context);

  const ui = context.window.AuthPeopleUI.init({
    escapeHtml: (value) => String(value),
    getPeople: () => people,
    getCurrentUser: () => currentUser,
    isAdmin: () => isAdminMode,
    login: async () => true,
    logout: () => {},
    addPerson: async () => {},
    updatePerson: async () => {},
    deletePerson: async () => {},
    changePassword: async () => {},
    onAfterLogin: async () => {},
    renderViewPanel: () => {},
  });

  const liveBtnManagePeople = document.getElementById('btn-manage-people');

  ui.updateUI();
  assert.equal(loginScreen.style.display, 'flex');

  currentUser = { id: 10, name: 'Alice', role: 'USER' };
  ui.updateUI();
  assert.equal(loginScreen.style.display, 'none');

  ui.renderPeopleSelect();
  assert.equal(personName.children.length, 2);
  assert.equal(personName.children[1].value, 'Alice');

  isAdminMode = true;
  currentUser = { id: 11, name: 'Admin', role: 'ADMIN' };
  ui.renderPeopleManageList();
  assert.equal(peopleManageList.querySelectorAll('.btn-change-password').length, 2);

  liveBtnManagePeople.click();
  assert.equal(peopleModal.style.display, 'flex');

  const changePasswordButton = peopleManageList.querySelector('.btn-change-password');
  changePasswordButton.click();
  assert.equal(passwordModal.style.display, 'flex');

  void btnLogin;
  void btnLogout;
  void loginName;
  void loginPassword;
});

test('ZoneAccessSearch matches top-level access codes', () => {
  const document = new FakeDocument();
  const originalCreateElement = document.createElement.bind(document);
  document.createElement = (tagName) => {
    const element = originalCreateElement(tagName);
    element.getBoundingClientRect = () => ({ width: 80 });
    return element;
  };
  const searchInput = appendElement(document, 'input', 'access-address-search');
  const resultsEl = appendElement(document, 'div', 'access-address-search-results');

  let selectedZone = null;
  let openedZone = false;

  const context = createBrowserContext(document, createBaseGlobals({
    getComputedStyle: () => ({ font: '16px sans-serif', letterSpacing: '0px' }),
  }));
  loadBrowserScript('public/js/zone-access/search.js', context);

  const ui = context.window.ZoneAccessSearch.init({
    searchInput,
    resultsEl,
    zoneAccessData: {
      7: [
        { address: 'Parkova, 107', code: '2580', tkdEntries: [] },
      ],
    },
    formatAddress: (value) => value,
    formatTkdLineHtml: () => '',
    escapeHtml: (value) => String(value),
    getZoneDisplayName: (value) => `Зона ${value}`,
    setCurrentZoneNum: (value) => {
      selectedZone = value;
    },
    showZoneAccessView: () => {
      openedZone = true;
    },
  });

  searchInput.value = '2580';
  searchInput.dispatchEvent({ type: 'input' });

  assert.equal(resultsEl.children.length, 1);
  assert.match(resultsEl.textContent, /2580/);

  resultsEl.children[0].click();
  assert.equal(selectedZone, 7);
  assert.equal(openedZone, true);
  assert.equal(searchInput.value, '');

  void ui;
});

test('VoiceInput exposes stable AI confidence threshold behavior', () => {
  const document = new FakeDocument();
  document.documentElement = document.createElement('html');

  const context = createBrowserContext(document, createBaseGlobals({
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
  }));

  loadBrowserScript('public/js/voice/voice-input.js', context);

  const VoiceInput = context.window.VoiceInput;
  const parsed = VoiceInput.normalizeParsedParts({
    address: 'Тестовая 15',
    code: '',
    zone: '',
    confidence: 42,
  });

  assert.equal(VoiceInput.getAiConfidenceThreshold({ aiConfidenceThreshold: 70 }), 70);
  assert.equal(VoiceInput.getAiConfidenceThreshold({ aiConfidenceThreshold: 135 }), 100);
  assert.equal(VoiceInput.getAiConfidenceThreshold({ aiConfidenceThreshold: -5 }), 0);
  assert.equal(VoiceInput.hasRecognizedFields(parsed), true);
  assert.equal(VoiceInput.shouldUseAiFallback({ zone: '', address: '', code: '' }, 'шумный ввод', {
    aiParse: async () => ({}),
    fields: { address: {} },
  }), true);
  assert.equal(parsed.confidence < VoiceInput.getAiConfidenceThreshold({ aiConfidenceThreshold: 70 }), true);
});
