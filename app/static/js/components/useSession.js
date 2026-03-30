/**
 * 練習 Session 管理 Hook
 *
 * 整合題目產生器與計時器，管理整場練習的狀態：
 * - 出題 / 答題 / 即時回饋
 * - 統計（正確數、答題數、每題耗時）
 * - 練習結束後產出成績報告
 * - LocalStorage 歷史紀錄
 */

// eslint-disable-next-line no-unused-vars
function useSession() {
  const { useState, useCallback, useRef } = React;

  const timer = useTimer();

  // --- Session 設定 ---
  const [config, setConfig] = useState(null);
  // config = { operation, level, mode, value }
  // mode: 'timeAttack' → value = 分鐘數
  // mode: 'sprint'     → value = 題數

  // --- 答題狀態 ---
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [answers, setAnswers] = useState([]); // [{ question, userAnswer, correct, timeMs }]
  const [feedback, setFeedback] = useState(null); // { type: 'correct'|'wrong', correctAnswer }
  const [sessionResult, setSessionResult] = useState(null);

  const questionStartRef = useRef(null);

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

    const onFinish = () => {
      // 限時挑戰：時間到，自動結算（由 finalize 處理）
    };

    if (mode === "timeAttack") {
      timer.startTimeAttack(value, onFinish);
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

    // 即時回饋
    const fb = {
      type: correct ? "correct" : "wrong",
      correctAnswer: currentQuestion.answer,
    };
    setFeedback(fb);

    // 判斷是否結束
    const newIndex = questionIndex + 1;

    if (config.mode === "sprint" && newAnswers.length >= config.value) {
      // 定額衝刺：達到目標題數
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

    // 繼續下一題
    setTimeout(() => {
      setFeedback(null);
      nextQuestion(config.operation, config.level);
      setQuestionIndex(newIndex);
    }, correct ? 300 : 1000);

    return { feedback: fb, finished: false };
  }, [currentQuestion, config, timer, answers, correctCount, questionIndex, nextQuestion]);

  // --- 限時挑戰結束時的結算（由 timer onFinish 觸發） ---
  const finalizeTimeAttack = useCallback(() => {
    if (!config || sessionResult) return;
    const result = buildResult(answers, correctCount, config, config.value * 60);
    setSessionResult(result);
    saveHistory(result);
  }, [config, answers, correctCount, sessionResult]);

  // 監聽 timer 結束
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
      const key = "daymath_history";
      const history = JSON.parse(localStorage.getItem(key) || "[]");
      // 存摘要，不存每題詳細
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
      const history = JSON.parse(localStorage.getItem("daymath_history") || "[]");
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
      // 最佳 = 最多答對
      return records.reduce((best, r) =>
        r.correctCount > best.correctCount ? r : best
      );
    } else {
      // 最佳 = 最短時間
      return records.reduce((best, r) =>
        r.totalSeconds < best.totalSeconds ? r : best
      );
    }
  }

  // --- 中途放棄 ---
  const quitSession = useCallback(() => {
    if (!config) return;
    // 先讀取時間再停止計時器
    const totalSecs = config.mode === "timeAttack"
      ? (config.value * 60) - timer.remainingSeconds
      : timer.elapsedSeconds;
    timer.pause();
    const result = buildResult(answers, correctCount, config, totalSecs);
    setSessionResult(result);
    if (answers.length > 0) {
      saveHistory(result);
    }
  }, [config, timer, answers, correctCount]);

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
    // 設定
    config,
    // 狀態
    currentQuestion,
    questionIndex,
    correctCount,
    totalAnswered: answers.length,
    feedback,
    sessionResult,
    // 計時器
    timer,
    // 操作
    startSession,
    submitAnswer,
    quitSession,
    resetSession,
    // 歷史
    getHistory,
    getPersonalBest,
  };
}
