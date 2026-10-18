import { store } from "./ui.js";
export function weatherDescription(code) {
  if (code === 0) return "晴";
  if (code === 1) return "大部晴朗";
  if (code === 2) return "局部多云";
  if (code === 3) return "阴";
  if ([45, 48].includes(code)) return "有雾";
  if (code >= 51 && code <= 57) return "毛毛雨";
  if (code >= 61 && code <= 67) return "雨";
  if (code >= 71 && code <= 77) return "雪";
  if (code >= 80 && code <= 82) return "阵雨";
  if (code >= 85 && code <= 86) return "阵雪";
  if (code >= 95) return "雷雨";
  return "天气更新中";
}
export function weatherSymbol(code, isDay = true) {
  return code === 0 || code === 1
    ? isDay
      ? "sun"
      : "moon"
    : code >= 51
      ? "rain"
      : "cloud";
}
class Weather extends EventTarget {
  constructor() {
    super();
    this.cities = store.get("weatherCities", []);
    this.city = store.get("weatherCity", null);
    this.cache = store.get("weatherCache", {});
    this.data = this.city ? this.cache[this.city.id]?.data : null;
    this.updated = this.city ? this.cache[this.city.id]?.time : null;
    this.error = "";
    this.loading = false;
    this.generation = 0;
  }
  emit() {
    this.dispatchEvent(new Event("change"));
  }
  async search(query) {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?${new URLSearchParams({ name: query, count: "8", language: "zh", format: "json" })}`,
      { signal: AbortSignal.timeout(12000) },
    );
    if (!response.ok) throw new Error("暂时无法搜索城市，请稍后再试。");
    const data = await response.json();
    return data.results || [];
  }
  select(city) {
    this.city = {
      id: city.id,
      name: city.name,
      latitude: city.latitude,
      longitude: city.longitude,
      country: city.country,
      admin1: city.admin1,
    };
    if (!this.cities.some((c) => c.id === city.id)) this.cities.push(this.city);
    store.set("weatherCity", this.city);
    store.set("weatherCities", this.cities);
    this.data = this.cache[city.id]?.data;
    this.updated = this.cache[city.id]?.time;
    this.refresh();
  }
  async refresh() {
    if (!this.city) return;
    const generation = ++this.generation,
      city = this.city;
    this.loading = true;
    this.error = "";
    this.emit();
    try {
      const params = new URLSearchParams({
        latitude: String(city.latitude),
        longitude: String(city.longitude),
        current:
          "temperature_2m,relative_humidity_2m,is_day,weather_code,wind_speed_10m",
        hourly: "temperature_2m,weather_code",
        daily:
          "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset",
        forecast_days: "7",
        timezone: "auto",
      });
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?${params}`,
        { signal: AbortSignal.timeout(15000) },
      );
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (generation !== this.generation) return;
      if (!data.current || !data.daily || !data.hourly) throw new Error();
      this.data = data;
      this.updated = Date.now();
      this.cache[city.id] = { data, time: this.updated };
      store.set("weatherCache", this.cache);
    } catch {
      if (generation === this.generation)
        this.error = this.data
          ? "更新失败，显示上次获取的天气。"
          : "暂时无法获取天气，请重试。";
    } finally {
      if (generation === this.generation) {
        this.loading = false;
        this.emit();
      }
    }
  }
}
export const weather = new Weather();
