import { weather, weatherDescription, weatherSymbol } from "../weather.js";
import { h, icon, on, timeLabel, empty } from "../ui.js";

export function mountWeather(ctx) {
  const { root, signal } = ctx;
  let results = [],
    searchGeneration = 0;
  ctx.setTitle("天气");
  root.innerHTML = `<div class="weather-app"><aside class="weather-sidebar"><form class="weather-search"><label class="search-field">${icon("search", 15)}<input placeholder="搜索城市" aria-label="搜索城市" required minlength="2"></label><button type="submit" class="icon-button" aria-label="查找城市">${icon("plus", 19)}</button></form><div class="weather-search-results"></div><div class="weather-cities"></div><div class="weather-sidebar-bottom">天气数据由 <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a> 提供</div></aside><section class="weather-main"></section></div>`;
  function render() {
    root.querySelector(".weather-cities").innerHTML = weather.cities
      .map(
        (c) =>
          `<button class="weather-city ${c.id === weather.city?.id ? "selected" : ""}" data-city="${c.id}"><b>${h(c.name)}</b><small>${h(c.country || "")}</small></button>`,
      )
      .join("");
    const main = root.querySelector(".weather-main");
    if (!weather.city) {
      main.innerHTML = `<div class="weather-first">${icon("sun", 75)}<h1>你那边，天气怎么样？</h1><p>选一座城市，看看今天的天空。<br>桌面小组件也会同步更新。</p><div>${["上海", "北京", "杭州", "深圳"].map((c) => `<button data-search-city="${c}">${c}</button>`).join("")}</div><small>不会自动获取你的位置。</small></div>`;
      return;
    }
    if (!weather.data) {
      main.innerHTML =
        empty(
          weather.loading ? "正在看向天空…" : "天气暂不可用",
          weather.error || weather.city.name,
          "cloud",
        ) +
        `<button class="mac-button weather-retry" data-weather="refresh">重新获取</button>`;
      return;
    }
    const d = weather.data,
      c = d.current,
      code = c.weather_code;
    root.querySelector(".weather-app").dataset.sky = c.is_day ? "day" : "night";
    const hourIndex = d.hourly.time.findIndex(
      (t) => t >= c.time.slice(0, 13) + ":00",
    );
    const start = Math.max(0, hourIndex);
    main.innerHTML = `<header class="weather-hero"><button class="icon-button" data-weather="refresh" aria-label="刷新天气">${icon("refresh", 18)}</button><h1>${h(weather.city.name)}</h1><strong>${Math.round(c.temperature_2m)}°</strong><span>${weatherDescription(code)}</span><p>最高 ${Math.round(d.daily.temperature_2m_max[0])}°　最低 ${Math.round(d.daily.temperature_2m_min[0])}°</p><small>${weather.loading ? "正在更新…" : `更新于 ${timeLabel(weather.updated)}`}${weather.error ? ` · ${h(weather.error)}` : ""}</small></header><div class="weather-detail-grid"><section class="weather-card weather-hourly"><h3>${icon("history", 13)} 逐小时天气</h3><div>${d.hourly.time
      .slice(start, start + 12)
      .map(
        (time, index) =>
          `<div><span>${index === 0 ? "现在" : time.slice(11, 13) + "时"}</span>${icon(weatherSymbol(d.hourly.weather_code[start + index], Number(time.slice(11, 13)) >= 6 && Number(time.slice(11, 13)) < 18), 24)}<b>${Math.round(d.hourly.temperature_2m[start + index])}°</b></div>`,
      )
      .join(
        "",
      )}</div></section><section class="weather-card weather-daily"><h3>${icon("calendar", 13)} 7 日天气预报</h3>${d.daily.time.map((date, index) => `<div><b>${index === 0 ? "今天" : new Date(date + "T12:00:00").toLocaleDateString("zh-CN", { weekday: "short" })}</b>${icon(weatherSymbol(d.daily.weather_code[index]), 20)}<span>${Math.round(d.daily.temperature_2m_min[index])}°</span><i></i><strong>${Math.round(d.daily.temperature_2m_max[index])}°</strong></div>`).join("")}</section><section class="weather-card weather-metric"><h3>相对湿度</h3><strong>${c.relative_humidity_2m}<small>%</small></strong><p>当前空气湿度</p></section><section class="weather-card weather-metric"><h3>风速</h3><strong>${Math.round(c.wind_speed_10m)}<small> km/h</small></strong><p>距离地面 10 米</p></section><section class="weather-card weather-metric"><h3>日落</h3><strong>${d.daily.sunset[0].slice(11, 16)}</strong><p>日出 ${d.daily.sunrise[0].slice(11, 16)}</p></section></div><div class="weather-attribution">${h(weather.city.country || "")} · ${h(d.timezone)} · <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a></div>`;
  }
  async function search(query) {
    const generation = ++searchGeneration,
      out = root.querySelector(".weather-search-results");
    out.innerHTML = "<p>正在搜索…</p>";
    try {
      results = await weather.search(query);
      if (signal.aborted || generation !== searchGeneration) return;
      out.innerHTML =
        results
          .map(
            (c, i) =>
              `<button data-result-city="${i}"><b>${h(c.name)}</b><span>${h([c.admin1, c.country].filter(Boolean).join(" · "))}</span></button>`,
          )
          .join("") || "<p>没有找到城市，试试其他名称。</p>";
    } catch (e) {
      if (!signal.aborted && generation === searchGeneration)
        out.innerHTML = `<p>${h(e.message || "城市搜索暂不可用")}</p>`;
    }
  }
  root.querySelector("form").addEventListener(
    "submit",
    (e) => {
      e.preventDefault();
      search(root.querySelector("input").value.trim());
    },
    { signal },
  );
  on(
    root,
    "click",
    "[data-search-city]",
    (e, b) => {
      root.querySelector("input").value = b.dataset.searchCity;
      search(b.dataset.searchCity);
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-result-city]",
    (e, b) => {
      weather.select(results[Number(b.dataset.resultCity)]);
      root.querySelector(".weather-search-results").replaceChildren();
      root.querySelector("input").value = "";
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-city]",
    (e, b) =>
      weather.select(
        weather.cities.find((c) => String(c.id) === b.dataset.city),
      ),
    signal,
  );
  on(root, "click", "[data-weather]", () => weather.refresh(), signal);
  weather.addEventListener("change", render, { signal });
  render();
  if (weather.city && !weather.loading) weather.refresh();
  return {};
}
