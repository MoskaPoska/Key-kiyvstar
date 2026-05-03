(function () {
  'use strict';

  function fallbackCopyTextToClipboard(text, showToast) {
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
      if (typeof showToast === 'function') {
        showToast(`Code "${text}" copied`);
      }
    } catch (err) {
      if (typeof showToast === 'function') {
        showToast('Failed to copy code');
      }
    }

    document.body.removeChild(textArea);
  }

  function copyCodeValue(code, showToast) {
    if (!code) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(() => {
        if (typeof showToast === 'function') {
          showToast(`Code "${code}" copied`);
        }
      }).catch(() => {
        fallbackCopyTextToClipboard(code, showToast);
      });
      return;
    }

    fallbackCopyTextToClipboard(code, showToast);
  }

  function openAddressMap(address) {
    if (!address) {
      alert('Address not found');
      return;
    }

    const openSearchUrl = function () {
      const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(address)}`;
      window.open(mapsUrl, '_blank');
    };

    if (!navigator.geolocation) {
      openSearchUrl();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${encodeURIComponent(address)}`;
        window.open(mapsUrl, '_blank');
      },
      openSearchUrl
    );
  }

  window.ZoneAccessViewHelpers = {
    copyCodeValue,
    openAddressMap,
  };
})();
