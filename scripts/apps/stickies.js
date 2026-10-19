import { h, icon, on, store, uid, clamp, empty } from "../ui.js";
export const stickyColors = {
  yellow: "奶油黄",
  pink: "樱花粉",
  blue: "天空蓝",
  green: "薄荷绿",
  purple: "淡紫色",
};
function notes() {
  return store.get("stickies", []);
}
function change(id, update) {
  const all = notes(),
    note = all.find((n) => n.id === id);
  if (note) {
    Object.assign(note, update, { updatedAt: Date.now() });
    if (!store.set("stickies", all)) return null;
  }
  return note;
}
export function mountDesktopStickies(desktop) {
  const layer = document.createElement("section");
  layer.id = "desktop-stickies";
  layer.setAttribute("aria-label", "桌面便签");
  document.querySelector("#desktop").append(layer);
  function render() {
    const visible = notes().filter((n) => !n.deleted && n.pinned);
    layer.querySelectorAll("[data-sticky-id]").forEach((el) => {
      if (!visible.some((n) => n.id === el.dataset.stickyId)) el.remove();
    });
    for (const note of visible) {
      let el = layer.querySelector(`[data-sticky-id="${CSS.escape(note.id)}"]`);
      if (!el) {
        el = document.createElement("article");
        el.className = "desktop-sticky";
        el.dataset.stickyId = note.id;
        el.innerHTML = `<header data-sticky-drag><button data-sticky="hide" aria-label="从桌面收起便签">${icon("close", 11)}</button><b></b><button data-sticky="colors" aria-label="便签颜色">${icon("more", 14)}</button><button data-sticky="collapse" aria-label="展开或折叠便签">${icon("chevron", 12)}</button></header><textarea aria-label="桌面便签内容" placeholder="记一句今天…" maxlength="10000"></textarea><span class="sticky-resize" data-sticky-resize></span>`;
        layer.append(el);
      }
      el.dataset.color = stickyColors[note.color] ? note.color : "yellow";
      el.classList.toggle("collapsed", !!note.collapsed);
      const width = clamp(note.w || 230, 190, Math.min(420, innerWidth - 24)),
        height = clamp(note.h || 190, 120, 340);
      if (!el.classList.contains("dragging"))
        Object.assign(el.style, {
          left: `${clamp(note.x || 390, 12, innerWidth - width - 12)}px`,
          top: `${clamp(note.y || 60, 36, innerHeight - (note.collapsed ? 28 : height) - 100)}px`,
          width: `${width}px`,
          height: note.collapsed ? "28px" : `${height}px`,
        });
      el.querySelector("header b").textContent = (note.body || "新便签")
        .split("\n")[0]
        .slice(0, 26);
      const input = el.querySelector("textarea");
      if (document.activeElement !== input) input.value = note.body || "";
    }
  }
  let saveWarningShown = false;
  on(layer, "input", "textarea", (e, input) => {
    const ok = change(input.closest("[data-sticky-id]").dataset.stickyId, {
      body: input.value,
    });
    input.setAttribute("aria-invalid", String(!ok));
    if (!ok && !saveWarningShown)
      desktop.toast("便签暂时无法保存", "请复制当前内容后再关闭页面。");
    saveWarningShown = !ok;
  });
  on(layer, "click", "[data-sticky]", (e, b) => {
    const el = b.closest("[data-sticky-id]"),
      note = notes().find((n) => n.id === el.dataset.stickyId);
    if (!note) return;
    const action = b.dataset.sticky;
    if (action === "hide") change(note.id, { pinned: false });
    if (action === "collapse") change(note.id, { collapsed: !note.collapsed });
    if (action === "colors")
      desktop.menu(
        [
          ...Object.entries(stickyColors).map(([color, name]) => ({
            label: name,
            checked: note.color === color,
            action: () => change(note.id, { color }),
          })),
          { separator: true },
          {
            label: "在便签中管理",
            action: () => desktop.open("stickies", { editId: note.id }),
          },
          {
            label: "转为备忘录",
            action: () =>
              desktop.open("notes", {
                create: {
                  title: (note.body || "便签").split("\n")[0].slice(0, 100),
                  body: note.body || "",
                },
              }),
          },
        ],
        b,
      );
  });
  layer.addEventListener("pointerdown", (e) => {
    const el = e.target.closest("[data-sticky-id]");
    if (!el || e.button !== 0 || e.target.closest("button,textarea")) return;
    const resize = e.target.hasAttribute("data-sticky-resize");
    if (!resize && !e.target.closest("[data-sticky-drag]")) return;
    e.preventDefault();
    const x = e.clientX,
      y = e.clientY,
      origin = {
        x: el.offsetLeft,
        y: el.offsetTop,
        w: el.offsetWidth,
        h: el.offsetHeight,
      };
    el.setPointerCapture(e.pointerId);
    el.classList.add("dragging");
    const move = (ev) => {
      const dx = ev.clientX - x,
        dy = ev.clientY - y;
      if (resize) {
        el.style.width = `${clamp(origin.w + dx, 190, Math.min(420, innerWidth - origin.x - 12))}px`;
        el.style.height = `${clamp(origin.h + dy, 120, Math.min(340, innerHeight - origin.y - 100))}px`;
      } else {
        el.style.left = `${clamp(origin.x + dx, 12, innerWidth - el.offsetWidth - 12)}px`;
        el.style.top = `${clamp(origin.y + dy, 36, innerHeight - el.offsetHeight - 100)}px`;
      }
    };
    const end = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", end);
      el.removeEventListener("pointercancel", end);
      el.classList.remove("dragging");
      const update = { x: el.offsetLeft, y: el.offsetTop };
      if (resize) {
        update.w = el.offsetWidth;
        update.h = el.offsetHeight;
      }
      change(el.dataset.stickyId, update);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  });
  layer.addEventListener("contextmenu", (e) => {
    const el = e.target.closest("[data-sticky-id]");
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    desktop.menu(
      [
        {
          label: "编辑便签",
          action: () =>
            desktop.open("stickies", { editId: el.dataset.stickyId }),
        },
        {
          label: "从桌面收起",
          action: () => change(el.dataset.stickyId, { pinned: false }),
        },
      ],
      e,
    );
  });
  window.addEventListener("lozic:storage", (e) => {
    if (e.detail.key === "stickies") render();
  });
  window.addEventListener("resize", render);
  render();
}
export function mountStickies(ctx) {
  const { root, signal } = ctx;
  ctx.setTitle("便签");
  root.innerHTML = `<div class="app-toolbar"><b>便签</b><span class="spacer"></span><button class="mac-button" data-sticky-app="desktop">显示桌面</button><button class="mac-button primary" data-sticky-app="new">${icon("plus", 15)}新建便签</button></div><div class="stickies-board"></div>`;
  function render() {
    const list = notes().filter((n) => !n.deleted);
    root.querySelector(".stickies-board").innerHTML = list.length
      ? list
          .map(
            (n) =>
              `<article class="sticky-board-card" data-color="${stickyColors[n.color] ? n.color : "yellow"}"><button class="sticky-card-body" data-edit-sticky="${h(n.id)}"><b>${h((n.body || "新便签").split("\n")[0].slice(0, 35))}</b><p>${h(n.body || "还没有内容")}</p></button><footer><button data-pin-sticky="${h(n.id)}">${n.pinned ? "从桌面收起" : "贴到桌面"}</button><small>仅此浏览器</small></footer></article>`,
          )
          .join("")
      : empty(
          "贴一点小小的想法",
          "便签可以放在桌面上，自由移动、换色和折叠。",
          "file",
        );
  }
  function edit(note = null) {
    ctx.dialog({
      title: note ? "编辑便签" : "新建便签",
      body: `<textarea class="sticky-editor-input" name="body" rows="7" maxlength="10000" aria-label="便签内容" placeholder="记一句今天…">${h(note?.body || "")}</textarea><label class="form-field">颜色<select name="color">${Object.entries(
        stickyColors,
      )
        .map(
          ([id, name]) =>
            `<option value="${id}" ${note?.color === id ? "selected" : ""}>${name}</option>`,
        )
        .join(
          "",
        )}</select></label><label class="reminder-important"><input name="pinned" type="checkbox" ${note?.pinned !== false ? "checked" : ""}>贴到桌面</label><div class="form-error"></div>`,
      buttons: [
        { id: "cancel", label: "取消" },
        ...(note ? [{ id: "delete", label: "删除" }] : []),
        { id: "save", label: "保存", primary: true },
      ],
      onAction: (action, dialog) => {
        if (action === "delete") {
          if (!change(note.id, { deleted: true, pinned: false })) {
            dialog.querySelector(".form-error").textContent =
              "未能删除，请稍后重试。";
            return false;
          }
          ctx.desktop.updateTrash();
          return true;
        }
        if (action !== "save") return true;
        const body = dialog.querySelector("textarea").value;
        if (!body.trim()) {
          dialog.querySelector(".form-error").textContent =
            "写一点内容再保存吧。";
          return false;
        }
        const value = {
          body,
          color: dialog.querySelector("select").value,
          pinned: dialog.querySelector("[name=pinned]").checked,
        };
        if (note) {
          if (!change(note.id, value)) {
            dialog.querySelector(".form-error").textContent =
              "未能保存，请先复制内容。";
            return false;
          }
        } else {
          const data = notes();
          data.push({
            id: uid(),
            ...value,
            x: 390 + (data.length % 4) * 24,
            y: 58 + (data.length % 5) * 24,
            w: 230,
            h: 190,
            createdAt: Date.now(),
          });
          if (!store.set("stickies", data)) {
            dialog.querySelector(".form-error").textContent =
              "未能保存，请先复制内容。";
            return false;
          }
        }
        return true;
      },
    });
  }
  on(
    root,
    "click",
    "[data-edit-sticky]",
    (e, b) => edit(notes().find((n) => n.id === b.dataset.editSticky)),
    signal,
  );
  on(
    root,
    "click",
    "[data-pin-sticky]",
    (e, b) => {
      const n = notes().find((n) => n.id === b.dataset.pinSticky);
      if (n) change(n.id, { pinned: !n.pinned });
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-sticky-app]",
    (e, b) => {
      if (b.dataset.stickyApp === "new") edit();
      else ctx.desktop.showDesktop();
    },
    signal,
  );
  window.addEventListener(
    "lozic:storage",
    (e) => {
      if (e.detail.key === "stickies") render();
    },
    { signal },
  );
  render();
  if (ctx.data.create) edit();
  if (ctx.data.editId) edit(notes().find((n) => n.id === ctx.data.editId));
  return {
    receive(data) {
      if (data.create) edit();
      if (data.editId) edit(notes().find((n) => n.id === data.editId));
      if (data.reload) render();
    },
    menus: {
      file: [
        { label: "新建便签", action: () => edit() },
        { label: "显示桌面", action: () => ctx.desktop.showDesktop() },
      ],
    },
  };
}
