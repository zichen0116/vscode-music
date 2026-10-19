import { milestones } from "../config.js";
import { reminderCalendarEvents } from "../reminders-data.js";
import { h, icon, on, store, localDate, uid, download } from "../ui.js";

const weekdays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
function monday(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}
function dayOffset(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function gridDays(date) {
  return Array.from({ length: 42 }, (_, i) =>
    dayOffset(monday(new Date(date.getFullYear(), date.getMonth(), 1)), i),
  );
}
export function calendarICS(event) {
  const start = new Date(`${event.date}T${event.time || "09:00"}:00`),
    end = new Date(start.getTime() + (Number(event.duration) || 60) * 60000);
  const stamp = (date) =>
    date
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const escape = (value) =>
    String(value || "")
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  return `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Lozic//Personal Mac//ZH\r\nBEGIN:VEVENT\r\nUID:${event.id}@lozic7.com\r\nDTSTAMP:${stamp(new Date())}\r\nDTSTART:${stamp(start)}\r\nDTEND:${stamp(end)}\r\nSUMMARY:${escape(event.title)}\r\nDESCRIPTION:${escape(event.notes)}\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`;
}
export function mountCalendar(ctx) {
  const { root, signal } = ctx;
  let selected = ctx.data.date
      ? new Date(`${ctx.data.date}T12:00:00`)
      : new Date(),
    visible = new Date(selected),
    view = "month",
    search = "",
    showPublic = true,
    showLocal = true,
    events = store.get("calendarEvents", []);
  const allEvents = () => [
    ...(showPublic ? milestones.map((e) => ({ ...e, public: true })) : []),
    ...(showLocal ? events.filter((e) => !e.deleted) : []),
    ...(showLocal ? reminderCalendarEvents() : []),
  ];
  ctx.setTitle("日历");
  root.innerHTML = `<div class="app-toolbar calendar-toolbar"><button class="icon-button" data-cal="sidebar" aria-label="日历侧栏">${icon("sidebar", 20)}</button><button class="icon-button" data-cal="new" aria-label="新建提醒">${icon("plus", 22)}</button><span class="spacer"></span><div class="segmented">${[
    ["day", "日"],
    ["week", "周"],
    ["month", "月"],
  ]
    .map(([v, l]) => `<button data-view="${v}">${l}</button>`)
    .join(
      "",
    )}</div><span class="spacer"></span><label class="search-field">${icon("search", 14)}<input placeholder="搜索日程" aria-label="搜索日程"></label></div><div class="calendar-app"><aside class="calendar-sidebar"><div class="calendar-mini"></div><h4>我的日历</h4><label class="calendar-check public"><input type="checkbox" data-public checked> Lozic 的里程碑</label><label class="calendar-check local"><input type="checkbox" data-local checked> 我的本地提醒</label><div class="calendar-agenda"></div><p class="calendar-local-note">你添加的提醒只保存在此浏览器。</p></aside><section class="calendar-main"><header><h1></h1><span class="spacer"></span><button class="icon-button" data-cal="previous" aria-label="上一期">${icon("back", 17)}</button><button class="mac-button" data-cal="today">今天</button><button class="icon-button" data-cal="next" aria-label="下一期">${icon("forward", 17)}</button></header><div class="calendar-view"></div></section></div>`;
  function render() {
    const today = localDate();
    root
      .querySelectorAll("[data-view]")
      .forEach((b) => b.classList.toggle("active", b.dataset.view === view));
    root.querySelector(".calendar-main>header h1").innerHTML =
      `<b>${visible.getMonth() + 1}月</b> <span>${visible.getFullYear()}</span>`;
    root.querySelector(".calendar-mini").innerHTML =
      `<b>${visible.getFullYear()}年 ${visible.getMonth() + 1}月</b><div>${weekdays.map((d) => `<small>${d.slice(1)}</small>`).join("")}${gridDays(
        visible,
      )
        .map(
          (d) =>
            `<button class="${d.getMonth() !== visible.getMonth() ? "outside" : ""} ${localDate(d) === today ? "today" : ""} ${localDate(d) === localDate(selected) ? "selected" : ""}" data-date="${localDate(d)}">${d.getDate()}</button>`,
        )
        .join("")}</div>`;
    const shown = allEvents().filter((e) =>
        e.title.toLowerCase().includes(search),
      ),
      agenda = search
        ? shown
        : shown.filter((e) => e.date === localDate(selected));
    root.querySelector(".calendar-agenda").innerHTML =
      `<h4>${search ? "搜索结果" : `${selected.getMonth() + 1}月${selected.getDate()}日`}</h4>${agenda.map((e) => `<button class="calendar-agenda-event ${e.public ? "public" : ""}" data-event="${h(e.id)}"><b>${h(e.title)}</b><span>${search ? h(e.date) + " " : ""}${h(e.time || "全天")}</span></button>`).join("") || "<p>这一天，留一点空白。</p>"}`;
    const canvas = root.querySelector(".calendar-view");
    if (view === "month")
      canvas.innerHTML = `<div class="calendar-weekdays">${weekdays.map((d) => `<span>${d}</span>`).join("")}</div><div class="calendar-month">${gridDays(
        visible,
      )
        .map((d) => {
          const date = localDate(d);
          return `<div class="calendar-day ${d.getMonth() !== visible.getMonth() ? "outside" : ""} ${date === localDate(selected) ? "selected" : ""}"><button class="calendar-day-number ${date === today ? "today" : ""}" data-date="${date}">${d.getDate()}</button><div class="calendar-day-events">${shown
            .filter((e) => e.date === date)
            .map(
              (e) =>
                `<button class="calendar-event ${e.public ? "public" : ""}" data-event="${h(e.id)}">${h(e.time || "")} ${h(e.title)}</button>`,
            )
            .join(
              "",
            )}</div><button class="calendar-cell-add" data-new-date="${date}" aria-label="在 ${date} 新建提醒"></button></div>`;
        })
        .join("")}</div>`;
    else {
      const dates =
        view === "day"
          ? [selected]
          : Array.from({ length: 7 }, (_, i) => dayOffset(monday(selected), i));
      canvas.innerHTML = `<div class="calendar-time-view" style="--days:${dates.length}"><div class="calendar-time-head"><span></span>${dates.map((d) => `<button data-date="${localDate(d)}" class="${localDate(d) === today ? "today" : ""}">${weekdays[(d.getDay() + 6) % 7]} <b>${d.getDate()}</b></button>`).join("")}</div><div class="calendar-hour-grid">${Array.from(
        { length: 24 },
        (_, hour) =>
          `<span class="calendar-hour-label">${String(hour).padStart(2, "0")}:00</span>${dates
            .map((d) => {
              const date = localDate(d),
                items = shown.filter(
                  (e) =>
                    e.date === date &&
                    Number((e.time || "09:00").split(":")[0]) === hour,
                );
              return `<div class="calendar-time-slot"><button data-new-date="${date}" data-hour="${hour}" aria-label="${date} ${hour}点新建提醒"></button>${items.map((e) => `<button class="calendar-event ${e.public ? "public" : ""}" data-event="${h(e.id)}">${h(e.time)} ${h(e.title)}</button>`).join("")}</div>`;
            })
            .join("")}`,
      ).join("")}</div></div>`;
    }
  }
  function editEvent(event, defaultDate = localDate(selected), hour = 9) {
    if (event?.sourceReminder) {
      ctx.open("reminders", { editId: event.sourceReminder });
      return;
    }
    const original = event,
      readonly = event?.public;
    const dialog = ctx.dialog({
      title: readonly ? "公开日程" : event ? "编辑本地提醒" : "新建本地提醒",
      body: `<label class="form-field">标题<input name="title" maxlength="80" value="${h(event?.title || "")}" ${readonly ? "readonly" : ""} required></label><div class="calendar-event-fields"><label class="form-field">日期<input name="date" type="date" value="${event?.date || defaultDate}" ${readonly ? "readonly" : ""} required></label><label class="form-field">时间<input name="time" type="time" value="${event?.time || `${String(hour).padStart(2, "0")}:00`}" ${readonly ? "readonly" : ""} required></label><label class="form-field">分钟<input name="duration" type="number" min="5" max="1440" value="${event?.duration || 60}" ${readonly ? "readonly" : ""}></label></div><label class="form-field">备注<textarea name="notes" rows="3" ${readonly ? "readonly" : ""}>${h(event?.notes || "")}</textarea></label><p class="settings-caption">${readonly ? "这是主人的公开日程。" : "此提醒仅保存在当前浏览器，不会上传。"}</p><div class="form-error"></div>`,
      buttons: readonly
        ? [
            { id: "export", label: "导出日程" },
            { id: "done", label: "完成", primary: true },
          ]
        : [
            { id: "cancel", label: "取消" },
            ...(event
              ? [
                  { id: "delete", label: "删除" },
                  { id: "export", label: "导出" },
                ]
              : []),
            { id: "save", label: "保存", primary: true },
          ],
      onAction: (id, el) => {
        if (id === "delete") {
          events.find((e) => e.id === original.id).deleted = true;
          store.set("calendarEvents", events);
          render();
          ctx.toast("提醒已删除", "点击这条通知可以撤销。", () => {
            events.find((e) => e.id === original.id).deleted = false;
            store.set("calendarEvents", events);
            render();
          });
          return true;
        }
        if (id === "save" || id === "export") {
          const inputs = [...el.querySelectorAll("input")];
          if (inputs.some((i) => !i.reportValidity())) return false;
          const get = (name) => el.querySelector(`[name=${name}]`).value;
          const value = {
            id: original?.id || uid(),
            title: get("title").trim(),
            date: get("date"),
            time: get("time"),
            duration: Number(get("duration")),
            notes: get("notes"),
          };
          if (!value.title) {
            el.querySelector(".form-error").textContent = "请填写提醒标题";
            return false;
          }
          if (id === "export") {
            download(
              `${value.title}.ics`,
              calendarICS(value),
              "text/calendar;charset=utf-8",
            );
            return false;
          }
          events = events.filter((e) => e.id !== value.id);
          events.push(value);
          store.set("calendarEvents", events);
          selected = new Date(`${value.date}T12:00:00`);
          visible = new Date(selected);
          render();
        }
        return true;
      },
    });
  }
  on(
    root,
    "click",
    "[data-date]",
    (e, b) => {
      selected = new Date(`${b.dataset.date}T12:00:00`);
      if (selected.getMonth() !== visible.getMonth())
        visible = new Date(selected);
      render();
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-view]",
    (e, b) => {
      view = b.dataset.view;
      render();
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-event]",
    (e, b) =>
      editEvent(allEvents().find((x) => String(x.id) === b.dataset.event)),
    signal,
  );
  on(
    root,
    "dblclick",
    "[data-new-date]",
    (e, b) => editEvent(null, b.dataset.newDate, Number(b.dataset.hour || 9)),
    signal,
  );
  on(
    root,
    "keydown",
    "[data-new-date]",
    (e, b) => {
      if (e.key === "Enter") {
        e.preventDefault();
        editEvent(null, b.dataset.newDate, Number(b.dataset.hour || 9));
      }
    },
    signal,
  );
  on(
    root,
    "input",
    ".calendar-toolbar input",
    (e, b) => {
      search = b.value.toLowerCase();
      render();
    },
    signal,
  );
  on(
    root,
    "change",
    "[data-public],[data-local]",
    (e, b) => {
      if (b.hasAttribute("data-public")) showPublic = b.checked;
      else showLocal = b.checked;
      render();
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-cal]",
    (e, b) => {
      const a = b.dataset.cal;
      if (a === "sidebar")
        root.querySelector(".calendar-sidebar").hidden =
          !root.querySelector(".calendar-sidebar").hidden;
      if (a === "new") editEvent(null);
      if (a === "today") {
        selected = new Date();
        visible = new Date(selected);
        render();
      }
      if (a === "previous" || a === "next") {
        const step = a === "next" ? 1 : -1;
        if (view === "month")
          visible = new Date(
            visible.getFullYear(),
            visible.getMonth() + step,
            1,
          );
        else {
          selected = dayOffset(selected, step * (view === "week" ? 7 : 1));
          visible = new Date(selected);
        }
        render();
      }
    },
    signal,
  );
  window.addEventListener(
    "lozic:storage",
    (e) => {
      if (e.detail.key === "reminders") render();
    },
    { signal },
  );
  render();
  return {
    receive(data) {
      if (data.date) {
        selected = new Date(`${data.date}T12:00:00`);
        visible = new Date(selected);
        render();
      }
    },
    menus: {
      file: [
        { label: "新建本地提醒", action: () => editEvent(null) },
        {
          label: "回到今天",
          action: () => root.querySelector("[data-cal=today]").click(),
        },
      ],
    },
  };
}
