const AVAILABLE_AVATARS = [
    { id: 'avatar1', name: 'Светлячок', file: 'avatar1.png' },
    { id: 'avatar2', name: 'Эванесса', file: 'avatar2.png' },
    { id: 'avatar3', name: 'Келус', file: 'avatar3.png' },
    { id: 'avatar4', name: 'Стелла', file: 'avatar4.png' },
    { id: 'avatar5', name: 'Серебряный Волк', file: 'avatar5.png' }
];

async function loadUserStats() {
    const user = await getCurrentUser();
    
    if (!user) return null;
    
    let { data: stats, error } = await mySupabase.from('user_stats').select('*').eq('id', user.id).single();
    
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

async function updateAvatar(avatarFile) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Пользователь не авторизован');
    
    const { error } = await mySupabase
        .from('user_stats')
        .update({ avatar: avatarFile })
        .eq('id', user.id);
    
    if (error) throw error;
    
    document.getElementById('avatarImg').src = `../style/images/${avatarFile}`;
    return true;
}

function loadAvatar(avatarFile) {
    const avatarImg = document.getElementById('avatarImg');
    if (avatarImg && avatarFile) {
        avatarImg.src = `../style/images/${avatarFile}`;
    }
}

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
        
        const avatarFile = stats?.avatar || 'avatar1.png';
        loadAvatar(avatarFile);
    }
}

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
                showToast(`Аватар ${avatar.name} установлен`, 'success');
                
                document.getElementById('avatarModal').style.display = 'none';
                
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

async function showAvatarModal() {
    const stats = await loadUserStats();
    const currentAvatar = stats?.avatar || 'avatar1.png';
    
    buildAvatarGrid(currentAvatar);
    document.getElementById('avatarModal').style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', async () => {
    
    const isAuth = await checkAuth(true);
    if (!isAuth) return;
    
    await displayProfile();
    
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await signOut();
            window.location.href = 'index.html';
        });
    }
    
    const changeAvatarBtn = document.getElementById('changeAvatarBtn');
    if (changeAvatarBtn) {
        changeAvatarBtn.addEventListener('click', () => {
            showAvatarModal();
        });
    }
    
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
                showToast('Имя успешно обновлено', 'success');
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