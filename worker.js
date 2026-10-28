let pyodide;
try {
  self.postMessage({ type: 'progress', message: '正在下載 Python 執行環境…' });
  const { loadPyodide } = await import('https://cdn.jsdelivr.net/pyodide/v314.0.7/full/pyodide.mjs');
  self.postMessage({ type: 'progress', message: '正在啟動 Python…' });
  pyodide = await loadPyodide();
  self.postMessage({ type: 'ready' });
} catch (error) {
  self.postMessage({ type: 'load-error', message: String(error) });
}

const harness = `
import ast
import contextlib
import io
import json
import sys
import traceback

solution = json.loads(solution_json)
checker = json.loads(checker_json)
tests = json.loads(tests_json)

try:
    ast.parse(solution, filename='solution.py')
except SyntaxError as exc:
    verdict = {'status': 'SYNTAX_ERROR', 'message': str(exc), 'error': traceback.format_exc()}
else:
    def run_code(stdin):
        old_stdin, old_stdout, old_stderr = sys.stdin, sys.stdout, sys.stderr
        out, err = io.StringIO(), io.StringIO()
        try:
            sys.stdin = io.StringIO(str(stdin))
            sys.stdout, sys.stderr = out, err
            namespace = {'__name__': '__main__', '__file__': 'solution.py'}
            try:
                exec(compile(solution, 'solution.py', 'exec'), namespace)
                return {'status': 'OK', 'stdout': out.getvalue(), 'stderr': err.getvalue()}
            except BaseException:
                return {'status': 'RE', 'stdout': out.getvalue(), 'stderr': err.getvalue(), 'error': traceback.format_exc()}
        finally:
            sys.stdin, sys.stdout, sys.stderr = old_stdin, old_stdout, old_stderr

    try:
        namespace = {'__name__': '__judge__'}
        exec(compile(checker, 'checker.py', 'exec'), namespace)
        if not callable(namespace.get('judge')):
            raise ValueError('判題程式必須定義 judge(run_code, tests)')
        verdict = namespace['judge'](run_code, tests)
        if not isinstance(verdict, dict) or not isinstance(verdict.get('status'), str):
            raise ValueError('judge() 必須回傳含 status 的 dict')
    except BaseException:
        verdict = {'status': 'JUDGE_ERROR', 'message': 'AI 判題程式執行失敗', 'error': traceback.format_exc()}

json.dumps(verdict, ensure_ascii=False)
`;

self.onmessage = async ({ data }) => {
  if (!pyodide || data.type !== 'judge') return;
  try {
    pyodide.globals.set('solution_json', JSON.stringify(data.solution));
    pyodide.globals.set('checker_json', JSON.stringify(data.checker));
    pyodide.globals.set('tests_json', JSON.stringify(data.tests));
    const resultJson = await pyodide.runPythonAsync(harness);
    self.postMessage({ type: 'result', result: JSON.parse(resultJson) });
  } catch (error) {
    self.postMessage({ type: 'result', result: { status: 'JUDGE_ERROR', message: '判題環境發生錯誤', error: String(error) } });
  }
};
