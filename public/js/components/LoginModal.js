class LoginModal {
  constructor() {
    this.modal = document.getElementById('login-modal');
    this.loginName = document.getElementById('login-name');
    this.loginPassword = document.getElementById('login-password');
    this.btnDoLogin = document.getElementById('btn-do-login');
    this.btnLogin = document.getElementById('btn-login');
    
    this.init();
  }

  init() {
    if (this.btnLogin && this.modal) {
      this.btnLogin.addEventListener('click', () => {
        this.modal.style.display = 'flex';
      });
    }

    if (this.btnDoLogin && this.loginName && this.loginPassword) {
      this.btnDoLogin.addEventListener('click', async () => {
        await this.handleLogin();
      });
    }

    if (this.loginPassword) {
      this.loginPassword.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.btnDoLogin.click();
      });
    }

    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) {
          this.modal.style.display = 'none';
        }
      });
    }
  }

  async handleLogin() {
    const name = this.loginName.value;
    const password = this.loginPassword.value;
    
    if (!name || !name.trim()) {
      alert('Введите имя пользователя');
      return;
    }
    
    if (!password) {
      alert('Введите пароль');
      return;
    }

    try {
      const result = await window.api.login(name.trim(), password);
      this.modal.style.display = 'none';
      this.loginName.value = '';
      this.loginPassword.value = '';
      
      // Trigger UI update
      if (window.updateUI) {
        window.updateUI();
      }
      if (window.load) {
        window.load();
      }
      
      console.log('Авторизация успешна');
    } catch (error) {
      alert(error.message || 'Ошибка входа');
    }
  }

  show() {
    if (this.modal) {
      this.modal.style.display = 'flex';
    }
  }

  hide() {
    if (this.modal) {
      this.modal.style.display = 'none';
    }
  }
}

// Initialize login modal
window.loginModal = new LoginModal();