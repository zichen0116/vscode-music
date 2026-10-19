import { Desktop } from "./desktop.js";
import { mountCode } from "./apps/vscode.js";
import { mountQQ } from "./apps/qq.js";
import { mountMessages, mountFaceTime } from "./apps/messages.js";
import { guestbook, commentText } from "./guestbook.js";
import { mountSafari } from "./apps/safari.js";
import { mountCalculator, mountTerminal } from "./apps/tools.js";
import { mountMail } from "./apps/mail.js";
import { mountGitHub } from "./apps/github.js";
import { mountContacts, mountPhone, mountSettings } from "./apps/personal.js";
import { mountFinder, mountPhotos } from "./apps/files.js";
import { mountNotes } from "./apps/notes.js";
import { mountReminders } from "./apps/reminders.js";
import { mountMaps } from "./apps/maps.js";
import { mountAppStore } from "./apps/appstore.js";
import { mountClock } from "./apps/clock.js";
import { mountStickies, mountDesktopStickies } from "./apps/stickies.js";
import {
  reminderData,
  saveReminderData,
  dueTimestamp,
} from "./reminders-data.js";
import { clockData, saveClock, timerRemaining } from "./clock-data.js";
import { mountCalendar } from "./apps/calendar.js";
import { mountWeather } from "./apps/weather.js";
import { weather, weatherDescription } from "./weather.js";
import { mountTrash } from "./apps/trash.js";
const registry = {
  vscode: mountCode,
  qq: mountQQ,
  messages: mountMessages,
  facetime: mountFaceTime,
  safari: mountSafari,
  calculator: mountCalculator,
  terminal: mountTerminal,
  gmail: (ctx) => mountMail(ctx, "gmail"),
  netease: (ctx) => mountMail(ctx, "netease"),
  github: mountGitHub,
  contacts: mountContacts,
  phone: mountPhone,
  settings: mountSettings,
  finder: mountFinder,
  notes: mountNotes,
  photos: mountPhotos,
  calendar: mountCalendar,
  weather: mountWeather,
  reminders: mountReminders,
  maps: mountMaps,
  appstore: mountAppStore,
  clock: mountClock,
  stickies: mountStickies,
};
registry.trash = mountTrash;
const desktop = new Desktop(registry);
mountDesktopStickies(desktop);
const reminderStartedAt = Date.now();
const notifiedReminders = new Set();
let notifiedTimerDeadline = null;
function checkLocalReminders() {
  const data = reminderData(),
    now = Date.now();
  let changed = false;
  for (const item of data.items) {
    const due = dueTimestamp(item);
    if (
      !item.deleted &&
      !item.completed &&
      !item.notifiedAt &&
      !notifiedReminders.has(`${item.id}:${due}`) &&
      due !== null &&
      due >= reminderStartedAt &&
      due <= now
    ) {
      item.notifiedAt = now;
      notifiedReminders.add(`${item.id}:${due}`);
      changed = true;
      desktop.notify("提醒事项", item.title, () =>
        desktop.open("reminders", { editId: item.id }),
      );
    }
  }
  if (changed) {
    try {
      saveReminderData(data);
    } catch (error) {
      desktop.toast("提醒记录未能保存", error.message);
    }
  }
  desktop.updateReminders?.();
}
function checkTimer() {
  const data = clockData();
  if (
    data.timer.running &&
    timerRemaining(data.timer) <= 0 &&
    data.timer.deadline !== notifiedTimerDeadline
  ) {
    notifiedTimerDeadline = data.timer.deadline;
    data.timer.running = false;
    data.timer.finished = true;
    data.timer.remaining = 0;
    saveClock(data);
    desktop.notify("时间到了", data.timer.label || "倒计时已结束", () =>
      desktop.open("clock", { tab: "timer" }),
    );
  }
}
setInterval(checkLocalReminders, 30000);
setInterval(checkTimer, 1000);
window.addEventListener("lozic:storage", (e) => {
  if (e.detail.key === "reminders") {
    desktop.updateReminders?.();
    desktop.updateTrash();
  }
  if (e.detail.key === "stickies") desktop.updateTrash();
});
checkLocalReminders();
checkTimer();
guestbook.addEventListener("newmessage", (e) => {
  const { root, record } = e.detail;
  desktop.notify(
    `${record.nick} 留下了一句话`,
    commentText(record).slice(0, 60),
    () => desktop.open("messages", { conversationId: root.objectId }),
  );
});
guestbook.addEventListener("change", () => {
  desktop.unread = guestbook.unreadCount;
  desktop.renderDock();
});
function updateWeatherWidget() {
  const el = document.querySelector(".widget-weather");
  if (!el || !weather.city) return;
  el.querySelector(".weather-widget-top>span").textContent = weather.city.name;
  el.querySelector(".weather-temperature").textContent = weather.data
    ? `${Math.round(weather.data.current.temperature_2m)}°`
    : "—°";
  el.querySelector(".weather-widget-bottom>b").textContent = weather.data
    ? weatherDescription(weather.data.current.weather_code)
    : "正在获取天气";
  el.querySelector(".weather-widget-bottom>span").textContent = weather.error
    ? "显示缓存 · 点开重试"
    : weather.updated
      ? `更新于 ${new Date(weather.updated).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`
      : "选择一座城市";
}
weather.addEventListener("change", updateWeatherWidget);
desktop.addEventListener("widgets", updateWeatherWidget);
updateWeatherWidget();
if (weather.city) weather.refresh();
