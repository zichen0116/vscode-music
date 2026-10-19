import { store } from "./ui.js";
export function clockData() {
  return store.get("clock", {
    zones: ["Asia/Shanghai", "Europe/London", "America/New_York"],
    stopwatch: { running: false, startedAt: 0, elapsed: 0, laps: [] },
    timer: {
      running: false,
      duration: 300000,
      remaining: 300000,
      deadline: 0,
      label: "倒计时",
      finished: false,
    },
  });
}
export function stopwatchElapsed(stopwatch, now = Date.now()) {
  return Math.max(
    0,
    (stopwatch.elapsed || 0) +
      (stopwatch.running ? now - stopwatch.startedAt : 0),
  );
}
export function timerRemaining(timer, now = Date.now()) {
  return Math.max(
    0,
    timer.running ? timer.deadline - now : timer.remaining || 0,
  );
}
export function formatElapsed(ms, precise = false) {
  const seconds = Math.floor(Math.max(0, ms) / 1000),
    base = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  return precise
    ? `${base}.${String(Math.floor((ms % 1000) / 10)).padStart(2, "0")}`
    : base;
}
export function saveClock(data) {
  return store.set("clock", data);
}
