import { profile } from "../config.js";
import { guestbook, commentText, parseCard } from "../guestbook.js";
import { h, icon, on, timeLabel, duration, safeURL, external } from "../ui.js";
import { CallSession } from "../call-session.js";

export function mountFaceTime(ctx) {
  const { root, signal } = ctx,
    call = new CallSession();
  let selected = null,
    filter = "",
    split = false;
  ctx.setTitle("FaceTime");
  root.innerHTML = `<div class="facetime-app"><aside class="facetime-sidebar"><h1>FaceTime</h1><button class="facetime-new" data-ft="new">${icon("plus", 19)}新建信息</button><button class="facetime-demo-entry" data-ft="demo">${icon("video", 18)}体验通话</button><label class="search-field">${icon("search", 14)}<input placeholder="搜索来访" aria-label="搜索来访记录"></label><div class="facetime-list"></div><button class="mac-button" data-ft="refresh">刷新来访记录</button><button class="link-button" data-ft="more" hidden>载入更多</button></aside><section class="facetime-stage"></section></div>`;
  const avatar = (name) =>
    `<span class="message-avatar" style="--avatar-hue:265">${h(Array.from(name || "?")[0])}</span>`;
  function renderList() {
    const list = guestbook.items.filter((r) =>
      `${r.nick} ${commentText(r)}`.toLowerCase().includes(filter),
    );
    root.querySelector(".facetime-list").innerHTML =
      list
        .map(
          (r) =>
            `<button class="facetime-person ${String(r.objectId) === selected ? "active" : ""}" data-ft-id="${h(r.objectId)}">${avatar(r.nick)}<div><b>${h(r.nick)}</b><small>网站留言 · ${timeLabel(r.time)}</small></div>${icon("info", 16)}</button>`,
        )
        .join("") ||
      `<div class="facetime-empty">${guestbook.loading ? "正在读取来访记录…" : guestbook.error ? h(guestbook.error) : "还没有公开的来访留言"}</div>`;
    root.querySelector("[data-ft=more]").hidden =
      guestbook.pages >= guestbook.totalPages;
  }
  function renderHome() {
    if (call.state !== "idle") {
      renderCall();
      return;
    }
    const item = guestbook.items.find((r) => String(r.objectId) === selected),
      stage = root.querySelector(".facetime-stage");
    root.querySelector(".facetime-app").classList.remove("call-active");
    stage.innerHTML = item
      ? `<div class="facetime-person-detail">${avatar(item.nick)}<h1>${h(item.nick)}</h1><span>在 ${timeLabel(item.time)} 来过这里</span><blockquote>${h(parseCard(commentText(item)).text)}</blockquote><button class="facetime-message" data-ft="message">${icon("chat", 19)}发信息</button><button class="facetime-demo-entry" data-ft="demo">${icon("video", 20)}打开通话演示</button><small>网站留言记录；演示不会呼叫这位访客。</small></div>`
      : `<div class="facetime-intro">${icon("video", 70)}<h1>换一种方式，<br>认识一下。</h1><p>看一看来访留言，或者体验一次桌面通话。<br>只有主动开启预览时才会使用摄像头。</p><div class="facetime-intro-actions"><button class="facetime-message" data-ft="demo">${icon("video", 18)}体验通话</button><button class="facetime-demo-entry" data-ft="incoming">体验接听</button></div>${safeURL(profile.callURL) ? '<button class="link-button" data-ft="real">打开已配置的真实会话 ↗</button>' : ""}${profile.welcomeVideo || profile.welcomeAudio ? '<button class="link-button" data-ft="welcome">播放主人的欢迎留言</button>' : ""}<button class="link-button" data-ft="new">也可以留下一句话 →</button></div>`;
  }
  function renderCall() {
    const stage = root.querySelector(".facetime-stage");
    root.querySelector(".facetime-app").classList.add("call-active");
    if (!stage.querySelector(".face-call"))
      stage.innerHTML = `<div class="face-call"><span class="call-demo-label">桌面通话演示 · 不会连接真实对端</span><div class="face-remote"><img src="${profile.avatar}" alt="Lozic"><h1>${h(profile.name)}</h1><p class="face-call-status"></p><time class="face-call-duration"></time></div><div class="face-local-preview" hidden><video muted autoplay playsinline aria-label="你的本机摄像头预览"></video><span>你的本机预览</span></div><div class="face-call-error" role="status"></div><div class="face-call-controls"><button data-call="microphone" title="开启本机麦克风">${icon("volume", 22)}<span>麦克风</span></button><button data-call="camera" title="开启本机摄像头预览">${icon("video", 24)}<span>摄像头</span></button><button data-call="layout">${icon("sidebar", 22)}<span>画面布局</span></button><button data-call="message">${icon("chat", 22)}<span>发信息</span></button><button class="call-end" data-call="end">${icon("phone", 23)}<span>挂断</span></button></div><div class="face-incoming-actions" hidden><button data-call="end" class="decline">拒绝</button><button data-call="answer" class="accept">接听</button></div><div class="face-ended-actions" hidden><button class="mac-button" data-call="again">再体验一次</button><button class="mac-button" data-call="back">返回来访</button></div></div>`;
    const stateText = {
      calling: "正在呼叫 · 演示",
      incoming: "来电邀请 · 演示",
      connected: "演示已接通",
      ended: "通话体验已结束",
    };
    stage.querySelector(".face-call-status").textContent =
      stateText[call.state] || "";
    stage
      .querySelector(".face-call")
      .classList.toggle("split-mode", split && !!call.video);
    stage.querySelector(".face-call-controls").hidden = ![
      "calling",
      "connected",
    ].includes(call.state);
    stage.querySelector(".face-incoming-actions").hidden =
      call.state !== "incoming";
    stage.querySelector(".face-ended-actions").hidden = call.state !== "ended";
    const video = stage.querySelector("video");
    if (video.srcObject !== call.video) {
      video.srcObject = call.video;
      if (call.video) video.play().catch(() => {});
    }
    stage.querySelector(".face-local-preview").hidden = !call.video;
    stage.querySelector(".face-call-error").textContent = call.error;
    const camera = stage.querySelector("[data-call=camera]"),
      microphone = stage.querySelector("[data-call=microphone]");
    stage.querySelector("[data-call=layout]").disabled = !call.video;
    microphone.querySelector("svg").outerHTML = icon(
      call.muted ? "micOff" : "mic",
      22,
    );
    camera.disabled = call.state !== "connected" || call.pendingVideo;
    microphone.disabled = call.state !== "connected" || call.pendingMic;
    camera.classList.toggle("enabled", !!call.video);
    microphone.classList.toggle("enabled", !!call.microphone && !call.muted);
    camera.querySelector("span").textContent = call.pendingVideo
      ? "请求权限中"
      : call.video
        ? "关闭摄像头"
        : "开启摄像头";
    microphone.querySelector("span").textContent = call.pendingMic
      ? "请求权限中"
      : !call.microphone
        ? "开启麦克风"
        : call.muted
          ? "取消静音"
          : "静音";
    const durationLabel = stage.querySelector(".face-call-duration");
    durationLabel.textContent =
      call.state === "connected"
        ? duration((Date.now() - call.connectedAt) / 1000)
        : "";
  }
  function render() {
    renderList();
    renderHome();
  }
  call.addEventListener(
    "change",
    () => (call.state === "idle" ? renderHome() : renderCall()),
    { signal },
  );
  const timer = setInterval(() => {
    const label = root.querySelector(".face-call-duration");
    if (label && call.state === "connected")
      label.textContent = duration((Date.now() - call.connectedAt) / 1000);
  }, 1000);
  on(
    root,
    "click",
    "[data-ft-id]",
    (e, b) => {
      selected = b.dataset.ftId;
      call.reset();
      render();
    },
    signal,
  );
  on(
    root,
    "input",
    "input",
    (e, b) => {
      filter = b.value.toLowerCase();
      renderList();
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-ft]",
    (e, b) => {
      const action = b.dataset.ft;
      if (action === "new") ctx.open("messages", { conversationId: null });
      if (action === "message")
        ctx.open("messages", { conversationId: selected });
      if (action === "demo") call.start();
      if (action === "incoming") call.start("incoming");
      if (action === "refresh") guestbook.refresh();
      if (action === "more") guestbook.more();
      if (action === "real") external(profile.callURL);
      if (action === "welcome") {
        const url = safeURL(
          profile.welcomeVideo || profile.welcomeAudio,
          document.baseURI,
        );
        if (!url) return;
        const dialog = ctx.dialog({
          title: "主人的欢迎留言",
          body: profile.welcomeVideo
            ? `<video class="welcome-recording" src="${h(url)}" controls playsinline></video>`
            : `<audio class="welcome-recording" src="${h(url)}" controls></audio>`,
        });
        const close = dialog.close;
        dialog.close = () => {
          dialog.querySelector("video,audio")?.pause();
          close();
        };
        signal.addEventListener("abort", () => dialog.close(), { once: true });
      }
    },
    signal,
  );
  on(
    root,
    "click",
    "[data-call]",
    (e, b) => {
      const action = b.dataset.call;
      if (action === "answer") call.answer();
      if (action === "end") call.end();
      if (action === "again") call.start();
      if (action === "back") call.reset();
      if (action === "camera") call.toggleVideo();
      if (action === "microphone") call.toggleMicrophone();
      if (action === "layout") {
        split = !split;
        renderCall();
      }
      if (action === "message")
        ctx.open("messages", { conversationId: selected });
    },
    signal,
  );
  const release = guestbook.acquire();
  guestbook.addEventListener("change", renderList, { signal });
  render();
  return {
    dispose() {
      call.end(false);
      clearInterval(timer);
      root.querySelector("video")?.pause();
      release();
    },
    menus: {
      file: [
        { label: "体验通话", action: () => call.start() },
        { label: "体验接听", action: () => call.start("incoming") },
        { label: "返回来访记录", action: () => call.reset() },
      ],
    },
  };
}
