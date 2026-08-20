let audioContext: AudioContext | null = null;
let audioUnlocked = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioContext) audioContext = new Ctx();
  return audioContext;
}

/** Call once after user interaction so browsers allow alert sounds. */
export function unlockAdminNotificationAudio(): void {
  const ctx = getAudioContext();
  if (!ctx || audioUnlocked) return;
  if (ctx.state === "suspended") {
    void ctx.resume();
  }
  audioUnlocked = true;
}

export function playAdminOrderAlert(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const start = ctx.currentTime;
    const tones: Array<{ frequency: number; at: number; duration: number }> = [
      { frequency: 880, at: 0, duration: 0.12 },
      { frequency: 1174.66, at: 0.14, duration: 0.16 },
      { frequency: 1318.51, at: 0.28, duration: 0.22 },
    ];

    for (const tone of tones) {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = tone.frequency;
      const toneStart = start + tone.at;
      gain.gain.setValueAtTime(0.0001, toneStart);
      gain.gain.exponentialRampToValueAtTime(0.18, toneStart + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, toneStart + tone.duration);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(toneStart);
      oscillator.stop(toneStart + tone.duration + 0.05);
    }

    if (ctx.state === "suspended") {
      void ctx.resume();
    }
  } catch {
    /* ignore autoplay or audio errors */
  }
}
