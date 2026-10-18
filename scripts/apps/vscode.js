import { profile, tracks } from "../config.js";
import { player } from "../player.js";
import { h, icon, on, duration } from "../ui.js";

export function mountCode(ctx) {
  const { root, signal } = ctx;
  let selected = "main.py",
    tabs = ["main.py"],
    lastLine = -2,
    search = "",
    lastLyrics = "";
  ctx.setTitle("sun_yanzi_project — Visual Studio Code");
  root.innerHTML = `<div class="code-layout"><nav class="code-activity"><button data-activity="explorer" class="active" aria-label="资源管理器">${icon("file", 25)}</button><button data-activity="search" aria-label="搜索文件">${icon("search", 25)}</button><button data-activity="github" aria-label="GitHub">${icon("code", 25)}</button><div class="spacer"></div><button data-activity="profile" aria-label="个人资料">${icon("person", 24)}</button><button data-activity="settings" aria-label="设置">${icon("controls", 24)}</button></nav><aside class="code-sidebar"><div class="code-sidebar-heading">资源管理器 <button data-code="collapse" aria-label="折叠文件列表">${icon("more", 17)}</button></div><div class="code-project">⌄ &nbsp; SUN_YANZI_PROJECT</div><div class="code-files">${["main.py", "music.mp3", "lyrics.lrc", "about.md", "playlist.json"].map((name, i) => `<button data-file="${name}"><span class="file-type type-${i}">${["Py", "♫", "≋", "M↓", "{}"][i]}</span>${name}</button>`).join("")}</div><div class="code-outline"><span>⌄ &nbsp; 大纲</span><small>用代码，写一首歌。</small></div></aside><main class="code-editor"><div class="code-tabs"></div><div class="code-search" hidden><label>${icon("search", 15)}<input placeholder="在当前文件中查找" aria-label="查找内容"></label><button data-code="close-search" aria-label="关闭查找">${icon("close", 15)}</button></div><div class="code-breadcrumb">sun_yanzi_project <span>›</span> <b>main.py</b></div><div class="code-scroll"></div><div class="code-player-error" hidden></div></main></div><footer class="code-status"><button data-code="github">⑂ main*</button><span>✓ 0 &nbsp; ⚠ 0</span><span class="spacer"></span><button data-code="play" class="code-play-toggle">▷ 播放</button><span class="code-time">0:00</span><span>UTF-8 &nbsp; Python &nbsp; ◉</span></footer>`;
  const content = root.querySelector(".code-scroll");
  function openFile(file) {
    if (!tabs.includes(file)) tabs.push(file);
    selected = file;
    lastLine = -2;
    renderTabs();
    renderContent(true);
  }
  function renderTabs() {
    root.querySelector(".code-tabs").innerHTML = tabs
      .map(
        (name) =>
          `<div class="code-tab ${name === selected ? "active" : ""}"><button data-tab="${name}"><span>${name.endsWith(".py") ? "Py" : name.endsWith(".mp3") ? "♫" : "◇"}</span>${name}</button><button data-close-tab="${name}" aria-label="关闭 ${name}">×</button></div>`,
      )
      .join("");
    root
      .querySelectorAll("[data-file]")
      .forEach((b) =>
        b.classList.toggle("active", b.dataset.file === selected),
      );
    root.querySelector(".code-breadcrumb b").textContent = selected || "";
  }
  function codeLines() {
    const lines = [
      `<span class="code-comment"># ${h(player.track.title)} — ${h(player.track.artist)}</span>`,
      `<span class="code-keyword">import</span> time`,
      `<span class="code-keyword">from</span> heart <span class="code-keyword">import</span> Emotion`,
      "",
      `<span class="code-comment"># 有些话，歌里已经唱过了。</span>`,
    ];
    const templates = [
      (t) =>
        `<span class="code-fn">print</span>(<span class="code-string">"${h(t)}"</span>)`,
      (t) => `memory = <span class="code-string">"${h(t)}"</span>`,
      (t) =>
        `self.heart.<span class="code-fn">append</span>(<span class="code-string">"${h(t)}"</span>)`,
      (t) =>
        `<span class="code-keyword">return</span> <span class="code-string">"${h(t)}"</span>`,
    ];
    player.lyrics
      .filter((l) => l.time <= player.time)
      .forEach((l, i) => lines.push(templates[i % templates.length](l.text)));
    return lines;
  }
  function renderContent(force = false) {
    if (!selected) {
      content.innerHTML = `<div class="code-welcome">${icon("code", 85)}<h2>把歌写进代码里</h2><p>从左侧打开一个文件。音乐仍在这里。</p><button data-file="main.py">打开 main.py</button></div>`;
      return;
    }
    if (selected === "main.py") {
      const count = player.lyrics.filter((l) => l.time <= player.time).length;
      if (!force && count === lastLine) return;
      lastLine = count;
      const lines = codeLines();
      content.innerHTML = `<div class="code-lines">${lines.map((line, i) => `<div class="source-line ${i === lines.length - 1 ? "current" : ""}" ${search && !line.toLowerCase().includes(search) ? 'style="opacity:.25"' : ""}><span class="line-number">${i + 1}</span><code>${line || " "}</code></div>`).join("")}<div class="source-line"><span class="line-number">${lines.length + 1}</span><span class="code-caret"></span></div></div>`;
      if (!search)
        content.scrollTo({
          top: content.scrollHeight,
          behavior: ctx.desktop.prefs.reducedMotion ? "instant" : "smooth",
        });
    } else if (selected === "music.mp3") {
      if (force)
        content.innerHTML = `<div class="audio-editor"><div class="audio-art">${icon("music", 76)}</div><h1>${h(player.track.title)}</h1><p>${h(player.track.artist)}</p><button class="audio-main-play" data-code="play" aria-label="播放或暂停">${icon(player.playing ? "pause" : "play", 30)}</button><div class="audio-timeline"><span data-time>0:00</span><input data-seek aria-label="播放进度" type="range" min="0" max="${player.duration || 1}" step=".1" value="${player.time}"><span data-duration>${duration(player.duration)}</span></div><label class="audio-volume">${icon("volume", 18)}<input data-volume aria-label="音量" type="range" min="0" max="1" step=".01" value="${player.audio.volume}"></label><label class="audio-loop"><input type="checkbox" data-loop ${player.audio.loop ? "checked" : ""}> 单曲循环</label></div>`;
      const seek = content.querySelector("[data-seek]");
      if (seek) {
        seek.max = player.duration || 1;
        seek.value = player.time;
        content.querySelector("[data-time]").textContent = duration(
          player.time,
        );
        content.querySelector("[data-duration]").textContent = duration(
          player.duration,
        );
        content.querySelector(".audio-main-play").innerHTML = icon(
          player.playing ? "pause" : "play",
          30,
        );
      }
    } else if (selected === "lyrics.lrc") {
      if (force || lastLyrics !== player.raw) {
        lastLyrics = player.raw;
        content.innerHTML = `<div class="lyrics-file">${
          player.lyrics
            .filter((l) => !search || l.text.toLowerCase().includes(search))
            .map(
              (l) =>
                `<button data-seek-lyric="${l.time}" class="lyric-line"><span>${duration(l.time)}</span>${h(l.text)}</button>`,
            )
            .join("") || '<p class="code-comment">正在读取歌词…</p>'
        }</div>`;
      }
    } else if (force) {
      const text =
        selected === "about.md"
          ? `# ${profile.name}\n\n${profile.bio}\n\nQQ: ${profile.qq}\nWebsite: ${profile.website}`
          : JSON.stringify(
              tracks.map((t) => ({
                title: t.title,
                artist: t.artist,
                file: t.audio,
              })),
              null,
              2,
            );
      content.innerHTML = `<pre class="code-document">${h(text)}</pre>${selected === "about.md" ? '<button class="code-contact" data-code="contact">给我留句话 →</button>' : ""}`;
    }
  }
  function update() {
    renderContent();
    root.querySelector(".code-play-toggle").textContent = player.playing
      ? "Ⅱ 暂停"
      : "▷ 播放";
    root.querySelector(".code-time").textContent = duration(player.time);
    const error = root.querySelector(".code-player-error");
    error.hidden = !player.error;
    error.innerHTML = player.error
      ? `${h(player.error)} <button data-code="retry">播放</button>`
      : "";
  }
  on(
    root,
    "click",
    "[data-file],[data-tab]",
    (e, b) => openFile(b.dataset.file || b.dataset.tab),
    signal,
  );
  on(
    root,
    "click",
    "[data-close-tab]",
    (e, b) => {
      const name = b.dataset.closeTab;
      tabs = tabs.filter((t) => t !== name);
      if (selected === name) selected = tabs.at(-1) || "";
      renderTabs();
      renderContent(true);
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-activity]",
    (e, b) => {
      const a = b.dataset.activity;
      if (a === "explorer")
        root.querySelector(".code-sidebar").hidden =
          !root.querySelector(".code-sidebar").hidden;
      if (a === "search") {
        root.querySelector(".code-search").hidden = false;
        root.querySelector(".code-search input").focus();
      }
      if (a === "github") ctx.open("github");
      if (a === "profile") ctx.open("contacts");
      if (a === "settings") ctx.open("settings");
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-code]",
    (e, b) => {
      const a = b.dataset.code;
      if (a === "play") player.toggle();
      if (a === "retry") {
        if (player.audio.error) player.start();
        else player.resume();
      }
      if (a === "github") ctx.open("github");
      if (a === "contact") ctx.open("messages");
      if (a === "collapse")
        root.querySelector(".code-files").hidden =
          !root.querySelector(".code-files").hidden;
      if (a === "close-search") {
        search = "";
        root.querySelector(".code-search input").value = "";
        root.querySelector(".code-search").hidden = true;
        renderContent(true);
      }
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-seek-lyric]",
    (e, b) => player.seek(Number(b.dataset.seekLyric)),
    signal,
  );
  on(root, "input", "[data-seek]", (e, b) => player.seek(b.value), signal);
  on(
    root,
    "input",
    "[data-volume]",
    (e, b) => player.setVolume(b.value),
    signal,
  );
  on(
    root,
    "change",
    "[data-loop]",
    (e, b) => (player.audio.loop = b.checked),
    signal,
  );
  root.querySelector(".code-search input").addEventListener(
    "input",
    (e) => {
      search = e.target.value.toLowerCase();
      renderContent(true);
    },
    { signal },
  );
  player.addEventListener("change", update, { signal });
  renderTabs();
  renderContent(true);
  player.start(ctx.data.track);
  return {
    receive(data) {
      if (data.track && data.track !== player.track.id)
        player.start(data.track);
      else if (data.play) player.resume();
      if (data.file) openFile(data.file);
    },
    menus: {
      file: [
        { label: "打开 main.py", action: () => openFile("main.py") },
        { label: "打开音乐文件", action: () => openFile("music.mp3") },
        { label: "查看歌词", action: () => openFile("lyrics.lrc") },
        { label: "退出 Code", action: () => ctx.desktop.close("vscode") },
      ],
    },
  };
}
