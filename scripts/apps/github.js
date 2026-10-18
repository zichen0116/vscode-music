import { profile } from "../config.js";
import { h, icon, on, external, empty, safeURL } from "../ui.js";

export function mountGitHub(ctx) {
  const { root, signal } = ctx;
  let data = null,
    tab = "overview",
    query = "",
    language = "",
    selected = null,
    error = "",
    loading = true,
    readme = "";
  ctx.setTitle(`${profile.github} · GitHub`);
  root.innerHTML = `<div class="github-app"><header class="github-header">${ctx.desktop.appImage("github")}<b>${profile.github}</b><span>/</span><span>个人主页</span><span class="spacer"></span><button class="mac-button" data-gh="original">在 GitHub 中查看 ${icon("external", 13)}</button></header><nav class="github-tabs"><button class="active" data-gh-tab="overview">${icon("file", 17)} Overview</button><button data-gh-tab="repos">${icon("folder", 17)} Repositories <small></small></button><span class="spacer"></span><button data-gh="refresh" class="icon-button" aria-label="更新公开 GitHub 资料">${icon("refresh", 18)}</button></nav><div class="github-body"></div></div>`;
  const body = root.querySelector(".github-body");
  function render() {
    if (!data) {
      body.innerHTML = empty(
        loading ? "正在读取公开资料" : "暂时无法读取资料",
        error || "从 GitHub 获取真实的公开项目。",
        "code",
      );
      return;
    }
    const user = data.user;
    root.querySelector("[data-gh-tab=repos] small").textContent =
      user.public_repos;
    root
      .querySelectorAll("[data-gh-tab]")
      .forEach((b) => b.classList.toggle("active", b.dataset.ghTab === tab));
    if (selected) {
      body.innerHTML = `<div class="github-repository"><div class="repo-heading"><button class="icon-button" data-gh="back" aria-label="返回仓库列表">${icon("back", 18)}</button><h2>${h(profile.github)} / <strong>${h(selected.name)}</strong></h2><span class="repo-public">Public</span></div><p>${h(selected.description || "这个仓库尚未填写简介。")}</p><div class="repo-tools"><span>${icon("star", 16)} ${selected.stargazers_count} stars</span><span>⑂ ${selected.forks_count} forks</span><span class="spacer"></span><button class="github-green" data-gh="repo-original">Code ${icon("external", 13)}</button><button class="mac-button" data-gh="issues">Issues ↗</button></div><div class="github-readme"><header>${icon("file", 17)} README</header><div>${readme ? renderMarkdown(readme) : '<p class="muted">正在读取 README…</p>'}</div></div></div>`;
      return;
    }
    const languages = [
      ...new Set(data.repos.map((r) => r.language).filter(Boolean)),
    ].sort();
    const repos = data.repos.filter(
      (r) =>
        (!language || r.language === language) &&
        `${r.name} ${r.description || ""}`.toLowerCase().includes(query),
    );
    body.innerHTML = `<aside class="github-profile"><img class="github-avatar" src="${h(user.avatar_url)}" alt="${h(user.name || user.login)}"><h1>${h(user.name || profile.name)}</h1><span class="github-login">${h(user.login)}</span><p>${h(user.bio || profile.bio)}</p><button class="mac-button" data-gh="follow">Follow on GitHub ${icon("external", 12)}</button><div class="github-followers">${icon("person", 16)} <b>${user.followers}</b> followers · <b>${user.following}</b> following</div><a href="${profile.website}" target="_blank" rel="noopener noreferrer">${icon("globe", 15)} lozic7.com</a><p class="github-cache">公开资料 · ${new Date(data.fetchedAt).toLocaleDateString("zh-CN")}<br>当前载入 ${data.repos.length} 个仓库</p></aside><section class="github-repos">${error ? `<div class="inline-banner error">${h(error)}</div>` : ""}${tab === "overview" ? `<div class="github-intro"><span>${h(user.login)} / README.md</span><h2>Hi, I'm ${h(user.name || profile.name)} <span>👋</span></h2><p>欢迎来我的桌面逛逛。这里是我公开的 GitHub 项目。</p><button class="link-button" data-gh="message">在“信息”里打个招呼 →</button></div><h3>Recently updated repositories</h3>` : `<div class="github-filters"><input data-gh-search aria-label="搜索仓库" placeholder="Find a repository…" value="${h(query)}"><select data-gh-language aria-label="按语言筛选"><option value="">Language: All</option>${languages.map((l) => `<option ${l === language ? "selected" : ""}>${h(l)}</option>`).join("")}</select></div>`}<div class="${tab === "overview" ? "repo-grid" : "repo-list"}">${(tab === "overview" ? repos.slice(0, 6) : repos).map((repo) => `<article class="repo-card"><div><button data-repo="${h(repo.name)}">${icon("folder", 15)} ${h(repo.name)}</button><span class="repo-public">Public</span></div><p>${h(repo.description || "暂无仓库描述")}</p><footer>${repo.language ? `<span class="language-dot"></span><span>${h(repo.language)}</span>` : ""}<span>${icon("star", 13)} ${repo.stargazers_count}</span>${repo.fork ? "<span>Forked</span>" : ""}</footer></article>`).join("") || '<p class="muted">没有找到匹配的仓库。</p>'}</div></section>`;
  }
  async function load() {
    try {
      const response = await fetch("assets/data/github.json", { signal });
      if (!response.ok) throw new Error();
      data = await response.json();
    } catch (e) {
      if (e.name !== "AbortError")
        error = "本地资料缓存不可用，可点击右上角更新或前往 GitHub。";
    } finally {
      loading = false;
      if (!signal.aborted) render();
    }
  }
  async function refresh() {
    const btn = root.querySelector("[data-gh=refresh]");
    btn.disabled = true;
    error = "";
    try {
      const opts = {
        signal,
        headers: { Accept: "application/vnd.github+json" },
      };
      const responses = await Promise.all([
        fetch(`https://api.github.com/users/${profile.github}`, opts),
        fetch(
          `https://api.github.com/users/${profile.github}/repos?sort=updated&per_page=100`,
          opts,
        ),
      ]);
      if (responses.some((r) => !r.ok))
        throw new Error(
          "GitHub 暂时无法访问或请求达到限额，继续显示已有资料。",
        );
      const [user, repos] = await Promise.all(responses.map((r) => r.json()));
      data = { user, repos, fetchedAt: new Date().toISOString() };
    } catch (e) {
      if (e.name !== "AbortError") error = e.message;
    } finally {
      if (!signal.aborted) {
        btn.disabled = false;
        render();
      }
    }
  }
  async function openRepo(name) {
    selected = data.repos.find((r) => r.name === name);
    readme = "";
    render();
    const repo = selected;
    try {
      const response = await fetch(
        `https://api.github.com/repos/${profile.github}/${encodeURIComponent(repo.name)}/readme`,
        { signal, headers: { Accept: "application/vnd.github+json" } },
      );
      if (!response.ok)
        throw new Error("README 暂时不可用。可以点击 Code 前往真实仓库。");
      const result = await response.json();
      if (selected !== repo) return;
      const bytes = Uint8Array.from(
        atob(result.content.replace(/\s/g, "")),
        (c) => c.charCodeAt(0),
      );
      readme = new TextDecoder().decode(bytes);
    } catch (e) {
      if (e.name !== "AbortError") readme = e.message;
    }
    if (!signal.aborted && selected === repo) render();
  }
  on(
    root,
    "click",
    "[data-gh-tab]",
    (e, b) => {
      tab = b.dataset.ghTab;
      selected = null;
      render();
    },
    signal,
  );
  on(root, "click", "[data-repo]", (e, b) => openRepo(b.dataset.repo), signal);
  on(
    root,
    "input",
    "[data-gh-search]",
    (e, b) => {
      const start = b.selectionStart;
      query = b.value.toLowerCase();
      render();
      const input = root.querySelector("[data-gh-search]");
      input.focus();
      input.setSelectionRange(start, start);
    },
    signal,
  );
  on(
    root,
    "change",
    "[data-gh-language]",
    (e, b) => {
      language = b.value;
      render();
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-gh]",
    (e, b) => {
      const a = b.dataset.gh;
      if (a === "original" || a === "follow")
        external(`https://github.com/${profile.github}`);
      if (a === "refresh") refresh();
      if (a === "back") {
        selected = null;
        render();
      }
      if (a === "repo-original") external(selected.html_url);
      if (a === "issues") external(`${selected.html_url}/issues`);
      if (a === "message") ctx.open("messages");
    },
    signal,
  );
  render();
  load();
  return {};
}
function renderMarkdown(text) {
  let code = false;
  return (
    text
      .split("\n")
      .map((line) => {
        if (line.startsWith("```")) {
          code = !code;
          return code ? "<pre><code>" : "</code></pre>";
        }
        if (code) return `${h(line)}\n`;
        const heading = line.match(/^(#{1,3})\s+(.*)/);
        if (heading)
          return `<h${heading[1].length}>${h(heading[2])}</h${heading[1].length}>`;
        if (!line.trim()) return "";
        return `<p>${h(line)}</p>`;
      })
      .join("") + (code ? "</code></pre>" : "")
  );
}
