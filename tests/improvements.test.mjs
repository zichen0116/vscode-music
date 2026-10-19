import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { Desktop } from "../scripts/desktop.js";
import { dockTarget, transformBetween } from "../scripts/window-motion.js";
import { CallSession } from "../scripts/call-session.js";
import {
  reminderMatches,
  validateReminder,
  reminderCalendarEvents,
  updateReminder,
} from "../scripts/reminders-data.js";
import { stopwatchElapsed, timerRemaining } from "../scripts/clock-data.js";
import { normalizeBackup, plainToRich } from "../scripts/note-format.js";
import {
  validCoordinates,
  normalizePlace,
  mapURL,
  searchPlaces,
} from "../scripts/places.js";
import { store } from "../scripts/ui.js";
import {
  appInfo,
  defaultDock,
  defaultDesktopApps,
  wallpapers,
} from "../scripts/config.js";
import { appCatalog } from "../scripts/app-catalog.js";

test("minimization lands at the icon center without stretching the window", () => {
  const window = { left: 160, top: 80, width: 960, height: 600 };
  const icon = { left: 600, top: 700, width: 48, height: 48 };
  const target = dockTarget(window, icon);
  assert.equal(target.left + target.width / 2, 624);
  assert.equal(target.top + target.height / 2, 724);
  assert.equal(target.width / target.height, window.width / window.height);
  assert.equal(
    transformBetween(target, window),
    "translate(440px, 629px) scale(0.05, 0.05)",
  );
});

test("interrupted window animations cannot run stale hide or remove callbacks", () => {
  const desktop = Object.create(Desktop.prototype);
  desktop.prefs = { reducedMotion: false };
  const animations = [],
    finished = [];
  const win = {
    el: {
      animate() {
        const a = {
          cancel() {
            this.cancelled = true;
          },
        };
        animations.push(a);
        return a;
      },
    },
  };
  desktop.animateWindow(win, [], 280, () => finished.push("minimize"));
  desktop.animateWindow(win, [], 280, () => finished.push("restore"));
  assert.equal(animations[0].cancelled, true);
  animations[0].onfinish();
  assert.deepEqual(finished, []);
  animations[1].onfinish();
  assert.deepEqual(finished, ["restore"]);
  assert.equal(win.animation, null);
  desktop.prefs.reducedMotion = true;
  desktop.animateWindow(win, [], 280, () => finished.push("close"));
  assert.equal(animations.length, 2);
  assert.equal(finished.at(-1), "close");
});

function fakeStream() {
  const track = {
    enabled: true,
    stopped: false,
    stop() {
      this.stopped = true;
    },
  };
  return { track, getTracks: () => [track], getAudioTracks: () => [track] };
}

test("hanging up before camera permission resolves stops the late stream", async () => {
  let resolve;
  const call = new CallSession({
    getUserMedia: () =>
      new Promise((r) => {
        resolve = r;
      }),
  });
  call.start("incoming");
  call.answer();
  const pending = call.toggleVideo();
  assert.equal(call.pendingVideo, true);
  call.end();
  const stream = fakeStream();
  resolve(stream);
  await pending;
  assert.equal(stream.track.stopped, true);
  assert.equal(call.video, null);
  assert.equal(call.state, "ended");
  assert.equal(call.pendingVideo, false);
});

test("camera and microphone require separate actions and both stop on close", async () => {
  const requests = [],
    streams = [];
  const call = new CallSession({
    async getUserMedia(constraints) {
      requests.push(constraints);
      const s = fakeStream();
      streams.push(s);
      return s;
    },
  });
  call.start("incoming");
  assert.equal(requests.length, 0);
  call.answer();
  await call.toggleVideo();
  await call.toggleMicrophone();
  assert.equal(requests[0].audio, false);
  assert.equal(requests[1].video, false);
  await call.toggleMicrophone();
  assert.equal(streams[1].track.enabled, false);
  call.end();
  assert.ok(streams.every((s) => s.track.stopped));
  assert.equal(call.video, null);
  assert.equal(call.microphone, null);
  assert.equal(call.muted, true);
});

test("today includes overdue tasks but excludes completed and deleted tasks", () => {
  const today = "2026-10-19",
    item = { title: "散步", date: "2026-10-18", listId: "life" };
  assert.equal(reminderMatches(item, "today", today), true);
  assert.equal(
    reminderMatches({ ...item, completed: true }, "today", today),
    false,
  );
  assert.equal(
    reminderMatches({ ...item, deleted: true }, "all", today),
    false,
  );
  assert.equal(
    reminderMatches({ ...item, date: "2026-10-20" }, "today", today),
    false,
  );
  assert.equal(
    reminderMatches({ ...item, completed: true }, "completed", today),
    true,
  );
  assert.ok(validateReminder({ title: "无效日期", date: "2026-02-30" }));
  assert.ok(
    validateReminder({ title: "无效时间", date: today, time: "24:30" }),
  );
  assert.equal(
    validateReminder({ title: "闰年", date: "2028-02-29", time: "09:30" }),
    "",
  );
});

test("calendar shares reminder completion and deletion state, storage failures are reported", () => {
  const original = globalThis.localStorage,
    values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  try {
    store.set("reminders", {
      lists: [{ id: "life", name: "生活" }],
      items: [
        { id: "a", title: "散步", date: "2026-10-19", time: "18:30" },
        { id: "b", title: "已完成", date: "2026-10-19", completed: true },
        { id: "c", title: "已删除", date: "2026-10-19", deleted: true },
      ],
    });
    assert.deepEqual(
      reminderCalendarEvents().map((e) => e.sourceReminder),
      ["a"],
    );
    updateReminder("a", { completed: true });
    assert.equal(reminderCalendarEvents().length, 0);
    globalThis.localStorage.setItem = () => {
      throw new Error("quota");
    };
    assert.throws(() => updateReminder("a", { completed: false }), /无法保存/);
    assert.equal(reminderCalendarEvents().length, 0);
  } finally {
    if (original === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = original;
  }
});

test("timers use elapsed wall time and never show a negative remainder", () => {
  assert.equal(
    stopwatchElapsed({ running: true, startedAt: 1000, elapsed: 400 }, 2500),
    1900,
  );
  assert.equal(
    stopwatchElapsed({ running: false, startedAt: 1000, elapsed: 400 }, 2500),
    400,
  );
  assert.equal(timerRemaining({ running: true, deadline: 3000 }, 4500), 0);
  assert.equal(timerRemaining({ running: false, remaining: 1200 }, 4500), 1200);
});

test("note imports generate fresh IDs and cannot impersonate public notes or arbitrary apps", () => {
  const original = {
    id: "welcome",
    readonly: true,
    title: "hello",
    body: "<script>test</script>",
    tags: ["生活", false],
    links: [
      { app: "maps", id: "a", label: "地点" },
      { app: "javascript:alert(1)", id: "b" },
      null,
    ],
  };
  const [note] = normalizeBackup({ notes: [original] });
  assert.notEqual(note.id, "welcome");
  assert.equal(note.readonly, undefined);
  assert.deepEqual(note.tags, ["生活"]);
  assert.deepEqual(note.links, [{ app: "maps", id: "a", label: "地点" }]);
  assert.equal(original.id, "welcome");
  assert.equal(original.readonly, true);
  assert.equal(
    plainToRich('<img onerror="x">'),
    "<div>&lt;img onerror=&quot;x&quot;&gt;</div>",
  );
  assert.throws(() => normalizeBackup({ notes: "not an array" }));
});

test("map results reject malformed coordinates and keep embed bounds valid", () => {
  for (const coords of [
    [null, 0],
    ["31", 121],
    [NaN, 2],
    [90, 0],
    [0, 181],
  ])
    assert.equal(validCoordinates(...coords), false);
  assert.equal(normalizePlace(null), null);
  assert.equal(normalizePlace({ geometry: { coordinates: [181, 0] } }), null);
  const place = normalizePlace({
    properties: { osm_type: "N", osm_id: 42, name: "地点", city: "上海" },
    geometry: { coordinates: [121.47, 31.23] },
  });
  assert.equal(place.id, "N-42");
  assert.equal(place.lon, 121.47);
  const url = new URL(mapURL({ lat: 85, lon: 180 }, 160));
  assert.equal(url.hostname, "www.openstreetmap.org");
  assert.equal(url.searchParams.get("marker"), "85,180");
  assert.ok(
    url.searchParams
      .get("bbox")
      .split(",")
      .every((n, i) => Math.abs(Number(n)) <= (i % 2 ? 85 : 180)),
  );
});

test("repeating a place search uses cached results instead of another request", async () => {
  const previousFetch = globalThis.fetch,
    previousStorage = globalThis.localStorage,
    values = new Map();
  let requests = 0;
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  globalThis.fetch = async () => {
    requests++;
    return {
      ok: true,
      json: async () => ({
        features: [
          {
            properties: { name: "上海" },
            geometry: { coordinates: [121.47, 31.23] },
          },
        ],
      }),
    };
  };
  try {
    const first = await searchPlaces("上海", new AbortController().signal);
    const second = await searchPlaces("上海", new AbortController().signal);
    assert.deepEqual(second, first);
    assert.equal(requests, 1);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousStorage;
  }
});

test("all application entries have local icons and static module paths", () => {
  const source = fs.readFileSync(
    new URL("../scripts/main.js", import.meta.url),
    "utf8",
  );
  for (const [id, app] of Object.entries(appInfo)) {
    assert.ok(
      fs.existsSync(new URL(`../assets/icons/${app.icon}`, import.meta.url)),
      id,
    );
    assert.match(source, new RegExp(`(?:\\b${id}:|registry\\.${id}\\s*=)`), id);
    if (id !== "trash") assert.ok(appCatalog[id], id);
  }
  assert.equal(defaultDock.length, 7);
  assert.ok(defaultDesktopApps.includes("maps"));
  assert.equal(
    wallpapers.find((w) => w.id === "original").src,
    "assets/wallpapers/original.jpg",
  );
  const pkg = JSON.parse(
    fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  );
  assert.equal(Object.keys(pkg.dependencies || {}).length, 0);
});
