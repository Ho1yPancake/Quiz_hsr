// ============================================================
// НАСТРОЙКА SUPABASE - ЗАМЕНИТЕ НА СВОИ ДАННЫЕ
// ============================================================
const SUPABASE_URL = 'https://pevaixbmyyeixzifovlf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBldmFpeGJteXllaXh6aWZvdmxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwOTA0MDYsImV4cCI6MjA5NDY2NjQwNn0.Ov96oqpbOfd1o3AxmC6S2sqV8w682d8dzRrjnHCPDzo';

// Проверяем, существует ли уже supabase объект
if (typeof window.supabase === 'undefined') {
    console.error('Supabase не загружен!');
}

// Используем уникальное имя переменной или проверяем существование
const mySupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ============================================================
let currentUserId = null;
let leaderboardData = [];

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
// ЗАГРУЗКА ТАБЛИЦЫ ЛИДЕРОВ
// ============================================================
async function loadLeaderboard() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '<tr class="empty-row"><td colspan="9">Загрузка данных...</td></tr>';
    
    try {
        const { data: players, error } = await mySupabase
            .from('user_stats')
            .select('id, nickname, herta_p, jarilo_p, xian_p, penacony_p, amphoreus_p, plancardia_p, total_p, avatar')
            .not('nickname', 'is', null)
            .order('total_p', { ascending: false });
        
        if (error) throw error;
        
        leaderboardData = players;
        updateStatsSummary(players);
        renderLeaderboard(players);
        
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        tbody.innerHTML = '<tr class="empty-row"><td colspan="9">Ошибка загрузки данных</td></tr>';
    }
}

// ============================================================
// ОБНОВЛЕНИЕ СТАТИСТИКИ
// ============================================================
function updateStatsSummary(players) {
    const totalPlayers = players.length;
    const recordScore = players.length > 0 ? players[0].total_p : 0;
    
    document.getElementById('totalPlayers').innerText = totalPlayers;
    document.getElementById('recordScore').innerText = recordScore;
}

// ============================================================
// ПОЛУЧЕНИЕ РАНГА (ДЛЯ ЦВЕТА)
// ============================================================
function getRankClass(rank) {
    if (rank === 0) return 'rank-1';
    if (rank === 1) return 'rank-2';
    if (rank === 2) return 'rank-3';
    return '';
}

// ============================================================
// ФОРМАТИРОВАНИЕ МЕСТА
// ============================================================
function formatRank(rank) {
    if (rank === 0) return '1';
    if (rank === 1) return '2';
    if (rank === 2) return '3';
    return (rank + 1).toString();
}

// ============================================================
// ЭКРАНИРОВАНИЕ HTML
// ============================================================
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ============================================================
// ОТРИСОВКА ТАБЛИЦЫ
// ============================================================
function renderLeaderboard(players) {
    const tbody = document.getElementById('tableBody');
    
    if (!players || players.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="9">Нет данных</td></tr>';
        return;
    }
    
    let html = '';
    
    players.forEach((player, index) => {
        const rank = index;
        const isCurrentUser = currentUserId && player.id === currentUserId;
        const rankClass = getRankClass(rank);
        const rowClass = isCurrentUser ? 'current-user-row' : (rank < 3 ? 'top-player' : '');
        const avatarFile = player.avatar || 'avatar1.png';
        
        html += `
            <tr class="${rowClass}" data-user-id="${player.id}">
                <td class="${rankClass}">${formatRank(rank)}</td>
                <td>
                    <div class="user-cell">
                        <img src="../style/images/${avatarFile}" alt="avatar" class="user-avatar" 
                             onerror="this.src='style/images/avatar1.png'">
                        <span class="user-name">${escapeHtml(player.nickname)}</span>
                    </div>
                </td>
                <td>${player.herta_p || 0}</td>
                <td>${player.jarilo_p || 0}</td>
                <td>${player.xian_p || 0}</td>
                <td>${player.penacony_p || 0}</td>
                <td>${player.amphoreus_p || 0}</td>
                <td>${player.plancardia_p || 0}</td>
                <td class="total-score">${player.total_p || 0}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// ============================================================
// ОБНОВЛЕНИЕ СЕССИИ ПОЛЬЗОВАТЕЛЯ
// ============================================================
async function updateCurrentUser() {
    const user = await getCurrentUser();
    currentUserId = user ? user.id : null;
}

// ============================================================
// ПРОВЕРКА АВТОРИЗАЦИИ
// ============================================================
async function checkAndRedirect() {
    const { data: { session } } = await mySupabase.auth.getSession();
    
    if (!session) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// ============================================================
// НАСТРОЙКА ИНТЕРФЕЙСА
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
    
    const isAuth = await checkAndRedirect();
    if (!isAuth) return;
    
    await updateCurrentUser();
    await loadLeaderboard();
    
    // КНОПКА НАЗАД
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
    
    // КНОПКА ОБНОВИТЬ
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.textContent = 'Загрузка...';
            await loadLeaderboard();
            refreshBtn.textContent = 'Обновить';
        });
    }
    
    // Слушаем изменения в БД
    mySupabase
        .channel('leaderboard_changes')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'user_stats' }, 
            () => {
                loadLeaderboard();
            }
        )
        .subscribe();
});