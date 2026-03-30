/**
 * 練習 Session 管理 Hook
 *
 * 整合題目產生器與計時器，管理整場練習的狀態：
 * - 出題 / 答題 / 即時回饋
 * - 統計（正確數、答題數、每題耗時）
 * - 練習結束後產出成績報告
 * - LocalStorage 歷史紀錄（依角色分開存）
 */

// eslint-disable-next-line no-unused-vars
function useSession(profileId) {
  const { useState, useCallback, useRef } = React;

  const timer = useTimer();

  // --- Session 設定 ---
  const [config, setConfig] = useState(null);

  // --- 答題狀態 ---
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [sessionResult, setSessionResult] = useState(null);

  const questionStartRef = useRef(null);

  // --- 角色專屬的 storage key ---
  function storageKey() {
    return "daymath_history_" + (profileId || "default");
  }

  // --- 產生下一題 ---
  const nextQuestion = useCallback((operation, level) => {
    const q = QuestionGenerator.generate(operation, level);
    setCurrentQuestion(q);
    questionStartRef.current = Date.now();
    return q;
  }, []);

  // --- 開始 Session ---
  const startSession = useCallback((operation, level, mode, value) => {
    const cfg = { operation, level, mode, value };
    setConfig(cfg);
    setQuestionIndex(0);
    setCorrectCount(0);
    setAnswers([]);
    setFeedback(null);
    setSessionResult(null);

    if (mode === "timeAttack") {
      timer.startTimeAttack(value, () => {});
    } else {
      timer.startSprint(value, null);
    }

    nextQuestion(operation, level);
    setQuestionIndex(1);
  }, [timer, nextQuestion]);

  // --- 提交答案 ---
  const submitAnswer = useCallback((userAnswer) => {
    if (!currentQuestion || !config || timer.isFinished) return null;

    const timeMs = Date.now() - (questionStartRef.current || Date.now());
    const numAnswer = parseInt(userAnswer, 10);
    const correct = numAnswer === currentQuestion.answer;

    const record = {
      question: currentQuestion,
      userAnswer: numAnswer,
      correct,
      timeMs,
    };

    const newAnswers = [...answers, record];
    setAnswers(newAnswers);

    const newCorrectCount = correct ? correctCount + 1 : correctCount;
    if (correct) setCorrectCount(newCorrectCount);

    const fb = {
      type: correct ? "correct" : "wrong",
      correctAnswer: currentQuestion.answer,
    };
    setFeedback(fb);

    const newIndex = questionIndex + 1;

    if (config.mode === "sprint" && newAnswers.length >= config.value) {
      timer.finishSprint();
      const result = buildResult(newAnswers, newCorrectCount, config, timer.elapsedSeconds);
      setSessionResult(result);
      saveHistory(result);
      return { feedback: fb, finished: true, result };
    }

    if (config.mode === "timeAttack" && timer.isFinished) {
      const result = buildResult(newAnswers, newCorrectCount, config, timer.totalSeconds);
      setSessionResult(result);
      saveHistory(result);
      return { feedback: fb, finished: true, result };
    }

    setTimeout(() => {
      setFeedback(null);
      nextQuestion(config.operation, config.level);
      setQuestionIndex(newIndex);
    }, correct ? 300 : 1000);

    return { feedback: fb, finished: false };
  }, [currentQuestion, config, timer, answers, correctCount, questionIndex, nextQuestion, profileId]);

  // --- 限時挑戰結束時的結算 ---
  const finalizeTimeAttack = useCallback(() => {
    if (!config || sessionResult) return;
    const result = buildResult(answers, correctCount, config, config.value * 60);
    setSessionResult(result);
    saveHistory(result);
  }, [config, answers, correctCount, sessionResult, profileId]);

  React.useEffect(() => {
    if (timer.isFinished && config?.mode === "timeAttack" && !sessionResult) {
      finalizeTimeAttack();
    }
  }, [timer.isFinished, config, sessionResult, finalizeTimeAttack]);

  // --- 建立成績報告 ---
  function buildResult(answerList, correct, cfg, totalSecs) {
    const total = answerList.length;
    const accuracy = total > 0 ? (correct / total) * 100 : 0;
    const avgTimeMs = total > 0
      ? answerList.reduce((sum, a) => sum + a.timeMs, 0) / total
      : 0;
    const fastestMs = total > 0
      ? Math.min(...answerList.map((a) => a.timeMs))
      : 0;

    return {
      operation: cfg.operation,
      level: cfg.level,
      mode: cfg.mode,
      modeValue: cfg.value,
      totalQuestions: total,
      correctCount: correct,
      accuracy: Math.round(accuracy * 10) / 10,
      totalSeconds: totalSecs,
      avgTimeMs: Math.round(avgTimeMs),
      fastestMs,
      timestamp: Date.now(),
      answers: answerList,
    };
  }

  // --- LocalStorage 歷史紀錄 ---
  function saveHistory(result) {
    try {
      const key = storageKey();
      const history = JSON.parse(localStorage.getItem(key) || "[]");
      history.push({
        operation: result.operation,
        level: result.level,
        mode: result.mode,
        modeValue: result.modeValue,
        totalQuestions: result.totalQuestions,
        correctCount: result.correctCount,
        accuracy: result.accuracy,
        totalSeconds: result.totalSeconds,
        avgTimeMs: result.avgTimeMs,
        fastestMs: result.fastestMs,
        timestamp: result.timestamp,
      });
      localStorage.setItem(key, JSON.stringify(history));
    } catch (e) {
      console.warn("Failed to save history:", e);
    }
  }

  function getHistory(operation, level, mode) {
    try {
      const history = JSON.parse(localStorage.getItem(storageKey()) || "[]");
      return history.filter(
        (h) =>
          (!operation || h.operation === operation) &&
          (!level || h.level === level) &&
          (!mode || h.mode === mode)
      );
    } catch {
      return [];
    }
  }

  function getPersonalBest(operation, level, mode) {
    const records = getHistory(operation, level, mode);
    if (records.length === 0) return null;

    if (mode === "timeAttack") {
      return records.reduce((best, r) =>
        r.correctCount > best.correctCount ? r : best
      );
    } else {
      return records.reduce((best, r) =>
        r.totalSeconds < best.totalSeconds ? r : best
      );
    }
  }

  // --- 取得所有角色在同一關卡的最佳成績（用於排行比較） ---
  function getAllProfilesBest(operation, level, mode) {
    try {
      const profiles = JSON.parse(localStorage.getItem("daymath_profiles") || "[]");
      const results = [];
      for (const p of profiles) {
        const key = "daymath_history_" + p.id;
        const history = JSON.parse(localStorage.getItem(key) || "[]");
        const filtered = history.filter(
          (h) => h.operation === operation && h.level === level && h.mode === mode
        );
        if (filtered.length === 0) continue;
        let best;
        if (mode === "timeAttack") {
          best = filtered.reduce((b, r) => r.correctCount > b.correctCount ? r : b);
        } else {
          best = filtered.reduce((b, r) => r.totalSeconds < b.totalSeconds ? r : b);
        }
        results.push({
          profileId: p.id,
          name: p.name,
          avatar: p.avatar,
          correctCount: best.correctCount,
          accuracy: best.accuracy,
          totalSeconds: best.totalSeconds,
          avgTimeMs: best.avgTimeMs,
        });
      }
      // 排序：timeAttack 按答對數降序，sprint 按秒數升序
      if (mode === "timeAttack") {
        results.sort((a, b) => b.correctCount - a.correctCount);
      } else {
        results.sort((a, b) => a.totalSeconds - b.totalSeconds);
      }
      return results;
    } catch {
      return [];
    }
  }

  // --- 中途放棄 ---
  const quitSession = useCallback(() => {
    if (!config) return;
    const totalSecs = config.mode === "timeAttack"
      ? (config.value * 60) - timer.remainingSeconds
      : timer.elapsedSeconds;
    timer.pause();
    const result = buildResult(answers, correctCount, config, totalSecs);
    setSessionResult(result);
    if (answers.length > 0) {
      saveHistory(result);
    }
  }, [config, timer, answers, correctCount, profileId]);

  // --- 重置 ---
  const resetSession = useCallback(() => {
    timer.reset();
    setConfig(null);
    setCurrentQuestion(null);
    setQuestionIndex(0);
    setCorrectCount(0);
    setAnswers([]);
    setFeedback(null);
    setSessionResult(null);
  }, [timer]);

  return {
    config,
    currentQuestion,
    questionIndex,
    correctCount,
    totalAnswered: answers.length,
    feedback,
    sessionResult,
    timer,
    startSession,
    submitAnswer,
    quitSession,
    resetSession,
    getHistory,
    getPersonalBest,
    getAllProfilesBest,
  };
}
