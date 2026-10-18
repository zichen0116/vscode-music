import { guestbookConfig, tracks } from "./config.js";
import { store } from "./ui.js";

export function commentText(comment) {
  const original = typeof comment.orig === "string" ? comment.orig : null;
  if (original !== null) return original;
  const html = String(comment.comment || "")
    .replace(/<(script|style|iframe|object|svg)[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<br\s*\/?>|<\/(p|div|li|blockquote|h[1-6])\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "");
  if (typeof document !== "undefined") {
    const decoder = document.createElement("textarea");
    decoder.innerHTML = html;
    return decoder.value.trim();
  }
  return html
    .replace(
      /&(?:amp|lt|gt|quot|apos|#39);/g,
      (s) =>
        ({
          "&amp;": "&",
          "&lt;": "<",
          "&gt;": ">",
          "&quot;": '"',
          "&apos;": "'",
          "&#39;": "'",
        })[s],
    )
    .trim();
}
export function parseCard(text) {
  let track = null;
  const body = String(text).replace(/\[Lozic:track:([^\]]+)\]/g, (raw, id) => {
    const found = tracks.find((t) => t.id === id);
    if (found) {
      track = found;
      return "";
    }
    return raw;
  });
  return { text: body.trim(), track };
}
export function isOwner(comment) {
  return (
    comment.type === "administrator" &&
    comment.user_id !== undefined &&
    comment.user_id !== null
  );
}
export function validateMessage(nick, text) {
  if (!nick.trim() || Array.from(nick.trim()).length > 24)
    return "昵称须为 1–24 个字符";
  if (!text.trim() || Array.from(text.trim()).length > 1000)
    return "内容须为 1–1000 个字符";
  return "";
}
export class Guestbook extends EventTarget {
  constructor(config = guestbookConfig) {
    super();
    this.config = { ...config };
    this.local =
      typeof location !== "undefined" &&
      ["127.0.0.1", "localhost", "::1"].includes(location.hostname) &&
      config.localPreview &&
      !config.serverURL;
    this.server = this.local
      ? "http://127.0.0.1:8360"
      : config.serverURL.trim().replace(/\/$/, "");
    this.path = this.local ? "personal-mac/guestbook-test" : config.path;
    this.items = [];
    this.totalPages = 1;
    this.pages = 1;
    this.count = 0;
    this.loading = false;
    this.error = "";
    this.refs = 0;
    this.seen = new Set();
    this.baseline = false;
    this.read = store.get(`read:${this.path}`, {});
    this.pending = store.get(`pending:${this.path}`, []);
    if (typeof document !== "undefined")
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden && this.refs) this.refresh();
      });
  }
  get configured() {
    return Boolean(this.server);
  }
  get key() {
    return `pending:${this.path}`;
  }
  emit() {
    this.dispatchEvent(new Event("change"));
  }
  async request(path, options = {}) {
    if (!this.configured) throw new Error("留言服务尚未配置");
    let response;
    try {
      response = await fetch(`${this.server}${path}`, {
        ...options,
        headers: { "Content-Type": "application/json", ...options.headers },
        signal: AbortSignal.timeout(15000),
      });
    } catch (error) {
      throw new Error(
        options.method === "POST"
          ? "发送结果暂未确认，请刷新留言后再决定是否重试。草稿已经保留。"
          : this.local
            ? "本地留言服务尚未启动。运行 services/waline 中的 npm start 后重试。"
            : "暂时连接不到留言服务，请稍后重试。",
      );
    }
    let json;
    try {
      json = await response.json();
    } catch {
      throw new Error("留言服务返回了无法识别的响应");
    }
    if (!response.ok || json.errno !== 0)
      throw new Error(
        String(json.errmsg || `留言请求失败 (${response.status})`),
      );
    return json.data;
  }
  acquire() {
    this.refs++;
    if (this.refs === 1) {
      this.refresh();
      this.timer = setInterval(() => {
        if (!document.hidden) this.refresh();
      }, this.config.pollInterval);
    }
    return () => {
      this.refs = Math.max(0, this.refs - 1);
      if (!this.refs) {
        clearInterval(this.timer);
        this.timer = null;
      }
    };
  }
  async refresh() {
    if (!this.configured || this.loading) return;
    this.loading = true;
    this.error = "";
    this.emit();
    try {
      this.inflight = Promise.all(
        Array.from({ length: this.pages }, (_, index) =>
          this.request(
            `/api/comment?${new URLSearchParams({ path: this.path, page: String(index + 1), pageSize: String(this.config.pageSize), sortBy: "insertedAt_desc", lang: "zh-CN" })}`,
          ),
        ),
      );
      const pages = await this.inflight;
      this.totalPages = Math.max(1, pages[0]?.totalPages || 1);
      this.count = pages[0]?.count || 0;
      const byId = new Map();
      for (const page of pages)
        for (const root of page.data || [])
          byId.set(String(root.objectId), root);
      this.items = [...byId.values()];
      const newItems = [];
      for (const root of this.items)
        for (const record of [root, ...(root.children || [])]) {
          const id = String(record.objectId);
          if (this.baseline && !this.seen.has(id))
            newItems.push({ root, record });
          this.seen.add(id);
        }
      this.pending = this.pending.filter(
        (item) => !this.seen.has(String(item.id)),
      );
      store.set(this.key, this.pending);
      if (this.baseline)
        for (const item of newItems)
          this.dispatchEvent(new CustomEvent("newmessage", { detail: item }));
      this.baseline = true;
    } catch (error) {
      this.error = error.message;
    } finally {
      this.loading = false;
      this.emit();
    }
  }
  async more() {
    if (this.loading || this.pages >= this.totalPages) return;
    this.pages++;
    await this.refresh();
  }
  async send({ nick, text, root, parent }) {
    const error = validateMessage(nick, text);
    if (error) throw new Error(error);
    const payload = {
      nick: nick.trim(),
      comment: text.trim(),
      url: this.path,
      ua: "",
    };
    if (root) {
      payload.rid = root.objectId;
      payload.pid = (parent || root).objectId;
      payload.at = (parent || root).nick;
    }
    const saved = await this.request("/api/comment?lang=zh-CN", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (saved?.objectId === undefined)
      throw new Error("服务尚未确认保存结果，请刷新后核对。");
    this.seen.add(String(saved.objectId));
    const status = saved.status || "submitted";
    if (status !== "approved") {
      this.pending.unshift({
        id: saved.objectId,
        nick,
        text,
        status,
        time: Date.now(),
      });
      store.set(this.key, this.pending);
    }
    if (this.loading && this.inflight) await this.inflight.catch(() => {});
    await this.refresh();
    return { ...saved, status };
  }
  markRead(root) {
    if (!root) return;
    this.read[String(root.objectId)] = Math.max(
      Number(root.time) || 0,
      ...(root.children || []).map((x) => Number(x.time) || 0),
    );
    store.set(`read:${this.path}`, this.read);
    this.emit();
  }
  unread(root) {
    const latest = Math.max(
      Number(root.time) || 0,
      ...(root.children || []).map((x) => Number(x.time) || 0),
    );
    return Number(this.read[String(root.objectId)] || 0) < latest;
  }
  get unreadCount() {
    return this.items.filter((root) => this.unread(root)).length;
  }
}
export const guestbook = new Guestbook();
