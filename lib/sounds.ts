function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    return new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  } catch {
    return null;
  }
}

function playTone(
  freq: number,
  type: OscillatorType,
  duration: number,
  gainPeak: number,
  delay = 0,
  ac?: AudioContext
) {
  const audio = ac ?? ctx();
  if (!audio) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audio.currentTime + delay);
  gain.gain.setValueAtTime(0, audio.currentTime + delay);
  gain.gain.linearRampToValueAtTime(gainPeak, audio.currentTime + delay + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + delay + duration);
  osc.start(audio.currentTime + delay);
  osc.stop(audio.currentTime + delay + duration);
}

export function playXPGainSound() {
  const audio = ctx();
  if (!audio) return;
  playTone(880, "sine", 0.12, 0.15, 0, audio);
  playTone(1320, "sine", 0.10, 0.10, 0.06, audio);
}

export function playXPSpendSound() {
  const audio = ctx();
  if (!audio) return;
  playTone(440, "sine", 0.15, 0.15, 0, audio);
  playTone(330, "sine", 0.15, 0.12, 0.08, audio);
}

export function playAchievementSound() {
  const audio = ctx();
  if (!audio) return;
  playTone(523, "sine", 0.15, 0.2, 0.00, audio);
  playTone(659, "sine", 0.15, 0.2, 0.12, audio);
  playTone(784, "sine", 0.20, 0.2, 0.24, audio);
  playTone(1047,"sine", 0.30, 0.25, 0.38, audio);
}

export function playLevelUpSound() {
  const audio = ctx();
  if (!audio) return;
  // Ascending chord arpeggio
  const notes = [262, 330, 392, 523, 659, 784, 1047];
  notes.forEach((f, i) => playTone(f, "sine", 0.25, 0.18, i * 0.07, audio));
}

export function playRewardUnlockSound() {
  const audio = ctx();
  if (!audio) return;
  playTone(659, "triangle", 0.12, 0.2, 0.00, audio);
  playTone(784, "triangle", 0.12, 0.2, 0.10, audio);
  playTone(1047,"triangle", 0.20, 0.2, 0.20, audio);
}

export function playPomodoroCompleteSound() {
  const audio = ctx();
  if (!audio) return;
  playTone(440, "sine", 0.3, 0.3, 0.0, audio);
  playTone(550, "sine", 0.3, 0.3, 0.1, audio);
  playTone(660, "sine", 0.4, 0.3, 0.2, audio);
}

function playChimesSound() {
  const audio = ctx();
  if (!audio) return;
  playTone(1200, "triangle", 0.3, 0.2, 0.0, audio);
  playTone(1500, "triangle", 0.25, 0.15, 0.18, audio);
  playTone(1800, "triangle", 0.3, 0.18, 0.36, audio);
}

function playRetroSound() {
  const audio = ctx();
  if (!audio) return;
  playTone(880, "square", 0.1, 0.2, 0.0, audio);
  playTone(660, "square", 0.1, 0.2, 0.12, audio);
  playTone(880, "square", 0.15, 0.25, 0.24, audio);
}

function playNatureSound() {
  const audio = ctx();
  if (!audio) return;
  playTone(440, "sine", 0.5, 0.15, 0.0, audio);
  playTone(550, "sine", 0.5, 0.12, 0.2, audio);
  playTone(330, "sine", 0.6, 0.1, 0.4, audio);
}

export function previewSoundForPack(pack: string) {
  switch (pack) {
    case "chimes": playChimesSound(); break;
    case "retro":  playRetroSound(); break;
    case "nature": playNatureSound(); break;
    default:       playPomodoroCompleteSound(); break;
  }
}

export function playPomodoroCompletionForPack(pack: string) {
  switch (pack) {
    case "chimes": playChimesSound(); break;
    case "retro":  playRetroSound(); break;
    case "nature": playNatureSound(); break;
    default:       playPomodoroCompleteSound(); break;
  }
}
