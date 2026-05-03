(function () {
  'use strict';

  function init(config) {
    const {
      escapeHtml,
      getPeople,
      getCurrentUser,
      isAdmin,
      login,
      logout,
      addPerson,
      updatePerson,
      deletePerson,
      changePassword,
      onAfterLogin,
      renderViewPanel,
    } = config;

    let currentEditPersonId = null;

    function replaceNode(id) {
      const el = document.getElementById(id);
      if (!el || !el.parentNode) return el;

      const clone = el.cloneNode(true);
      el.parentNode.replaceChild(clone, el);
      return clone;
    }

    const loginScreen = document.getElementById('login-screen');
    const btnLogin = replaceNode('btn-login');
    const btnLogout = replaceNode('btn-logout');
    const loginNameInput = replaceNode('login-name');
    const loginPasswordInput = replaceNode('login-password');
    const peopleModal = document.getElementById('people-modal');
    const btnManagePeople = replaceNode('btn-manage-people');
    const closePeopleModal = replaceNode('close-people-modal');
    const newPersonName = replaceNode('new-person-name');
    const newPersonPhone = replaceNode('new-person-phone');
    const newPersonPassword = replaceNode('new-person-password');
    const newPersonRole = replaceNode('new-person-role');
    const btnAddPerson = replaceNode('btn-add-person');
    const peopleManageList = document.getElementById('people-manage-list');
    const personName = document.getElementById('person-name');
    const passwordModal = document.getElementById('password-modal');
    const closePasswordModal = replaceNode('close-password-modal');
    const passwordModalCurrent = document.getElementById('password-modal-current');
    const passwordModalNew = replaceNode('password-modal-new');
    const passwordModalCancel = replaceNode('password-modal-cancel');
    const passwordModalSave = replaceNode('password-modal-save');
    const editPersonModal = document.getElementById('edit-person-modal');
    const closeEditPersonModal = replaceNode('close-edit-person-modal');
    const editPersonModalName = replaceNode('edit-person-modal-name');
    const editPersonModalPhone = replaceNode('edit-person-modal-phone');
    const editPersonModalRole = document.getElementById('edit-person-modal-role');
    const editPersonModalCancel = replaceNode('edit-person-modal-cancel');
    const editPersonModalSave = replaceNode('edit-person-modal-save');

    function updateUI() {
      if (!loginScreen) return;
      loginScreen.style.display = getCurrentUser() ? 'none' : 'flex';
    }

    function renderPeopleSelect() {
      if (!personName) return;

      const currentUser = getCurrentUser();
      const currentValue = personName.value;
      let peopleToShow = getPeople();

      if (!isAdmin()) {
        peopleToShow = currentUser
          ? peopleToShow.filter((person) => person.name === currentUser.name)
          : [];
      }

      const placeholderOpt = document.createElement('option');
      placeholderOpt.value = '';
      placeholderOpt.disabled = true;
      placeholderOpt.selected = !currentValue;
      placeholderOpt.textContent = 'Выбери сотрудника';

      personName.innerHTML = '';
      personName.appendChild(placeholderOpt);

      peopleToShow.forEach((person) => {
        const opt = document.createElement('option');
        opt.value = person.name;
        opt.textContent = person.name;
        opt.dataset.phone = person.phone || '';
        personName.appendChild(opt);
      });

      if (currentValue && peopleToShow.some((person) => person.name === currentValue)) {
        placeholderOpt.selected = false;
        personName.value = currentValue;
      }
    }

    function closePasswordModalFn() {
      if (passwordModal) {
        passwordModal.style.display = 'none';
      }
      currentEditPersonId = null;
    }

    function openPasswordModal(person) {
      currentEditPersonId = person.id;
      if (passwordModalCurrent) {
        passwordModalCurrent.textContent = 'Введите новый пароль для сброса.';
      }
      if (passwordModalNew) {
        passwordModalNew.value = '';
      }
      if (passwordModal) {
        passwordModal.style.display = 'flex';
      }
    }

    function clearEditPersonForm() {
      if (editPersonModalName) editPersonModalName.value = '';
      if (editPersonModalPhone) editPersonModalPhone.value = '';
      if (editPersonModalRole) editPersonModalRole.value = '';
      if (editPersonModalName) editPersonModalName.classList.remove('input-error');
      if (editPersonModalPhone) editPersonModalPhone.classList.remove('input-error');
      if (editPersonModalRole) editPersonModalRole.classList.remove('input-error');
    }

    function closeEditPersonModalFn() {
      if (editPersonModal) {
        editPersonModal.style.display = 'none';
      }
      clearEditPersonForm();
      currentEditPersonId = null;
    }

    function openEditPersonModal(person) {
      currentEditPersonId = person.id;
      if (editPersonModalName) editPersonModalName.value = person.name;
      if (editPersonModalPhone) editPersonModalPhone.value = person.phone || '';
      if (editPersonModal) {
        editPersonModal.style.display = 'flex';
      }
    }

    function renderPeopleManageList() {
      if (!peopleManageList) return;

      const people = getPeople();
      peopleManageList.innerHTML = '';

      if (!people.length) {
        peopleManageList.innerHTML = '<p class="empty-message">Список сотрудников пуст</p>';
        return;
      }

      const isCurrentUserAdmin = isAdmin();
      people.forEach((person) => {
        const item = document.createElement('div');
        item.className = 'person-manage-item';
        item.innerHTML = `
          <div class="person-manage-header">
            <span class="person-manage-name">${escapeHtml(person.name)}</span>
            <span class="person-manage-role">${person.isAdmin ? 'ADMIN' : 'USER'}</span>
          </div>
          <div class="person-manage-details">
            <span class="person-manage-phone">${person.phone ? escapeHtml(person.phone) : '—'}</span>
          </div>
          ${isCurrentUserAdmin ? `
          <label class="admin-checkbox">
            <input type="checkbox" data-id="${person.id}" ${person.isAdmin ? 'checked' : ''}> Админ
          </label>
          ` : ''}
          ${isCurrentUserAdmin ? `
          <div class="person-manage-actions">
            <button type="button" class="btn-edit" data-id="${person.id}" title="Редактировать">✏️</button>
            <button type="button" class="btn-change-password" data-id="${person.id}" title="Сменить пароль">🔑</button>
            <button type="button" class="btn-delete" data-id="${person.id}" title="Удалить">🗑️</button>
          </div>
          ` : ''}
        `;
        peopleManageList.appendChild(item);
      });

      peopleManageList.querySelectorAll('.btn-edit').forEach((btn) => {
        btn.addEventListener('click', () => {
          if (!isAdmin()) return;
          const id = parseInt(btn.dataset.id, 10);
          const person = getPeople().find((item) => item.id === id);
          if (person) {
            openEditPersonModal(person);
          }
        });
      });

      peopleManageList.querySelectorAll('.btn-change-password').forEach((btn) => {
        btn.addEventListener('click', () => {
          if (!isAdmin()) return;
          const id = parseInt(btn.dataset.id, 10);
          const person = getPeople().find((item) => item.id === id);
          if (person) {
            openPasswordModal(person);
          }
        });
      });

      peopleManageList.querySelectorAll('.btn-delete').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!isAdmin()) return;
          const id = parseInt(btn.dataset.id, 10);
          const row = btn.closest('.person-manage-item');
          const nameEl = row ? row.querySelector('.person-manage-name') : null;
          const personNameValue = nameEl ? nameEl.textContent : '';

          if (confirm('Удалить сотрудника ' + personNameValue + '?')) {
            await deletePerson(id);
          }
        });
      });

      peopleManageList.querySelectorAll('.admin-checkbox input').forEach((checkbox) => {
        checkbox.addEventListener('change', async () => {
          if (!isAdmin()) return;
          const id = parseInt(checkbox.dataset.id, 10);
          const person = getPeople().find((item) => item.id === id);
          if (person) {
            await updatePerson(id, person.name, person.phone, checkbox.checked);
          }
        });
      });
    }

    if (btnLogin) {
      btnLogin.addEventListener('click', async () => {
        const name = loginNameInput ? loginNameInput.value.trim() : '';
        const password = loginPasswordInput ? loginPasswordInput.value : '';

        if (!name || !password) {
          alert('Заполните все поля');
          return;
        }

        const success = await login(name, password);
        if (success) {
          await onAfterLogin();
          renderPeopleSelect();
        }
      });
    }

    if (loginPasswordInput && btnLogin) {
      loginPasswordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          btnLogin.click();
        }
      });
    }

    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        logout();
      });
    }

    if (btnManagePeople && peopleModal) {
      btnManagePeople.addEventListener('click', () => {
        renderPeopleManageList();
        peopleModal.style.display = 'flex';
      });
    }

    if (closePeopleModal && peopleModal) {
      closePeopleModal.addEventListener('click', () => {
        peopleModal.style.display = 'none';
      });
      peopleModal.addEventListener('click', (e) => {
        if (e.target === peopleModal) {
          peopleModal.style.display = 'none';
        }
      });
    }

    if (btnAddPerson && newPersonName) {
      btnAddPerson.addEventListener('click', async () => {
        if (!isAdmin()) {
          alert('Только администратор может добавлять сотрудников');
          return;
        }

        const name = newPersonName.value.trim();
        const phone = newPersonPhone ? newPersonPhone.value.trim() : '';
        const password = newPersonPassword ? newPersonPassword.value.trim() : '';
        const role = newPersonRole ? newPersonRole.value : 'USER';
        const isAdminValue = role === 'ADMIN';

        if (!name) {
          alert('Введите ФИО сотрудника');
          return;
        }
        if (!password || password.length < 4) {
          alert('Введите пароль (минимум 4 символа)');
          return;
        }

        await addPerson(name, phone, isAdminValue, password);
        newPersonName.value = '';
        if (newPersonPhone) newPersonPhone.value = '';
        if (newPersonPassword) newPersonPassword.value = '';
        if (newPersonRole) newPersonRole.value = 'USER';
      });

      newPersonName.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          btnAddPerson.click();
        }
      });
    }

    if (closePasswordModal && passwordModal) {
      closePasswordModal.addEventListener('click', closePasswordModalFn);
    }
    if (passwordModalCancel && passwordModal) {
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
        const newPassword = passwordModalNew ? passwordModalNew.value : '';
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
    if (passwordModalNew && passwordModalSave) {
      passwordModalNew.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          passwordModalSave.click();
        }
      });
    }

    if (closeEditPersonModal) {
      closeEditPersonModal.addEventListener('click', closeEditPersonModalFn);
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
        const name = editPersonModalName ? editPersonModalName.value.trim() : '';
        const phone = editPersonModalPhone ? editPersonModalPhone.value.trim() : '';

        if (!name) {
          alert('Введите ФИО сотрудника');
          return;
        }

        if (currentEditPersonId !== null) {
          await updatePerson(currentEditPersonId, name, phone, null);
          closeEditPersonModalFn();
          if (typeof renderViewPanel === 'function') {
            renderViewPanel();
          }
        }
      });
    }
    if (editPersonModalCancel) {
      editPersonModalCancel.addEventListener('click', clearEditPersonForm);
    }
    if (editPersonModalPhone && editPersonModalSave) {
      editPersonModalPhone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          editPersonModalSave.click();
        }
      });
    }

    return {
      updateUI,
      renderPeopleSelect,
      renderPeopleManageList,
    };
  }

  window.AuthPeopleUI = {
    init,
  };
})();
