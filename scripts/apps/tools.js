import { profile, appInfo, publicNotes } from "../config.js";
import { player } from "../player.js";
import { Calculator } from "../calculator.js";
import { h, icon, on, store, copy, empty } from "../ui.js";

export function mountCalculator(ctx) {
  const { root, signal } = ctx,
    calc = new Calculator();
  calc.history = store.get("calculations", []);
  let showHistory = false;
  ctx.setTitle("计算器");
  root.innerHTML = `<div class="calculator-app"><div class="calculator-main"><div class="calculator-top"><button data-calc-action="history" class="icon-button" aria-label="计算历史">${icon("history", 19)}</button><button data-calc-action="copy" class="icon-button" aria-label="复制结果">${icon("copy", 17)}</button></div><div class="calculator-expression"></div><output class="calculator-display" aria-live="polite">0</output><div class="calculator-keys">${["AC", "±", "%", "÷", "7", "8", "9", "×", "4", "5", "6", "−", "1", "2", "3", "+", "⌫", "0", ".", "="].map((k) => `<button class="calc-key ${["÷", "×", "−", "+", "="].includes(k) ? "operator" : ["AC", "±", "%"].includes(k) ? "function" : ""}" data-key="${k}" aria-label="${k === "⌫" ? "退格" : k}">${k}</button>`).join("")}</div></div><aside class="calculator-history" hidden><header><b>历史记录</b><button data-calc-action="clear" class="link-button">清除</button></header><div></div></aside></div>`;
  function render() {
    root.querySelector(".calculator-display").textContent = calc.display;
    root.querySelector(".calculator-display").style.fontSize =
      calc.display.length > 10 ? "31px" : "48px";
    root.querySelector(".calculator-expression").textContent = calc.expression;
    root
      .querySelectorAll(".calc-key.operator")
      .forEach((b) =>
        b.classList.toggle("selected", b.dataset.key === calc.operator),
      );
    root.querySelector(".calculator-history>div").innerHTML =
      calc.history
        .map(
          (entry, i) =>
            `<button data-result="${i}"><span>${h(entry.expression)}</span><b>${h(entry.result)}</b></button>`,
        )
        .join("") || "<p>计算结果会保存在这里。</p>";
    store.set("calculations", calc.history);
  }
  on(
    root,
    "click",
    "[data-key]",
    (e, b) => {
      calc.input(b.dataset.key);
      render();
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-result]",
    (e, b) => {
      calc.display = calc.history[Number(b.dataset.result)].result;
      calc.waiting = true;
      render();
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-calc-action]",
    async (e, b) => {
      const a = b.dataset.calcAction;
      if (a === "history") {
        showHistory = !showHistory;
        root.querySelector("aside").hidden = !showHistory;
        ctx.setSize(showHistory ? 600 : 330, 480);
      }
      if (a === "clear") {
        calc.history = [];
        render();
      }
      if (a === "copy") {
        await copy(calc.display);
        ctx.toast("计算结果已复制");
      }
    },
    signal,
  );
  ctx.win.el.addEventListener(
    "keydown",
    (e) => {
      if (e.ctrlKey || e.metaKey) return;
      const key =
        {
          "/": "÷",
          "*": "×",
          "-": "−",
          Enter: "=",
          Backspace: "⌫",
          Escape: "AC",
          Delete: "AC",
        }[e.key] || e.key;
      if (/^[0-9.+%=]$/.test(key) || ["÷", "×", "−", "AC", "⌫"].includes(key)) {
        e.preventDefault();
        calc.input(key);
        render();
      }
    },
    { signal },
  );
  ctx.win.el.focus();
  render();
  return {};
}

export function mountTerminal(ctx) {
  const { root, signal } = ctx;
  let history = store.get("terminalHistory", []),
    historyIndex = history.length,
    cwd = "~";
  const commands = [
    "help",
    "whoami",
    "ls",
    "cd",
    "pwd",
    "cat",
    "projects",
    "contact",
    "open",
    "play",
    "pause",
    "resume",
    "date",
    "theme",
    "clear",
    "exit",
  ];
  const about = publicNotes.find((n) => n.id === "welcome").body;
  const files = {
    "about.md": about,
    "contact.txt": `QQ: ${profile.qq}\nGmail: ${profile.gmail}\n网易邮箱: ${profile.netease}\nGitHub: https://github.com/${profile.github}\nWebsite: ${profile.website}`,
    "music/playlist.txt": "开始懂了 — 孙燕姿\n使用 play 打开 VS Code 播放。",
    "notes/welcome.md": about,
  };
  ctx.setTitle("lozic — zsh — 80×24");
  root.innerHTML = `<div class="terminal-screen"><div class="terminal-output"><div class="terminal-welcome">Last login: ${h(new Date().toLocaleString("en-US"))} on ttys001<br><br><span class="terminal-purple">Welcome to Lozic's Mac.</span><br>用另一种方式，认识一下我。输入 <b>help</b> 看看能做什么。<br><span class="terminal-muted">这是网页里的小终端，只执行本站命令。</span><br></div></div><form class="terminal-command"><label for="terminal-input"><span class="terminal-green">lozic@mac</span> <span class="terminal-cwd">~</span> <span class="terminal-purple">%</span></label><input id="terminal-input" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="终端命令"></form></div>`;
  const screen = root.querySelector(".terminal-screen"),
    out = root.querySelector(".terminal-output"),
    input = root.querySelector("input");
  function output(text, kind = "") {
    const el = document.createElement("div");
    el.className = `terminal-result ${kind}`;
    el.textContent = text;
    out.append(el);
    screen.scrollTop = screen.scrollHeight;
  }
  function run(raw) {
    const text = raw.trim();
    if (!text) return;
    history.push(text);
    history = history.slice(-100);
    store.set("terminalHistory", history);
    historyIndex = history.length;
    output(`lozic@mac ${cwd} % ${text}`, "terminal-command-echo");
    const [command, ...args] =
      text
        .match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g)
        ?.map((s) => s.replace(/^["']|["']$/g, "")) || [];
    const arg = args.join(" ");
    if (command === "help")
      output(
        "命令\n  whoami                 认识一下我\n  ls / cd / pwd           浏览虚拟目录\n  cat about.md            打开个人介绍\n  contact                 联系方式\n  projects                我的 GitHub\n  open <应用名>            打开桌面应用\n  play / pause / resume   听一首歌\n  date                    今天此刻\n  theme light|dark        切换外观\n  clear / exit            清屏 / 关闭\n\n提示：↑↓ 历史命令，Tab 自动补全。",
      );
    else if (command === "whoami")
      output(`${profile.name}\n${profile.bio}\n\n你正在探索公开的个人桌面。`);
    else if (command === "pwd")
      output(cwd === "~" ? "/Users/lozic" : `/Users/lozic/${cwd.slice(2)}`);
    else if (command === "ls")
      output(
        cwd === "~"
          ? "about.md    contact.txt    music/    notes/"
          : cwd === "~/music"
            ? "playlist.txt"
            : "welcome.md",
      );
    else if (command === "cd") {
      if (!arg || ["~", "/", ".."].includes(arg)) cwd = "~";
      else if (
        ["music", "notes", "music/", "notes/"].includes(arg.replace(/^~\//, ""))
      )
        cwd = `~/${arg.replace(/^~\//, "").replace(/\/$/, "")}`;
      else output(`cd: 没有这个目录：${arg}`, "terminal-error");
      root.querySelector(".terminal-cwd").textContent = cwd;
    } else if (command === "cat") {
      const file = arg.replace(/^~\//, "");
      const path = cwd === "~" ? file : `${cwd.slice(2)}/${file}`;
      output(
        files[path] ?? `cat: 找不到文件 ${arg}`,
        files[path] ? "" : "terminal-error",
      );
    } else if (command === "contact") output(files["contact.txt"]);
    else if (command === "projects") {
      output(`https://github.com/${profile.github}\n正在打开 GitHub…`);
      ctx.open("github");
    } else if (command === "open") {
      const id = Object.keys(appInfo).find((id) =>
        [id, appInfo[id].name, appInfo[id].english].some(
          (name) => name?.toLowerCase() === arg.toLowerCase(),
        ),
      );
      if (id) {
        ctx.open(id);
        output(`已打开 ${appInfo[id].name}`);
      } else
        output(
          `找不到应用：${arg}\n可用：${Object.keys(appInfo).join(", ")}`,
          "terminal-error",
        );
    } else if (command === "play") {
      ctx.open("vscode", { play: true });
      output("♪ 开始懂了 — 孙燕姿");
    } else if (command === "pause") {
      player.pause();
      output("音乐已暂停。");
    } else if (command === "resume") {
      if (player.active) {
        player.resume();
        output("继续听歌。");
      } else {
        ctx.open("vscode");
        output("正在打开 Code…");
      }
    } else if (command === "date")
      output(
        new Date().toLocaleString("zh-CN", {
          dateStyle: "full",
          timeStyle: "long",
        }),
      );
    else if (command === "theme") {
      if (["light", "dark"].includes(arg)) {
        ctx.desktop.setPreference("theme", arg);
        output(`外观已切换为 ${arg}`);
      } else output("用法：theme light 或 theme dark");
    } else if (command === "clear") out.replaceChildren();
    else if (command === "exit") {
      ctx.desktop.close("terminal");
      return;
    } else if (command === "hello")
      output("Hello, stranger. 很高兴在这里遇到你。 ✨");
    else
      output(
        `zsh: command not found: ${command}\n输入 help 查看可用命令。`,
        "terminal-error",
      );
    screen.scrollTop = screen.scrollHeight;
  }
  root.querySelector("form").addEventListener(
    "submit",
    (e) => {
      e.preventDefault();
      run(input.value);
      input.value = "";
      input.focus();
    },
    { signal },
  );
  input.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        historyIndex = Math.max(0, historyIndex - 1);
        input.value = history[historyIndex] || "";
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        historyIndex = Math.min(history.length, historyIndex + 1);
        input.value = history[historyIndex] || "";
      }
      if (e.key === "Tab") {
        e.preventDefault();
        const values = input.value.startsWith("open ")
          ? Object.keys(appInfo).map((id) => `open ${id}`)
          : commands;
        const matches = values.filter((c) => c.startsWith(input.value));
        if (matches.length === 1) input.value = matches[0];
        else if (matches.length > 1) output(matches.join("   "));
      }
    },
    { signal },
  );
  screen.addEventListener(
    "click",
    (e) => {
      if (!getSelection()?.toString()) input.focus();
    },
    { signal },
  );
  input.focus();
  return {
    menus: {
      file: [
        {
          label: "新建会话",
          action: () => {
            out.replaceChildren();
            cwd = "~";
            root.querySelector(".terminal-cwd").textContent = cwd;
            input.focus();
          },
        },
        { label: "关闭终端", action: () => ctx.desktop.close("terminal") },
      ],
      edit: [
        {
          label: "复制所选内容",
          action: () => copy(getSelection()?.toString() || ""),
        },
        { label: "清屏", action: () => out.replaceChildren() },
      ],
    },
  };
}
