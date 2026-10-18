import { tracks } from "./config.js";
import { store, clamp } from "./ui.js";
export function parseLRC(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    const lyric = line.replace(/\[\d+:\d+(?:\.\d+)?\]/g, "").trim();
    if (!lyric) continue;
    for (const match of line.matchAll(/\[(\d+):(\d+)(?:\.(\d+))?\]/g))
      rows.push({
        time:
          Number(match[1]) * 60 +
          Number(match[2]) +
          Number(`0.${match[3] || 0}`),
        text: lyric,
      });
  }
  return rows.sort((a, b) => a.time - b.time);
}
export class MusicPlayer extends EventTarget {
  constructor(audio) {
    super();
    this.audio = audio;
    this.track = tracks[0];
    this.lyrics = [];
    this.raw = "";
    this.error = "";
    this.active = false;
    this.generation = 0;
    audio.preload = "metadata";
    audio.volume = clamp(Number(store.get("volume", 0.65)), 0, 1);
    for (const event of [
      "timeupdate",
      "play",
      "pause",
      "ended",
      "loadedmetadata",
      "volumechange",
    ])
      audio.addEventListener(event, () => this.emit());
    audio.addEventListener("error", () => {
      this.error = "音频暂时无法加载，请重试。";
      this.emit();
    });
  }
  emit() {
    this.dispatchEvent(new Event("change"));
  }
  async start(trackId = this.track.id) {
    const next = tracks.find((t) => t.id === trackId) || tracks[0];
    const generation = ++this.generation;
    this.active = true;
    this.error = "";
    this.track = next;
    this.raw = "";
    this.lyrics = [];
    this.audio.src = next.audio;
    this.audio.currentTime = 0;
    const play = this.audio.play();
    fetch(next.lyrics)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.text();
      })
      .then((text) => {
        if (generation !== this.generation) return;
        this.raw = text;
        this.lyrics = parseLRC(text);
        this.emit();
      })
      .catch(() => {
        if (generation === this.generation) {
          this.raw = "";
          this.lyrics = [];
          this.emit();
        }
      });
    try {
      await play;
    } catch (err) {
      if (generation === this.generation && err.name !== "AbortError") {
        this.error = "点一下播放，开始听歌。";
        this.emit();
      }
    }
    if (generation !== this.generation && !this.active) this.audio.pause();
  }
  emitError(text) {
    this.error = text;
    this.emit();
  }
  async resume() {
    if (!this.active) return;
    this.error = "";
    try {
      await this.audio.play();
    } catch {
      this.error = "播放未成功，请再试一次。";
    }
    this.emit();
  }
  pause() {
    this.audio.pause();
  }
  toggle() {
    this.audio.paused ? this.resume() : this.pause();
  }
  seek(time) {
    if (Number.isFinite(this.audio.duration))
      this.audio.currentTime = clamp(Number(time), 0, this.audio.duration);
    this.emit();
  }
  setVolume(value) {
    this.audio.volume = clamp(Number(value), 0, 1);
    store.set("volume", this.audio.volume);
  }
  stop() {
    this.active = false;
    ++this.generation;
    this.audio.pause();
    this.audio.currentTime = 0;
    this.error = "";
    this.emit();
  }
  get playing() {
    return !this.audio.paused;
  }
  get time() {
    return this.audio.currentTime || 0;
  }
  get duration() {
    return Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
  }
}
export const player =
  typeof Audio !== "undefined"
    ? new MusicPlayer(document.querySelector("#audio-player") || new Audio())
    : null;
