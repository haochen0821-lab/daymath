/**
 * 雙重計時器 Hook
 *
 * 模式一：限時挑戰 (timeAttack) — 倒數計時，時間到自動結束
 * 模式二：定額衝刺 (sprint)     — 正計時，手動或達標時結束
 */

// eslint-disable-next-line no-unused-vars
function useTimer() {
  const { useState, useRef, useCallback, useEffect } = React;

  // --- 狀態 ---
  const [mode, setMode] = useState(null);            // 'timeAttack' | 'sprint' | null
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  // 限時挑戰：剩餘秒數
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  // 定額衝刺：已用秒數
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  // 限時挑戰的總秒數（用於計算進度百分比）
  const [totalSeconds, setTotalSeconds] = useState(0);

  const intervalRef = useRef(null);
  const onFinishRef = useRef(null);

  // --- 清除 interval ---
  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // --- 限時挑戰：倒數計時 ---
  const startTimeAttack = useCallback((minutes, onFinish) => {
    clearTimer();
    const secs = minutes * 60;
    setMode("timeAttack");
    setTotalSeconds(secs);
    setRemainingSeconds(secs);
    setElapsedSeconds(0);
    setIsFinished(false);
    setIsRunning(true);
    onFinishRef.current = onFinish || null;

    const startTime = Date.now();

    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, secs - elapsed);

      setRemainingSeconds(remaining);
      setElapsedSeconds(elapsed);

      if (remaining <= 0) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setIsRunning(false);
        setIsFinished(true);
        if (onFinishRef.current) onFinishRef.current();
      }
    }, 200); // 200ms 精度足夠，且省電
  }, [clearTimer]);

  // --- 定額衝刺：正計時 ---
  const startSprint = useCallback((targetCount, onFinish) => {
    clearTimer();
    setMode("sprint");
    setTotalSeconds(0);
    setRemainingSeconds(0);
    setElapsedSeconds(0);
    setIsFinished(false);
    setIsRunning(true);
    onFinishRef.current = onFinish || null;

    const startTime = Date.now();

    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSeconds(elapsed);
    }, 200);
  }, [clearTimer]);

  // --- 定額衝刺專用：外部呼叫以結束計時 ---
  const finishSprint = useCallback(() => {
    if (mode !== "sprint" || !isRunning) return;
    clearTimer();
    setIsRunning(false);
    setIsFinished(true);
    if (onFinishRef.current) onFinishRef.current();
  }, [mode, isRunning, clearTimer]);

  // --- 暫停 / 繼續 ---
  const pause = useCallback(() => {
    if (!isRunning) return;
    clearTimer();
    setIsRunning(false);
  }, [isRunning, clearTimer]);

  const resume = useCallback(() => {
    if (isRunning || isFinished) return;

    if (mode === "timeAttack") {
      const remaining = remainingSeconds;
      setIsRunning(true);
      const startTime = Date.now();
      const baseElapsed = elapsedSeconds;

      intervalRef.current = setInterval(() => {
        const delta = Math.floor((Date.now() - startTime) / 1000);
        const newRemaining = Math.max(0, remaining - delta);

        setRemainingSeconds(newRemaining);
        setElapsedSeconds(baseElapsed + delta);

        if (newRemaining <= 0) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setIsRunning(false);
          setIsFinished(true);
          if (onFinishRef.current) onFinishRef.current();
        }
      }, 200);
    } else if (mode === "sprint") {
      setIsRunning(true);
      const startTime = Date.now();
      const baseElapsed = elapsedSeconds;

      intervalRef.current = setInterval(() => {
        const delta = Math.floor((Date.now() - startTime) / 1000);
        setElapsedSeconds(baseElapsed + delta);
      }, 200);
    }
  }, [isRunning, isFinished, mode, remainingSeconds, elapsedSeconds, clearTimer]);

  // --- 重置 ---
  const reset = useCallback(() => {
    clearTimer();
    setMode(null);
    setIsRunning(false);
    setIsFinished(false);
    setRemainingSeconds(0);
    setElapsedSeconds(0);
    setTotalSeconds(0);
    onFinishRef.current = null;
  }, [clearTimer]);

  // --- 格式化顯示 ---
  const formatTime = useCallback((totalSecs) => {
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, []);

  // 取得目前顯示用的時間字串
  const displayTime = mode === "timeAttack"
    ? formatTime(remainingSeconds)
    : formatTime(elapsedSeconds);

  // 倒數進度百分比（限時挑戰用）
  const progress = mode === "timeAttack" && totalSeconds > 0
    ? (remainingSeconds / totalSeconds) * 100
    : 0;

  // --- cleanup ---
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  return {
    // 狀態
    mode,
    isRunning,
    isFinished,
    remainingSeconds,
    elapsedSeconds,
    totalSeconds,
    displayTime,
    progress,
    // 操作
    startTimeAttack,
    startSprint,
    finishSprint,
    pause,
    resume,
    reset,
    formatTime,
  };
}
