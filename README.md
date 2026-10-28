# APCS Practice Judge

個人用 Python 練習 judge。GitHub Pages 提供靜態頁面；Pyodide 在瀏覽器 Web Worker 中執行 Python。

1. 將 [judge.md](judge.md) 的提示交給 AI，請它出題。
2. 把題目、JSON 測資與 Python 判題程式貼到對應欄位。
3. 寫完整 Python 解答，按「開始判題」或 `Ctrl/Cmd + Enter`。

網站會顯示 AC、WA、RE、SyntaxError 或 TLE。TLE 是整次判題超過 10 秒；本版沒有精準 MLE。輸入內容存於瀏覽器 localStorage；第一次載入 Pyodide 需要網路。請只貼你信任的 AI 判題程式，因為它會在你的瀏覽器中執行。

本專案無需建置工具。要在本機預覽，於此資料夾執行 `python3 -m http.server 8000` 並開啟 `http://localhost:8000`。發布時在 repository 的 Settings → Pages 選擇 `Deploy from a branch`，指定 `main` 和根目錄 `/`。
