// ============================================================
// ПРОВЕРКА ЗАГРУЗКИ SUPABASE
// ============================================================
if (typeof window.supabase === 'undefined') {
    console.error('Supabase не загружен!');
    alert('Ошибка загрузки библиотеки Supabase. Обновите страницу.');
}

// ============================================================
// НАСТРОЙКА SUPABASE - ЗАМЕНИТЕ НА СВОИ ДАННЫЕ
// ============================================================
const SUPABASE_URL = 'https://pevaixbmyyeixzifovlf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBldmFpeGJteXllaXh6aWZvdmxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwOTA0MDYsImV4cCI6MjA5NDY2NjQwNn0.Ov96oqpbOfd1o3AxmC6S2sqV8w682d8dzRrjnHCPDzo';

const quizSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// КОНСТАНТЫ
// ============================================================
const PLANETS = [
    { id: 'herta', name: 'Станция Герта', background: 'Herta.png', scoreField: 'herta_p' },
    { id: 'jarilo', name: 'Ярило-VI', background: 'belobog.png', scoreField: 'jarilo_p' },
    { id: 'xian', name: 'Сяньчжоу', background: 'xianzhou.png', scoreField: 'xian_p' },
    { id: 'penacony', name: 'Пенакония', background: 'penacony.png', scoreField: 'penacony_p' },
    { id: 'amphoreus', name: 'Амфореус', background: 'amphoreus.png', scoreField: 'amphoreus_p' },
    { id: 'plancardia', name: 'Планкадия', background: 'planarcadia.png', scoreField: 'plancardia_p' }
];

const TIME_PER_QUESTION = 30;
let currentUser = null;
let allQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let timerInterval = null;
let timeLeft = TIME_PER_QUESTION;
let isAnswered = false;
let questionStartTime = null;
let selectedAnswer = null;
let timerPaused = false;
let isAutoSwitching = false;

// ============================================================
// ПОЛУЧЕНИЕ ПОЛЬЗОВАТЕЛЯ
// ============================================================
async function getCurrentUser() {
    const { data: { user } } = await quizSupabase.auth.getUser();
    return user;
}

// ============================================================
// ЗАГРУЗКА ВОПРОСОВ
// ============================================================
async function loadAllQuestions() {
    const { data, error } = await quizSupabase
        .from('quiz_questions')
        .select('*')
        .order('planet', { ascending: true })
        .order('num', { ascending: true });
    
    if (error) {
        console.error('Ошибка загрузки вопросов:', error);
        return [];
    }
    return data;
}

// ============================================================
// ОБНОВЛЕНИЕ СТАТИСТИКИ ПОЛЬЗОВАТЕЛЯ
// ============================================================
async function updateUserStats(scores) {
    if (!currentUser) return;
    
    const { data: existing } = await quizSupabase
        .from('user_stats')
        .select('*')
        .eq('id', currentUser.id)
        .single();
    
    const updates = {
        playthroughs: (existing?.playthroughs || 0) + 1
    };
    
    for (const planet of PLANETS) {
        updates[planet.scoreField] = (existing?.[planet.scoreField] || 0) + (scores[planet.id] || 0);
    }
    
    const { error } = await quizSupabase
        .from('user_stats')
        .update(updates)
        .eq('id', currentUser.id);
    
    if (error) console.error('Ошибка обновления статистики:', error);
}

// ============================================================
// СМЕНА ФОНА ПЛАНЕТЫ
// ============================================================
function changePlanetBackground(planetId) {
    const planet = PLANETS.find(p => p.id === planetId);
    if (planet && planet.background) {
        document.body.style.backgroundImage = `url(../style/images/${planet.background})`;
        document.body.style.backgroundRepeat = 'no-repeat';
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
    }
}

// ============================================================
// ОТОБРАЖЕНИЕ ТЕКУЩЕГО ВОПРОСА
// ============================================================
function displayCurrentQuestion() {
    const question = allQuestions[currentQuestionIndex];
    if (!question) return;
    
    const planet = PLANETS.find(p => p.id === question.planet);
    if (planet) {
        document.getElementById('planetName').innerText = planet.name;
        changePlanetBackground(question.planet);
    }
    
    document.getElementById('questionText').innerText = question.question;
    document.getElementById('answerA').innerText = question.option_a;
    document.getElementById('answerB').innerText = question.option_b;
    document.getElementById('answerC').innerText = question.option_c;
    document.getElementById('answerD').innerText = question.option_d;
    
    const total = allQuestions.length;
    document.getElementById('currentQuestionNum').innerText = currentQuestionIndex + 1;
    document.getElementById('totalQuestions').innerText = total;
    
    const progress = ((currentQuestionIndex + 1) / total) * 100;
    document.getElementById('progressFill').style.width = `${progress}%`;
    
    resetTimer();
}

// ============================================================
// ТАЙМЕР
// ============================================================
function resetTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timeLeft = TIME_PER_QUESTION;
    isAnswered = false;
    selectedAnswer = null;
    isAutoSwitching = false;
    questionStartTime = Date.now();
    document.getElementById('timerSeconds').innerText = timeLeft;
    document.getElementById('nextBtn').disabled = true;
    
    const answerBtns = document.querySelectorAll('.answer-btn');
    answerBtns.forEach(btn => {
        btn.classList.remove('selected', 'disabled');
        btn.style.pointerEvents = 'auto';
    });
    
    timerInterval = setInterval(() => {
        if (!timerPaused && !isAnswered && timeLeft > 0) {
            timeLeft--;
            document.getElementById('timerSeconds').innerText = timeLeft;
            
            if (timeLeft === 0 && !isAutoSwitching) {
                clearInterval(timerInterval);
                handleTimeout();
            }
        }
    }, 1000);
}

function pauseTimer() {
    timerPaused = true;
}

function resumeTimer() {
    timerPaused = false;
}

// ============================================================
// ОБРАБОТКА ТАЙМАУТА (АВТОМАТИЧЕСКИЙ ПЕРЕХОД)
// ============================================================
function handleTimeout() {
    if (isAnswered || isAutoSwitching) return;
    
    isAutoSwitching = true;
    isAnswered = true;
    
    const question = allQuestions[currentQuestionIndex];
    
    // Сохраняем ответ как неправильный
    userAnswers.push({
        planet: question.planet,
        questionNum: question.num,
        selected: null,
        correct: question.correct,
        isCorrect: false
    });
    
    // Блокируем кнопки ответов
    document.querySelectorAll('.answer-btn').forEach(btn => {
        btn.style.pointerEvents = 'none';
        btn.classList.add('disabled');
    });
    
    // Показываем сообщение о timeout
    const nextBtn = document.getElementById('nextBtn');
    nextBtn.disabled = false;
    nextBtn.textContent = 'Время вышло →';
    
    // Автоматически переключаем через 1 секунду
    setTimeout(() => {
        if (currentQuestionIndex + 1 < allQuestions.length) {
            nextQuestion();
        } else {
            finishQuiz();
        }
        nextBtn.textContent = 'Следующий вопрос';
    }, 1000);
}

// ============================================================
// ОБРАБОТКА ВЫБОРА ОТВЕТА
// ============================================================
function handleAnswer(selectedAnswerLetter, button) {
    if (isAnswered) return;
    
    document.querySelectorAll('.answer-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    button.classList.add('selected');
    selectedAnswer = selectedAnswerLetter;
    document.getElementById('nextBtn').disabled = false;
}

// ============================================================
// ПОДТВЕРЖДЕНИЕ ОТВЕТА И ПЕРЕХОД
// ============================================================
function confirmAndNext() {
    if (isAnswered) return;
    
    const question = allQuestions[currentQuestionIndex];
    const isCorrect = (selectedAnswer === question.correct);
    const responseTime = Math.floor((Date.now() - questionStartTime) / 1000);
    
    isAnswered = true;
    clearInterval(timerInterval);
    
    userAnswers.push({
        planet: question.planet,
        questionNum: question.num,
        selected: selectedAnswer || null,
        correct: question.correct,
        isCorrect: isCorrect,
        responseTime: responseTime
    });
    
    document.querySelectorAll('.answer-btn').forEach(btn => {
        btn.style.pointerEvents = 'none';
    });
    
    nextQuestion();
}

// ============================================================
// ПЕРЕХОД К СЛЕДУЮЩЕМУ ВОПРОСУ
// ============================================================
function nextQuestion() {
    currentQuestionIndex++;
    
    if (currentQuestionIndex < allQuestions.length) {
        displayCurrentQuestion();
    } else {
        finishQuiz();
    }
}

// ============================================================
// ЗАВЕРШЕНИЕ ВИКТОРИНЫ
// ============================================================
function finishQuiz() {
    if (timerInterval) clearInterval(timerInterval);
    
    const scores = {};
    for (const planet of PLANETS) {
        scores[planet.id] = 0;
    }
    
    for (const answer of userAnswers) {
        if (answer.isCorrect) {
            scores[answer.planet]++;
        }
    }
    
    let totalScore = 0;
    for (const planet of PLANETS) {
        totalScore += scores[planet.id];
    }
    
    updateUserStats(scores);
    showResults(scores, totalScore);
}

function showResults(scores, totalScore) {
    const resultsStats = document.getElementById('resultsStats');
    const resultsPlanets = document.getElementById('resultsPlanets');
    const totalScoreElem = document.getElementById('totalScoreResult');
    
    const correctAnswers = userAnswers.filter(a => a.isCorrect).length;
    const totalQuestions = allQuestions.length;
    const percentage = Math.round((correctAnswers / totalQuestions) * 100);
    
    resultsStats.innerHTML = `
        <div class="planet-result">
            <span class="planet-result-name">Правильных ответов:</span>
            <span class="planet-result-score">${correctAnswers} из ${totalQuestions}</span>
        </div>
        <div class="planet-result">
            <span class="planet-result-name">Процент правильных:</span>
            <span class="planet-result-score">${percentage}%</span>
        </div>
    `;
    
    let planetsHtml = '';
    for (const planet of PLANETS) {
        planetsHtml += `
            <div class="planet-result">
                <span class="planet-result-name">${planet.name}:</span>
                <span class="planet-result-score">${scores[planet.id]} / 10</span>
            </div>
        `;
    }
    resultsPlanets.innerHTML = planetsHtml;
    totalScoreElem.innerText = totalScore;
    
    document.getElementById('resultsModal').style.display = 'flex';
}

// ============================================================
// ВЫХОД ИЗ ВИКТОРИНЫ
// ============================================================
function exitQuiz() {
    if (timerInterval) clearInterval(timerInterval);
    window.location.href = 'index.html';
}

// ============================================================
// ПОКАЗ МОДАЛЬНОГО ОКНА ВЫХОДА
// ============================================================
function showExitModal() {
    pauseTimer();
    document.getElementById('exitModal').style.display = 'flex';
}

function hideExitModal() {
    resumeTimer();
    document.getElementById('exitModal').style.display = 'none';
}

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================
async function initQuiz() {
    currentUser = await getCurrentUser();
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }
    
    allQuestions = await loadAllQuestions();
    if (allQuestions.length === 0) {
        alert('Ошибка загрузки вопросов. Проверьте подключение к базе данных.');
        window.location.href = 'index.html';
        return;
    }
    
    currentQuestionIndex = 0;
    userAnswers = [];
    displayCurrentQuestion();
    
    document.querySelectorAll('.answer-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!isAnswered) {
                handleAnswer(btn.dataset.answer, btn);
            }
        });
    });
    
    document.getElementById('nextBtn').addEventListener('click', () => {
        if (document.getElementById('nextBtn').disabled) return;
        if (selectedAnswer !== null || timeLeft === 0) {
            confirmAndNext();
        }
    });
    
    document.getElementById('exitBtn').addEventListener('click', () => {
        showExitModal();
    });
    
    document.getElementById('cancelExitBtn').addEventListener('click', () => {
        hideExitModal();
    });
    
    document.getElementById('confirmExitBtn').addEventListener('click', () => {
        document.getElementById('exitModal').style.display = 'none';
        exitQuiz();
    });
    
    document.getElementById('finishBtn').addEventListener('click', () => {
        document.getElementById('resultsModal').style.display = 'none';
        window.location.href = 'index.html';
    });
}

initQuiz();