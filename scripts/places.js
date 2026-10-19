import { mapConfig, personalPlaces } from "./config.js";
import { store, clamp } from "./ui.js";
export function validCoordinates(lat, lon) {
  return (
    typeof lat === "number" &&
    typeof lon === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    Math.abs(Number(lat)) <= 85 &&
    Math.abs(Number(lon)) <= 180
  );
}
export function normalizePlace(feature) {
  const p = feature?.properties || {},
    coordinates = feature?.geometry?.coordinates;
  if (!coordinates || !validCoordinates(coordinates[1], coordinates[0]))
    return null;
  const name = String(
    p.name || p.street || p.city || p.country || "未命名地点",
  ).slice(0, 150);
  return {
    id: `${p.osm_type || "place"}-${p.osm_id || coordinates.join(",")}`,
    name,
    lat: Number(coordinates[1]),
    lon: Number(coordinates[0]),
    address: [
      ...new Set(
        [p.street, p.housenumber, p.city, p.state, p.country].filter(Boolean),
      ),
    ].join(" · "),
    category: "收藏",
  };
}
export function mapURL(place, scale = 1) {
  const center = place && validCoordinates(place.lat, place.lon) ? place : null;
  const span = center ? clamp(Number(scale) || 1, 0.03, 160) * 0.035 : 175;
  const lat = center?.lat || 0,
    lon = center?.lon || 0;
  const box = [
    clamp(lon - span, -180, 180),
    clamp(lat - span * 0.65, -85, 85),
    clamp(lon + span, -180, 180),
    clamp(lat + span * 0.65, -85, 85),
  ].join(",");
  const params = new URLSearchParams({ bbox: box, layer: "mapnik" });
  if (center) params.set("marker", `${lat},${lon}`);
  return `https://www.openstreetmap.org/export/embed.html?${params}`;
}
export function placeURL(place) {
  return `https://www.openstreetmap.org/?mlat=${encodeURIComponent(place.lat)}&mlon=${encodeURIComponent(place.lon)}#map=16/${place.lat}/${place.lon}`;
}
export function allPlaces() {
  return [
    ...personalPlaces.map((p) => ({ ...p, public: true })),
    ...store.get("mapFavorites", []),
  ];
}
let lastSearch = 0;
export async function searchPlaces(query, signal) {
  const q = query.trim().slice(0, 160),
    cache = store.get("mapSearchCache", []),
    cached = cache.find((c) => c.query === q && Date.now() - c.time < 86400000);
  if (cached) return cached.results;
  if (q.length < 2) return [];
  if (Date.now() - lastSearch < 1200) throw new Error("请稍等片刻再搜索。");
  lastSearch = Date.now();
  const url = new URL(mapConfig.searchURL);
  url.search = new URLSearchParams({ q, limit: String(mapConfig.resultLimit) });
  const response = await fetch(url, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(12000)]),
  });
  if (!response.ok) throw new Error("地点查询暂时不可用，请稍后重试。");
  const data = await response.json(),
    results = (data.features || []).map(normalizePlace).filter(Boolean);
  store.set(
    "mapSearchCache",
    [
      { query: q, time: Date.now(), results },
      ...cache.filter((c) => c.query !== q),
    ].slice(0, 20),
  );
  return results;
}
