import { h, safeURL, uid } from "./ui.js";
const allowed = new Set([
  "P",
  "DIV",
  "BR",
  "STRONG",
  "B",
  "EM",
  "I",
  "U",
  "S",
  "STRIKE",
  "H1",
  "H2",
  "H3",
  "UL",
  "OL",
  "LI",
  "BLOCKQUOTE",
  "PRE",
  "CODE",
  "A",
  "SPAN",
  "INPUT",
]);
const drop = new Set([
  "SCRIPT",
  "STYLE",
  "IFRAME",
  "OBJECT",
  "EMBED",
  "SVG",
  "MATH",
  "FORM",
  "BUTTON",
  "TEXTAREA",
  "SELECT",
  "IMG",
  "VIDEO",
  "AUDIO",
  "LINK",
  "META",
  "BASE",
]);
export function plainToRich(text) {
  return String(text || "")
    .split("\n")
    .map((line) => `<div>${h(line) || "<br>"}</div>`)
    .join("");
}
export function cleanNoteHTML(html) {
  // A template is inert: imported markup is never attached to the page before allow-listing.
  const template = document.createElement("template");
  template.innerHTML = String(html || "").slice(0, 500000);
  const output = document.createElement("div");
  function append(node, parent) {
    if (node.nodeType === 3) {
      parent.append(document.createTextNode(node.textContent));
      return;
    }
    if (node.nodeType !== 1 || drop.has(node.tagName)) return;
    if (!allowed.has(node.tagName)) {
      for (const child of node.childNodes) append(child, parent);
      return;
    }
    if (node.tagName === "INPUT" && node.getAttribute("type") !== "checkbox")
      return;
    const el = document.createElement(node.tagName.toLowerCase());
    if (node.tagName === "INPUT") {
      el.type = "checkbox";
      el.contentEditable = "false";
      if (node.hasAttribute("checked")) el.setAttribute("checked", "");
    }
    if (node.tagName === "A") {
      const href = safeURL(node.getAttribute("href"));
      if (href) {
        el.href = href;
        el.target = "_blank";
        el.rel = "noopener noreferrer";
      }
    }
    if (node.tagName === "P" && node.classList.contains("note-check-line"))
      el.className = "note-check-line";
    for (const child of node.childNodes) append(child, el);
    parent.append(el);
  }
  for (const node of template.content.childNodes) append(node, output);
  return output.innerHTML;
}
export function richToText(html) {
  const template = document.createElement("template");
  template.innerHTML = cleanNoteHTML(html);
  function read(node) {
    if (node.nodeType === 3) return node.textContent;
    if (node.nodeType !== 1 && node.nodeType !== 11) return "";
    if (node.tagName === "BR") return "\n";
    if (node.tagName === "INPUT")
      return node.hasAttribute("checked") ? "[x] " : "[ ] ";
    const text = [...node.childNodes].map(read).join("");
    return (
      text +
      (["P", "DIV", "H1", "H2", "H3", "LI", "BLOCKQUOTE", "PRE"].includes(
        node.tagName,
      )
        ? "\n"
        : "")
    );
  }
  return read(template.content)
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
}
export function normalizeBackup(value) {
  if (!value || !Array.isArray(value.notes) || value.notes.length > 1000)
    throw new Error("这不是可识别的笔记备份。");
  return value.notes
    .filter((n) => n && typeof n === "object")
    .map((n) => ({
      id: uid(),
      title: typeof n.title === "string" ? n.title.slice(0, 200) : "导入的笔记",
      body: typeof n.body === "string" ? n.body.slice(0, 100000) : "",
      rich: typeof n.rich === "string" ? n.rich.slice(0, 500000) : "",
      folder:
        typeof n.folder === "string" ? n.folder.slice(0, 40) : "导入的笔记",
      tags: Array.isArray(n.tags)
        ? n.tags
            .filter((t) => typeof t === "string")
            .slice(0, 20)
            .map((t) => t.slice(0, 24))
        : [],
      pinned: !!n.pinned,
      deleted: !!n.deleted,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      links: Array.isArray(n.links)
        ? n.links
            .filter(
              (l) =>
                l &&
                ["maps", "vscode", "reminders", "notes"].includes(l.app) &&
                typeof l.id === "string",
            )
            .slice(0, 20)
            .map((l) => ({
              app: l.app,
              id: l.id.slice(0, 200),
              label: String(l.label || "关联内容").slice(0, 100),
            }))
        : [],
    }));
}
