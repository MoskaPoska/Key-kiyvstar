(function () {
  'use strict';

  function init(config) {
    const {
      escapeHtml,
      getZones,
      getState,
      getPeople,
      getSelectedPerson,
      setSelectedPerson,
      getSelectedBundleIds,
      getSelectedReturnBundleIds,
      setSelectedReturnBundleIds,
      getBundleSearchQuery,
      getZoneValue,
      getBundleId,
      isAdmin,
      updatePerson,
      returnKeys,
      updateAdminMode,
      formatTime,
    } = config;

    const bundleList = document.getElementById('bundle-list');
    const selectedBundlesList = document.getElementById('selected-bundles');
    const peopleList = document.getElementById('people-list');
    const peopleSection = document.getElementById('people-section');
    const viewPanel = document.getElementById('view-panel');
    const viewPersonName = document.getElementById('view-person-name');
    const viewPersonPhone = document.getElementById('view-person-phone');
    const viewKeysInfo = document.getElementById('view-keys-info');
    const viewBundles = document.getElementById('view-bundles');
    const viewButtons = document.getElementById('view-buttons');

    function getPeopleWithKeys() {
      const state = getState();
      const set = new Set();
      Object.values(state).forEach((value) => {
        if (value && value.personName) {
          set.add(value.personName);
        }
      });
      return Array.from(set).sort();
    }

    function getZoneNumberFromZoneId(zoneId) {
      const match = String(zoneId || '').match(/^zone_(\d+)$/i);
      return match ? match[1] : '';
    }

    function parseBundleRange(range) {
      const [start = '', end = ''] = String(range || '').split('-');
      return {
        start,
        end,
        startNum: Number.parseInt(start, 10),
        endNum: Number.parseInt(end, 10),
        groupPrefix: start.length > 1 ? start.slice(0, -1) : start,
      };
    }

    function bundleContainsKey(range, keyValue) {
      const key = String(keyValue || '').trim();
      if (!/^\d+$/.test(key)) {
        return false;
      }

      const keyVariants = [key];
      if (key.length >= 5 && key[1] === '0') {
        keyVariants.push(key[0] + key.slice(2));
      }

      const { start, end, startNum, endNum } = parseBundleRange(range);

      if (!start) {
        return false;
      }

      if (!end) {
        return key === start;
      }

      if (!Number.isFinite(startNum) || !Number.isFinite(endNum)) {
        return false;
      }

      return keyVariants.some((candidate) => {
        const candidateNum = Number.parseInt(candidate, 10);

        if (start.length === end.length) {
          return Number.isFinite(candidateNum) && candidateNum >= startNum && candidateNum <= endNum;
        }

        if (end.length === start.length + 1 && end.startsWith(start)) {
          const basePrefix = start.slice(0, -1);
          const startLastDigit = Number.parseInt(start.slice(-1), 10);
          const endSuffix = Number.parseInt(end.slice(start.length), 10);

          if (!Number.isFinite(startLastDigit) || !Number.isFinite(endSuffix)) {
            return false;
          }

          if (candidate.length === start.length && basePrefix && candidate.startsWith(basePrefix)) {
            const candidateLastDigit = Number.parseInt(candidate.slice(-1), 10);
            return Number.isFinite(candidateLastDigit) && candidateLastDigit >= startLastDigit && candidateLastDigit <= 9;
          }

          if (candidate.length === end.length && candidate.startsWith(start)) {
            const candidateSuffix = Number.parseInt(candidate.slice(start.length), 10);
            return Number.isFinite(candidateSuffix) && candidateSuffix >= 0 && candidateSuffix <= endSuffix;
          }

          return false;
        }

        return Number.isFinite(candidateNum) && candidateNum >= startNum && candidateNum <= endNum;
      });
    }

    function bundleMatchesSearch(bundle, rawQuery) {
      const query = String(rawQuery || '').trim().toLowerCase();
      if (!query) return true;

      const zoneNumber = getZoneNumberFromZoneId(bundle.zoneId);
      const zoneName = String(bundle.zoneName || '').toLowerCase();
      const tkdRange = String(bundle.tkdRange || '').toLowerCase();
      const bundleId = String(bundle.bundleId || '').toLowerCase();
      const displayBundleId = zoneNumber ? `${zoneNumber}_${tkdRange}` : tkdRange;
      const { start: rangeStart, end: rangeEnd } = parseBundleRange(tkdRange);

      const zonePrefixedMatch = query.match(/^(\d+)[_-](.*)$/);
      if (zonePrefixedMatch) {
        const [, queryZone, queryTermRaw] = zonePrefixedMatch;
        const queryTerm = String(queryTermRaw || '').trim().toLowerCase();
        if (!queryZone || zoneNumber !== queryZone) {
          return false;
        }
        if (!queryTerm) {
          return true;
        }
        if (queryTerm.includes('-')) {
          return tkdRange.startsWith(queryTerm) || displayBundleId === `${queryZone}_${queryTerm}`;
        }
        if (bundleContainsKey(tkdRange, queryTerm)) {
          return true;
        }
        return rangeStart.startsWith(queryTerm) ||
          rangeStart === queryTerm ||
          rangeEnd === queryTerm;
      }

      return zoneName.includes(query) || tkdRange.includes(query) || bundleId.includes(query) || displayBundleId.includes(query);
    }

    function updateSelectedBundlesDisplay() {
      if (!selectedBundlesList) return;

      const zones = getZones();
      const selectedBundleIds = getSelectedBundleIds();
      const listEl = selectedBundlesList.querySelector('.selected-bundles__list');
      if (!listEl) return;

      listEl.innerHTML = '';
      if (!selectedBundleIds.size) {
        selectedBundlesList.classList.remove('selected-bundles--visible');
        return;
      }

      selectedBundlesList.classList.add('selected-bundles--visible');

      selectedBundleIds.forEach((bundleId) => {
        const parts = bundleId.split('_');
        const zoneId = parts.slice(0, 2).join('_');
        const tkdRange = parts.slice(2).join('_');
        const zone = zones.find((item) => item.id === zoneId);
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

    function renderBundleSelect() {
      const zoneId = getZoneValue();
      const zones = getZones();
      const state = getState();
      const selectedBundleIds = getSelectedBundleIds();
      const bundleSearchQuery = getBundleSearchQuery();

      if (!bundleList) return;
      bundleList.innerHTML = '';

      const bundles = zoneId
        ? (zones.find((zone) => zone.id === zoneId)?.bundles || []).map((range) => ({
            zoneId,
            zoneName: zones.find((zone) => zone.id === zoneId)?.name || `Зона ${zoneId.split('_')[1] || 'неизвестна'}`,
            tkdRange: range,
            bundleId: getBundleId(zoneId, range),
          }))
        : zones.flatMap((zone) =>
            zone.bundles.map((range) => ({
              zoneId: zone.id,
              zoneName: zone.name,
              tkdRange: range,
              bundleId: getBundleId(zone.id, range),
            }))
          );

      const sortedBundles = [...bundles].sort((a, b) => {
        const zoneCmp = a.zoneName.localeCompare(b.zoneName, 'uk', { numeric: true });
        if (zoneCmp !== 0) return zoneCmp;
        return a.tkdRange.localeCompare(b.tkdRange, 'uk', { numeric: true });
      });

      const filteredBundles = bundleSearchQuery
        ? sortedBundles.filter((bundle) => bundleMatchesSearch(bundle, bundleSearchQuery))
        : sortedBundles;

      if (!filteredBundles.length) {
        const empty = document.createElement('div');
        empty.className = 'bundle-empty';
        empty.textContent = zoneId ? 'В этой зоне нет связок.' : 'Нет связок для показа.';
        bundleList.appendChild(empty);
        return;
      }

      filteredBundles.forEach((bundle) => {
        const taken = Boolean(state[bundle.bundleId]?.personName);
        const bundleState = state[bundle.bundleId];
        const label = document.createElement('label');
        label.className = 'bundle-item';
        if (selectedBundleIds.has(bundle.bundleId)) label.classList.add('bundle-item--selected');
        if (taken) label.classList.add('bundle-item--taken');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = bundle.bundleId;
        checkbox.checked = selectedBundleIds.has(bundle.bundleId);
        if (taken) checkbox.disabled = true;

        checkbox.addEventListener('change', () => {
          if (checkbox.checked) {
            selectedBundleIds.add(bundle.bundleId);
            label.classList.add('bundle-item--selected');
          } else {
            selectedBundleIds.delete(bundle.bundleId);
            label.classList.remove('bundle-item--selected');
          }
          updateSelectedBundlesDisplay();
        });

        let textContent = zoneId ? `ТКД ${bundle.tkdRange}` : `${bundle.zoneName} — ТКД ${bundle.tkdRange}`;
        if (taken && bundleState && bundleState.personName) {
          textContent += ` (у ${bundleState.personName})`;
        }

        const text = document.createElement('span');
        text.textContent = textContent;

        label.appendChild(checkbox);
        label.appendChild(text);

        if (bundleState && bundleState.comment) {
          const commentSpan = document.createElement('span');
          commentSpan.className = 'bundle-comment';
          commentSpan.textContent = bundleState.comment;
          label.appendChild(commentSpan);
        }

        bundleList.appendChild(label);
      });
    }

    function renderPeople() {
      updateAdminMode();
      const state = getState();
      const peopleWithKeys = getPeopleWithKeys();

      peopleList.innerHTML = '';
      if (peopleSection) {
        peopleSection.style.display = peopleWithKeys.length ? '' : 'none';
      }

      peopleWithKeys.forEach((name) => {
        const count = Object.values(state).filter((value) => value && value.personName === name).length;
        const personDiv = document.createElement('div');
        const chip = document.createElement('span');

        personDiv.className = 'person-item';
        chip.className = 'person-chip' + (getSelectedPerson() === name ? ' active' : '');
        chip.textContent = `${name} (${count})`;
        chip.addEventListener('click', () => {
          setSelectedPerson(getSelectedPerson() === name ? null : name);
          renderPeople();
          renderViewPanel();
        });

        personDiv.appendChild(chip);
        peopleList.appendChild(personDiv);
      });
    }

    function renderViewPanel() {
      if (!viewPanel || !viewPersonName || !viewKeysInfo || !viewBundles || !viewButtons) return;

      const selectedPerson = getSelectedPerson();
      const people = getPeople();
      const zones = getZones();
      const state = getState();

      if (!selectedPerson) {
        viewPanel.style.display = 'none';
        return;
      }

      viewPanel.style.display = '';
      viewPersonName.textContent = `Ключи у: ${selectedPerson}`;

      const person = people.find((item) => item.name === selectedPerson);
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

      const personBundles = Object.entries(state)
        .filter(([_, data]) => data && data.personName === selectedPerson)
        .map(([bundleId, data]) => {
          const parts = bundleId.split('_');
          const zoneId = parts.slice(0, 2).join('_');
          const tkdRange = parts.slice(2).join('_');
          const zone = zones.find((item) => item.id === zoneId);
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
          setSelectedPerson(null);
          renderPeople();
          renderViewPanel();
        });
        viewButtons.appendChild(closeBtn);
        return;
      }

      setSelectedReturnBundleIds(new Set(personBundles.map((bundle) => bundle.bundleId)));
      viewKeysInfo.textContent = `Всего: ${personBundles.length} связок. Выбери, какие вернуть:`;
      viewBundles.innerHTML = '';

      personBundles.forEach((bundle) => {
        const item = document.createElement('div');
        const checkbox = document.createElement('input');
        const label = document.createElement('label');
        const timeInfo = document.createElement('span');

        item.className = 'view-bundle-item';
        checkbox.type = 'checkbox';
        checkbox.value = bundle.bundleId;
        checkbox.checked = getSelectedReturnBundleIds().has(bundle.bundleId);
        checkbox.addEventListener('change', () => {
          const selectedReturnBundleIds = getSelectedReturnBundleIds();
          if (checkbox.checked) {
            selectedReturnBundleIds.add(bundle.bundleId);
          } else {
            selectedReturnBundleIds.delete(bundle.bundleId);
          }
        });

        label.className = 'view-bundle-label';
        label.textContent = `${bundle.zoneName} — ТКД ${bundle.tkdRange}`;

        timeInfo.className = 'view-bundle-time';
        timeInfo.textContent = `Взято: ${formatTime(bundle.takenAt)}`;

        item.appendChild(checkbox);
        item.appendChild(label);
        item.appendChild(timeInfo);
        viewBundles.appendChild(item);
      });

      viewButtons.innerHTML = '';

      const returnBtn = document.createElement('button');
      returnBtn.type = 'button';
      returnBtn.className = 'btn btn-return';
      returnBtn.textContent = 'Вернуть выбранные';
      returnBtn.addEventListener('click', async () => {
        const bundleIds = Array.from(getSelectedReturnBundleIds());
        if (!bundleIds.length) {
          alert('Выберите связки для возврата');
          return;
        }
        await returnKeys(bundleIds);
        setSelectedPerson(null);
        renderPeople();
        renderViewPanel();
      });

      const returnAllBtn = document.createElement('button');
      returnAllBtn.type = 'button';
      returnAllBtn.className = 'btn btn-return';
      returnAllBtn.textContent = 'Вернуть все';
      returnAllBtn.addEventListener('click', async () => {
        const bundleIds = personBundles.map((bundle) => bundle.bundleId);
        if (!bundleIds.length) {
          alert('У этого человека нет ключей');
          return;
        }
        if (confirm(`Вы уверены, что хотите вернуть все ${bundleIds.length} связок?`)) {
          await returnKeys(bundleIds);
          setSelectedPerson(null);
          renderPeople();
          renderViewPanel();
        }
      });

      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'btn btn-danger';
      closeBtn.textContent = 'Закрыть';
      closeBtn.addEventListener('click', () => {
        setSelectedPerson(null);
        renderPeople();
        renderViewPanel();
      });

      viewButtons.appendChild(returnBtn);
      viewButtons.appendChild(returnAllBtn);
      viewButtons.appendChild(closeBtn);
    }

    return {
      updateSelectedBundlesDisplay,
      renderBundleSelect,
      renderPeople,
      renderViewPanel,
    };
  }

  window.KeysUI = {
    init,
  };
})();
