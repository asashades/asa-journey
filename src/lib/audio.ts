/**
 * Web Audio API helper utilities to play programmatic, lightweight sound effects without static assets.
 */

/**
 * Ascending sine-wave double/triple tone (C5-E5-G5 chord progression)
 * Played when a checklist item is marked "done".
 */
export const playChecklistJingle = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    // Notes: C5 (523.25 Hz), E5 (659.25 Hz), G5 (783.99 Hz)
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine'; // Soft, warm tone for checklist completion
      osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.07);

      gain.gain.setValueAtTime(0, ctx.currentTime + index * 0.07);
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + index * 0.07 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.07 + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + index * 0.07);
      osc.stop(ctx.currentTime + index * 0.07 + 0.25);
    });
  } catch (error) {
    console.error('Audio playback failed:', error);
  }
};

/**
 * Programmatic ascending soft triangle-wave jingle
 * Played when the daily writing word goal is successfully met.
 */
export const playGoalJingle = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    // Notes: C4, E4, G4, C5, E5, G5, C6
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle'; // Soft chiptune triangle sound
      osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.08);

      gain.gain.setValueAtTime(0, ctx.currentTime + index * 0.08);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + index * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.08 + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + index * 0.08);
      osc.stop(ctx.currentTime + index * 0.08 + 0.35);
    });
  } catch (error) {
    console.error('Audio playback failed:', error);
  }
};
