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

    const isAppleMobileDevice = function () {
      const ua = String((navigator && navigator.userAgent) || '');
      const platform = String((navigator && navigator.platform) || '');
      const maxTouchPoints = Number((navigator && navigator.maxTouchPoints) || 0);
      return /iPhone|iPad|iPod/i.test(ua) || (platform === 'MacIntel' && maxTouchPoints > 1);
    };

    const navigateToMapUrl = function (url, popupWindow) {
      if (popupWindow && !popupWindow.closed) {
        popupWindow.location.href = url;
        return;
      }

      try {
        window.location.href = url;
      } catch (error) {
        window.open(url, '_blank');
      }
    };

    if (isAppleMobileDevice()) {
      const appleMapsUrl = `https://maps.apple.com/?daddr=${encodeURIComponent(address)}&dirflg=d`;
      window.location.href = appleMapsUrl;
      return;
    }

    const popupWindow = window.open('', '_blank');
    const openSearchUrl = function () {
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
      navigateToMapUrl(mapsUrl, popupWindow);
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
        navigateToMapUrl(mapsUrl, popupWindow);
      },
      openSearchUrl,
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 300000,
      }
    );
  }

  window.ZoneAccessViewHelpers = {
    copyCodeValue,
    openAddressMap,
  };
})();
