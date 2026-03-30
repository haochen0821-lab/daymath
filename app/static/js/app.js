/**
 * Daymath - 主應用程式入口（API 版）
 */

const OPERATION_LABELS = {
  addition: { label: "加法", icon: "+" },
  subtraction: { label: "減法", icon: "\u2212" },
  multiplication: { label: "乘法", icon: "\u00D7" },
  division: { label: "除法", icon: "\u00F7" },
};

const MODE_LABELS = { timeAttack: "限時挑戰", sprint: "定額衝刺" };

const LEVEL_ICONS = {
  1: { emoji: "\uD83D\uDC30", label: "小兔子" },
  2: { emoji: "\uD83E\uDD8C", label: "小鹿" },
  3: { emoji: "\uD83E\uDD81", label: "小獅子" },
  4: { emoji: "\uD83D\uDC32", label: "小龍" },
};

const TIME_OPTIONS = [1, 3, 5];
const SPRINT_OPTIONS = [10, 20, 50, 100];

const ENCOURAGE_MESSAGES = {
  perfect: ["全部答對！你是天才小數學家！","滿分！太厲害了吧！","完美表現！無人能擋！"],
  great: ["好棒好棒！超級厲害！","表現得太好了！繼續加油！","你的大腦在發光呢！"],
  good: ["做得不錯喔！再練習會更好！","很好的嘗試！你在進步中！","加油！你越來越厲害了！"],
  tryAgain: ["沒關係，多練習就會進步的！","慢慢來，每一次都在學習！","練習是最好的魔法，再來一次吧！"],
};
function pickRandom(a){return a[Math.floor(Math.random()*a.length)]}
function getEncouragement(acc){
  if(acc===100)return pickRandom(ENCOURAGE_MESSAGES.perfect);
  if(acc>=80)return pickRandom(ENCOURAGE_MESSAGES.great);
  if(acc>=50)return pickRandom(ENCOURAGE_MESSAGES.good);
  return pickRandom(ENCOURAGE_MESSAGES.tryAgain);
}

const TXT = {
  sparkle:"\u2728", target:"\uD83C\uDFAF", star:"\uD83C\uDF1F",
  timer:"\u23F1\uFE0F", alarm:"\u23F0", runner:"\uD83C\uDFC3",
  memo:"\uD83D\uDCDD", rocket:"\uD83D\uDE80", party:"\uD83C\uDF89",
  cross:"\u274C", check:"\u2705", dash:"\u2796", question:"\u2753",
  trophy:"\uD83C\uDFC6", fire:"\uD83D\uDD25", muscle:"\uD83D\uDCAA",
  refresh:"\uD83D\uDD01", bolt:"\u26A1", bullseye:"\uD83C\uDFAF",
  emptyStar:"\u2606", filledStar:"\u2B50",
  flag:"\uD83C\uDFF3\uFE0F", pencil:"\u270F\uFE0F",
  plus:"\u2795", trash:"\uD83D\uDDD1\uFE0F", people:"\uD83D\uDC65",
  wave:"\uD83D\uDC4B", gear:"\u2699\uFE0F",
};

const AVATAR_LIST = [
  "\uD83E\uDDD1","\uD83D\uDC66","\uD83D\uDC67","\uD83D\uDC78","\uD83E\uDD34",
  "\uD83E\uDDB8","\uD83E\uDDB9","\uD83D\uDC31","\uD83D\uDC36","\uD83D\uDC3B",
  "\uD83E\uDD8A","\uD83D\uDC27","\uD83E\uDD84",
];

const medals = ["\uD83E\uDD47","\uD83E\uDD48","\uD83E\uDD49"];

// ─── API helpers ───
const API = {
  profiles: () => fetch("/api/profiles").then(r=>r.json()),
  createProfile: (name,avatar) => fetch("/api/profiles",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,avatar})}).then(r=>r.json()),
  deleteProfile: (id) => fetch("/api/profiles/"+id,{method:"DELETE"}),
  leaderboard: (op,lvl,mode) => fetch("/api/leaderboard?operation="+op+"&level="+lvl+"&mode="+mode).then(r=>r.json()),
  history: (pid,op,lvl,mode) => fetch("/api/history/"+pid+"?operation="+op+"&level="+lvl+"&mode="+mode).then(r=>r.json()),
  rankings: () => fetch("/api/rankings").then(r=>r.json()),
};

// ─── Confetti ───
function Confetti({active}){
  const ref=React.useRef(null),anim=React.useRef(null);
  React.useEffect(()=>{
    if(!active||!ref.current)return;
    const c=ref.current,ctx=c.getContext("2d");
    c.width=window.innerWidth;c.height=window.innerHeight;
    const colors=["#FF6B6B","#FFE66D","#4ECDC4","#45B7D1","#96CEB4","#FFEAA7","#DDA0DD","#98D8C8"];
    const ps=[];for(let i=0;i<80;i++)ps.push({x:Math.random()*c.width,y:Math.random()*c.height-c.height,w:Math.random()*10+5,h:Math.random()*6+3,color:colors[Math.floor(Math.random()*colors.length)],vy:Math.random()*3+2,vx:Math.random()*2-1,r:Math.random()*360,rs:Math.random()*6-3});
    let f=0;const mx=180;
    function draw(){ctx.clearRect(0,0,c.width,c.height);ps.forEach(p=>{ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.r*Math.PI/180);ctx.fillStyle=p.color;ctx.globalAlpha=Math.max(0,1-f/mx);ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);ctx.restore();p.y+=p.vy;p.x+=p.vx;p.r+=p.rs;p.vx+=(Math.random()-0.5)*0.2});f++;if(f<mx)anim.current=requestAnimationFrame(draw)}
    draw();return()=>{if(anim.current)cancelAnimationFrame(anim.current)};
  },[active]);
  if(!active)return null;
  return <canvas ref={ref} className="confetti-canvas"/>;
}

// ─── Custom Numpad ───
function NumPad({ value, onChange, onSubmit, disabled }) {
  const handleKey = (k) => {
    if (disabled) return;
    if (k === "del") { onChange(value.slice(0, -1)); }
    else if (k === "go") { if (value.trim()) onSubmit(); }
    else { onChange(value + k); }
  };
  const keys = ["1","2","3","4","5","6","7","8","9","del","0","go"];
  return (
    <div className="numpad">
      {keys.map((k) => (
        <button key={k} className={"numpad-key" + (k === "go" ? " numpad-go" : "") + (k === "del" ? " numpad-del" : "")}
          onClick={() => handleKey(k)} disabled={disabled} type="button">
          {k === "go" ? "OK" : k === "del" ? "\u232B" : k}
        </button>
      ))}
    </div>
  );
}

// ─── Profile Screen (API) ───
function ProfileScreen({ onSelect }) {
  const [profiles, setProfiles] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [showAdd, setShowAdd] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [selectedAvatar, setSelectedAvatar] = React.useState(AVATAR_LIST[0]);
  const [confirmDelete, setConfirmDelete] = React.useState(null);

  const load = () => { API.profiles().then(p => { setProfiles(p); setLoading(false); }); };
  React.useEffect(load, []);

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    API.createProfile(trimmed, selectedAvatar).then((p) => {
      load();
      setNewName(""); setSelectedAvatar(AVATAR_LIST[0]); setShowAdd(false);
    });
  };

  const handleDelete = (id) => {
    API.deleteProfile(id).then(load);
    setConfirmDelete(null);
  };

  return (
    <div className="profile-screen">
      <div className="app-header">
        <h1 className="app-title">Daymath</h1>
        <p className="app-subtitle">{TXT.sparkle} 心算耐力與速度訓練 {TXT.sparkle}</p>
      </div>
      <div className="setup-card">
        <h3>{TXT.people} 選擇你的角色</h3>
        {loading && <p className="profile-empty">載入中...</p>}
        {!loading && profiles.length === 0 && !showAdd && <p className="profile-empty">還沒有角色，快來新增一個吧！</p>}
        <div className="profile-list">
          {profiles.map((p) => (
            <div key={p.id} className="profile-item">
              <button className="profile-select-btn" onClick={() => onSelect(p)}>
                <span className="profile-avatar">{p.avatar}</span>
                <span className="profile-name">{p.name}</span>
              </button>
              {confirmDelete === p.id ? (
                <div className="profile-confirm-delete">
                  <span className="confirm-text">確定？</span>
                  <button className="btn-confirm-yes" onClick={() => handleDelete(p.id)}>刪除</button>
                  <button className="btn-confirm-no" onClick={() => setConfirmDelete(null)}>取消</button>
                </div>
              ) : (
                <button className="profile-delete-btn"
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(p.id); }}>
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
                <button key={av} className={"avatar-option" + (selectedAvatar === av ? " avatar-selected" : "")}
                  onClick={() => setSelectedAvatar(av)}>{av}</button>
              ))}
            </div>
            <input type="text" className="profile-name-input" placeholder="輸入名字" value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
              maxLength={10} autoFocus />
            <div className="profile-add-actions">
              <button className="btn btn-cute btn-active" onClick={handleAdd} disabled={!newName.trim()}>確認新增</button>
              <button className="btn btn-cute" onClick={() => { setShowAdd(false); setNewName(""); }}>取消</button>
            </div>
          </div>
        )}
      </div>
      <a href="/admin" className="admin-link">{TXT.gear} 後台管理</a>
    </div>
  );
}

// ─── Setup Screen ───
function SetupScreen({ onStart, profile, onSwitchProfile, onRankings }) {
  const [operation, setOperation] = React.useState("addition");
  const [level, setLevel] = React.useState(1);
  const [mode, setMode] = React.useState("sprint"); // 預設定額衝刺
  const [modeValue, setModeValue] = React.useState(20);
  const operations = QuestionGenerator.getOperations();
  const maxLevel = QuestionGenerator.getMaxLevel(operation);

  React.useEffect(() => { if (level > maxLevel) setLevel(1); }, [operation, maxLevel, level]);
  React.useEffect(() => { setModeValue(mode === "timeAttack" ? 3 : 20); }, [mode]);

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
          <button className="btn-switch-profile" onClick={onSwitchProfile}>{TXT.people} 切換角色</button>
        </div>
      )}
      <div className="setup-card">
        <h3>{TXT.target} 選擇運算</h3>
        <div className="btn-group">
          {Object.entries(OPERATION_LABELS).map(([key,{label,icon}]) => (
            <button key={key} className={`btn btn-cute ${operation===key?"btn-active":""}`}
              onClick={()=>setOperation(key)}><span className="btn-icon">{icon}</span> {label}</button>
          ))}
        </div>
      </div>
      <div className="setup-card">
        <h3>{TXT.star} 選擇難度</h3>
        <div className="btn-group level-group">
          {Object.entries(operations[operation].levels).map(([lvl,info])=>{
            const ic=LEVEL_ICONS[lvl]||LEVEL_ICONS[1];
            return(<button key={lvl} className={`btn btn-level ${level===Number(lvl)?"btn-active":""}`}
              onClick={()=>setLevel(Number(lvl))}>
              <span className="level-emoji">{ic.emoji}</span>
              <span className="level-name">Lv.{lvl} {info.name}</span>
            </button>);
          })}
        </div>
        {currentLevelInfo && (
          <div className="level-hint-box">
            <p className="level-hint">{currentLevelInfo.hint}</p>
            {currentLevelInfo.example && <p className="level-example">{TXT.pencil} 例如：{currentLevelInfo.example}</p>}
          </div>
        )}
      </div>
      <div className="setup-card">
        <h3>{TXT.timer} 選擇模式</h3>
        <div className="btn-group">
          <button className={`btn btn-cute ${mode==="sprint"?"btn-active":""}`} onClick={()=>setMode("sprint")}>{TXT.runner} 定額衝刺</button>
          <button className={`btn btn-cute ${mode==="timeAttack"?"btn-active":""}`} onClick={()=>setMode("timeAttack")}>{TXT.alarm} 限時挑戰</button>
        </div>
      </div>
      <div className="setup-card">
        <h3>{mode==="timeAttack"?TXT.alarm+" 時間設定":TXT.memo+" 題數設定"}</h3>
        <div className="btn-group">
          {(mode==="timeAttack"?TIME_OPTIONS:SPRINT_OPTIONS).map(v=>(
            <button key={v} className={`btn btn-cute ${modeValue===v?"btn-active":""}`}
              onClick={()=>setModeValue(v)}>{mode==="timeAttack"?v+" 分鐘":v+" 題"}</button>
          ))}
        </div>
      </div>
      <button className="btn btn-start" onClick={()=>onStart(operation,level,mode,modeValue)}>
        {TXT.rocket} 出發！
      </button>
      <button className="btn btn-rankings" onClick={onRankings}>
        {TXT.trophy} 戰力排行
      </button>
      <a href="/admin" className="admin-link">{TXT.gear} 後台管理</a>
    </div>
  );
}

// ─── Practice Screen ───
function PracticeScreen({ session, profile }) {
  const [input, setInput] = React.useState("");
  const [showStar, setShowStar] = React.useState(false);

  React.useEffect(()=>{
    if(session.feedback?.type==="correct"){setShowStar(true);const t=setTimeout(()=>setShowStar(false),600);return()=>clearTimeout(t)}
  },[session.feedback]);

  const handleSubmitRef = React.useRef(null);

  const handleSubmit = () => {
    if (!input.trim() || session.feedback) return;
    session.submitAnswer(input.trim());
    setInput("");
  };
  handleSubmitRef.current = handleSubmit;

  // 實體鍵盤支援（電腦版可直接按鍵盤輸入）
  React.useEffect(() => {
    const onKeyDown = (e) => {
      if (session.feedback || session.sessionResult) return;
      if (e.key >= "0" && e.key <= "9") { setInput(prev => prev + e.key); }
      else if (e.key === "-") { setInput(prev => prev === "" ? "-" : prev); }
      else if (e.key === "Backspace") { e.preventDefault(); setInput(prev => prev.slice(0, -1)); }
      else if (e.key === "Enter") { handleSubmitRef.current(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [session.feedback, session.sessionResult]);

  if (session.sessionResult) return <ResultScreen session={session} profile={profile} />;

  const { config, timer } = session;
  const levelIcon = LEVEL_ICONS[config.level] || LEVEL_ICONS[1];
  const modeEmoji = config.mode === "timeAttack" ? TXT.alarm : TXT.runner;

  return (
    <div className={"practice-screen" + (session.feedback?.type==="correct"?" flash-correct":"") + (session.feedback?.type==="wrong"?" flash-wrong":"")}>
      <div className="practice-header">
        <div className="practice-info">
          <span className="badge badge-op">{OPERATION_LABELS[config.operation].icon} {OPERATION_LABELS[config.operation].label}</span>
          <span className="badge badge-level">{levelIcon.emoji} Lv.{config.level}</span>
          <span className="badge badge-mode">{modeEmoji} {MODE_LABELS[config.mode]}</span>
        </div>
        <div className="practice-stats">
          <span className="timer">{timer.displayTime}</span>
          <span className="counter">
            {"第 " + session.questionIndex + " 題"}
            {config.mode === "sprint" && (" / " + config.value)}
          </span>
        </div>
        {config.mode === "timeAttack" && (
          <div className="progress-bar"><div className="progress-fill" style={{width:`${timer.progress}%`}}/></div>
        )}
      </div>

      <div className="question-area">
        <div className="question-display">{session.currentQuestion?.display} = ?</div>
        {session.feedback?.type === "correct" && <div className="correct-feedback">{TXT.party} 答對了！</div>}
        {session.feedback?.type === "wrong" && <div className="wrong-answer-hint">{TXT.cross} 正確答案是 {session.feedback.correctAnswer}</div>}
        <div className="answer-display-row">
          <div className="answer-display">{input || " "}</div>
        </div>
      </div>

      <div className="practice-bottom">
        <div className="score-bar">
          <span>{TXT.check} {session.correctCount}</span>
          <span>{TXT.dash}</span>
          <span>{TXT.cross} {session.totalAnswered - session.correctCount}</span>
        </div>
        <NumPad value={input} onChange={setInput} onSubmit={handleSubmit} disabled={!!session.feedback} />
        <button className="btn btn-quit" onClick={() => session.quitSession()}>
          {TXT.flag} 結束挑戰
        </button>
      </div>
    </div>
  );
}

// ─── Result Screen ───
function ResultScreen({ session, profile }) {
  const { sessionResult: r, config } = session;
  const [showConfetti, setShowConfetti] = React.useState(false);
  const [leaderboard, setLeaderboard] = React.useState([]);
  const [pb, setPb] = React.useState(null);

  const isIncomplete = !!r.incomplete;

  React.useEffect(() => {
    if (!profile || isIncomplete) return;
    // 只有完成的才載入排行榜和個人最佳比較
    API.leaderboard(config.operation, config.level, config.mode).then(setLeaderboard).catch(() => {});
    API.history(profile.id, config.operation, config.level, config.mode).then((rows) => {
      const past = rows.filter((h) => h.timestamp !== r.timestamp);
      if (past.length === 0) { setPb(null); return; }
      if (config.mode === "timeAttack") {
        setPb(past.reduce((b, h) => h.correct_count > b.correct_count ? h : b));
      } else {
        setPb(past.reduce((b, h) => h.total_seconds < b.total_seconds ? h : b));
      }
    }).catch(() => {});
  }, []);

  let comparison = null;
  let isNewRecord = false;
  if (pb) {
    if (config.mode === "timeAttack") {
      const diff = r.correctCount - pb.correct_count;
      isNewRecord = diff > 0;
      comparison = { improved: diff > 0,
        text: diff > 0 ? "比上次最佳多答對 " + diff + " 題！"
          : diff < 0 ? "距最佳紀錄差 " + Math.abs(diff) + " 題，下次加油！"
          : "追平最佳紀錄！再加把勁！" };
    } else {
      const diff = pb.total_seconds - r.totalSeconds;
      isNewRecord = diff > 0;
      comparison = { improved: diff > 0,
        text: diff > 0 ? "比上次最佳快 " + diff + " 秒！"
          : diff < 0 ? "比最佳紀錄慢 " + Math.abs(diff) + " 秒，下次加油！"
          : "追平最佳紀錄！再加把勁！" };
    }
  }

  React.useEffect(() => {
    if (!isIncomplete && (isNewRecord || r.accuracy === 100)) setShowConfetti(true);
  }, [isNewRecord, r.accuracy, pb]);

  const encouragement = isIncomplete ? "挑戰中途結束，成績不列入排行" : getEncouragement(r.accuracy);
  const levelIcon = LEVEL_ICONS[config.level] || LEVEL_ICONS[1];
  const starCount = isIncomplete ? 0 : (r.accuracy === 100 ? 3 : r.accuracy >= 80 ? 2 : r.accuracy >= 50 ? 1 : 0);

  return (
    <div className="result-screen">
      <Confetti active={showConfetti} />
      {isIncomplete && (
        <div className="incomplete-banner">未完成挑戰，本次成績僅供參考，不列入排行榜</div>
      )}
      {!isIncomplete && isNewRecord && (
        <div className="new-record-banner">
          <span className="trophy">{TXT.trophy}</span><span>突破紀錄！新紀錄誕生！</span><span className="trophy">{TXT.trophy}</span>
        </div>
      )}
      <div className="result-hero">
        <span className="result-hero-emoji">{levelIcon.emoji}</span>
        <h2>{encouragement}</h2>
        <div className="star-rating">
          {[...Array(3)].map((_,i)=>(
            <span key={i} className={"rating-star"+(i<starCount?" filled":"")}>
              {i<starCount?TXT.filledStar:TXT.emptyStar}
            </span>
          ))}
        </div>
      </div>
      <div className="result-grid">
        <div className="result-item"><span className="result-icon">{TXT.memo}</span><span className="result-label">答題數</span><span className="result-value">{r.totalQuestions}</span></div>
        <div className="result-item"><span className="result-icon">{TXT.check}</span><span className="result-label">答對</span><span className="result-value">{r.correctCount}</span></div>
        <div className="result-item"><span className="result-icon">{TXT.bullseye}</span><span className="result-label">正確率</span><span className="result-value result-accuracy">{r.accuracy}%</span></div>
        <div className="result-item"><span className="result-icon">{TXT.bolt}</span><span className="result-label">平均速度</span><span className="result-value">{(r.avgTimeMs/1000).toFixed(1)}s</span></div>
        {r.mode==="sprint"&&<div className="result-item"><span className="result-icon">{TXT.timer}</span><span className="result-label">總耗時</span><span className="result-value">{r.totalSeconds}s</span></div>}
        <div className="result-item"><span className="result-icon">{TXT.rocket}</span><span className="result-label">最快單題</span><span className="result-value">{(r.fastestMs/1000).toFixed(1)}s</span></div>
      </div>
      {!isIncomplete && comparison && (
        <div className={"comparison "+(comparison.improved?"improved":"declined")}>
          {comparison.improved?TXT.fire+" ":TXT.muscle+" "}{comparison.text}
        </div>
      )}
      {!isIncomplete && leaderboard.length > 1 && (
        <div className="leaderboard-card">
          <h3>{TXT.trophy} 排行榜（最佳紀錄）</h3>
          <div className="leaderboard-list">
            {leaderboard.map((entry, idx) => {
              const isMe = profile && entry.profile_id === profile.id;
              const medal = idx < 3 ? medals[idx] : (idx+1)+"";
              return (
                <div key={entry.profile_id} className={"lb-row"+(isMe?" lb-row-me":"")}>
                  <span className="lb-rank">{medal}</span>
                  <span className="lb-avatar">{entry.avatar}</span>
                  <span className="lb-name">{entry.name}{isMe?"（你）":""}</span>
                  <span className="lb-score">{config.mode==="timeAttack"?entry.correct_count+" 題":entry.total_seconds+" 秒"}</span>
                  <span className="lb-acc">{entry.accuracy}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="result-actions">
        <button className="btn btn-start" onClick={session.resetSession}>{TXT.refresh} 再來一次！</button>
      </div>
    </div>
  );
}

// ─── Rankings Screen ───
function RankingsScreen({ profile, onBack }) {
  const [data, setData] = React.useState(null);
  const [tab, setTab] = React.useState("sprint"); // sprint | timeAttack

  React.useEffect(() => {
    API.rankings().then(setData).catch(() => setData([]));
  }, []);

  if (!data) return <div className="rankings-screen"><p className="profile-empty">載入中...</p></div>;

  const operations = QuestionGenerator.getOperations();

  // Group data: { operation -> level -> mode_value -> [entries sorted] }
  const grouped = {};
  data.filter(d => d.mode === tab).forEach(d => {
    const key = d.operation + "_" + d.level + "_" + d.mode_value;
    if (!grouped[key]) grouped[key] = { operation: d.operation, level: d.level, mode_value: d.mode_value, entries: [] };
    grouped[key].entries.push(d);
  });

  // Sort entries within each group
  Object.values(grouped).forEach(g => {
    if (tab === "sprint") {
      g.entries.sort((a, b) => a.best_seconds - b.best_seconds);
    } else {
      g.entries.sort((a, b) => b.correct_count - a.correct_count);
    }
  });

  // Sort groups by operation order then level
  const opOrder = ["addition", "subtraction", "multiplication", "division"];
  const sortedGroups = Object.values(grouped).sort((a, b) => {
    const oi = opOrder.indexOf(a.operation) - opOrder.indexOf(b.operation);
    if (oi !== 0) return oi;
    if (a.level !== b.level) return a.level - b.level;
    return a.mode_value - b.mode_value;
  });

  return (
    <div className="rankings-screen">
      <div className="app-header">
        <h1 className="app-title">{TXT.trophy} 戰力排行</h1>
      </div>
      <div className="rank-tabs">
        <button className={"rank-tab" + (tab === "sprint" ? " rank-tab-active" : "")} onClick={() => setTab("sprint")}>
          {TXT.runner} 定額衝刺
        </button>
        <button className={"rank-tab" + (tab === "timeAttack" ? " rank-tab-active" : "")} onClick={() => setTab("timeAttack")}>
          {TXT.alarm} 限時挑戰
        </button>
      </div>

      {sortedGroups.length === 0 && (
        <div className="setup-card"><p className="profile-empty">還沒有任何成績紀錄，快去挑戰吧！</p></div>
      )}

      {sortedGroups.map(g => {
        const opInfo = OPERATION_LABELS[g.operation];
        const lvlIcon = LEVEL_ICONS[g.level] || LEVEL_ICONS[1];
        const best = g.entries[0];
        const maxVal = tab === "sprint" ? (g.entries[g.entries.length - 1]?.best_seconds || 1) : (best?.correct_count || 1);

        return (
          <div key={g.operation + g.level + g.mode_value} className="rank-card">
            <div className="rank-card-header">
              <span className="rank-card-op">{opInfo.icon} {opInfo.label}</span>
              <span className="rank-card-level">{lvlIcon.emoji} Lv.{g.level}</span>
              <span className="rank-card-mode">{tab === "sprint" ? g.mode_value + " 題" : g.mode_value + " 分鐘"}</span>
            </div>
            <div className="rank-entries">
              {g.entries.map((e, idx) => {
                const isMe = profile && e.profile_id === profile.id;
                const medal = idx < 3 ? medals[idx] : "";
                // Bar width: sprint = inversely proportional (fastest=100%), timeAttack = proportional
                let barPct;
                if (tab === "sprint") {
                  barPct = best.best_seconds > 0 ? Math.max(15, (best.best_seconds / e.best_seconds) * 100) : 100;
                } else {
                  barPct = maxVal > 0 ? Math.max(15, (e.correct_count / maxVal) * 100) : 100;
                }
                return (
                  <div key={e.profile_id} className={"rank-entry" + (isMe ? " rank-entry-me" : "")}>
                    <div className="rank-entry-info">
                      <span className="rank-medal">{medal || (idx + 1)}</span>
                      <span className="rank-avatar">{e.avatar}</span>
                      <span className="rank-name">{e.name}</span>
                    </div>
                    <div className="rank-bar-wrap">
                      <div className="rank-bar" style={{ width: barPct + "%" }}>
                        <span className="rank-bar-label">
                          {tab === "sprint"
                            ? e.best_seconds + "s"
                            : e.correct_count + " 題"
                          }
                        </span>
                      </div>
                    </div>
                    <span className="rank-acc">{e.accuracy}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <button className="btn btn-start" onClick={onBack} style={{marginTop: "16px"}}>
        {TXT.refresh} 回到首頁
      </button>
    </div>
  );
}

// ─── Main App ───
function App() {
  const [profile, setProfile] = React.useState(null);
  const [screen, setScreen] = React.useState("setup"); // setup | rankings
  const session = useSession(profile ? profile.id : null);

  const handleSwitchProfile = () => {
    session.resetSession();
    setScreen("setup");
    setProfile(null);
  };

  if (!profile) return <ProfileScreen onSelect={setProfile} />;

  if (screen === "rankings") {
    return <RankingsScreen profile={profile} onBack={() => setScreen("setup")} />;
  }

  if (!session.config) {
    return <SetupScreen
      onStart={session.startSession}
      profile={profile}
      onSwitchProfile={handleSwitchProfile}
      onRankings={() => setScreen("rankings")}
    />;
  }
  return <PracticeScreen session={session} profile={profile} />;
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/static/sw.js").catch(() => {});
  });
}
