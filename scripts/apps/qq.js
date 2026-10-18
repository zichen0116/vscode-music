import { profile, tracks } from "../config.js";
import { h, icon, on, store, copy, external, uid } from "../ui.js";
let loggedOnce = false;

export function mountQQ(ctx) {
  const { root, signal } = ctx;
  let logged = false,
    busy = false;
  const prefs = {
    auto: true,
    remember: true,
    agreement: true,
    ...store.get("qqPreferences", {}),
  };
  let messages = store.get("qqChat", []);
  const timers = new Set();
  const delay = (fn, time) => {
    const timer = setTimeout(() => {
      timers.delete(timer);
      if (!signal.aborted) fn();
    }, time);
    timers.add(timer);
  };
  const save = () => store.set("qqChat", messages);
  function card() {
    ctx.dialog({
      title: "Lozic 的 QQ 名片",
      body: `<div class="qq-profile-card"><img src="${profile.avatar}" alt="Lozic"><h3>${h(profile.name)}</h3><p>${h(profile.welcome)}</p><div class="selectable">QQ ${profile.qq}</div></div>`,
      buttons: [
        { id: "copy", label: "复制 QQ 号" },
        { id: "contacts", label: "更多联系方式", primary: true },
      ],
      onAction: async (id) => {
        if (id === "copy") {
          await copy(profile.qq);
          ctx.toast("QQ 号已复制");
        } else ctx.open("contacts");
        return true;
      },
    });
  }
  function terms() {
    ctx.dialog({
      title: "个人网站演示与隐私说明",
      body: "<p>QQ 界面用来介绍站点主人。登录只进入本地演示会话，无需真实密码；这里的消息不会发送到 QQ。</p><p>公开留言请使用“信息”。留言昵称和正文会保存到独立服务，并对其他访客公开。演示聊天、草稿和界面偏好只保存在当前浏览器。</p>",
    });
  }
  function renderLogin() {
    ctx.setChrome(false);
    root.innerHTML = `<div class="qq-login"><div class="qq-drag-strip" data-drag-window></div><button class="qq-menu" data-qq="menu" aria-label="QQ 菜单">${icon("menu", 23)}</button><button class="qq-close" data-qq="close" aria-label="关闭 QQ">${icon("close", 26)}</button><button class="qq-login-avatar" data-qq="profile" aria-label="查看 QQ 名片"><img src="${profile.avatar}" alt="Lozic"></button><button class="qq-account" data-qq="account" aria-label="账号选项"><span>${profile.qq}</span>${icon("chevron", 38)}</button><div class="qq-password" aria-label="演示密码占位，不需要真实密码" title="演示占位，无需输入真实密码">${prefs.remember ? "•••••••••••" : "无需输入密码"}</div><label class="qq-option qq-auto"><input type="checkbox" data-pref="auto" ${prefs.auto ? "checked" : ""}><span>自动登录</span></label><label class="qq-option qq-remember"><input type="checkbox" data-pref="remember" ${prefs.remember ? "checked" : ""}><span>记住密码</span></label><button class="qq-login-button" data-qq="login" ${!prefs.agreement ? "disabled" : ""}>登录</button><div class="qq-agreement"><label class="qq-option"><input type="checkbox" data-pref="agreement" ${prefs.agreement ? "checked" : ""}><span>已阅读并同意</span></label> <button data-qq="terms">服务协议</button> 和 <button data-qq="terms">隐私政策</button></div><div class="qq-login-links"><button data-qq="qr">扫码登录</button><i></i><button data-qq="register">注册账号</button></div><span class="qq-demo-caption">个人网站演示 · 无需真实密码</span></div>`;
  }
  function login() {
    if (busy || !prefs.agreement) return;
    busy = true;
    const b = root.querySelector(".qq-login-button");
    if (b) {
      b.textContent = "正在登录…";
      b.disabled = true;
    }
    delay(() => {
      busy = false;
      logged = true;
      loggedOnce = true;
      ctx.setChrome(true);
      ctx.desktop.setRect(ctx.win, {
        x: (innerWidth - 900) / 2,
        y: Math.max(48, (innerHeight - 610) / 2 - 15),
        w: 900,
        h: 610,
      });
      ctx.setTitle("QQ");
      renderChat();
    }, 430);
  }
  function renderChat() {
    if (!messages.length) {
      messages = [
        {
          id: uid(),
          side: "them",
          text: "你好呀，我是 Lozic。欢迎来我的 Mac 坐坐。",
        },
        {
          id: uid(),
          side: "them",
          text: "这里是我的预设小会话。想真正留下一句话，可以点下面的“给你留言”。",
        },
      ];
      save();
    }
    root.innerHTML = `<div class="qq-chat-app"><nav class="qq-rail"><button data-qq="profile" class="qq-rail-avatar"><img src="${profile.avatar}" alt="我的名片"></button><button class="active" data-qq="chat" aria-label="聊天">${icon("chat", 24)}</button><button data-qq="contacts" aria-label="联系人">${icon("person", 24)}</button><div class="spacer"></div><button data-qq="chatmenu" aria-label="QQ 设置">${icon("menu", 23)}</button></nav><aside class="qq-list"><label class="search-field">${icon("search", 15)}<input data-search-chat placeholder="搜索" aria-label="搜索会话"></label><button class="qq-conversation" data-qq="chat"><img src="${profile.avatar}" alt=""><div><b>Lozic</b><span>来坐一会儿，听首歌吧。</span></div><small>预设</small></button></aside><section class="qq-conversation-main"><header><div><b>Lozic</b><small>个人网站 · 预设会话</small></div><button class="icon-button" data-qq="search" aria-label="搜索聊天">${icon("search")}</button><button class="icon-button" data-qq="profile" aria-label="会话信息">${icon("more")}</button></header><div class="qq-messages"></div><div class="qq-quick">${[
      ["intro", "认识你"],
      ["music", "最近在听什么"],
      ["website", "你的主页"],
      ["guestbook", "给你留言"],
      ["friend", "加个好友"],
    ]
      .map(([id, label]) => `<button data-topic="${id}">${label}</button>`)
      .join(
        "",
      )}</div><form class="qq-composer"><div class="qq-composer-tools"><button type="button" data-qq="emoji" aria-label="表情">${icon("smile", 21)}</button><button type="button" data-qq="attach" aria-label="分享名片或歌曲">${icon("folder", 21)}</button><button type="button" data-qq="history" aria-label="聊天记录">${icon("history", 21)}</button></div><textarea placeholder="和这个小小的分身聊聊…" aria-label="QQ 演示消息" maxlength="1000"></textarea><div><small>演示消息仅保存在此浏览器</small><button type="submit">发送</button></div></form></section></div>`;
    drawMessages();
    const form = root.querySelector("form");
    form.addEventListener(
      "submit",
      (e) => {
        e.preventDefault();
        const input = form.querySelector("textarea"),
          text = input.value.trim();
        if (!text) return;
        input.value = "";
        send(text);
      },
      { signal },
    );
    form.querySelector("textarea").addEventListener(
      "keydown",
      (e) => {
        if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
          e.preventDefault();
          form.requestSubmit();
        }
      },
      { signal },
    );
  }
  function drawMessages() {
    const el = root.querySelector(".qq-messages");
    if (!el) return;
    el.innerHTML = `<div class="qq-chat-date">今天 · 来自 Lozic 的预设会话</div>${messages.map((m) => `<div class="qq-message ${m.side === "me" ? "outgoing" : ""}">${m.side !== "me" ? `<img class="qq-message-avatar" src="${profile.avatar}" alt="">` : ""}<div class="qq-bubble"><span>${h(m.text)}</span>${m.card === "music" ? `<button class="qq-share-card" data-qq="play">${icon("music", 32)}<div><b>${h(tracks[0].title)}</b><small>${h(tracks[0].artist)} · 点开听听</small></div>${icon("play", 20)}</button>` : ""}${m.card === "contact" ? `<button class="qq-share-card" data-qq="profile"><img src="${profile.avatar}" alt=""><div><b>Lozic</b><small>QQ ${profile.qq}</small></div>${icon("forward", 18)}</button>` : ""}${m.action ? `<button class="qq-message-link" data-qq="${h(m.action)}">${m.action === "website" ? "打开个人网站 ↗" : "打开公开留言 →"}</button>` : ""}</div></div>`).join("")}`;
    el.scrollTop = el.scrollHeight;
  }
  function send(text, topic) {
    messages.push({ id: uid(), side: "me", text });
    drawMessages();
    save();
    delay(() => {
      let response;
      if (topic === "music" || /歌|音乐|听/.test(text))
        response = {
          text: "最近桌面里放着这首歌。歌词会变成代码，一起听一会儿吧。",
          card: "music",
        };
      else if (topic === "website" || /网站|主页/.test(text))
        response = {
          text: "这是我的个人网站，Safari 带你过去。",
          action: "website",
        };
      else if (topic === "guestbook" || /留言|联系/.test(text))
        response = {
          text: "真正的留言放在“信息”里，每个来访的人都能留下一点痕迹。",
          action: "guestbook",
        };
      else if (topic === "friend" || /好友|QQ|qq/.test(text))
        response = {
          text: `我的 QQ 是 ${profile.qq}。点名片可以复制，期待认识你。`,
          card: "contact",
        };
      else if (topic === "intro" || /你好|是谁|介绍|认识/.test(text))
        response = { text: profile.bio };
      else
        response = {
          text: "收到你在这个小会话里的话啦。我是预设的桌面分身，想让主人看到的话，请移步“信息”留一句。",
          action: "guestbook",
        };
      messages.push({ id: uid(), side: "them", ...response });
      save();
      drawMessages();
    }, 550);
  }
  on(
    root,
    "change",
    "[data-pref]",
    (e, b) => {
      prefs[b.dataset.pref] = b.checked;
      store.set("qqPreferences", prefs);
      if (b.dataset.pref === "remember")
        root.querySelector(".qq-password").textContent = b.checked
          ? "•••••••••••"
          : "无需输入密码";
      if (b.dataset.pref === "agreement")
        root.querySelector(".qq-login-button").disabled = !b.checked;
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-topic]",
    (e, b) => send(b.textContent, b.dataset.topic),
    signal,
  );
  on(
    root,
    "input",
    "[data-search-chat]",
    (e, b) =>
      (root.querySelector(".qq-conversation").hidden =
        !`lozic 来坐一会儿 听首歌`.includes(b.value.trim().toLowerCase())),
    signal,
  );
  on(
    root,
    "click",
    "[data-qq]",
    (e, b) => {
      const a = b.dataset.qq;
      if (a === "close") ctx.desktop.close("qq");
      if (a === "profile") card();
      if (a === "terms") terms();
      if (a === "login") login();
      if (a === "play") ctx.open("vscode", { play: true });
      if (a === "website") ctx.open("safari", { url: profile.website });
      if (a === "guestbook") ctx.open("messages");
      if (a === "contacts") ctx.open("contacts");
      if (a === "account")
        ctx.menu(
          [
            { label: `${profile.name} · ${profile.qq}`, disabled: true },
            {
              label: "复制 QQ 号",
              action: async () => {
                await copy(profile.qq);
                ctx.toast("QQ 号已复制");
              },
            },
            { label: "查看个人名片", action: card },
          ],
          b,
        );
      if (a === "menu" || a === "chatmenu")
        ctx.menu(
          [
            { label: "个人资料", action: card },
            {
              label: "打开个人主页",
              action: () => ctx.open("safari", { url: profile.website }),
            },
            { label: "演示与隐私说明", action: terms },
            ...(logged
              ? [
                  { separator: true },
                  {
                    label: "清空本地会话",
                    action: () => {
                      messages = [];
                      save();
                      renderChat();
                    },
                  },
                  {
                    label: "退出演示登录",
                    action: () => {
                      logged = false;
                      loggedOnce = false;
                      ctx.setSize(400, 575);
                      renderLogin();
                    },
                  },
                ]
              : []),
          ],
          b,
        );
      if (a === "qr")
        ctx.dialog({
          title: "扫码访问个人主页",
          body: `<div class="qq-qr"><img src="assets/qr/profile.svg" alt="lozic7.com 个人主页二维码"><p>手机扫码访问 lozic7.com。<br>这是个人主页二维码，不用于真实 QQ 登录。</p></div>`,
        });
      if (a === "register") external("https://ssl.zc.qq.com/v3/index-chs.html");
      if (a === "emoji")
        ctx.menu(
          ["🙂", "✨", "🎵", "🌙", "☀️", "👋", "❤️"].map((emoji) => ({
            label: emoji,
            action: () => {
              const input = root.querySelector("textarea");
              input.value += emoji;
              input.focus();
            },
          })),
          b,
        );
      if (a === "attach")
        ctx.menu(
          [
            { label: "分享这首歌", action: () => send("分享一首歌", "music") },
            {
              label: "分享个人名片",
              action: () => send("看看你的名片", "friend"),
            },
          ],
          b,
        );
      if (a === "history" || a === "search") {
        const dialog = ctx.dialog({
          title: "查找聊天记录",
          body: `<input class="qq-history-search" aria-label="查找聊天记录" placeholder="输入关键词"><div class="qq-history-results"></div>`,
        });
        const input = dialog.querySelector("input");
        const render = () => {
          dialog.querySelector(".qq-history-results").innerHTML =
            messages
              .filter((m) => m.text.includes(input.value))
              .map(
                (m) =>
                  `<p><b>${m.side === "me" ? "访客" : "Lozic"}：</b>${h(m.text)}</p>`,
              )
              .join("") || "<p>没有找到相关记录。</p>";
        };
        input.oninput = render;
        render();
      }
    },
    signal,
  );
  renderLogin();
  if (loggedOnce && prefs.auto)
    delay(() => {
      if (!logged && prefs.auto) login();
    }, 1100);
  return {
    dispose() {
      for (const timer of timers) clearTimeout(timer);
    },
    menus: {
      file: [
        { label: "个人名片", action: card },
        { label: "打开公开留言", action: () => ctx.open("messages") },
        { label: "退出 QQ", action: () => ctx.desktop.close("qq") },
      ],
    },
  };
}
