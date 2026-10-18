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
import { mountFinder, mountNotes, mountPhotos } from "./apps/files.js";
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
};
registry.trash = mountTrash;
const desktop = new Desktop(registry);
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
