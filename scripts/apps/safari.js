import { profile } from "../config.js";
import { h, icon, on, store, safeURL, external, uid } from "../ui.js";

export function mountSafari(ctx) {
  const { root, signal } = ctx;
  let tabs = [],
    active = "";
  let favorites = store.get("safariFavorites", [
    { title: "个人主页", url: profile.website, app: "safari" },
    {
      title: "GitHub",
      url: `https://github.com/${profile.github}`,
      app: "github",
    },
    { title: "给我留言", app: "messages" },
    { title: "发一封信", app: "gmail" },
  ]);
  root.innerHTML = `<div class="safari-toolbar"><button class="icon-button" data-safari="sidebar" aria-label="收藏栏">${icon("sidebar", 20)}</button><button class="icon-button" data-safari="back" aria-label="后退">${icon("back", 19)}</button><button class="icon-button" data-safari="forward" aria-label="前进">${icon("forward", 19)}</button><form class="safari-address"><span>${icon("lock", 12)}</span><input aria-label="Safari 地址栏" placeholder="搜索或输入网站名称" autocomplete="off"><button type="button" data-safari="reload" aria-label="重新载入">${icon("refresh", 16)}</button></form><button class="icon-button" data-safari="share" aria-label="在浏览器打开">${icon("external", 19)}</button><button class="icon-button" data-safari="bookmark" aria-label="加入收藏">${icon("star", 19)}</button><button class="icon-button" data-safari="new" aria-label="新建标签页">${icon("plus", 21)}</button></div><div class="safari-tabs"></div><div class="safari-bookmarks" hidden></div><div class="safari-pages"></div>`;
  const current = () => tabs.find((t) => t.id === active);
  function newTab(url = "about:start") {
    const tab = { id: uid(), url, history: [url], index: 0 };
    tabs.push(tab);
    active = tab.id;
    render();
    renderPage(tab);
  }
  function navigate(value) {
    let url = value.trim();
    if (url !== "about:start") {
      if (!/^[a-z][\w+.-]*:/i.test(url))
        url =
          url.includes(".") && !url.includes(" ")
            ? `https://${url}`
            : `https://www.bing.com/search?q=${encodeURIComponent(url)}`;
      url = safeURL(url);
      if (!url) {
        ctx.toast("无法打开这个地址", "请输入 http 或 https 网站地址。");
        return;
      }
    }
    const tab = current();
    tab.history = tab.history.slice(0, tab.index + 1);
    tab.history.push(url);
    tab.index++;
    tab.url = url;
    render();
    renderPage(tab);
  }
  function title(tab) {
    if (tab.url === "about:start") return "起始页";
    try {
      return new URL(tab.url).hostname || "网页";
    } catch {
      return "网页";
    }
  }
  function render() {
    const tab = current();
    root.querySelector(".safari-tabs").innerHTML = tabs
      .map(
        (t) =>
          `<div class="safari-tab ${t.id === active ? "active" : ""}"><button data-tab="${t.id}">${icon(t.url === "about:start" ? "grid" : "globe", 12)}<span>${h(title(t))}</span></button><button data-close-tab="${t.id}" aria-label="关闭 ${h(title(t))} 标签页">×</button></div>`,
      )
      .join("");
    root.querySelector(".safari-address input").value =
      tab.url === "about:start" ? "" : tab.url;
    root.querySelector("[data-safari=back]").disabled = tab.index === 0;
    root.querySelector("[data-safari=forward]").disabled =
      tab.index === tab.history.length - 1;
    root.querySelector(".safari-bookmarks").innerHTML = favorites
      .map((f, i) => `<button data-favorite="${i}">${h(f.title)}</button>`)
      .join("");
    root
      .querySelectorAll(".safari-page")
      .forEach((p) => (p.hidden = p.dataset.page !== active));
  }
  function renderPage(tab) {
    let el = root.querySelector(`[data-page="${tab.id}"]`);
    if (!el) {
      el = document.createElement("div");
      el.className = "safari-page";
      el.dataset.page = tab.id;
      root.querySelector(".safari-pages").append(el);
    }
    el.hidden = tab.id !== active;
    if (tab.url === "about:start")
      el.innerHTML = `<div class="safari-start"><div class="safari-start-title"><span>SAFARI</span><h1>从这里，去看看世界。</h1><p>也欢迎你，看看我的小小世界。</p></div><h2>个人收藏</h2><div class="safari-favorite-grid">${favorites.map((f, i) => `<button data-favorite="${i}"><span>${f.app && ctx.desktop.registry[f.app] ? ctx.desktop.appImage(f.app) : icon("globe", 35)}</span><b>${h(f.title)}</b></button>`).join("")}</div><div class="safari-start-note">${icon("lock", 20)}<div><b>你在 Lozic 的 Mac 上</b><p>这个浏览器窗口通向真实网站。外部网页也可以在新标签页中打开。</p></div></div></div>`;
    else {
      el.innerHTML = `<div class="safari-external-bar"><span>${icon("globe", 12)} ${h(title(tab))}</span><button data-open-url="${h(tab.url)}">在浏览器中打开 ${icon("external", 12)}</button></div><iframe title="${h(title(tab))} 网页" src="${h(tab.url)}" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads" referrerpolicy="strict-origin-when-cross-origin"></iframe><div class="safari-frame-help">如果网站限制在窗口中显示，请选择“在浏览器中打开”。 <button data-safari="home">回到起始页</button></div>`;
    }
  }
  on(
    root,
    "click",
    "[data-tab]",
    (e, b) => {
      active = b.dataset.tab;
      render();
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-close-tab]",
    (e, b) => {
      const id = b.dataset.closeTab,
        index = tabs.findIndex((t) => t.id === id);
      root.querySelector(`[data-page="${id}"]`)?.remove();
      tabs = tabs.filter((t) => t.id !== id);
      if (!tabs.length) {
        newTab();
        return;
      }
      if (active === id) active = tabs[Math.min(index, tabs.length - 1)].id;
      render();
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-favorite]",
    (e, b) => {
      const favorite = favorites[Number(b.dataset.favorite)];
      if (favorite.url) navigate(favorite.url);
      else ctx.open(favorite.app);
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-open-url]",
    (e, b) => external(b.dataset.openUrl),
    signal,
  );
  on(
    root,
    "click",
    "[data-safari]",
    (e, b) => {
      const action = b.dataset.safari,
        tab = current();
      if (action === "new") newTab();
      if (action === "home") navigate("about:start");
      if (action === "sidebar")
        root.querySelector(".safari-bookmarks").hidden =
          !root.querySelector(".safari-bookmarks").hidden;
      if (action === "share" && tab.url !== "about:start") external(tab.url);
      if (action === "reload") renderPage(tab);
      if (action === "back" || action === "forward") {
        const index = tab.index + (action === "back" ? -1 : 1);
        if (index >= 0 && index < tab.history.length) {
          tab.index = index;
          tab.url = tab.history[index];
          render();
          renderPage(tab);
        }
      }
      if (action === "bookmark" && tab.url !== "about:start") {
        const dialog = ctx.dialog({
          title: "添加个人收藏",
          body: `<label class="form-field">名称<input name="title" value="${h(title(tab))}" maxlength="50"></label><p class="muted">${h(tab.url)}</p>`,
          buttons: [
            { id: "cancel", label: "取消" },
            { id: "save", label: "添加", primary: true },
          ],
          onAction: (id, el) => {
            if (id === "save") {
              const name = el.querySelector("input").value.trim();
              if (!name) return false;
              favorites.push({ title: name, url: tab.url });
              store.set("safariFavorites", favorites);
              render();
              ctx.toast("已加入个人收藏");
            }
            return true;
          },
        });
      }
    },
    signal,
  );
  root.querySelector("form").addEventListener(
    "submit",
    (e) => {
      e.preventDefault();
      const value = root.querySelector(".safari-address input").value;
      if (value.trim()) navigate(value);
    },
    { signal },
  );
  newTab(ctx.data.url || profile.website);
  return {
    receive(data) {
      if (data.url) navigate(data.url);
    },
    menus: {
      file: [
        { label: "新建标签页", action: () => newTab() },
        { label: "显示起始页", action: () => navigate("about:start") },
        { label: "打开个人网站", action: () => navigate(profile.website) },
        {
          label: "在浏览器中打开",
          action: () => {
            if (current().url !== "about:start") external(current().url);
          },
        },
      ],
    },
  };
}
