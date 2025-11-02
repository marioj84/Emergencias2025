
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

  fetch('questions.json', {cache:'no-store'}).then(r=>r.ok?r.json():[]).then(data=>{
    questions = data||[];
    if(questions.length){ startQuiz(); }
  });

  function startQuiz(){
    current=0;correctCount=0;answered=false;selections=new Array(questions.length).fill(null);
    quizArea.classList.remove('hidden');
    renderQuestion();
  }

  function renderQuestion(){
    const item = questions[current];
    questionTitle.textContent = item.question;
    optionsEl.innerHTML='';
    item.options.forEach((opt,i)=>{
      const b=document.createElement('button');
      b.className='option-btn';b.innerHTML=opt;b.dataset.index=i;
      b.onclick=onSelect;optionsEl.appendChild(b);
    });
    updateProgress();
    resultEl.textContent='';btnNext.disabled=true;btnPrev.disabled=current===0;
    scoreEl.textContent=correctCount+' / '+questions.length;
  }

  function onSelect(ev){
    if(answered)return;answered=true;
    const idx=+ev.currentTarget.dataset.index;const item=questions[current];
    selections[current]=idx;
    const buttons=[...optionsEl.querySelectorAll('.option-btn')];
    buttons.forEach(b=>b.classList.add('disabled'));
    const correctIdx=item.answerIndex;
    if(idx===correctIdx){ev.currentTarget.classList.add('correct');resultEl.textContent='Correcto ✅';correctCount++;}
    else{ev.currentTarget.classList.add('incorrect');buttons[correctIdx].classList.add('correct');resultEl.textContent='Incorrecto, la respuesta correcta es: '+item.options[correctIdx];}
    btnNext.disabled=false;
    btnNext.textContent=(current===questions.length-1)?'Descargar respuestas':'Siguiente';
    if(current===questions.length-1){btnNext.onclick=()=>showSummary();}
    scoreEl.textContent=correctCount+' / '+questions.length;
  }

  btnPrev.onclick=()=>{if(current>0){current--;answered=false;renderQuestion();}};
  btnNext.onclick=()=>{if(current<questions.length-1){current++;answered=false;renderQuestion();}};
  btnReset.onclick=()=>{questions=[];quizArea.classList.add('hidden');};

  function updateProgress(){
    const pct=Math.round(((current)/Math.max(1,questions.length))*100);
    progressBar.style.width=pct+'%';
    progressText.textContent='Pregunta '+(current+1)+' / '+questions.length;
  }

  function showSummary(){
    const total=questions.length||1;
    const pct=Math.round((correctCount/total)*100);
    const radius=70;const circ=2*Math.PI*radius;const dash=(pct/100)*circ;const gap=circ-dash;
    optionsEl.innerHTML=`
    <div class="summary">
      <svg class="donut" viewBox="0 0 180 180" width="180" height="180">
        <circle cx="90" cy="90" r="${radius}" fill="none" stroke="#e5e7eb" stroke-width="18"></circle>
        <circle cx="90" cy="90" r="${radius}" fill="none" stroke="#10b981" stroke-width="18"
          stroke-dasharray="${dash} ${gap}" transform="rotate(-90 90 90)"></circle>
        <text x="90" y="90">${pct}%</text>
      </svg>
      <div class="muted">Resumen: ${correctCount} correctas de ${total} preguntas</div>
      <div class="buttons">
        <button id="btn-download" class="btn">Descargar respuestas</button>
        <button id="btn-retry" class="btn ghost">Volver a intentar</button>
      </div>
    </div>`;
    questionTitle.textContent='Resumen';
    resultEl.textContent='';
    btnNext.disabled=true;btnPrev.disabled=true;
    progressBar.style.width='100%';progressText.textContent='Finalizado';
    scoreEl.textContent=correctCount+' / '+total;
    document.getElementById('btn-download').onclick=downloadResults;
    document.getElementById('btn-retry').onclick=startQuiz;
  }

  function downloadResults(){
    const rows=[['N°','Pregunta','Respuesta seleccionada','Respuesta correcta','¿Acertó?']];
    questions.forEach((q,i)=>{
      const sel=selections[i];const cor=q.answerIndex;
      rows.push([i+1,q.question,q.options[sel]||'',q.options[cor]||'',sel===cor?'Sí':'No']);
    });
    const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);
    a.download='resultado_quiz.csv';a.click();
  }
})();
