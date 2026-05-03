(function () {
  'use strict';

  function init(config) {
    const {
      addAddressModal,
      openButton,
      closeButton,
      cancelButton,
      confirmButton,
      zoneInput,
      addressInput,
      codeInput,
      zoneAccessData,
      saveZoneAccessData,
      showToast,
    } = config;

    function hideModal() {
      if (addAddressModal) {
        addAddressModal.style.display = 'none';
      }
    }

    function showModal() {
      if (zoneInput) zoneInput.value = '';
      if (addressInput) addressInput.value = '';
      if (codeInput) codeInput.value = '';
      if (addAddressModal) {
        addAddressModal.style.display = '';
      }
      if (zoneInput) zoneInput.focus();
    }

    if (openButton) {
      openButton.addEventListener('click', showModal);
    }

    if (zoneInput) {
      zoneInput.addEventListener('input', () => {
        zoneInput.value = zoneInput.value.replace(/\D/g, '');
      });
    }

    if (closeButton) {
      closeButton.addEventListener('click', hideModal);
    }

    if (cancelButton) {
      cancelButton.addEventListener('click', hideModal);
    }

     function normalizeAddressKey(value) {
       if (!value) return '';
       let s = String(value).toLowerCase().trim();
       if (!s) return '';
       s = s.replace(/ё/g, 'е').replace(/і/g, 'и');
       s = s.replace(/\b(ул(ица)?|вул(иця)?|пр(осп(ект)?)?|просп|бульв(ар)?|б-р|пер(еулок)?|пров(улок)?|ш(оссе)?|наб(ережная)?|пл(ощадь|оща)?|мкр|мікрорайон|микрорайон|г|город|місто|м)\.?/g, ' ');
       s = s.replace(/\b(д(ом)?|буд(инок)?|буд|№|n|no)\.?\s*(?=\d)/g, ' ');
       s = s.replace(/\b(корп(ус)?|к)\.?\s*(?=\d)/g, 'к');
       s = s.replace(/\b(стр(оение)?|с)\.?\s*(?=\d)/g, 'с');
       s = s.replace(/\b(литер[аы]?|литера|лит)\.?\s*/g, '');
       s = s.replace(/[.,;:"'«»()\/\\-]+/g, ' ');
       s = s.replace(/\s+/g, ' ').trim();
       if (!s) return '';
       const houseRe = /(\d+)\s*([а-яa-z]?)\s*(?:к\s*(\d+))?\s*(?:с\s*(\d+))?/g;
       const houses = [];
       let match;
       while ((match = houseRe.exec(s)) !== null) {
         const num = match[1];
         const letter = (match[2] || '').trim();
         const korp = match[3] ? 'к' + match[3] : '';
         const stroe = match[4] ? 'с' + match[4] : '';
         houses.push(num + letter + korp + stroe);
       }
       const street = s
         .replace(/\d+\s*[а-яa-z]?\s*(?:к\s*\d+)?\s*(?:с\s*\d+)?/g, ' ')
         .replace(/\s+/g, '')
         .trim();
       if (!houses.length) return street;
       return street + '|' + houses.sort().join(',');
     }

     if (confirmButton) {
       confirmButton.addEventListener('click', async () => {
         const zoneNum = zoneInput ? zoneInput.value.trim() : '';
         const address = addressInput ? addressInput.value.trim() : '';
         const code = codeInput ? codeInput.value.trim() : '';

         if (!zoneNum) {
           showToast('Введи номер зоны');
           return;
         }
         if (!/^\d+$/.test(zoneNum)) {
           showToast('Номер зоны должен содержать только цифры');
           return;
         }
         if (!address) {
           showToast('Введи адрес');
           return;
         }

         if (!zoneAccessData[zoneNum]) {
           zoneAccessData[zoneNum] = [];
         }

         const normalizedNew = normalizeAddressKey(address);
         const duplicate = normalizedNew
           ? zoneAccessData[zoneNum].find(
               (entry) => normalizeAddressKey(entry && entry.address) === normalizedNew
             )
           : null;
         if (duplicate) {
           showToast(`Адрес "${duplicate.address}" уже есть в Зоне ${zoneNum}`);
           if (addressInput) {
             addressInput.focus();
             addressInput.select();
           }
           return;
         }

         zoneAccessData[zoneNum].push({
           address,
           code: code || '',
           tkdEntries: [],
         });

         try {
           await saveZoneAccessData();
           showToast(`Адрес "${address}" добавлен в Зону ${zoneNum}`);
           hideModal();
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

    if (addAddressModal) {
      addAddressModal.addEventListener('click', (event) => {
        if (event.target === addAddressModal) {
          hideModal();
        }
      });
    }

    return {
      hide: hideModal,
      show: showModal,
    };
  }

  window.ZoneAccessAddAddressModal = {
    init,
  };
})();
