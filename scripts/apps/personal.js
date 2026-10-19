import {
  profile,
  wallpapers,
  defaultDock,
  defaultDesktopApps,
} from "../config.js";
import { guestbook } from "../guestbook.js";
import { player } from "../player.js";
import {
  h,
  icon,
  on,
  store,
  copy,
  download,
  timeLabel,
  external,
} from "../ui.js";

export function contactActions(ctx) {
  return [
    { id: "qq", label: "QQ", value: profile.qq, action: () => ctx.open("qq") },
    {
      id: "gmail",
      label: "Gmail",
      value: profile.gmail,
      action: () => ctx.open("gmail", { compose: true }),
    },
    {
      id: "netease",
      label: "网易邮箱",
      value: profile.netease,
      action: () => ctx.open("netease", { compose: true }),
    },
    {
      id: "github",
      label: "GitHub",
      value: profile.github,
      action: () => ctx.open("github"),
    },
    {
      id: "website",
      label: "个人网站",
      value: profile.website,
      action: () => ctx.open("safari", { url: profile.website }),
    },
  ];
}
export function mountContacts(ctx) {
  const { root, signal } = ctx;
  ctx.setTitle("通讯录");
  root.innerHTML = `<div class="contacts-app"><aside class="contacts-sidebar"><label class="search-field">${icon("search", 15)}<input aria-label="搜索联系人" placeholder="搜索"></label><h4>所有联系人</h4><button class="contact-list-person"><img src="${profile.avatar}" alt=""><div><b>${h(profile.name)}</b><span>我的名片</span></div></button></aside><section class="contact-detail"><header><img src="${profile.avatar}" alt="Lozic"><div><h1>${h(profile.name)}</h1><p>${h(profile.welcome)}</p></div></header><div class="contact-shortcuts"><button data-contact="messages">${icon("chat", 22)}<span>信息</span></button><button data-contact="gmail">${icon("mail", 22)}<span>邮件</span></button><button data-contact="facetime">${icon("video", 22)}<span>来访</span></button><button data-contact="website">${icon("globe", 22)}<span>网站</span></button></div><div class="contact-fields">${contactActions(
    ctx,
  )
    .map(
      (c) =>
        `<div><label>${c.label}</label><button data-contact="${c.id}">${h(c.value)}</button><button data-copy="${h(c.value)}" class="icon-button" aria-label="复制 ${c.label}">${icon("copy", 15)}</button></div>`,
    )
    .join(
      "",
    )}<div><label>备注</label><p>${h(profile.bio)}</p></div></div><button class="mac-button" data-contact="export">${icon("download", 15)} 导出联系人</button></section></div>`;
  on(
    root,
    "click",
    "[data-contact]",
    (e, b) => {
      const id = b.dataset.contact;
      if (id === "export") {
        download(
          "Lozic.vcf",
          `BEGIN:VCARD\r\nVERSION:3.0\r\nFN:${profile.name}\r\nN:;${profile.name};;;\r\nEMAIL;TYPE=INTERNET:${profile.gmail}\r\nEMAIL;TYPE=INTERNET:${profile.netease}\r\nURL:${profile.website}\r\nNOTE:QQ ${profile.qq}\r\nEND:VCARD\r\n`,
          "text/vcard;charset=utf-8",
        );
        return;
      }
      const action = contactActions(ctx).find((a) => a.id === id);
      if (action) action.action();
      else ctx.open(id);
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-copy]",
    async (e, b) => {
      await copy(b.dataset.copy);
      ctx.toast("联系方式已复制");
    },
    signal,
  );
  on(
    root,
    "input",
    "input",
    (e, b) =>
      (root.querySelector(".contact-list-person").hidden =
        !`${profile.name} ${profile.qq} ${profile.gmail}`
          .toLowerCase()
          .includes(b.value.toLowerCase())),
    signal,
  );
  return {};
}
export function mountPhone(ctx) {
  const { root, signal } = ctx;
  let tab = "favorites",
    digits = "",
    recents = store.get("phoneRecents", []),
    tone = store.get("phoneTone", false);
  ctx.setTitle("电话");
  function remember(label) {
    recents.unshift({ label, time: Date.now() });
    recents = recents.slice(0, 30);
    store.set("phoneRecents", recents);
  }
  function render() {
    root.innerHTML = `<div class="phone-app"><aside class="app-sidebar"><h2>电话</h2>${[
      ["favorites", "个人收藏", "star"],
      ["recents", "最近操作", "history"],
      ["contacts", "联系人", "person"],
      ["keypad", "拨号键盘", "grid"],
    ]
      .map(
        ([id, label, symbol]) =>
          `<button class="sidebar-item ${tab === id ? "active" : ""}" data-phone-tab="${id}">${icon(symbol, 17)}${label}</button>`,
      )
      .join(
        "",
      )}<p class="phone-side-note">用一种熟悉的方式，<br>保持联系。</p></aside><main class="phone-main">${
      tab === "keypad"
        ? `<output class="phone-number">${h(digits || "输入号码")}</output><div class="phone-keypad">${[
            ["1", ""],
            ["2", "ABC"],
            ["3", "DEF"],
            ["4", "GHI"],
            ["5", "JKL"],
            ["6", "MNO"],
            ["7", "PQRS"],
            ["8", "TUV"],
            ["9", "WXYZ"],
            ["*", ""],
            ["0", "+"],
            ["#", ""],
          ]
            .map(
              ([n, l]) =>
                `<button data-digit="${n}"><b>${n}</b><small>${l}</small></button>`,
            )
            .join(
              "",
            )}</div><div class="phone-dial-actions"><button class="phone-call" data-phone="call" aria-label="拨打号码">${icon("phone", 26)}</button><button class="icon-button" data-phone="backspace" aria-label="删除号码">⌫</button></div><label class="phone-tone"><input type="checkbox" data-tone ${tone ? "checked" : ""}> 按键音</label>`
        : tab === "recents"
          ? `<header class="phone-section-heading"><h1>最近操作</h1><button class="link-button" data-phone="clear">清除</button></header>${recents.length ? recents.map((r) => `<div class="phone-recent">${icon("phone", 20)}<div><b>${h(r.label)}</b><small>本站联系入口 · ${timeLabel(r.time)}</small></div></div>`).join("") : '<div class="empty-state"><h2>还没有最近操作</h2><p>使用联系入口后，记录会保存在此浏览器。</p></div>'}`
          : `<div class="phone-contact"><img src="${profile.avatar}" alt="Lozic"><h1>${h(profile.name)}</h1><p>${h(profile.welcome)}</p><div class="phone-contact-buttons"><button data-phone="messages">${icon("chat", 25)}<span>留句话</span></button><button data-phone="mail">${icon("mail", 25)}<span>写封信</span></button><button data-phone="qq">${icon("person", 25)}<span>QQ</span></button></div><button class="mac-button" data-phone="details">查看完整名片</button><small>暂未公开电话号码，可通过以上方式联系。</small></div>`
    }</main></div>`;
  }
  function press(digit) {
    if (digits.length < 24) digits += digit;
    if (tone) {
      try {
        const audio = new AudioContext(),
          osc = audio.createOscillator(),
          gain = audio.createGain();
        osc.frequency.value = 440 + (Number(digit) || 0) * 25;
        gain.gain.value = 0.035;
        osc.connect(gain);
        gain.connect(audio.destination);
        osc.start();
        osc.stop(audio.currentTime + 0.07);
        osc.onended = () => audio.close();
      } catch {}
    }
    root.querySelector(".phone-number").textContent = digits || "输入号码";
  }
  on(
    root,
    "click",
    "[data-phone-tab]",
    (e, b) => {
      tab = b.dataset.phoneTab;
      render();
    },
    signal,
  );
  on(root, "click", "[data-digit]", (e, b) => press(b.dataset.digit), signal);
  on(
    root,
    "change",
    "[data-tone]",
    (e, b) => {
      tone = b.checked;
      store.set("phoneTone", tone);
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-phone]",
    (e, b) => {
      const a = b.dataset.phone;
      if (a === "messages") {
        remember("打开公开留言");
        ctx.open("messages");
      }
      if (a === "mail") {
        remember("打开写信");
        ctx.open("gmail", { compose: true });
      }
      if (a === "qq") {
        remember("查看 QQ 名片");
        ctx.open("qq");
      }
      if (a === "details") ctx.open("contacts");
      if (a === "backspace") {
        digits = digits.slice(0, -1);
        render();
      }
      if (a === "clear") {
        recents = [];
        store.set("phoneRecents", []);
        render();
      }
      if (a === "call")
        ctx.dialog({
          title: "选择一种联系方式",
          body: "<p>本站没有接入真实电话服务，主人也尚未提供电话号码。可以直接在信息里留言，或写一封邮件。</p>",
          buttons: [
            { id: "cancel", label: "取消" },
            { id: "messages", label: "发信息", primary: true },
          ],
          onAction: (id) => {
            if (id === "messages") {
              remember("从拨号盘打开留言");
              ctx.open("messages");
            }
            return true;
          },
        });
    },
    signal,
  );
  ctx.win.el.addEventListener(
    "keydown",
    (e) => {
      if (
        tab !== "keypad" ||
        e.ctrlKey ||
        e.metaKey ||
        e.target.matches("input")
      )
        return;
      if (/^[0-9*#]$/.test(e.key)) {
        e.preventDefault();
        press(e.key);
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        digits = digits.slice(0, -1);
        render();
      }
    },
    { signal },
  );
  render();
  return {};
}
export function mountSettings(ctx) {
  const { root, signal } = ctx;
  let selected = ctx.data.tab || "appearance";
  const tabs = [
    ["appearance", "外观", "sun"],
    ["wallpaper", "墙纸", "image"],
    ["dock", "桌面与 Dock", "grid"],
    ["sound", "声音", "volume"],
    ["widgets", "小组件", "calendar"],
    ["privacy", "隐私与留言", "lock"],
    ["about", "关于", "info"],
  ];
  ctx.setTitle("系统设置");
  root.innerHTML = `<div class="settings-app"><aside class="settings-sidebar"><div class="settings-profile"><img src="${profile.avatar}" alt=""><div><b>${profile.name}</b><span>这台小小的 Mac</span></div></div>${tabs.map(([id, name, symbol]) => `<button data-settings-tab="${id}">${icon(symbol, 18)}${name}</button>`).join("")}</aside><main class="settings-main"></main></div>`;
  function render() {
    const prefs = ctx.desktop.prefs;
    root
      .querySelectorAll("[data-settings-tab]")
      .forEach((b) =>
        b.classList.toggle("active", b.dataset.settingsTab === selected),
      );
    const main = root.querySelector("main");
    main.innerHTML = `<h1>${tabs.find((t) => t[0] === selected)?.[1]}</h1>`;
    if (selected === "appearance")
      main.innerHTML += `<div class="settings-card"><p>选择这台桌面的外观。</p><div class="appearance-options">${["light", "dark"].map((theme) => `<button data-theme="${theme}" class="${prefs.theme === theme ? "selected" : ""}"><span class="appearance-preview ${theme}"><i></i><b></b></span>${theme === "light" ? "浅色" : "深色"}</button>`).join("")}</div></div><div class="settings-card"><label class="setting-row"><span>减少动态效果<small>减少 Dock、窗口和文字动画</small></span><input data-setting="reducedMotion" type="checkbox" ${prefs.reducedMotion ? "checked" : ""}></label></div>`;
    if (selected === "wallpaper")
      main.innerHTML += `<p class="settings-caption">包括最初版本使用的壁纸。</p><div class="wallpaper-options">${wallpapers.map((w) => `<button data-wallpaper="${w.id}" class="${prefs.wallpaper === w.id ? "selected" : ""}"><img src="${w.src}" alt="${w.name}"><span>${w.name}</span>${prefs.wallpaper === w.id ? icon("check", 16) : ""}</button>`).join("")}</div>`;
    if (selected === "dock")
      main.innerHTML += `<div class="settings-card"><label class="setting-row"><span>图标大小</span><input type="range" data-dock-size min="36" max="64" value="${prefs.dockSize}" aria-label="Dock 图标大小"></label><label class="setting-row"><span>悬停放大</span><input type="checkbox" data-setting="magnification" ${prefs.magnification ? "checked" : ""}></label><div class="setting-row"><span>应用顺序<small>拖动 Dock 中的图标来调整</small></span><button class="mac-button" data-setting-action="reset-dock">恢复默认</button></div></div>`;
    if (selected === "sound")
      main.innerHTML += `<div class="settings-card"><label class="setting-row"><span>音乐音量</span><input data-sound type="range" min="0" max="1" step=".01" value="${player.audio.volume}" aria-label="音乐音量"></label><div class="setting-row"><span>当前歌曲<small>${h(player.track.title)} — ${h(player.track.artist)}</small></span><button class="mac-button" data-setting-action="play">${player.playing ? "暂停" : "播放"}</button></div></div><p class="settings-caption">这里只调节本站播放器，不会改变你的电脑系统音量。</p>`;
    if (selected === "widgets")
      main.innerHTML += `<div class="settings-card">${[
        ["calendar", "日历"],
        ["weather", "天气"],
        ["music", "正在播放"],
        ["reminders", "提醒事项"],
        ["profile", "个人名片"],
      ]
        .map(
          ([id, label]) =>
            `<label class="setting-row"><span>${label}</span><input type="checkbox" data-widget-setting="${id}" ${!store.get("hiddenWidgets", []).includes(id) ? "checked" : ""}></label>`,
        )
        .join(
          "",
        )}<div class="setting-row"><span>组件位置</span><button class="mac-button" data-setting-action="reset-widgets">恢复布局</button></div></div><p class="settings-caption">直接拖动桌面组件即可摆放，也可以右键移除。</p>`;
    if (selected === "privacy")
      main.innerHTML += `<div class="settings-card"><h3>公开留言</h3><p>昵称和留言会保存到独立留言服务，并供其他访客阅读。昵称并不是身份认证；主人标识由后台认证信息决定。</p><div class="setting-row"><span>服务连接<small>${guestbook.local ? "本地持久测试服务" : guestbook.configured ? "已配置在线服务" : "待配置在线服务"}</small></span><button class="mac-button" data-setting-action="messages">打开信息</button></div>${guestbook.configured ? `<div class="setting-row"><span>站长后台</span><button class="mac-button" data-setting-action="admin">打开后台 ↗</button></div>` : ""}</div><div class="settings-card"><h3>仅在这个浏览器里</h3><p>QQ 演示聊天、邮件草稿、个人笔记、日历提醒和外观偏好保存在当前浏览器。网页不会读取电脑上的聊天记录或文件。</p></div>`;
    if (selected === "about")
      main.innerHTML += `<div class="settings-about"><img src="${profile.avatar}" alt="Lozic"><h2>${h(profile.title)}</h2><p>Personal Mac · 1.0</p><p>${h(profile.welcome)}</p><button class="mac-button" data-setting-action="contacts">联系主人</button></div><div class="settings-card"><div class="setting-row"><span>视觉资源</span><button class="link-button" data-setting-action="sources">查看来源</button></div><div class="setting-row"><span>桌面偏好</span><button class="mac-button" data-setting-action="reset">恢复默认…</button></div></div>`;
  }
  on(
    root,
    "click",
    "[data-settings-tab]",
    (e, b) => {
      selected = b.dataset.settingsTab;
      render();
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-theme]",
    (e, b) => {
      ctx.desktop.setPreference("theme", b.dataset.theme);
      render();
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-wallpaper]",
    (e, b) => {
      ctx.desktop.setPreference("wallpaper", b.dataset.wallpaper);
      render();
    },
    signal,
  );
  on(
    root,
    "change",
    "[data-setting]",
    (e, b) => ctx.desktop.setPreference(b.dataset.setting, b.checked),
    signal,
  );
  on(
    root,
    "input",
    "[data-dock-size]",
    (e, b) => ctx.desktop.setPreference("dockSize", Number(b.value)),
    signal,
  );
  on(
    root,
    "input",
    "[data-sound]",
    (e, b) => player.setVolume(b.value),
    signal,
  );
  on(
    root,
    "change",
    "[data-widget-setting]",
    (e, b) => {
      const hidden = store
        .get("hiddenWidgets", [])
        .filter((id) => id !== b.dataset.widgetSetting);
      if (!b.checked) hidden.push(b.dataset.widgetSetting);
      store.set("hiddenWidgets", hidden);
      ctx.desktop.renderWidgets();
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-setting-action]",
    (e, b) => {
      const a = b.dataset.settingAction;
      if (a === "reset-dock") {
        ctx.desktop.pinned = [...defaultDock];
        store.set("dock", defaultDock);
        ctx.desktop.renderDock();
      }
      if (a === "reset-widgets") {
        ctx.desktop.resetWidgets();
        render();
      }
      if (a === "play") {
        if (player.active) player.toggle();
        else ctx.open("vscode");
        render();
      }
      if (a === "messages") ctx.open("messages");
      if (a === "contacts") ctx.open("contacts");
      if (a === "admin") external(`${guestbook.server}/ui`);
      if (a === "sources")
        ctx.open("safari", {
          url: new URL("assets/SOURCES.md", document.baseURI).href,
        });
      if (a === "reset")
        ctx.dialog({
          title: "恢复桌面默认偏好？",
          body: "<p>会重置外观、壁纸、Dock 和小组件布局。你的草稿、提醒、本地笔记和公开留言都会保留。</p>",
          buttons: [
            { id: "cancel", label: "取消" },
            { id: "reset", label: "恢复默认", primary: true },
          ],
          onAction: (id) => {
            if (id === "reset") {
              Object.assign(ctx.desktop.prefs, {
                theme: "light",
                wallpaper: "original",
                dockSize: 48,
                magnification: true,
                reducedMotion: false,
              });
              store.set("preferences", ctx.desktop.prefs);
              ctx.desktop.applyPreferences();
              ctx.desktop.pinned = [...defaultDock];
              store.set("dock", defaultDock);
              ctx.desktop.renderDock();
              ctx.desktop.resetWidgets();
              ctx.desktop.desktopApps = [...defaultDesktopApps];
              store.set("desktopApps", defaultDesktopApps);
              store.remove("desktopPositions");
              ctx.desktop.renderFiles();
              render();
            }
            return true;
          },
        });
    },
    signal,
  );
  render();
  return {
    receive(data) {
      if (data.tab) {
        selected = data.tab;
        render();
      }
    },
  };
}
