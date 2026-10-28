const $ = (id) => document.getElementById(id);
const fields = ['problem', 'solution', 'tests', 'checker'];
const LIMIT_MS = 10000;
let worker;
let ready = false;
let running = false;
let timer;

for (const id of fields) {
  const field = $(id);
  field.value = localStorage.getItem(`apcs-${id}`) ?? '';
  field.addEventListener('input', () => localStorage.setItem(`apcs-${id}`, field.value));
  field.addEventListener('keydown', (event) => {
    if (event.key === 'Tab') {
      event.preventDefault();
      field.setRangeText('    ', field.selectionStart, field.selectionEnd, 'end');
      field.dispatchEvent(new Event('input'));
    }
  });
}

function toggle(id, buttonId, label) {
  const shown = $(id).classList.toggle('revealed');
  $(buttonId).textContent = `${shown ? '隱藏' : '顯示'}${label}`;
  $(buttonId).setAttribute('aria-pressed', String(shown));
}
$('toggleTests').addEventListener('click', () => toggle('tests', 'toggleTests', '測資'));
$('toggleChecker').addEventListener('click', () => toggle('checker', 'toggleChecker', '判題程式'));

function setVerdict(label, detail, css = '', error = '') {
  $('verdict').textContent = label;
  $('verdict').className = css;
  $('detail').textContent = detail;
  $('errorDetail').hidden = !error;
  $('errorDetail').textContent = error;
}

function startWorker() {
  ready = false;
  $('runButton').disabled = true;
  $('runtimeStatus').textContent = 'Python 載入中…';
  worker = new Worker('worker.js', { type: 'module' });
  worker.onmessage = ({ data }) => {
    if (data.type === 'ready') {
      ready = true;
      $('runButton').disabled = false;
      $('runtimeStatus').textContent = 'Python 已就緒';
      return;
    }
    if (data.type === 'load-error') {
      $('runtimeStatus').textContent = 'Python 載入失敗，請重新整理頁面';
      setVerdict('載入失敗', '請檢查網路連線後重新整理。', 'verdict-error', data.message);
      return;
    }
    if (data.type === 'result') {
      clearTimeout(timer);
      running = false;
      $('runButton').disabled = !ready;
      const result = data.result;
      const status = result.status || 'JUDGE_ERROR';
      const names = { AC: 'AC · 通過', WA: 'WA · 答案錯誤', TLE: 'TLE · 執行逾時', RE: 'RE · 執行錯誤', SYNTAX_ERROR: 'SyntaxError · 語法錯誤', JUDGE_ERROR: '判題程式錯誤' };
      const css = status === 'AC' ? 'verdict-ac' : status === 'WA' || status === 'TLE' ? 'verdict-wa' : 'verdict-error';
      setVerdict(names[status] || status, result.message || '', css, result.error || '');
    }
  };
  worker.onerror = (event) => {
    clearTimeout(timer);
    running = false;
    ready = false;
    $('runtimeStatus').textContent = 'Python 執行環境發生錯誤';
    setVerdict('執行環境錯誤', '請重新整理頁面。', 'verdict-error', event.message || '未知錯誤');
  };
}

$('runButton').addEventListener('click', () => {
  if (!ready || running) return;
  const solution = $('solution').value;
  const checker = $('checker').value;
  let tests;
  if (!solution.trim() || !checker.trim() || !$('tests').value.trim()) {
    setVerdict('資料未填齊', '請填入你的解答、隱藏測資與 AI 判題程式。', 'verdict-error');
    return;
  }
  try {
    tests = JSON.parse($('tests').value);
    if (!Array.isArray(tests) || tests.length === 0) throw new Error('測資必須是非空 JSON 陣列');
  } catch (error) {
    setVerdict('測資格式錯誤', '請讓 AI 按 judge.md 的格式產生 JSON。', 'verdict-error', error.message);
    return;
  }
  running = true;
  $('runButton').disabled = true;
  setVerdict('判題中…', '正在執行 Python 程式。');
  worker.postMessage({ type: 'judge', solution, checker, tests });
  timer = setTimeout(() => {
    worker.terminate();
    running = false;
    setVerdict('TLE · 執行逾時', '整次判題超過 10 秒，執行環境將重新載入。', 'verdict-tle');
    startWorker();
  }, LIMIT_MS);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    $('runButton').click();
  }
});

startWorker();
