import { publicWishes } from "../config.js";
import { h, icon, on, localDate, timeLabel, uid, empty } from "../ui.js";
import {
  reminderData,
  saveReminderData,
  createReminder,
  validateReminder,
  reminderMatches,
} from "../reminders-data.js";

export function mountReminders(ctx) {
  const { root, signal } = ctx;
  let filter = "today",
    query = "";
  const smart = [
    ["today", "今天", "calendar"],
    ["scheduled", "计划", "calendar"],
    ["all", "全部", "tray"],
    ["flagged", "重要", "pin"],
    ["completed", "已完成", "check"],
  ];
  ctx.setTitle("提醒事项");
  root.innerHTML = `<div class="reminders-app"><aside class="reminders-sidebar"><label class="search-field">${icon("search", 15)}<input aria-label="搜索提醒" placeholder="搜索"></label><div class="reminder-smart-lists"></div><div class="reminder-list-heading"><b>我的清单</b><button class="icon-button" data-reminder="new-list" aria-label="新建清单">${icon("plus", 16)}</button></div><nav class="reminder-custom-lists"></nav><button class="sidebar-item" data-filter="public">${icon("heart", 16)}Lozic 的愿望清单</button><small>我的待办只保存在此浏览器</small></aside><main class="reminders-main"></main></div>`;
  function commit(data) {
    try {
      saveReminderData(data);
      return true;
    } catch (error) {
      ctx.toast("未能保存", error.message);
      return false;
    }
  }
  function render() {
    const data = reminderData(),
      today = localDate(),
      draft = root.querySelector("[name=quick]")?.value || "";
    root.querySelector(".reminder-smart-lists").innerHTML = smart
      .map(
        ([id, name, symbol]) =>
          `<button class="reminder-smart ${filter === id ? "selected" : ""}" data-filter="${id}"><span>${icon(symbol, 20)}</span><b>${data.items.filter((i) => reminderMatches(i, id, today)).length}</b><strong>${name}</strong></button>`,
      )
      .join("");
    root.querySelector(".reminder-custom-lists").innerHTML = data.lists
      .map(
        (l) =>
          `<button class="sidebar-item ${filter === l.id ? "active" : ""}" data-filter="${h(l.id)}"><span class="reminder-list-dot" style="background:${/^#[\da-f]{6}$/i.test(l.color) ? l.color : "#ed9239"}">${icon("list", 14)}</span>${h(l.name)}<small>${data.items.filter((i) => reminderMatches(i, l.id, today)).length}</small></button>`,
      )
      .join("");
    const main = root.querySelector(".reminders-main");
    if (filter === "public") {
      main.innerHTML = `<header><h1>Lozic 的愿望清单</h1></header>${publicWishes.length ? publicWishes.map((w) => `<article class="public-wish"><span>${icon(w.completed ? "check" : "heart", 20)}</span><div><h3>${h(w.title)}</h3><p>${h(w.notes || "")}</p></div></article>`).join("") : empty("给未来留一点空间", "主人公开的愿望和想做的事，会放在这里。", "heart")}`;
      return;
    }
    const list = data.lists.find((l) => l.id === filter),
      title =
        smart.find((x) => x[0] === filter)?.[1] || list?.name || "提醒事项";
    const items = data.items
      .filter(
        (i) =>
          reminderMatches(i, filter, today) &&
          `${i.title} ${i.notes}`.toLowerCase().includes(query),
      )
      .sort(
        (a, b) =>
          Number(b.priority) - Number(a.priority) ||
          String(a.date || "9999").localeCompare(String(b.date || "9999")),
      );
    main.innerHTML = `<header><h1>${h(title)}</h1><b>${items.length}</b><span class="spacer"></span>${list ? '<button class="icon-button" data-reminder="edit-list" aria-label="编辑清单">' + icon("more", 20) + "</button>" : ""}<button class="icon-button" data-reminder="new" aria-label="新建提醒">${icon("plus", 23)}</button></header><div class="reminders-list">${items.map((item) => `<article class="reminder-row ${item.completed ? "completed" : ""}"><button class="reminder-check" data-check="${h(item.id)}" aria-label="${item.completed ? "取消完成" : "完成"} ${h(item.title)}">${item.completed ? icon("check", 13) : ""}</button><button class="reminder-row-content" data-edit="${h(item.id)}"><b>${item.priority ? "!".repeat(item.priority) + " " : ""}${h(item.title)}</b>${item.notes ? `<span>${h(item.notes)}</span>` : ""}<small class="${item.date && item.date < today ? "overdue" : ""}">${item.date ? `${h(item.date)} ${h(item.time)}` : "无日期"}${item.sourceNote ? " · 关联笔记" : ""}</small></button><button class="icon-button ${item.flagged ? "flagged" : ""}" data-flag="${h(item.id)}" aria-label="${item.flagged ? "取消重要标记" : "标记重要"}">${icon("pin", 16)}</button><button class="icon-button" data-edit="${h(item.id)}" aria-label="提醒详情">${icon("info", 17)}</button></article>`).join("") || '<div class="reminders-empty">' + (filter === "completed" ? "完成的事情，会在这里留下记录。" : "今天，可以从一件小事开始。") + "</div>"}</div>${filter !== "completed" ? `<form class="reminder-quick"><span>＋</span><input name="quick" aria-label="快速添加提醒" placeholder="添加一件要做的事…" maxlength="160" value="${h(draft)}" required><button type="submit">添加</button></form>` : ""}`;
  }
  function edit(item = null, seed = {}) {
    const data = reminderData(),
      original = item,
      value =
        item ||
        createReminder({
          listId: data.lists.some((l) => l.id === filter)
            ? filter
            : data.lists[0]?.id || "life",
          date: filter === "today" ? localDate() : "",
          ...seed,
        });
    ctx
      .dialog({
        title: original ? "提醒详情" : "新建提醒",
        width: 470,
        body: `<label class="form-field">标题<input name="title" maxlength="160" value="${h(value.title)}" required></label><label class="form-field">备注<textarea name="notes" rows="3" maxlength="3000">${h(value.notes)}</textarea></label><div class="reminder-detail-grid"><label class="form-field">日期<input type="date" name="date" value="${h(value.date)}"></label><label class="form-field">时间<input type="time" name="time" value="${h(value.time)}"></label></div><div class="reminder-detail-grid"><label class="form-field">清单<select name="listId">${data.lists.map((l) => `<option value="${h(l.id)}" ${l.id === value.listId ? "selected" : ""}>${h(l.name)}</option>`).join("")}</select></label><label class="form-field">优先级<select name="priority">${["无", "低", "中", "高"].map((label, i) => `<option value="${i}" ${i === value.priority ? "selected" : ""}>${label}</option>`).join("")}</select></label></div><label class="reminder-important"><input type="checkbox" name="flagged" ${value.flagged ? "checked" : ""}> 标记为重要</label>${value.sourceNote ? `<button class="link-button" data-source-note="${h(value.sourceNote)}">查看关联笔记 →</button>` : ""}<div class="form-error" role="status"></div>`,
        buttons: [
          { id: "cancel", label: "取消" },
          ...(original
            ? [
                { id: "delete", label: "删除" },
                { id: "calendar", label: "查看日历" },
              ]
            : []),
          { id: "save", label: "保存", primary: true },
        ],
        onAction: (action, dialog) => {
          if (action === "calendar") {
            ctx.open("calendar", { date: value.date || localDate() });
            return true;
          }
          if (action === "delete") {
            const fresh = reminderData(),
              target = fresh.items.find((i) => i.id === value.id);
            if (target) target.deleted = true;
            if (!commit(fresh)) return false;
            ctx.desktop.updateTrash();
            ctx.toast("提醒已移到废纸篓");
            return true;
          }
          if (action !== "save") return true;
          const get = (name) => dialog.querySelector(`[name=${name}]`),
            next = {
              ...value,
              title: get("title").value.trim(),
              notes: get("notes").value.trim(),
              date: get("date").value,
              time: get("date").value ? get("time").value : "",
              listId: get("listId").value,
              priority: Number(get("priority").value),
              flagged: get("flagged").checked,
              updatedAt: Date.now(),
              notifiedAt: null,
            };
          const error = validateReminder(next);
          if (error) {
            dialog.querySelector(".form-error").textContent = error;
            return false;
          }
          const fresh = reminderData();
          fresh.items = fresh.items.filter((i) => i.id !== next.id);
          fresh.items.push(next);
          return commit(fresh);
        },
      })
      .querySelector("[data-source-note]")
      ?.addEventListener("click", (e) =>
        ctx.open("notes", { note: e.currentTarget.dataset.sourceNote }),
      );
  }
  function editList(existing) {
    const data = reminderData();
    ctx.dialog({
      title: existing ? "编辑清单" : "新建清单",
      body: `<label class="form-field">名称<input name="name" value="${h(existing?.name || "")}" maxlength="40" required></label><label class="form-field">颜色<select name="color">${[
        ["#ed9239", "橙色"],
        ["#5c9de0", "蓝色"],
        ["#ad78d6", "紫色"],
        ["#58ad82", "绿色"],
        ["#df6a83", "粉色"],
      ]
        .map(
          ([color, label]) =>
            `<option value="${color}" ${existing?.color === color ? "selected" : ""}>${label}</option>`,
        )
        .join("")}</select></label><div class="form-error"></div>`,
      buttons: [
        { id: "cancel", label: "取消" },
        ...(existing && data.lists.length > 1
          ? [{ id: "delete", label: "删除清单" }]
          : []),
        { id: "save", label: "保存", primary: true },
      ],
      onAction: (action, dialog) => {
        if (action === "delete") {
          const fresh = reminderData(),
            fallback = fresh.lists.find((l) => l.id !== existing.id);
          fresh.lists = fresh.lists.filter((l) => l.id !== existing.id);
          fresh.items.forEach((i) => {
            if (i.listId === existing.id) i.listId = fallback.id;
          });
          filter = "all";
          if (commit(fresh))
            ctx.toast("清单已删除", "其中的提醒已移到另一清单。");
          return true;
        }
        if (action !== "save") return true;
        const name = dialog.querySelector("[name=name]").value.trim();
        if (!name) {
          dialog.querySelector(".form-error").textContent = "请填写清单名称";
          return false;
        }
        const fresh = reminderData(),
          next = {
            id: existing?.id || uid(),
            name,
            color: dialog.querySelector("[name=color]").value,
          };
        fresh.lists = fresh.lists.filter((l) => l.id !== next.id);
        fresh.lists.push(next);
        filter = next.id;
        return commit(fresh);
      },
    });
  }
  on(
    root,
    "input",
    '[aria-label="搜索提醒"]',
    (e, b) => {
      query = b.value.toLowerCase();
      render();
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-filter]",
    (e, b) => {
      filter = b.dataset.filter;
      render();
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-check]",
    (e, b) => {
      const data = reminderData(),
        item = data.items.find((i) => i.id === b.dataset.check);
      if (!item) return;
      item.completed = !item.completed;
      item.completedAt = item.completed ? Date.now() : null;
      if (commit(data) && item.completed) ctx.toast("完成一件小事", item.title);
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-flag]",
    (e, b) => {
      const data = reminderData(),
        item = data.items.find((i) => i.id === b.dataset.flag);
      if (item) {
        item.flagged = !item.flagged;
        commit(data);
      }
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-edit]",
    (e, b) => edit(reminderData().items.find((i) => i.id === b.dataset.edit)),
    signal,
  );
  on(
    root,
    "click",
    "[data-reminder]",
    (e, b) => {
      if (b.dataset.reminder === "new") edit();
      if (b.dataset.reminder === "new-list") editList();
      if (b.dataset.reminder === "edit-list")
        editList(reminderData().lists.find((l) => l.id === filter));
    },
    signal,
  );
  root.addEventListener(
    "submit",
    (e) => {
      if (!e.target.matches(".reminder-quick")) return;
      e.preventDefault();
      const input = e.target.elements.quick,
        title = input.value.trim();
      if (!title) return;
      const data = reminderData(),
        item = createReminder({
          title,
          listId: data.lists.some((l) => l.id === filter)
            ? filter
            : data.lists[0]?.id || "life",
          date: filter === "today" ? localDate() : "",
        });
      data.items.push(item);
      input.value = "";
      if (!commit(data)) input.value = title;
    },
    { signal },
  );
  window.addEventListener(
    "lozic:storage",
    (e) => {
      if (e.detail.key === "reminders") render();
    },
    { signal },
  );
  render();
  if (ctx.data.create) edit(null, ctx.data.create);
  if (ctx.data.editId)
    edit(reminderData().items.find((i) => i.id === ctx.data.editId));
  return {
    receive(data) {
      if (data.filter) {
        filter = data.filter;
        render();
      }
      if (data.create) edit(null, data.create);
      if (data.editId)
        edit(reminderData().items.find((i) => i.id === data.editId));
      if (data.reload) render();
    },
    menus: {
      file: [
        { label: "新建提醒", action: () => edit() },
        { label: "新建清单", action: () => editList() },
      ],
    },
  };
}
