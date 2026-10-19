import { publicNotes, tracks } from "../config.js";
import {
  h,
  icon,
  on,
  store,
  uid,
  download,
  timeLabel,
  empty,
  safeURL,
  external,
} from "../ui.js";
import {
  cleanNoteHTML,
  plainToRich,
  richToText,
  normalizeBackup,
} from "../note-format.js";
import { allPlaces } from "../places.js";

export function mountNotes(ctx) {
  const { root, signal } = ctx;
  let own = store.get("notes", []),
    stars = store.get("noteStars", []),
    folders = store.get("noteFolders", ["日常", "灵感"]),
    filter = "all",
    selected = ctx.data.note || "welcome",
    query = "",
    selection = null,
    saved = true;
  const all = () => [
      ...publicNotes.map((n) => ({ ...n, readonly: true })),
      ...own,
    ],
    current = () => all().find((n) => n.id === selected);
  ctx.setTitle("备忘录");
  root.innerHTML = `<div class="app-toolbar notes-toolbar"><button class="icon-button" data-note="sidebar" aria-label="显示或隐藏文件夹">${icon("sidebar", 20)}</button><button class="icon-button" data-note="new" aria-label="新建本地笔记">${icon("edit", 20)}</button><button class="icon-button" data-note="delete" aria-label="移至最近删除">${icon("trash", 18)}</button><button class="icon-button" data-note="pin" aria-label="置顶笔记">${icon("pin", 18)}</button><span class="spacer"></span><button class="icon-button" data-note="star" aria-label="收藏笔记">${icon("star", 18)}</button><button class="icon-button" data-note="more" aria-label="笔记更多操作">${icon("more", 20)}</button><label class="search-field">${icon("search", 14)}<input placeholder="搜索标题、正文、标签" aria-label="搜索笔记"></label></div><div class="notes-app"><aside class="notes-folders"></aside><aside class="notes-list"></aside><main class="note-editor"></main></div>`;
  function save() {
    const ok = (saved =
      store.set("notes", own) &&
      store.set("noteStars", stars) &&
      store.set("noteFolders", folders));
    const status = root.querySelector(".note-save-state");
    if (status) {
      status.textContent = ok ? "已保存" : "未能保存，请导出备份";
      status.classList.toggle("error", !ok);
    }
    return ok;
  }
  function filtered() {
    return all()
      .filter((n) => {
        if (filter === "trash") return n.deleted;
        if (n.deleted) return false;
        return (
          filter === "all" ||
          (filter === "about" && n.readonly && n.folder === "关于我") ||
          (filter === "music" && n.readonly && n.folder === "音乐") ||
          (filter === "starred" && stars.includes(n.id)) ||
          (filter === "local" && !n.readonly) ||
          (filter.startsWith("folder:") &&
            !n.readonly &&
            n.folder === filter.slice(7)) ||
          (filter.startsWith("tag:") &&
            (n.tags || []).includes(filter.slice(4)))
        );
      })
      .filter((n) =>
        `${n.title} ${n.body} ${(n.tags || []).join(" ")}`
          .toLowerCase()
          .includes(query),
      )
      .sort(
        (a, b) =>
          Number(!!b.pinned) - Number(!!a.pinned) ||
          (b.updatedAt || 0) - (a.updatedAt || 0),
      );
  }
  function renderSidebar() {
    const tags = [
      ...new Set(own.flatMap((n) => (n.deleted ? [] : n.tags || []))),
    ];
    root.querySelector(".notes-folders").innerHTML = `<h4>Lozic</h4>${[
      ["all", "所有笔记"],
      ["about", "关于我"],
      ["music", "音乐"],
      ["starred", "收藏"],
      ["local", "我的本地笔记"],
    ]
      .map(
        ([id, label]) =>
          `<button data-note-filter="${id}" class="${filter === id ? "active" : ""}">${icon(id === "starred" ? "star" : "folder", 16)}${label}</button>`,
      )
      .join(
        "",
      )}<div class="note-folder-heading"><h4>我的文件夹</h4><button data-note="new-folder" aria-label="新建笔记文件夹">${icon("plus", 14)}</button></div>${folders.map((name) => `<button data-note-filter="folder:${h(name)}" class="${filter === `folder:${name}` ? "active" : ""}">${icon("folder", 16)}${h(name)}</button>`).join("")}${tags.length ? `<h4>标签</h4><div class="note-tags-sidebar">${tags.map((t) => `<button data-note-filter="tag:${h(t)}" class="${filter === `tag:${t}` ? "active" : ""}">#${h(t)}</button>`).join("")}</div>` : ""}<button data-note-filter="trash" class="${filter === "trash" ? "active" : ""}">${icon("trash", 16)}最近删除</button><small>我的笔记仅保存在此浏览器</small>`;
  }
  function renderList() {
    root.querySelector(".notes-list").innerHTML =
      filtered()
        .map(
          (n) =>
            `<button class="${n.id === selected ? "selected" : ""}" data-note-id="${h(n.id)}"><b>${n.pinned ? "⌖ " : ""}${h(n.title || "新笔记")}</b><span>${h(n.body?.slice(0, 80) || "还没有内容")}</span><small>${n.readonly ? "主人的公开笔记" : n.updatedAt ? timeLabel(n.updatedAt) : "本地笔记"}${n.tags?.length ? " · #" + h(n.tags[0]) : ""}</small></button>`,
        )
        .join("") || '<p class="notes-list-empty">没有找到笔记</p>';
    const note = current();
    for (const action of ["delete", "pin"])
      root.querySelector(`[data-note=${action}]`).disabled =
        !note || note.readonly || note.deleted;
    root
      .querySelector("[data-note=pin]")
      .classList.toggle("active", !!note?.pinned);
    root
      .querySelector("[data-note=star]")
      .classList.toggle("starred", !!note && stars.includes(note.id));
  }
  function linkChips(note) {
    return (note.links || [])
      .map(
        (link, index) =>
          `<button data-note-link="${index}">${icon(link.app === "maps" ? "pin" : link.app === "vscode" ? "music" : "check", 14)}${h(link.label || "关联内容")}</button>`,
      )
      .join("");
  }
  function renderEditor() {
    selection = null;
    const note = current(),
      el = root.querySelector(".note-editor");
    if (!note) {
      el.innerHTML = empty(
        "选一篇笔记",
        "也可以写一篇，只留在自己的浏览器里。",
        "file",
      );
      return;
    }
    if (note.deleted) {
      el.innerHTML = `<div class="empty-state"><h2>${h(note.title || "未命名笔记")}</h2><p>这篇笔记在最近删除中。</p><button class="mac-button" data-note="restore">恢复笔记</button></div>`;
      return;
    }
    el.innerHTML = `<div class="note-meta">${note.readonly ? "Lozic 的公开笔记" : `<span class="note-save-state ${saved ? "" : "error"}">${saved ? "已保存" : "未能保存，请导出备份"}</span> · <span>仅此浏览器</span>`}${note.readonly ? icon("lock", 11) : ""}</div>${note.readonly ? `<h1>${h(note.title)}</h1><div class="public-note-body">${h(note.body).replace(/\n/g, "<br>")}</div><div class="note-related"><button data-note="messages">${icon("chat", 16)}留一句话</button>${note.id === "music" ? '<button data-note="play">听这首歌 →</button>' : ""}${note.id === "contact" ? '<button data-note="contacts">打开通讯录 →</button>' : ""}${linkChips(note)}</div>` : `<input class="note-title-input" aria-label="笔记标题" value="${h(note.title)}" placeholder="新笔记" maxlength="200"><div class="note-format-toolbar" role="toolbar" aria-label="笔记格式"><button data-format="bold" title="加粗"><b>B</b></button><button data-format="italic" title="斜体"><i>I</i></button><button data-format="underline" title="下划线"><u>U</u></button><button data-format="h2" title="小标题">Aa</button><span></span><button data-format="insertUnorderedList" title="项目列表">${icon("list", 17)}</button><button data-format="checklist" title="勾选清单">${icon("check", 17)}</button><button data-note="link" title="添加网页链接">${icon("globe", 16)}</button><button data-note="attach" title="关联地点或歌曲">${icon("plus", 16)}</button></div><div class="note-rich-editor" contenteditable="true" role="textbox" aria-label="笔记内容" aria-multiline="true" spellcheck="false">${cleanNoteHTML(note.rich || plainToRich(note.body))}</div><div class="note-attachments">${linkChips(note)}</div><div class="note-bottom-bar"><button data-note="organize">${icon("folder", 13)}${h(note.folder || "本地")}${note.tags?.length ? " · " + note.tags.map((t) => "#" + h(t)).join(" ") : ""}</button><span class="spacer"></span><button data-note="to-reminder">变成待办 →</button></div>`}`;
  }
  function render() {
    renderSidebar();
    renderList();
    renderEditor();
    root
      .querySelectorAll("button[title]")
      .forEach((b) => b.setAttribute("aria-label", b.title));
  }
  function create(seed = {}) {
    const note = {
      id: uid(),
      title: seed.title || "",
      body: seed.body || "",
      folder: filter.startsWith("folder:") ? filter.slice(7) : "日常",
      tags: [],
      links: seed.links || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    own.unshift(note);
    selected = note.id;
    filter = "local";
    save();
    render();
    root.querySelector(".note-title-input")?.focus();
  }
  function persistEditor() {
    const note = own.find((n) => n.id === selected),
      editor = root.querySelector(".note-rich-editor");
    if (!note || !editor) return;
    note.title = root.querySelector(".note-title-input").value;
    note.rich = cleanNoteHTML(editor.innerHTML);
    note.body = richToText(note.rich);
    note.updatedAt = Date.now();
    save();
    renderList();
  }
  function rememberSelection() {
    const editor = root.querySelector(".note-rich-editor"),
      sel = getSelection();
    if (editor && sel?.rangeCount && editor.contains(sel.anchorNode))
      selection = sel.getRangeAt(0).cloneRange();
  }
  function restoreSelection() {
    const editor = root.querySelector(".note-rich-editor");
    editor?.focus();
    if (selection && editor?.contains(selection.commonAncestorContainer)) {
      const sel = getSelection();
      sel.removeAllRanges();
      sel.addRange(selection);
    }
  }
  function format(command, value = null) {
    restoreSelection();
    // Native editing preserves browser undo without shipping a rich-text framework.
    if (command === "h2") document.execCommand("formatBlock", false, "h2");
    else if (command === "checklist")
      document.execCommand(
        "insertHTML",
        false,
        '<p class="note-check-line"><input type="checkbox" contenteditable="false"> <span>待办事项</span></p><p><br></p>',
      );
    else document.execCommand(command, false, value);
    persistEditor();
    rememberSelection();
  }
  function organize() {
    const note = current();
    if (!note || note.readonly) return;
    ctx.dialog({
      title: "整理笔记",
      body: `<label class="form-field">文件夹<select name="folder">${[
        ...new Set(["日常", ...folders, note.folder]),
      ]
        .filter(Boolean)
        .map(
          (name) =>
            `<option ${note.folder === name ? "selected" : ""}>${h(name)}</option>`,
        )
        .join(
          "",
        )}</select></label><label class="form-field">标签<input name="tags" placeholder="用逗号分隔，例如：生活, 灵感" value="${h((note.tags || []).join(", "))}" maxlength="500"></label>`,
      buttons: [
        { id: "cancel", label: "取消" },
        { id: "save", label: "保存", primary: true },
      ],
      onAction: (action, dialog) => {
        if (action === "save") {
          const target = own.find((n) => n.id === note.id);
          target.folder = dialog.querySelector("select").value;
          target.tags = [
            ...new Set(
              dialog
                .querySelector("input")
                .value.split(/[,，]/)
                .map((t) => t.trim().replace(/^#+/, "").slice(0, 24))
                .filter(Boolean),
            ),
          ].slice(0, 20);
          save();
          render();
        }
        return true;
      },
    });
  }
  function addAttachment() {
    const places = allPlaces();
    ctx.menu(
      [
        ...tracks.map((t) => ({
          label: `歌曲 · ${t.title}`,
          action: () => {
            const note = own.find((n) => n.id === selected);
            note.links = [
              ...(note.links || []),
              { app: "vscode", id: t.id, label: t.title },
            ];
            save();
            renderEditor();
          },
        })),
        { separator: true },
        ...places.slice(0, 10).map((p) => ({
          label: `地点 · ${p.name}`,
          action: () => {
            const note = own.find((n) => n.id === selected);
            note.links = [
              ...(note.links || []),
              { app: "maps", id: p.id, label: p.name },
            ];
            save();
            renderEditor();
          },
        })),
        { label: "到地图中收藏一个地点…", action: () => ctx.open("maps") },
      ],
      root.querySelector("[data-note=attach]"),
    );
  }
  function exportCurrent() {
    const note = current();
    if (note)
      download(
        `${note.title || "笔记"}.md`,
        `# ${note.title}\n\n${note.body}`,
        "text/markdown;charset=utf-8",
      );
  }
  function backup() {
    download(
      "Lozic-我的笔记备份.json",
      JSON.stringify(
        {
          version: 1,
          exportedAt: new Date().toISOString(),
          notes: own,
          folders,
        },
        null,
        2,
      ),
      "application/json",
    );
  }
  function importBackup() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 3 * 1024 * 1024) {
        ctx.toast("备份过大", "请选择 3 MB 以内的笔记备份。");
        return;
      }
      try {
        const imported = normalizeBackup(JSON.parse(await file.text()));
        for (const note of imported) {
          note.rich = cleanNoteHTML(note.rich || plainToRich(note.body));
          note.body = richToText(note.rich);
        }
        if (signal.aborted) return;
        own = [...imported, ...own];
        folders = [
          ...new Set([...folders, ...imported.map((n) => n.folder)]),
        ].slice(0, 100);
        filter = "local";
        selected = imported[0]?.id || selected;
        const ok = save();
        render();
        ctx.toast(
          ok ? "笔记备份已导入" : "笔记已载入，但尚未保存",
          ok
            ? `新增 ${imported.length} 篇，原笔记已保留。`
            : "浏览器存储空间不足或不可用，请先导出备份再关闭窗口。",
        );
      } catch (error) {
        ctx.toast("无法导入备份", error.message);
      }
    };
    input.click();
  }
  on(
    root,
    "click",
    "[data-note-filter]",
    (e, b) => {
      filter = b.dataset.noteFilter;
      selected = filtered()[0]?.id || null;
      render();
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-note-id]",
    (e, b) => {
      selected = b.dataset.noteId;
      renderList();
      renderEditor();
    },
    signal,
  );
  on(
    root,
    "input",
    '[aria-label="搜索笔记"]',
    (e, b) => {
      query = b.value.toLowerCase();
      renderList();
    },
    signal,
  );
  on(
    root,
    "input",
    ".note-title-input,.note-rich-editor",
    persistEditor,
    signal,
  );
  on(root, "keyup", ".note-rich-editor", rememberSelection, signal);
  on(root, "pointerup", ".note-rich-editor", rememberSelection, signal);
  on(
    root,
    "pointerdown",
    "[data-format],.note-format-toolbar [data-note]",
    (e) => {
      rememberSelection();
      e.preventDefault();
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-format]",
    (e, b) => format(b.dataset.format),
    signal,
  );
  on(
    root,
    "change",
    ".note-rich-editor input[type=checkbox]",
    (e, b) => {
      b.toggleAttribute("checked", b.checked);
      persistEditor();
    },
    signal,
  );
  root.addEventListener(
    "paste",
    (e) => {
      if (!e.target.closest(".note-rich-editor")) return;
      e.preventDefault();
      document.execCommand(
        "insertText",
        false,
        e.clipboardData.getData("text/plain"),
      );
      persistEditor();
    },
    { signal },
  );
  root.addEventListener(
    "drop",
    (e) => {
      if (!e.target.closest(".note-rich-editor")) return;
      e.preventDefault();
      document.execCommand(
        "insertText",
        false,
        e.dataTransfer.getData("text/plain"),
      );
      persistEditor();
    },
    { signal },
  );
  on(
    root,
    "click",
    ".note-rich-editor a",
    (e, b) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) external(b.getAttribute("href"));
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-note-link]",
    (e, b) => {
      const link = current()?.links?.[Number(b.dataset.noteLink)];
      if (!link) return;
      ctx.open(
        link.app,
        link.app === "maps"
          ? { placeId: link.id }
          : link.app === "vscode"
            ? { track: link.id, play: true }
            : link.app === "reminders"
              ? { editId: link.id }
              : { note: link.id },
      );
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-note]",
    (e, b) => {
      const action = b.dataset.note,
        note = current();
      if (action === "new") create();
      if (action === "sidebar")
        root.querySelector(".notes-folders").hidden =
          !root.querySelector(".notes-folders").hidden;
      if (action === "delete" && note && !note.readonly) {
        own.find((n) => n.id === note.id).deleted = true;
        save();
        selected = filtered()[0]?.id || null;
        render();
        ctx.desktop.updateTrash();
      }
      if (action === "restore" && note) {
        own.find((n) => n.id === note.id).deleted = false;
        filter = "local";
        save();
        render();
        ctx.desktop.updateTrash();
      }
      if (action === "pin" && note && !note.readonly) {
        own.find((n) => n.id === note.id).pinned = !note.pinned;
        save();
        renderList();
      }
      if (action === "star" && note) {
        stars = stars.includes(note.id)
          ? stars.filter((id) => id !== note.id)
          : [...stars, note.id];
        save();
        renderList();
      }
      if (action === "organize") organize();
      if (action === "attach") addAttachment();
      if (action === "to-reminder" && note)
        ctx.open("reminders", {
          create: {
            title: note.title || "来自笔记的待办",
            notes: note.body.slice(0, 2000),
            sourceNote: note.id,
          },
        });
      if (action === "new-folder")
        ctx.dialog({
          title: "新建笔记文件夹",
          body: '<input name="name" aria-label="文件夹名称" placeholder="例如：周末计划" maxlength="40">',
          buttons: [
            { id: "cancel", label: "取消" },
            { id: "save", label: "创建", primary: true },
          ],
          onAction: (id, dialog) => {
            if (id === "save") {
              const name = dialog.querySelector("input").value.trim();
              if (!name) return false;
              folders = [...new Set([...folders, name])];
              filter = `folder:${name}`;
              selected = null;
              save();
              render();
            }
            return true;
          },
        });
      if (action === "link")
        ctx.dialog({
          title: "添加网页链接",
          body: '<input name="url" aria-label="链接地址" placeholder="https://example.com"><div class="form-error"></div>',
          buttons: [
            { id: "cancel", label: "取消" },
            { id: "save", label: "添加", primary: true },
          ],
          onAction: (id, dialog) => {
            if (id === "save") {
              const url = safeURL(dialog.querySelector("input").value);
              if (!url) {
                dialog.querySelector(".form-error").textContent =
                  "请输入有效的 http 或 https 地址";
                return false;
              }
              format("createLink", url);
            }
            return true;
          },
        });
      if (action === "more")
        ctx.menu(
          [
            { label: "导出当前笔记", disabled: !note, action: exportCurrent },
            { label: "备份我的所有笔记", action: backup },
            { label: "导入笔记备份…", action: importBackup },
            { separator: true },
            {
              label: "整理当前笔记…",
              disabled: !note || note.readonly,
              action: organize,
            },
          ],
          b,
        );
      if (action === "messages") ctx.open("messages");
      if (action === "play") ctx.open("vscode", { play: true });
      if (action === "contacts") ctx.open("contacts");
    },
    signal,
  );
  render();
  if (ctx.data.create) create(ctx.data.create);
  return {
    receive(data) {
      if (data.reload) {
        own = store.get("notes", []);
        render();
      }
      if (data.note) {
        selected = data.note;
        filter = "all";
        render();
      }
      if (data.create) create(data.create);
    },
    menus: {
      file: [
        { label: "新建本地笔记", action: () => create() },
        { label: "导出当前笔记", action: exportCurrent },
        { label: "备份我的所有笔记", action: backup },
        { label: "导入笔记备份…", action: importBackup },
      ],
    },
  };
}
