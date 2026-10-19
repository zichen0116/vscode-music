export const windowEase = "cubic-bezier(.22,1,.36,1)";

// Rectangles use viewport coordinates so the same geometry works from any Dock position.
export function dockTarget(windowRect, iconRect) {
  const scale = Math.min(
    iconRect.width / windowRect.width,
    iconRect.height / windowRect.height,
    0.22,
  );
  const width = windowRect.width * scale,
    height = windowRect.height * scale;
  return {
    left: iconRect.left + (iconRect.width - width) / 2,
    top: iconRect.top + (iconRect.height - height) / 2,
    width,
    height,
  };
}
export function transformBetween(from, to) {
  return `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`;
}
export function trafficLights(name) {
  const svg = (paths, cls = "") =>
    `<svg class="${cls}" viewBox="0 0 10 10" aria-hidden="true"><path d="${paths}"/></svg>`;
  return `<div class="traffic-lights"><button data-window="close" class="traffic close" aria-label="关闭 ${name}" title="关闭">${svg("M2.6 2.6 7.4 7.4M7.4 2.6 2.6 7.4")}</button><button data-window="minimize" class="traffic minimize" aria-label="最小化 ${name}" title="最小化">${svg("M2.3 5h5.4")}</button><button data-window="maximize" class="traffic maximize" aria-label="放大或恢复 ${name}" title="放大／恢复；停留可选择布局">${svg("M1.8 4V1.8H4M1.8 1.8l2.5 2.5M6 8.2h2.2V6M8.2 8.2 5.7 5.7", "traffic-expand")}${svg("M4.1 1.6v2.5H1.6M4.1 4.1 1.7 1.7M5.9 8.4V5.9h2.5M5.9 5.9l2.4 2.4", "traffic-restore")}</button></div>`;
}
