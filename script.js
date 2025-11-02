
// Step 1: Progress bar only (precisa y visible)
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
  const scoreEl = document.getElementById('score');
  const btnGenerateJSON = document.getElementById('btn-generate-json');
  const btnReset = document.getElementById('btn-reset');

  let questions = [];
  let current = 0;
  let correctCount = 0;
  let answered = false;
  let selections = [];

  // Intentar auto-cargar questions.json
  fetch('questions.json', {cache:'no-store'}).then(r=>{
    if(!r.ok) throw new Error('no json');
    return r.json();
  }).then(data=>{
    questions = data || [];
    if(questions.length){ startQuiz(); }
  }).catch(()=>{});

  fileInput.addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    readExcelFile(f);
  });

  btnReset.addEventListener('click', () => {
    questions = []; current = 0; correctCount = 0; answered = false;
    selections = [];
    quizArea.classList.add('hidden');
    resultEl.textContent = '';
    optionsEl.innerHTML = '';
    setProgress(0, 0, false);
    scoreEl.textContent = '0 / 0';
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
      answered = selections[current] !== null;
      renderQuestion();
    }
  });

  btnNext.addEventListener('click', () => {
    if (!questions.length) return;
    if (current >= questions.length - 1) {
      // fin
      setProgress(questions.length, questions.length, true);
      questionTitle.textContent = 'Resumen';
      optionsEl.innerHTML = '<div class="muted">Has respondido ' + correctCount + ' de ' + questions.length + ' preguntas.</div>';
      resultEl.textContent = '';
      btnNext.disabled = true;
      btnPrev.disabled = true;
      scoreEl.textContent = correctCount + ' / ' + questions.length;
      return;
    }
    current++;
    answered = false;
    renderQuestion();
  });

  function startQuiz(){
    current = 0; correctCount = 0; answered = false;
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

  function parseRows(rows){
    const parsed = [];
    for(let r=0;r<rows.length;r++){
      const row = rows[r];
      if(!row || row.length===0) continue;
      if(r===0){
        const first = String(row[0]||'').toLowerCase();
        if(first.includes('preg')||first.includes('pregunta')||first.includes('question')) continue;
      }
      const q = String(row[0]||'').trim();
      if(!q) continue;
      const opts = [];
      for(let i=1;i<=5;i++){
        const v = row[i];
        if(v !== undefined && String(v).trim()!=='') opts.push(String(v).trim());
      }
      if(!opts.length){ opts.push('Opción 1'); opts.push('Opción 2'); }
      const answerRaw = row[6] !== undefined ? String(row[6]).trim() : '';
      let answerIdx = 0;
      if(answerRaw!==''){
        const asNum = parseInt(answerRaw,10);
        if(!Number.isNaN(asNum) && asNum>=1 && asNum<=opts.length){ answerIdx = asNum-1; }
        else{
          const letter = answerRaw.toUpperCase();
          const letters = ['A','B','C','D','E'];
          const li = letters.indexOf(letter);
          if(li !== -1 && li < opts.length) answerIdx = li;
          else{
            const matchIndex = opts.findIndex(o => o.toLowerCase() === answerRaw.toLowerCase());
            answerIdx = matchIndex !== -1 ? matchIndex : 0;
          }
        }
      }else answerIdx = 0;
      parsed.push({question:q, options:opts, answerIndex:answerIdx});
    }
    questions = parsed;
    startQuiz();
  }

  function renderQuestion(){
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

    // progreso: si la pregunta actual ya fue respondida, considerarla completada
    const completed = selections.filter(x => x !== null).length;
    setProgress(completed, questions.length, false);

    resultEl.textContent = '';
    btnNext.disabled = true;
    btnPrev.disabled = current === 0;
    scoreEl.textContent = correctCount + ' / ' + questions.length;

    // si ya fue respondida, mostrar estado bloqueado
    const sel = selections[current];
    if(sel !== null){
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

  function onSelect(ev){
    if(answered) return;
    answered = true;
    const idx = Number(ev.currentTarget.dataset.index);
    const item = questions[current];
    selections[current] = idx;

    // recalcular progreso (esta pregunta pasa a "completada")
    const completed = selections.filter(x => x !== null).length;
    setProgress(completed, questions.length, false);

    const buttons = Array.from(optionsEl.querySelectorAll('.option-btn'));
    buttons.forEach(b => b.classList.add('disabled'));
    const correctIdx = item.answerIndex;
    if(idx === correctIdx){
      ev.currentTarget.classList.add('correct');
      resultEl.textContent = 'Correcto ✅';
      correctCount++;
    }else{
      ev.currentTarget.classList.add('incorrect');
      const correctBtn = buttons.find(b => Number(b.dataset.index) === correctIdx);
      if (correctBtn) correctBtn.classList.add('correct');
      resultEl.textContent = 'Incorrecto — se muestra la respuesta correcta.';
    }
    btnNext.disabled = false;
    scoreEl.textContent = correctCount + ' / ' + questions.length;
  }

  // Precisión del avance: completed/total -> barra y texto
  function setProgress(completed, total, isFinal){
    total = Math.max(1, total);
    const pct = Math.round((completed/total)*100);
    progressBar.style.width = pct + '%';
    if(isFinal){
      progressText.textContent = 'Finalizado';
    }else{
      // Mostrar pregunta actual indexada 1..N
      const currentShown = Math.min(completed + 1, total);
      progressText.textContent = 'Pregunta ' + currentShown + ' / ' + total;
    }
  }
})();
