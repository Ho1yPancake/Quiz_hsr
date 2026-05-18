// ============================================================
// НАСТРОЙКА SUPABASE - ЗАМЕНИТЕ НА СВОИ ДАННЫЕ!
// ============================================================
const MY_SUPABASE_URL = 'https://pevaixbmyyeixzifovlf.supabase.co';
const MY_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBldmFpeGJteXllaXh6aWZvdmxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwOTA0MDYsImV4cCI6MjA5NDY2NjQwNn0.Ov96oqpbOfd1o3AxmC6S2sqV8w682d8dzRrjnHCPDzo';

const mySupabase = window.supabase.createClient(MY_SUPABASE_URL, MY_SUPABASE_ANON_KEY);

// ============================================================
// СПИСОК ДОСТУПНЫХ АВАТАРОВ
// ============================================================
const AVAILABLE_AVATARS = [
    { id: 'avatar1', name: 'Светлячок', file: 'avatar1.png' },
    { id: 'avatar2', name: 'Эванесса', file: 'avatar2.png' },
    { id: 'avatar3', name: 'Келус', file: 'avatar3.png' },
    { id: 'avatar4', name: 'Стелла', file: 'avatar4.png' },
    { id: 'avatar5', name: 'Серебряный Волк', file: 'avatar5.png' }
];

// ============================================================
// ПОЛУЧЕНИЕ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ
// ============================================================
async function getCurrentUser() {
    const { data: { user }, error } = await mySupabase.auth.getUser();
    if (error) {
        console.error('Ошибка получения пользователя:', error);
        return null;
    }
    return user;
}

// ============================================================
// ПРОВЕРКА АВТОРИЗАЦИИ
// ============================================================
async function checkAuth() {
    const { data: { session } } = await mySupabase.auth.getSession();
    
    if (!session) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// ============================================================
// ЗАГРУЗКА СТАТИСТИКИ ПОЛЬЗОВАТЕЛЯ
// ============================================================
async function loadUserStats() {
    const user = await getCurrentUser();
    
    if (!user) return null;
    
    let { data: stats, error } = await mySupabase
        .from('user_stats')
        .select('*')
        .eq('id', user.id)
        .single();
    
    if (error && error.code === 'PGRST116') {
        const { data: newStats, error: insertError } = await mySupabase
            .from('user_stats')
            .insert({
                id: user.id,
                nickname: user.user_metadata?.name || 'Игрок',
                avatar: 'avatar1.png'
            })
            .select()
            .single();
        
        if (insertError) {
            console.error('Ошибка создания статистики:', insertError);
            return null;
        }
        stats = newStats;
    } else if (error) {
        console.error('Ошибка загрузки статистики:', error);
        return null;
    }
    
    return stats;
}

// ============================================================
// ОБНОВЛЕНИЕ АВАТАРА
// ============================================================
async function updateAvatar(avatarFile) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Пользователь не авторизован');
    
    const { error } = await mySupabase
        .from('user_stats')
        .update({ avatar: avatarFile })
        .eq('id', user.id);
    
    if (error) throw error;
    
    // Обновляем отображение
    document.getElementById('avatarImg').src = `../style/images/${avatarFile}`;
    return true;
}

// ============================================================
// ЗАГРУЗКА ТЕКУЩЕГО АВАТАРА
// ============================================================
function loadAvatar(avatarFile) {
    const avatarImg = document.getElementById('avatarImg');
    if (avatarImg && avatarFile) {
        avatarImg.src = `../style/images/${avatarFile}`;
    }
}

// ============================================================
// ОБНОВЛЕНИЕ ИМЕНИ
// ============================================================
async function updateName(newName) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Пользователь не авторизован');
    
    const { error: authError } = await mySupabase.auth.updateUser({
        data: { name: newName }
    });
    
    if (authError) throw authError;
    
    const { error: statsError } = await mySupabase
        .from('user_stats')
        .update({ nickname: newName })
        .eq('id', user.id);
    
    if (statsError) console.error('Ошибка обновления nickname:', statsError);
    
    document.getElementById('profileName').innerText = newName;
    return true;
}

// ============================================================
// ОТОБРАЖЕНИЕ ПРОФИЛЯ
// ============================================================
async function displayProfile() {
    const user = await getCurrentUser();
    const stats = await loadUserStats();
    
    if (user) {
        const userName = stats?.nickname || user.user_metadata?.name || 'Игрок';
        document.getElementById('profileName').innerText = userName;
        
        document.getElementById('playthroughs').innerText = stats?.playthroughs || 0;
        document.getElementById('totalScore').innerText = stats?.total_p || 0;
        
        document.getElementById('hertaScore').innerText = stats?.herta_p || 0;
        document.getElementById('jariloScore').innerText = stats?.jarilo_p || 0;
        document.getElementById('xianScore').innerText = stats?.xian_p || 0;
        document.getElementById('penaconyScore').innerText = stats?.penacony_p || 0;
        document.getElementById('amphoreusScore').innerText = stats?.amphoreus_p || 0;
        document.getElementById('plancardiaScore').innerText = stats?.plancardia_p || 0;
        
        // Загружаем аватар
        const avatarFile = stats?.avatar || 'avatar1.png';
        loadAvatar(avatarFile);
    }
}

// ============================================================
// ПОСТРОЕНИЕ СЕТКИ АВАТАРОВ
// ============================================================
function buildAvatarGrid(currentAvatar) {
    const grid = document.getElementById('avatarGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    AVAILABLE_AVATARS.forEach(avatar => {
        const option = document.createElement('div');
        option.className = 'avatar-option';
        if (currentAvatar === avatar.file) {
            option.classList.add('selected');
        }
        
        option.innerHTML = `
            <img src="../style/images/${avatar.file}" alt="${avatar.name}" class="avatar-option-img">
            <div class="avatar-option-name">${avatar.name}</div>
        `;
        
        option.addEventListener('click', async () => {
            try {
                await updateAvatar(avatar.file);
                showToast(`Аватар "${avatar.name}" установлен!`, 'success');
                
                // Закрываем модальное окно
                document.getElementById('avatarModal').style.display = 'none';
                
                // Обновляем выделение в сетке
                document.querySelectorAll('.avatar-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                option.classList.add('selected');
            } catch (error) {
                showToast('Ошибка: ' + error.message, 'error');
            }
        });
        
        grid.appendChild(option);
    });
}

// ============================================================
// ПОКАЗ МОДАЛЬНОГО ОКНА ВЫБОРА АВАТАРА
// ============================================================
async function showAvatarModal() {
    const stats = await loadUserStats();
    const currentAvatar = stats?.avatar || 'avatar1.png';
    
    buildAvatarGrid(currentAvatar);
    document.getElementById('avatarModal').style.display = 'flex';
}

// ============================================================
// ВЫХОД ИЗ АККАУНТА
// ============================================================
async function signOut() {
    const { error } = await mySupabase.auth.signOut();
    
    if (error) {
        showToast('Ошибка выхода: ' + error.message, 'error');
        return;
    }
    
    window.location.href = 'index.html';
}

// ============================================================
// ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ УВЕДОМЛЕНИЙ
// ============================================================
function showToast(message, type = 'info') {
    const toast = document.getElementById('statusMessage');
    toast.innerText = message;
    toast.style.display = 'block';
    toast.style.background = type === 'error' ? 'rgba(220, 53, 69, 0.9)' : 'rgba(0, 0, 0, 0.8)';
    toast.style.color = type === 'error' ? '#fff' : '#e3c179';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// ============================================================
// НАСТРОЙКА ИНТЕРФЕЙСА
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
    
    const isAuth = await checkAuth();
    if (!isAuth) return;
    
    await displayProfile();
    
    // === КНОПКА НАЗАД ===
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
    
    // === КНОПКА ВЫХОДА ===
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await signOut();
        });
    }
    
    // === КНОПКА СМЕНЫ АВАТАРА ===
    const changeAvatarBtn = document.getElementById('changeAvatarBtn');
    if (changeAvatarBtn) {
        changeAvatarBtn.addEventListener('click', () => {
            showAvatarModal();
        });
    }
    
    // === МОДАЛЬНОЕ ОКНО АВАТАРОВ - ЗАКРЫТИЕ ===
    const closeAvatarModal = document.getElementById('closeAvatarModal');
    const avatarModal = document.getElementById('avatarModal');
    
    if (closeAvatarModal) {
        closeAvatarModal.addEventListener('click', () => {
            avatarModal.style.display = 'none';
        });
    }
    
    window.addEventListener('click', (e) => {
        if (e.target === avatarModal) {
            avatarModal.style.display = 'none';
        }
    });
    
    // === МОДАЛЬНОЕ ОКНО СМЕНЫ ИМЕНИ ===
    const nameModal = document.getElementById('nameModal');
    const editNameBtn = document.getElementById('editNameBtn');
    const closeNameModal = document.getElementById('closeNameModal');
    const saveNameBtn = document.getElementById('saveNameBtn');
    const newNameInput = document.getElementById('newNameInput');
    
    if (editNameBtn && nameModal) {
        editNameBtn.addEventListener('click', () => {
            const currentName = document.getElementById('profileName').innerText;
            newNameInput.value = currentName;
            nameModal.style.display = 'flex';
        });
    }
    
    if (closeNameModal) {
        closeNameModal.addEventListener('click', () => {
            nameModal.style.display = 'none';
        });
    }
    
    if (saveNameBtn) {
        saveNameBtn.addEventListener('click', async () => {
            const newName = newNameInput.value.trim();
            
            if (!newName) {
                showToast('Имя не может быть пустым', 'error');
                return;
            }
            
            try {
                await updateName(newName);
                nameModal.style.display = 'none';
                showToast('Имя успешно обновлено!', 'success');
            } catch (error) {
                showToast('Ошибка: ' + error.message, 'error');
            }
        });
    }
    
    window.addEventListener('click', (e) => {
        if (e.target === nameModal) {
            nameModal.style.display = 'none';
        }
    });
});