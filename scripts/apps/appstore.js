import { appInfo, profile, wallpapers } from "../config.js";
import { appCatalog, categories } from "../app-catalog.js";
import { h, icon, on } from "../ui.js";

export function mountAppStore(ctx) {
  const { root, signal } = ctx;
  let section = "discover",
    query = "",
    detail = null;
  ctx.setTitle("App Store");
  root.innerHTML = `<div class="store-app"><aside class="store-sidebar"><label class="search-field">${icon("search", 15)}<input aria-label="搜索应用中心" placeholder="搜索"></label><nav><button data-store-section="discover">${icon("star", 18)}发现</button><button data-store-section="desktop">${icon("grid", 18)}我的桌面</button><button data-store-section="themes">${icon("image", 18)}墙纸精选</button><h4>分类</h4>${categories
    .slice(1)
    .map(
      (category) =>
        `<button data-store-section="${category}">${icon(category === "音乐" ? "music" : category === "认识我" ? "person" : category === "效率" ? "check" : "folder", 18)}${category}</button>`,
    )
    .join(
      "",
    )}</nav><div class="store-account"><img src="${profile.avatar}" alt=""><div><b>${profile.name} 的应用中心</b><span>每个应用，都藏着一点生活。</span></div></div></aside><main class="store-main"></main></div>`;
  const added = (id) => ctx.desktop.desktopApps.includes(id);
  function appCard(id) {
    const app = appInfo[id],
      meta = appCatalog[id];
    return `<article class="store-app-card"><button data-app-detail="${id}" class="store-app-identity">${ctx.desktop.appImage(id)}<span><b>${h(app.name)}</b><small>${h(meta.summary)}</small></span></button><button class="store-get ${added(id) ? "added" : ""}" data-get="${id}">${added(id) ? "打开" : "获取"}</button></article>`;
  }
  function render() {
    root
      .querySelectorAll("[data-store-section]")
      .forEach((b) =>
        b.classList.toggle("active", b.dataset.storeSection === section),
      );
    const main = root.querySelector("main");
    if (detail) {
      const app = appInfo[detail],
        meta = appCatalog[detail];
      main.innerHTML = `<button class="store-back" data-store="back">${icon("back", 16)}返回</button><section class="store-detail"><header>${ctx.desktop.appImage(detail)}<div><h1>${h(app.name)}</h1><p>${h(meta.summary)}</p><span>${h(meta.category)} · 个人桌面应用</span><div class="store-detail-actions"><button class="store-get" data-get="${detail}">${added(detail) ? "打开" : "获取 · 加入桌面"}</button><button class="mac-button" data-pin="${detail}">${ctx.desktop.pinned.includes(detail) ? "移出 Dock" : "固定到 Dock"}</button>${added(detail) ? `<button class="link-button" data-remove-app="${detail}">移出桌面</button>` : ""}</div></div></header><div class="store-feature-stage"><span>${h(meta.category)}</span><h2>${h(meta.summary)}</h2><div>${meta.features.map((feature, i) => `<div><span>0${i + 1}</span><b>${h(feature)}</b></div>`).join("")}</div></div><h3>这个应用能做什么</h3><ul>${meta.features.map((f) => `<li>${h(f)}</li>`).join("")}</ul><p class="store-footnote">获取会把这个站内应用加入你的桌面，不需要下载或安装系统软件。移出快捷方式会保留你的内容。</p></section>`;
      return;
    }
    if (section === "themes") {
      main.innerHTML = `<header class="store-section-title"><h1>墙纸精选</h1><p>换一个背景，换一种心情。</p></header><div class="store-wallpapers">${wallpapers.map((w) => `<button data-theme-wallpaper="${w.id}"><img src="${w.src}" alt="${w.name}"><span>${w.name}</span><small>${ctx.desktop.prefs.wallpaper === w.id ? "正在使用" : "设为墙纸"}</small></button>`).join("")}</div>`;
      return;
    }
    let ids = Object.keys(appCatalog).filter(
      (id) =>
        appInfo[id] &&
        id !== "appstore" &&
        (section === "discover" ||
          (section === "desktop" && added(id)) ||
          appCatalog[id].category === section),
    );
    if (query)
      ids = Object.keys(appCatalog).filter(
        (id) =>
          appInfo[id] &&
          `${appInfo[id].name} ${appInfo[id].english || ""} ${appCatalog[id].summary} ${appCatalog[id].features.join(" ")}`
            .toLowerCase()
            .includes(query),
      );
    main.innerHTML = `<header class="store-section-title"><h1>${query ? "搜索结果" : section === "discover" ? "发现" : section === "desktop" ? "我的桌面" : h(section)}</h1><p>${query ? `找到 ${ids.length} 个应用` : section === "desktop" ? "你选择放在桌面上的小应用。" : "为你的这次来访，添一点小乐趣。"}</p></header>${section === "discover" && !query ? `<div class="store-featured"><button data-app-detail="notes" class="store-hero notes"><span>记录日常</span><h2>今天的心情，<br>明天也记得。</h2><p>笔记、清单，还有一些想做的事。</p>${ctx.desktop.appImage("notes")}</button><button data-app-detail="maps" class="store-hero maps"><span>走走看看</span><h2>把喜欢的地方，<br>收进地图。</h2><p>搜索、收藏，留下地点故事。</p>${ctx.desktop.appImage("maps")}</button></div><h3 class="store-grid-title">值得打开的小应用</h3>` : ""}<div class="store-app-grid">${ids.map(appCard).join("") || '<p class="muted">这里还没有应用。去“发现”逛逛吧。</p>'}</div>`;
  }
  on(
    root,
    "input",
    "input",
    (e, b) => {
      query = b.value.trim().toLowerCase();
      detail = null;
      render();
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-store-section]",
    (e, b) => {
      section = b.dataset.storeSection;
      detail = null;
      query = "";
      root.querySelector("input").value = "";
      render();
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-app-detail]",
    (e, b) => {
      detail = b.dataset.appDetail;
      render();
      root.querySelector("main").scrollTop = 0;
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-get]",
    (e, b) => {
      const id = b.dataset.get;
      if (added(id)) ctx.open(id);
      else {
        ctx.desktop.addDesktopApp(id);
        ctx.desktop.notify(
          "已加入桌面",
          `${appInfo[id].name}，随时可以打开。`,
          () => ctx.open(id),
        );
        render();
      }
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-remove-app]",
    (e, b) => {
      ctx.desktop.removeDesktopApp(b.dataset.removeApp);
      render();
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-pin]",
    (e, b) => {
      ctx.desktop.pin(b.dataset.pin);
      render();
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-theme-wallpaper]",
    (e, b) => {
      ctx.desktop.setPreference("wallpaper", b.dataset.themeWallpaper);
      render();
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-store]",
    () => {
      detail = null;
      render();
    },
    signal,
  );
  ctx.desktop.addEventListener("desktopchange", render, { signal });
  render();
  return {};
}
