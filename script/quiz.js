const PLANETS = [
    { id: 'herta', name: 'Станция Герта', background: 'Herta.png', scoreField: 'herta_p' },
    { id: 'jarilo', name: 'Ярило-VI', background: 'belobog.png', scoreField: 'jarilo_p' },
    { id: 'xian', name: 'Сяньчжоу', background: 'xianzhou.png', scoreField: 'xian_p' },
    { id: 'penacony', name: 'Пенакония', background: 'penacony.png', scoreField: 'penacony_p' },
    { id: 'amphoreus', name: 'Амфореус', background: 'amphoreus.png', scoreField: 'amphoreus_p' },
    { id: 'plancardia', name: 'Планкадия', background: 'planarcadia.png', scoreField: 'plancardia_p' }
];

const TIME_PER_QUESTION = 30;
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

async function loadAllQuestions() {
    const { data, error } = await mySupabase
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

async function updateUserStats(scores) {
    const user = await getCurrentUser();
    if (!user) return;
    
    const { data: existing } = await mySupabase
        .from('user_stats')
        .select('*')
        .eq('id', user.id)
        .single();
    
    const updates = {
        playthroughs: (existing?.playthroughs || 0) + 1
    };
    
    for (const planet of PLANETS) {
        updates[planet.scoreField] = (existing?.[planet.scoreField] || 0) + (scores[planet.id] || 0);
    }
    
    const { error } = await mySupabase
        .from('user_stats')
        .update(updates)
        .eq('id', user.id);
    
    if (error) console.error('Ошибка обновления статистики:', error);
}

function changePlanetBackground(planetId) {
    const planet = PLANETS.find(p => p.id === planetId);
    if (planet && planet.background) {
        document.body.style.backgroundImage = `url(../style/images/${planet.background})`;
        document.body.style.backgroundRepeat = 'no-repeat';
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
    }
}

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

function handleTimeout() {
    if (isAnswered || isAutoSwitching) return;
    
    isAutoSwitching = true;
    isAnswered = true;
    
    const question = allQuestions[currentQuestionIndex];
    
    userAnswers.push({
        planet: question.planet,
        questionNum: question.num,
        selected: null,
        correct: question.correct,
        isCorrect: false
    });
    
    document.querySelectorAll('.answer-btn').forEach(btn => {
        btn.style.pointerEvents = 'none';
        btn.classList.add('disabled');
    });
    
    const nextBtn = document.getElementById('nextBtn');
    nextBtn.disabled = false;
    nextBtn.textContent = 'Время вышло';
    
    setTimeout(() => {
        if (currentQuestionIndex + 1 < allQuestions.length) {
            nextQuestion();
        } else {
            finishQuiz();
        }
        nextBtn.textContent = 'Следующий вопрос';
    }, 1000);
}

function handleAnswer(selectedAnswerLetter, button) {
    if (isAnswered) return;
    
    document.querySelectorAll('.answer-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    button.classList.add('selected');
    selectedAnswer = selectedAnswerLetter;
    document.getElementById('nextBtn').disabled = false;
}

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

function nextQuestion() {
    currentQuestionIndex++;
    
    if (currentQuestionIndex < allQuestions.length) {
        displayCurrentQuestion();
    } else {
        finishQuiz();
    }
}

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

function exitQuiz() {
    if (timerInterval) clearInterval(timerInterval);
    window.location.href = 'index.html';
}

function showExitModal() {
    pauseTimer();
    document.getElementById('exitModal').style.display = 'flex';
}

function hideExitModal() {
    resumeTimer();
    document.getElementById('exitModal').style.display = 'none';
}

async function initQuiz() {
    const user = await getCurrentUser();
    if (!user) {
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