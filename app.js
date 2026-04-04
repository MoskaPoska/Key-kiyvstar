(function () {
  'use strict';
  const API_BASE = '';

  const btnLogin = document.getElementById('btn-login'); // Кнопка "Войти" в форме
  const btnLogout = document.getElementById('btn-logout'); // Кнопка "Выйти" в шапке (если добавишь)
  const loginScreen = document.getElementById('login-screen'); // Оверлей входа
  const loginNameInput = document.getElementById('login-name');
  const loginPasswordInput = document.getElementById('login-password');
  
  const keySearch = document.getElementById('key-search');
  const btnSearch = document.getElementById('btn-search');
  const searchResults = document.getElementById('search-results');
  const zoneSelect = document.getElementById('zone-select');
  const bundleList = document.getElementById('bundle-list');
  const personNameSelect = document.getElementById('person-name');
  const btnTake = document.getElementById('btn-take');
  const selectedBundlesList = document.getElementById('selected-bundles');
  const historySection = document.getElementById('history-section');
  const toggleHistoryBtn = document.getElementById('toggle-history-btn');

  // Current logged in user
  let currentUser = null;
  // Не зберігаємо токен в localStorage - потрібно входити при кожному оновленні
  let authToken = null;
  let zones = [];
  let state = {};
  let people = [];
  let history = [];
  const selectedBundleIds = new Set();

  async function login(name, password) {
    try {
      const res = await fetch(API_BASE + '/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Ошибка входа');
        return false;
      }
      authToken = data.token;
      currentUser = data.user;
      // Не зберігаємо токен в localStorage - потрібно входити при кожному оновленні
      updateUI();
      return true;
    } catch (e) {
      console.error('Login error:', e);
      alert('Ошибка соединения с сервером');
      return false;
    }
  }

  function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    updateUI();
    location.reload(); // Перезагрузка для очистки состояния
  }

  // checkAuth теперь вызывается только при необходимости
  async function checkAuth() {
    if (!authToken) {
      updateUI();
      return;
    }
    try {
      const res = await fetch(API_BASE + '/api/whoami', {
        headers: { 'Authorization': 'Bearer ' + authToken },
      });
      if (!res.ok) throw new Error();
      currentUser = await res.json();
      updateUI();
    } catch (e) {
      logout();
    }
  }
function updateUI() {
    if (!loginScreen) return;
    
    // Если пользователь вошел - скрываем экран входа
    if (currentUser) {
      if (loginScreen.style.display !== 'none') {
        loginScreen.style.display = 'none';
      }
    } else {
      // Если не вошел — показываем экран логина
      if (loginScreen.style.display !== 'flex') {
        loginScreen.style.display = 'flex';
      }
    }
  }
  if (btnLogin) {
    btnLogin.addEventListener('click', async () => {
      const name = loginNameInput.value.trim();
      const password = loginPasswordInput.value;

      if (!name || !password) {
        alert('Заполните все поля');
        return;
      }

      const success = await login(name, password);
      if (success) {
        console.log('Авторизация успешна');
        load(); // Загружаем данные после входа
        renderPeopleSelect(); // Обновляем список сотрудников с учетом текущего пользователя
      }
    });
  }

  // Позволяем входить по нажатию Enter в поле пароля
  if (loginPasswordInput) {
    loginPasswordInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') btnLogin.click();
    });
  }
  // Функция проверки - является ли выбранный сотрудник админом
  function isAdmin() {
    return currentUser && currentUser.role === 'ADMIN';
  }

  // Обновить класс body для отображения админ-элементов
  function updateAdminMode() {
    if (isAdmin()) {
      document.body.classList.add('admin-mode');
    } else {
      document.body.classList.remove('admin-mode');
    }
  }

  // Дані приходять з сервера: список зон і поточний стан
  
  // Auth state
  
  // SSE for real-time updates
  let eventSource = null;

  function connectSSE() {
    const eventSource = new EventSource(API_BASE + '/api/events');
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      zones = data.zones || [];
      state = data.state || {};
      render();
    };
  }

  // Подключаем SSE при загрузке
  connectSSE();

  // Auth functions


  function getBundleId(zoneId, tkdRange) {
    return zoneId + '_' + tkdRange;
  }

  function getZoneOrderNumber(name) {
    const match = name.match(/\d+/);
    return match ? parseInt(match[0], 10) : 999;
  }

  function getZonesSorted() {
    return [...zones].sort((a, b) => {
      const numA = getZoneOrderNumber(a.name);
      const numB = getZoneOrderNumber(b.name);
      if (numA !== numB) return numA - numB;
      return a.name.localeCompare(b.name, 'uk', { numeric: true });
    });
  }

  async function load() {
    // Проверяем авторизацию перед загрузкой данных
    if (!authToken) {
      updateUI();
      return;
    }
    
    // Проверяем валидность токена
    try {
      const res = await fetch(API_BASE + '/api/whoami', {
        headers: { 'Authorization': 'Bearer ' + authToken },
      });
      if (!res.ok) {
        logout();
        return;
      }
      currentUser = await res.json();
    } catch (e) {
      logout();
      return;
    }

    // Скрываем экран входа если пользователь авторизован
    updateUI();

    try {
      const res = await fetch(API_BASE + '/api/state');
      const data = await res.json();
      zones = data.zones || [];
      state = data.state || {};
      
      // Загрузка людей и истории
      const pRes = await fetch(API_BASE + '/api/people');
      people = await pRes.json();
      
      // Загружаем историю
      try {
        const hRes = await fetch(API_BASE + '/api/history');
        if (hRes.ok) {
          history = await hRes.json();
        }
      } catch (he) {
        console.error('History load error', he);
        history = [];
      }
      
      render();
      renderPeopleSelect(); // Обновляем список сотрудников после загрузки данных
    } catch (e) {
      console.error('Data load error', e);
    }
  }

  async function loadHistory() {
    try {
      const res = await fetch(API_BASE + '/api/history');
      if (!res.ok) throw new Error('Failed to load history');
      history = await res.json();
      renderHistory();
    } catch (e) {
      console.error('Ошибка загрузки истории', e);
      history = [];
    }
  }

  async function loadPeople() {
    try {
      const res = await fetch(API_BASE + '/api/people');
      if (!res.ok) throw new Error('Failed to load people');
      people = await res.json();
      renderPeopleSelect();
      updateAdminMode();
    } catch (e) {
      console.error('Ошибка загрузки людей', e);
      people = [];
    }
  }

  async function takeKey(bundleId, personName, reload = true, quiet = false) {
    const name = (personName || '').trim();
    if (!bundleId || !name) return;
    try {
      const res = await fetch(API_BASE + '/api/take', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bundleId, personName: name }),
      });
      if (!res.ok) throw new Error('Failed take');
      if (reload) await load();
    } catch (e) {
      console.error('Ошибка "взять"', e);
      if (!quiet) {
        alert('Не удалось сохранить на сервере. Попробуй еще раз.');
      }
      throw e;
    }
  }

  function getSelectedBundleIds() {
    return Array.from(selectedBundleIds);
  }

  async function takeKeys(bundleIds, personName) {
    if (!bundleIds || !bundleIds.length) return;
    const name = (personName || '').trim();
    if (!name) return;

    const promises = bundleIds.map((bundleId) => takeKey(bundleId, name, false, true));
    const results = await Promise.allSettled(promises);

    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length) {
      console.error('Ошибка при взятии связки', failed);
      alert('Некоторые связки не удалось взять. Попробуй еще раз.');
    }

    // Удаляем успешно взятые связки из выбора
    results.forEach((r, idx) => {
      if (r.status === 'fulfilled') {
        selectedBundleIds.delete(bundleIds[idx]);
      }
    });

    updateSelectedBundlesDisplay();
    await load();
  }

  async function returnKeys(bundleIds) {
    if (!bundleIds || !bundleIds.length) return;

    const promises = bundleIds.map((bundleId) => returnKey(bundleId, false, true));
    const results = await Promise.allSettled(promises);

    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length) {
      console.error('Ошибка при возврате связок', failed);
      alert('Некоторые связки не удалось вернуть. Попробуй еще раз.');
    }

    // Удаляем успешно возвращенные связки из выбора
    results.forEach((r, idx) => {
      if (r.status === 'fulfilled') {
        selectedBundleIds.delete(bundleIds[idx]);
      }
    });

    updateSelectedBundlesDisplay();
    await load();
  }

  async function returnKey(bundleId, reload = true, quiet = false) {
    if (!bundleId) return;
    try {
      const res = await fetch(API_BASE + '/api/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bundleId }),
      });
      if (!res.ok) throw new Error('Failed return');
      if (reload) await load();
    } catch (e) {
      console.error('Ошибка "вернуть"', e);
      if (!quiet) {
        alert('Не удалось сохранить на сервере. Попробуй еще раз.');
      }
      throw e;
    }
  }

  async function saveComment(bundleId, comment) {
    if (!bundleId) return;
    try {
      const res = await fetch(API_BASE + '/api/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bundleId, comment }),
      });
      if (!res.ok) throw new Error('Failed to save comment');
      await load();
    } catch (e) {
      console.error('Ошибка сохранения комментария', e);
      alert('Не удалось сохранить комментарий на сервере.');
    }
  }

  async function addPerson(name, phone, isAdminValue = false, password = null) {
    const n = (name || '').trim();
    const p = (phone || '').trim();
    const pw = password || '';
    if (!n) return;
    try {
      console.log('Adding person:', n, 'with token:', authToken ? authToken.substring(0, 20) + '...' : 'none');
      const res = await fetch(API_BASE + '/api/people/add', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + authToken
        },
        body: JSON.stringify({ name: n, phone: p, isAdmin: isAdminValue, password: pw }),
      });
      const data = await res.json();
      console.log('Response status:', res.status, 'Response data:', data);
      if (!res.ok) {
        alert(data.error || 'Не удалось добавить сотрудника');
        return;
      }
      // Show success message
      alert(`Сотрудник создан!\n\nЛогин: ${n}\n\nРоль: ${isAdminValue ? 'ADMIN' : 'USER'}\n\nПароль: ${pw}`);
      await loadPeople();
      renderPeopleManageList();
    } catch (e) {
      console.error('Ошибка добавления сотрудника', e);
      alert('Не удалось добавить сотрудника: ' + e.message);
    }
  }

  async function updatePerson(id, name, phone, isAdminValue) {
    const n = (name || '').trim();
    const p = (phone || '').trim();
    if (!n) return;
    try {
      const res = await fetch(API_BASE + '/api/people/update', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + authToken
        },
        body: JSON.stringify({ id, name: n, phone: p, isAdmin: isAdminValue || false }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Не удалось обновить сотрудника');
        return;
      }
      await loadPeople();
      renderPeopleManageList();
      renderViewPanel();
    } catch (e) {
      console.error('Ошибка обновления сотрудника', e);
      alert('Не удалось обновить сотрудника.');
    }
  }

  async function deletePerson(id) {
    try {
      const res = await fetch(API_BASE + '/api/people/delete', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + authToken
        },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Не удалось удалить сотрудника');
        return;
      }
      await loadPeople();
      renderPeopleManageList();
    } catch (e) {
      console.error('Ошибка удаления сотрудника', e);
      alert('Не удалось удалить сотрудника.');
    }
  }

  async function changePassword(id, newPassword) {
    if (!newPassword || newPassword.length < 4) {
      alert('Пароль должен быть не менее 4 символов');
      return;
    }
    try {
      const res = await fetch(API_BASE + '/api/change-password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + authToken
        },
        body: JSON.stringify({ id, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Не удалось изменить пароль');
        return;
      }
      alert('Пароль успешно изменен');
    } catch (e) {
      console.error('Ошибка изменения пароля', e);
      alert('Не удалось изменить пароль.');
    }
  }

  async function getPersonPassword(id) {
    try {
      const res = await fetch(API_BASE + '/api/people/' + id + '/password', {
        headers: { 
          'Authorization': 'Bearer ' + authToken
        },
      });
      if (!res.ok) throw new Error('Failed to get password');
      const data = await res.json();
      return data.password;
    } catch (e) {
      console.error('Ошибка получения пароля', e);
      return null;
    }
  }

  function getAllBundles() {
    const list = [];
    getZonesSorted().forEach((z) => {
      z.bundles.forEach((range) => {
        list.push({ zoneId: z.id, zoneName: z.name, tkdRange: range, bundleId: getBundleId(z.id, range) });
      });
    });
    return list;
  }

  // DOM
  //const keySearch = document.getElementById('key-search');
  //const btnSearch = document.getElementById('btn-search');
  //const searchResults = document.getElementById('search-results');
  const bundleSearch = document.getElementById('bundle-search');
  //const zoneSelect = document.getElementById('zone-select');
  //const bundleList = document.getElementById('bundle-list');
  const quickBundleSelect = document.getElementById('quick-bundle-select');
  const btnQuickSelect = document.getElementById('btn-quick-select');
  const personName = document.getElementById('person-name');
  //const btnTake = document.getElementById('btn-take');
  const peopleList = document.getElementById('people-list');
  const peopleSection = document.getElementById('people-section');
  const viewPanel = document.getElementById('view-panel');
  const viewPersonName = document.getElementById('view-person-name');
  const viewPersonPhone = document.getElementById('view-person-phone');
  const viewKeysInfo = document.getElementById('view-keys-info');
  const viewBundles = document.getElementById('view-bundles');
  const viewButtons = document.getElementById('view-buttons');
  
  // People modal elements
  const peopleModal = document.getElementById('people-modal');
  const btnManagePeople = document.getElementById('btn-manage-people');
  const closePeopleModal = document.getElementById('close-people-modal');
  const newPersonName = document.getElementById('new-person-name');
  const newPersonPhone = document.getElementById('new-person-phone');
  const newPersonPassword = document.getElementById('new-person-password');
  const newPersonRole = document.getElementById('new-person-role');
  const btnAddPerson = document.getElementById('btn-add-person');
  const peopleManageList = document.getElementById('people-manage-list');
  const historyList = document.getElementById('history-list');
  //const historySection = document.getElementById('history-section');
  //const toggleHistoryBtn = document.getElementById('toggle-history-btn');
  const toggleHistoryHideBtn = document.getElementById('toggle-history');
  const historyPersonFilter = document.getElementById('history-person-filter');

  let historyFilterPerson = '';
  let historyFilterBundle = '';
  let selectedPerson = null;
  let searchQuery = '';
  let bundleSearchQuery = '';

  // Текущий «корзина» выбранных связок (чтобы можно было выбрать из разных зон подряд)
  //const selectedBundleIds = new Set();
  //const selectedBundlesList = document.getElementById('selected-bundles');

  // Выбор связок для возврата в панели просмотра пользователя
  let selectedReturnBundleIds = new Set();

  function getPeopleWithKeys() {
    const set = new Set();
    Object.values(state).forEach((v) => {
      if (v && v.personName) set.add(v.personName);
    });
    return Array.from(set).sort();
  }

  function filterBundlesBySearch() {
    let list = getAllBundles();
    if (searchQuery) {
      const q = searchQuery.trim();
      const qLower = q.toLowerCase();

      // Check if search is a number (zone number)
      const isZoneNumber = /^\d+$/.test(q);

      list = list.filter((b) => {
        // Обычный поиск
        if (
          b.zoneName.toLowerCase().includes(qLower) ||
          b.tkdRange.toLowerCase().includes(qLower) ||
          b.bundleId.toLowerCase().includes(qLower)
        ) {
          return true;
        }
        // Специальный поиск по формату зона_связка, например 1_101-105
        if (/^\d+_[^\s]+$/.test(q)) {
          const expectedBundleId = 'zone_' + q;
          if (b.bundleId === expectedBundleId) {
            return true;
          }
        }
        return false;
      });

      // If searching by zone number, sort to show that zone first
      if (isZoneNumber) {
        list.sort((a, b) => {
          const aZoneNum = parseInt(a.zoneName.replace('Зона ', '')) || 0;
          const bZoneNum = parseInt(b.zoneName.replace('Зона ', '')) || 0;
          const searchNum = parseInt(q);

          // Exact zone match first
          if (aZoneNum === searchNum && bZoneNum !== searchNum) return -1;
          if (bZoneNum === searchNum && aZoneNum !== searchNum) return 1;

          // Then sort by zone number
          return aZoneNum - bZoneNum || a.tkdRange.localeCompare(b.tkdRange);
        });
      }
    }
    return list;
  }

  function formatTime(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    return d.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function updateSelectedBundlesDisplay() {
    if (!selectedBundlesList) return;
    const listEl = selectedBundlesList.querySelector('.selected-bundles__list');
    if (!listEl) return;

    listEl.innerHTML = '';
    if (!selectedBundleIds.size) {
      // Скрываем весь блок если нет выбранных связок
      selectedBundlesList.classList.remove('selected-bundles--visible');
      return;
    }

    // Показываем блок если есть выбранные связки
    selectedBundlesList.classList.add('selected-bundles--visible');

    selectedBundleIds.forEach((bundleId) => {
      const parts = bundleId.split('_');
      const zoneId = parts.slice(0, 2).join('_');
      const tkdRange = parts.slice(2).join('_');
      const zone = zones.find((z) => z.id === zoneId);
      const zoneName = zone ? zone.name : 'Зона неизвестна';
      const item = document.createElement('div');
      item.className = 'selected-bundles__item';
      item.innerHTML =
        `<span class="bundle-label">${escapeHtml(zoneName)} — <span class="tkd-label">ТКД ${escapeHtml(tkdRange)}</span></span>` +
        '<button type="button" class="selected-bundles__remove" aria-label="Убрать">×</button>';
      const removeBtn = item.querySelector('.selected-bundles__remove');
      removeBtn.addEventListener('click', () => {
        selectedBundleIds.delete(bundleId);
        updateSelectedBundlesDisplay();
        renderBundleSelect();
      });
      listEl.appendChild(item);
    });
  }

  function renderZoneSelect() {
    zoneSelect.innerHTML = '<option value="">— Зона —</option>';
    getZonesSorted().forEach((z) => {
      const opt = document.createElement('option');
      opt.value = z.id;
      opt.textContent = z.name;
      zoneSelect.appendChild(opt);
    });
  }

  function renderHistory() {
    if (!historyList) return;
    if (history.length === 0) {
      historyList.innerHTML = '<p class="empty-message">История пуста</p>';
      return;
    }
    historyList.innerHTML = '';
    
    // Filter by bundle and person
    let filteredHistory = history;
    if (historyFilterBundle) {
      filteredHistory = filteredHistory.filter(h => h.bundleId && h.bundleId.includes(historyFilterBundle));
    }
    if (historyFilterPerson) {
      filteredHistory = filteredHistory.filter(h => h.personName === historyFilterPerson);
    }
    
    // Сортируем историю по времени: новые события вверху
    filteredHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    filteredHistory.forEach(h => {
      const item = document.createElement('div');
      item.className = 'history-item';
      const date = new Date(h.timestamp);
      const dateStr = date.toLocaleDateString('uk-UA');
      const timeStr = date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });

      // Format bundle ID: zone_1_101-105 -> 1_101-105
      let bundleDisplay = h.bundleId || '';
      if (bundleDisplay.startsWith('zone_')) {
        const parts = bundleDisplay.replace('zone_', '').split('_');
        if (parts.length >= 2) {
          const zoneNum = parts[0];
          const tkdRange = parts.slice(1).join('_');
          bundleDisplay = `${zoneNum}_${tkdRange}`;
        }
      }

      const actionText = h.action === 'take' ? 'Взял' : 'Вернул';
      const actionClass = h.action === 'take' ? 'action-take' : 'action-return';
      item.innerHTML = `
        <span class="history-person">${escapeHtml(h.personName || 'Неизвестно')}</span>
        <span class="history-action ${actionClass}">${actionText}</span>
        <span class="history-bundle">${escapeHtml(bundleDisplay)}</span>
        <span class="history-time">${dateStr} ${timeStr}</span>
      `;
      historyList.appendChild(item);
    });
  }

  function renderPeopleSelect() {
    if (!personName) return;
    const currentValue = personName.value;
    
    // Определяем, каких сотрудников показывать
    let peopleToShow = people;
    if (!isAdmin()) {
      // USER видит только себя
      if (currentUser) {
        peopleToShow = people.filter(p => p.name === currentUser.name);
      } else {
        peopleToShow = [];
      }
    }
    
    // Add disabled placeholder option
    const placeholderOpt = document.createElement('option');
    placeholderOpt.value = '';
    placeholderOpt.disabled = true;
    placeholderOpt.selected = !currentValue;
    placeholderOpt.textContent = 'Выбери сотрудника';
    personName.innerHTML = '';
    personName.appendChild(placeholderOpt);
    
    peopleToShow.forEach((p) => {
      const opt = document.createElement('option');
      opt.value = p.name;
      opt.textContent = p.name;
      // Store phone in dataset for easy access
      opt.dataset.phone = p.phone || '';
      personName.appendChild(opt);
    });
    
    // Restore selection if still valid
    if (currentValue && peopleToShow.some(p => p.name === currentValue)) {
      placeholderOpt.selected = false;
      personName.value = currentValue;
    }
  }

  function renderPeopleManageList() {
    if (!peopleManageList) return;
    peopleManageList.innerHTML = '';
    if (people.length === 0) {
      peopleManageList.innerHTML = '<p class="empty-message">Список сотрудников пуст</p>';
      return;
    }
    const isCurrentUserAdmin = isAdmin();
    people.forEach((p) => {
      const item = document.createElement('div');
      item.className = 'person-manage-item';
      item.innerHTML = `
        <div class="person-manage-header">
          <span class="person-manage-name">${escapeHtml(p.name)}</span>
          <span class="person-manage-role">${p.isAdmin ? '👑 ADMIN' : '👤 USER'}</span>
        </div>
        <div class="person-manage-details">
          <span class="person-manage-phone">${p.phone ? escapeHtml(p.phone) : '—'}</span>
        </div>
        ${isCurrentUserAdmin ? `
        <label class="admin-checkbox">
          <input type="checkbox" data-id="${p.id}" ${p.isAdmin ? 'checked' : ''}> Админ
        </label>
        ` : ''}
        ${isCurrentUserAdmin ? `
        <div class="person-manage-actions">
          <button type="button" class="btn-edit" data-id="${p.id}" data-name="${escapeHtml(p.name)}" data-admin="${p.isAdmin || false}" title="Редактировать">✏️</button>
          <button type="button" class="btn-change-password" data-id="${p.id}" title="Сменить пароль">🔑</button>
          <button type="button" class="btn-delete" data-id="${p.id}" title="Удалить">🗑️</button>
        </div>
        ` : ''}
      `;
      peopleManageList.appendChild(item);
    });
    // Add event listeners
    peopleManageList.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!isAdmin()) return;
        const id = parseInt(btn.dataset.id);
        const person = people.find(p => p.id === id);
        if (!person) return;
        
        // Show edit person modal
        openEditPersonModal(person);
      });
    });
    // Add password change button handler - open modal
    peopleManageList.querySelectorAll('.btn-change-password').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!isAdmin()) return;
        const id = parseInt(btn.dataset.id);
        const person = people.find(p => p.id === id);
        if (!person) return;
        
        // Show password change modal
        openPasswordModal(person);
      });
    });
    
    // Password modal elements
    const passwordModal = document.getElementById('password-modal');
    const closePasswordModal = document.getElementById('close-password-modal');
    const passwordModalCurrent = document.getElementById('password-modal-current');
    const passwordModalNew = document.getElementById('password-modal-new');
    const passwordModalCancel = document.getElementById('password-modal-cancel');
    const passwordModalSave = document.getElementById('password-modal-save');
    
    // Edit person modal elements
    const editPersonModal = document.getElementById('edit-person-modal');
    const closeEditPersonModal = document.getElementById('close-edit-person-modal');
    const editPersonModalName = document.getElementById('edit-person-modal-name');
    const editPersonModalPhone = document.getElementById('edit-person-modal-phone');
    const editPersonModalRole = document.getElementById('edit-person-modal-role');
    const editPersonModalCancel = document.getElementById('edit-person-modal-cancel');
    const editPersonModalSave = document.getElementById('edit-person-modal-save');
    
    let currentEditPersonId = null;
    
    function openPasswordModal(person) {
      currentEditPersonId = person.id;
      passwordModalCurrent.textContent = '••••••••';
      passwordModalNew.value = '';
      passwordModal.style.display = 'flex';
    }
    
    // Add event listener for show password button
    const btnShowPassword = document.getElementById('btn-show-password');
    if (btnShowPassword) {
      btnShowPassword.addEventListener('click', async () => {
        if (passwordModalCurrent.textContent === '••••••••') {
          // Show real password
          if (currentEditPersonId !== null) {
            const realPassword = await getPersonPassword(currentEditPersonId);
            if (realPassword) {
              passwordModalCurrent.textContent = realPassword;
              btnShowPassword.textContent = '🙈';
              btnShowPassword.title = 'Скрыть пароль';
            } else {
              alert('Не удалось получить пароль сотрудника');
            }
          }
        } else {
          // Hide password
          passwordModalCurrent.textContent = '••••••••';
          btnShowPassword.textContent = '👁️';
          btnShowPassword.title = 'Показать пароль';
        }
      });
    }
    
    function closePasswordModalFn() {
      passwordModal.style.display = 'none';
      currentEditPersonId = null;
    }
    
    if (closePasswordModal) {
      closePasswordModal.addEventListener('click', closePasswordModalFn);
    }
    
    if (passwordModalCancel) {
      passwordModalCancel.addEventListener('click', closePasswordModalFn);
    }
    
    if (passwordModal) {
      passwordModal.addEventListener('click', (e) => {
        if (e.target === passwordModal) {
          closePasswordModalFn();
        }
      });
    }
    
    if (passwordModalSave) {
      passwordModalSave.addEventListener('click', async () => {
        const newPassword = passwordModalNew.value;
        
        if (!newPassword || newPassword.length < 4) {
          alert('Пароль должен быть не менее 4 символов');
          return;
        }
        
        if (currentEditPersonId !== null) {
          await changePassword(currentEditPersonId, newPassword);
          closePasswordModalFn();
        }
      });
    }
    
    // Enter key in password field
    if (passwordModalNew) {
      passwordModalNew.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          passwordModalSave.click();
        }
      });
    }
    
    function openEditPersonModal(person) {
      currentEditPersonId = person.id;
      editPersonModalName.value = person.name;
      editPersonModalPhone.value = person.phone || '';
      editPersonModal.style.display = 'flex';
    }
    
    function closeEditPersonModalFn() {
      editPersonModal.style.display = 'none';
      currentEditPersonId = null;
    }
    
    if (closeEditPersonModal) {
      closeEditPersonModal.addEventListener('click', closeEditPersonModalFn);
    }
    
    if (editPersonModalCancel) {
      editPersonModalCancel.addEventListener('click', closeEditPersonModalFn);
    }
    
    if (editPersonModal) {
      editPersonModal.addEventListener('click', (e) => {
        if (e.target === editPersonModal) {
          closeEditPersonModalFn();
        }
      });
    }
    
    if (editPersonModalSave) {
      editPersonModalSave.addEventListener('click', async () => {
        const name = editPersonModalName.value.trim();
        const phone = editPersonModalPhone.value.trim();
        
        if (!name) {
          alert('Введите ФИО сотрудника');
          return;
        }
        
        if (currentEditPersonId !== null) {
          await updatePerson(currentEditPersonId, name, phone, null);
          closeEditPersonModalFn();
        }
      });
    }
    
    // Enter key in phone field
    if (editPersonModalPhone) {
      editPersonModalPhone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          editPersonModalSave.click();
        }
      });
    }
    peopleManageList.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!isAdmin()) return;
        const id = parseInt(btn.dataset.id);
        if (confirm('Удалить сотрудника ' + btn.closest('.person-manage-item').querySelector('.person-manage-name').textContent + '?')) {
          deletePerson(id);
        }
      });
    });
    // Admin checkbox handler
    peopleManageList.querySelectorAll('.admin-checkbox input').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        if (!isAdmin()) return;
        const id = parseInt(checkbox.dataset.id);
        const person = people.find(p => p.id === id);
        if (person) {
          updatePerson(id, person.name, person.phone, checkbox.checked);
        }
      });
    });
  }

  function renderBundleSelect() {
    const zoneId = zoneSelect.value;
    if (!bundleList) return;

    bundleList.innerHTML = '';

    const bundles = zoneId
      ? (zones.find((z) => z.id === zoneId)?.bundles || []).map((range) => ({
          zoneId,
          zoneName: zones.find((z) => z.id === zoneId)?.name || `Зона ${zoneId.split('_')[1] || 'неизвестна'}`,
          tkdRange: range,
          bundleId: getBundleId(zoneId, range),
        }))
      : getAllBundles();

    const sortedBundles = [...bundles].sort((a, b) => {
      const zoneCmp = a.zoneName.localeCompare(b.zoneName, 'uk', { numeric: true });
      if (zoneCmp !== 0) return zoneCmp;
      return a.tkdRange.localeCompare(b.tkdRange, 'uk', { numeric: true });
    });

    const filteredBundles = bundleSearchQuery
      ? sortedBundles.filter((b) => b.tkdRange.toLowerCase().includes(bundleSearchQuery.toLowerCase()))
      : sortedBundles;

    if (!filteredBundles.length) {
      const empty = document.createElement('div');
      empty.className = 'bundle-empty';
      empty.textContent = zoneId ? 'В этой зоне нет связок.' : 'Нет связок для показа.';
      bundleList.appendChild(empty);
      return;
    }

    filteredBundles.forEach((b) => {
      const taken = Boolean(state[b.bundleId]?.personName);
      const bundleState = state[b.bundleId];
      const label = document.createElement('label');
      label.className = 'bundle-item';
      if (selectedBundleIds.has(b.bundleId)) label.classList.add('bundle-item--selected');
      if (taken) label.classList.add('bundle-item--taken');

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = b.bundleId;
      checkbox.checked = selectedBundleIds.has(b.bundleId);
      // Отключаем checkbox для взятых связок
      if (taken) checkbox.disabled = true;

      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          selectedBundleIds.add(b.bundleId);
          label.classList.add('bundle-item--selected');
        } else {
          selectedBundleIds.delete(b.bundleId);
          label.classList.remove('bundle-item--selected');
        }
        updateSelectedBundlesDisplay();
      });

      let textContent = zoneId ? `ТКД ${b.tkdRange}` : `${b.zoneName} — ТКД ${b.tkdRange}`;
      // Показываем кто взял связку
      if (taken && bundleState && bundleState.personName) {
        textContent += ` (у ${bundleState.personName})`;
      }

      const text = document.createElement('span');
      text.textContent = textContent;

      label.appendChild(checkbox);
      label.appendChild(text);

      // Show comment if exists (even for returned keys)
      if (bundleState && bundleState.comment) {
        const commentSpan = document.createElement('span');
        commentSpan.className = 'bundle-comment';
        commentSpan.textContent = ` [${bundleState.comment}]`;
        label.appendChild(commentSpan);
      }

      bundleList.appendChild(label);
    });
  }

  function renderPeople() {
    updateAdminMode();
    const people = getPeopleWithKeys();
    peopleList.innerHTML = '';
    
    // Скрываем секцию если нет людей с ключами
    if (peopleSection) {
      peopleSection.style.display = people.length ? '' : 'none';
    }
    
    people.forEach((name) => {
      const count = Object.values(state).filter((v) => v && v.personName === name).length;
      const personDiv = document.createElement('div');
      personDiv.className = 'person-item';
      const chip = document.createElement('span');
      chip.className = 'person-chip' + (selectedPerson === name ? ' active' : '');
      chip.textContent = `${name} (${count})`;
      chip.addEventListener('click', () => {
        selectedPerson = selectedPerson === name ? null : name;
        renderPeople();
        renderViewPanel();
      });
      personDiv.appendChild(chip);
      peopleList.appendChild(personDiv);
    });
  }

  function renderViewPanel() {
    if (!viewPanel || !viewPersonName || !viewKeysInfo || !viewBundles || !viewButtons) return;

    if (!selectedPerson) {
      viewPanel.style.display = 'none';
      return;
    }

    viewPanel.style.display = '';
    viewPersonName.textContent = `Ключи у: ${selectedPerson}`;

    // Get person's phone and set link
    const person = people.find(p => p.name === selectedPerson);
    if (person) {
      if (person.phone) {
        viewPersonPhone.textContent = person.phone;
        viewPersonPhone.href = `tel:${person.phone}`;
        viewPersonPhone.style.display = '';
        viewPersonPhone.title = 'Нажмите для звонка';
      } else {
        viewPersonPhone.textContent = '+ Добавить телефон';
        viewPersonPhone.href = '#';
        viewPersonPhone.style.display = '';
        viewPersonPhone.title = 'Нажмите для добавления телефона';
      }
    } else {
      viewPersonPhone.style.display = 'none';
    }

    // Add click handler for phone to edit/add (ADMIN only)
    if (isAdmin()) {
      viewPersonPhone.onclick = (e) => {
        e.preventDefault();
        if (!person) return;
        const newPhone = prompt('Введите номер телефона:', person.phone || '');
        if (newPhone !== null) {
          updatePerson(person.id, person.name, newPhone.trim());
        }
      };
    }
    // Note: Non-admin users can still see and click the phone link to make a call

    // Get person's bundles
    const personBundles = Object.entries(state)
      .filter(([_, data]) => data && data.personName === selectedPerson)
      .map(([bundleId, data]) => {
        const parts = bundleId.split('_');
        const zoneId = parts.slice(0, 2).join('_');
        const tkdRange = parts.slice(2).join('_');
        const zone = zones.find((z) => z.id === zoneId);
        const zoneName = zone ? zone.name : 'Зона неизвестна';
        return { bundleId, zoneName, tkdRange, takenAt: data.takenAt };
      })
      .sort((a, b) => a.zoneName.localeCompare(b.zoneName) || a.tkdRange.localeCompare(b.tkdRange));

    if (!personBundles.length) {
      viewKeysInfo.textContent = 'У этого человека нет ключей.';
      viewBundles.innerHTML = '';
      viewButtons.innerHTML = '';

      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'btn btn-secondary';
      closeBtn.textContent = 'Закрыть';
      closeBtn.addEventListener('click', () => {
        selectedPerson = null;
        renderPeople();
        renderViewPanel();
      });

      viewButtons.appendChild(closeBtn);
      return;
    }

    // По умолчанию помечаем все связки для возврата
    selectedReturnBundleIds = new Set(personBundles.map((b) => b.bundleId));

    viewKeysInfo.textContent = `Всего: ${personBundles.length} связок. Выбери, какие вернуть:`;

    viewBundles.innerHTML = '';
    
    // Отображаем ключи сотрудника
    personBundles.forEach((bundle) => {
      const item = document.createElement('div');
      item.className = 'view-bundle-item';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = bundle.bundleId;
      checkbox.checked = selectedReturnBundleIds.has(bundle.bundleId);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          selectedReturnBundleIds.add(bundle.bundleId);
        } else {
          selectedReturnBundleIds.delete(bundle.bundleId);
        }
      });
      
      const label = document.createElement('label');
      label.className = 'view-bundle-label';
      label.textContent = `${bundle.zoneName} — ТКД ${bundle.tkdRange}`;
      
      const timeInfo = document.createElement('span');
      timeInfo.className = 'view-bundle-time';
      timeInfo.textContent = `Взято: ${formatTime(bundle.takenAt)}`;
      
      item.appendChild(checkbox);
      item.appendChild(label);
      item.appendChild(timeInfo);
      
      viewBundles.appendChild(item);
    });
    
    // Кнопки действий
    viewButtons.innerHTML = '';
    
    const returnBtn = document.createElement('button');
    returnBtn.type = 'button';
    returnBtn.className = 'btn btn-return';
    returnBtn.textContent = 'Вернуть выбранные';
    returnBtn.addEventListener('click', async () => {
      const bundleIds = Array.from(selectedReturnBundleIds);
      if (!bundleIds.length) {
        alert('Выберите связки для возврата');
        return;
      }
      await returnKeys(bundleIds);
      selectedPerson = null;
      renderPeople();
      renderViewPanel();
    });
    
    const returnAllBtn = document.createElement('button');
    returnAllBtn.type = 'button';
    returnAllBtn.className = 'btn btn-return';
    returnAllBtn.textContent = 'Вернуть все';
    returnAllBtn.addEventListener('click', async () => {
      const bundleIds = personBundles.map(b => b.bundleId);
      if (!bundleIds.length) {
        alert('У этого человека нет ключей');
        return;
      }
      if (confirm(`Вы уверены, что хотите вернуть все ${bundleIds.length} связок?`)) {
        await returnKeys(bundleIds);
        selectedPerson = null;
        renderPeople();
        renderViewPanel();
      }
    });
    
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'btn btn-danger';
    closeBtn.textContent = 'Закрыть';
    closeBtn.addEventListener('click', () => {
      selectedPerson = null;
      renderPeople();
      renderViewPanel();
    });
    
    viewButtons.appendChild(returnBtn);
    viewButtons.appendChild(returnAllBtn);
    viewButtons.appendChild(closeBtn);
  }

  function isOverdue(takenAt) {
    const now = Date.now();
    const diffDays = Math.floor((now - takenAt) / (1000 * 60 * 60 * 24));
    return diffDays >= 2;
  }

  function getDaysOverdue(takenAt) {
    const now = Date.now();
    return Math.floor((now - takenAt) / (1000 * 60 * 60 * 24));
  }

  function renderOverdueNotification() {
    const notification = document.getElementById('overdue-notification');
    const countEl = document.getElementById('overdue-count');
    const listEl = document.getElementById('overdue-list');
    if (!notification || !countEl || !listEl) return;

    const overdueItems = [];
    for (const [bundleId, data] of Object.entries(state)) {
      if (data && data.takenAt && isOverdue(data.takenAt)) {
        const days = getDaysOverdue(data.takenAt);
        overdueItems.push({ bundleId, personName: data.personName, days });
      }
    }

    if (overdueItems.length === 0) {
      notification.style.display = 'none';
      return;
    }

    notification.style.display = 'block';
    countEl.textContent = overdueItems.length;
    listEl.textContent = overdueItems.map(item =>
      item.bundleId.split('_').slice(2).join('_') + ' (' + item.personName + ', ' + item.days + ' дн.)'
    ).join(', ');
  }

  function renderSearchResults() {
    if (!searchResults) return;
    const list = filterBundlesBySearch();
    searchResults.innerHTML = '';
    if (!list.length) {
      searchResults.innerHTML = '<p>Ничего не найдено.</p>';
      searchResults.style.display = '';
      return;
    }
    list.forEach((b) => {
      const cur = state[b.bundleId];
      const item = document.createElement('div');
      item.className = 'search-result-item';
      let statusHtml = '';
      if (cur) {
        statusHtml = `У ${escapeHtml(cur.personName)}`;
      } else {
        statusHtml = 'Свободна';
      }
      item.innerHTML = `
        <div class="bundle-info">${escapeHtml(b.zoneName)} — ТКД ${escapeHtml(b.tkdRange)}</div>
        <div class="bundle-status">${statusHtml}</div>
      `;
      searchResults.appendChild(item);
    });
    searchResults.style.display = '';
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function render() {
    renderZoneSelect();
    renderBundleSelect();
    updateSelectedBundlesDisplay();
    renderPeople();
    // renderViewPanel() вызывается только при клике на имя сотрудника
    renderOverdueNotification();
    updateHistoryPersonFilter();
    renderHistory();
  }

  function updateHistoryPersonFilter() {
    if (!historyPersonFilter) return;
    const currentValue = historyPersonFilter.value;
    historyPersonFilter.innerHTML = '<option value="">Все сотрудники</option>';
    // Get unique people from history
    const uniquePeople = [...new Set(history.map(h => h.personName).filter(Boolean))].sort();
    uniquePeople.forEach(person => {
      const opt = document.createElement('option');
      opt.value = person;
      opt.textContent = person;
      historyPersonFilter.appendChild(opt);
    });
    // Restore selection if still valid
    if (currentValue && uniquePeople.includes(currentValue)) {
      historyPersonFilter.value = currentValue;
    }
  }

  if (keySearch) {
    keySearch.addEventListener('input', () => {
      searchQuery = keySearch.value;
      if (searchQuery.trim()) {
        renderSearchResults();
      } else {
        if (searchResults) searchResults.style.display = 'none';
      }
    });

    keySearch.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        keySearch.value = '';
        searchQuery = '';
        if (searchResults) searchResults.style.display = 'none';
      }
    });
  }

  if (btnSearch && keySearch && searchResults) {
    btnSearch.addEventListener('click', () => {
      searchQuery = keySearch.value;
      if (searchQuery.trim()) {
        renderSearchResults();
      } else {
        searchResults.style.display = 'none';
      }
    });
  }

  if (bundleSearch) {
    bundleSearch.addEventListener('input', () => {
      bundleSearchQuery = bundleSearch.value;
      renderBundleSelect();
    });
    bundleSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        bundleSearch.value = '';
        bundleSearchQuery = '';
        renderBundleSelect();
      }
    });
  }

  zoneSelect.addEventListener('change', () => {
    if (bundleSearch) {
      bundleSearch.value = '';
      bundleSearchQuery = '';
    }
    renderBundleSelect();
  });

  btnTake.addEventListener('click', () => {
    const bundleIds = getSelectedBundleIds();
    const name = personName.value;
    if (!name) {
      alert('Выбери сотрудника из списка.');
      return;
    }
    if (!bundleIds.length) {
      alert('Выбери связку(и) (ТКД).');
      return;
    }
    takeKeys(bundleIds, name);
    personName.value = '';
  });

  if (btnQuickSelect && quickBundleSelect) {
    btnQuickSelect.addEventListener('click', () => {
      const input = quickBundleSelect.value.trim();
      if (!input) {
        alert('Введи зону_ключ, напр. 1_101');
        return;
      }
      const parts = input.split('_');
      if (parts.length !== 2) {
        alert('Неправильный формат. Используй: номер_зоны_ключ, напр. 1_101');
        return;
      }
      const zoneNum = parts[0].trim();
      const keyOrBundle = parts[1].trim();
      if (!zoneNum || !keyOrBundle) {
        alert('Неправильный формат.');
        return;
      }
      // Find zone by number
      const zone = zones.find(z => getZoneOrderNumber(z.name) === parseInt(zoneNum, 10));
      if (!zone) {
        alert('Зону с таким номером не найдено.');
        return;
      }
      // Check if it's a full bundle range (e.g., 101-1010)
      if (zone.bundles.includes(keyOrBundle)) {
        const bundleId = getBundleId(zone.id, keyOrBundle);
        selectedBundleIds.add(bundleId);
        updateSelectedBundlesDisplay();
        renderBundleSelect();
        quickBundleSelect.value = '';
        return;
      }
      // Try to find bundle by key number (e.g., 132 -> 131-1311)
      const keyNum = parseInt(keyOrBundle, 10);
      if (!isNaN(keyNum)) {
        // Find all bundles that contain this key number and pick the smallest range
        let foundBundles = [];
        for (const bundle of zone.bundles) {
          const rangeParts = bundle.split('-');
          if (rangeParts.length === 2) {
            const start = parseInt(rangeParts[0], 10);
            const end = parseInt(rangeParts[1], 10);
            if (keyNum >= start && keyNum <= end) {
              foundBundles.push({ bundle, size: end - start });
            }
          } else if (rangeParts.length === 1) {
            const key = parseInt(rangeParts[0], 10);
            if (key === keyNum) {
              foundBundles.push({ bundle, size: 0 });
            }
          }
        }
        if (foundBundles.length > 0) {
          // Sort by closest start to the key number
          foundBundles.sort((a, b) => {
            const aStart = parseInt(a.bundle.split('-')[0], 10);
            const bStart = parseInt(b.bundle.split('-')[0], 10);
            return Math.abs(aStart - keyNum) - Math.abs(bStart - keyNum);
          });
          const bestBundle = foundBundles[0].bundle;
          const bundleId = getBundleId(zone.id, bestBundle);
          selectedBundleIds.add(bundleId);
          updateSelectedBundlesDisplay();
          renderBundleSelect();
          quickBundleSelect.value = '';
        } else {
          alert('Ключ ' + keyOrBundle + ' не найден в зоне ' + zone.name);
        }
      } else {
        alert('Ключ ' + keyOrBundle + ' не найден в зоне ' + zone.name);
      }
    });
    quickBundleSelect.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') btnQuickSelect.click();
    });
  }

  // People modal handlers
  if (btnManagePeople && peopleModal) {
    btnManagePeople.addEventListener('click', () => {
      renderPeopleManageList();
      peopleModal.style.display = 'flex';
    });
    closePeopleModal.addEventListener('click', () => {
      peopleModal.style.display = 'none';
    });
    peopleModal.addEventListener('click', (e) => {
      if (e.target === peopleModal) {
        peopleModal.style.display = 'none';
      }
    });
    if (btnAddPerson && newPersonName) {
      btnAddPerson.addEventListener('click', async () => {
        console.log('Add person button clicked');
        console.log('Elements found:', {
          btnAddPerson: !!btnAddPerson,
          newPersonName: !!newPersonName,
          newPersonPhone: !!newPersonPhone,
          newPersonPassword: !!newPersonPassword,
          newPersonRole: !!newPersonRole
        });
        
        if (!isAdmin()) {
          alert('Только администратор может добавлять сотрудников');
          return;
        }
        const name = newPersonName.value.trim();
        // Phone is optional - get value if field exists
        const phone = newPersonPhone ? newPersonPhone.value.trim() : '';
        // Password is required
        const password = newPersonPassword ? newPersonPassword.value.trim() : '';
        // Role selection (ADMIN or USER)
        const role = newPersonRole ? newPersonRole.value : 'USER';
        const isAdminValue = role === 'ADMIN';
        
        console.log('Form data:', { name, phone, password, isAdminValue });
        
        if (!name) {
          alert('Введите ФИО сотрудника');
          return;
        }
        
        if (!password || password.length < 4) {
          alert('Введите пароль (минимум 4 символа)');
          return;
        }
        
        try {
          console.log('Attempting to add person:', { name, phone, isAdminValue, password });
          await addPerson(name, phone, isAdminValue, password);
          // Clear form fields
          newPersonName.value = '';
          if (newPersonPhone) newPersonPhone.value = '';
          if (newPersonPassword) newPersonPassword.value = '';
          if (newPersonRole) newPersonRole.value = 'USER';
        } catch (error) {
          console.error('Error adding person:', error);
          alert('Ошибка при добавлении сотрудника: ' + error.message);
        }
      });
      newPersonName.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') btnAddPerson.click();
      });
    }
  }

  // History toggle handler
  if (toggleHistoryBtn && historySection) {
    toggleHistoryBtn.addEventListener('click', () => {
      if (historySection.style.display === 'none') {
        historySection.style.display = 'block';
        toggleHistoryBtn.textContent = 'История';
        toggleHistoryBtn.classList.add('active');
      } else {
        historySection.style.display = 'none';
        toggleHistoryBtn.textContent = 'История';
        toggleHistoryBtn.classList.remove('active');
      }
    });
  }

  // History hide button handler
  if (toggleHistoryHideBtn && historySection) {
    toggleHistoryHideBtn.addEventListener('click', () => {
      historySection.style.display = 'none';
      if (toggleHistoryBtn) {
        toggleHistoryBtn.classList.remove('active');
      }
    });
  }

  // Person select handler
  if (personName) {
    personName.addEventListener('change', () => {
      selectedPerson = personName.value || null;
      updateAdminMode();
    });
  }

  // Login modal handlers
  const loginModal = document.getElementById('login-modal');
  const closeLoginModal = document.getElementById('close-login-modal');
  const btnDoLogin = document.getElementById('btn-do-login');
  const loginName = document.getElementById('login-name');

  if (btnLogin && loginModal) {
    btnLogin.addEventListener('click', () => {
      loginModal.style.display = 'flex';
    });
  }

  if (closeLoginModal && loginModal) {
    closeLoginModal.addEventListener('click', () => {
      loginModal.style.display = 'none';
    });
    loginModal.addEventListener('click', (e) => {
      if (e.target === loginModal) {
        loginModal.style.display = 'none';
      }
    });
  }

  const loginPassword = document.getElementById('login-password');
  
  if (btnDoLogin && loginName && loginPassword) {
    btnDoLogin.addEventListener('click', async () => {
      const name = loginName.value;
      const password = loginPassword.value;
      if (!name || !name.trim()) {
        alert('Введите имя пользователя');
        return;
      }
      if (!password) {
        alert('Введите пароль');
        return;
      }
      const success = await login(name.trim(), password);
      if (success) {
        loginModal.style.display = 'none';
        loginName.value = '';
        loginPassword.value = '';
      }
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      logout();
    });
  }

  // History person filter handler
  if (historyPersonFilter) {
    historyPersonFilter.addEventListener('change', () => {
      historyFilterPerson = historyPersonFilter.value;
      renderHistory();
    });
  }
  
  // History bundle filter handler
  const historyBundleFilter = document.getElementById('history-bundle-filter');
  if (historyBundleFilter) {
    historyBundleFilter.addEventListener('input', () => {
      historyFilterBundle = historyBundleFilter.value.trim();
      renderHistory();
    });
  }

  // Инициализация

  load();
  render();
})();