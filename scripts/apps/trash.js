import { h, icon, on, store, empty } from "../ui.js";
export function mountTrash(ctx) {
  const { root, signal } = ctx;
  let selected = null;
  function items() {
    return [
      ...store
        .get("notes", [])
        .filter((n) => n.deleted)
        .map((n) => ({
          key: `notes:${n.id}`,
          id: n.id,
          kind: "notes",
          name: n.title || "无标题笔记",
          source: "备忘录",
          text: n.body,
        })),
      ...["gmail", "netease"].flatMap((kind) =>
        store
          .get(`${kind}:messages`, [])
          .filter((m) => m.folder === "trash")
          .map((m) => ({
            key: `${kind}:${m.id}`,
            id: m.id,
            kind,
            name: m.subject,
            source: kind === "gmail" ? "Gmail" : "网易邮箱",
            text: m.body,
          })),
      ),
    ];
  }
  ctx.setTitle("废纸篓");
  root.innerHTML = `<div class="app-toolbar"><b>废纸篓</b><span class="spacer"></span><button class="mac-button" data-trash="restore" disabled>放回原处</button><button class="mac-button" data-trash="empty">清空…</button></div><div class="trash-content"></div><footer class="app-status">仅包含此浏览器里删除的笔记和站点邮件副本</footer>`;
  function render() {
    const entries = items();
    root.querySelector("[data-trash=empty]").disabled = !entries.length;
    root.querySelector("[data-trash=restore]").disabled = !entries.some(
      (i) => i.key === selected,
    );
    root.querySelector(".trash-content").innerHTML = entries.length
      ? `<div class="trash-table"><div class="trash-table-heading"><span>名称</span><span>原位置</span></div>${entries.map((i) => `<button class="trash-row ${selected === i.key ? "selected" : ""}" data-trash-key="${h(i.key)}">${icon(i.kind === "notes" ? "file" : "mail", 23)}<b>${h(i.name)}</b><span>${i.source}</span></button>`).join("")}</div>`
      : empty(
          "废纸篓是空的",
          "删除的本地笔记和邮件副本会出现在这里。你可以放回它们，也可以清空。",
          "trash",
        );
  }
  function refreshApps() {
    for (const id of ["notes", "gmail", "netease"])
      ctx.desktop.windows.get(id)?.instance?.receive?.({ reload: true });
    ctx.desktop.updateTrash();
  }
  function restore() {
    const item = items().find((i) => i.key === selected);
    if (!item) return;
    if (item.kind === "notes") {
      const notes = store.get("notes", []);
      notes.find((n) => n.id === item.id).deleted = false;
      store.set("notes", notes);
    } else {
      const mails = store.get(`${item.kind}:messages`, []);
      mails.find((m) => m.id === item.id).folder = "inbox";
      store.set(`${item.kind}:messages`, mails);
    }
    selected = null;
    refreshApps();
    render();
  }
  function emptyTrash() {
    if (!items().length) {
      ctx.toast("废纸篓已经是空的");
      return;
    }
    ctx.dialog({
      title: "确定要清空废纸篓吗？",
      body: `<p>将永久删除这里的 ${items().length} 个本地项目，无法撤销。</p><p>只影响此浏览器中的笔记和邮件副本，不会删除公开留言、真实邮箱内容或电脑上的文件。</p>`,
      buttons: [
        { id: "cancel", label: "取消" },
        { id: "empty", label: "清空废纸篓", primary: true },
      ],
      onAction: (id) => {
        if (id === "empty") {
          store.set(
            "notes",
            store.get("notes", []).filter((n) => !n.deleted),
          );
          for (const kind of ["gmail", "netease"])
            store.set(
              `${kind}:messages`,
              store
                .get(`${kind}:messages`, [])
                .filter((m) => m.folder !== "trash"),
            );
          selected = null;
          refreshApps();
          render();
        }
        return true;
      },
    });
  }
  on(
    root,
    "click",
    "[data-trash-key]",
    (e, b) => {
      selected = b.dataset.trashKey;
      root
        .querySelectorAll("[data-trash-key]")
        .forEach((row) => row.classList.toggle("selected", row === b));
      root.querySelector("[data-trash=restore]").disabled = false;
    },
    signal,
  );
  on(
    root,
    "dblclick",
    "[data-trash-key]",
    (e, b) => {
      const item = items().find((i) => i.key === b.dataset.trashKey);
      if (item)
        ctx.dialog({
          title: item.name,
          body: `<pre class="finder-preview-text">${h(item.text)}</pre>`,
          buttons: [
            { id: "cancel", label: "关闭" },
            { id: "restore", label: "放回原处", primary: true },
          ],
          onAction: (id) => {
            if (id === "restore") {
              selected = item.key;
              restore();
            }
            return true;
          },
        });
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-trash]",
    (e, b) => (b.dataset.trash === "restore" ? restore() : emptyTrash()),
    signal,
  );
  render();
  return {
    refresh: render,
    empty: emptyTrash,
    receive: render,
    menus: {
      file: [
        { label: "放回所选项目", action: restore },
        { label: "清空废纸篓…", action: emptyTrash },
      ],
    },
  };
}
