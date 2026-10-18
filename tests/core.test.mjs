import test from "node:test";
import assert from "node:assert/strict";
import { parseLRC, MusicPlayer } from "../scripts/player.js";
import { Calculator } from "../scripts/calculator.js";
import { fitRect } from "../scripts/desktop.js";
import { safeURL, h } from "../scripts/ui.js";
import {
  commentText,
  parseCard,
  isOwner,
  validateMessage,
} from "../scripts/guestbook.js";
import validation from "../services/waline/validation.cjs";

test("lyrics use fractional second precision and support multiple timestamps", () => {
  assert.deepEqual(
    parseLRC("[00:01.500]a\n[00:02.50][01:02.5]b\n[ar:artist]\n[00:03.005]c"),
    [
      { time: 1.5, text: "a" },
      { time: 2.5, text: "b" },
      { time: 3.005, text: "c" },
      { time: 62.5, text: "b" },
    ],
  );
});
test("closing during audio start prevents a delayed playback restart", async () => {
  class FakeAudio extends EventTarget {
    paused = true;
    currentTime = 0;
    duration = 100;
    play() {
      this.paused = false;
      return new Promise((resolve) => (this.finish = resolve));
    }
    pause() {
      this.paused = true;
    }
  }
  const audio = new FakeAudio(),
    player = new MusicPlayer(audio);
  const pending = player.start();
  player.stop();
  audio.finish();
  await pending;
  assert.equal(audio.paused, true);
  assert.equal(player.active, false);
  assert.equal(audio.currentTime, 0);
});
test("calculator arithmetic, repeated equals, percentages, division by zero, fresh digit", () => {
  const calc = new Calculator();
  for (const key of ["2", "0", "0", "+", "1", "0", "%", "="]) calc.input(key);
  assert.equal(calc.display, "220");
  calc.input("=");
  assert.equal(calc.display, "240");
  calc.input("5");
  assert.equal(calc.display, "5");
  for (const key of ["÷", "0", "="]) calc.input(key);
  assert.equal(calc.display, "错误");
  calc.input("3");
  assert.equal(calc.display, "3");
});
test("window stays reachable after viewport shrink", () => {
  const r = fitRect({ x: 1800, y: 1000, w: 1000, h: 800 }, 1280, 720, 560, 380);
  assert.ok(r.x >= 10 && r.y >= 38);
  assert.ok(r.x + r.w <= 1270);
  assert.ok(r.y + r.h <= 628);
});
test("public input cannot invent an owner or executable URL", () => {
  assert.equal(isOwner({ nick: "Lozic", mail: "zzcn.leo@gmail.com" }), false);
  assert.equal(isOwner({ type: "administrator" }), false);
  assert.equal(isOwner({ type: "administrator", user_id: 1 }), true);
  assert.equal(safeURL("javascript:alert(1)"), null);
  assert.equal(safeURL("data:text/html,test"), null);
  assert.equal(h('<img onerror="x">'), "&lt;img onerror=&quot;x&quot;&gt;");
});
test("guestbook text strips active tags and only maps known song references", () => {
  assert.equal(
    commentText({ comment: "<p>Hello<br>world</p><script>alert(1)</script>" }),
    "Hello\nworld",
  );
  assert.equal(
    parseCard("[Lozic:track:https://attacker.test/audio.mp3]").track,
    null,
  );
  assert.equal(
    parseCard("Hi\n[Lozic:track:beginning-to-understand]").track.id,
    "beginning-to-understand",
  );
});
test("front and server agree on unicode nickname and message limits", () => {
  const nick = "🙂".repeat(24),
    text = "好".repeat(1000);
  assert.equal(validateMessage(nick, text), "");
  assert.equal(
    validation.validateComment({
      nick,
      comment: text,
      url: "personal-mac/guestbook",
    }),
    null,
  );
  assert.ok(validateMessage(nick + "a", text));
  assert.ok(
    validation.validateComment({
      nick: " ",
      comment: "hello",
      url: "personal-mac/guestbook",
    }),
  );
  assert.ok(
    validation.validateComment({
      nick: "a",
      comment: "hello",
      url: "another-wall",
    }),
  );
  assert.ok(
    validation.validateComment({
      nick: "a",
      comment: "hello",
      url: "personal-mac/guestbook",
      pid: 1,
    }),
  );
});
