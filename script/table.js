let currentUserId = null;
let leaderboardData = [];

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

function updateStatsSummary(players) {
    const totalPlayers = players.length;
    const recordScore = players.length > 0 ? players[0].total_p : 0;
    
    document.getElementById('totalPlayers').innerText = totalPlayers;
    document.getElementById('recordScore').innerText = recordScore;
}

function getRankClass(rank) {
    if (rank === 0) return 'rank-1';
    if (rank === 1) return 'rank-2';
    if (rank === 2) return 'rank-3';
    return '';
}

function formatRank(rank) {
    if (rank === 0) return '1';
    if (rank === 1) return '2';
    if (rank === 2) return '3';
    return (rank + 1).toString();
}

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
                             onerror="this.src='../style/images/avatar1.png'">
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

async function updateCurrentUser() {
    const user = await getCurrentUser();
    currentUserId = user ? user.id : null;
}

document.addEventListener('DOMContentLoaded', async () => {
    
    const isAuth = await checkAuth(true);
    if (!isAuth) return;
    
    await updateCurrentUser();
    await loadLeaderboard();
    
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
    
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.textContent = 'Загрузка...';
            await loadLeaderboard();
            refreshBtn.textContent = 'Обновить';
        });
    }
    
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