export const h = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(`lozic:${key}`);
      return v === null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(`lozic:${key}`, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(`lozic:${key}`);
    } catch {}
  },
};
export function on(root, event, selector, handler, signal) {
  root.addEventListener(
    event,
    (e) => {
      const target = e.target.closest(selector);
      if (target && root.contains(target)) handler(e, target);
    },
    { signal },
  );
}
export function listen(target, event, fn, signal) {
  target.addEventListener(event, fn, { signal });
}
export function safeURL(value, base) {
  try {
    const url = new URL(value, base);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
export function external(url) {
  const safe = safeURL(url);
  if (safe) window.open(safe, "_blank", "noopener,noreferrer");
}
export async function copy(text) {
  try {
    await navigator.clipboard.writeText(String(text));
    return true;
  } catch {
    const input = document.createElement("textarea");
    input.value = text;
    input.style.cssText = "position:fixed;left:-9999px";
    document.body.append(input);
    input.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {}
    input.remove();
    return ok;
  }
}
export function download(name, content, type = "text/plain;charset=utf-8") {
  const blob =
    content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function timeLabel(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleString("zh-CN", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}
export function duration(seconds = 0) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}
export function uid() {
  return (
    globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}
export const empty = (title, text, symbol = "tray") =>
  `<div class="empty-state">${icon(symbol, 44)}<h2>${h(title)}</h2><p>${h(text)}</p></div>`;
export function button(name, label, extra = "") {
  return `<button type="button" class="icon-button" data-action="${h(name)}" title="${h(label)}" aria-label="${h(label)}" ${extra}>${icon(name)}</button>`;
}
const paths = {
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  back: '<path d="m15 5-7 7 7 7"/>',
  forward: '<path d="m9 5 7 7-7 7"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  refresh: '<path d="M20 8a8 8 0 1 0 0 8M20 3v5h-5"/>',
  share: '<path d="M8 8H5v13h14V8h-3M12 15V2m-4 4 4-4 4 4"/>',
  external: '<path d="M14 3h7v7m0-7L10 14M10 3H3v18h18v-7"/>',
  sidebar:
    '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16M5.5 8h1M5.5 11h1"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h1M3 12h1M3 18h1"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  edit: '<path d="m15 4 5 5M4 16l-1 5 5-1L21 7a3.5 3.5 0 0 0-5-5ZM12 4H4v8"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
  folder:
    '<path d="M3 7V4h7l2 3h9v13H3Z" fill="currentColor" fill-opacity=".15"/>',
  file: '<path d="M5 2h9l5 5v15H5ZM14 2v6h5M8 12h8M8 16h8"/>',
  music:
    '<path d="M9 18V5l12-3v13M9 8l12-3"/><ellipse cx="5.5" cy="18.5" rx="3.5" ry="2.5"/><ellipse cx="17.5" cy="15.5" rx="3.5" ry="2.5"/>',
  play: '<path d="m7 4 14 8-14 8Z" fill="currentColor" stroke="none"/>',
  pause:
    '<path d="M6 4h4v16H6ZM14 4h4v16h-4Z" fill="currentColor" stroke="none"/>',
  volume:
    '<path d="m11 4-6 5H2v6h3l6 5ZM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
  moon: '<path d="M20 15A8 8 0 0 1 9 4a9 9 0 1 0 11 11Z"/>',
  cloud: '<path d="M7 18a5 5 0 1 1 1-10 6 6 0 0 1 11 3 3.5 3.5 0 0 1 0 7Z"/>',
  rain: '<path d="M7 15a5 5 0 1 1 1-10 6 6 0 0 1 11 3 3.5 3.5 0 0 1 0 7M7 18l-1 3m6-3-1 3m6-3-1 3"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 5 10 8L22 5"/>',
  chat: '<path d="M21 11a9 8 0 0 1-9 8H8l-5 3 1-6A8 8 0 1 1 21 11Z"/>',
  phone:
    '<path d="m7 3 3 5-3 2a17 17 0 0 0 7 7l2-3 5 3c0 3-2 5-5 4A23 23 0 0 1 3 8c-1-3 1-5 4-5Z"/>',
  video:
    '<rect x="2" y="5" width="13" height="14" rx="3"/><path d="m15 10 7-4v12l-7-4"/>',
  person: '<circle cx="12" cy="7" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  send: '<path d="m3 3 19 9L3 21l3-9ZM6 12h16"/>',
  star: '<path d="m12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1Z"/>',
  heart: '<path d="M12 21 3 12a6 6 0 0 1 9-8 6 6 0 0 1 9 8Z"/>',
  globe:
    '<circle cx="12" cy="12" r="10"/><ellipse cx="12" cy="12" rx="4" ry="10"/><path d="M2 12h20M4 6h16M4 18h16"/>',
  wifi: '<path d="M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M9 16a5 5 0 0 1 6 0"/><circle cx="12" cy="20" r="1" fill="currentColor"/>',
  controls:
    '<rect x="3" y="3" width="18" height="7" rx="3.5"/><rect x="3" y="14" width="18" height="7" rx="3.5"/><circle cx="7" cy="6.5" r="2" fill="currentColor"/><circle cx="17" cy="17.5" r="2" fill="currentColor"/>',
  lock: '<rect x="5" y="10" width="14" height="12" rx="3"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/>',
  tray: '<path d="M3 4h18v16H3ZM3 14h5l2 3h4l2-3h5"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  download: '<path d="M12 2v14m-5-5 5 5 5-5M3 17v5h18v-5"/>',
  smile:
    '<circle cx="12" cy="12" r="10"/><path d="M8 9h.01M16 9h.01M7 14a5 5 0 0 0 10 0"/>',
  calendar:
    '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M7 2v4m10-4v4M3 10h18M7 14h2m4 0h2m-8 4h2m4 0h2"/>',
  pin: '<path d="M8 3h8l-1 6 4 4H5l4-4ZM12 13v9"/>',
  code: '<path d="m8 5-6 7 6 7M16 5l6 7-6 7M14 2l-4 20"/>',
  history: '<path d="M3 11a9 9 0 1 1 2 7M3 4v7h7M12 7v6l4 2"/>',
  home: '<path d="m2 10 10-8 10 8M5 8v14h14V8M9 22v-9h6v9"/>',
  image:
    '<rect x="2" y="3" width="20" height="18" rx="2"/><circle cx="8" cy="8" r="2"/><path d="m2 17 6-5 4 4 4-7 6 8"/>',
};
export function icon(name, size = 20) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.info}</svg>`;
}
