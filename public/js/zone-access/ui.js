(function () {
  'use strict';

  function init(config) {
    const {
      escapeHtml,
      formatAddress,
      formatTkdLineHtml,
      buildAddressCardTkdDetails,
      zoneAccessData,
      getCurrentZoneNum,
      setCurrentZoneNum,
      getZoneDisplayName,
      sortZoneAddresses,
      saveZoneAccessData,
      showToast,
      mountTkdFormRows,
      createTkdFormRowEl,
      collectTkdEntriesFromForm,
      validateTkdEntries,
      validateTkdForm,
      populateModalZoneSelect,
      onAuthRequired,
    } = config;

    let currentFormMode = { addNew: false, editIdx: -1 };

    function replaceNode(id) {
      const el = document.getElementById(id);
      if (!el || !el.parentNode) return el;

      const clone = el.cloneNode(true);
      el.parentNode.replaceChild(clone, el);
      return clone;
    }

    const accessAddressSearch = replaceNode('access-address-search');
    const accessAddressSearchResults = document.getElementById('access-address-search-results');
    const addAddressModal = document.getElementById('add-address-modal');
    const btnAddAddressAllZones = replaceNode('btn-add-address-all-zones');
    const btnAddAddressInZone = replaceNode('btn-add-address-in-zone');
    const closeAddAddressModal = replaceNode('close-add-address-modal');
    const modalAddZone = replaceNode('modal-add-zone');
    const modalAddAddress = document.getElementById('modal-add-address');
    const modalAddCode = document.getElementById('modal-add-code');
    const modalAddCancel = replaceNode('modal-add-cancel');
    const modalAddConfirm = replaceNode('modal-add-confirm');
    const voiceInputBtnModal = replaceNode('voice-input-btn');
    const voiceInputBtnEdit = replaceNode('voice-input-edit-address');
    const voiceInputBtnZoneForm = replaceNode('voice-input-zone-form');
    const editFormAddress = document.getElementById('access-form-address');
    const editFormCode = document.getElementById('access-form-code');
    const btnCancelEdit = replaceNode('btn-cancel-edit');
    const btnAddTkdRow = replaceNode('btn-add-tkd-row');
    const btnSaveAccess = replaceNode('btn-save-access');
    const validationModal = document.getElementById('validation-modal');
    const closeValidationModalBtn = replaceNode('close-validation-modal');
    const closeValidationBtn = replaceNode('close-validation-btn');
    const confirmDeleteModal = document.getElementById('confirm-delete-modal');
    const closeConfirmDeleteModalBtn = replaceNode('close-confirm-delete-modal');
    const confirmDeleteCancelBtn = replaceNode('confirm-delete-cancel');
    const confirmDeleteOkBtn = replaceNode('confirm-delete-ok');
    const closeZoneAccessModalBtn = replaceNode('close-zone-access-modal');
    const zoneAccessModalEl = document.getElementById('zone-access-modal');
    function copyCodeValue(code) {
      if (window.ZoneAccessViewHelpers && typeof window.ZoneAccessViewHelpers.copyCodeValue === 'function') {
        window.ZoneAccessViewHelpers.copyCodeValue(code, showToast);
        return;
      }
      const fallbackCopyTextToClipboard = (text) => {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.top = '0';
        textArea.style.left = '0';
        textArea.style.width = '2em';
        textArea.style.height = '2em';
        textArea.style.padding = '0';
        textArea.style.border = 'none';
        textArea.style.outline = 'none';
        textArea.style.boxShadow = 'none';
        textArea.style.background = 'transparent';
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          showToast(`Код "${text}" скопирован`);
        } catch (err) {
          showToast('Не удалось скопировать код');
        }
        document.body.removeChild(textArea);
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(() => {
          showToast(`Код "${code}" скопирован`);
        }).catch(() => {
          fallbackCopyTextToClipboard(code);
        });
        return;
      }

      fallbackCopyTextToClipboard(code);
    }

    function openAddressMap(address) {
      if (window.ZoneAccessViewHelpers && typeof window.ZoneAccessViewHelpers.openAddressMap === 'function') {
        window.ZoneAccessViewHelpers.openAddressMap(address);
        return;
      }
      if (!address) {
        alert('Адрес не найден');
        return;
      }

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${encodeURIComponent(address)}`;
            window.open(mapsUrl, '_blank');
          },
          (error) => {
            console.warn('Геолокация недоступна:', error);
            const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(address)}`;
            window.open(mapsUrl, '_blank');
          }
        );
      } else {
        const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(address)}`;
        window.open(mapsUrl, '_blank');
      }
    }

    function showZoneAccessView() {
      const currentZoneNum = getCurrentZoneNum();
      const addresses = zoneAccessData[currentZoneNum] || [];
      const titleEl = document.getElementById('zone-access-title');
      const addressesEl = document.getElementById('zone-addresses');
      const zoneModal = document.getElementById('zone-access-modal');
      const editForm = document.getElementById('zone-edit-form');

      if (titleEl) {
        titleEl.textContent = getZoneDisplayName(currentZoneNum);
      }

      if (!addressesEl) {
        console.error('zone-addresses element not found');
        return;
      }

      try {
        sortZoneAddresses(currentZoneNum);
      } catch (sortError) {
        console.error('Error sorting zone access view:', sortError);
      }

      try {
        if (addresses.length === 0) {
          if (zoneModal) zoneModal.classList.add('zone-modal--empty');
          addressesEl.innerHTML = `
            <div class="zone-empty">
              <div class="zone-empty-icon">🏠</div>
              <div class="zone-empty-text">Пока ничего нет</div>
              <div class="zone-empty-hint">Нажмите "Добавить адрес"</div>
            </div>
          `;
        } else {
          if (zoneModal) zoneModal.classList.remove('zone-modal--empty');
          const addressesHtml = addresses.map((addr, idx) => `
            <div class="address-card" data-idx="${idx}">
              <div class="address-card__header">
                <div class="address-card__info">
                  <span class="address-card__index">${idx + 1}.</span>
                  <span class="address-card__pin">📍</span>
                  <span class="address-card__street">${escapeHtml(formatAddress(addr.address))}</span>
                </div>
                <div class="address-card__chips">
                  ${addr.code ? `<div class="address-card__chip address-card__chip--code"><span class="address-card__chip-icon">🔑</span> Доступ: ${escapeHtml(addr.code)}</div>` : ''}
                </div>
                <div class="address-card__actions">
                  <button class="address-card__edit-btn" data-edit-idx="${idx}" title="Редактировать">✎</button>
                  <button class="address-card__delete-btn" data-delete-idx="${idx}" title="Удалить">🗑</button>
                  <button class="address-card__map-btn-accent" data-address="${escapeHtml(addr.address)}">🗺️</button>
                  <button class="address-card__expand-btn" data-expand="${idx}" title="Подробнее">▲</button>
                </div>
              </div>
              <div class="address-card__details">
                ${buildAddressCardTkdDetails(addr)}
              </div>
            </div>
          `).join('');
          const zoneHeader = addressesEl.querySelector('.zone-addresses-header');
          addressesEl.innerHTML = (zoneHeader ? zoneHeader.outerHTML : '<div class="zone-addresses-header"></div>') + addressesHtml;
        }
      } catch (e) {
        console.error('Error showing zone access view:', e);
        // Ensure we show at least an empty container even if there's an error
        if (addressesEl) {
          addressesEl.innerHTML = '<div class="zone-empty">Ошибка при загрузке адресов</div>';
        }
      }

      // Always ensure form is hidden and addresses are shown (most important part)
      if (editForm) {
        editForm.style.display = 'none';
      }
      if (addressesEl) {
        addressesEl.style.display = 'block';
      }
      if (zoneModal) {
        zoneModal.style.display = 'flex';
      }
      if (zoneAccessModalEl) {
        zoneAccessModalEl.classList.remove('zone-modal--form');
        zoneAccessModalEl.classList.remove('zone-modal--add-form');
      }
      // Re-setup event listeners for address cards
      if (addressesEl) {
        setupAddressCardListeners(addressesEl);
      }
    }

    function setupAddressCardListeners(addressesEl) {
      addressesEl.querySelectorAll('.address-card__edit-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          showZoneAccessEdit(false, parseInt(btn.dataset.editIdx, 10));
        });
      });

      addressesEl.querySelectorAll('.address-card__delete-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (zoneAccessDeleteModal && typeof zoneAccessDeleteModal.open === 'function') {
            zoneAccessDeleteModal.open(parseInt(btn.dataset.deleteIdx, 10));
          }
        });
      });

      addressesEl.querySelectorAll('.address-card__expand-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = parseInt(btn.dataset.expand, 10);
          const card = addressesEl.querySelector(`.address-card[data-idx="${idx}"]`);
          if (card) {
            card.classList.toggle('expanded');
            btn.classList.toggle('collapsed');
          }
        });
      });

      addressesEl.querySelectorAll('.address-card__phone').forEach((el) => {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          const code = el.dataset.code;
          if (!code) return;

          const digitsOnly = code.replace(/\D/g, '');
          const isPhone = digitsOnly.length >= 9 && (code.startsWith('+') || digitsOnly.length >= 9);

          if (isPhone) {
            if (confirm(`Позвонить по номеру ${code}?`)) {
              window.location.href = `tel:${code}`;
            }
          }
        });
      });

      addressesEl.querySelectorAll('.address-card__code-copy').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const code = btn.dataset.code;
          if (code) copyCodeValue(code);
        });
      });

      addressesEl.querySelectorAll('.address-card__map-btn, .address-card__map-btn-accent').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          let address = btn.dataset.address;
          if (!address) {
            const card = btn.closest('.address-card');
            const streetEl = card && card.querySelector('.address-card__street');
            if (streetEl) {
              address = streetEl.textContent.trim();
            }
          }
          if (address && window.ZoneAccessViewHelpers && typeof window.ZoneAccessViewHelpers.openAddressMap === 'function') {
            window.ZoneAccessViewHelpers.openAddressMap(address);
          }
        });
      });
      });
    }

    function returnToZoneAddressList() {
      const addressInputEl = document.getElementById('access-form-address');
      const codeInputEl = document.getElementById('access-form-code');
      const editIdxEl = document.getElementById('edit-address-idx');
      const tkdContainer = document.getElementById('tkd-entries-container');

      currentFormMode = { addNew: false, editIdx: -1 };

      if (addressInputEl) {
        addressInputEl.value = '';
        addressInputEl.classList.remove('input-error');
      }
      if (codeInputEl) {
        codeInputEl.value = '';
        codeInputEl.classList.remove('input-error');
      }
      if (editIdxEl) {
        editIdxEl.value = '';
      }
      if (tkdContainer) {
        tkdContainer.innerHTML = '';
      }
      if (zoneAccessModalEl) {
        zoneAccessModalEl.classList.remove('zone-modal--form');
        zoneAccessModalEl.classList.remove('zone-modal--add-form');
      }

      showZoneAccessView();
    }

    function setupFormErrorListeners() {
      const addressInput = document.getElementById('access-form-address');
      const codeInput = document.getElementById('access-form-code');
      const tkdContainer = document.getElementById('tkd-entries-container');

      if (addressInput) {
        addressInput.addEventListener('input', () => addressInput.classList.remove('input-error'));
      }
      if (codeInput) {
        codeInput.addEventListener('input', () => codeInput.classList.remove('input-error'));
      }
      if (tkdContainer) {
        tkdContainer.addEventListener('input', (e) => {
          if (e.target && (
            e.target.classList.contains('tkd-form-entrance') ||
            e.target.classList.contains('tkd-form-tkd') ||
            e.target.classList.contains('tkd-form-place')
          )) {
            e.target.classList.remove('input-error');
          }
        });
      }
    }

     const zoneAccessSearch = window.ZoneAccessSearch && typeof window.ZoneAccessSearch.init === 'function'
      ? window.ZoneAccessSearch.init({
          searchInput: accessAddressSearch,
          resultsEl: accessAddressSearchResults,
          zoneAccessData,
          formatAddress,
          formatTkdLineHtml,
          escapeHtml,
          setCurrentZoneNum,
          showZoneAccessView,
          getZoneDisplayName,
        })
      : null;
    const zoneAccessVoice = window.ZoneAccessVoice && typeof window.ZoneAccessVoice.init === 'function'
      ? window.ZoneAccessVoice.init({
        modalVoiceButton: voiceInputBtnModal,
        editVoiceButton: voiceInputBtnEdit,
        zoneFormVoiceButton: voiceInputBtnZoneForm,
        addAddressModal,
        modalAddressInput: modalAddAddress,
        modalCodeInput: modalAddCode,
        editAddressInput: editFormAddress,
        editCodeInput: editFormCode,
        getEditForm: function () {
          return document.getElementById('zone-edit-form');
        },
        showToast,
      })
: null;
    const zoneAccessAddAddressModal = window.ZoneAccessAddAddressModal && typeof window.ZoneAccessAddAddressModal.init === 'function'
      ? window.ZoneAccessAddAddressModal.init({
        addAddressModal,
        openButton: btnAddAddressAllZones,
        closeButton: closeAddAddressModal,
        cancelButton: modalAddCancel,
        confirmButton: modalAddConfirm,
        zoneInput: modalAddZone,
        addressInput: modalAddAddress,
        codeInput: modalAddCode,
        zoneAccessData,
        saveZoneAccessData,
        showToast,
        onAdded: function () {
          if (typeof setCurrentZoneNum === 'function') setCurrentZoneNum(currentZoneNum);
          showZoneAccessView();
        },
      })
      : null;
    const zoneAccessAddAddressModalInZone = window.ZoneAccessAddAddressModal && typeof window.ZoneAccessAddAddressModal.init === 'function'
      ? window.ZoneAccessAddAddressModal.init({
        addAddressModal,
        openButton: btnAddAddressInZone,
        closeButton: closeAddAddressModal,
        cancelButton: modalAddCancel,
        confirmButton: modalAddConfirm,
        zoneInput: modalAddZone,
        addressInput: modalAddAddress,
        codeInput: modalAddCode,
        zoneAccessData,
        saveZoneAccessData,
        showToast,
        getZone: function () { return currentZoneNum; },
        onAdded: function () {
          if (typeof setCurrentZoneNum === 'function') setCurrentZoneNum(currentZoneNum);
          showZoneAccessView();
        },
      })
      : null;
    const zoneAccessDeleteModal = window.ZoneAccessDeleteModal && typeof window.ZoneAccessDeleteModal.init === 'function'
      ? window.ZoneAccessDeleteModal.init({
        confirmDeleteModal,
        closeButton: closeConfirmDeleteModalBtn,
        cancelButton: confirmDeleteCancelBtn,
        confirmButton: confirmDeleteOkBtn,
        getCurrentZoneNum,
        zoneAccessData,
        saveZoneAccessData,
        onDeleted: showZoneAccessView,
      })
      : null;

    if (btnCancelEdit) {
      btnCancelEdit.addEventListener('click', () => {
        returnToZoneAddressList();
      });
    }

    if (btnAddTkdRow) {
      btnAddTkdRow.addEventListener('click', () => {
        const container = document.getElementById('tkd-entries-container');
        if (container) container.appendChild(createTkdFormRowEl({}, false));
      });
    }

    if (btnSaveAccess) {
      btnSaveAccess.addEventListener('click', async () => {
        const addressInputEl = document.getElementById('access-form-address');
        const codeInputEl = document.getElementById('access-form-code');
        const editIdxEl = document.getElementById('edit-address-idx');
        const currentZoneNum = getCurrentZoneNum();

        if (!addressInputEl || !codeInputEl || !editIdxEl) {
          console.error('Form elements not found');
          return;
        }

        const address = addressInputEl.value.trim();
        const code = codeInputEl.value.trim();
        const editIdx = editIdxEl.value;
        let hasError = false;

        addressInputEl.classList.remove('input-error');
        codeInputEl.classList.remove('input-error');

        if (!address) {
          addressInputEl.classList.add('input-error');
          hasError = true;
        }
        if (!code) {
          codeInputEl.classList.add('input-error');
          hasError = true;
        }
        if (hasError) return;

        if (!zoneAccessData[currentZoneNum]) {
          zoneAccessData[currentZoneNum] = [];
        }

        let tkdEntries = [];
        if (editIdx !== '') {
          const formValidation = validateTkdForm();
          if (!formValidation.valid) return;

          tkdEntries = collectTkdEntriesFromForm();
          const validationErrors = validateTkdEntries(tkdEntries, currentZoneNum, parseInt(editIdx, 10));
          if (validationErrors.length > 0) {
            const listEl = document.getElementById('validation-error-list');
            if (validationModal && listEl) {
              listEl.innerHTML = '';
              validationErrors.forEach((err) => {
                const message = typeof err === 'string' ? err : err.message;
                const item = document.createElement('div');
                item.className = 'validation-error-item';
                item.innerHTML = `
                  <span class="error-icon">⚠️</span>
                  <span>${escapeHtml(message)}</span>
                `;
                listEl.appendChild(item);
              });
              validationModal.style.display = 'flex';
            }
            return;
          }
        }

        const addrData = { address, tkdEntries };
        if (code) addrData.code = code;

        if (editIdx !== '') {
          zoneAccessData[currentZoneNum][parseInt(editIdx, 10)] = addrData;
        } else {
          zoneAccessData[currentZoneNum].push(addrData);
        }

        try {
          await saveZoneAccessData();
          showToast('Сохранено');
          returnToZoneAddressList();
        } catch (error) {
          if (error.message && error.message.includes('Authentication required')) {
            if (onAuthRequired && typeof onAuthRequired === 'function') {
              onAuthRequired();
            } else {
              showToast('Требуется вход в систему');
            }
          } else {
            showToast('Ошибка сохранения: ' + (error.message || 'Unknown error'));
            console.error('Error saving zone access data:', error);
          }
        }
      });
    }

    if (closeValidationModalBtn && validationModal) {
      closeValidationModalBtn.addEventListener('click', () => {
        validationModal.style.display = 'none';
      });
    }

    if (closeValidationBtn && validationModal) {
      closeValidationBtn.addEventListener('click', () => {
        validationModal.style.display = 'none';
      });
    }

    if (validationModal) {
      validationModal.addEventListener('click', (e) => {
        if (e.target === validationModal) {
          validationModal.style.display = 'none';
        }
      });
    }

    if (closeZoneAccessModalBtn && zoneAccessModalEl) {
      closeZoneAccessModalBtn.addEventListener('click', () => {
        zoneAccessModalEl.style.display = 'none';
      });
    }
    if (zoneAccessModalEl) {
      zoneAccessModalEl.addEventListener('click', (e) => {
        if (e.target.id === 'zone-access-modal') {
          e.target.style.display = 'none';
        }
      });
    }    if (populateModalZoneSelect) {
      populateModalZoneSelect();
    }

    setupFormErrorListeners();

    return {
      showZoneAccessView,
      showZoneAccessEdit,
      clearSearch: function () {
        if (zoneAccessSearch && typeof zoneAccessSearch.clear === 'function') {
          zoneAccessSearch.clear();
        }
      },
      stopVoiceInput: function () {
        if (zoneAccessVoice && typeof zoneAccessVoice.stop === 'function') {
          zoneAccessVoice.stop();
        }
      },
      closeDeleteModal: function () {
        if (zoneAccessDeleteModal && typeof zoneAccessDeleteModal.close === 'function') {
          zoneAccessDeleteModal.close();
        }
      },
      hideAddAddressModal: function () {
        if (zoneAccessAddAddressModal && typeof zoneAccessAddAddressModal.hide === 'function') {
          zoneAccessAddAddressModal.hide();
        }
      },
      getCurrentFormMode: function () {
        return { ...currentFormMode };
      },
    };
  }

  window.ZoneAccessUI = {
    init,
  };
})();






