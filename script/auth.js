// ============================================================
// НАСТРОЙКА SUPABASE - ЗАМЕНИТЕ НА СВОИ ДАННЫЕ!
// ============================================================
const MY_SUPABASE_URL = 'https://pevaixbmyyeixzifovlf.supabase.co';
const MY_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBldmFpeGJteXllaXh6aWZvdmxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwOTA0MDYsImV4cCI6MjA5NDY2NjQwNn0.Ov96oqpbOfd1o3AxmC6S2sqV8w682d8dzRrjnHCPDzo';

// Используем уникальное имя переменной, чтобы избежать конфликтов
const mySupabase = window.supabase.createClient(MY_SUPABASE_URL, MY_SUPABASE_ANON_KEY);

// ============================================================
// ФУНКЦИЯ ВХОДА
// ============================================================
async function signIn(email, password) {
    const statusDiv = document.getElementById('login-status');
    statusDiv.className = 'status-message';
    statusDiv.innerText = 'Вход...';
    
    const { data, error } = await mySupabase.auth.signInWithPassword({
        email: email,
        password: password
    });
    
    if (error) {
        statusDiv.className = 'status-message error';
        statusDiv.innerText = 'Ошибка: ' + error.message;
        return false;
    }
    
    statusDiv.className = 'status-message success';
    statusDiv.innerText = 'Успешный вход!';
    
    setTimeout(() => {
        showMainMenu();
    }, 500);
    
    return true;
}

// ============================================================
// ФУНКЦИЯ РЕГИСТРАЦИИ
// ============================================================
async function signUp(name, email, password) {
    const statusDiv = document.getElementById('register-status');
    statusDiv.className = 'status-message';
    statusDiv.innerText = 'Регистрация...';
    
    const { data, error } = await mySupabase.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                name: name
            }
        }
    });
    
    if (error) {
        statusDiv.className = 'status-message error';
        statusDiv.innerText = 'Ошибка: ' + error.message;
        return false;
    }
    
    if (data.user?.identities?.length === 0) {
        statusDiv.className = 'status-message error';
        statusDiv.innerText = 'Пользователь с таким email уже существует';
        return false;
    }
    
    // Создаём запись в user_stats с аватаром по умолчанию
    if (data.user) {
        const { error: insertError } = await mySupabase
            .from('user_stats')
            .insert({
                id: data.user.id,
                nickname: name,
                avatar: 'avatar1.png'
            });
        
        if (insertError) {
            console.error('Ошибка создания статистики:', insertError);
        }
    }
    
    statusDiv.className = 'status-message success';
    statusDiv.innerText = 'Регистрация успешна! Теперь войдите.';
    
    document.getElementById('reg-name').value = '';
    document.getElementById('reg-email').value = '';
    document.getElementById('reg-password').value = '';
    
    setTimeout(() => {
        const loginTab = document.querySelector('[data-tab="login"]');
        const registerTab = document.querySelector('[data-tab="register"]');
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        
        if (loginTab && registerTab) {
            loginTab.classList.add('active');
            registerTab.classList.remove('active');
            loginForm.classList.add('active');
            registerForm.classList.remove('active');
        }
        
        statusDiv.className = 'status-message';
        statusDiv.innerText = '';
    }, 1500);
    
    return true;
}

// ============================================================
// ФУНКЦИЯ ВЫХОДА
// ============================================================
async function signOut() {
    const { error } = await mySupabase.auth.signOut();
    
    if (error) {
        alert('Ошибка выхода: ' + error.message);
        return;
    }
    
    showAuthSection();
}

// ============================================================
// ПОКАЗАТЬ ГЛАВНОЕ МЕНЮ (после входа)
// ============================================================
function showMainMenu() {
    const authSection = document.getElementById('auth-section');
    const mainMenuSection = document.getElementById('main-menu-section');
    
    if (authSection) authSection.style.display = 'none';
    if (mainMenuSection) mainMenuSection.style.display = 'block';
}

// ============================================================
// ПОКАЗАТЬ ФОРМУ ВХОДА (после выхода)
// ============================================================
function showAuthSection() {
    const authSection = document.getElementById('auth-section');
    const mainMenuSection = document.getElementById('main-menu-section');
    
    if (authSection) authSection.style.display = 'block';
    if (mainMenuSection) mainMenuSection.style.display = 'none';
    
    const loginEmail = document.getElementById('login-email');
    const loginPassword = document.getElementById('login-password');
    if (loginEmail) loginEmail.value = '';
    if (loginPassword) loginPassword.value = '';
    
    const loginStatus = document.getElementById('login-status');
    if (loginStatus) {
        loginStatus.className = 'status-message';
        loginStatus.innerText = '';
    }
    
    const registerStatus = document.getElementById('register-status');
    if (registerStatus) {
        registerStatus.className = 'status-message';
        registerStatus.innerText = '';
    }
    
    const loginTab = document.querySelector('[data-tab="login"]');
    const registerTab = document.querySelector('[data-tab="register"]');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    if (loginTab && registerTab) {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        if (loginForm) loginForm.classList.add('active');
        if (registerForm) registerForm.classList.remove('active');
    }
}

// ============================================================
// ПРОВЕРКА СЕССИИ
// ============================================================
async function checkSession() {
    const { data: { session } } = await mySupabase.auth.getSession();
    
    if (session) {
        showMainMenu();
    } else {
        showAuthSection();
    }
}

// ============================================================
// НАСТРОЙКА ИНТЕРФЕЙСА
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    
    console.log('Скрипт загружен!');
    
    checkSession();
    
    const loginTab = document.querySelector('[data-tab="login"]');
    const registerTab = document.querySelector('[data-tab="register"]');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const logoutMainBtn = document.getElementById('logoutMainBtn');
    
    console.log('Элементы:', { 
        loginTab: !!loginTab, 
        registerTab: !!registerTab,
        loginBtn: !!loginBtn,
        registerBtn: !!registerBtn
    });
    
    // Переключение вкладок
    if (loginTab && registerTab) {
        loginTab.addEventListener('click', function(e) {
            e.preventDefault();
            loginTab.classList.add('active');
            registerTab.classList.remove('active');
            if (loginForm) loginForm.classList.add('active');
            if (registerForm) registerForm.classList.remove('active');
        });
        
        registerTab.addEventListener('click', function(e) {
            e.preventDefault();
            registerTab.classList.add('active');
            loginTab.classList.remove('active');
            if (registerForm) registerForm.classList.add('active');
            if (loginForm) loginForm.classList.remove('active');
        });
    }
    
    // Кнопка входа
    if (loginBtn) {
        loginBtn.addEventListener('click', async function() {
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            
            if (!email || !password) {
                const statusDiv = document.getElementById('login-status');
                if (statusDiv) {
                    statusDiv.className = 'status-message error';
                    statusDiv.innerText = 'Заполните все поля';
                }
                return;
            }
            
            await signIn(email, password);
        });
    }
    
    // Кнопка регистрации
    if (registerBtn) {
        registerBtn.addEventListener('click', async function() {
            const name = document.getElementById('reg-name').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            const password = document.getElementById('reg-password').value;
            
            if (!name || !email || !password) {
                const statusDiv = document.getElementById('register-status');
                if (statusDiv) {
                    statusDiv.className = 'status-message error';
                    statusDiv.innerText = 'Заполните все поля';
                }
                return;
            }
            
            if (password.length < 6) {
                const statusDiv = document.getElementById('register-status');
                if (statusDiv) {
                    statusDiv.className = 'status-message error';
                    statusDiv.innerText = 'Пароль должен быть минимум 6 символов';
                }
                return;
            }
            
            await signUp(name, email, password);
        });
    }
    
    // Кнопка выхода
    if (logoutMainBtn) {
        logoutMainBtn.addEventListener('click', async function() {
            await signOut();
        });
    }
    
    // Enter на полях ввода
    const inputs = document.querySelectorAll('.auth-input');
    inputs.forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const activeForm = document.querySelector('.auth-form.active');
                if (activeForm && activeForm.id === 'login-form' && loginBtn) {
                    loginBtn.click();
                } else if (activeForm && activeForm.id === 'register-form' && registerBtn) {
                    registerBtn.click();
                }
            }
        });
    });
});