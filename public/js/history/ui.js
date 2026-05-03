(function () {
  'use strict';

  function init(config) {
    const {
      escapeHtml,
      getHistory,
      getHistoryFilterPerson,
      setHistoryFilterPerson,
      getHistoryFilterBundle,
      setHistoryFilterBundle,
    } = config;

    function replaceNode(id) {
      const el = document.getElementById(id);
      if (!el || !el.parentNode) return el;

      const clone = el.cloneNode(true);
      el.parentNode.replaceChild(clone, el);
      return clone;
    }

    const historySection = document.getElementById('history-section');
    const historyList = document.getElementById('history-list');
    const toggleHistoryBtn = replaceNode('toggle-history-btn');
    const toggleHistoryHideBtn = replaceNode('toggle-history');
    const historyPersonFilter = replaceNode('history-person-filter');
    const historyBundleFilter = replaceNode('history-bundle-filter');

    function renderHistory() {
      const history = getHistory();
      if (!historyList) return;

      if (history.length === 0) {
        historyList.innerHTML = '<p class="empty-message">История пуста</p>';
        return;
      }

      historyList.innerHTML = '';

      let filteredHistory = history;
      const historyFilterBundle = getHistoryFilterBundle();
      const historyFilterPerson = getHistoryFilterPerson();

      if (historyFilterBundle) {
        filteredHistory = filteredHistory.filter(
          (item) => item.bundleId && item.bundleId.includes(historyFilterBundle)
        );
      }
      if (historyFilterPerson) {
        filteredHistory = filteredHistory.filter((item) => item.personName === historyFilterPerson);
      }

      filteredHistory
        .slice()
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .forEach((item) => {
          const el = document.createElement('div');
          el.className = 'history-item';

          const date = new Date(item.timestamp);
          const dateStr = date.toLocaleDateString('uk-UA');
          const timeStr = date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });

          let bundleDisplay = item.bundleId || '';
          if (bundleDisplay.startsWith('zone_')) {
            const parts = bundleDisplay.replace('zone_', '').split('_');
            if (parts.length >= 2) {
              const zoneNum = parts[0];
              const tkdRange = parts.slice(1).join('_');
              bundleDisplay = `${zoneNum}_${tkdRange}`;
            }
          }

          const actionText = item.action === 'take' ? 'Взял' : 'Вернул';
          const actionClass = item.action === 'take' ? 'action-take' : 'action-return';

          el.innerHTML = `
            <span class="history-person">${escapeHtml(item.personName || 'Неизвестно')}</span>
            <span class="history-action ${actionClass}">${actionText}</span>
            <span class="history-bundle">${escapeHtml(bundleDisplay)}</span>
            <span class="history-time">${dateStr} ${timeStr}</span>
          `;

          historyList.appendChild(el);
        });
    }

    function updateHistoryPersonFilter() {
      const history = getHistory();
      if (!historyPersonFilter) return;

      const currentValue = historyPersonFilter.value;
      historyPersonFilter.innerHTML = '<option value="">Все сотрудники</option>';

      const uniquePeople = [...new Set(history.map((item) => item.personName).filter(Boolean))].sort();
      uniquePeople.forEach((person) => {
        const opt = document.createElement('option');
        opt.value = person;
        opt.textContent = person;
        historyPersonFilter.appendChild(opt);
      });

      if (currentValue && uniquePeople.includes(currentValue)) {
        historyPersonFilter.value = currentValue;
      } else if (getHistoryFilterPerson()) {
        historyPersonFilter.value = getHistoryFilterPerson();
      }
    }

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

    if (toggleHistoryHideBtn && historySection) {
      toggleHistoryHideBtn.addEventListener('click', () => {
        historySection.style.display = 'none';
        if (toggleHistoryBtn) {
          toggleHistoryBtn.classList.remove('active');
        }
      });
    }

    if (historyPersonFilter) {
      historyPersonFilter.addEventListener('change', () => {
        setHistoryFilterPerson(historyPersonFilter.value);
        renderHistory();
      });
    }

    if (historyBundleFilter) {
      historyBundleFilter.addEventListener('input', () => {
        setHistoryFilterBundle(historyBundleFilter.value.trim());
        renderHistory();
      });
    }

    return {
      renderHistory,
      updateHistoryPersonFilter,
    };
  }

  window.HistoryUI = {
    init,
  };
})();
