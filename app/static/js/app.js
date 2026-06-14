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
  5: { emoji: "\uD83E\uDD84", label: "獨角獸" },
  6: { emoji: "\uD83D\uDC18", label: "大象王" },
  7: { emoji: "\uD83E\uDD96", label: "暴龍" },
  8: { emoji: "\uD83D\uDC33", label: "巨鯨" },
  9: { emoji: "\uD83E\uDD85", label: "神鷹" },
  10: { emoji: "\uD83D\uDE80", label: "火箭" },
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
  leaderboard: (op,lvl,mode,mv) => fetch("/api/leaderboard?operation="+op+"&level="+lvl+"&mode="+mode+"&mode_value="+mv).then(r=>r.json()),
  history: (pid,params) => { const q=new URLSearchParams(params).toString(); return fetch("/api/history/"+pid+"?"+q).then(r=>r.json()); },
  rankings: () => fetch("/api/rankings").then(r=>r.json()),
  personalBests: (pid) => fetch("/api/personal-bests/"+pid).then(r=>r.json()),
  practiceTime: (params) => { const q=new URLSearchParams(params).toString(); return fetch("/api/practice-time?"+q).then(r=>r.json()); },
  wrongQuestions: (pid,params) => { const q=new URLSearchParams(params).toString(); return fetch("/api/wrong-questions/"+pid+"?"+q).then(r=>r.json()); },
  slowestQuestions: (pid,params) => { const q=new URLSearchParams(params).toString(); return fetch("/api/slowest-questions/"+pid+"?"+q).then(r=>r.json()); },
  saveReviewResults: (pid,answers,ts) => fetch("/api/review-results",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({profile_id:pid,answers,timestamp:ts})}).then(r=>r.json()),
  dismissQuestion: (pid,display,answer) => fetch("/api/dismiss-question/"+pid,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question_display:display,correct_answer:answer})}).then(r=>r.json()),
  restoreQuestion: (pid,display,answer) => fetch("/api/restore-question/"+pid,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question_display:display,correct_answer:answer})}).then(r=>r.json()),
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

// ─── 常駐首頁按鈕（畫面頂端一角）───
function HomeButton({ onClick }) {
  return (
    <button className="home-btn" onClick={onClick} title="回到首頁" aria-label="回到首頁">
      🏠
    </button>
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
          <React.Fragment>
            <button className="btn btn-add-profile" onClick={() => setShowAdd(true)}>
              {TXT.plus} 新增角色
            </button>
            <button className="btn btn-guest" onClick={() => onSelect({ id: "__guest__", name: "訪客", avatar: "🙂", isGuest: true })}>
              {TXT.rocket} 訪客模式（不需註冊，先玩玩看）
            </button>
          </React.Fragment>
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
function SetupScreen({ onStart, profile, onSwitchProfile, onRankings, onMistakes }) {
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
            {profile.isGuest && <span className="guest-tag">訪客 · 成績不會保存</span>}
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
      <div className="setup-bottom-btns">
        <button className="btn btn-rankings" onClick={onRankings}>
          {TXT.trophy} 戰力排行
        </button>
        <button className="btn btn-mistakes" onClick={onMistakes}>
          {TXT.memo} 錯題本
        </button>
      </div>
      <a href="/admin" className="admin-link">{TXT.gear} 後台管理</a>
    </div>
  );
}

// ─── Practice Screen ───
function PracticeScreen({ session, profile, onReviewDone }) {
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

  if (session.sessionResult) return <ResultScreen session={session} profile={profile} onReviewDone={onReviewDone} />;

  const { config, timer } = session;
  const levelIcon = LEVEL_ICONS[config.level] || LEVEL_ICONS[1];
  const modeEmoji = config.mode === "timeAttack" ? TXT.alarm : TXT.runner;

  return (
    <div className={"practice-screen" + (session.feedback?.type==="correct"?" flash-correct":"") + (session.feedback?.type==="wrong"?" flash-wrong":"")}>
      <div className="practice-header">
        <div className="practice-info">
          {config.isReview ? (
            <span className="badge badge-review">{TXT.memo} 錯題練習</span>
          ) : (
            <React.Fragment>
              <span className="badge badge-op">{OPERATION_LABELS[config.operation].icon} {OPERATION_LABELS[config.operation].label}</span>
              <span className="badge badge-level">{levelIcon.emoji} Lv.{config.level}</span>
              <span className="badge badge-mode">{modeEmoji} {MODE_LABELS[config.mode]}</span>
            </React.Fragment>
          )}
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
function ResultScreen({ session, profile, onReviewDone }) {
  const { sessionResult: r, config } = session;
  const [showConfetti, setShowConfetti] = React.useState(false);
  const [leaderboard, setLeaderboard] = React.useState([]);
  const [pb, setPb] = React.useState(null);

  const isIncomplete = !!r.incomplete;
  const isReview = !!r.isReview;

  React.useEffect(() => {
    if (!profile || isIncomplete || isReview) return;
    // 只有完成的才載入排行榜和個人最佳比較
    API.leaderboard(config.operation, config.level, config.mode, config.modeValue).then(setLeaderboard).catch(() => {});
    API.history(profile.id, {operation:config.operation, level:config.level, mode:config.mode, mode_value:config.modeValue}).then((rows) => {
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

  const encouragement = isIncomplete ? "挑戰中途結束，成績不列入排行"
    : isReview ? (r.accuracy === 100 ? "錯題全部征服！太厲害了！" : "繼續加油，把弱點攻克！")
    : getEncouragement(r.accuracy);
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
        {onReviewDone && (
          <button className="btn btn-rankings" onClick={onReviewDone} style={{marginTop:"8px"}}>
            {TXT.memo} 回到錯題本
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Rankings Screen ───
function RankingsScreen({ profile, onBack }) {
  const [mainTab, setMainTab] = React.useState("rankings"); // rankings | history | bests
  return (
    <div className="rankings-screen">
      <HomeButton onClick={onBack} />
      <div className="app-header">
        <h1 className="app-title">{TXT.trophy} 戰力中心</h1>
      </div>
      <div className="rank-tabs rank-tabs-3">
        <button className={"rank-tab"+(mainTab==="rankings"?" rank-tab-active":"")} onClick={()=>setMainTab("rankings")}>
          {TXT.trophy} 排行榜
        </button>
        <button className={"rank-tab"+(mainTab==="bests"?" rank-tab-active":"")} onClick={()=>setMainTab("bests")}>
          {TXT.star} 最佳成績
        </button>
        <button className={"rank-tab"+(mainTab==="history"?" rank-tab-active":"")} onClick={()=>setMainTab("history")}>
          {TXT.memo} 歷史紀錄
        </button>
      </div>
      {mainTab === "rankings" && <RankingsTab profile={profile} />}
      {mainTab === "bests" && <BestsTab profile={profile} />}
      {mainTab === "history" && <HistoryTab profile={profile} />}
    </div>
  );
}

// ─── 排行榜 Tab ───
function RankingsTab({ profile }) {
  const [data, setData] = React.useState(null);
  const [modeTab, setModeTab] = React.useState("sprint");
  React.useEffect(() => { API.rankings().then(setData).catch(()=>setData([])); }, []);
  if (!data) return <p className="profile-empty">載入中...</p>;

  const grouped = {};
  data.filter(d=>d.mode===modeTab).forEach(d => {
    const key = d.operation+"_"+d.level+"_"+d.mode_value;
    if(!grouped[key]) grouped[key]={operation:d.operation,level:d.level,mode_value:d.mode_value,entries:[]};
    grouped[key].entries.push(d);
  });
  Object.values(grouped).forEach(g => {
    if(modeTab==="sprint") g.entries.sort((a,b)=>a.best_seconds-b.best_seconds);
    else g.entries.sort((a,b)=>b.correct_count-a.correct_count);
  });
  const opOrder=["addition","subtraction","multiplication","division"];
  const sorted=Object.values(grouped).sort((a,b)=>{
    const o=opOrder.indexOf(a.operation)-opOrder.indexOf(b.operation);
    if(o!==0)return o; if(a.level!==b.level)return a.level-b.level; return a.mode_value-b.mode_value;
  });

  return (
    <div>
      <div className="rank-tabs sub-tabs">
        <button className={"rank-tab"+(modeTab==="sprint"?" rank-tab-active":"")} onClick={()=>setModeTab("sprint")}>{TXT.runner} 定額衝刺</button>
        <button className={"rank-tab"+(modeTab==="timeAttack"?" rank-tab-active":"")} onClick={()=>setModeTab("timeAttack")}>{TXT.alarm} 限時挑戰</button>
      </div>
      {sorted.length===0 && <div className="setup-card"><p className="profile-empty">還沒有成績，快去挑戰吧！</p></div>}
      {sorted.map(g => {
        const opInfo=OPERATION_LABELS[g.operation]; const lvlIcon=LEVEL_ICONS[g.level]||LEVEL_ICONS[1];
        const best=g.entries[0]; const worst=g.entries[g.entries.length-1];
        return (
          <div key={g.operation+g.level+g.mode_value} className="rank-card">
            <div className="rank-card-header">
              <span className="rank-card-op">{opInfo.icon} {opInfo.label}</span>
              <span className="rank-card-level">{lvlIcon.emoji} Lv.{g.level}</span>
              <span className="rank-card-mode">{modeTab==="sprint"?g.mode_value+" 題":g.mode_value+" 分鐘"}</span>
            </div>
            <div className="rank-entries">
              {g.entries.map((e,idx)=>{
                const isMe=profile&&e.profile_id===profile.id;
                const medal=idx<3?medals[idx]:"";
                let barPct;
                if(modeTab==="sprint") barPct=best.best_seconds>0?Math.max(15,(best.best_seconds/e.best_seconds)*100):100;
                else barPct=best.correct_count>0?Math.max(15,(e.correct_count/best.correct_count)*100):100;
                return (
                  <div key={e.profile_id} className={"rank-entry"+(isMe?" rank-entry-me":"")}>
                    <div className="rank-entry-info">
                      <span className="rank-medal">{medal||(idx+1)}</span>
                      <span className="rank-avatar">{e.avatar}</span>
                      <span className="rank-name">{e.name}</span>
                    </div>
                    <div className="rank-bar-wrap">
                      <div className="rank-bar" style={{width:barPct+"%"}}>
                        <span className="rank-bar-label">{modeTab==="sprint"?e.best_seconds+"s":e.correct_count+" 題"}</span>
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
    </div>
  );
}

// ─── 最佳成績 Tab ───
function BestsTab({ profile }) {
  const [bests, setBests] = React.useState(null);
  React.useEffect(() => { if(profile) API.personalBests(profile.id).then(setBests).catch(()=>setBests([])); }, [profile]);
  if(!bests) return <p className="profile-empty">載入中...</p>;
  if(bests.length===0) return <div className="setup-card"><p className="profile-empty">還沒有任何成績</p></div>;

  const opOrder=["addition","subtraction","multiplication","division"];
  // Group by operation
  const byOp={};
  bests.forEach(b => {
    if(!byOp[b.operation]) byOp[b.operation]=[];
    byOp[b.operation].push(b);
  });

  return (
    <div>
      {opOrder.filter(op=>byOp[op]).map(op => {
        const opInfo=OPERATION_LABELS[op];
        const items=byOp[op].sort((a,b)=>a.level-b.level||(a.mode==="sprint"?-1:1)||a.mode_value-b.mode_value);
        return (
          <div key={op} className="rank-card">
            <div className="rank-card-header">
              <span className="rank-card-op">{opInfo.icon} {opInfo.label}</span>
            </div>
            <div className="bests-grid">
              {items.map(b => {
                const lvl=LEVEL_ICONS[b.level]||LEVEL_ICONS[1];
                const isSprint=b.mode==="sprint";
                return (
                  <div key={b.level+"_"+b.mode+"_"+b.mode_value} className="best-card">
                    <div className="best-card-top">
                      <span className="best-level">{lvl.emoji} Lv.{b.level}</span>
                      <span className="best-mode">{isSprint?b.mode_value+" 題":b.mode_value+" 分鐘"}</span>
                    </div>
                    <div className="best-main-value">
                      {isSprint ? b.best_seconds+"s" : b.correct_count+" 題"}
                    </div>
                    <div className="best-sub">
                      {TXT.bullseye} {b.accuracy}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── 錯題本畫面 ───
function MistakesScreen({ profile, session, onBack }) {
  const [wrongQs, setWrongQs] = React.useState(null);
  const [slowQs, setSlowQs] = React.useState(null);
  const [filterOp, setFilterOp] = React.useState("");
  const [subTab, setSubTab] = React.useState("wrong"); // wrong | slow
  const [confirmDismiss, setConfirmDismiss] = React.useState(null); // key of question being confirmed
  const [selectMode, setSelectMode] = React.useState(false);
  const [selected, setSelected] = React.useState({}); // qKey -> question
  const [masterySuggest, setMasterySuggest] = React.useState([]); // streak>=3 建議刪除清單
  const promptedRef = React.useRef(new Set()); // 已提醒過的題目（避免重複跳窗）

  const MASTERY_STREAK = 3;
  const qKeyOf = (q) => q.question_display + "|" + q.correct_answer;

  const reload = () => {
    if (!profile) return;
    const params = {};
    if (filterOp) params.operation = filterOp;
    params.limit = 50;
    API.wrongQuestions(profile.id, params).then((data) => {
      setWrongQs(data);
      // 找出連續答對達標、且尚未提醒過的題目 → 跳出建議刪除提醒
      const fresh = (data || []).filter(
        (q) => (q.review_streak || 0) >= MASTERY_STREAK && !promptedRef.current.has(qKeyOf(q))
      );
      if (fresh.length > 0) {
        fresh.forEach((q) => promptedRef.current.add(qKeyOf(q)));
        setMasterySuggest(fresh);
      }
    }).catch(() => setWrongQs([]));
    const slowParams = { ...params, limit: 10 };
    API.slowestQuestions(profile.id, slowParams).then(setSlowQs).catch(() => setSlowQs([]));
  };

  React.useEffect(reload, [profile, filterOp]);

  // 如果正在練習錯題，顯示練習畫面
  if (session.config) {
    return <PracticeScreen session={session} profile={profile} onReviewDone={() => { session.resetSession(); reload(); }} />;
  }

  if (!wrongQs || !slowQs) return <div className="mistakes-screen"><p className="profile-empty">載入中...</p></div>;

  const items = subTab === "wrong" ? wrongQs : slowQs;

  // 產生練習題庫
  const buildPracticePool = () => {
    const pool = subTab === "wrong" ? wrongQs : slowQs;
    return pool.map(q => ({
      display: q.question_display,
      answer: q.correct_answer,
      operation: q.operation,
      level: q.level,
    }));
  };

  const startPractice = () => {
    const pool = buildPracticePool();
    if (pool.length === 0) return;
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    session.startReviewSession(pool);
  };

  const handleDismiss = (q) => {
    API.dismissQuestion(profile.id, q.question_display, q.correct_answer).then(() => {
      setConfirmDismiss(null);
      reload();
    });
  };

  // 批次移除多題
  const dismissMany = (list) => {
    if (!list || list.length === 0) return Promise.resolve();
    return Promise.all(
      list.map((q) => API.dismissQuestion(profile.id, q.question_display, q.correct_answer))
    ).then(() => reload());
  };

  const toggleSelect = (q) => {
    const k = qKeyOf(q);
    setSelected((prev) => {
      const next = { ...prev };
      if (next[k]) delete next[k]; else next[k] = q;
      return next;
    });
  };

  const exitSelectMode = () => { setSelectMode(false); setSelected({}); };

  const handleDeleteSelected = () => {
    const list = Object.values(selected);
    if (list.length === 0) return;
    dismissMany(list).then(exitSelectMode);
  };

  const handleMasteryDelete = () => {
    dismissMany(masterySuggest).then(() => setMasterySuggest([]));
  };

  const poolSize = buildPracticePool().length;
  const selectedCount = Object.keys(selected).length;

  return (
    <div className="mistakes-screen">
      <HomeButton onClick={onBack} />
      <div className="app-header">
        <h1 className="app-title">{TXT.memo} 錯題本</h1>
        <p className="app-subtitle">{profile.avatar} {profile.name} 的弱點攻略</p>
      </div>

      <div className="rank-tabs sub-tabs">
        <button className={"rank-tab" + (subTab === "wrong" ? " rank-tab-active" : "")} onClick={() => setSubTab("wrong")}>
          {TXT.cross} 答錯題目
        </button>
        <button className={"rank-tab" + (subTab === "slow" ? " rank-tab-active" : "")} onClick={() => setSubTab("slow")}>
          {TXT.timer} 最慢題目
        </button>
      </div>

      {poolSize > 0 && (
        <button className="btn btn-start btn-practice-mistakes" onClick={startPractice}>
          {TXT.fire} 練習{subTab === "wrong" ? "錯題" : "慢題"}（{poolSize} 題）
        </button>
      )}

      <div className="history-filters mistakes-toolbar">
        <select className="history-select" value={filterOp} onChange={e => setFilterOp(e.target.value)}>
          <option value="">全部運算</option>
          <option value="addition">加法</option>
          <option value="subtraction">減法</option>
          <option value="multiplication">乘法</option>
          <option value="division">除法</option>
        </select>
        {!selectMode ? (
          <button className="btn-select-toggle" onClick={() => setSelectMode(true)}>
            {TXT.check} 多選刪除
          </button>
        ) : (
          <button className="btn-select-toggle btn-select-cancel" onClick={exitSelectMode}>
            取消多選
          </button>
        )}
      </div>

      <div className="rank-card">
        <h3 style={{fontSize: "14px", fontWeight: 700, marginBottom: "8px"}}>
          {subTab === "wrong" ? TXT.cross + " 答錯的題目（" + items.length + " 題）" : TXT.timer + " 最慢的題目（前 " + items.length + " 題）"}
        </h3>
        {items.length === 0 && (
          <p className="profile-empty">{subTab === "wrong" ? "沒有答錯的紀錄，太厲害了！" : "還沒有作答紀錄"}</p>
        )}
        <div className="mistakes-list">
          {items.map((q, i) => {
            const opInfo = OPERATION_LABELS[q.operation] || {icon: "", label: ""};
            const lvl = LEVEL_ICONS[q.level] || LEVEL_ICONS[1];
            const dt = new Date(q.timestamp);
            const dateStr = dt.toLocaleDateString("zh-TW", {month: "numeric", day: "numeric"}) + " " + dt.toLocaleTimeString("zh-TW", {hour: "2-digit", minute: "2-digit"});
            const rc = q.review_correct || 0;
            const rw = q.review_wrong || 0;
            const hasReview = rc + rw > 0;
            const qKey = q.question_display + "|" + q.correct_answer;
            const streak = q.review_streak || 0;
            const mastered = streak >= MASTERY_STREAK;
            const isSel = !!selected[qKey];
            return (
              <div key={qKey + "|" + i}
                className={"mistake-row" + (subTab === "wrong" ? " mistake-wrong" : " mistake-slow")
                  + (mastered ? " mistake-mastered" : "") + (selectMode && isSel ? " mistake-selected" : "")}
                onClick={selectMode ? () => toggleSelect(q) : undefined}>
                <div className="mistake-question">
                  {selectMode && (
                    <input type="checkbox" className="mistake-checkbox" checked={isSel}
                      onChange={() => toggleSelect(q)} onClick={(e) => e.stopPropagation()} />
                  )}
                  <span className="mistake-rank">{subTab === "slow" ? "#" + (i + 1) : ""}</span>
                  <span className="mistake-display">{q.question_display} = ?</span>
                  {mastered && <span className="mastery-flag">{TXT.trophy} 連續答對 {streak} 次</span>}
                </div>
                <div className="mistake-details">
                  <span className="history-badge">{opInfo.icon} {opInfo.label}</span>
                  <span className="history-badge">{lvl.emoji} Lv.{q.level}</span>
                  {subTab === "wrong" && (
                    <span className="mistake-answer-wrong">你的答案：{q.user_answer}</span>
                  )}
                  <span className="mistake-answer-correct">正確答案：{q.correct_answer}</span>
                  <span className="mistake-time">{TXT.bolt} {(q.time_ms / 1000).toFixed(1)}s</span>
                  <span className="history-date">{dateStr}</span>
                </div>
                {hasReview && (
                  <div className="review-stats">
                    <span className="review-stats-label">複習紀錄：</span>
                    <span className="review-stat-correct">{TXT.check} 答對 {rc} 次</span>
                    <span className="review-stat-wrong">{TXT.cross} 答錯 {rw} 次</span>
                    <span className="review-stat-streak">{TXT.fire} 連續答對 {streak} 次</span>
                    {rc > 0 && (
                      <span className="review-mastery">
                        {mastered ? TXT.trophy + " 已精熟" : rc >= rw ? TXT.star + " 進步中" : TXT.muscle + " 需加強"}
                      </span>
                    )}
                  </div>
                )}
                {!selectMode && (
                  <div className="mistake-actions">
                    {confirmDismiss === qKey ? (
                      <div className="dismiss-confirm">
                        <span className="dismiss-confirm-text">確定移除？</span>
                        <button className="btn-dismiss-yes" onClick={() => handleDismiss(q)}>移除</button>
                        <button className="btn-dismiss-no" onClick={() => setConfirmDismiss(null)}>取消</button>
                      </div>
                    ) : (
                      <button className={"btn-dismiss" + (mastered ? " btn-dismiss-ready" : "")} onClick={() => setConfirmDismiss(qKey)}>
                        {TXT.check} 已學會，移除
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selectMode && (
        <div className="select-action-bar">
          <span className="select-count">已選 {selectedCount} 題</span>
          <button className="btn-select-all"
            onClick={() => {
              const all = {};
              items.forEach((q) => { all[qKeyOf(q)] = q; });
              setSelected(all);
            }}>全選本頁</button>
          <button className="btn-select-clear" onClick={() => setSelected({})}>清除</button>
          <button className="btn-select-delete" disabled={selectedCount === 0} onClick={handleDeleteSelected}>
            {TXT.trash} 刪除所選（{selectedCount}）
          </button>
        </div>
      )}

      {masterySuggest.length > 0 && (
        <div className="mastery-modal-overlay" onClick={() => setMasterySuggest([])}>
          <div className="mastery-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{TXT.trophy} 太棒了！</h3>
            <p className="mastery-modal-desc">
              以下題目已<b>連續答對 {MASTERY_STREAK} 次</b>，看起來已經學會了，要不要從錯題本移除？
            </p>
            <div className="mastery-modal-list">
              {masterySuggest.map((q) => (
                <div key={qKeyOf(q)} className="mastery-modal-item">
                  <span className="mastery-modal-q">{q.question_display} = {q.correct_answer}</span>
                  <span className="mastery-modal-streak">{TXT.fire} 連對 {q.review_streak} 次</span>
                </div>
              ))}
            </div>
            <div className="mastery-modal-actions">
              <button className="btn-mastery-delete" onClick={handleMasteryDelete}>
                {TXT.check} 好，移除這 {masterySuggest.length} 題
              </button>
              <button className="btn-mastery-keep" onClick={() => setMasterySuggest([])}>
                先保留
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 歷史紀錄 Tab ───
function fmtMs(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return s + " 秒";
  const m = Math.floor(s / 60);
  const rs = s % 60;
  return m + " 分 " + (rs > 0 ? rs + " 秒" : "");
}

function toDateStr(d) { return d.toISOString().slice(0, 10); }
function startOfDay(dateStr) { return new Date(dateStr + "T00:00:00").getTime(); }
function endOfDay(dateStr) { return new Date(dateStr + "T23:59:59").getTime() + 999; }

function HistoryTab({ profile }) {
  const [records, setRecords] = React.useState(null);
  const [ptData, setPtData] = React.useState(null);
  const [rangeType, setRangeType] = React.useState("today"); // today|7|30|90|custom|all
  const [customFrom, setCustomFrom] = React.useState(toDateStr(new Date()));
  const [customTo, setCustomTo] = React.useState(toDateStr(new Date()));
  const [filterOp, setFilterOp] = React.useState("");

  // 計算 from / to 時間戳
  let tsFrom, tsTo;
  const now = new Date();
  if (rangeType === "today") {
    tsFrom = startOfDay(toDateStr(now));
    tsTo = endOfDay(toDateStr(now));
  } else if (rangeType === "custom") {
    tsFrom = startOfDay(customFrom);
    tsTo = endOfDay(customTo);
  } else if (rangeType === "all") {
    tsFrom = undefined;
    tsTo = undefined;
  } else {
    tsFrom = Date.now() - parseInt(rangeType) * 86400000;
    tsTo = undefined;
  }

  React.useEffect(() => {
    if(!profile) return;
    const params = {};
    if(filterOp) params.operation = filterOp;
    if(tsFrom) params.from = tsFrom;
    if(tsTo) params.to = tsTo;
    API.history(profile.id, params).then(setRecords).catch(()=>setRecords([]));
    const ptParams = {};
    if(tsFrom) ptParams.from = tsFrom;
    if(tsTo) ptParams.to = tsTo;
    API.practiceTime(ptParams).then(setPtData).catch(()=>setPtData([]));
  }, [profile, rangeType, customFrom, customTo, filterOp]);

  if(!records) return <p className="profile-empty">載入中...</p>;

  // ── 練習時間圖表（所有角色） ──
  const ptByDay = {};
  if (ptData) {
    ptData.forEach(r => {
      if (!ptByDay[r.day]) ptByDay[r.day] = {};
      if (!ptByDay[r.day][r.profile_id]) ptByDay[r.day][r.profile_id] = { name: r.name, avatar: r.avatar, ms: 0 };
      ptByDay[r.day][r.profile_id].ms += r.total_ms;
    });
  }
  const ptDays = Object.keys(ptByDay).sort().slice(-10);
  const allProfiles = {};
  if (ptData) ptData.forEach(r => { allProfiles[r.profile_id] = { name: r.name, avatar: r.avatar }; });
  const profileIds = Object.keys(allProfiles);
  const barColors = ["#6C63FF","#FF6B6B","#2ECC71","#FFD93D","#45B7D1","#DDA0DD","#FF8C00","#96CEB4"];
  const ptMax = Math.max(1, ...ptDays.map(d => Math.max(...profileIds.map(pid => (ptByDay[d]?.[pid]?.ms || 0)))));

  // ── 答題數圖表 ──
  const byDate = {};
  records.forEach(r => {
    const d = new Date(r.timestamp).toLocaleDateString("zh-TW",{month:"numeric",day:"numeric"});
    if(!byDate[d]) byDate[d] = { count:0, correct:0 };
    byDate[d].count += r.total_questions;
    byDate[d].correct += r.correct_count;
  });
  const dates = Object.keys(byDate).reverse().slice(-14);
  const maxCount = Math.max(1, ...dates.map(d => byDate[d].count));

  return (
    <div>
      <div className="history-filters">
        <div className="filter-row">
          {[["today","今日"],["7","7 天"],["30","30 天"],["90","90 天"],["custom","自訂"],["all","全部"]].map(([v,label])=>(
            <button key={v} className={"filter-chip"+(rangeType===v?" filter-chip-active":"")}
              onClick={()=>setRangeType(v)}>{label}</button>
          ))}
        </div>
        {rangeType === "custom" && (
          <div className="filter-dates">
            <input type="date" className="date-input" value={customFrom}
              onChange={e=>setCustomFrom(e.target.value)} max={customTo} />
            <span className="date-sep">~</span>
            <input type="date" className="date-input" value={customTo}
              onChange={e=>setCustomTo(e.target.value)} min={customFrom} max={toDateStr(new Date())} />
          </div>
        )}
        <select className="history-select" value={filterOp} onChange={e=>setFilterOp(e.target.value)}>
          <option value="">全部運算</option>
          <option value="addition">加法</option>
          <option value="subtraction">減法</option>
          <option value="multiplication">乘法</option>
          <option value="division">除法</option>
        </select>
      </div>

      {ptDays.length > 0 && profileIds.length > 0 && (
        <div className="rank-card">
          <h3 style={{fontSize:"14px",fontWeight:700,marginBottom:"12px"}}>
            {TXT.timer} 每日練習時間（所有角色）
          </h3>
          {(() => {
            // 計算 Y 軸刻度（3~5 格，取整分鐘或整秒）
            const yTicks = [];
            const maxSec = Math.ceil(ptMax / 1000);
            let step;
            if (maxSec <= 60) step = 15;
            else if (maxSec <= 300) step = 60;
            else if (maxSec <= 900) step = 180;
            else if (maxSec <= 1800) step = 300;
            else step = 600;
            for (let s = 0; s <= maxSec + step; s += step) {
              yTicks.push(s);
              if (yTicks.length >= 6) break;
            }
            const yMax = yTicks[yTicks.length - 1] * 1000; // ms
            function fmtAxis(sec) {
              if (sec === 0) return "0";
              if (sec < 60) return sec + "s";
              const m = Math.floor(sec / 60);
              const rs = sec % 60;
              return rs === 0 ? m + "m" : m + "m" + rs + "s";
            }
            return (
              <div className="pt-chart-wrap">
                <div className="pt-y-axis">
                  {[...yTicks].reverse().map(s => (
                    <span key={s} className="pt-y-label">{fmtAxis(s)}</span>
                  ))}
                </div>
                <div className="pt-chart-body">
                  <div className="pt-grid-lines">
                    {yTicks.map(s => (
                      <div key={s} className="pt-grid-line" style={{bottom: (s * 1000 / yMax * 100) + "%"}} />
                    ))}
                  </div>
                  <div className="pt-chart">
                    {ptDays.map(day => {
                      const dayLabel = day.slice(5);
                      return (
                        <div key={day} className="pt-day-col">
                          <div className="pt-bars">
                            {profileIds.map((pid, pi) => {
                              const ms = ptByDay[day]?.[pid]?.ms || 0;
                              const h = yMax > 0 ? Math.max(0, (ms / yMax) * 100) : 0;
                              const isMe = profile && pid === profile.id;
                              return (
                                <div key={pid} className={"pt-bar" + (isMe ? " pt-bar-me" : "")}
                                  style={{height: h + "%", background: barColors[pi % barColors.length]}}
                                  title={allProfiles[pid].name + ": " + fmtMs(ms)}>
                                </div>
                              );
                            })}
                          </div>
                          <span className="chart-label">{dayLabel}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}
          <div className="chart-legend" style={{flexWrap:"wrap"}}>
            {profileIds.map((pid, pi) => (
              <span key={pid} className="legend-item">
                <span className="legend-box" style={{background: barColors[pi % barColors.length]}}></span>
                {allProfiles[pid].avatar} {allProfiles[pid].name}
              </span>
            ))}
          </div>
          <div className="pt-today-summary">
            {profileIds.map(pid => {
              const today = new Date().toISOString().slice(0, 10);
              const ms = ptByDay[today]?.[pid]?.ms || 0;
              const isMe = profile && pid === profile.id;
              return (
                <div key={pid} className={"pt-summary-item" + (isMe ? " pt-summary-me" : "")}>
                  <span>{allProfiles[pid].avatar} {allProfiles[pid].name}</span>
                  <span className="pt-summary-time">今日：{ms > 0 ? fmtMs(ms) : "—"}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {dates.length > 0 && (
        <div className="rank-card">
          <h3 style={{fontSize:"14px",fontWeight:700,marginBottom:"12px"}}>
            {TXT.bullseye} 每日答題數
          </h3>
          <div className="history-chart">
            {dates.map(d => {
              const info = byDate[d];
              const h = Math.max(8, (info.count / maxCount) * 120);
              const acc = info.count > 0 ? Math.round(info.correct / info.count * 100) : 0;
              return (
                <div key={d} className="chart-col">
                  <span className="chart-val">{info.count}</span>
                  <div className="chart-bar-wrap">
                    <div className="chart-bar" style={{height:h+"px"}} title={acc+"%"}>
                      <div className="chart-bar-correct" style={{height:acc+"%"}}></div>
                    </div>
                  </div>
                  <span className="chart-label">{d}</span>
                </div>
              );
            })}
          </div>
          <div className="chart-legend">
            <span className="legend-item"><span className="legend-box legend-total"></span> 總題數</span>
            <span className="legend-item"><span className="legend-box legend-correct"></span> 正確</span>
          </div>
        </div>
      )}

      <div className="rank-card">
        <h3 style={{fontSize:"14px",fontWeight:700,marginBottom:"8px"}}>
          {TXT.memo} 紀錄列表（{records.length} 筆）
        </h3>
        {records.length === 0 && <p className="profile-empty">沒有紀錄</p>}
        <div className="history-list">
          {records.slice(0,50).map((r,i) => {
            const opInfo=OPERATION_LABELS[r.operation]||{icon:"",label:""};
            const lvl=LEVEL_ICONS[r.level]||LEVEL_ICONS[1];
            const dt=new Date(r.timestamp);
            const dateStr=dt.toLocaleDateString("zh-TW",{month:"numeric",day:"numeric"})+" "+dt.toLocaleTimeString("zh-TW",{hour:"2-digit",minute:"2-digit"});
            const isSprint=r.mode==="sprint";
            const ptMs = r.practice_time_ms || 0;
            return (
              <div key={r.id||i} className="history-row">
                <div className="history-row-top">
                  <span className="history-badge">{opInfo.icon} {opInfo.label}</span>
                  <span className="history-badge">{lvl.emoji} Lv.{r.level}</span>
                  <span className="history-badge">{isSprint?r.mode_value+"題":r.mode_value+"分鐘"}</span>
                  <span className="history-date">{dateStr}</span>
                </div>
                <div className="history-row-stats">
                  <span>{TXT.check} {r.correct_count}/{r.total_questions}</span>
                  <span>{TXT.bullseye} {r.accuracy}%</span>
                  <span>{isSprint?TXT.timer+" "+r.total_seconds+"s":TXT.bolt+" "+r.correct_count+"題"}</span>
                  {ptMs > 0 && <span>{TXT.timer} {fmtMs(ptMs)}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main App ───
function App() {
  const [profile, setProfile] = React.useState(null);
  const [screen, setScreen] = React.useState("setup"); // setup | rankings | mistakes
  // 訪客模式不存任何資料（profileId 傳 null，session 不寫回伺服器）
  const session = useSession(profile && !profile.isGuest ? profile.id : null);

  const handleSwitchProfile = () => {
    session.resetSession();
    setScreen("setup");
    setProfile(null);
  };

  if (!profile) return <ProfileScreen onSelect={setProfile} />;

  if (screen === "rankings") {
    return <RankingsScreen profile={profile} onBack={() => setScreen("setup")} />;
  }

  if (screen === "mistakes") {
    return <MistakesScreen profile={profile} session={session}
      onBack={() => { session.resetSession(); setScreen("setup"); }} />;
  }

  if (!session.config) {
    return <SetupScreen
      onStart={session.startSession}
      profile={profile}
      onSwitchProfile={handleSwitchProfile}
      onRankings={() => setScreen("rankings")}
      onMistakes={() => setScreen("mistakes")}
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
