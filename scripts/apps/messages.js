import { profile, tracks } from "../config.js";
import {
  guestbook,
  commentText,
  parseCard,
  isOwner,
  validateMessage,
} from "../guestbook.js";
import { h, icon, on, store, timeLabel, copy, external, empty } from "../ui.js";

function avatar(nick, id) {
  let sum = 0;
  for (const c of String(id)) sum = (sum + c.charCodeAt(0) * 19) % 360;
  return `<span class="message-avatar" style="--avatar-hue:${sum}">${h(Array.from(nick || "?")[0])}</span>`;
}
export function mountMessages(ctx) {
  const { root, signal } = ctx;
  let selected = ctx.data.conversationId
      ? String(ctx.data.conversationId)
      : null,
    filter = "",
    replyTo = null,
    sending = false;
  ctx.setTitle("信息");
  root.innerHTML = `<div class="messages-app"><aside class="messages-sidebar"><div class="messages-sidebar-tools"><b>信息</b><button class="icon-button" data-msg="refresh" aria-label="刷新留言">${icon("refresh", 17)}</button><button class="icon-button" data-msg="new" aria-label="新建公开留言">${icon("edit", 20)}</button></div><label class="search-field">${icon("search", 15)}<input data-msg-search placeholder="搜索昵称和留言" aria-label="搜索留言"></label><button class="message-new-card" data-msg="new"><span class="new-message-icon">${icon("edit", 21)}</span><div><b>给 Lozic 留句话</b><small>留下一点今天的心情</small></div></button><div class="messages-list"></div><button class="messages-more" data-msg="more" hidden>载入更多</button><div class="messages-sidebar-footer">${guestbook.local ? "本地测试留言 · 持久保存" : "公开留言墙"}</div></aside><section class="messages-main"><header class="messages-header"></header><div class="messages-connection"></div><div class="messages-scroll"></div><form class="messages-composer"><div class="reply-label" hidden></div><div class="composer-identity"><label>你的昵称 <input name="nick" maxlength="48" placeholder="怎么称呼你？" value="${h(store.get("guestNick", ""))}" required aria-label="留言昵称"></label><span>公开留言 · 所有人可见</span></div><div class="composer-body"><textarea name="text" placeholder="说声你好，分享一首歌，或者今天的小事…" aria-label="公开留言内容" maxlength="1200" required></textarea><button class="message-send" type="submit" aria-label="发布留言">${icon("send", 19)}</button></div><div class="composer-bottom"><button type="button" class="icon-button" data-msg="emoji" aria-label="添加心情表情">${icon("smile", 19)}</button><select name="track" aria-label="附上站内歌曲"><option value="">附上一首歌</option>${tracks.map((t) => `<option value="${t.id}">${h(t.title)}</option>`).join("")}</select><span class="spacer"></span><small data-character-count>0 / 1000</small></div><div class="form-error" role="status"></div></form></section></div>`;
  const form = root.querySelector("form"),
    textInput = form.elements.text,
    nickInput = form.elements.nick,
    trackInput = form.elements.track;
  const draftKey = () => `messageDraft:${selected || "new"}`;
  function restoreDraft() {
    const draft = store.get(draftKey(), {});
    textInput.value = draft.text || "";
    trackInput.value = draft.track || "";
    updateCount();
  }
  function saveDraft() {
    store.set(draftKey(), { text: textInput.value, track: trackInput.value });
    store.set("guestNick", nickInput.value);
    updateCount();
  }
  function payloadText() {
    return `${textInput.value.trim()}${trackInput.value ? `\n[Lozic:track:${trackInput.value}]` : ""}`;
  }
  function updateCount() {
    root.querySelector("[data-character-count]").textContent =
      `${Array.from(payloadText()).length} / 1000`;
  }
  function currentRoot() {
    return guestbook.items.find((r) => String(r.objectId) === selected);
  }
  function select(id) {
    if (sending) return;
    saveDraft();
    selected = id ? String(id) : null;
    replyTo = null;
    restoreDraft();
    render();
    const r = currentRoot();
    if (r) guestbook.markRead(r);
    textInput.focus();
  }
  function render() {
    const threads = guestbook.items.filter((r) =>
      `${r.nick} ${commentText(r)} ${(r.children || []).map(commentText).join(" ")}`
        .toLowerCase()
        .includes(filter),
    );
    root.querySelector(".messages-list").innerHTML = threads
      .map(
        (r) =>
          `<button class="message-thread ${String(r.objectId) === selected ? "selected" : ""}" data-thread="${h(r.objectId)}">${avatar(r.nick, r.objectId)}<div><div><b>${h(r.nick)}</b><small>${timeLabel(r.time)}</small></div><span>${h(parseCard(commentText(r)).text.slice(0, 75))}</span></div>${guestbook.unread(r) ? '<i class="unread-dot"></i>' : ""}</button>`,
      )
      .join("");
    const more = root.querySelector(".messages-more");
    more.hidden = guestbook.pages >= guestbook.totalPages;
    more.disabled = guestbook.loading;
    const r = currentRoot();
    root.querySelector(".messages-header").innerHTML =
      `${r ? avatar(r.nick, r.objectId) : `<img class="message-owner-avatar" src="${profile.avatar}" alt="Lozic">`}<div><b>${r ? h(r.nick) : "给 Lozic 留句话"}</b><span>${r ? "公开会话" : "你好，很高兴你来。"}</span></div><button class="icon-button" data-msg="info" aria-label="留言说明">${icon("info", 20)}</button>`;
    const connection = root.querySelector(".messages-connection");
    connection.innerHTML = !guestbook.configured
      ? '<div class="inline-banner">留言服务尚未配置，草稿可在本地保留。<button class="link-button" data-msg="setup">接入说明</button></div>'
      : guestbook.error
        ? `<div class="inline-banner error">${h(guestbook.error)}<button class="link-button" data-msg="refresh">重试</button></div>`
        : guestbook.loading
          ? '<div class="message-loading">正在同步留言…</div>'
          : "";
    const scroll = root.querySelector(".messages-scroll"),
      oldScroll = scroll.scrollTop,
      atBottom = scroll.scrollHeight - scroll.clientHeight - oldScroll < 60;
    if (r) {
      const records = [
        r,
        ...(r.children || [])
          .slice()
          .sort((a, b) => Number(a.time) - Number(b.time)),
      ];
      scroll.innerHTML = `<div class="message-date">${timeLabel(r.time)} · 公开留言</div>${records
        .map((record) => {
          const card = parseCard(commentText(record)),
            owner = isOwner(record);
          return `<article class="message-group ${owner ? "owner-message" : ""}"><div class="bubble-caption">${h(record.nick)} ${owner ? '<span class="owner-badge">主人</span>' : ""}</div><div class="message-bubble"><p>${h(card.text).replace(/\n/g, "<br>")}</p>${card.track ? `<button class="message-song" data-song="${card.track.id}">${icon("music", 25)}<span><b>${h(card.track.title)}</b><small>${h(card.track.artist)}</small></span>${icon("play", 18)}</button>` : ""}</div><div class="bubble-actions"><time>${timeLabel(record.time)}</time><button data-reply="${h(record.objectId)}">回复</button><button data-copy-message="${h(record.objectId)}">复制</button></div></article>`;
        })
        .join("")}`;
    } else if (selected) {
      scroll.innerHTML = empty(
        "这段会话暂时不可见",
        "它可能被删除、正在审核，或者还没有加载到这一页。可以刷新或载入更多。",
        "chat",
      );
    } else {
      scroll.innerHTML = `<div class="message-welcome"><img src="${profile.avatar}" alt="Lozic"><h1>留一句话，<br>让我们认识一下。</h1><p>一首最近在听的歌，一件今天的小事，<br>或者一句简单的「你好」。</p><span>这里是公开留言，不是私人短信。</span></div>${
        guestbook.pending.length
          ? `<div class="message-pending"><b>本浏览器的提交记录</b>${guestbook.pending
              .slice(0, 5)
              .map(
                (p) =>
                  `<p>${h(parseCard(p.text).text.slice(0, 90))}<small>${p.status === "waiting" ? "等待审核" : p.status === "spam" ? "留言未公开" : "已提交，待确认公开"}</small></p>`,
              )
              .join("")}</div>`
          : ""
      }`;
    }
    if (atBottom) scroll.scrollTop = scroll.scrollHeight;
    else scroll.scrollTop = oldScroll;
    root.querySelector(".reply-label").hidden = !replyTo;
    root.querySelector(".reply-label").innerHTML = replyTo
      ? `回复 ${h(replyTo.nick)} <button type="button" data-msg="cancel-reply">取消</button>`
      : "";
    form
      .querySelectorAll("input,textarea,select,button")
      .forEach((el) => (el.disabled = sending));
    form.querySelector("[type=submit]").disabled =
      sending || !guestbook.configured || (selected && !r);
  }
  on(
    root,
    "click",
    "[data-thread]",
    (e, b) => select(b.dataset.thread),
    signal,
  );
  on(
    root,
    "input",
    "[data-msg-search]",
    (e, b) => {
      filter = b.value.toLowerCase();
      render();
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-song]",
    (e, b) => ctx.open("vscode", { track: b.dataset.song, play: true }),
    signal,
  );
  on(
    root,
    "click",
    "[data-reply]",
    (e, b) => {
      if (sending) return;
      const r = currentRoot();
      replyTo = [r, ...(r?.children || [])].find(
        (x) => String(x.objectId) === b.dataset.reply,
      );
      render();
      textInput.focus();
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-copy-message]",
    async (e, b) => {
      const r = currentRoot(),
        record = [r, ...(r?.children || [])].find(
          (x) => String(x.objectId) === b.dataset.copyMessage,
        );
      if (record) {
        await copy(parseCard(commentText(record)).text);
        ctx.toast("留言已复制");
      }
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-msg]",
    (e, b) => {
      const action = b.dataset.msg;
      if (action === "new") select(null);
      if (action === "refresh") guestbook.refresh();
      if (action === "more") guestbook.more();
      if (action === "cancel-reply") {
        replyTo = null;
        render();
      }
      if (action === "emoji")
        ctx.menu(
          ["🙂", "🌙", "☀️", "🎧", "🍃", "✨", "❤️"].map((emoji) => ({
            label: emoji,
            action: () => {
              textInput.value += emoji;
              saveDraft();
              textInput.focus();
            },
          })),
          b,
        );
      if (action === "setup")
        ctx.open("safari", {
          url: new URL("docs/DEPLOYMENT.md", document.baseURI).href,
        });
      if (action === "info")
        ctx.dialog({
          title: "关于这面留言墙",
          body: `<p>这里的留言与回复对所有访客公开。昵称只是你希望被称呼的名字，不是经过验证的账号。</p><p>只有经过后台身份验证的站长回复会显示“主人”。QQ 预设会话与这里的真实留言分别保存。</p><p>${guestbook.local ? "当前连接的是本机持久测试服务，正式上线需配置独立在线服务。" : "请不要在公开留言里留下密码或其他不希望公开的内容。"}</p>`,
        });
    },
    signal,
  );
  form.addEventListener("input", saveDraft, { signal });
  form.addEventListener("change", saveDraft, { signal });
  form.addEventListener(
    "submit",
    async (e) => {
      e.preventDefault();
      if (sending) return;
      const text = payloadText(),
        nick = nickInput.value;
      const error = validateMessage(nick, text),
        status = root.querySelector(".form-error");
      if (error) {
        status.textContent = error;
        return;
      }
      sending = true;
      status.textContent = "正在发布…";
      render();
      try {
        const saved = await guestbook.send({
          nick,
          text,
          root: currentRoot(),
          parent: replyTo,
        });
        if (signal.aborted) return;
        textInput.value = "";
        trackInput.value = "";
        store.remove(draftKey());
        replyTo = null;
        status.textContent =
          saved.status === "approved"
            ? "已发布"
            : saved.status === "waiting"
              ? "已提交，等待审核"
              : saved.status === "spam"
                ? "留言未公开，请调整内容后再试。"
                : "已提交，请刷新确认公开状态";
        if (!selected && saved.status === "approved")
          selected = String(saved.objectId);
        updateCount();
      } catch (err) {
        if (!signal.aborted) status.textContent = err.message;
      } finally {
        sending = false;
        if (!signal.aborted) synchronize();
      }
    },
    { signal },
  );
  function synchronize() {
    const r = currentRoot();
    if (
      r &&
      guestbook.unread(r) &&
      ctx.desktop.active === "messages" &&
      ctx.win.mode !== "minimized"
    ) {
      guestbook.markRead(r);
      return;
    }
    render();
  }
  const release = guestbook.acquire();
  guestbook.addEventListener("change", synchronize, { signal });
  restoreDraft();
  render();
  return {
    dispose() {
      saveDraft();
      release();
    },
    receive(data) {
      if ("conversationId" in data) select(data.conversationId);
    },
    menus: {
      file: [
        { label: "新建公开留言", action: () => select(null) },
        { label: "刷新留言", action: () => guestbook.refresh() },
        {
          label: "站长管理后台",
          disabled: !guestbook.configured,
          action: () => external(`${guestbook.server}/ui`),
        },
      ],
    },
  };
}

export { mountFaceTime } from "./facetime.js";
