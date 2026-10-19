export class CallSession extends EventTarget {
  constructor(mediaDevices = globalThis.navigator?.mediaDevices) {
    super();
    this.mediaDevices = mediaDevices;
    this.state = "idle";
    this.generation = 0;
    this.video = null;
    this.microphone = null;
    this.muted = true;
    this.connectedAt = 0;
    this.error = "";
    this.pendingVideo = false;
    this.pendingMic = false;
  }
  emit() {
    this.dispatchEvent(new Event("change"));
  }
  stopStreams() {
    for (const stream of [this.video, this.microphone])
      stream?.getTracks().forEach((track) => track.stop());
    this.video = null;
    this.microphone = null;
    this.muted = true;
  }
  start(direction = "outgoing") {
    this.end(false);
    this.state = direction === "incoming" ? "incoming" : "calling";
    this.error = "";
    this.connectedAt = 0;
    this.emit();
    if (direction !== "incoming") {
      const generation = this.generation;
      this.timer = setTimeout(() => {
        if (generation === this.generation) this.answer();
      }, 1400);
    }
  }
  answer() {
    if (!["incoming", "calling"].includes(this.state)) return;
    clearTimeout(this.timer);
    this.state = "connected";
    this.connectedAt = Date.now();
    this.emit();
  }
  async toggleVideo() {
    if (this.state !== "connected" || this.pendingVideo) return;
    if (this.video) {
      this.video.getTracks().forEach((t) => t.stop());
      this.video = null;
      this.emit();
      return;
    }
    const generation = this.generation;
    this.pendingVideo = true;
    this.error = "";
    this.emit();
    try {
      if (!this.mediaDevices?.getUserMedia) throw new Error("unsupported");
      const stream = await this.mediaDevices.getUserMedia({
        video: { width: { ideal: 960 }, height: { ideal: 540 } },
        audio: false,
      });
      if (generation !== this.generation || this.state !== "connected") {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      this.video = stream;
    } catch {
      if (generation === this.generation)
        this.error = "没有取得摄像头权限，仍可继续演示或发信息。";
    } finally {
      if (generation === this.generation) {
        this.pendingVideo = false;
        this.emit();
      }
    }
  }
  async toggleMicrophone() {
    if (this.state !== "connected" || this.pendingMic) return;
    if (this.microphone) {
      this.muted = !this.muted;
      this.microphone
        .getAudioTracks()
        .forEach((t) => (t.enabled = !this.muted));
      this.emit();
      return;
    }
    const generation = this.generation;
    this.pendingMic = true;
    this.error = "";
    this.emit();
    try {
      if (!this.mediaDevices?.getUserMedia) throw new Error("unsupported");
      const stream = await this.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      if (generation !== this.generation || this.state !== "connected") {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      this.microphone = stream;
      this.muted = false;
    } catch {
      if (generation === this.generation)
        this.error = "没有取得麦克风权限，可以继续使用其他功能。";
    } finally {
      if (generation === this.generation) {
        this.pendingMic = false;
        this.emit();
      }
    }
  }
  end(emit = true) {
    ++this.generation;
    clearTimeout(this.timer);
    this.stopStreams();
    this.pendingVideo = false;
    this.pendingMic = false;
    this.state = "ended";
    if (emit) this.emit();
  }
  reset() {
    this.end(false);
    this.state = "idle";
    this.error = "";
    this.emit();
  }
}
