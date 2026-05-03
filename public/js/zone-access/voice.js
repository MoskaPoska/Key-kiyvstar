(function () {
  'use strict';

  function init(config) {
    const {
      modalVoiceButton,
      editVoiceButton,
      zoneFormVoiceButton,
      addAddressModal,
      modalAddressInput,
      modalCodeInput,
      editAddressInput,
      editCodeInput,
      getEditForm,
      showToast,
    } = config;

    if (!window.VoiceInput || typeof window.VoiceInput.attach !== 'function') {
      if (modalVoiceButton) modalVoiceButton.style.display = 'none';
      if (editVoiceButton) editVoiceButton.style.display = 'none';
      if (zoneFormVoiceButton) zoneFormVoiceButton.style.display = 'none';
      return null;
    }

    const controllers = [];

    function attachIfPresent(button, options) {
      if (!button) return;
      controllers.push(window.VoiceInput.attach(button, options));
    }

    attachIfPresent(modalVoiceButton, {
      lang: 'ru-RU',
      fallbackLang: 'uk-UA',
      fields: {
        address: modalAddressInput,
        code: modalCodeInput,
      },
      isActive: () => {
        if (!addAddressModal) return false;
        const display = addAddressModal.style.display;
        return display === '' || display === 'block' || display === 'flex';
      },
      showToast: typeof showToast === 'function' ? showToast : () => {},
    });

    const editTargets = {
      lang: 'ru-RU',
      fallbackLang: 'uk-UA',
      fields: {
        address: editAddressInput,
        code: editCodeInput,
      },
      isActive: () => {
        const editForm = typeof getEditForm === 'function' ? getEditForm() : null;
        if (!editForm) return false;
        const display = editForm.style.display;
        return display === '' || display === 'block' || display === 'flex';
      },
      showToast: typeof showToast === 'function' ? showToast : () => {},
    };

    attachIfPresent(editVoiceButton, editTargets);
    attachIfPresent(zoneFormVoiceButton, editTargets);

    return {
      stop: function () {
        controllers.forEach((controller) => {
          if (controller && typeof controller.stop === 'function') {
            controller.stop();
          }
        });
      },
      destroy: function () {
        controllers.forEach((controller) => {
          if (controller && typeof controller.destroy === 'function') {
            controller.destroy();
          }
        });
      },
    };
  }

  window.ZoneAccessVoice = {
    init,
  };
})();
