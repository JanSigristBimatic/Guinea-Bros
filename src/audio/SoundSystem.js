// Web Audio API based sound system - no external files needed
// Generates all sounds procedurally

class SoundSystem {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.enabled = true;
    this.musicEnabled = true;
    this.volume = 0.5;
    this.musicVolume = 0.3;
    this.initialized = false;
  }

  // Initialize audio context (must be called after user interaction)
  init() {
    if (this.initialized) return;

    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported');
      this.enabled = false;
    }
  }

  // Resume context if suspended (browser autoplay policy)
  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain) {
      this.masterGain.gain.value = this.volume;
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  // ============== SOUND GENERATORS ==============

  // Simple oscillator-based sound
  playTone(frequency, duration, type = 'sine', volumeMod = 1) {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.value = frequency;

    gain.gain.setValueAtTime(0.3 * volumeMod, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // Noise generator for explosions, etc.
  playNoise(duration, volumeMod = 1) {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3 * volumeMod, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    // Low-pass filter for softer sound
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start();
  }

  // ============== GAME SOUNDS ==============

  // Carrot collected
  collect() {
    if (!this.enabled || !this.ctx) return;
    this.playTone(880, 0.1, 'sine', 0.4);
    setTimeout(() => this.playTone(1100, 0.1, 'sine', 0.3), 50);
  }

  // Combo sound (higher pitch for higher combo)
  combo(level) {
    if (!this.enabled || !this.ctx) return;
    const baseFreq = 440 + level * 50;
    this.playTone(baseFreq, 0.15, 'sine', 0.5);
    setTimeout(() => this.playTone(baseFreq * 1.5, 0.1, 'sine', 0.4), 80);
  }

  // Building placed
  build() {
    if (!this.enabled || !this.ctx) return;
    this.playTone(220, 0.1, 'square', 0.3);
    setTimeout(() => this.playTone(330, 0.15, 'square', 0.4), 80);
  }

  // Attack sound (hero/tower attack)
  attack() {
    if (!this.enabled || !this.ctx) return;
    this.playTone(200, 0.08, 'sawtooth', 0.3);
  }

  // Hit sound (enemy takes damage)
  hit() {
    if (!this.enabled || !this.ctx) return;
    this.playTone(150, 0.1, 'square', 0.4);
  }

  // Critical hit
  crit() {
    if (!this.enabled || !this.ctx) return;
    this.playTone(600, 0.05, 'square', 0.5);
    setTimeout(() => this.playTone(800, 0.1, 'sine', 0.4), 30);
    setTimeout(() => this.playTone(1000, 0.15, 'sine', 0.3), 60);
  }

  // Explosion (bomb, death)
  explosion() {
    if (!this.enabled || !this.ctx) return;
    this.playNoise(0.3, 0.6);
    this.playTone(80, 0.2, 'sine', 0.5);
  }

  // Enemy death
  enemyDeath() {
    if (!this.enabled || !this.ctx) return;
    this.playTone(400, 0.1, 'sawtooth', 0.3);
    setTimeout(() => this.playTone(200, 0.15, 'sawtooth', 0.2), 50);
  }

  // Boss death (epic sound)
  bossDeath() {
    if (!this.enabled || !this.ctx) return;
    this.explosion();
    setTimeout(() => this.playTone(150, 0.3, 'sawtooth', 0.5), 100);
    setTimeout(() => this.playTone(200, 0.3, 'sine', 0.4), 200);
    setTimeout(() => this.playTone(300, 0.4, 'sine', 0.3), 350);
  }

  // Base takes damage
  baseDamage() {
    if (!this.enabled || !this.ctx) return;
    this.playTone(100, 0.2, 'sawtooth', 0.5);
    this.playTone(80, 0.3, 'sine', 0.4);
  }

  // Wave start
  waveStart() {
    if (!this.enabled || !this.ctx) return;
    // Dramatic horn sound
    this.playTone(220, 0.3, 'sawtooth', 0.4);
    setTimeout(() => this.playTone(330, 0.3, 'sawtooth', 0.4), 200);
    setTimeout(() => this.playTone(440, 0.4, 'sawtooth', 0.5), 400);
  }

  // Day start (peaceful)
  dayStart() {
    if (!this.enabled || !this.ctx) return;
    this.playTone(523, 0.2, 'sine', 0.3); // C5
    setTimeout(() => this.playTone(659, 0.2, 'sine', 0.3), 150); // E5
    setTimeout(() => this.playTone(784, 0.3, 'sine', 0.4), 300); // G5
  }

  // Victory fanfare
  victory() {
    if (!this.enabled || !this.ctx) return;
    const notes = [523, 659, 784, 1047]; // C E G C
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.3, 'sine', 0.5), i * 150);
    });
  }

  // Game over
  gameOver() {
    if (!this.enabled || !this.ctx) return;
    this.playTone(300, 0.3, 'sawtooth', 0.4);
    setTimeout(() => this.playTone(250, 0.3, 'sawtooth', 0.4), 250);
    setTimeout(() => this.playTone(200, 0.5, 'sawtooth', 0.5), 500);
  }

  // UI click
  click() {
    if (!this.enabled || !this.ctx) return;
    this.playTone(800, 0.05, 'sine', 0.2);
  }

  // Skill upgrade
  upgrade() {
    if (!this.enabled || !this.ctx) return;
    this.playTone(440, 0.1, 'sine', 0.4);
    setTimeout(() => this.playTone(550, 0.1, 'sine', 0.4), 80);
    setTimeout(() => this.playTone(660, 0.15, 'sine', 0.5), 160);
  }

  // Hero spawn
  heroSpawn() {
    if (!this.enabled || !this.ctx) return;
    this.playTone(330, 0.1, 'triangle', 0.4);
    setTimeout(() => this.playTone(440, 0.15, 'triangle', 0.4), 100);
  }

  // Projectile fire
  projectile() {
    if (!this.enabled || !this.ctx) return;
    this.playTone(600, 0.05, 'sawtooth', 0.2);
    this.playTone(400, 0.08, 'sine', 0.2);
  }

  // ============== AMBIENT MUSIC ==============

  // Simple ambient drone (optional background)
  ambientMusic = null;

  startAmbient() {
    if (!this.musicEnabled || !this.ctx || this.ambientMusic) return;
    this.resume();

    // Create a simple ambient pad
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc1.type = 'sine';
    osc1.frequency.value = 110; // A2
    osc2.type = 'sine';
    osc2.frequency.value = 165; // E3

    filter.type = 'lowpass';
    filter.frequency.value = 400;

    gain.gain.value = this.musicVolume * 0.2;

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start();
    osc2.start();

    this.ambientMusic = { osc1, osc2, gain };
  }

  stopAmbient() {
    if (this.ambientMusic) {
      this.ambientMusic.osc1.stop();
      this.ambientMusic.osc2.stop();
      this.ambientMusic = null;
    }
  }

  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    if (!this.musicEnabled) {
      this.stopAmbient();
    }
    return this.musicEnabled;
  }
}

// Singleton instance
const soundSystem = new SoundSystem();
export default soundSystem;
