import { store, uid, localDate } from "./ui.js";
export const defaultLists = [
  { id: "life", name: "生活", color: "#ed9239" },
  { id: "study", name: "学习", color: "#5c9de0" },
  { id: "wishes", name: "想做的事", color: "#ad78d6" },
];
export function reminderData() {
  const value = store.get("reminders", null);
  return value && Array.isArray(value.items) && Array.isArray(value.lists)
    ? value
    : { lists: defaultLists.map((x) => ({ ...x })), items: [] };
}
export function saveReminderData(data) {
  if (!store.set("reminders", data))
    throw new Error("当前浏览器无法保存，请先备份或释放存储空间。");
}
export function dueTimestamp(item) {
  if (!item.date) return null;
  const stamp = Date.parse(`${item.date}T${item.time || "09:00"}:00`);
  return Number.isFinite(stamp) ? stamp : null;
}
export function validateReminder(item) {
  if (!String(item.title || "").trim()) return "请填写提醒标题";
  if (String(item.title).length > 160) return "标题最多 160 个字";
  if (item.date && !/^\d{4}-\d{2}-\d{2}$/.test(item.date))
    return "日期格式不正确";
  if (item.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.time))
    return "时间格式不正确";
  if (
    item.date &&
    (!Number.isFinite(dueTimestamp(item)) ||
      localDate(new Date(dueTimestamp(item))) !== item.date)
  )
    return "请选择有效日期";
  return "";
}
export function createReminder(input = {}) {
  return {
    id: uid(),
    title: "",
    notes: "",
    date: "",
    time: "",
    listId: "life",
    priority: 0,
    flagged: false,
    completed: false,
    createdAt: Date.now(),
    ...input,
  };
}
export function reminderMatches(item, filter, today = localDate()) {
  if (item.deleted) return false;
  if (filter === "completed") return item.completed;
  if (item.completed) return false;
  if (filter === "today") return Boolean(item.date) && item.date <= today;
  if (filter === "scheduled") return Boolean(item.date);
  if (filter === "flagged") return item.flagged;
  if (filter === "all") return true;
  return item.listId === filter;
}
export function reminderCalendarEvents() {
  return reminderData()
    .items.filter((x) => !x.deleted && !x.completed && x.date)
    .map((x) => ({
      id: `reminder-${x.id}`,
      title: x.title,
      date: x.date,
      time: x.time || "09:00",
      duration: 30,
      notes: x.notes,
      sourceReminder: x.id,
    }));
}
export function updateReminder(id, changes) {
  const data = reminderData(),
    item = data.items.find((x) => x.id === id);
  if (!item) return;
  Object.assign(item, changes, { updatedAt: Date.now() });
  saveReminderData(data);
  return item;
}
