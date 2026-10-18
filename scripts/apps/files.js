import { profile, publicNotes, tracks, photos, appInfo } from "../config.js";
import { h, icon, on, store, uid, download, empty } from "../ui.js";

export function mountFinder(ctx) {
  const { root, signal } = ctx;
  let folder = "home",
    view = store.get("finderView", "grid"),
    selected = null,
    query = "",
    history = ["home"],
    index = 0,
    sort = "name";
  const folders = [
    ["home", "Lozic", "home"],
    ["desktop", "桌面", "grid"],
    ["documents", "文稿", "file"],
    ["photos", "图片", "image"],
    ["music", "音乐", "music"],
    ["applications", "应用程序", "folder"],
  ];
  const contents = {
    home: [
      { id: "documents", name: "关于我", type: "folder", target: "documents" },
      { id: "photos", name: "图片", type: "folder", target: "photos" },
      { id: "music", name: "音乐", type: "folder", target: "music" },
      { id: "site", name: "lozic7.com", type: "url", target: profile.website },
      { id: "guestbook", name: "给我留句话", type: "app", target: "messages" },
    ],
    desktop: [
      { id: "documents", name: "关于我", type: "folder", target: "documents" },
      { id: "site", name: "lozic7.com", type: "url", target: profile.website },
    ],
    documents: publicNotes.map((n) => ({
      id: n.id,
      name: `${n.title}.md`,
      type: "note",
      target: n.id,
      body: n.body,
    })),
    photos: [
      { id: "avatar", name: "qq.jpg", type: "photo", target: profile.avatar },
      ...photos.map((p) => ({
        id: p.id,
        name: p.title,
        type: "photo",
        target: p.src,
      })),
    ],
    music: tracks.map((t) => ({
      id: t.id,
      name: `${t.title}.mp3`,
      type: "music",
      target: t.id,
    })),
    applications: Object.entries(appInfo).map(([id, a]) => ({
      id,
      name: a.name,
      type: "app",
      target: id,
    })),
  };
  ctx.setTitle("Lozic");
  root.innerHTML = `<div class="app-toolbar finder-toolbar"><button class="icon-button" data-finder="back" aria-label="后退">${icon("back", 18)}</button><button class="icon-button" data-finder="forward" aria-label="前进">${icon("forward", 18)}</button><b class="finder-folder-title">Lozic</b><span class="spacer"></span><div class="segmented"><button data-view="grid" aria-label="图标视图">${icon("grid", 17)}</button><button data-view="list" aria-label="列表视图">${icon("list", 17)}</button></div><button class="icon-button" data-finder="sort" aria-label="排序">${icon("controls", 18)}</button><button class="icon-button" data-finder="preview" aria-label="快速查看">${icon("info", 18)}</button><label class="search-field">${icon("search", 14)}<input placeholder="搜索" aria-label="搜索文件"></label></div><div class="split-app"><aside class="app-sidebar finder-sidebar"><h4>个人收藏</h4>${folders.map(([id, name, symbol]) => `<button class="sidebar-item" data-folder="${id}">${icon(symbol, 17)}${name}</button>`).join("")}<h4>位置</h4><button class="sidebar-item" data-folder="home">${icon("home", 17)}Lozic 的 Mac</button></aside><main class="app-main finder-main"></main></div><div class="finder-path"></div><footer class="app-status finder-status"></footer>`;
  function list() {
    const values = query
      ? [
          ...new Map(
            Object.values(contents)
              .flat()
              .filter((i) => i.type !== "folder")
              .map((i) => [`${i.type}:${i.id}`, i]),
          ).values(),
        ]
      : contents[folder] || [];
    return values
      .filter((i) => i.name.toLowerCase().includes(query))
      .sort((a, b) =>
        sort === "kind"
          ? a.type.localeCompare(b.type) || a.name.localeCompare(b.name)
          : a.name.localeCompare(b.name, "zh-CN"),
      );
  }
  function itemIcon(item) {
    if (item.type === "folder")
      return `<span class="finder-folder-icon">${icon("folder", 66)}</span>`;
    if (item.type === "app") return ctx.desktop.appImage(item.target);
    if (item.type === "photo")
      return `<img class="finder-photo-icon" src="${h(item.target)}" alt="">`;
    return `<span class="finder-document-icon">${icon(item.type === "music" ? "music" : item.type === "url" ? "globe" : "file", 40)}</span>`;
  }
  function render() {
    const items = list();
    ctx.setTitle(
      query ? "搜索" : folders.find((f) => f[0] === folder)?.[1] || "Lozic",
    );
    root.querySelector(".finder-folder-title").textContent = query
      ? "搜索结果"
      : folders.find((f) => f[0] === folder)?.[1];
    root
      .querySelectorAll("[data-folder]")
      .forEach((b) =>
        b.classList.toggle("active", b.dataset.folder === folder && !query),
      );
    root
      .querySelectorAll("[data-view]")
      .forEach((b) => b.classList.toggle("active", b.dataset.view === view));
    root.querySelector("[data-finder=back]").disabled = index === 0;
    root.querySelector("[data-finder=forward]").disabled =
      index === history.length - 1;
    root.querySelector(".finder-main").innerHTML = items.length
      ? `<div class="finder-items ${view}">${view === "list" ? '<div class="finder-list-heading"><span>名称</span><span>种类</span></div>' : ""}${items.map((item, i) => `<button class="finder-item ${selected === item.id ? "selected" : ""}" data-item="${h(item.id)}" data-item-index="${i}">${itemIcon(item)}<span>${h(item.name)}</span>${view === "list" ? `<small>${{ folder: "文件夹", note: "Markdown 文档", photo: "图像", music: "音频", url: "网页快捷方式", app: "应用程序" }[item.type]}</small>` : ""}</button>`).join("")}</div>`
      : empty(
          "这里暂时没有文件",
          "试试其他文件夹，或换个关键词搜索。",
          "folder",
        );
    root.querySelector(".finder-path").innerHTML =
      `${icon("home", 12)}<button data-folder="home">Lozic</button> ${folder !== "home" ? `${icon("forward", 10)}<span>${h(folders.find((f) => f[0] === folder)?.[1])}</span>` : ""}`;
    root.querySelector(".finder-status").textContent =
      `${items.length} 个项目 · 公开的个人文件夹`;
  }
  function navigate(target, push = true) {
    folder = target;
    query = "";
    root.querySelector("input").value = "";
    selected = null;
    if (push) {
      history = history.slice(0, index + 1);
      history.push(target);
      index++;
    }
    render();
  }
  function open(item) {
    if (!item) return;
    if (item.type === "folder") navigate(item.target);
    if (item.type === "note") ctx.open("notes", { note: item.target });
    if (item.type === "music")
      ctx.open("vscode", { track: item.target, play: true });
    if (item.type === "photo") ctx.open("photos", { photo: item.id });
    if (item.type === "url") ctx.open("safari", { url: item.target });
    if (item.type === "app") ctx.open(item.target);
  }
  function preview(item) {
    if (!item) return;
    if (item.type === "photo")
      ctx.dialog({
        title: item.name,
        body: `<img class="finder-preview-image" src="${h(item.target)}" alt="${h(item.name)}">`,
        width: 560,
      });
    else if (item.type === "note")
      ctx.dialog({
        title: item.name,
        body: `<pre class="finder-preview-text">${h(item.body)}</pre>`,
        width: 600,
      });
    else open(item);
  }
  on(
    root,
    "click",
    "[data-folder]",
    (e, b) => navigate(b.dataset.folder),
    signal,
  );
  on(
    root,
    "click",
    "[data-view]",
    (e, b) => {
      view = b.dataset.view;
      store.set("finderView", view);
      render();
    },
    signal,
  );
  on(
    root,
    "input",
    "input",
    (e, b) => {
      query = b.value.toLowerCase();
      render();
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-item]",
    (e, b) => {
      selected = b.dataset.item;
      root
        .querySelectorAll("[data-item]")
        .forEach((x) => x.classList.toggle("selected", x === b));
    },
    signal,
  );
  on(
    root,
    "dblclick",
    "[data-item]",
    (e, b) => open(list()[Number(b.dataset.itemIndex)]),
    signal,
  );
  on(
    root,
    "contextmenu",
    "[data-item]",
    (e, b) => {
      e.preventDefault();
      const item = list()[Number(b.dataset.itemIndex)];
      ctx.menu(
        [
          { label: "打开", action: () => open(item) },
          { label: "快速查看", action: () => preview(item) },
          ...(item.type === "note"
            ? [
                {
                  label: "下载文档",
                  action: () =>
                    download(
                      item.name,
                      item.body,
                      "text/markdown;charset=utf-8",
                    ),
                },
              ]
            : []),
        ],
        e,
      );
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-finder]",
    (e, b) => {
      const a = b.dataset.finder;
      if (a === "back" && index > 0) {
        index--;
        navigate(history[index], false);
      }
      if (a === "forward" && index < history.length - 1) {
        index++;
        navigate(history[index], false);
      }
      if (a === "preview") preview(list().find((i) => i.id === selected));
      if (a === "sort")
        ctx.menu(
          [
            {
              label: "按名称",
              checked: sort === "name",
              action: () => {
                sort = "name";
                render();
              },
            },
            {
              label: "按种类",
              checked: sort === "kind",
              action: () => {
                sort = "kind";
                render();
              },
            },
          ],
          b,
        );
    },
    signal,
  );
  ctx.win.el.addEventListener(
    "keydown",
    (e) => {
      if (e.target.matches("input")) return;
      const item = list().find((i) => i.id === selected);
      if (e.key === " " && item) {
        e.preventDefault();
        preview(item);
      }
      if (e.key === "Enter" && item) {
        e.preventDefault();
        open(item);
      }
    },
    { signal },
  );
  render();
  return {
    receive(data) {
      if (data.folder) navigate(data.folder);
    },
  };
}

export function mountNotes(ctx) {
  const { root, signal } = ctx;
  let own = store.get("notes", []),
    stars = store.get("noteStars", []),
    folder = "all",
    selected = ctx.data.note || "welcome",
    query = "";
  const all = () => [
    ...publicNotes.map((n) => ({ ...n, readonly: true })),
    ...own,
  ];
  const current = () => all().find((n) => n.id === selected);
  const save = () => {
    store.set("notes", own);
    store.set("noteStars", stars);
  };
  ctx.setTitle("备忘录");
  root.innerHTML = `<div class="app-toolbar notes-toolbar"><button class="icon-button" data-note="sidebar" aria-label="显示或隐藏文件夹">${icon("sidebar", 20)}</button><button class="icon-button" data-note="new" aria-label="新建本地笔记">${icon("edit", 20)}</button><button class="icon-button" data-note="delete" aria-label="移至最近删除">${icon("trash", 18)}</button><span class="spacer"></span><button class="icon-button" data-note="star" aria-label="收藏笔记">${icon("star", 19)}</button><button class="icon-button" data-note="export" aria-label="导出笔记">${icon("share", 19)}</button><label class="search-field">${icon("search", 14)}<input placeholder="搜索" aria-label="搜索笔记"></label></div><div class="notes-app"><aside class="notes-folders"><h4>Lozic</h4>${[
    ["all", "所有笔记"],
    ["about", "关于我"],
    ["music", "音乐"],
    ["starred", "收藏"],
    ["local", "我的本地笔记"],
    ["trash", "最近删除"],
  ]
    .map(
      ([id, label]) =>
        `<button data-note-folder="${id}">${icon(id === "starred" ? "star" : "folder", 16)}${label}</button>`,
    )
    .join(
      "",
    )}<small>你的笔记仅保存在此浏览器。</small></aside><aside class="notes-list"></aside><main class="note-editor"></main></div>`;
  function filtered() {
    return all()
      .filter((n) => {
        if (folder === "trash") return n.deleted;
        if (n.deleted) return false;
        return (
          folder === "all" ||
          (folder === "about" && n.folder === "关于我") ||
          (folder === "music" && n.folder === "音乐") ||
          (folder === "starred" && stars.includes(n.id)) ||
          (folder === "local" && !n.readonly)
        );
      })
      .filter((n) => `${n.title} ${n.body}`.toLowerCase().includes(query));
  }
  function renderList() {
    root
      .querySelectorAll("[data-note-folder]")
      .forEach((b) =>
        b.classList.toggle("active", b.dataset.noteFolder === folder),
      );
    root.querySelector(".notes-list").innerHTML =
      filtered()
        .map(
          (n) =>
            `<button class="${n.id === selected ? "selected" : ""}" data-note-id="${h(n.id)}"><b>${stars.includes(n.id) ? "★ " : ""}${h(n.title || "新笔记")}</b><span>${h(n.body.slice(0, 70) || "还没有内容")}</span><small>${n.readonly ? "主人的公开笔记" : "仅此浏览器"}</small></button>`,
        )
        .join("") || '<p class="notes-list-empty">没有找到笔记</p>';
    const n = current();
    root.querySelector("[data-note=delete]").disabled =
      !n || n.readonly || n.deleted;
    root
      .querySelector("[data-note=star]")
      .classList.toggle("starred", !!n && stars.includes(n.id));
  }
  function renderEditor() {
    const n = current(),
      el = root.querySelector(".note-editor");
    if (!n) {
      el.innerHTML = empty(
        "选一篇笔记",
        "也可以新建一篇，只留在你自己的浏览器里。",
        "file",
      );
      return;
    }
    if (n.deleted) {
      el.innerHTML = `<div class="empty-state"><h2>${h(n.title)}</h2><p>这篇笔记在最近删除中。</p><button class="mac-button" data-note="restore">恢复笔记</button></div>`;
      return;
    }
    el.innerHTML = `<div class="note-meta">${n.readonly ? "Lozic 的公开笔记" : "本地笔记 · 自动保存"} ${n.readonly ? icon("lock", 11) : ""}</div>${n.readonly ? `<h1>${h(n.title)}</h1><div class="public-note-body">${h(n.body).replace(/\n/g, "<br>")}</div><div class="note-related"><button data-note="messages">${icon("chat", 16)} 留一句话</button>${n.id === "music" ? '<button data-note="play">听这首歌 →</button>' : ""}${n.id === "contact" ? '<button data-note="contacts">打开通讯录 →</button>' : ""}</div>` : `<input class="note-title-input" aria-label="笔记标题" value="${h(n.title)}" placeholder="新笔记" maxlength="100"><textarea class="note-body-input" aria-label="笔记内容" placeholder="记一点什么…">${h(n.body)}</textarea>`}`;
  }
  function render() {
    renderList();
    renderEditor();
  }
  on(
    root,
    "click",
    "[data-note-folder]",
    (e, b) => {
      folder = b.dataset.noteFolder;
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
      render();
    },
    signal,
  );
  on(
    root,
    "input",
    ".notes-toolbar input",
    (e, b) => {
      query = b.value.toLowerCase();
      renderList();
    },
    signal,
  );
  on(
    root,
    "input",
    ".note-title-input,.note-body-input",
    (e, b) => {
      const n = own.find((n) => n.id === selected);
      if (!n) return;
      if (b.matches("input")) n.title = b.value;
      else n.body = b.value;
      n.updatedAt = Date.now();
      save();
      renderList();
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-note]",
    (e, b) => {
      const a = b.dataset.note,
        n = current();
      if (a === "new") {
        const note = {
          id: uid(),
          title: "",
          body: "",
          folder: "本地",
          updatedAt: Date.now(),
        };
        own.unshift(note);
        selected = note.id;
        folder = "local";
        save();
        render();
        root.querySelector(".note-title-input").focus();
      }
      if (a === "sidebar")
        root.querySelector(".notes-folders").hidden =
          !root.querySelector(".notes-folders").hidden;
      if (a === "delete" && n && !n.readonly) {
        own.find((x) => x.id === n.id).deleted = true;
        save();
        selected = filtered()[0]?.id || null;
        render();
      }
      if (a === "restore" && n) {
        own.find((x) => x.id === n.id).deleted = false;
        save();
        folder = "local";
        render();
      }
      if (a === "star" && n) {
        stars = stars.includes(n.id)
          ? stars.filter((id) => id !== n.id)
          : [...stars, n.id];
        save();
        renderList();
      }
      if (a === "export" && n)
        download(
          `${n.title || "笔记"}.md`,
          `# ${n.title}\n\n${n.body}`,
          "text/markdown;charset=utf-8",
        );
      if (a === "messages") ctx.open("messages");
      if (a === "contacts") ctx.open("contacts");
      if (a === "play") ctx.open("vscode", { play: true });
    },
    signal,
  );
  root.addEventListener(
    "click",
    (e) => {
      if (e.target.closest("[data-note=delete],[data-note=restore]"))
        ctx.desktop.updateTrash();
    },
    { signal },
  );
  render();
  return {
    receive(data) {
      if (data.reload) own = store.get("notes", []);
      if (data.note) {
        selected = data.note;
        folder = "all";
      }
      render();
    },
    menus: {
      file: [
        {
          label: "新建本地笔记",
          action: () => root.querySelector("[data-note=new]").click(),
        },
        {
          label: "导出当前笔记",
          action: () => root.querySelector("[data-note=export]").click(),
        },
      ],
    },
  };
}

export function mountPhotos(ctx) {
  const { root, signal } = ctx;
  const collection = [
    { id: "avatar", title: "我的头像", src: profile.avatar, album: "头像" },
    ...photos,
  ];
  let favorites = store.get("photoFavorites", []),
    album = "all",
    query = "",
    selected = ctx.data.photo || null,
    zoom = 1;
  ctx.setTitle("照片");
  root.innerHTML = `<div class="app-toolbar photos-toolbar"><button class="icon-button" data-photo="back" aria-label="返回图库">${icon("back", 20)}</button><b>图库</b><span class="spacer"></span><button class="icon-button" data-photo="favorite" aria-label="收藏照片">${icon("heart", 19)}</button><a class="icon-button photo-download" download aria-label="下载照片">${icon("download", 19)}</a><label class="search-field">${icon("search", 14)}<input aria-label="搜索照片" placeholder="搜索"></label></div><div class="split-app"><aside class="app-sidebar photos-sidebar"><h4>照片</h4><button class="sidebar-item" data-album="all">${icon("image", 17)}图库</button><button class="sidebar-item" data-album="favorites">${icon("heart", 17)}个人收藏</button><h4>我的相簿</h4>${[...new Set(collection.map((p) => p.album))].map((a) => `<button class="sidebar-item" data-album="${h(a)}">${icon("folder", 17)}${h(a)}</button>`).join("")}</aside><main class="app-main photos-main"></main></div>`;
  const filtered = () =>
    collection.filter(
      (p) =>
        (album === "all" ||
          (album === "favorites" && favorites.includes(p.id)) ||
          p.album === album) &&
        p.title.toLowerCase().includes(query),
    );
  function render() {
    root
      .querySelectorAll("[data-album]")
      .forEach((b) => b.classList.toggle("active", b.dataset.album === album));
    const item = collection.find((p) => p.id === selected);
    root.querySelector("[data-photo=back]").disabled = !item;
    root.querySelector("[data-photo=favorite]").disabled = !item;
    root
      .querySelector("[data-photo=favorite]")
      .classList.toggle("starred", !!item && favorites.includes(item.id));
    const link = root.querySelector(".photo-download");
    link.hidden = !item;
    if (item) {
      link.href = item.src;
      link.download = item.title;
    }
    const el = root.querySelector(".photos-main");
    if (item) {
      el.innerHTML = `<div class="photo-viewer"><div class="photo-canvas"><img src="${h(item.src)}" alt="${h(item.title)}" style="transform:scale(${zoom})"></div><footer><button class="icon-button" data-photo="previous" aria-label="上一张">${icon("back", 19)}</button><div><b>${h(item.title)}</b><span>${h(item.album)}</span></div><button class="icon-button" data-photo="next" aria-label="下一张">${icon("forward", 19)}</button><span class="spacer"></span><label>缩放 <input data-photo-zoom type="range" min=".5" max="3" step=".1" value="${zoom}" aria-label="照片缩放"></label></footer></div>`;
    } else {
      const list = filtered();
      el.innerHTML = `<div class="content-heading"><h1>${album === "all" ? "所有照片" : album === "favorites" ? "个人收藏" : h(album)}</h1><p>${list.length} 张照片 · 主人提供的图片</p></div>${list.length ? `<div class="photo-grid">${list.map((p) => `<button data-photo-id="${h(p.id)}"><img src="${h(p.src)}" alt="${h(p.title)}"><span>${h(p.title)}</span></button>`).join("")}</div>` : empty("这里还没有照片", "收藏喜欢的图片，或者稍后再来看看。", "image")}`;
    }
  }
  on(
    root,
    "click",
    "[data-album]",
    (e, b) => {
      album = b.dataset.album;
      selected = null;
      render();
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-photo-id]",
    (e, b) => {
      selected = b.dataset.photoId;
      zoom = 1;
      render();
    },
    signal,
  );
  on(
    root,
    "input",
    ".photos-toolbar input",
    (e, b) => {
      query = b.value.toLowerCase();
      selected = null;
      render();
    },
    signal,
  );
  on(
    root,
    "input",
    "[data-photo-zoom]",
    (e, b) => {
      zoom = Number(b.value);
      root.querySelector(".photo-canvas img").style.transform =
        `scale(${zoom})`;
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-photo]",
    (e, b) => {
      const a = b.dataset.photo;
      if (a === "back") selected = null;
      if (a === "favorite" && selected) {
        favorites = favorites.includes(selected)
          ? favorites.filter((id) => id !== selected)
          : [...favorites, selected];
        store.set("photoFavorites", favorites);
      }
      if (a === "previous" || a === "next") {
        const list = filtered(),
          index = list.findIndex((p) => p.id === selected);
        selected =
          list[(index + (a === "next" ? 1 : -1) + list.length) % list.length]
            ?.id;
        zoom = 1;
      }
      render();
    },
    signal,
  );
  render();
  return {
    receive(data) {
      if (data.photo) {
        selected = data.photo;
        render();
      }
    },
  };
}
