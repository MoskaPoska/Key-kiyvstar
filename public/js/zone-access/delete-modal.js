(function () {
  'use strict';

  function init(config) {
    const {
      confirmDeleteModal,
      closeButton,
      cancelButton,
      confirmButton,
      getCurrentZoneNum,
      zoneAccessData,
      saveZoneAccessData,
      onDeleted,
    } = config;

    let pendingAddressDelete = null;

    function close() {
      const messageEl = document.getElementById('confirm-delete-message');
      pendingAddressDelete = null;
      if (messageEl) {
        messageEl.textContent = '';
      }
      if (confirmDeleteModal) {
        confirmDeleteModal.style.display = 'none';
      }
    }

    function open(addressIdx) {
      const messageEl = document.getElementById('confirm-delete-message');
      const addresses = zoneAccessData[getCurrentZoneNum()] || [];
      const address = addresses[addressIdx];

      if (!confirmDeleteModal || !messageEl || !address) return;

      pendingAddressDelete = addressIdx;
      messageEl.textContent = 'Удалить этот адрес?';
      confirmDeleteModal.style.display = 'flex';
    }

    async function confirmDelete() {
      const currentZoneNum = getCurrentZoneNum();
      if (pendingAddressDelete === null) return;

      const addresses = zoneAccessData[currentZoneNum] || [];
      if (pendingAddressDelete < 0 || pendingAddressDelete >= addresses.length) {
        close();
        return;
      }

      addresses.splice(pendingAddressDelete, 1);
      await saveZoneAccessData();
      close();
      if (typeof onDeleted === 'function') {
        onDeleted();
      }
    }

    if (closeButton) {
      closeButton.addEventListener('click', close);
    }
    if (cancelButton) {
      cancelButton.addEventListener('click', close);
    }
    if (confirmButton) {
      confirmButton.addEventListener('click', confirmDelete);
    }
    if (confirmDeleteModal) {
      confirmDeleteModal.addEventListener('click', (event) => {
        if (event.target === confirmDeleteModal) {
          close();
        }
      });
    }

    return {
      open,
      close,
    };
  }

  window.ZoneAccessDeleteModal = {
    init,
  };
})();
