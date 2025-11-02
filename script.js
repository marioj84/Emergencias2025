
(() => {
  const fileInput = document.getElementById('file-input');
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
  const btnGenerateJSON = document.getElementById('btn-generate-json');
  const btnReset = document.getElementById('btn-reset');

  let questions = [];
  let current = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let answered = false;
  let selections = []; // track selected index per question

  // Try auto-load questions.json
  fetch('questions.json', {cache:'no-store'}).then(r => {
    if (!r.ok) throw new Error('no json');
    return r.json();
  }).then(data => {
    questions = data || [];
    if (questions.length) {
      startQuiz();
    }
  }).catch(() => {
    // no embedded json; wait for excel upload
  });

  fileInput.addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    readExcelFile(f);
  });

  btnReset.addEventListener('click', () => {
    questions = []; current = 0; correctCount = 0; incorrectCount = 0; answered = false;
    selections = [];
    quizArea.classList.add('hidden');
    resultEl.textContent = '';
    optionsEl.innerHTML = '';
    progressBar.style.width = '0%';
    progressText.textContent = 'Pregunta 0 / 0';
    scoreEl.textContent = '0 / 0';
    liveStatsEl.textContent = 'Correctas: 0 · Incorrectas: 0';
    fileInput.value = '';
  });

  btnGenerateJSON.addEventListener('click', () => {
    if (!questions.length) {
      alert('No hay preguntas cargadas.');
      return;
    }
    const blob = new Blob([JSON.stringify(questions, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'questions.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  btnPrev.addEventListener('click', () => {
    if (!questions.length) return;
    if (current > 0) {
      current--;
      // no recalc counts when solo navegamos atrás; solo mostrar estado
      renderQuestion(true);
    }
  });

  btnNext.addEventListener('click', () => {
    if (!questions.length) return;
    if (current >= questions.length - 1) {
      showSummary();
      return;
    }
    current++;
    answered = false;
    renderQuestion();
  });

  function startQuiz() {
    current = 0; correctCount = 0; incorrectCount = 0; answered = false;
    selections = new Array(questions.length).fill(null);
    quizArea.classList.remove('hidden');
    renderQuestion();
  }

  function readExcelFile(file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target.result);
      const workbook = XLSX.read(data, {type:'array'});
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, {header:1, raw:false});
      parseRows(rows);
    };
    reader.readAsArrayBuffer(file);
  }

  function parseRows(rows) {
    const parsed = [];
    for (let r=0;r<rows.length;r++){
      const row = rows[r];
      if (!row || row.length===0) continue;
      if (r === 0) {
        const first = String(row[0]||'').toLowerCase();
        if (first.includes('preg') || first.includes('pregunta') || first.includes('question')) continue;
      }
      const q = String(row[0]||'').trim();
      if (!q) continue;
      const opts = [];
      for (let i=1;i<=5;i++){
        const v = row[i];
        if (v !== undefined && String(v).trim() !== '') opts.push(String(v).trim());
      }
      if (!opts.length) { opts.push('Opción 1'); opts.push('Opción 2'); }
      const answerRaw = row[6] !== undefined ? String(row[6]).trim() : '';
      let answerIdx = 0;
      if (answerRaw !== '') {
        const asNum = parseInt(answerRaw,10);
        if (!Number.isNaN(asNum) && asNum >= 1 && asNum <= opts.length) {
          answerIdx = asNum - 1;
        } else {
          const letter = answerRaw.toUpperCase();
          const letters = ['A','B','C','D','E'];
          const li = letters.indexOf(letter);
          if (li !== -1 && li < opts.length) answerIdx = li;
          else {
            const matchIndex = opts.findIndex(o => o.toLowerCase() === answerRaw.toLowerCase());
            answerIdx = matchIndex !== -1 ? matchIndex : 0;
          }
        }
      } else answerIdx = 0;
      parsed.push({question:q, options:opts, answerIndex:answerIdx});
    }
    questions = parsed;
    startQuiz();
  }

  function renderQuestion(showAsAnswered = false) {
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
    updateProgress();
    resultEl.textContent = '';
    btnNext.disabled = true;
    btnPrev.disabled = current === 0;
    scoreEl.textContent = correctCount + ' / ' + questions.length;
    liveStatsEl.textContent = 'Correctas: ' + correctCount + ' · Incorrectas: ' + incorrectCount;

    // If already answered this one, show state
    const sel = selections[current];
    if (showAsAnswered && sel !== null) {
      const buttons = Array.from(optionsEl.querySelectorAll('.option-btn'));
      buttons.forEach(b => b.classList.add('disabled'));
      const correctIdx = item.answerIndex;
      const correctBtn = buttons.find(b => Number(b.dataset.index) === correctIdx);
      if (correctBtn) correctBtn.classList.add('correct');
      const selectedBtn = buttons.find(b => Number(b.dataset.index) === sel);
      if (selectedBtn && sel !== correctIdx) selectedBtn.classList.add('incorrect');
      btnNext.disabled = false;
    }
  }

  function onSelect(ev) {
    if (answered) return;
    answered = true;
    const idx = Number(ev.currentTarget.dataset.index);
    const item = questions[current];
    selections[current] = idx;
    const buttons = Array.from(optionsEl.querySelectorAll('.option-btn'));
    buttons.forEach(b => b.classList.add('disabled'));
    const correctIdx = item.answerIndex;
    const correctText = item.options[correctIdx] || '';

    if (idx === correctIdx) {
      ev.currentTarget.classList.add('correct');
      resultEl.textContent = 'Correcto ✅';
      correctCount++;
    } else {
      ev.currentTarget.classList.add('incorrect');
      const correctBtn = buttons.find(b => Number(b.dataset.index) === correctIdx);
      if (correctBtn) correctBtn.classList.add('correct');
      resultEl.textContent = 'Incorrecto, la respuesta correcta es: ' + correctText;
      incorrectCount++;
    }
    btnNext.disabled = false;
    btnNext.textContent = (current === questions.length - 1) ? 'Descargar preguntas, respuestas seleccionadas y respuesta correcta' : 'Siguiente';
    scoreEl.textContent = correctCount + ' / ' + questions.length;
    liveStatsEl.textContent = 'Correctas: ' + correctCount + ' · Incorrectas: ' + incorrectCount;

    // If last question, clicking will download results
    if (current === questions.length - 1) {
      btnNext.onclick = () => {
        downloadResults();
      };
    } else {
      // restore default handler
      btnNext.onclick = null;
    }
  }

  function updateProgress() {
    const pct = Math.round(((current) / Math.max(1, questions.length)) * 100);
    progressBar.style.width = pct + '%';
    progressText.textContent = 'Pregunta ' + (current + 1) + ' / ' + questions.length;
  }

  function showSummary() {
    // Render donut summary replacing question card
    const total = questions.length || 1;
    const pct = Math.round((correctCount / total) * 100);
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
        <div class="muted">Resumen: ${correctCount} correctas de ${total} preguntas</div>
        <div class="muted">Incorrectas: ${incorrectCount}</div>
        <button id="btn-download" class="btn">Descargar preguntas, respuestas seleccionadas y respuesta correcta</button>
      </div>
    `;
    questionTitle.textContent = 'Resumen';
    optionsEl.innerHTML = summaryHTML;
    resultEl.textContent = '';
    btnPrev.disabled = true;
    btnNext.disabled = true;
    progressBar.style.width = '100%';
    progressText.textContent = 'Finalizado';
    scoreEl.textContent = correctCount + ' / ' + total;
    const dl = document.getElementById('btn-download');
    dl.addEventListener('click', downloadResults);
  }

  function downloadResults() {
    // build CSV with columns: #, Pregunta, Opción Seleccionada, Correcta, ¿Acertó?
    const rows = [];
    rows.push(['N°','Pregunta','Respuesta seleccionada','Respuesta correcta','¿Acertó?']);
    questions.forEach((q, i) => {
      const selIdx = selections[i];
      const selText = selIdx !== null && selIdx >= 0 ? q.options[selIdx] : '';
      const corText = q.options[q.answerIndex];
      const ok = selIdx === q.answerIndex ? 'Sí' : 'No';
      rows.push([i+1, q.question, selText, corText, ok]);
    });
    const csv = rows.map(r => r.map(v => {
      const s = String(v).replace(/"/g,'""');
      return `"${s}"`;
    }).join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resultado_quiz.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Expose for debugging
  window.__quiz = { get questions(){ return questions; }, get selections(){ return selections; } };
})();
