let audioUnlocked = false;
let pendingOrderAlert = false;
let alertAudio: HTMLAudioElement | null = null;
let alertAudioUrl: string | null = null;

function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }

  return buffer;
}

function buildOrderAlertSamples(): Float32Array {
  const sampleRate = 44100;
  const durationSec = 0.65;
  const numSamples = Math.floor(sampleRate * durationSec);
  const samples = new Float32Array(numSamples);
  const tones = [
    { frequency: 880, start: 0, duration: 0.14 },
    { frequency: 1174.66, start: 0.16, duration: 0.18 },
    { frequency: 1318.51, start: 0.34, duration: 0.24 },
  ];

  for (const tone of tones) {
    const start = Math.floor(tone.start * sampleRate);
    const end = Math.min(
      numSamples,
      Math.floor((tone.start + tone.duration) * sampleRate)
    );
    for (let i = start; i < end; i += 1) {
      const t = (i - start) / sampleRate;
      const attack = Math.min(1, t * 50);
      const release = Math.max(0, 1 - t / tone.duration);
      const envelope = attack * release;
      samples[i] +=
        Math.sin((2 * Math.PI * tone.frequency * i) / sampleRate) *
        0.42 *
        envelope;
    }
  }

  return samples;
}

function getAlertAudioUrl(): string | null {
  if (typeof window === "undefined") return null;
  if (alertAudioUrl) return alertAudioUrl;
  const wav = encodeWav(buildOrderAlertSamples(), 44100);
  const blob = new Blob([wav], { type: "audio/wav" });
  alertAudioUrl = URL.createObjectURL(blob);
  return alertAudioUrl;
}

function getAlertAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  const url = getAlertAudioUrl();
  if (!url) return null;
  if (!alertAudio) {
    alertAudio = new Audio(url);
    alertAudio.preload = "auto";
  }
  return alertAudio;
}

export function isAdminNotificationAudioUnlocked(): boolean {
  return audioUnlocked;
}

/** Preload alert audio as soon as admin loads. */
export function initAdminOrderAlertAudio(): void {
  getAlertAudio();
}

async function primeAlertAudio(): Promise<boolean> {
  const audio = getAlertAudio();
  if (!audio) return false;
  try {
    audio.currentTime = 0;
    audio.volume = 0.001;
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
    audio.volume = 1;
    return true;
  } catch {
    return false;
  }
}

async function flushPendingOrderAlert(): Promise<void> {
  if (!pendingOrderAlert) return;
  pendingOrderAlert = false;
  await playAdminOrderAlert();
}

/** Unlocks audio during a user gesture; replays any queued order alert. */
export function unlockAdminNotificationAudio(): void {
  if (typeof window === "undefined") return;
  if (audioUnlocked) {
    void flushPendingOrderAlert();
    return;
  }
  void (async () => {
    const primed = await primeAlertAudio();
    if (!primed) return;
    audioUnlocked = true;
    window.dispatchEvent(new CustomEvent("admin:notification-audio-unlocked"));
    await flushPendingOrderAlert();
  })();
}

/** Attach once — first click, tap, or keypress in admin enables alerts silently. */
export function bindAdminNotificationAutoUnlock(): () => void {
  if (typeof window === "undefined") return () => {};

  const unlock = () => unlockAdminNotificationAudio();

  const opts = { capture: true, once: true } as const;
  window.addEventListener("pointerdown", unlock, opts);
  window.addEventListener("keydown", unlock, opts);
  window.addEventListener("touchstart", unlock, {
    capture: true,
    once: true,
    passive: true,
  });

  void (async () => {
    const primed = await primeAlertAudio();
    if (primed) {
      audioUnlocked = true;
      window.dispatchEvent(new CustomEvent("admin:notification-audio-unlocked"));
      await flushPendingOrderAlert();
    }
  })();

  return () => {
    window.removeEventListener("pointerdown", unlock, { capture: true });
    window.removeEventListener("keydown", unlock, { capture: true });
    window.removeEventListener("touchstart", unlock, { capture: true });
  };
}

export async function playAdminOrderAlert(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const audio = getAlertAudio();
  if (!audio) return false;

  try {
    audio.currentTime = 0;
    audio.volume = 1;
    await audio.play();
    audioUnlocked = true;
    pendingOrderAlert = false;
    return true;
  } catch {
    pendingOrderAlert = true;
    return false;
  }
}
