/**
 * 練習 Session 管理 Hook（API 版）
 *
 * 成績透過 /api/history 存到伺服器端 SQLite，跨裝置同步。
 */

// eslint-disable-next-line no-unused-vars
function useSession(profileId) {
  const { useState, useCallback, useRef } = React;

  const timer = useTimer();
  const [config, setConfig] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [sessionResult, setSessionResult] = useState(null);
  const questionStartRef = useRef(null);
  const reviewPoolRef = useRef(null); // 錯題練習題庫

  const nextQuestion = useCallback((operation, level) => {
    const q = QuestionGenerator.generate(operation, level);
    setCurrentQuestion(q);
    questionStartRef.current = Date.now();
    return q;
  }, []);

  // 錯題練習：從題庫取下一題
  const nextReviewQuestion = useCallback((pool, index) => {
    // 循環出題：做完一輪重新打散再來
    const idx = index % pool.length;
    if (idx === 0 && index > 0) {
      // 重新打散
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
    }
    const src = pool[idx];
    const q = {
      display: src.display,
      answer: src.answer,
      operation: src.operation,
      level: src.level,
    };
    setCurrentQuestion(q);
    questionStartRef.current = Date.now();
    return q;
  }, []);

  const startSession = useCallback((operation, level, mode, value) => {
    const cfg = { operation, level, mode, value };
    reviewPoolRef.current = null;
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

  // 錯題練習模式：sprint，題數 = 題庫大小
  const startReviewSession = useCallback((pool) => {
    if (!pool || pool.length === 0) return;
    reviewPoolRef.current = pool;
    const cfg = { operation: "review", level: 0, mode: "sprint", value: pool.length, isReview: true };
    setConfig(cfg);
    setQuestionIndex(0);
    setCorrectCount(0);
    setAnswers([]);
    setFeedback(null);
    setSessionResult(null);
    timer.startSprint(pool.length, null);
    nextReviewQuestion(pool, 0);
    setQuestionIndex(1);
  }, [timer, nextReviewQuestion]);

  const submitAnswer = useCallback((userAnswer) => {
    if (!currentQuestion || !config || timer.isFinished) return null;
    const timeMs = Date.now() - (questionStartRef.current || Date.now());
    const numAnswer = parseInt(userAnswer, 10);
    const correct = numAnswer === currentQuestion.answer;
    const record = { question: currentQuestion, userAnswer: numAnswer, correct, timeMs };
    const newAnswers = [...answers, record];
    setAnswers(newAnswers);
    const newCorrectCount = correct ? correctCount + 1 : correctCount;
    if (correct) setCorrectCount(newCorrectCount);
    const fb = { type: correct ? "correct" : "wrong", correctAnswer: currentQuestion.answer };
    setFeedback(fb);
    const newIndex = questionIndex + 1;

    if (config.mode === "sprint" && newAnswers.length >= config.value) {
      timer.finishSprint();
      const result = buildResult(newAnswers, newCorrectCount, config, timer.elapsedSeconds);
      setSessionResult(result);
      if (config.isReview) saveReviewToServer(newAnswers);
      else saveToServer(result, newAnswers);
      return { feedback: fb, finished: true, result };
    }
    if (config.mode === "timeAttack" && timer.isFinished) {
      const result = buildResult(newAnswers, newCorrectCount, config, timer.totalSeconds);
      setSessionResult(result);
      if (config.isReview) saveReviewToServer(newAnswers);
      else saveToServer(result, newAnswers);
      return { feedback: fb, finished: true, result };
    }
    setTimeout(() => {
      setFeedback(null);
      if (reviewPoolRef.current) {
        nextReviewQuestion(reviewPoolRef.current, newIndex - 1);
      } else {
        nextQuestion(config.operation, config.level);
      }
      setQuestionIndex(newIndex);
    }, correct ? 300 : 1000);
    return { feedback: fb, finished: false };
  }, [currentQuestion, config, timer, answers, correctCount, questionIndex, nextQuestion, nextReviewQuestion, profileId]);

  const finalizeTimeAttack = useCallback(() => {
    if (!config || sessionResult) return;
    const result = buildResult(answers, correctCount, config, config.value * 60);
    setSessionResult(result);
    if (config.isReview) saveReviewToServer(answers);
    else saveToServer(result, answers);
  }, [config, answers, correctCount, sessionResult, profileId]);

  React.useEffect(() => {
    if (timer.isFinished && config?.mode === "timeAttack" && !sessionResult) {
      finalizeTimeAttack();
    }
  }, [timer.isFinished, config, sessionResult, finalizeTimeAttack]);

  const MAX_QUESTION_MS = 120000; // 單題超過 2 分鐘不計入練習時間

  function buildResult(answerList, correct, cfg, totalSecs) {
    const total = answerList.length;
    const accuracy = total > 0 ? (correct / total) * 100 : 0;
    const avgTimeMs = total > 0 ? answerList.reduce((s, a) => s + a.timeMs, 0) / total : 0;
    const fastestMs = total > 0 ? Math.min(...answerList.map((a) => a.timeMs)) : 0;
    // 練習時間：每題 min(實際作答時間, 2分鐘) 的總和
    const practiceTimeMs = answerList.reduce((s, a) => s + Math.min(a.timeMs, MAX_QUESTION_MS), 0);
    return {
      operation: cfg.operation, level: cfg.level, mode: cfg.mode,
      modeValue: cfg.value, totalQuestions: total, correctCount: correct,
      accuracy: Math.round(accuracy * 10) / 10, totalSeconds: totalSecs,
      avgTimeMs: Math.round(avgTimeMs), fastestMs, practiceTimeMs,
      timestamp: Date.now(), isReview: !!cfg.isReview,
    };
  }

  function saveToServer(result, answerList) {
    if (!profileId || result.totalQuestions === 0) return;
    fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile_id: profileId,
        operation: result.operation,
        level: result.level,
        mode: result.mode,
        mode_value: result.modeValue,
        total_questions: result.totalQuestions,
        correct_count: result.correctCount,
        accuracy: result.accuracy,
        total_seconds: result.totalSeconds,
        avg_time_ms: result.avgTimeMs,
        fastest_ms: result.fastestMs,
        timestamp: result.timestamp,
        practice_time_ms: result.practiceTimeMs || 0,
        answers: (answerList || []).map(a => ({
          question_display: a.question.display,
          correct_answer: a.question.answer,
          user_answer: a.userAnswer,
          correct: a.correct,
          time_ms: a.timeMs,
        })),
      }),
    }).catch(() => {});
  }

  function saveReviewToServer(answerList) {
    if (!profileId || !answerList || answerList.length === 0) return;
    fetch("/api/review-results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile_id: profileId,
        timestamp: Date.now(),
        answers: answerList.map(a => ({
          question_display: a.question.display,
          correct_answer: a.question.answer,
          user_answer: a.userAnswer,
          correct: a.correct,
          time_ms: a.timeMs,
        })),
      }),
    }).catch(() => {});
  }

  // API-based history queries
  function getPersonalBest(operation, level, mode) {
    // 同步版：從快取中拿（由 App 預先載入）
    return null; // ResultScreen 會自己用 async 版
  }

  const quitSession = useCallback(() => {
    if (!config) return;
    const totalSecs = config.mode === "timeAttack"
      ? (config.value * 60) - timer.remainingSeconds
      : timer.elapsedSeconds;
    timer.pause();
    const result = buildResult(answers, correctCount, config, totalSecs);
    result.incomplete = true; // 標記為未完成，不列入排行榜
    setSessionResult(result);
    // 未完成的不儲存到伺服器
  }, [config, timer, answers, correctCount, profileId]);

  const resetSession = useCallback(() => {
    timer.reset();
    reviewPoolRef.current = null;
    setConfig(null);
    setCurrentQuestion(null);
    setQuestionIndex(0);
    setCorrectCount(0);
    setAnswers([]);
    setFeedback(null);
    setSessionResult(null);
  }, [timer]);

  return {
    config, currentQuestion, questionIndex, correctCount,
    totalAnswered: answers.length, feedback, sessionResult, timer,
    startSession, startReviewSession, submitAnswer, quitSession, resetSession,
  };
}
