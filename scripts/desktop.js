import {
  appInfo,
  defaultDock,
  previousDefaultDock,
  defaultDesktopApps,
  profile,
  wallpapers,
  publicNotes,
} from "./config.js";
import { h, icon, store, clamp, on, copy, localDate } from "./ui.js";
import { player } from "./player.js";
import {
  windowEase,
  dockTarget,
  transformBetween,
  trafficLights,
} from "./window-motion.js";
import { categoryFor } from "./app-catalog.js";
import {
  reminderData,
  reminderMatches,
  updateReminder,
} from "./reminders-data.js";

export function fitRect(rect, width, height, minW = 300, minH = 240) {
  const w = clamp(rect.w, Math.min(minW, width - 20), width - 20);
  const ht = clamp(rect.h, Math.min(minH, height - 130), height - 130);
  return {
    x: clamp(rect.x, 10, Math.max(10, width - w - 10)),
    y: clamp(rect.y, 38, Math.max(38, height - ht - 92)),
    w,
    h: ht,
  };
}
export class Desktop extends EventTarget {
  constructor(registry) {
    super();
    this.registry = registry;
    this.windows = new Map();
    this.active = null;
    this.z = 20;
    this.notifications = [];
    this.desktopShown = false;
    this.prefs = {
      theme: "light",
      wallpaper: "original",
      dockSize: 48,
      magnification: true,
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
      ...store.get("preferences", {}),
    };
    const savedDock = store.get("dock", defaultDock);
    this.pinned = (
      JSON.stringify(savedDock) === JSON.stringify(previousDefaultDock)
        ? defaultDock
        : savedDock
    ).filter((id) => appInfo[id]);
    this.desktopApps = store
      .get("desktopApps", defaultDesktopApps)
      .filter((id) => appInfo[id] && id !== "trash");
    this.applyPreferences();
    this.renderMenuBar();
    this.renderDock();
    this.renderWidgets();
    this.renderFiles();
    this.bind();
    this.clock();
    setInterval(() => this.clock(), 1000);
    player.addEventListener("change", () => this.updatePlaying());
    if (!store.get("welcomed", false)) {
      setTimeout(
        () =>
          this.toast(
            "欢迎来我的 Mac",
            "点开应用逛逛，也可以在“信息”里留句话。",
            () => this.open("messages"),
            16000,
          ),
        900,
      );
      store.set("welcomed", true);
    }
  }
  appImage(id, className = "") {
    if (id === "calendar") {
      const now = new Date();
      return `<span class="app-icon calendar-app-icon ${className}" aria-hidden="true"><img src="assets/icons/${h(appInfo[id].icon)}" alt="" draggable="false"><span class="calendar-icon-face"><small>${now.toLocaleDateString("zh-CN", { weekday: "short" })}</small><strong>${now.getDate()}</strong></span></span>`;
    }
    return `<img class="app-icon ${className}" src="assets/icons/${h(appInfo[id].icon)}" alt="" draggable="false">`;
  }
  fitDock() {
    const count = new Set([...this.pinned, ...this.windows.keys()]).size + 2;
    const preferred = clamp(Number(this.prefs.dockSize), 36, 64);
    const size = Math.min(
      preferred,
      Math.max(30, (innerWidth - 120) / count - 5),
    );
    document.documentElement.style.setProperty("--dock-size", `${size}px`);
  }
  applyPreferences() {
    document.documentElement.dataset.theme = this.prefs.theme;
    document.documentElement.dataset.motion = this.prefs.reducedMotion
      ? "reduced"
      : "full";
    this.fitDock();
    document.querySelector("#wallpaper").style.backgroundImage =
      `url("${(wallpapers.find((w) => w.id === this.prefs.wallpaper) || wallpapers[0]).src}")`;
  }
  setPreference(key, value) {
    this.prefs[key] = value;
    store.set("preferences", this.prefs);
    this.applyPreferences();
    this.dispatchEvent(new Event("preferences"));
  }
  renderMenuBar() {
    document.querySelector("#menubar").innerHTML =
      `<div class="menu-left"><button class="menu-trigger apple-menu" data-menu="apple" aria-label="Apple 菜单"><svg viewBox="0 0 24 28" width="17" height="19" fill="currentColor" aria-hidden="true"><path d="M18.5 14.8c0-2.6 2.1-3.9 2.2-4-1.2-1.8-3.1-2-3.8-2-1.6-.2-3.2 1-4 1-.8 0-2-1-3.3-1-1.8 0-3.5 1-4.4 2.5-1.9 3.2-.5 8 1.3 10.6.9 1.3 1.9 2.7 3.3 2.6 1.3 0 1.8-.9 3.4-.9 1.6 0 2 .9 3.4.9s2.3-1.3 3.2-2.6c1-1.5 1.4-2.9 1.4-3-.1 0-2.7-1-2.7-4.1ZM15.9 7.2c.7-.9 1.2-2.1 1.1-3.3-1.1 0-2.5.7-3.3 1.6-.7.8-1.3 2-1.1 3.2 1.2.1 2.5-.6 3.3-1.5Z"/></svg></button><button class="menu-trigger active-app" data-menu="app">访达</button>${["文件", "编辑", "显示", "窗口", "帮助"].map((s, i) => `<button class="menu-trigger" data-menu="${["file", "edit", "view", "window", "help"][i]}">${s}</button>`).join("")}</div><div class="menu-right"><button data-system="network" class="menu-trigger status-button" title="网络状态" aria-label="网络状态">${icon("wifi", 17)}</button><button data-system="spotlight" class="menu-trigger status-button" title="Spotlight 搜索" aria-label="Spotlight 搜索">${icon("search", 16)}</button><button data-system="controls" class="menu-trigger status-button" title="控制中心" aria-label="控制中心">${icon("controls", 17)}</button><button class="menu-trigger menu-clock" data-system="notifications" aria-label="日期与通知中心"></button></div>`;
  }
  clock() {
    const now = new Date();
    const el = document.querySelector(".menu-clock");
    if (el)
      el.textContent = now
        .toLocaleString("zh-CN", {
          month: "long",
          day: "numeric",
          weekday: "short",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
        .replace(/,/g, "");
    if (this.today !== localDate(now)) {
      this.today = localDate(now);
      this.renderWidgets();
      document.querySelectorAll(".calendar-icon-face small").forEach(
        (el) =>
          (el.textContent = now.toLocaleDateString("zh-CN", {
            weekday: "short",
          })),
      );
      document
        .querySelectorAll(".calendar-icon-face strong")
        .forEach((el) => (el.textContent = now.getDate()));
    }
  }
  bind() {
    on(document.querySelector("#menubar"), "click", "[data-menu]", (e, b) =>
      this.systemMenu(b.dataset.menu, b),
    );
    on(document.querySelector("#menubar"), "click", "[data-system]", (e, b) => {
      const action = b.dataset.system;
      if (action === "spotlight") this.spotlight();
      if (action === "controls") this.controlCenter();
      if (action === "notifications") this.notificationCenter();
      if (action === "network")
        this.menu(
          [
            {
              label: navigator.onLine
                ? "浏览器处于在线状态"
                : "浏览器处于离线状态",
              disabled: true,
            },
            { label: "检查留言服务", action: () => this.open("messages") },
          ],
          b,
        );
    });
    document.addEventListener("pointerdown", (e) => {
      if (!e.target.closest("#menus, [data-menu], [data-system]"))
        this.closeMenu();
      if (!e.target.closest("#panels, [data-system]")) this.closePanel();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const dialog = document.querySelector(
          "#dialogs .dialog-backdrop:last-child",
        );
        if (dialog) dialog.close();
        else if (document.querySelector("#menus").children.length)
          this.closeMenu();
        else this.closePanel();
      }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        this.spotlight();
      }
    });
    document.querySelector("#desktop").addEventListener("contextmenu", (e) => {
      if (e.target.closest(".app-window, #dock, #menubar")) return;
      e.preventDefault();
      const widget = e.target.closest("[data-widget]");
      this.menu(
        widget
          ? [
              {
                label: "打开应用",
                action: () => this.open(widget.dataset.app),
              },
              {
                label: "移除小组件",
                action: () => {
                  const hidden = store.get("hiddenWidgets", []);
                  store.set("hiddenWidgets", [
                    ...new Set([...hidden, widget.dataset.widget]),
                  ]);
                  this.renderWidgets();
                },
              },
              { separator: true },
              {
                label: "小尺寸",
                action: () => this.resizeWidget(widget.dataset.widget, "small"),
              },
              {
                label: "大尺寸",
                action: () => this.resizeWidget(widget.dataset.widget, "large"),
              },
              { label: "恢复默认布局", action: () => this.resetWidgets() },
            ]
          : [
              {
                label: "更换壁纸…",
                action: () => this.open("settings", { tab: "wallpaper" }),
              },
              { label: "添加小组件…", action: () => this.widgetPicker() },
              {
                label: "按名称排列图标",
                action: () => this.arrangeDesktop("name"),
              },
              {
                label: "按用途分组",
                action: () => this.arrangeDesktop("category"),
              },
              { label: "应用中心…", action: () => this.open("appstore") },
              {
                label: "新建桌面便签",
                action: () => this.open("stickies", { create: true }),
              },
              { label: "显示桌面", action: () => this.showDesktop() },
            ],
        e,
      );
    });
    window.addEventListener("resize", () => {
      for (const win of this.windows.values()) {
        if (win.mode === "maximized") this.maximize(win.id, true);
        else this.setRect(win, win.rect);
      }
      this.clampWidgets();
      this.renderFiles();
      this.fitDock();
    });
    window.addEventListener("blur", () => {
      // Embedded maps and websites receive pointer events in their own document.
      setTimeout(() => {
        const frame = document.activeElement;
        const app = frame?.tagName === "IFRAME" && frame.closest(".app-window");
        if (app && this.windows.has(app.dataset.app))
          this.focus(app.dataset.app);
      }, 0);
    });
  }
  open(id, data = {}) {
    if (!this.registry[id]) return;
    this.closeMenu();
    this.closePanel();
    if (this.desktopShown) this.showDesktop();
    const existing = this.windows.get(id);
    if (existing) {
      this.restore(id);
      existing.instance?.receive?.(data);
      return existing;
    }
    const info = appInfo[id],
      el = document.createElement("section");
    el.className = `app-window app-${id}`;
    el.dataset.app = id;
    el.setAttribute("aria-label", info.name);
    el.tabIndex = -1;
    el.innerHTML = `<header class="windowbar">${trafficLights(h(info.name))}<span class="window-title">${h(info.name)}</span><div class="windowbar-end"></div></header><div class="app-content"></div>${["n", "e", "s", "w", "ne", "nw", "se", "sw"].map((d) => `<div class="resize-handle resize-${d}" data-resize="${d}"></div>`).join("")}`;
    const controller = new AbortController(),
      index = this.windows.size;
    const rect = {
      w: info.w,
      h: info.h,
      x: (innerWidth - info.w) / 2 + (index % 5) * 22,
      y: Math.max(65, (innerHeight - info.h - 40) / 2) + (index % 4) * 16,
    };
    const win = {
      id,
      el,
      rect,
      mode: "normal",
      controller,
      instance: null,
      minW: info.minW || 560,
      minH: info.minH || 380,
    };
    this.windows.set(id, win);
    document.querySelector("#windows").append(el);
    this.setRect(win, rect);
    this.focus(id);
    this.renderDock();
    el.addEventListener("pointerdown", () => this.focus(id), {
      signal: controller.signal,
    });
    on(
      el,
      "click",
      "[data-window]",
      (e, b) => {
        e.stopPropagation();
        this[b.dataset.window](id);
      },
      controller.signal,
    );
    el.querySelector(".maximize").addEventListener(
      "contextmenu",
      (e) => {
        e.preventDefault();
        this.layoutMenu(id, e);
      },
      { signal: controller.signal },
    );
    let layoutTimer;
    el.querySelector(".maximize").addEventListener(
      "pointerenter",
      () => {
        layoutTimer = setTimeout(
          () => this.layoutMenu(id, el.querySelector(".maximize")),
          650,
        );
      },
      { signal: controller.signal },
    );
    el.querySelector(".maximize").addEventListener(
      "pointerleave",
      () => clearTimeout(layoutTimer),
      { signal: controller.signal },
    );
    el.querySelector(".maximize").addEventListener(
      "pointerdown",
      () => {
        clearTimeout(layoutTimer);
        this.closeMenu();
      },
      { signal: controller.signal },
    );
    controller.signal.addEventListener(
      "abort",
      () => clearTimeout(layoutTimer),
      { once: true },
    );
    el.querySelector(".windowbar").addEventListener(
      "dblclick",
      (e) => {
        if (!e.target.closest("button,input")) this.maximize(id);
      },
      { signal: controller.signal },
    );
    el.addEventListener("pointerdown", (e) => this.dragWindow(e, win), {
      signal: controller.signal,
    });
    const ctx = {
      desktop: this,
      win,
      root: el.querySelector(".app-content"),
      signal: controller.signal,
      data,
      open: (app, payload) => this.open(app, payload),
      toast: (...a) => this.toast(...a),
      setTitle: (title) => {
        el.querySelector(".window-title").textContent = title;
      },
      setSize: (w, ht) => this.transitionRect(win, { ...win.rect, w, h: ht }),
      setChrome: (visible) => el.classList.toggle("frameless", !visible),
      menu: (...a) => this.menu(...a),
      dialog: (opts) => this.dialog(opts),
    };
    try {
      win.instance = this.registry[id](ctx) || {};
      const toolbar = ctx.root.querySelector(":scope > .app-toolbar");
      if (toolbar) {
        el.classList.add("integrated-toolbar");
        toolbar.dataset.dragWindow = "";
      }
    } catch (error) {
      console.error(error);
      ctx.root.innerHTML =
        '<div class="empty-state"><h2>应用未能打开</h2><p>请关闭窗口后重试。</p></div>';
    }
    this.animateWindow(
      win,
      [
        { opacity: 0, transform: "translateY(14px) scale(.965)" },
        { opacity: 1, transform: "none" },
      ],
      260,
    );
    document.querySelector(`[data-dock="${id}"]`)?.classList.add("launching");
    setTimeout(
      () =>
        document
          .querySelector(`[data-dock="${id}"]`)
          ?.classList.remove("launching"),
      700,
    );
    this.dispatchEvent(
      new CustomEvent("windowchange", { detail: { id, action: "open" } }),
    );
    return win;
  }
  focus(id) {
    this.active = id;
    for (const [key, w] of this.windows)
      w.el.classList.toggle("focused", key === id);
    const win = this.windows.get(id);
    if (win) win.el.style.zIndex = ++this.z;
    const label = document.querySelector(".active-app");
    if (label) label.textContent = appInfo[id]?.name || "访达";
  }
  cancelAnimation(win) {
    win.motionVersion = (win.motionVersion || 0) + 1;
    win.animation?.cancel();
    win.animation = null;
  }
  animateWindow(win, frames, duration = 280, finish) {
    this.cancelAnimation(win);
    if (this.prefs.reducedMotion || !win.el.animate) {
      finish?.();
      return;
    }
    const version = win.motionVersion;
    const animation = win.el.animate(frames, {
      duration,
      easing: windowEase,
      fill: "none",
    });
    win.animation = animation;
    animation.onfinish = () => {
      if (version !== win.motionVersion) return;
      win.animation = null;
      finish?.();
    };
  }
  transitionRect(win, rect, animate = true) {
    const before = win.el.getBoundingClientRect();
    this.cancelAnimation(win);
    this.setRect(win, rect);
    if (!animate || win.el.hidden) return;
    const after = win.el.getBoundingClientRect();
    this.animateWindow(
      win,
      [
        {
          left: `${before.left}px`,
          top: `${before.top}px`,
          width: `${before.width}px`,
          height: `${before.height}px`,
        },
        {
          left: `${after.left}px`,
          top: `${after.top}px`,
          width: `${after.width}px`,
          height: `${after.height}px`,
        },
      ],
      320,
    );
  }
  nextFocus() {
    const next = [...this.windows.values()]
      .filter((w) => w.mode !== "minimized")
      .sort((a, b) => Number(a.el.style.zIndex) - Number(b.el.style.zIndex))
      .at(-1);
    this.focus(next?.id || null);
  }
  close(id) {
    const win = this.windows.get(id);
    if (!win) return;
    const visible = !win.el.hidden && win.mode !== "minimized";
    const rect = win.el.getBoundingClientRect();
    this.cancelAnimation(win);
    // Dispose immediately: music and camera must stop before the visual departure finishes.
    win.controller.abort();
    if (id === "vscode") player.stop();
    try {
      win.instance?.dispose?.();
    } catch (error) {
      console.error(error);
    }
    this.windows.delete(id);
    win.el.classList.add("is-closing");
    win.el.setAttribute("aria-hidden", "true");
    win.el.inert = true;
    this.nextFocus();
    this.renderDock();
    if (visible) {
      Object.assign(win.el.style, {
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      });
      this.animateWindow(
        win,
        [
          { opacity: 1, transform: "none" },
          { opacity: 0, transform: "translateY(8px) scale(.975)" },
        ],
        170,
        () => win.el.remove(),
      );
    } else win.el.remove();
    this.dispatchEvent(
      new CustomEvent("windowchange", { detail: { id, action: "close" } }),
    );
  }
  minimize(id) {
    const win = this.windows.get(id);
    if (!win || win.mode === "minimized") return;
    this.cancelAnimation(win);
    win.previousMode = win.mode;
    win.mode = "minimized";
    this.renderDock();
    const rect = win.el.getBoundingClientRect();
    const dock = document
      .querySelector(`[data-dock="${id}"] .app-icon`)
      ?.getBoundingClientRect();
    if (dock) {
      const target = dockTarget(rect, dock);
      this.animateWindow(
        win,
        [
          { opacity: 1, transform: "none", transformOrigin: "0 0" },
          {
            opacity: 0,
            transform: transformBetween(target, rect),
            transformOrigin: "0 0",
          },
        ],
        310,
        () => {
          if (win.mode === "minimized") win.el.hidden = true;
        },
      );
    } else win.el.hidden = true;
    if (this.active === id) this.nextFocus();
    this.dispatchEvent(
      new CustomEvent("windowchange", { detail: { id, action: "minimize" } }),
    );
  }
  restore(id) {
    const win = this.windows.get(id);
    if (!win) return;
    const minimized = win.mode === "minimized";
    if (!minimized && !win.el.classList.contains("desktop-hidden")) {
      this.focus(id);
      this.renderDock();
      return;
    }
    const visible = !win.el.hidden;
    const currentVisual = visible ? win.el.getBoundingClientRect() : null;
    this.cancelAnimation(win);
    win.el.hidden = false;
    win.el.classList.remove("desktop-hidden");
    if (minimized) win.mode = win.previousMode || "normal";
    this.focus(id);
    this.renderDock();
    if (minimized) {
      const finalRect = win.el.getBoundingClientRect();
      const dock = document
        .querySelector(`[data-dock="${id}"] .app-icon`)
        ?.getBoundingClientRect();
      if (dock) {
        const from = currentVisual || dockTarget(finalRect, dock);
        this.animateWindow(
          win,
          [
            {
              opacity: visible ? 1 : 0,
              transform: transformBetween(from, finalRect),
              transformOrigin: "0 0",
            },
            { opacity: 1, transform: "none", transformOrigin: "0 0" },
          ],
          320,
        );
      }
    }
    this.dispatchEvent(
      new CustomEvent("windowchange", { detail: { id, action: "restore" } }),
    );
  }
  maximize(id, force = false) {
    const win = this.windows.get(id);
    if (!win) return;
    if (win.mode === "minimized") this.restore(id);
    if (win.mode === "maximized" && !force) {
      win.mode = "normal";
      this.transitionRect(win, win.beforeMax || win.rect);
    } else {
      if (win.mode !== "maximized") win.beforeMax = { ...win.rect };
      win.mode = "maximized";
      this.transitionRect(
        win,
        { x: 10, y: 38, w: innerWidth - 20, h: innerHeight - 130 },
        !force,
      );
    }
    win.el.classList.toggle("maximized", win.mode === "maximized");
    win.el
      .querySelector(".maximize")
      .setAttribute("aria-pressed", String(win.mode === "maximized"));
    this.focus(id);
  }
  layoutMenu(id, anchor) {
    if (!this.windows.has(id)) return;
    this.menu(
      [
        {
          label:
            this.windows.get(id).mode === "maximized"
              ? "恢复原来大小"
              : "放大窗口",
          action: () => this.maximize(id),
        },
        { label: "窗口居中", action: () => this.tile(id, "center") },
        { label: "窗口置于屏幕左侧", action: () => this.tile(id, "left") },
        { label: "窗口置于屏幕右侧", action: () => this.tile(id, "right") },
      ],
      anchor,
    );
  }
  tile(id, side) {
    const win = this.windows.get(id);
    if (!win) return;
    if (win.mode === "minimized") this.restore(id);
    const normal =
      win.mode === "maximized" ? win.beforeMax || win.rect : win.rect;
    win.mode = "normal";
    win.el.classList.remove("maximized");
    win.el.querySelector(".maximize").setAttribute("aria-pressed", "false");
    const rect =
      side === "center"
        ? {
            ...normal,
            x: (innerWidth - normal.w) / 2,
            y: Math.max(42, (innerHeight - normal.h - 70) / 2),
          }
        : {
            x: side === "left" ? 10 : innerWidth / 2 + 5,
            y: 38,
            w: innerWidth / 2 - 15,
            h: innerHeight - 130,
          };
    this.transitionRect(win, rect);
    this.focus(id);
  }
  setRect(win, rect) {
    if (win.id === "qq" && win.el.classList.contains("frameless")) {
      const width = Math.min(rect.w, (innerHeight - 130) / 1.4375);
      rect = { ...rect, w: width, h: width * 1.4375 };
    }
    win.rect = fitRect(rect, innerWidth, innerHeight, win.minW, win.minH);
    Object.assign(win.el.style, {
      left: `${win.rect.x}px`,
      top: `${win.rect.y}px`,
      width: `${win.rect.w}px`,
      height: `${win.rect.h}px`,
    });
  }
  dragWindow(e, win) {
    if (
      e.button !== 0 ||
      e.target.closest("button,input,select,textarea,a,[data-no-drag]")
    )
      return;
    const resize = e.target.closest("[data-resize]")?.dataset.resize;
    if (!resize && !e.target.closest(".windowbar,[data-drag-window]")) return;
    if (win.mode === "maximized") return;
    e.preventDefault();
    if (win.animation) {
      const visual = win.el.getBoundingClientRect();
      this.cancelAnimation(win);
      this.setRect(win, {
        x: visual.left,
        y: visual.top,
        w: visual.width,
        h: visual.height,
      });
    }
    const capture = e.target;
    capture.setPointerCapture(e.pointerId);
    win.el.classList.add("moving");
    // Keep pointer coordinates separate from window geometry during drag.
    const px = e.clientX,
      py = e.clientY,
      origin = { ...win.rect };
    const update = (ev) => {
      const dx = ev.clientX - px,
        dy = ev.clientY - py;
      let next = { ...origin };
      if (!resize) {
        next.x += dx;
        next.y += dy;
      } else {
        if (resize.includes("e")) next.w += dx;
        if (resize.includes("s")) next.h += dy;
        if (resize.includes("w")) {
          const w = Math.max(win.minW, origin.w - dx);
          next.x = origin.x + origin.w - w;
          next.w = w;
        }
        if (resize.includes("n")) {
          const ht = Math.max(win.minH, origin.h - dy);
          next.y = origin.y + origin.h - ht;
          next.h = ht;
        }
      }
      if (resize && win.id === "qq" && win.el.classList.contains("frameless")) {
        if (resize.includes("n") || resize.includes("s"))
          next.w = next.h / 1.4375;
        else next.h = next.w * 1.4375;
      }
      this.setRect(win, next);
    };
    const finish = () => {
      capture.removeEventListener("pointermove", update);
      capture.removeEventListener("pointerup", finish);
      capture.removeEventListener("pointercancel", finish);
      win.el.classList.remove("moving");
    };
    capture.addEventListener("pointermove", update);
    capture.addEventListener("pointerup", finish);
    capture.addEventListener("pointercancel", finish);
  }
  showDesktop() {
    this.desktopShown = !this.desktopShown;
    for (const win of this.windows.values())
      if (win.mode !== "minimized")
        win.el.classList.toggle("desktop-hidden", this.desktopShown);
  }
  renderDock() {
    this.fitDock();
    const ids = [...new Set([...this.pinned, ...this.windows.keys()])].filter(
      (id) => id !== "trash",
    );
    const dock = document.querySelector("#dock");
    dock.innerHTML = `<div class="dock-glass">${ids.map((id) => `<button class="dock-item ${this.windows.has(id) ? "running" : ""} ${this.windows.get(id)?.mode === "minimized" ? "minimized" : ""}" data-dock="${id}" draggable="true" aria-label="打开 ${h(appInfo[id].name)}"><span class="dock-label">${h(appInfo[id].name)}</span>${this.appImage(id)}<span class="dock-dot"></span>${id === "messages" && this.unread ? `<span class="dock-badge">${this.unread}</span>` : ""}</button>`).join("")}<span class="dock-separator"></span><button class="dock-item all-apps" data-all-apps aria-label="所有应用"><span class="dock-label">所有应用</span><span class="apps-grid-icon">${icon("grid", 32)}</span></button></div>`;
    dock
      .querySelector(".dock-glass")
      .insertAdjacentHTML(
        "beforeend",
        `<button class="dock-item dock-trash" data-dock="trash" aria-label="打开 废纸篓"><span class="dock-label">废纸篓</span>${this.appImage("trash")}</button>`,
      );
    dock.onclick = (e) => {
      const b = e.target.closest("[data-dock]");
      if (b) this.open(b.dataset.dock);
      else if (e.target.closest("[data-all-apps]")) this.spotlight(true);
    };
    let dockFrame = 0;
    const resetMagnification = () => {
      cancelAnimationFrame(dockFrame);
      dockFrame = 0;
      dock.style.setProperty("--dock-spread", "0px");
      dock.querySelectorAll(".dock-item").forEach((b) => {
        b.style.setProperty("--scale", 1);
        b.style.setProperty("--shift-x", "0px");
      });
    };
    dock.onpointermove = (e) => {
      if (dockFrame) cancelAnimationFrame(dockFrame);
      const x = e.clientX;
      dockFrame = requestAnimationFrame(() => {
        dockFrame = 0;
        const items = [...dock.querySelectorAll(".dock-item")];
        const geometry = items.map((item) => {
          const r = item.getBoundingClientRect(),
            distance = Math.abs(x - r.left - r.width / 2);
          const scale =
            this.prefs.magnification && !this.prefs.reducedMotion
              ? 1 + 0.5 * Math.max(0, 1 - distance / 135) ** 2
              : 1;
          return { item, scale, extra: r.width * (scale - 1) };
        });
        const spread = geometry.reduce((sum, g) => sum + g.extra, 0);
        let shift = -spread / 2;
        for (const g of geometry) {
          shift += g.extra / 2;
          g.item.style.setProperty("--scale", g.scale);
          g.item.style.setProperty("--shift-x", `${shift}px`);
          shift += g.extra / 2;
        }
        dock.style.setProperty("--dock-spread", `${spread}px`);
      });
    };
    dock.onpointerleave = resetMagnification;
    dock.oncontextmenu = (e) => {
      const b = e.target.closest("[data-dock]");
      if (!b) return;
      e.preventDefault();
      const id = b.dataset.dock;
      if (id === "trash") {
        this.menu(
          [
            { label: "打开废纸篓", action: () => this.open("trash") },
            {
              label: "清空废纸篓…",
              action: () => this.open("trash")?.instance?.empty?.(),
            },
          ],
          e,
        );
        return;
      }
      this.menu(
        [
          { label: "打开／显示", action: () => this.open(id) },
          {
            label: "最小化",
            disabled: !this.windows.has(id),
            action: () => this.minimize(id),
          },
          {
            label: "关闭",
            disabled: !this.windows.has(id),
            action: () => this.close(id),
          },
          { separator: true },
          {
            label: "保留在 Dock",
            checked: this.pinned.includes(id),
            action: () => this.pin(id),
          },
        ],
        e,
      );
    };
    let dragged = "";
    dock.ondragstart = (e) => {
      dragged = e.target.closest("[data-dock]")?.dataset.dock || "";
      if (dragged) e.dataTransfer.setData("text/plain", dragged);
    };
    dock.ondragover = (e) => e.preventDefault();
    dock.ondrop = (e) => {
      e.preventDefault();
      const target = e.target.closest("[data-dock]")?.dataset.dock;
      if (dragged && target && dragged !== target) {
        this.pinned = this.pinned.filter((id) => id !== dragged);
        const index = this.pinned.indexOf(target);
        this.pinned.splice(index < 0 ? this.pinned.length : index, 0, dragged);
        store.set("dock", this.pinned);
        this.renderDock();
      }
    };
    dock.ondragend = () => {
      dragged = "";
    };
    this.updateTrash();
    this.updateReminders();
  }
  pin(id) {
    if (id === "trash") return;
    this.pinned = this.pinned.includes(id)
      ? this.pinned.filter((x) => x !== id)
      : [...this.pinned, id];
    store.set("dock", this.pinned);
    this.renderDock();
  }
  addDesktopApp(id) {
    if (!appInfo[id] || id === "trash") return;
    if (!this.desktopApps.includes(id)) this.desktopApps.push(id);
    store.set("desktopApps", this.desktopApps);
    this.renderFiles();
    this.dispatchEvent(new Event("desktopchange"));
  }
  removeDesktopApp(id) {
    this.desktopApps = this.desktopApps.filter((x) => x !== id);
    store.set("desktopApps", this.desktopApps);
    this.renderFiles();
    this.dispatchEvent(new Event("desktopchange"));
  }
  arrangeDesktop(order = "name") {
    store.set("desktopOrder", order);
    store.remove("desktopPositions");
    this.renderFiles();
  }
  renderFiles() {
    const root = document.querySelector("#desktop-files");
    const entries = [
      {
        id: "about",
        name: "关于我",
        app: "finder",
        folder: true,
        data: { folder: "documents" },
      },
      { id: "website", name: "lozic7.com", app: "safari" },
      ...this.desktopApps
        .filter((id) => appInfo[id])
        .map((id) => ({ id, name: appInfo[id].name, app: id })),
      { id: "trash", name: "废纸篓", app: "trash" },
    ];
    const order = store.get("desktopOrder", "default");
    if (order === "name")
      entries.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
    if (order === "category")
      entries.sort(
        (a, b) =>
          categoryFor(a.app).localeCompare(categoryFor(b.app), "zh-CN") ||
          a.name.localeCompare(b.name, "zh-CN"),
      );
    const saved = store.get("desktopPositions", {}),
      rows = Math.max(2, Math.floor((innerHeight - 160) / 102));
    root.innerHTML = entries
      .map((entry, i) => {
        const pos = saved[entry.id] || {
          x: innerWidth - 109 - Math.floor(i / rows) * 102,
          y: 48 + (i % rows) * 102,
        };
        return `<button class="desktop-file" data-entry="${entry.id}" data-file="${entry.app}" style="left:${clamp(pos.x, 12, innerWidth - 95)}px;top:${clamp(pos.y, 38, innerHeight - 175)}px" aria-label="${h(entry.name)}">${entry.folder ? icon("folder", 58) : this.appImage(entry.app)}<span>${h(entry.name)}</span></button>`;
      })
      .join("");
    const entryFor = (b) => entries.find((x) => x.id === b?.dataset.entry);
    const openEntry = (b) => {
      const entry = entryFor(b);
      if (entry) this.open(entry.app, entry.data || {});
    };
    let dragged = false;
    root.onclick = (e) => {
      const b = e.target.closest("[data-entry]");
      if (!b) return;
      if (dragged) {
        dragged = false;
        return;
      }
      root
        .querySelectorAll("[data-entry]")
        .forEach((node) => node.classList.toggle("selected", node === b));
    };
    root.ondblclick = (e) => {
      if (!dragged) openEntry(e.target.closest("[data-entry]"));
    };
    root.onkeydown = (e) => {
      const b = e.target.closest("[data-entry]");
      if (b && e.key === "Enter") openEntry(b);
    };
    root.onpointerdown = (e) => {
      const b = e.target.closest("[data-entry]");
      if (!b || e.button !== 0) return;
      const origin = { x: b.offsetLeft, y: b.offsetTop },
        px = e.clientX,
        py = e.clientY;
      dragged = false;
      b.setPointerCapture(e.pointerId);
      const move = (ev) => {
        const dx = ev.clientX - px,
          dy = ev.clientY - py;
        if (Math.hypot(dx, dy) < 5 && !dragged) return;
        dragged = true;
        b.classList.add("dragging");
        b.style.left = `${clamp(origin.x + dx, 12, innerWidth - 95)}px`;
        b.style.top = `${clamp(origin.y + dy, 38, innerHeight - 175)}px`;
      };
      const end = () => {
        b.removeEventListener("pointermove", move);
        b.removeEventListener("pointerup", end);
        b.removeEventListener("pointercancel", end);
        b.classList.remove("dragging");
        if (dragged) {
          const positions = store.get("desktopPositions", {});
          positions[b.dataset.entry] = {
            x: clamp(Math.round(b.offsetLeft / 12) * 12, 12, innerWidth - 95),
            y: clamp(Math.round(b.offsetTop / 12) * 12, 38, innerHeight - 175),
          };
          b.style.left = `${positions[b.dataset.entry].x}px`;
          b.style.top = `${positions[b.dataset.entry].y}px`;
          store.set("desktopPositions", positions);
        }
      };
      b.addEventListener("pointermove", move);
      b.addEventListener("pointerup", end);
      b.addEventListener("pointercancel", end);
    };
    root.oncontextmenu = (e) => {
      const b = e.target.closest("[data-entry]"),
        entry = entryFor(b);
      if (!entry) return;
      e.preventDefault();
      e.stopPropagation();
      this.menu(
        [
          { label: "打开", action: () => openEntry(b) },
          ...(entry.app === "trash"
            ? [
                {
                  label: "清空废纸篓…",
                  action: () => this.open("trash")?.instance?.empty?.(),
                },
              ]
            : [
                {
                  label: "保留在 Dock",
                  checked: this.pinned.includes(entry.app),
                  action: () => this.pin(entry.app),
                },
                ...(this.desktopApps.includes(entry.id)
                  ? [
                      {
                        label: "从桌面移除快捷方式",
                        action: () => this.removeDesktopApp(entry.id),
                      },
                    ]
                  : []),
              ]),
          { separator: true },
          { label: "按名称排列", action: () => this.arrangeDesktop("name") },
          {
            label: "按用途分组",
            action: () => this.arrangeDesktop("category"),
          },
        ],
        e,
      );
    };
    this.updateTrash();
    this.updateReminders();
  }
  windowOverview() {
    const windows = [...this.windows.values()];
    const panel = this.panel(
      "overview",
      `<header><b>打开的窗口</b><small>${windows.length} 个应用</small></header><div class="overview-grid">${windows.map((w) => `<button data-overview="${w.id}">${this.appImage(w.id)}<b>${h(appInfo[w.id].name)}</b><span>${w.mode === "minimized" ? "已最小化" : w.mode === "maximized" ? "已放大" : "打开中"}</span></button>`).join("") || '<p class="muted">还没有打开的窗口。</p>'}</div>`,
    );
    if (panel)
      panel.onclick = (e) => {
        const b = e.target.closest("[data-overview]");
        if (b) this.open(b.dataset.overview);
      };
  }
  updateTrash() {
    const full =
      store.get("notes", []).some((n) => n.deleted) ||
      reminderData().items.some((n) => n.deleted) ||
      store.get("stickies", []).some((n) => n.deleted) ||
      ["gmail", "netease"].some((kind) =>
        store.get(`${kind}:messages`, []).some((m) => m.folder === "trash"),
      );
    document
      .querySelectorAll('[data-file="trash"] img,[data-dock="trash"] img')
      .forEach(
        (img) =>
          (img.src = `assets/icons/${full ? "trash-full.png" : "trash.png"}`),
      );
    this.windows.get("trash")?.instance?.refresh?.();
  }
  updateReminders() {
    const active = reminderData().items.filter((i) =>
      reminderMatches(i, "today"),
    );
    this.reminderCount = active.length;
    document
      .querySelectorAll('[data-dock="reminders"],[data-file="reminders"]')
      .forEach((el) => {
        el.querySelector(".reminders-badge")?.remove();
        if (active.length)
          el.insertAdjacentHTML(
            "beforeend",
            `<span class="dock-badge reminders-badge">${active.length}</span>`,
          );
      });
    const widget = document.querySelector(".widget-reminders");
    if (widget) {
      widget.querySelector(".reminder-widget-count").textContent =
        active.length;
      widget.querySelector(".reminder-widget-list").innerHTML =
        active
          .slice(0, 3)
          .map(
            (i) =>
              `<div><button data-widget-task="${h(i.id)}" aria-label="完成 ${h(i.title)}"></button><span>${h(i.title)}</span></div>`,
          )
          .join("") || "<p>今天，留一点轻松。<br>点这里添加一件小事。</p>";
    }
  }
  renderWidgets() {
    const now = new Date(),
      days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
      first = (new Date(now.getFullYear(), now.getMonth(), 1).getDay() + 6) % 7;
    const hidden = store.get("hiddenWidgets", []),
      positions = store.get("widgetPositions", {});
    const widgets = [
      [
        "reminders",
        "reminders",
        '<header><b>今天的提醒</b><strong class="reminder-widget-count">0</strong></header><div class="reminder-widget-list"></div>',
      ],
      [
        "calendar",
        "calendar",
        `<div class="calendar-widget-date"><span>${now.toLocaleDateString("zh-CN", { weekday: "long" })}</span><strong>${now.getDate()}</strong><small>${now.getMonth() + 1}月 · ${now.getFullYear()}</small></div><div class="mini-calendar"><b>${now.getMonth() + 1}月</b><div>${["一", "二", "三", "四", "五", "六", "日"].map((s) => `<small>${s}</small>`).join("")}${"<i></i>".repeat(first)}${Array.from({ length: days }, (_, i) => `<span class="${i + 1 === now.getDate() ? "today" : ""}">${i + 1}</span>`).join("")}</div></div>`,
      ],
      [
        "weather",
        "weather",
        `<div class="weather-widget-top"><span>天气</span>${icon("sun", 26)}</div><strong class="weather-temperature">—°</strong><div class="weather-widget-bottom"><b>你那边的天气</b><span>选择一座城市</span></div>`,
      ],
      [
        "music",
        "vscode",
        `<div class="widget-album">${icon("music", 30)}</div><div class="widget-track"><b>${h(player.track.title)}</b><span>${h(player.track.artist)}</span><small>把歌写进代码里</small></div><button class="widget-play" aria-label="播放或暂停">${icon(player.playing ? "pause" : "play", 22)}</button>`,
      ],
      [
        "profile",
        "contacts",
        `<img src="${profile.avatar}" alt="Lozic 的头像"><div><b>${h(profile.name)}</b><span>${h(profile.welcome)}</span><button class="link-button" data-leave-message>留句话 ${icon("forward", 12)}</button></div>`,
      ],
    ];
    const root = document.querySelector("#widgets");
    root.innerHTML = widgets
      .filter((w) => !hidden.includes(w[0]))
      .map(([id, app, body]) => {
        const p = positions[id];
        const size =
          store.get("widgetSizes", {})[id] ||
          {
            calendar: "large",
            weather: "small",
            music: "large",
            profile: "small",
            reminders: "large",
          }[id];
        return `<article class="desktop-widget widget-${id}" data-widget="${id}" data-size="${size}" data-app="${app}" tabindex="0" aria-label="${h(appInfo[app].name)}小组件" ${p ? `style="left:${Number(p.x) || 20}px;top:${Number(p.y) || 50}px"` : ""}>${body}</article>`;
      })
      .join("");
    root.onclick = (e) => {
      if (root.dataset.dragged === "yes") {
        root.dataset.dragged = "no";
        return;
      }
      const task = e.target.closest("[data-widget-task]");
      if (task) {
        try {
          updateReminder(task.dataset.widgetTask, {
            completed: true,
            completedAt: Date.now(),
          });
        } catch (error) {
          this.toast("未能保存提醒", error.message);
        }
        return;
      }
      if (e.target.closest("[data-leave-message]")) this.open("messages");
      else if (e.target.closest(".widget-play")) {
        if (player.active) player.toggle();
        else this.open("vscode");
      } else {
        const w = e.target.closest("[data-widget]");
        if (w) this.open(w.dataset.app);
      }
    };
    root.onkeydown = (e) => {
      if (e.key === "Enter" && e.target.matches("[data-widget]"))
        this.open(e.target.dataset.app);
    };
    root.onpointerdown = (e) => {
      if (e.button !== 0 || e.target.closest("button")) return;
      const w = e.target.closest("[data-widget]");
      if (!w) return;
      const origin = w.getBoundingClientRect(),
        x = e.clientX,
        y = e.clientY;
      let moved = false;
      w.setPointerCapture(e.pointerId);
      const move = (ev) => {
        if (Math.hypot(ev.clientX - x, ev.clientY - y) > 4) moved = true;
        if (!moved) return;
        w.style.left = `${clamp(origin.x + ev.clientX - x, 12, innerWidth - origin.width - 12)}px`;
        w.style.top = `${clamp(origin.y + ev.clientY - y, 40, innerHeight - origin.height - 100)}px`;
      };
      const end = () => {
        w.removeEventListener("pointermove", move);
        w.removeEventListener("pointerup", end);
        w.removeEventListener("pointercancel", end);
        if (moved) {
          root.dataset.dragged = "yes";
          const p = store.get("widgetPositions", {});
          p[w.dataset.widget] = { x: w.offsetLeft, y: w.offsetTop };
          store.set("widgetPositions", p);
        }
      };
      w.addEventListener("pointermove", move);
      w.addEventListener("pointerup", end);
      w.addEventListener("pointercancel", end);
    };
    this.clampWidgets();
    this.updatePlaying();
    this.updateReminders();
    this.dispatchEvent(new Event("widgets"));
  }
  clampWidgets() {
    for (const el of document.querySelectorAll("[data-widget]")) {
      if (el.style.left)
        el.style.left = `${clamp(el.offsetLeft, 12, innerWidth - el.offsetWidth - 12)}px`;
      if (el.style.top)
        el.style.top = `${clamp(el.offsetTop, 40, innerHeight - el.offsetHeight - 100)}px`;
    }
  }
  resetWidgets() {
    store.remove("widgetPositions");
    store.remove("hiddenWidgets");
    store.remove("widgetSizes");
    this.renderWidgets();
  }
  resizeWidget(id, size) {
    const sizes = store.get("widgetSizes", {});
    sizes[id] = size;
    store.set("widgetSizes", sizes);
    this.renderWidgets();
  }
  widgetPicker() {
    this.dialog({
      title: "桌面小组件",
      body: `<p class="muted">选择想放在桌面上的小组件，拖动它们就能整理位置。</p><div class="widget-options">${[
        ["calendar", "日历"],
        ["weather", "天气"],
        ["music", "正在播放"],
        ["reminders", "提醒事项"],
        ["profile", "个人名片"],
      ]
        .map(
          ([id, name]) =>
            `<label class="setting-row"><span>${name}</span><input type="checkbox" name="${id}" ${!store.get("hiddenWidgets", []).includes(id) ? "checked" : ""}></label>`,
        )
        .join("")}</div>`,
      buttons: [{ id: "save", label: "完成", primary: true }],
      onAction: (id, el) => {
        store.set(
          "hiddenWidgets",
          [...el.querySelectorAll("input:not(:checked)")].map((i) => i.name),
        );
        this.renderWidgets();
        return true;
      },
    });
  }
  updatePlaying() {
    const btn = document.querySelector(".widget-play");
    if (btn) btn.innerHTML = icon(player.playing ? "pause" : "play", 22);
    const small = document.querySelector(".widget-track small");
    if (small)
      small.textContent = player.playing
        ? "正在播放"
        : player.active
          ? "已暂停"
          : "把歌写进代码里";
    document
      .querySelectorAll("[data-player-toggle]")
      .forEach((b) => (b.innerHTML = icon(player.playing ? "pause" : "play")));
  }
  menu(items, anchor) {
    this.closeMenu();
    const el = document.createElement("div");
    el.className = "context-menu";
    el.setAttribute("role", "menu");
    el.innerHTML = items
      .map((item, i) =>
        item.separator
          ? '<div class="menu-divider"></div>'
          : `<button role="menuitem" data-index="${i}" ${item.disabled ? "disabled" : ""}><span class="menu-check">${item.checked ? "✓" : ""}</span><span>${h(item.label)}</span>${item.shortcut ? `<small>${h(item.shortcut)}</small>` : ""}</button>`,
      )
      .join("");
    document.querySelector("#menus").append(el);
    const r = anchor?.getBoundingClientRect?.();
    let x = r ? r.left : anchor?.clientX || 16,
      y = r ? r.bottom + 5 : anchor?.clientY || 36;
    el.style.left = `${clamp(x, 8, innerWidth - el.offsetWidth - 8)}px`;
    el.style.top = `${clamp(y, 34, innerHeight - el.offsetHeight - 8)}px`;
    el.onclick = (e) => {
      const b = e.target.closest("[data-index]");
      if (!b) return;
      const item = items[Number(b.dataset.index)];
      this.closeMenu();
      item.action?.();
    };
    el.querySelector("button:not(:disabled)")?.focus();
    el.onkeydown = (e) => {
      const buttons = [...el.querySelectorAll("button:not(:disabled)")],
        index = buttons.indexOf(document.activeElement);
      if (["ArrowDown", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        buttons[
          (index + (e.key === "ArrowDown" ? 1 : -1) + buttons.length) %
            buttons.length
        ]?.focus();
      }
    };
  }
  closeMenu() {
    document.querySelector("#menus").replaceChildren();
  }
  systemMenu(kind, anchor) {
    const win = this.windows.get(this.active),
      app = appInfo[this.active];
    const items = {
      apple: [
        { label: "关于这台 Mac", action: () => this.about() },
        { separator: true },
        { label: "系统设置…", action: () => this.open("settings") },
        { label: "显示桌面", action: () => this.showDesktop() },
        { separator: true },
        { label: "锁定屏幕", action: () => this.lock() },
        {
          label: "重新进入桌面…",
          action: () =>
            this.dialog({
              title: "重新进入桌面？",
              body: "<p>所有窗口会关闭，音乐会停止。草稿、偏好与公开留言将保留。</p>",
              buttons: [
                { id: "cancel", label: "取消" },
                { id: "reset", label: "重新进入", primary: true },
              ],
              onAction: (id) => {
                if (id === "reset")
                  for (const key of [...this.windows.keys()]) this.close(key);
                return true;
              },
            }),
        },
      ],
      app: [
        {
          label: `关于 ${app?.name || "访达"}`,
          action: () => this.about(this.active),
        },
        { separator: true },
        {
          label: "最小化",
          disabled: !win,
          action: () => this.minimize(this.active),
        },
        {
          label: `退出 ${app?.name || "访达"}`,
          disabled: !win,
          action: () => this.close(this.active),
        },
      ],
      file: win?.instance?.menus?.file || [
        { label: "打开应用…", action: () => this.spotlight(true) },
        { label: "打开个人文件夹", action: () => this.open("finder") },
        { separator: true },
        {
          label: "关闭窗口",
          disabled: !win,
          action: () => this.close(this.active),
        },
      ],
      edit: win?.instance?.menus?.edit || [
        {
          label: "复制所选文本",
          action: async () => {
            const text = getSelection()?.toString();
            if (text) await copy(text);
            else this.toast("选择一段文本后即可复制");
          },
        },
        { label: "打开 Spotlight 搜索", action: () => this.spotlight() },
      ],
      view: [
        { label: "所有应用", action: () => this.spotlight(true) },
        { label: "窗口概览", action: () => this.windowOverview() },
        { label: "App Store", action: () => this.open("appstore") },
        { label: "显示桌面", action: () => this.showDesktop() },
        {
          label: this.prefs.theme === "dark" ? "切换浅色外观" : "切换深色外观",
          action: () =>
            this.setPreference(
              "theme",
              this.prefs.theme === "dark" ? "light" : "dark",
            ),
        },
        { label: "编辑小组件…", action: () => this.widgetPicker() },
      ],
      window: [
        {
          label: "最小化",
          disabled: !win,
          action: () => this.minimize(this.active),
        },
        {
          label: "放大／恢复",
          disabled: !win,
          action: () => this.maximize(this.active),
        },
        { separator: true },
        ...[...this.windows.keys()].map((id) => ({
          label: appInfo[id].name,
          checked: id === this.active,
          action: () => this.restore(id),
        })),
      ],
      help: [
        {
          label: "如何探索这台 Mac",
          action: () =>
            this.dialog({
              title: "欢迎来坐坐",
              body: "<p>Dock 打开应用，拖动标题栏移动窗口。红色关闭，黄色最小化，绿色放大。</p><p>VS Code 会播放音乐，QQ 是预设的聊天体验，“信息”是公开留言墙。Safari 通向 lozic7.com。</p><p>点击右上角放大镜，或者使用 Ctrl + Shift + K 搜索应用。</p>",
            }),
        },
        {
          label: "资源与项目说明",
          action: () =>
            this.open("safari", {
              url: new URL("assets/SOURCES.md", document.baseURI).href,
            }),
        },
      ],
    };
    this.menu(items[kind] || [], anchor);
  }
  dialog({
    title,
    body,
    buttons = [{ id: "ok", label: "好", primary: true }],
    onAction,
    width = 430,
  }) {
    const previous = document.activeElement,
      backdrop = document.createElement("div");
    backdrop.className = "dialog-backdrop";
    backdrop.innerHTML = `<section class="mac-dialog" role="dialog" aria-modal="true" aria-label="${h(title)}" style="width:${width}px"><h2>${h(title)}</h2><div class="dialog-body">${body}</div><footer>${buttons.map((b) => `<button class="mac-button ${b.primary ? "primary" : ""}" data-dialog-action="${h(b.id)}">${h(b.label)}</button>`).join("")}</footer></section>`;
    backdrop.close = () => {
      backdrop.remove();
      if (previous?.isConnected) previous.focus();
    };
    backdrop.onclick = async (e) => {
      const button = e.target.closest("[data-dialog-action]");
      if (!button) return;
      const result = await onAction?.(button.dataset.dialogAction, backdrop);
      if (result !== false) backdrop.close();
    };
    backdrop.onkeydown = (e) => {
      if (e.key === "Tab") {
        const all = [
          ...backdrop.querySelectorAll("button,input,select,textarea,a[href]"),
        ].filter((x) => !x.disabled);
        const first = all[0],
          last = all.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.querySelector("#dialogs").append(backdrop);
    setTimeout(
      () => backdrop.querySelector("input,textarea,button")?.focus(),
      20,
    );
    return backdrop;
  }
  about(id) {
    this.dialog({
      title: id ? `关于 ${appInfo[id].name}` : "Lozic 的 Mac",
      body: `<div class="about-card">${id ? this.appImage(id) : `<img src="${profile.avatar}" alt="Lozic">`}<h3>${h(id ? appInfo[id].name : profile.name)}</h3><p>${h(id ? "个人桌面中的交互体验" : profile.welcome)}</p><small>Personal Mac · 1.0<br>在浏览器里，留下一点生活。</small></div>`,
      buttons: [
        { id: "contact", label: "联系主人" },
        { id: "ok", label: "好", primary: true },
      ],
      onAction: (action) => {
        if (action === "contact") this.open("contacts");
        return true;
      },
    });
  }
  toast(title, description = "", action = null, delay = 4500) {
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `<div class="toast-icon">${icon("chat", 23)}</div><button class="toast-content"><b>${h(title)}</b>${description ? `<span>${h(description)}</span>` : ""}</button><button class="toast-close" aria-label="关闭通知">${icon("close", 14)}</button>`;
    el.querySelector(".toast-content").onclick = () => {
      action?.();
      el.remove();
    };
    el.querySelector(".toast-close").onclick = () => el.remove();
    document.querySelector("#toasts").append(el);
    setTimeout(() => el.remove(), delay);
  }
  notify(title, text, action) {
    this.notifications.unshift({ title, text, action, date: new Date() });
    this.notifications = this.notifications.slice(0, 30);
    this.toast(title, text, action);
  }
  panel(name, body) {
    const root = document.querySelector("#panels");
    if (root.dataset.panel === name) {
      this.closePanel();
      return null;
    }
    root.dataset.panel = name;
    root.innerHTML = `<section class="system-panel panel-${name}">${body}</section>`;
    return root.firstElementChild;
  }
  closePanel() {
    const root = document.querySelector("#panels");
    root.innerHTML = "";
    delete root.dataset.panel;
  }
  controlCenter() {
    const panel = this.panel(
      "controls",
      `<div class="control-tiles"><button data-theme>${icon(this.prefs.theme === "dark" ? "moon" : "sun", 26)}<b>外观</b><small>${this.prefs.theme === "dark" ? "深色" : "浅色"}</small></button><button data-motion>${icon("controls", 26)}<b>动态效果</b><small>${this.prefs.reducedMotion ? "已减少" : "完整"}</small></button><button data-network>${icon("wifi", 26)}<b>网络</b><small>${navigator.onLine ? "在线" : "离线"}</small></button><button data-lock>${icon("lock", 26)}<b>锁定</b><small>点击即可恢复</small></button></div><div class="control-volume"><b>声音</b><label>${icon("volume")}<input aria-label="音乐音量" type="range" min="0" max="1" step=".01" value="${player.audio.volume}"></label></div><div class="control-playing">${this.appImage("vscode")}<div><b>${h(player.track.title)}</b><small>${h(player.track.artist)}</small></div><button class="icon-button" data-player-toggle aria-label="播放或暂停">${icon(player.playing ? "pause" : "play")}</button></div>`,
    );
    if (!panel) return;
    panel.querySelector("[data-theme]").onclick = () => {
      this.setPreference(
        "theme",
        this.prefs.theme === "dark" ? "light" : "dark",
      );
      this.closePanel();
      this.controlCenter();
    };
    panel.querySelector("[data-motion]").onclick = () => {
      this.setPreference("reducedMotion", !this.prefs.reducedMotion);
      this.closePanel();
      this.controlCenter();
    };
    panel.querySelector("[data-network]").onclick = () => this.open("messages");
    panel.querySelector("[data-lock]").onclick = () => this.lock();
    panel.querySelector("input").oninput = (e) =>
      player.setVolume(e.target.value);
    panel.querySelector("[data-player-toggle]").onclick = () =>
      player.active ? player.toggle() : this.open("vscode");
  }
  notificationCenter() {
    const panel = this.panel(
      "notifications",
      `<div class="panel-heading"><b>${new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" })}</b><button class="link-button" data-calendar>打开日历</button></div><h3>通知中心</h3>${this.notifications.length ? this.notifications.map((n, i) => `<button class="notification-row" data-notification="${i}"><b>${h(n.title)}</b><span>${h(n.text)}</span></button>`).join("") : '<div class="panel-empty">没有新通知<br><small>新留言和回复会出现在这里。</small></div>'}<button class="mac-button" data-clear ${!this.notifications.length ? "disabled" : ""}>清除通知</button>`,
    );
    if (!panel) return;
    panel.querySelector("[data-calendar]").onclick = () =>
      this.open("calendar");
    panel.querySelector("[data-clear]").onclick = () => {
      this.notifications = [];
      this.closePanel();
      this.notificationCenter();
    };
    panel.onclick = (e) => {
      const b = e.target.closest("[data-notification]");
      if (b) this.notifications[Number(b.dataset.notification)].action?.();
    };
  }
  spotlight(all = false) {
    this.closePanel();
    const panel = this.panel(
      "spotlight",
      `<label class="spotlight-search">${icon("search", 26)}<input placeholder="搜索应用、联系人和笔记" aria-label="Spotlight 搜索" autocomplete="off"><kbd>esc</kbd></label><div class="spotlight-results"></div>`,
    );
    if (!panel) return;
    const input = panel.querySelector("input"),
      results = panel.querySelector(".spotlight-results");
    let selected = 0;
    const render = () => {
      const q = input.value.trim().toLowerCase();
      selected = 0;
      const apps = Object.entries(appInfo).filter(([id, a]) =>
        `${id} ${a.name} ${a.english || ""}`.toLowerCase().includes(q),
      );
      const notes = q
        ? publicNotes.filter((n) =>
            `${n.title}${n.body}`.toLowerCase().includes(q),
          )
        : [];
      results.innerHTML = `<div class="spotlight-section">应用程序</div><div class="${all && !q ? "app-launcher-grid" : "app-results"}">${apps.map(([id, a]) => `<button data-search-app="${id}">${this.appImage(id)}<span>${h(a.name)}</span>${!all || q ? "<small>应用程序</small>" : ""}</button>`).join("")}</div>${notes.length ? '<div class="spotlight-section">备忘录</div>' : ""}${notes.map((n) => `<button class="spotlight-note" data-search-note="${h(n.id)}">${icon("file")}<span>${h(n.title)}</span></button>`).join("")}${!apps.length && !notes.length ? '<p class="panel-empty">没有找到结果</p>' : ""}`;
      results.querySelector("button")?.classList.add("selected");
    };
    input.oninput = render;
    panel.querySelector("button:not(:disabled)")?.focus();
    el.onkeydown = (e) => {
      const buttons = [...results.querySelectorAll("button")];
      if (["ArrowDown", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        selected = clamp(
          selected + (e.key === "ArrowDown" ? 1 : -1),
          0,
          buttons.length - 1,
        );
        buttons.forEach((b, i) =>
          b.classList.toggle("selected", i === selected),
        );
        buttons[selected]?.scrollIntoView({ block: "nearest" });
      }
      if (e.key === "Enter") {
        e.preventDefault();
        buttons[selected]?.click();
      }
    };
    results.onclick = (e) => {
      const app = e.target.closest("[data-search-app]"),
        note = e.target.closest("[data-search-note]");
      if (app) this.open(app.dataset.searchApp);
      if (note) this.open("notes", { note: note.dataset.searchNote });
    };
    render();
    input.focus();
  }
  lock() {
    this.closePanel();
    const el = document.createElement("button");
    el.className = "lock-screen";
    el.innerHTML = `<time>${new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</time><span>${new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" })}</span><img src="${profile.avatar}" alt=""><b>${h(profile.name)}</b><small>点击任意位置，回到桌面</small>`;
    el.onclick = () => el.remove();
    document.querySelector("#dialogs").append(el);
    el.focus();
  }
}
