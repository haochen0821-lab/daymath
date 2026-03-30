/**
 * Daymath - 主應用程式入口
 */

const OPERATION_LABELS = {
  addition: { label: "加法", icon: "+" },
  subtraction: { label: "減法", icon: "−" },
  multiplication: { label: "乘法", icon: "×" },
  division: { label: "除法", icon: "÷" },
};

const MODE_LABELS = {
  timeAttack: "限時挑戰",
  sprint: "定額衝刺",
};

const LEVEL_ICONS = {
  1: { emoji: "\uD83D\uDC30", label: "小兔子" },
  2: { emoji: "\uD83E\uDD8C", label: "小鹿" },
  3: { emoji: "\uD83E\uDD81", label: "小獅子" },
  4: { emoji: "\uD83D\uDC32", label: "小龍" },
};

const TIME_OPTIONS = [1, 3, 5];
const SPRINT_OPTIONS = [20, 50, 100];

// 鼓勵語（根據正確率）
const ENCOURAGE_MESSAGES = {
  perfect: [
    "全部答對！你是天才小數學家！",
    "滿分！太厲害了吧！",
    "完美表現！無人能擋！",
  ],
  great: [
    "好棒好棒！超級厲害！",
    "表現得太好了！繼續加油！",
    "你的大腦在發光呢！",
  ],
  good: [
    "做得不錯喔！再練習會更好！",
    "很好的嘗試！你在進步中！",
    "加油！你越來越厲害了！",
  ],
  tryAgain: [
    "沒關係，多練習就會進步的！",
    "慢慢來，每一次都在學習！",
    "練習是最好的魔法，再來一次吧！",
  ],
};

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getEncouragement(accuracy) {
  if (accuracy === 100) return pickRandom(ENCOURAGE_MESSAGES.perfect);
  if (accuracy >= 80) return pickRandom(ENCOURAGE_MESSAGES.great);
  if (accuracy >= 50) return pickRandom(ENCOURAGE_MESSAGES.good);
  return pickRandom(ENCOURAGE_MESSAGES.tryAgain);
}

// --- 紙花粒子效果 ---
function Confetti({ active }) {
  const canvasRef = React.useRef(null);
  const animRef = React.useRef(null);

  React.useEffect(() => {
    if (!active || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = [
      "#FF6B6B", "#FFE66D", "#4ECDC4", "#45B7D1",
      "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8",
      "#F7DC6F", "#BB8FCE",
    ];
    const particles = [];

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        w: Math.random() * 10 + 5,
        h: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        vy: Math.random() * 3 + 2,
        vx: Math.random() * 2 - 1,
        rotation: Math.random() * 360,
        rotSpeed: Math.random() * 6 - 3,
      });
    }

    let frame = 0;
    const maxFrames = 180;

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, 1 - frame / maxFrames);
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();

        p.y += p.vy;
        p.x += p.vx;
        p.rotation += p.rotSpeed;
        p.vx += (Math.random() - 0.5) * 0.2;
      });

      frame++;
      if (frame < maxFrames) {
        animRef.current = requestAnimationFrame(draw);
      }
    }

    draw();

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [active]);

  if (!active) return null;
  return <canvas ref={canvasRef} className="confetti-canvas" />;
}

// --- 星星動畫（答對時） ---
function StarBurst({ show }) {
  if (!show) return null;
  return (
    <div className="star-burst">
      {[...Array(5)].map((_, i) => (
        <span key={i} className="star" style={{ animationDelay: `${i * 0.05}s` }}>
          \u2B50
        </span>
      ))}
    </div>
  );
}

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

  const currentLevelInfo = operations[operation].levels[level];

  return (
    <div className="setup-screen">
      <div className="app-header">
        <h1 className="app-title">Daymath</h1>
        <p className="app-subtitle">\u2728 \u5FC3\u7B97\u8010\u529B\u8207\u901F\u5EA6\u8A13\u7DF4 \u2728</p>
      </div>

      <div className="setup-card">
        <h3>\uD83C\uDFAF \u9078\u64C7\u904B\u7B97</h3>
        <div className="btn-group">
          {Object.entries(OPERATION_LABELS).map(([key, { label, icon }]) => (
            <button
              key={key}
              className={`btn btn-cute ${operation === key ? "btn-active" : ""}`}
              onClick={() => setOperation(key)}
            >
              <span className="btn-icon">{icon}</span> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="setup-card">
        <h3>\uD83C\uDF1F \u9078\u64C7\u96E3\u5EA6</h3>
        <div className="btn-group level-group">
          {Object.entries(operations[operation].levels).map(([lvl, info]) => {
            const icon = LEVEL_ICONS[lvl] || LEVEL_ICONS[1];
            return (
              <button
                key={lvl}
                className={`btn btn-level ${level === Number(lvl) ? "btn-active" : ""}`}
                onClick={() => setLevel(Number(lvl))}
              >
                <span className="level-emoji">{icon.emoji}</span>
                <span className="level-name">Lv.{lvl} {info.name}</span>
              </button>
            );
          })}
        </div>
        {currentLevelInfo && (
          <div className="level-hint-box">
            <p className="level-hint">{currentLevelInfo.hint}</p>
          </div>
        )}
      </div>

      <div className="setup-card">
        <h3>\u23F1\uFE0F \u9078\u64C7\u6A21\u5F0F</h3>
        <div className="btn-group">
          <button
            className={`btn btn-cute ${mode === "timeAttack" ? "btn-active" : ""}`}
            onClick={() => setMode("timeAttack")}
          >
            \u23F0 \u9650\u6642\u6311\u6230
          </button>
          <button
            className={`btn btn-cute ${mode === "sprint" ? "btn-active" : ""}`}
            onClick={() => setMode("sprint")}
          >
            \uD83C\uDFC3 \u5B9A\u984D\u885D\u523A
          </button>
        </div>
      </div>

      <div className="setup-card">
        <h3>{mode === "timeAttack" ? "\u23F0 \u6642\u9593\u8A2D\u5B9A" : "\uD83D\uDCDD \u984C\u6578\u8A2D\u5B9A"}</h3>
        <div className="btn-group">
          {(mode === "timeAttack" ? TIME_OPTIONS : SPRINT_OPTIONS).map((v) => (
            <button
              key={v}
              className={`btn btn-cute ${modeValue === v ? "btn-active" : ""}`}
              onClick={() => setModeValue(v)}
            >
              {mode === "timeAttack" ? `${v} \u5206\u9418` : `${v} \u984C`}
            </button>
          ))}
        </div>
      </div>

      <button className="btn btn-start" onClick={handleStart}>
        \uD83D\uDE80 \u51FA\u767C\uFF01
      </button>
    </div>
  );
}

// --- 練習畫面 ---
function PracticeScreen({ session }) {
  const [input, setInput] = React.useState("");
  const [showStar, setShowStar] = React.useState(false);
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    if (inputRef.current && !session.sessionResult) {
      inputRef.current.focus();
    }
  }, [session.currentQuestion, session.feedback, session.sessionResult]);

  React.useEffect(() => {
    if (session.feedback?.type === "correct") {
      setShowStar(true);
      const t = setTimeout(() => setShowStar(false), 600);
      return () => clearTimeout(t);
    }
  }, [session.feedback]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || session.feedback) return;
    session.submitAnswer(input.trim());
    setInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "-" && input === "") return;
    if (!/[0-9]/.test(e.key) && !["Backspace", "Enter", "Tab", "-"].includes(e.key)) {
      e.preventDefault();
    }
  };

  if (session.sessionResult) {
    return <ResultScreen session={session} />;
  }

  const { config, timer } = session;
  const levelIcon = LEVEL_ICONS[config.level] || LEVEL_ICONS[1];

  return (
    <div className={`practice-screen ${session.feedback?.type === "correct" ? "flash-correct" : ""} ${session.feedback?.type === "wrong" ? "flash-wrong" : ""}`}>
      <div className="practice-header">
        <div className="practice-info">
          <span className="badge badge-op">{OPERATION_LABELS[config.operation].icon} {OPERATION_LABELS[config.operation].label}</span>
          <span className="badge badge-level">{levelIcon.emoji} Lv.{config.level}</span>
          <span className="badge badge-mode">{config.mode === "timeAttack" ? "\u23F0" : "\uD83C\uDFC3"} {MODE_LABELS[config.mode]}</span>
        </div>
        <div className="practice-stats">
          <span className="timer">{timer.displayTime}</span>
          <span className="counter">
            {config.mode === "sprint"
              ? `${session.totalAnswered} / ${config.value}`
              : `\u7B2C ${session.questionIndex} \u984C`}
          </span>
        </div>
        {config.mode === "timeAttack" && (
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${timer.progress}%` }} />
          </div>
        )}
      </div>

      <div className="question-area">
        <StarBurst show={showStar} />
        <div className="question-display">
          {session.currentQuestion?.display} = ?
        </div>

        {session.feedback?.type === "correct" && (
          <div className="correct-feedback">\uD83C\uDF89 \u7B54\u5C0D\u4E86\uFF01</div>
        )}

        {session.feedback?.type === "wrong" && (
          <div className="wrong-answer-hint">
            \u274C \u6B63\u78BA\u7B54\u6848\u662F {session.feedback.correctAnswer}
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
            placeholder="\u2753"
            autoComplete="off"
            disabled={!!session.feedback}
          />
          <button type="submit" className="btn btn-submit" disabled={!!session.feedback}>
            GO!
          </button>
        </form>
      </div>

      <div className="practice-footer">
        <div className="score-bar">
          <span>\u2705 {session.correctCount}</span>
          <span>\u2796</span>
          <span>\u274C {session.totalAnswered - session.correctCount}</span>
        </div>
      </div>
    </div>
  );
}

// --- 獎勵成績畫面 ---
function ResultScreen({ session }) {
  const { sessionResult: r, config } = session;
  const pb = session.getPersonalBest(config.operation, config.level, config.mode);
  const [showConfetti, setShowConfetti] = React.useState(false);

  // 比較歷史最佳
  let comparison = null;
  let isNewRecord = false;

  if (pb && pb.timestamp !== r.timestamp) {
    if (config.mode === "timeAttack") {
      const diff = r.correctCount - pb.correctCount;
      isNewRecord = diff > 0;
      comparison = {
        improved: diff > 0,
        text: diff > 0
          ? `\u6BD4\u4E0A\u6B21\u6700\u4F73\u591A\u7B54\u5C0D ${diff} \u984C\uFF01`
          : diff < 0
            ? `\u8DDD\u6700\u4F73\u7D00\u9304\u5DEE ${Math.abs(diff)} \u984C\uFF0C\u4E0B\u6B21\u52A0\u6CB9\uFF01`
            : "\u8FFD\u5E73\u6700\u4F73\u7D00\u9304\uFF01\u518D\u52A0\u628A\u52C1\uFF01",
      };
    } else {
      const diff = pb.totalSeconds - r.totalSeconds;
      isNewRecord = diff > 0;
      comparison = {
        improved: diff > 0,
        text: diff > 0
          ? `\u6BD4\u4E0A\u6B21\u6700\u4F73\u5FEB ${diff} \u79D2\uFF01`
          : diff < 0
            ? `\u6BD4\u6700\u4F73\u7D00\u9304\u6162 ${Math.abs(diff)} \u79D2\uFF0C\u4E0B\u6B21\u52A0\u6CB9\uFF01`
            : "\u8FFD\u5E73\u6700\u4F73\u7D00\u9304\uFF01\u518D\u52A0\u628A\u52C1\uFF01",
      };
    }
  } else if (!pb || (pb && pb.timestamp === r.timestamp)) {
    // 第一次玩或剛存進去就是自己
    isNewRecord = false;
  }

  React.useEffect(() => {
    if (isNewRecord || r.accuracy === 100) {
      setShowConfetti(true);
    }
  }, [isNewRecord, r.accuracy]);

  const encouragement = getEncouragement(r.accuracy);
  const levelIcon = LEVEL_ICONS[config.level] || LEVEL_ICONS[1];

  // 根據正確率給星星數
  const starCount = r.accuracy === 100 ? 3 : r.accuracy >= 80 ? 2 : r.accuracy >= 50 ? 1 : 0;

  return (
    <div className="result-screen">
      <Confetti active={showConfetti} />

      {isNewRecord && (
        <div className="new-record-banner">
          <span className="trophy">\uD83C\uDFC6</span>
          <span>\u7A81\u7834\u7D00\u9304\uFF01\u65B0\u7D00\u9304\u8A95\u751F\uFF01</span>
          <span className="trophy">\uD83C\uDFC6</span>
        </div>
      )}

      <div className="result-hero">
        <span className="result-hero-emoji">{levelIcon.emoji}</span>
        <h2>{encouragement}</h2>
        <div className="star-rating">
          {[...Array(3)].map((_, i) => (
            <span key={i} className={`rating-star ${i < starCount ? "filled" : ""}`}>
              {i < starCount ? "\u2B50" : "\u2606"}
            </span>
          ))}
        </div>
      </div>

      <div className="result-grid">
        <div className="result-item">
          <span className="result-icon">\uD83D\uDCDD</span>
          <span className="result-label">\u7B54\u984C\u6578</span>
          <span className="result-value">{r.totalQuestions}</span>
        </div>
        <div className="result-item">
          <span className="result-icon">\u2705</span>
          <span className="result-label">\u7B54\u5C0D</span>
          <span className="result-value">{r.correctCount}</span>
        </div>
        <div className="result-item">
          <span className="result-icon">\uD83C\uDFAF</span>
          <span className="result-label">\u6B63\u78BA\u7387</span>
          <span className="result-value result-accuracy">{r.accuracy}%</span>
        </div>
        <div className="result-item">
          <span className="result-icon">\u26A1</span>
          <span className="result-label">\u5E73\u5747\u901F\u5EA6</span>
          <span className="result-value">{(r.avgTimeMs / 1000).toFixed(1)}s</span>
        </div>
        {r.mode === "sprint" && (
          <div className="result-item">
            <span className="result-icon">\u23F1\uFE0F</span>
            <span className="result-label">\u7E3D\u8017\u6642</span>
            <span className="result-value">{r.totalSeconds}s</span>
          </div>
        )}
        <div className="result-item">
          <span className="result-icon">\uD83D\uDE80</span>
          <span className="result-label">\u6700\u5FEB\u55AE\u984C</span>
          <span className="result-value">{(r.fastestMs / 1000).toFixed(1)}s</span>
        </div>
      </div>

      {comparison && (
        <div className={`comparison ${comparison.improved ? "improved" : "declined"}`}>
          {comparison.improved ? "\uD83D\uDD25 " : "\uD83D\uDCAA "}{comparison.text}
        </div>
      )}

      <div className="result-actions">
        <button className="btn btn-start" onClick={session.resetSession}>
          \uD83D\uDD01 \u518D\u4F86\u4E00\u6B21\uFF01
        </button>
      </div>
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
