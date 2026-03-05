let audioContext: AudioContext | null = null;
let alarmTimeoutId: ReturnType<typeof setTimeout> | null = null;

const BEEP_FREQUENCY = 440;
const BEEP_DURATION = 0.2;
const BEEP_GAP = 0.15;
const BEEPS_PER_ROUND = 3;
const ROUNDS = 2;
const ROUND_GAP = 1.2;
const AUTO_STOP_MS = 5000;
const GAIN_LEVEL = 0.3;
const GAIN_FADE_TARGET = 0.001;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

function playBeep(ctx: AudioContext, startTime: number): void {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  oscillator.frequency.value = BEEP_FREQUENCY;
  oscillator.type = "sine";
  gainNode.gain.setValueAtTime(GAIN_LEVEL, startTime);
  gainNode.gain.exponentialRampToValueAtTime(
    GAIN_FADE_TARGET,
    startTime + BEEP_DURATION
  );
  oscillator.start(startTime);
  oscillator.stop(startTime + BEEP_DURATION);
}

export function playAlarm(): void {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  for (let round = 0; round < ROUNDS; round++) {
    for (let i = 0; i < BEEPS_PER_ROUND; i++) {
      playBeep(ctx, now + round * ROUND_GAP + i * (BEEP_DURATION + BEEP_GAP));
    }
  }

  alarmTimeoutId = setTimeout(() => {
    stopAlarm();
  }, AUTO_STOP_MS);
}

export function stopAlarm(): void {
  if (alarmTimeoutId) {
    clearTimeout(alarmTimeoutId);
    alarmTimeoutId = null;
  }
  if (audioContext) {
    void audioContext.close();
    audioContext = null;
  }
}
