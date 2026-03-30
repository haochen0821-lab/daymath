/**
 * Daymath - 主應用程式入口
 */

const OPERATION_LABELS = {
  addition: { label: "加法", icon: "+" },
  subtraction: { label: "減法", icon: "\u2212" },
  multiplication: { label: "乘法", icon: "\u00D7" },
  division: { label: "除法", icon: "\u00F7" },
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
  const starChar = "\u2B50";
  return (
    <div className="star-burst">
      {[...Array(5)].map((_, i) => (
        <span key={i} className="star" style={{ animationDelay: `${i * 0.05}s` }}>
          {starChar}
        </span>
      ))}
    </div>
  );
}

// emoji / 文字常數（避免 JSX 中寫 \u escape）
const TXT = {
  sparkle: "\u2728",
  target: "\uD83C\uDFAF",
  star: "\uD83C\uDF1F",
  timer: "\u23F1\uFE0F",
  alarm: "\u23F0",
  runner: "\uD83C\uDFC3",
  memo: "\uD83D\uDCDD",
  rocket: "\uD83D\uDE80",
  party: "\uD83C\uDF89",
  cross: "\u274C",
  check: "\u2705",
  dash: "\u2796",
  question: "\u2753",
  trophy: "\uD83C\uDFC6",
  fire: "\uD83D\uDD25",
  muscle: "\uD83D\uDCAA",
  refresh: "\uD83D\uDD01",
  bolt: "\u26A1",
  bullseye: "\uD83C\uDFAF",
  emptyStar: "\u2606",
  filledStar: "\u2B50",
  flag: "\uD83C\uDFF3\uFE0F",
  pencil: "\u270F\uFE0F",
  plus: "\u2795",
  trash: "\uD83D\uDDD1\uFE0F",
  back: "\u2B05\uFE0F",
  people: "\uD83D\uDC65",
  wave: "\uD83D\uDC4B",
};

// --- 角色頭像選項 ---
const AVATAR_LIST = [
  "\uD83E\uDDD1", "\uD83D\uDC66", "\uD83D\uDC67",
  "\uD83D\uDC78", "\uD83E\uDD34",
  "\uD83E\uDDB8", "\uD83E\uDDB9",
  "\uD83D\uDC31", "\uD83D\uDC36", "\uD83D\uDC3B",
  "\uD83E\uDD8A", "\uD83D\uDC27", "\uD83E\uDD84",
];

// --- 角色管理工具 ---
const ProfileStore = {
  KEY: "daymath_profiles",
  ACTIVE_KEY: "daymath_active_profile",

  getAll() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY) || "[]");
    } catch { return []; }
  },

  save(profiles) {
    localStorage.setItem(this.KEY, JSON.stringify(profiles));
  },

  add(name, avatar) {
    const profiles = this.getAll();
    const id = "p_" + Date.now();
    profiles.push({ id, name, avatar, createdAt: Date.now() });
    this.save(profiles);
    return id;
  },

  remove(id) {
    const profiles = this.getAll().filter((p) => p.id !== id);
    this.save(profiles);
    // 也清掉該角色的成績
    try { localStorage.removeItem("daymath_history_" + id); } catch {}
    // 如果刪掉的是目前選中的角色，清除選中
    if (this.getActiveId() === id) {
      localStorage.removeItem(this.ACTIVE_KEY);
    }
  },

  getActiveId() {
    return localStorage.getItem(this.ACTIVE_KEY) || null;
  },

  setActiveId(id) {
    localStorage.setItem(this.ACTIVE_KEY, id);
  },

  getById(id) {
    return this.getAll().find((p) => p.id === id) || null;
  },
};

// --- 角色選擇畫面 ---
function ProfileScreen({ onSelect }) {
  const [profiles, setProfiles] = React.useState(ProfileStore.getAll());
  const [showAdd, setShowAdd] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [selectedAvatar, setSelectedAvatar] = React.useState(AVATAR_LIST[0]);
  const [confirmDelete, setConfirmDelete] = React.useState(null);

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const id = ProfileStore.add(trimmed, selectedAvatar);
    setProfiles(ProfileStore.getAll());
    setNewName("");
    setSelectedAvatar(AVATAR_LIST[0]);
    setShowAdd(false);
  };

  const handleDelete = (id) => {
    ProfileStore.remove(id);
    setProfiles(ProfileStore.getAll());
    setConfirmDelete(null);
  };

  const handleSelect = (profile) => {
    ProfileStore.setActiveId(profile.id);
    onSelect(profile);
  };

  return (
    <div className="profile-screen">
      <div className="app-header">
        <h1 className="app-title">Daymath</h1>
        <p className="app-subtitle">{TXT.sparkle} 心算耐力與速度訓練 {TXT.sparkle}</p>
      </div>

      <div className="setup-card">
        <h3>{TXT.people} 選擇你的角色</h3>

        {profiles.length === 0 && !showAdd && (
          <p className="profile-empty">還沒有角色，快來新增一個吧！</p>
        )}

        <div className="profile-list">
          {profiles.map((p) => (
            <div key={p.id} className="profile-item">
              <button className="profile-select-btn" onClick={() => handleSelect(p)}>
                <span className="profile-avatar">{p.avatar}</span>
                <span className="profile-name">{p.name}</span>
              </button>
              {confirmDelete === p.id ? (
                <div className="profile-confirm-delete">
                  <span className="confirm-text">確定刪除？</span>
                  <button className="btn-confirm-yes" onClick={() => handleDelete(p.id)}>刪除</button>
                  <button className="btn-confirm-no" onClick={() => setConfirmDelete(null)}>取消</button>
                </div>
              ) : (
                <button
                  className="profile-delete-btn"
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(p.id); }}
                  title={"刪除 " + p.name}
                >
                  {TXT.trash}
                </button>
              )}
            </div>
          ))}
        </div>

        {!showAdd ? (
          <button className="btn btn-add-profile" onClick={() => setShowAdd(true)}>
            {TXT.plus} 新增角色
          </button>
        ) : (
          <div className="profile-add-form">
            <h4>建立新角色</h4>
            <div className="avatar-picker">
              {AVATAR_LIST.map((av) => (
                <button
                  key={av}
                  className={"avatar-option" + (selectedAvatar === av ? " avatar-selected" : "")}
                  onClick={() => setSelectedAvatar(av)}
                >
                  {av}
                </button>
              ))}
            </div>
            <input
              type="text"
              className="profile-name-input"
              placeholder="輸入名字"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
              maxLength={10}
              autoFocus
            />
            <div className="profile-add-actions">
              <button className="btn btn-cute btn-active" onClick={handleAdd} disabled={!newName.trim()}>
                確認新增
              </button>
              <button className="btn btn-cute" onClick={() => { setShowAdd(false); setNewName(""); }}>
                取消
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- 設定畫面 ---
function SetupScreen({ onStart, profile, onSwitchProfile }) {
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
        <p className="app-subtitle">{TXT.sparkle} 心算耐力與速度訓練 {TXT.sparkle}</p>
      </div>

      {profile && (
        <div className="current-profile-bar">
          <span className="current-profile-info">
            <span className="current-profile-avatar">{profile.avatar}</span>
            <span>{TXT.wave} {profile.name}</span>
          </span>
          <button className="btn-switch-profile" onClick={onSwitchProfile}>
            {TXT.people} 切換角色
          </button>
        </div>
      )}

      <div className="setup-card">
        <h3>{TXT.target} 選擇運算</h3>
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
        <h3>{TXT.star} 選擇難度</h3>
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
            {currentLevelInfo.example && (
              <p className="level-example">{TXT.pencil} 例如：{currentLevelInfo.example}</p>
            )}
          </div>
        )}
      </div>

      <div className="setup-card">
        <h3>{TXT.timer} 選擇模式</h3>
        <div className="btn-group">
          <button
            className={`btn btn-cute ${mode === "timeAttack" ? "btn-active" : ""}`}
            onClick={() => setMode("timeAttack")}
          >
            {TXT.alarm} 限時挑戰
          </button>
          <button
            className={`btn btn-cute ${mode === "sprint" ? "btn-active" : ""}`}
            onClick={() => setMode("sprint")}
          >
            {TXT.runner} 定額衝刺
          </button>
        </div>
      </div>

      <div className="setup-card">
        <h3>{mode === "timeAttack" ? TXT.alarm + " 時間設定" : TXT.memo + " 題數設定"}</h3>
        <div className="btn-group">
          {(mode === "timeAttack" ? TIME_OPTIONS : SPRINT_OPTIONS).map((v) => (
            <button
              key={v}
              className={`btn btn-cute ${modeValue === v ? "btn-active" : ""}`}
              onClick={() => setModeValue(v)}
            >
              {mode === "timeAttack" ? v + " 分鐘" : v + " 題"}
            </button>
          ))}
        </div>
      </div>

      <button className="btn btn-start" onClick={handleStart}>
        {TXT.rocket} 出發！
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
  const modeEmoji = config.mode === "timeAttack" ? TXT.alarm : TXT.runner;

  return (
    <div className={`practice-screen ${session.feedback?.type === "correct" ? "flash-correct" : ""} ${session.feedback?.type === "wrong" ? "flash-wrong" : ""}`}>
      <div className="practice-header">
        <div className="practice-info">
          <span className="badge badge-op">{OPERATION_LABELS[config.operation].icon} {OPERATION_LABELS[config.operation].label}</span>
          <span className="badge badge-level">{levelIcon.emoji} Lv.{config.level}</span>
          <span className="badge badge-mode">{modeEmoji} {MODE_LABELS[config.mode]}</span>
        </div>
        <div className="practice-stats">
          <span className="timer">{timer.displayTime}</span>
          <span className="counter">
            {config.mode === "sprint"
              ? session.totalAnswered + " / " + config.value
              : "第 " + session.questionIndex + " 題"}
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
          <div className="correct-feedback">{TXT.party} 答對了！</div>
        )}

        {session.feedback?.type === "wrong" && (
          <div className="wrong-answer-hint">
            {TXT.cross} 正確答案是 {session.feedback.correctAnswer}
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
            placeholder={TXT.question}
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
          <span>{TXT.check} {session.correctCount}</span>
          <span>{TXT.dash}</span>
          <span>{TXT.cross} {session.totalAnswered - session.correctCount}</span>
        </div>
        <button className="btn btn-quit" onClick={() => session.quitSession()}>
          {TXT.flag} 結束挑戰
        </button>
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
          ? "比上次最佳多答對 " + diff + " 題！"
          : diff < 0
            ? "距最佳紀錄差 " + Math.abs(diff) + " 題，下次加油！"
            : "追平最佳紀錄！再加把勁！",
      };
    } else {
      const diff = pb.totalSeconds - r.totalSeconds;
      isNewRecord = diff > 0;
      comparison = {
        improved: diff > 0,
        text: diff > 0
          ? "比上次最佳快 " + diff + " 秒！"
          : diff < 0
            ? "比最佳紀錄慢 " + Math.abs(diff) + " 秒，下次加油！"
            : "追平最佳紀錄！再加把勁！",
      };
    }
  } else if (!pb || (pb && pb.timestamp === r.timestamp)) {
    isNewRecord = false;
  }

  React.useEffect(() => {
    if (isNewRecord || r.accuracy === 100) {
      setShowConfetti(true);
    }
  }, [isNewRecord, r.accuracy]);

  const encouragement = getEncouragement(r.accuracy);
  const levelIcon = LEVEL_ICONS[config.level] || LEVEL_ICONS[1];
  const starCount = r.accuracy === 100 ? 3 : r.accuracy >= 80 ? 2 : r.accuracy >= 50 ? 1 : 0;

  return (
    <div className="result-screen">
      <Confetti active={showConfetti} />

      {isNewRecord && (
        <div className="new-record-banner">
          <span className="trophy">{TXT.trophy}</span>
          <span>突破紀錄！新紀錄誕生！</span>
          <span className="trophy">{TXT.trophy}</span>
        </div>
      )}

      <div className="result-hero">
        <span className="result-hero-emoji">{levelIcon.emoji}</span>
        <h2>{encouragement}</h2>
        <div className="star-rating">
          {[...Array(3)].map((_, i) => (
            <span key={i} className={`rating-star ${i < starCount ? "filled" : ""}`}>
              {i < starCount ? TXT.filledStar : TXT.emptyStar}
            </span>
          ))}
        </div>
      </div>

      <div className="result-grid">
        <div className="result-item">
          <span className="result-icon">{TXT.memo}</span>
          <span className="result-label">答題數</span>
          <span className="result-value">{r.totalQuestions}</span>
        </div>
        <div className="result-item">
          <span className="result-icon">{TXT.check}</span>
          <span className="result-label">答對</span>
          <span className="result-value">{r.correctCount}</span>
        </div>
        <div className="result-item">
          <span className="result-icon">{TXT.bullseye}</span>
          <span className="result-label">正確率</span>
          <span className="result-value result-accuracy">{r.accuracy}%</span>
        </div>
        <div className="result-item">
          <span className="result-icon">{TXT.bolt}</span>
          <span className="result-label">平均速度</span>
          <span className="result-value">{(r.avgTimeMs / 1000).toFixed(1)}s</span>
        </div>
        {r.mode === "sprint" && (
          <div className="result-item">
            <span className="result-icon">{TXT.timer}</span>
            <span className="result-label">總耗時</span>
            <span className="result-value">{r.totalSeconds}s</span>
          </div>
        )}
        <div className="result-item">
          <span className="result-icon">{TXT.rocket}</span>
          <span className="result-label">最快單題</span>
          <span className="result-value">{(r.fastestMs / 1000).toFixed(1)}s</span>
        </div>
      </div>

      {comparison && (
        <div className={`comparison ${comparison.improved ? "improved" : "declined"}`}>
          {comparison.improved ? TXT.fire + " " : TXT.muscle + " "}{comparison.text}
        </div>
      )}

      <div className="result-actions">
        <button className="btn btn-start" onClick={session.resetSession}>
          {TXT.refresh} 再來一次！
        </button>
      </div>
    </div>
  );
}

// --- 主 App ---
function App() {
  // 嘗試讀取上次的角色
  const savedId = ProfileStore.getActiveId();
  const savedProfile = savedId ? ProfileStore.getById(savedId) : null;

  const [profile, setProfile] = React.useState(savedProfile);
  const session = useSession(profile ? profile.id : null);

  const handleSelectProfile = (p) => {
    setProfile(p);
  };

  const handleSwitchProfile = () => {
    session.resetSession();
    setProfile(null);
    localStorage.removeItem("daymath_active_profile");
  };

  // 沒有選角色 → 角色畫面
  if (!profile) {
    return <ProfileScreen onSelect={handleSelectProfile} />;
  }

  // 選了角色但沒開始 → 設定畫面
  if (!session.config) {
    return <SetupScreen onStart={session.startSession} profile={profile} onSwitchProfile={handleSwitchProfile} />;
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
