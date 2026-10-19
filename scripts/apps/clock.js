import { h, icon, on } from "../ui.js";
import {
  clockData,
  saveClock,
  stopwatchElapsed,
  timerRemaining,
  formatElapsed,
} from "../clock-data.js";
const cities = [
  ["Asia/Shanghai", "上海"],
  ["Asia/Tokyo", "东京"],
  ["Asia/Singapore", "新加坡"],
  ["Asia/Dubai", "迪拜"],
  ["Europe/London", "伦敦"],
  ["Europe/Paris", "巴黎"],
  ["America/New_York", "纽约"],
  ["America/Los_Angeles", "洛杉矶"],
  ["Australia/Sydney", "悉尼"],
  ["Pacific/Auckland", "奥克兰"],
];
export function mountClock(ctx) {
  const { root, signal } = ctx;
  let tab = ["world", "stopwatch", "timer"].includes(ctx.data.tab)
      ? ctx.data.tab
      : "world",
    lastSecond = "";
  ctx.setTitle("时钟");
  root.innerHTML = `<div class="app-toolbar clock-toolbar"><span class="spacer"></span><div class="segmented"><button data-clock-tab="world">世界时钟</button><button data-clock-tab="stopwatch">秒表</button><button data-clock-tab="timer">倒计时</button></div><span class="spacer"></span></div><div class="clock-content"></div>`;
  function render() {
    const data = clockData();
    root
      .querySelectorAll("[data-clock-tab]")
      .forEach((b) => b.classList.toggle("active", b.dataset.clockTab === tab));
    const content = root.querySelector(".clock-content");
    if (tab === "world")
      content.innerHTML = `<header class="clock-heading"><h1>世界时钟</h1><button class="icon-button" data-clock="add-zone" aria-label="添加城市">${icon("plus", 22)}</button></header><div class="world-clock-grid">${data.zones.map((zone) => `<article class="world-clock-card" data-zone="${h(zone)}"><button class="clock-remove" data-remove-zone="${h(zone)}" aria-label="移除城市">${icon("close", 12)}</button><h2>${h(cities.find((c) => c[0] === zone)?.[1] || zone)}</h2><div class="analog-clock"><i class="hour-hand"></i><i class="minute-hand"></i><i class="second-hand"></i><b></b><span class="dial-12">12</span><span class="dial-3">3</span><span class="dial-6">6</span><span class="dial-9">9</span></div><strong class="world-digital"></strong><small class="world-date"></small></article>`).join("") || '<p class="muted">添加一座城市，看看那边的时间。</p>'}</div>`;
    if (tab === "stopwatch") {
      const s = data.stopwatch;
      content.innerHTML = `<div class="stopwatch-face"><span>秒表</span><output class="stopwatch-time">${formatElapsed(stopwatchElapsed(s), true)}</output><div class="clock-actions"><button class="clock-secondary" data-clock="${s.running ? "lap" : "reset-stopwatch"}">${s.running ? "计次" : "复位"}</button><button class="clock-primary ${s.running ? "stop" : ""}" data-clock="toggle-stopwatch">${s.running ? "停止" : "开始"}</button></div></div><div class="clock-laps">${s.laps.map((elapsed, i) => `<div><span>第 ${s.laps.length - i} 次</span><b>${formatElapsed(elapsed, true)}</b></div>`).join("")}</div>`;
    }
    if (tab === "timer") {
      const t = data.timer,
        remaining = timerRemaining(t);
      content.innerHTML = `<div class="timer-face"><span>倒计时</span>${t.running || t.finished || remaining !== t.duration ? `<output class="timer-time">${formatElapsed(remaining)}</output><p>${t.finished ? "时间到了，休息一下吧。" : h(t.label)}</p>` : `<div class="timer-inputs"><label><input name="minutes" type="number" min="0" max="240" value="${Math.floor(t.duration / 60000)}" aria-label="倒计时分钟">分钟</label><label><input name="seconds" type="number" min="0" max="59" value="${Math.floor(t.duration / 1000) % 60}" aria-label="倒计时秒数">秒</label></div><input class="timer-name" name="label" maxlength="40" value="${h(t.label)}" aria-label="倒计时名称">`}<div class="clock-actions"><button class="clock-secondary" data-clock="reset-timer">取消</button><button class="clock-primary ${t.running ? "stop" : ""}" data-clock="toggle-timer">${t.running ? "暂停" : t.finished ? "再来一次" : remaining !== t.duration ? "继续" : "开始"}</button></div><small>在此网页打开期间提醒，关闭应用窗口也会继续计时。</small></div>`;
    }
    update(true);
  }
  function update(force = false) {
    const data = clockData();
    if (tab === "stopwatch") {
      const output = root.querySelector(".stopwatch-time");
      if (output)
        output.textContent = formatElapsed(
          stopwatchElapsed(data.stopwatch),
          true,
        );
    }
    if (tab === "timer") {
      const output = root.querySelector(".timer-time");
      if (output)
        output.textContent = formatElapsed(timerRemaining(data.timer));
    }
    if (tab === "world") {
      const second = String(Math.floor(Date.now() / 1000));
      if (!force && second === lastSecond) return;
      lastSecond = second;
      for (const card of root.querySelectorAll("[data-zone]")) {
        const zone = card.dataset.zone,
          now = new Date(),
          parts = new Intl.DateTimeFormat("en-GB", {
            timeZone: zone,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hourCycle: "h23",
          }).formatToParts(now),
          number = (type) =>
            Number(parts.find((p) => p.type === type)?.value || 0),
          hours = number("hour"),
          minutes = number("minute"),
          seconds = number("second");
        card.classList.toggle("night", hours < 6 || hours >= 18);
        card.querySelector(".hour-hand").style.rotate =
          `${(hours % 12) * 30 + minutes * 0.5}deg`;
        card.querySelector(".minute-hand").style.rotate =
          `${minutes * 6 + seconds * 0.1}deg`;
        card.querySelector(".second-hand").style.rotate = `${seconds * 6}deg`;
        card.querySelector(".world-digital").textContent =
          now.toLocaleTimeString("zh-CN", {
            timeZone: zone,
            hour: "2-digit",
            minute: "2-digit",
          });
        card.querySelector(".world-date").textContent = now.toLocaleDateString(
          "zh-CN",
          { timeZone: zone, month: "long", day: "numeric", weekday: "short" },
        );
      }
    }
  }
  on(
    root,
    "click",
    "[data-clock-tab]",
    (e, b) => {
      tab = b.dataset.clockTab;
      render();
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-remove-zone]",
    (e, b) => {
      const d = clockData();
      d.zones = d.zones.filter((z) => z !== b.dataset.removeZone);
      saveClock(d);
      render();
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-clock]",
    (e, b) => {
      const action = b.dataset.clock,
        data = clockData();
      if (action === "add-zone") {
        ctx.menu(
          cities
            .filter((c) => !data.zones.includes(c[0]))
            .map(([zone, name]) => ({
              label: name,
              action: () => {
                const d = clockData();
                d.zones.push(zone);
                saveClock(d);
                render();
              },
            })),
          b,
        );
        return;
      }
      if (action === "toggle-stopwatch") {
        const s = data.stopwatch;
        if (s.running) {
          s.elapsed = stopwatchElapsed(s);
          s.running = false;
        } else {
          s.running = true;
          s.startedAt = Date.now();
        }
      }
      if (action === "lap") {
        data.stopwatch.laps.unshift(stopwatchElapsed(data.stopwatch));
        data.stopwatch.laps = data.stopwatch.laps.slice(0, 100);
      }
      if (action === "reset-stopwatch")
        data.stopwatch = { running: false, startedAt: 0, elapsed: 0, laps: [] };
      if (action === "toggle-timer") {
        const t = data.timer;
        if (t.running) {
          t.remaining = timerRemaining(t);
          t.running = false;
        } else {
          const minutes = root.querySelector("[name=minutes]"),
            seconds = root.querySelector("[name=seconds]");
          if (minutes) {
            if (!minutes.reportValidity() || !seconds.reportValidity()) return;
            t.duration =
              (Number(minutes.value) * 60 + Number(seconds.value)) * 1000;
            t.remaining = t.duration;
            t.label =
              root.querySelector("[name=label]").value.trim() || "倒计时";
          }
          if (t.finished) {
            t.remaining = t.duration;
            t.finished = false;
          }
          if (t.remaining <= 0) {
            ctx.toast("设置一个大于零的时间");
            return;
          }
          t.deadline = Date.now() + t.remaining;
          t.running = true;
        }
      }
      if (action === "reset-timer") {
        data.timer.running = false;
        data.timer.remaining = data.timer.duration;
        data.timer.finished = false;
      }
      saveClock(data);
      render();
    },
    signal,
  );
  const timer = setInterval(() => update(), 100);
  window.addEventListener(
    "lozic:storage",
    (e) => {
      if (
        e.detail.key === "clock" &&
        clockData().timer.finished &&
        tab === "timer"
      )
        render();
    },
    { signal },
  );
  render();
  return {
    receive(data) {
      if (["world", "stopwatch", "timer"].includes(data.tab)) {
        tab = data.tab;
        render();
      }
    },
    dispose: () => clearInterval(timer),
  };
}
