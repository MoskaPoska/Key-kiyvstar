(function () {
  'use strict';

  const escapeHtml = window.AppUtils.escapeHtml;

  function formatAddress(address) {
    if (!address) return '';

    const match = String(address).match(/^(.+?)\s+(\d+.*)$/);
    if (match) {
      const street = match[1].trim();
      const building = match[2].trim();
      return street + ', ' + building;
    }

    return String(address);
  }

  function parseAddressSortParts(address) {
    const raw = String(address || '').trim();
    const match = raw.match(/^(.+?)\s+(\d+)([^\d]*)$/);

    if (!match) {
      return {
        street: raw.toLowerCase(),
        houseNumber: Number.POSITIVE_INFINITY,
        suffix: ''
      };
    }

    return {
      street: match[1].trim().toLowerCase(),
      houseNumber: parseInt(match[2], 10),
      suffix: match[3].trim().toLowerCase()
    };
  }

  function sortZoneAddresses(zoneAccessData, zoneNum) {
    const addresses = zoneAccessData[zoneNum];
    if (!Array.isArray(addresses) || addresses.length < 2) return;

    addresses.sort((a, b) => {
      const left = parseAddressSortParts(a && a.address);
      const right = parseAddressSortParts(b && b.address);

      const streetCompare = left.street.localeCompare(right.street, 'ru');
      if (streetCompare !== 0) return streetCompare;

      if (left.houseNumber !== right.houseNumber) {
        return left.houseNumber - right.houseNumber;
      }

      return left.suffix.localeCompare(right.suffix, 'ru');
    });
  }

  function entranceToCircled(entrance) {
    const n = parseInt(String(entrance ?? '').trim(), 10);
    if (!Number.isFinite(n) || n < 1 || n > 20) {
      return String(entrance ?? '').trim();
    }

    return String.fromCharCode(0x245f + n);
  }

  function getDisplayTkdEntries(addr) {
    const raw = addr && Array.isArray(addr.tkdEntries) ? addr.tkdEntries : [];
    const entries = raw.filter(
      (entry) =>
        entry &&
        (String(entry.entrance || '').trim() ||
          String(entry.tkd || '').trim() ||
          String(entry.place || '').trim())
    );

    const tkdWithEntrance = new Set(
      entries
        .filter((entry) => String(entry.entrance || '').trim() && String(entry.tkd || '').trim())
        .map((entry) => String(entry.tkd || '').trim().toLowerCase())
    );

    return entries.filter((entry) => {
      const entrance = String(entry.entrance || '').trim();
      const tkd = String(entry.tkd || '').trim().toLowerCase();
      return entrance || !tkd || !tkdWithEntrance.has(tkd);
    });
  }

  function formatTkdLineHtml(entrance, tkd, place) {
    const entranceNum = parseInt(String(entrance || '').trim(), 10);
    const tkdPart = escapeHtml(String(tkd || '').trim());
    const placePart = escapeHtml(String(place || '').trim());

    let entranceDisplay = '';
    if (Number.isFinite(entranceNum) && entranceNum >= 1 && entranceNum <= 99) {
      entranceDisplay = `<span class="entrance-circle">${entranceNum}</span>`;
    } else if (entrance) {
      const txt = escapeHtml(String(entrance).trim());
      entranceDisplay = `<span class="entrance-circle">${txt}</span>`;
    }

    const textPart = tkdPart ? `<span class="tkd-code">${tkdPart}</span>` : '';
    const placeText = placePart ? `<span class="tkd-place"> — ${placePart}</span>` : '';
    const pdText = `<span class="tkd-text">пд.</span>`;

    return `${entranceDisplay}${pdText}${textPart ? ' ' + textPart : ''}${placeText}`;
  }

  function buildAddressCardTkdDetails(addr) {
    const entries = getDisplayTkdEntries(addr);

    if (!entries.length) {
      return '<div class="address-card__tkd-empty">Нет данных ТКД — добавьте в форме редактирования (✎).</div>';
    }

    let html = '<div class="address-card__tkd-list">';
    entries.forEach((entry, idx) => {
      html += `<div class="address-card__tkd-item">${formatTkdLineHtml(entry.entrance, entry.tkd, entry.place)}</div>`;
      if (idx < entries.length - 1) {
        html += '<div class="address-card__tkd-separator"></div>';
      }
    });
    html += '</div>';
    return html;
  }

  window.ZoneAccessHelpers = {
    buildAddressCardTkdDetails,
    entranceToCircled,
    formatAddress,
    formatTkdLineHtml,
    getDisplayTkdEntries,
    parseAddressSortParts,
    sortZoneAddresses,
  };
})();
