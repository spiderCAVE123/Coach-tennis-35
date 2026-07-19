/**
 * Sound utility for playing simple sound effects
 * Uses Web Audio API for web and simple beeps for mobile
 */

import { Platform } from 'react-native';

let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (Platform.OS === 'web' && !audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.log('Audio context not supported');
    }
  }
  return audioContext;
};

/**
 * Play a beep sound with specified frequency and duration
 */
const playBeep = (frequency: number, duration: number, volume: number = 0.3, type: OscillatorType = 'sine') => {
  if (Platform.OS !== 'web') return;
  
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch (error) {
    console.log('Error playing sound:', error);
  }
};

/**
 * Play multiple notes in sequence
 */
const playSequence = (notes: Array<{ freq: number; duration: number; delay: number; type?: OscillatorType }>) => {
  if (Platform.OS !== 'web') return;
  
  notes.forEach(note => {
    setTimeout(() => {
      playBeep(note.freq, note.duration, 0.3, note.type || 'sine');
    }, note.delay);
  });
};

/**
 * Coin/XP earned sound - ascending musical tones
 */
export const playXPSound = () => {
  playSequence([
    { freq: 800, duration: 0.1, delay: 0 },
    { freq: 1000, duration: 0.1, delay: 100 },
    { freq: 1200, duration: 0.2, delay: 200 },
  ]);
};

/**
 * Coin collect sound - similar to Mario coin
 */
export const playCoinSound = () => {
  playSequence([
    { freq: 988, duration: 0.08, delay: 0, type: 'square' },
    { freq: 1319, duration: 0.15, delay: 80, type: 'square' },
  ]);
};

/**
 * Timer start sound - two ascending beeps
 */
export const playTimerStartSound = () => {
  playSequence([
    { freq: 600, duration: 0.15, delay: 0 },
    { freq: 800, duration: 0.2, delay: 150 },
  ]);
};

/**
 * Timer end sound - descending beeps
 */
export const playTimerEndSound = () => {
  playSequence([
    { freq: 1000, duration: 0.15, delay: 0 },
    { freq: 800, duration: 0.15, delay: 150 },
    { freq: 600, duration: 0.3, delay: 300 },
  ]);
};

/**
 * Drill complete sound - success chime
 */
export const playDrillCompleteSound = () => {
  playSequence([
    { freq: 800, duration: 0.1, delay: 0 },
    { freq: 1000, duration: 0.1, delay: 100 },
    { freq: 1300, duration: 0.15, delay: 200 },
    { freq: 1600, duration: 0.3, delay: 350 },
  ]);
};

/**
 * Workout complete sound - victory fanfare
 */
export const playVictorySound = () => {
  playSequence([
    { freq: 523, duration: 0.15, delay: 0 },      // C
    { freq: 659, duration: 0.15, delay: 150 },    // E
    { freq: 784, duration: 0.15, delay: 300 },    // G
    { freq: 1047, duration: 0.4, delay: 450 },    // C
    { freq: 784, duration: 0.15, delay: 900 },    // G
    { freq: 1047, duration: 0.5, delay: 1050 },   // C
  ]);
};

/**
 * Button click sound - short tick
 */
export const playClickSound = () => {
  playBeep(1200, 0.05, 0.15, 'sine');
};

/**
 * Achievement unlock sound - special chime
 */
export const playAchievementSound = () => {
  playSequence([
    { freq: 523, duration: 0.1, delay: 0 },
    { freq: 659, duration: 0.1, delay: 100 },
    { freq: 784, duration: 0.1, delay: 200 },
    { freq: 1047, duration: 0.2, delay: 300 },
    { freq: 1319, duration: 0.4, delay: 500 },
  ]);
};

/**
 * Countdown tick sound
 */
export const playCountdownTick = () => {
  playBeep(800, 0.08, 0.2, 'sine');
};
