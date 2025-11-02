
(() => {
  // ====== CONFIG ======
  // Reemplaza esta URL con el despliegue de tu Apps Script (Web App) para guardar en Google Sheets:
  const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbymfQEX_oXWMxqY_aKAx3erV6Vtmoz-hGMtGe1IQswEOheNjTpXK2v6qAE2smctoouDeA/exec"; // <-- pega aquí tu URL de implementación (https://script.google.com/macros/s/XXXXX/exec)

  // ====== ELEMENTOS ======
  const welcome = document.getElementById('welcome');
  const firstNameInput = document.getElementById('first-name');
  const lastNameInput = document.getElementById('last-name');
  const moduleSelect = document.getElementById('module-select');
  const startBtn = document.getElementById('btn-start');
  const welcomeError = document.getElementById('welcome-error');

  const quizArea = document.getElementById('quiz-area');
  const questionTitle = document.getElementById('question-title');
  const optionsEl = document.getElementById('options');
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  const resultEl = document.getElementById('result');
  const liveStatsEl = document.getElementById('live-stats');
  const scoreEl = document.getElementById('score');
  const stepsEl = document.getElementById('progress-steps');
  const timerEl = document.getElementById('timer');
  const confettiCanvas = document.getElementById('confetti');
  const ctx = confettiCanvas.getContext('2d');

  // ====== ESTADO ======
  let firstName = '';
  let lastName = '';
  let selModule = 'SKY · Prueba 1';

  let baseQuestions = [];
  let questions = [];
  let current = 0;
  let selections = []; // TEXTO seleccionado por pregunta
  let startTime = 0;
  let timerId = null;
  let particles = [];
  let attemptId = '';

  // ====== UTILIDADES ======
  function shuffle(arr){
    const a = arr.slice();
    for(let i=a.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i],a[j]] = [a[j],a[i]];
    }
    return a;
  }
  function pad(n){ return n.toString().padStart(2,'0'); }
  function fmtTime(ms){
    const s = Math.floor(ms/1000);
    const m = Math.floor(s/60);
    const sec = s%60;
    return pad(m)+':'+pad(sec);
  }
  function uid(){
    return Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
  }

  // ====== CANVAS CONFETTI ======
  function sizeCanvas(){
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
  sizeCanvas(); window.addEventListener('resize', sizeCanvas);

  // ====== CARGA PREGUNTAS ======
  fetch('questions.json', {cache:'no-store'})
    .then(r => r.ok ? r.json() : [])
    .then(data => { baseQuestions = Array.isArray(data) ? data : []; })
    .catch(() => {});

  // ====== TIMER ======
  function startTimer(){
    startTime = Date.now();
    timerId = setInterval(() => {
      const elapsed = Date.now()-startTime;
      timerEl.textContent = '⏱ ' + fmtTime(elapsed);
    }, 250);
  }
  function stopTimer(){
    if (timerId) { clearInterval(timerId); timerId = null; }
  }

  // ====== INICIO ======
  startBtn.addEventListener('click', () => {
    const f = (firstNameInput.value || '').trim();
    const l = (lastNameInput.value || '').trim();
    selModule = moduleSelect.value || 'SKY · Prueba 1';
    if (!f || !l) { welcomeError.textContent = 'Por favor, escribe tu nombre y apellido.'; return; }
    firstName = f; lastName = l;
    welcome.classList.add('hidden');
    startQuiz(true);
  });

  btnPrev.addEventListener('click', () => {
    if (current > 0) { current--; renderQuestion(true); }
  });

  btnNext.addEventListener('click', () => {
    if (btnNext.disabled) return;
    const state = btnNext.getAttribute('data-state') || 'next';
    if (state === 'results') { showSummary(); return; }
    if (current < questions.length - 1) { current++; renderQuestion(); }
  });

  // Navegación por teclado
  window.addEventListener('keydown', (e) => {
    if (quizArea.classList.contains('hidden')) return;
    const key = e.key.toLowerCase();
    const buttons = Array.from(optionsEl.querySelectorAll('.option-btn'));
    if (buttons.length){
      const map = {'1':0,'2':1,'3':2,'4':3,'5':4,'a':0,'b':1,'c':2,'d':3,'e':4};
      if (key in map){
        const idx = map[key];
        if (buttons[idx] && !buttons[idx].classList.contains('disabled')) {
          buttons[idx].click();
          e.preventDefault();
          return;
        }
      }
    }
    if (key === 'enter'){
      if (!btnNext.disabled) btnNext.click();
      e.preventDefault();
    } else if (key === 'backspace'){
      if (!btnPrev.disabled) btnPrev.click();
      e.preventDefault();
    }
  });

  // ====== QUIZ ======
  function startQuiz(shuffleQuestions=false){
    if (!baseQuestions.length){
      questions = [];
      quizArea.classList.remove('hidden');
      questionTitle.textContent = 'No hay preguntas disponibles. Agrega un questions.json.';
      optionsEl.innerHTML = '';
      setNextState('next', true, '⏭ Siguiente');
      btnPrev.disabled = true;
      progressBar.style.width = '0%'; progressText.textContent = 'Pregunta 0 / 0';
      scoreEl.textContent = '0 / 0'; liveStatsEl.textContent = 'Correctas: 0 · Incorrectas: 0';
      stepsEl.innerHTML = '';
      return;
    }
    questions = shuffleQuestions ? shuffle(baseQuestions) : baseQuestions.slice();
    current = 0;
    selections = new Array(questions.length).fill(null);
    attemptId = uid();
    buildSteps();
    quizArea.classList.remove('hidden');
    startTimer();
    renderQuestion();
  }

  function buildSteps(){
    stepsEl.innerHTML = '';
    for (let i=0;i<questions.length;i++){
      const s = document.createElement('div');
      s.className = 'step';
      s.title = 'Pregunta ' + (i+1);
      stepsEl.appendChild(s);
    }
  }
  function updateSteps(){
    const steps = Array.from(stepsEl.querySelectorAll('.step'));
    steps.forEach((el, i) => {
      el.classList.toggle('active', i === current);
      el.classList.toggle('done', selections[i] !== null);
    });
  }

  function counts(){
    const totalAnswered = selections.filter(x => x !== null).length;
    let correct = 0;
    selections.forEach((sel, i) => {
      if (sel !== null && sel === questions[i].options[questions[i].answerIndex]) correct++;
    });
    const incorrect = totalAnswered - correct;
    return { correct, incorrect, totalAnswered };
  }

  function renderQuestion(showAsAnswered=false){
    const item = questions[current];
    questionTitle.textContent = item.question;

    const card = document.getElementById('question-card');
    card.classList.remove('fade-in'); void card.offsetWidth; card.classList.add('fade-in');

    // Mezcla opciones en cada render
    const entries = item.options.map((t, i) => ({ text: t, correct: i === item.answerIndex }));
    const mixed = shuffle(entries);

    optionsEl.innerHTML = '';
    mixed.forEach((entry) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.type = 'button';
      btn.innerHTML = entry.text;
      btn.dataset.correct = entry.correct ? '1' : '0';
      btn.addEventListener('click', onSelect);
      optionsEl.appendChild(btn);
    });

    const pct = Math.round(((current) / Math.max(1, questions.length)) * 100);
    progressBar.style.width = pct + '%';
    progressText.textContent = 'Pregunta ' + (current + 1) + ' / ' + questions.length;

    resultEl.textContent = '';
    btnPrev.disabled = current === 0;

    const {correct, incorrect} = counts();
    scoreEl.textContent = correct + ' / ' + questions.length;
    liveStatsEl.textContent = 'Correctas: ' + correct + ' · Incorrectas: ' + incorrect;

    updateSteps();

    const selText = selections[current];
    if (selText !== null || showAsAnswered) {
      const buttons = Array.from(optionsEl.querySelectorAll('.option-btn'));
      buttons.forEach(b => b.classList.add('disabled'));
      const correctBtn = buttons.find(b => b.dataset.correct === '1');
      if (correctBtn) correctBtn.classList.add('correct');
      if (selText !== null) {
        const selectedBtn = buttons.find(b => b.innerHTML === selText);
        if (selectedBtn && selectedBtn.dataset.correct !== '1') selectedBtn.classList.add('incorrect');
      }
      if (current === questions.length - 1 && selText !== null) {
        setNextState('results', false, '📊 Ver resultados');
      } else {
        setNextState('next', selText === null, '⏭ Siguiente');
      }
    } else {
      setNextState('next', true, '⏭ Siguiente');
    }
  }

  function onSelect(ev){
    const btn = ev.currentTarget;
    const isCorrect = btn.dataset.correct === '1';
    const selectedText = btn.innerHTML;
    if (selections[current] !== null) return;
    selections[current] = selectedText;

    const buttons = Array.from(optionsEl.querySelectorAll('.option-btn'));
    buttons.forEach(b => b.classList.add('disabled'));
    const correctBtn = buttons.find(b => b.dataset.correct === '1');

    if (isCorrect) {
      btn.classList.add('correct');
      resultEl.textContent = '✅ Correcto';
    } else {
      btn.classList.add('incorrect');
      if (correctBtn) correctBtn.classList.add('correct');
      const correctText = questions[current].options[questions[current].answerIndex] || '';
      resultEl.textContent = '❌ Incorrecto — La correcta es: ' + correctText;
    }

    const {correct, incorrect} = counts();
    scoreEl.textContent = correct + ' / ' + questions.length;
    liveStatsEl.textContent = 'Correctas: ' + correct + ' · Incorrectas: ' + incorrect;
    updateSteps();

    if (current === questions.length - 1) {
      setNextState('results', false, '📊 Ver resultados');
    } else {
      setNextState('next', false, '⏭ Siguiente');
    }
  }

  function setNextState(state, disabled, label){
    btnNext.setAttribute('data-state', state);
    btnNext.disabled = !!disabled;
    btnNext.textContent = label;
  }

  function showSummary(){
    stopTimer();
    const {correct, incorrect} = counts();
    const total = questions.length || 1;
    const pct = Math.round((correct / total) * 100);
    const elapsed = Date.now()-startTime;

    if (pct >= 80) fireConfetti();

    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const dash = (pct/100) * circumference;

    const summaryHTML = `
      <div class="summary">
        <svg class="donut" viewBox="0 0 220 220" width="220" height="220" aria-label="Resumen">
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#60a5fa"/>
              <stop offset="100%" stop-color="#1d4ed8"/>
            </linearGradient>
          </defs>
          <circle cx="110" cy="110" r="${radius}" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="18"></circle>
          <circle id="donut-fill" cx="110" cy="110" r="${radius}" fill="none" stroke="url(#grad)" stroke-width="18"
                  stroke-dasharray="${2*Math.PI*radius}" stroke-dashoffset="${2*Math.PI*radius}"
                  transform="rotate(-90 110 110)" style="transition: stroke-dashoffset 900ms ease"></circle>
          <text x="110" y="105">${pct}%</text>
          <text x="110" y="135" style="font-size:12px; fill: var(--muted);">${correct}/${total} correctas</text>
        </svg>
        <div class="muted">Tiempo total: ${fmtTime(elapsed)}</div>
        <div class="buttons">
          <button id="btn-download" class="btn primary">📥 Descargar respuestas</button>
          <button id="btn-retry" class="btn ghost">🔁 Volver a intentar</button>
        </div>
      </div>
    `;
    questionTitle.textContent = 'Resumen';
    optionsEl.innerHTML = summaryHTML;
    resultEl.textContent = '';
    btnPrev.disabled = true;
    setNextState('next', true, '⏭ Siguiente');
    progressBar.style.width = '100%';
    progressText.textContent = 'Finalizado';
    scoreEl.textContent = correct + ' / ' + total;
    updateSteps();

    requestAnimationFrame(() => {
      const donut = document.getElementById('donut-fill');
      if (donut) donut.style.strokeDashoffset = String(2*Math.PI*radius - dash);
    });

    // Envía a Google Sheets (Apps Script) si hay URL configurada
    sendResultToSheets({
      attemptId,
      module: selModule,
      firstName,
      lastName,
      scorePct: pct,
      correct,
      total,
      elapsedMs: elapsed,
      timestamp: new Date().toISOString()
    });

    document.getElementById('btn-download').addEventListener('click', () => downloadResultsXLSX(elapsed));
    document.getElementById('btn-retry').addEventListener('click', () => {
      welcome.classList.remove('hidden');
      quizArea.classList.add('hidden');
    });
  }

  function downloadResultsXLSX(elapsedMs){
    const rows = [
      ['Módulo','Nombre','Apellido','Tiempo total','Intento'],
      [selModule, firstName,lastName,fmtTime(elapsedMs),attemptId],
      [],
      ['N°','Pregunta','Respuesta seleccionada','Respuesta correcta','¿Acertó?']
    ];
    selections.forEach((sel, i) => {
      const q = questions[i];
      const selText = sel !== null ? sel : '';
      const corText = q.options[q.answerIndex] || '';
      const ok = selText === corText ? 'Sí' : 'No';
      rows.push([i+1, q.question, selText, corText, ok]);
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Resultados');
    XLSX.writeFile(wb, 'resultado_quiz.xlsx');
  }

  // ====== ENVIAR A SHEETS (Apps Script) ======
  async function sendResultToSheets(payload){
    if (!WEBAPP_URL) return; // no configurado => no envía
    try{
      await fetch(WEBAPP_URL, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }catch(e){
      // Silencioso para no romper UX
      console.warn('No se pudo enviar a Sheets:', e);
    }
  }

  // ====== CONFETTI ======
  function fireConfetti(){
    particles = [];
    const colors = ['#60a5fa','#1d4ed8','#93c5fd','#22c55e','#f59e0b'];
    for (let i=0;i<180;i++){
      particles.push({
        x: Math.random()*confettiCanvas.width,
        y: -10 - Math.random()*confettiCanvas.height*0.5,
        r: 2 + Math.random()*4,
        c: colors[Math.floor(Math.random()*colors.length)],
        vx: (Math.random()-0.5)*2,
        vy: 2 + Math.random()*4,
        a: 0.8 + Math.random()*0.2
      });
    }
    let t = 0;
    const maxT = 200;
    function step(){
      const ctx = confettiCanvas.getContext('2d');
      ctx.clearRect(0,0,confettiCanvas.width,confettiCanvas.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.02;
        ctx.globalAlpha = p.a;
        ctx.fillStyle = p.c;
        ctx.beginPath();
        ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      t++;
      if (t<maxT) requestAnimationFrame(step);
    }
    step();
  }
})();
