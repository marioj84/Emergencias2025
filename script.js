
(() => {
  const welcome = document.getElementById('welcome');
  const firstNameInput = document.getElementById('first-name');
  const lastNameInput = document.getElementById('last-name');
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

  let firstName = '';
  let lastName = '';

  let questions = [];
  let current = 0;
  let selections = []; // índice seleccionado por pregunta

  // Cargar preguntas desde questions.json (no hay controles de carga)
  fetch('questions.json', {cache:'no-store'})
    .then(r => r.ok ? r.json() : [])
    .then(data => { questions = data || []; })
    .catch(() => {});

  // Inicio del quiz tras capturar nombre/apellido
  startBtn.addEventListener('click', () => {
    const f = (firstNameInput.value || '').trim();
    const l = (lastNameInput.value || '').trim();
    if (!f || !l) {
      welcomeError.textContent = 'Por favor, escribe tu nombre y apellido.';
      return;
    }
    firstName = f; lastName = l;
    welcome.classList.add('hidden');
    startQuiz();
  });

  btnPrev.addEventListener('click', () => {
    if (current > 0) { current--; renderQuestion(true); }
  });
  btnNext.addEventListener('click', () => {
    if (!questions.length) return;
    // Si es la última y ya respondida, ver resultados
    if (current >= questions.length - 1 && selections[current] !== null) {
      showSummary();
      return;
    }
    if (current < questions.length - 1) {
      current++; renderQuestion();
    }
  });

  function startQuiz() {
    if (!questions.length) {
      // Mensaje si no hay preguntas
      quizArea.classList.remove('hidden');
      questionTitle.textContent = 'No hay preguntas disponibles. Agrega un questions.json.';
      optionsEl.innerHTML = '';
      btnNext.disabled = true; btnPrev.disabled = true;
      progressBar.style.width = '0%'; progressText.textContent = 'Pregunta 0 / 0';
      scoreEl.textContent = '0 / 0'; liveStatsEl.textContent = 'Correctas: 0 · Incorrectas: 0';
      return;
    }
    current = 0;
    selections = new Array(questions.length).fill(null);
    quizArea.classList.remove('hidden');
    renderQuestion();
  }

  function counts(){
    const totalAnswered = selections.filter(x => x !== null).length;
    let correct = 0;
    selections.forEach((sel, i) => {
      if (sel !== null && sel === questions[i].answerIndex) correct++;
    });
    const incorrect = totalAnswered - correct;
    return { correct, incorrect, totalAnswered };
  }

  function renderQuestion(showAsAnswered=false) {
    const item = questions[current];
    questionTitle.textContent = item.question;
    optionsEl.innerHTML = '';
    item.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.type = 'button';
      btn.innerHTML = opt;
      btn.dataset.index = i;
      btn.addEventListener('click', onSelect);
      optionsEl.appendChild(btn);
    });

    const pct = Math.round(((current) / Math.max(1, questions.length)) * 100);
    progressBar.style.width = pct + '%';
    progressText.textContent = 'Pregunta ' + (current + 1) + ' / ' + questions.length;

    resultEl.textContent = '';
    btnNext.disabled = true;
    btnPrev.disabled = current === 0;

    const {correct, incorrect} = counts();
    scoreEl.textContent = correct + ' / ' + questions.length;
    liveStatsEl.textContent = 'Correctas: ' + correct + ' · Incorrectas: ' + incorrect;

    const sel = selections[current];
    if (sel !== null || showAsAnswered) {
      const buttons = Array.from(optionsEl.querySelectorAll('.option-btn'));
      buttons.forEach(b => b.classList.add('disabled'));
      const correctIdx = item.answerIndex;
      const correctBtn = buttons.find(b => Number(b.dataset.index) === correctIdx);
      if (correctBtn) correctBtn.classList.add('correct');
      if (sel !== null && sel !== correctIdx) {
        const selectedBtn = buttons.find(b => Number(b.dataset.index) === sel);
        if (selectedBtn) selectedBtn.classList.add('incorrect');
      }
      btnNext.disabled = false;
      if (current === questions.length - 1 && sel !== null) {
        btnNext.textContent = 'Ver resultados';
        btnNext.onclick = showSummary;
      } else {
        btnNext.textContent = 'Siguiente';
        btnNext.onclick = null;
      }
    } else {
      btnNext.textContent = 'Siguiente';
      btnNext.onclick = null;
    }
  }

  function onSelect(ev) {
    const idx = Number(ev.currentTarget.dataset.index);
    const item = questions[current];
    if (selections[current] !== null) return;
    selections[current] = idx;

    const buttons = Array.from(optionsEl.querySelectorAll('.option-btn'));
    buttons.forEach(b => b.classList.add('disabled'));
    const correctIdx = item.answerIndex;
    const correctText = item.options[correctIdx] || '';

    if (idx === correctIdx) {
      ev.currentTarget.classList.add('correct');
      resultEl.textContent = 'Correcto ✅';
    } else {
      ev.currentTarget.classList.add('incorrect');
      const correctBtn = buttons.find(b => Number(b.dataset.index) === correctIdx);
      if (correctBtn) correctBtn.classList.add('correct');
      resultEl.textContent = 'Incorrecto, la respuesta correcta es: ' + correctText;
    }

    const {correct, incorrect} = counts();
    scoreEl.textContent = correct + ' / ' + questions.length;
    liveStatsEl.textContent = 'Correctas: ' + correct + ' · Incorrectas: ' + incorrect;

    btnNext.disabled = false;
    if (current === questions.length - 1) {
      btnNext.textContent = 'Ver resultados';
      btnNext.onclick = showSummary;
    } else {
      btnNext.textContent = 'Siguiente';
      btnNext.onclick = null;
    }
  }

  function showSummary() {
    const {correct, incorrect} = counts();
    const total = questions.length || 1;
    const pct = Math.round((correct / total) * 100);
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    const dash = (pct/100) * circumference;
    const gap = circumference - dash;

    const summaryHTML = `
      <div class="summary">
        <svg class="donut" viewBox="0 0 180 180" width="180" height="180" aria-label="Resumen">
          <circle cx="90" cy="90" r="${radius}" fill="none" stroke="#e5e7eb" stroke-width="18"></circle>
          <circle cx="90" cy="90" r="${radius}" fill="none" stroke="#10b981" stroke-width="18"
                  stroke-dasharray="${dash} ${gap}" transform="rotate(-90 90 90)"></circle>
          <text x="90" y="90">${pct}%</text>
        </svg>
        <div class="muted">Resumen: ${correct} correctas de ${total} preguntas</div>
        <div class="muted">Incorrectas: ${incorrect}</div>
        <div class="buttons">
          <button id="btn-download" class="btn">Descargar respuestas</button>
          <button id="btn-retry" class="btn ghost">Volver a intentar</button>
        </div>
      </div>
    `;
    questionTitle.textContent = 'Resumen';
    optionsEl.innerHTML = summaryHTML;
    resultEl.textContent = '';
    btnPrev.disabled = true;
    btnNext.disabled = true;
    progressBar.style.width = '100%';
    progressText.textContent = 'Finalizado';
    scoreEl.textContent = correct + ' / ' + total;

    document.getElementById('btn-download').addEventListener('click', downloadResultsXLSX);
    document.getElementById('btn-retry').addEventListener('click', () => {
      welcome.classList.remove('hidden');
      quizArea.classList.add('hidden');
      // mantener nombre lleno si quieres, si no, limpiar:
      // firstNameInput.value = ''; lastNameInput.value = '';
    });
  }

  function downloadResultsXLSX(){
    // Primera fila con Nombre y Apellido
    const rows = [['Nombre', 'Apellido', '', '', ''], [firstName, lastName, '', '', ''], [],
                  ['N°','Pregunta','Respuesta seleccionada','Respuesta correcta','¿Acertó?']];
    selections.forEach((sel, i) => {
      const q = questions[i];
      const selText = sel !== null && sel >= 0 ? q.options[sel] : '';
      const corText = q.options[q.answerIndex] || '';
      const ok = sel === q.answerIndex ? 'Sí' : 'No';
      rows.push([i+1, q.question, selText, corText, ok]);
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Resultados');
    XLSX.writeFile(wb, 'resultado_quiz.xlsx');
  }
})();
