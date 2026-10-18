import { profile } from "../config.js";
import { h, icon, on, store, copy, uid, external } from "../ui.js";

export function mountMail(ctx, kind = "gmail") {
  const { root, signal } = ctx,
    isGmail = kind === "gmail",
    address = profile[kind],
    name = isGmail ? "Gmail" : "网易邮箱大师";
  let folder = "inbox",
    selected = null,
    query = "",
    compose = null,
    expanded = false;
  const seeds = [
    {
      id: "welcome",
      from: "Lozic",
      subject: "很高兴，你来到了这里",
      body: `你好，远道而来的朋友：\n\n欢迎来到我的 Mac。这是一个可以慢慢逛的地方。\n\n${profile.bio}\n\n如果你愿意，给我写封信吧。说说最近在听的歌，或是今天发生的小事。\n\nLozic`,
      unread: true,
    },
    {
      id: "music",
      from: "Lozic",
      subject: isGmail
        ? "分享一首歌，和一个小小的桌面"
        : "今天，想和你听一首歌",
      body: "有些话，歌里已经唱过了。\n\n桌面里的 VS Code 会播放《开始懂了》，歌词一行行变成代码。\n\n你也有反复听的歌吗？回信告诉我吧。",
      unread: true,
    },
    {
      id: "contact",
      from: "Lozic",
      subject: isGmail ? "保持联系 · 不止在这里" : "给未来的一封信",
      body: isGmail
        ? `如果这里暂时离线，你仍然可以找到我。\n\nQQ：${profile.qq}\nGmail：${profile.gmail}\n网易邮箱：${profile.netease}\n个人网站：${profile.website}\n\n这些是站点欢迎来信，不是真实私人收件箱。`
        : "给未来的自己：\n\n希望你仍然喜欢分享，仍然愿意和陌生人说声你好。\n\n今天就先留一句话吧。\n\n这是一封为这个桌面写下的站点来信。",
      unread: false,
    },
  ].map((m) => ({ ...m, folder: "inbox", starred: false }));
  let mails = store.get(`${kind}:messages`, seeds),
    drafts = store.get(`${kind}:drafts`, []);
  const folders = [
    ["inbox", "收件箱", "tray"],
    ["starred", "已加星标", "star"],
    ["sent", "已发送", "send"],
    ["drafts", "草稿", "file"],
    ["archive", "归档", "folder"],
    ["trash", "垃圾箱", "trash"],
  ];
  ctx.setTitle(name);
  root.classList.add("mail-root", isGmail ? "gmail-root" : "netease-root");
  root.innerHTML = `<div class="mail-top"><div class="mail-brand">${ctx.desktop.appImage(kind)}<b>${name}</b></div><label class="mail-search">${icon("search", 21)}<input placeholder="搜索邮件" aria-label="搜索邮件"></label><button class="mail-account" data-mail="account" aria-label="邮箱账号"><img src="${profile.avatar}" alt="Lozic"></button></div><div class="mail-layout"><aside class="mail-sidebar"><button class="mail-compose-button" data-mail="compose">${icon("edit", 21)} 写邮件</button><nav>${folders.map(([id, label, symbol]) => `<button data-folder="${id}">${icon(symbol, 17)}<span>${label}</span><small data-count="${id}"></small></button>`).join("")}</nav><div class="mail-storage"><span>${h(address)}</span><small>个人桌面 · 站点来信</small></div></aside><main class="mail-main"><div class="mail-content"></div></main></div><div class="mail-compose-host"></div>`;
  function save() {
    store.set(`${kind}:messages`, mails);
    store.set(`${kind}:drafts`, drafts);
  }
  function matching() {
    const list =
      folder === "drafts"
        ? drafts.map((d) => ({ ...d, from: "草稿", body: d.text }))
        : mails.filter((m) =>
            folder === "starred"
              ? m.starred && m.folder !== "trash"
              : m.folder === folder,
          );
    return list.filter((m) =>
      `${m.from} ${m.subject} ${m.body}`.toLowerCase().includes(query),
    );
  }
  function render() {
    root
      .querySelectorAll("[data-folder]")
      .forEach((b) =>
        b.classList.toggle("active", b.dataset.folder === folder),
      );
    root.querySelector("[data-count=inbox]").textContent =
      mails.filter((m) => m.folder === "inbox" && m.unread).length || "";
    root.querySelector("[data-count=drafts]").textContent = drafts.length || "";
    const panel = root.querySelector(".mail-content"),
      mail = mails.find((m) => m.id === selected);
    if (mail) {
      panel.innerHTML = `<div class="mail-actions"><button class="icon-button" data-mail="back" aria-label="返回邮件列表">${icon("back", 20)}</button><button class="icon-button" data-mail="archive" aria-label="归档邮件">${icon("folder", 18)}</button><button class="icon-button" data-mail="trash" aria-label="${mail.folder === "trash" ? "恢复邮件" : "删除邮件"}">${icon(mail.folder === "trash" ? "refresh" : "trash", 18)}</button><button class="icon-button" data-mail="unread" aria-label="标为未读">${icon("mail", 18)}</button><span class="spacer"></span><span class="mail-content-label">站点来信</span></div><article class="mail-reader"><h1>${h(mail.subject)}</h1><header><img src="${profile.avatar}" alt=""><div><b>${h(mail.from)}</b><span>发给来到这里的你 · 站点内容</span></div><button class="icon-button ${mail.starred ? "starred" : ""}" data-star="${mail.id}" aria-label="星标邮件">${icon("star", 18)}</button></header><div class="mail-body">${h(mail.body).replace(/\n/g, "<br>")}</div><footer><button class="mac-button" data-mail="reply">${icon("back", 15)} 回复</button>${mail.id === "music" ? '<button class="mac-button" data-mail="music">打开 VS Code 听歌</button>' : ""}</footer></article>`;
    } else {
      const list = matching();
      panel.innerHTML = `<div class="mail-actions"><button class="icon-button" data-mail="refresh" aria-label="刷新列表">${icon("refresh", 18)}</button><b>${folders.find((f) => f[0] === folder)?.[1]}</b><span class="spacer"></span><small>${list.length} 封</small></div>${list.length ? `<div class="mail-message-list">${list.map((m) => `<div class="mail-row ${m.unread ? "unread" : ""}" data-message="${h(m.id)}" role="button" tabindex="0">${folder === "drafts" ? icon("file", 16) : `<button class="mail-star ${m.starred ? "starred" : ""}" data-star="${m.id}" aria-label="星标 ${h(m.subject)}">${icon("star", 17)}</button>`}<b>${h(m.from)}</b><div><strong>${h(m.subject || "（无主题）")}</strong><span> — ${h((m.body || "").slice(0, 100))}</span></div><small>${folder === "drafts" ? "本机草稿" : "站点来信"}</small></div>`).join("")}</div>` : `<div class="empty-state">${icon(folder === "sent" ? "send" : "tray", 40)}<h2>${folder === "sent" ? "发信在你的邮箱中完成" : "这里还没有邮件"}</h2><p>${folder === "sent" ? "本站不会代你发送邮件。点击写邮件，准备好内容后在真实邮箱里确认发送。" : "可以切换文件夹，或写一封新的信。"}</p></div>`}`;
    }
  }
  function saveDraft() {
    if (!compose) return;
    const host = root.querySelector(".mail-compose-host");
    if (host.querySelector("[name=subject]")) {
      compose.subject = host.querySelector("[name=subject]").value;
      compose.text = host.querySelector("textarea").value;
    }
    drafts = drafts.filter((d) => d.id !== compose.id);
    if (compose.subject.trim() || compose.text.trim())
      drafts.unshift({ ...compose });
    save();
    root.querySelector("[data-count=drafts]").textContent = drafts.length || "";
  }
  function openCompose(draft) {
    if (compose) saveDraft();
    compose = draft
      ? { ...draft }
      : { id: uid(), subject: "", text: "", to: address };
    expanded = false;
    drawCompose();
  }
  function drawCompose() {
    root.querySelector(".mail-compose-host").innerHTML = compose
      ? `<section class="mail-compose ${expanded ? "expanded" : ""}" role="region" aria-label="写邮件"><header><b>新邮件</b><button data-mail="expand-compose" aria-label="放大或恢复写信">↗</button><button data-mail="close-compose" aria-label="保存并关闭草稿">×</button></header><label class="compose-field"><span>收件人</span><input name="to" value="${h(address)}" readonly></label><label class="compose-field"><span>主题</span><input name="subject" value="${h(compose.subject)}" placeholder="想聊点什么？" maxlength="200"></label><div class="mail-template-row"><span>模板</span>${["打个招呼", "分享音乐", "技术交流"].map((t) => `<button data-template="${t}">${t}</button>`).join("")}</div><textarea name="body" placeholder="写下你想说的话…" aria-label="邮件正文">${h(compose.text)}</textarea><footer><button class="mail-send" data-mail="send">继续发送 ${icon("forward", 14)}</button><span>草稿仅保存在此浏览器</span><button class="icon-button" data-mail="discard" aria-label="删除草稿">${icon("trash", 17)}</button></footer></section>`
      : "";
  }
  function handoff() {
    saveDraft();
    const text = `收件人：${address}\n主题：${compose.subject}\n\n${compose.text}`,
      url = `mailto:${address}?subject=${encodeURIComponent(compose.subject)}&body=${encodeURIComponent(compose.text)}`;
    ctx.dialog({
      title: "在你的邮箱中继续发送",
      body: `<p>收件人：<span class="selectable">${h(address)}</span></p><p>这会打开你的邮件客户端，或复制内容供你粘贴。请在真实邮箱里确认发送。</p><a class="mac-button primary mailto-link" href="${h(url)}">打开系统邮件客户端</a>`,
      buttons: [
        { id: "copy", label: "复制完整邮件" },
        { id: "done", label: "完成", primary: true },
      ],
      onAction: async (id) => {
        if (id === "copy") {
          await copy(text);
          ctx.toast("邮件内容已复制", "可以粘贴到你的邮箱中继续发送。");
          return false;
        }
        return true;
      },
    });
  }
  on(
    root,
    "click",
    "[data-folder]",
    (e, b) => {
      folder = b.dataset.folder;
      selected = null;
      render();
    },
    signal,
  );
  on(
    root,
    "input",
    ".mail-search input",
    (e, b) => {
      query = b.value.toLowerCase();
      selected = null;
      render();
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-message]",
    (e, b) => {
      if (e.target.closest("[data-star]")) return;
      if (folder === "drafts")
        openCompose(drafts.find((d) => d.id === b.dataset.message));
      else {
        selected = b.dataset.message;
        const m = mails.find((m) => m.id === selected);
        m.unread = false;
        save();
        render();
      }
    },
    signal,
  );
  on(
    root,
    "keydown",
    "[data-message]",
    (e, b) => {
      if (e.key === "Enter") {
        e.preventDefault();
        b.click();
      }
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-star]",
    (e, b) => {
      e.stopPropagation();
      const m = mails.find((m) => m.id === b.dataset.star);
      if (m) {
        m.starred = !m.starred;
        save();
        render();
      }
    },
    signal,
  );
  on(
    root,
    "input",
    ".mail-compose input,.mail-compose textarea",
    saveDraft,
    signal,
  );
  on(
    root,
    "click",
    "[data-template]",
    (e, b) => {
      saveDraft();
      compose.subject = b.dataset.template;
      compose.text =
        b.dataset.template === "分享音乐"
          ? "你好 Lozic，\n\n最近我在听……\n想把这首歌分享给你。"
          : b.dataset.template === "技术交流"
            ? "你好 Lozic，\n\n逛了你的桌面，想和你聊聊……"
            : "你好 Lozic，\n\n很高兴来到你的 Mac！\n";
      drawCompose();
      saveDraft();
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-mail]",
    (e, b) => {
      const a = b.dataset.mail,
        m = mails.find((m) => m.id === selected);
      if (a === "compose") openCompose();
      if (a === "back") {
        selected = null;
        render();
      }
      if (a === "refresh") render();
      if (a === "music") ctx.open("vscode", { play: true });
      if (a === "account")
        ctx.dialog({
          title: name,
          body: `<div class="about-card">${ctx.desktop.appImage(kind)}<h3>${h(address)}</h3><p>这里是公开的站点来信和你的本地草稿。真实邮件在你的邮箱中发送。</p></div>`,
        });
      if (a === "archive" && m) {
        m.folder = "archive";
        selected = null;
        save();
        render();
      }
      if (a === "trash" && m) {
        m.folder = m.folder === "trash" ? "inbox" : "trash";
        selected = null;
        save();
        render();
      }
      if (a === "unread" && m) {
        m.unread = true;
        selected = null;
        save();
        render();
      }
      if (a === "reply" && m)
        openCompose({
          id: uid(),
          to: address,
          subject: `Re: ${m.subject}`,
          text: `你好 Lozic，\n\n`,
        });
      if (a === "close-compose") {
        saveDraft();
        compose = null;
        drawCompose();
        render();
      }
      if (a === "expand-compose") {
        saveDraft();
        expanded = !expanded;
        drawCompose();
      }
      if (a === "discard") {
        drafts = drafts.filter((d) => d.id !== compose.id);
        save();
        compose = null;
        drawCompose();
        render();
      }
      if (a === "send") handoff();
    },
    signal,
  );
  render();
  if (ctx.data.compose)
    openCompose({
      id: uid(),
      subject: ctx.data.subject || "",
      text: ctx.data.text || "",
      to: address,
    });
  root.addEventListener(
    "click",
    (e) => {
      if (e.target.closest("[data-mail=trash]")) ctx.desktop.updateTrash();
    },
    { signal },
  );
  return {
    dispose: saveDraft,
    receive(data) {
      if (data.reload) {
        mails = store.get(`${kind}:messages`, seeds);
        render();
      }
      if (data.compose)
        openCompose({
          id: uid(),
          subject: data.subject || "",
          text: data.text || "",
          to: address,
        });
    },
    menus: {
      file: [
        { label: "写邮件", action: () => openCompose() },
        {
          label: "查看草稿",
          action: () => {
            folder = "drafts";
            selected = null;
            render();
          },
        },
      ],
    },
  };
}
