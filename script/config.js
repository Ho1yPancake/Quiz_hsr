const SUPABASE_URL = 'https://pevaixbmyyeixzifovlf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBldmFpeGJteXllaXh6aWZvdmxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwOTA0MDYsImV4cCI6MjA5NDY2NjQwNn0.Ov96oqpbOfd1o3AxmC6S2sqV8w682d8dzRrjnHCPDzo';

const mySupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function getCurrentUser() {
    const { data: { user }, error } = await mySupabase.auth.getUser();
    if (error) {
        console.error('Ошибка получения пользователя:', error);
        return null;
    }
    return user;
}

async function checkAuth(redirectOnFail = true) {
    const { data: { session } } = await mySupabase.auth.getSession();
    
    if (!session && redirectOnFail) {
        window.location.href = 'index.html';
        return false;
    }
    return !!session;
}

async function signOut() {
    const { error } = await mySupabase.auth.signOut();
    if (error) {
        console.error('Ошибка выхода:', error);
        return false;
    }
    return true;
}

function showToast(message, type = 'info', containerId = 'statusMessage') {
    const toast = document.getElementById(containerId);
    if (!toast) return;
    
    toast.innerText = message;
    toast.style.display = 'block';
    toast.style.background = type === 'error' ? 'rgba(220, 53, 69, 0.9)' : 'rgba(0, 0, 0, 0.8)';
    toast.style.color = type === 'error' ? '#fff' : '#e3c179';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}