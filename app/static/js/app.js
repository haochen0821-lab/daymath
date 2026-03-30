/**
 * Daymath - 主應用程式入口
 */

const OPERATION_LABELS = {
  addition: "加法",
  subtraction: "減法",
  multiplication: "乘法",
  division: "除法",
};

const MODE_LABELS = {
  timeAttack: "限時挑戰",
  sprint: "定額衝刺",
};

const TIME_OPTIONS = [1, 3, 5]; // 分鐘
const SPRINT_OPTIONS = [20, 50, 100]; // 題數

// --- 設定畫面 ---
function SetupScreen({ onStart }) {
  const [operation, setOperation] = React.useState("addition");
  const [level, setLevel] = React.useState(1);
  const [mode, setMode] = React.useState("timeAttack");
  const [modeValue, setModeValue] = React.useState(3);

  const operations = QuestionGenerator.getOperations();
  const maxLevel = QuestionGenerator.getMaxLevel(operation);

  React.useEffect(() => {
    if (level > maxLevel) setLevel(1);
  }, [operation, maxLevel, level]);

  React.useEffect(() => {
    setModeValue(mode === "timeAttack" ? 3 : 20);
  }, [mode]);

  const handleStart = () => {
    onStart(operation, level, mode, modeValue);
  };

  return (
    <div className="setup-screen">
      <h1 className="app-title">Daymath</h1>
      <p className="app-subtitle">心算耐力與速度訓練</p>

      <div className="setup-section">
        <h3>選擇運算</h3>
        <div className="btn-group">
          {Object.entries(OPERATION_LABELS).map(([key, label]) => (
            <button
              key={key}
              className={`btn ${operation === key ? "btn-active" : ""}`}
              onClick={() => setOperation(key)}
            >
              {operations[key].symbol} {label}
            </button>
          ))}
        </div>
      </div>

      <div className="setup-section">
        <h3>選擇難度</h3>
        <div className="btn-group">
          {Object.entries(operations[operation].levels).map(([lvl, info]) => (
            <button
              key={lvl}
              className={`btn ${level === Number(lvl) ? "btn-active" : ""}`}
              onClick={() => setLevel(Number(lvl))}
            >
              Lv.{lvl} {info.name}
            </button>
          ))}
        </div>
        <p className="level-desc">
          {operations[operation].levels[level]?.description}
        </p>
      </div>

      <div className="setup-section">
        <h3>選擇模式</h3>
        <div className="btn-group">
          {Object.entries(MODE_LABELS).map(([key, label]) => (
            <button
              key={key}
              className={`btn ${mode === key ? "btn-active" : ""}`}
              onClick={() => setMode(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="setup-section">
        <h3>{mode === "timeAttack" ? "時間設定" : "題數設定"}</h3>
        <div className="btn-group">
          {(mode === "timeAttack" ? TIME_OPTIONS : SPRINT_OPTIONS).map((v) => (
            <button
              key={v}
              className={`btn ${modeValue === v ? "btn-active" : ""}`}
              onClick={() => setModeValue(v)}
            >
              {mode === "timeAttack" ? `${v} 分鐘` : `${v} 題`}
            </button>
          ))}
        </div>
      </div>

      <button className="btn btn-start" onClick={handleStart}>
        開始練習
      </button>
    </div>
  );
}

// --- 練習畫面 ---
function PracticeScreen({ session }) {
  const [input, setInput] = React.useState("");
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    if (inputRef.current && !session.sessionResult) {
      inputRef.current.focus();
    }
  }, [session.currentQuestion, session.feedback, session.sessionResult]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || session.feedback) return;
    session.submitAnswer(input.trim());
    setInput("");
  };

  const handleKeyDown = (e) => {
    // 允許負號在開頭
    if (e.key === "-" && input === "") return;
    // 只允許數字
    if (!/[0-9]/.test(e.key) && !["Backspace", "Enter", "Tab", "-"].includes(e.key)) {
      e.preventDefault();
    }
  };

  if (session.sessionResult) {
    return <ResultScreen session={session} />;
  }

  const { config, timer } = session;

  return (
    <div className={`practice-screen ${session.feedback?.type === "correct" ? "flash-correct" : ""} ${session.feedback?.type === "wrong" ? "flash-wrong" : ""}`}>
      <div className="practice-header">
        <div className="practice-info">
          <span className="badge">{OPERATION_LABELS[config.operation]} Lv.{config.level}</span>
          <span className="badge">{MODE_LABELS[config.mode]}</span>
        </div>
        <div className="practice-stats">
          <span className="timer">{timer.displayTime}</span>
          <span className="counter">
            {config.mode === "sprint"
              ? `${session.totalAnswered} / ${config.value}`
              : `第 ${session.questionIndex} 題`}
          </span>
        </div>
        {config.mode === "timeAttack" && (
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${timer.progress}%` }} />
          </div>
        )}
      </div>

      <div className="question-area">
        <div className="question-display">
          {session.currentQuestion?.display} = ?
        </div>

        {session.feedback?.type === "wrong" && (
          <div className="wrong-answer-hint">
            正確答案：{session.feedback.correctAnswer}
          </div>
        )}

        <form onSubmit={handleSubmit} className="answer-form">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="answer-input"
            placeholder="輸入答案"
            autoComplete="off"
            disabled={!!session.feedback}
          />
          <button type="submit" className="btn btn-submit" disabled={!!session.feedback}>
            確認
          </button>
        </form>
      </div>

      <div className="practice-footer">
        <span>正確：{session.correctCount} / {session.totalAnswered}</span>
      </div>
    </div>
  );
}

// --- 成績畫面 ---
function ResultScreen({ session }) {
  const { sessionResult: r, config } = session;
  const pb = session.getPersonalBest(config.operation, config.level, config.mode);

  // 比較歷史最佳
  let comparison = null;
  if (pb && pb.timestamp !== r.timestamp) {
    if (config.mode === "timeAttack") {
      const diff = r.correctCount - pb.correctCount;
      comparison = {
        improved: diff > 0,
        text: diff > 0
          ? `比歷史最佳多答對 ${diff} 題！`
          : diff < 0
            ? `距歷史最佳少 ${Math.abs(diff)} 題`
            : "追平歷史最佳！",
      };
    } else {
      const diff = pb.totalSeconds - r.totalSeconds;
      comparison = {
        improved: diff > 0,
        text: diff > 0
          ? `比歷史最佳快 ${diff} 秒！`
          : diff < 0
            ? `比歷史最佳慢 ${Math.abs(diff)} 秒`
            : "追平歷史最佳！",
      };
    }
  }

  return (
    <div className="result-screen">
      <h2>練習結束！</h2>

      <div className="result-grid">
        <div className="result-item">
          <span className="result-label">答題數</span>
          <span className="result-value">{r.totalQuestions}</span>
        </div>
        <div className="result-item">
          <span className="result-label">正確數</span>
          <span className="result-value">{r.correctCount}</span>
        </div>
        <div className="result-item">
          <span className="result-label">正確率</span>
          <span className="result-value">{r.accuracy}%</span>
        </div>
        <div className="result-item">
          <span className="result-label">平均速度</span>
          <span className="result-value">{(r.avgTimeMs / 1000).toFixed(1)}s</span>
        </div>
        {r.mode === "sprint" && (
          <div className="result-item">
            <span className="result-label">總耗時</span>
            <span className="result-value">{r.totalSeconds}s</span>
          </div>
        )}
        <div className="result-item">
          <span className="result-label">最快單題</span>
          <span className="result-value">{(r.fastestMs / 1000).toFixed(1)}s</span>
        </div>
      </div>

      {comparison && (
        <div className={`comparison ${comparison.improved ? "improved" : "declined"}`}>
          {comparison.text}
        </div>
      )}

      <button className="btn btn-start" onClick={session.resetSession}>
        再來一次
      </button>
    </div>
  );
}

// --- 主 App ---
function App() {
  const session = useSession();

  if (!session.config) {
    return <SetupScreen onStart={session.startSession} />;
  }

  return <PracticeScreen session={session} />;
}

// --- Mount ---
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

// --- PWA Service Worker ---
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/static/sw.js").catch(() => {});
  });
}
