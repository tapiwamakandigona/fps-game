import { Howl, Howler } from 'howler';

interface Sound {
  howl: Howl;
  id?: number;
}

interface ToneLayer {
  freq: number;
  duration: number;
  type: OscillatorType;
  volume: number;
  attack: number;
  decay: number;
}

export class AudioManager {
  private sounds: Map<string, Sound> = new Map();
  private music: Map<string, Sound> = new Map();
  private currentMusic: string | null = null;
  private masterVolume: number = 1.0;
  private sfxVolume: number = 0.8;
  private musicVolume: number = 0.5;
  private initialized: boolean = false;

  constructor() {
    Howler.volume(this.masterVolume);
  }

  public async init(): Promise<void> {
    if (this.initialized) return;

    // Load weapon sounds - unique for each weapon type
    await this.loadSound('pistolShoot', this.createPistolShoot());
    await this.loadSound('rifleShoot', this.createRifleShoot());
    await this.loadSound('shotgunShoot', this.createShotgunShoot());
    await this.loadSound('sniperShoot', this.createSniperShoot());
    await this.loadSound('knifeSwing', this.createKnifeSwing());
    await this.loadSound('shoot', this.createPistolShoot());

    // Reload and other sounds
    await this.loadSound('reload', this.createReloadSound());
    await this.loadSound('empty', this.createEmptySound());
    await this.loadSound('hit', this.createHitSound());
    await this.loadSound('enemyHit', this.createEnemyHitSound());
    await this.loadSound('enemyDeath', this.createEnemyDeathSound());
    await this.loadSound('playerHurt', this.createPlayerHurtSound());
    await this.loadSound('pickup', this.createPickupSound());
    await this.loadSound('levelComplete', this.createLevelCompleteSound());
    await this.loadSound('gameOver', this.createGameOverSound());
    await this.loadSound('victory', this.createVictorySound());
    await this.loadSound('waveStart', this.createWaveStartSound());
    await this.loadSound('combo', this.createComboSound());

    // Load music
    await this.loadMusic('menu', this.createMenuMusic());
    await this.loadMusic('level1', this.createLevel1Music());
    await this.loadMusic('level2', this.createLevel2Music());
    await this.loadMusic('level3', this.createZombieModeMusic());

    this.initialized = true;
  }

  private async loadSound(id: string, dataUrl: string): Promise<void> {
    return new Promise((resolve) => {
      const howl = new Howl({
        src: [dataUrl],
        volume: this.sfxVolume,
        onload: () => resolve(),
        onloaderror: () => resolve()
      });
      this.sounds.set(id, { howl });
    });
  }

  private async loadMusic(id: string, dataUrl: string): Promise<void> {
    return new Promise((resolve) => {
      const howl = new Howl({
        src: [dataUrl],
        volume: this.musicVolume,
        loop: true,
        onload: () => resolve(),
        onloaderror: () => resolve()
      });
      this.music.set(id, { howl });
    });
  }

  public playSound(id: string): void {
    const sound = this.sounds.get(id);
    if (sound) {
      sound.howl.play();
    }
  }

  public playMusic(id: string): void {
    if (this.currentMusic) {
      this.stopMusic();
    }
    const music = this.music.get(id);
    if (music) {
      music.id = music.howl.play();
      this.currentMusic = id;
    }
  }

  public stopMusic(): void {
    if (this.currentMusic) {
      const music = this.music.get(this.currentMusic);
      if (music) {
        music.howl.stop();
      }
      this.currentMusic = null;
    }
  }

  public pauseMusic(): void {
    if (this.currentMusic) {
      const music = this.music.get(this.currentMusic);
      if (music) {
        music.howl.pause();
      }
    }
  }

  public resumeMusic(): void {
    if (this.currentMusic) {
      const music = this.music.get(this.currentMusic);
      if (music) {
        music.howl.play();
      }
    }
  }

  public setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    Howler.volume(this.masterVolume);
  }

  public setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    this.sounds.forEach(sound => {
      sound.howl.volume(this.sfxVolume);
    });
  }

  public setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    this.music.forEach(music => {
      music.howl.volume(this.musicVolume);
    });
  }

  // ========== WEAPON SOUNDS ==========

  private createPistolShoot(): string {
    return this.generateComplexSound([
      { freq: 180, duration: 0.08, type: 'square', volume: 0.7, attack: 0.001, decay: 0.05 },
      { freq: 120, duration: 0.06, type: 'sawtooth', volume: 0.5, attack: 0.001, decay: 0.04 }
    ]);
  }

  private createRifleShoot(): string {
    return this.generateComplexSound([
      { freq: 150, duration: 0.06, type: 'square', volume: 0.8, attack: 0.001, decay: 0.03 },
      { freq: 80, duration: 0.08, type: 'sawtooth', volume: 0.6, attack: 0.001, decay: 0.05 },
      { freq: 200, duration: 0.04, type: 'square', volume: 0.3, attack: 0.001, decay: 0.02 }
    ]);
  }

  private createShotgunShoot(): string {
    return this.generateComplexSound([
      { freq: 60, duration: 0.15, type: 'sawtooth', volume: 0.9, attack: 0.001, decay: 0.1 },
      { freq: 100, duration: 0.12, type: 'square', volume: 0.7, attack: 0.001, decay: 0.08 },
      { freq: 40, duration: 0.2, type: 'sawtooth', volume: 0.5, attack: 0.001, decay: 0.15 }
    ]);
  }

  private createSniperShoot(): string {
    return this.generateComplexSound([
      { freq: 200, duration: 0.05, type: 'square', volume: 0.9, attack: 0.001, decay: 0.02 },
      { freq: 50, duration: 0.25, type: 'sawtooth', volume: 0.7, attack: 0.01, decay: 0.2 },
      { freq: 400, duration: 0.03, type: 'sine', volume: 0.4, attack: 0.001, decay: 0.02 }
    ]);
  }

  private createKnifeSwing(): string {
    return this.generateSweepSound(400, 100, 0.15, 'sine', 0.6);
  }

  // ========== OTHER SOUNDS ==========

  private createReloadSound(): string {
    return this.generateComplexSound([
      { freq: 800, duration: 0.08, type: 'sine', volume: 0.4, attack: 0.01, decay: 0.06 },
      { freq: 400, duration: 0.1, type: 'sine', volume: 0.3, attack: 0.05, decay: 0.08 },
      { freq: 600, duration: 0.08, type: 'sine', volume: 0.5, attack: 0.1, decay: 0.06 }
    ]);
  }

  private createEmptySound(): string {
    return this.generateComplexSound([
      { freq: 300, duration: 0.05, type: 'square', volume: 0.4, attack: 0.001, decay: 0.04 }
    ]);
  }

  private createHitSound(): string {
    return this.generateComplexSound([
      { freq: 150, duration: 0.08, type: 'sawtooth', volume: 0.5, attack: 0.001, decay: 0.06 },
      { freq: 100, duration: 0.1, type: 'square', volume: 0.4, attack: 0.001, decay: 0.08 }
    ]);
  }

  private createEnemyHitSound(): string {
    return this.generateComplexSound([
      { freq: 200, duration: 0.1, type: 'square', volume: 0.6, attack: 0.001, decay: 0.08 },
      { freq: 300, duration: 0.08, type: 'sawtooth', volume: 0.4, attack: 0.01, decay: 0.06 }
    ]);
  }

  private createEnemyDeathSound(): string {
    return this.generateSweepSound(200, 50, 0.4, 'sawtooth', 0.6);
  }

  private createPlayerHurtSound(): string {
    return this.generateComplexSound([
      { freq: 150, duration: 0.15, type: 'sine', volume: 0.6, attack: 0.01, decay: 0.12 },
      { freq: 100, duration: 0.2, type: 'sawtooth', volume: 0.4, attack: 0.01, decay: 0.15 }
    ]);
  }

  private createPickupSound(): string {
    return this.generateSweepSound(400, 800, 0.15, 'sine', 0.5);
  }

  private createLevelCompleteSound(): string {
    return this.generateComplexSound([
      { freq: 400, duration: 0.15, type: 'sine', volume: 0.5, attack: 0.01, decay: 0.12 },
      { freq: 500, duration: 0.15, type: 'sine', volume: 0.5, attack: 0.12, decay: 0.12 },
      { freq: 600, duration: 0.2, type: 'sine', volume: 0.5, attack: 0.24, decay: 0.15 },
      { freq: 800, duration: 0.3, type: 'sine', volume: 0.6, attack: 0.36, decay: 0.25 }
    ]);
  }

  private createGameOverSound(): string {
    return this.generateSweepSound(300, 50, 0.8, 'sawtooth', 0.5);
  }

  private createVictorySound(): string {
    return this.generateComplexSound([
      { freq: 500, duration: 0.2, type: 'sine', volume: 0.5, attack: 0.01, decay: 0.15 },
      { freq: 600, duration: 0.2, type: 'sine', volume: 0.5, attack: 0.15, decay: 0.15 },
      { freq: 700, duration: 0.2, type: 'sine', volume: 0.5, attack: 0.3, decay: 0.15 },
      { freq: 900, duration: 0.4, type: 'sine', volume: 0.6, attack: 0.45, decay: 0.35 }
    ]);
  }

  private createWaveStartSound(): string {
    return this.generateComplexSound([
      { freq: 150, duration: 0.3, type: 'sawtooth', volume: 0.7, attack: 0.01, decay: 0.25 },
      { freq: 200, duration: 0.3, type: 'square', volume: 0.5, attack: 0.1, decay: 0.25 }
    ]);
  }

  private createComboSound(): string {
    return this.generateSweepSound(300, 600, 0.1, 'sine', 0.5);
  }

  // ========== MUSIC ==========

  private createMenuMusic(): string {
    return this.generateAmbientTone(220, 3.0, 0.15);
  }

  private createLevel1Music(): string {
    return this.generateAmbientTone(200, 3.0, 0.12);
  }

  private createLevel2Music(): string {
    return this.generateAmbientTone(180, 3.0, 0.12);
  }

  private createZombieModeMusic(): string {
    return this.generateAmbientTone(110, 3.0, 0.15);
  }

  // ========== SOUND GENERATION ==========

  private generateComplexSound(layers: ToneLayer[]): string {
    const sampleRate = 44100;
    const maxDuration = Math.max(...layers.map(l => l.attack + l.duration));
    const numSamples = Math.floor(sampleRate * maxDuration);

    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    this.writeWavHeader(view, numSamples);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      let sample = 0;

      for (const layer of layers) {
        const layerStart = layer.attack;
        const layerEnd = layer.attack + layer.duration;

        if (t >= layerStart && t <= layerEnd) {
          const layerT = t - layerStart;
          const phase = 2 * Math.PI * layer.freq * layerT;
          let waveform = 0;

          switch (layer.type) {
            case 'sine':
              waveform = Math.sin(phase);
              break;
            case 'square':
              waveform = Math.sin(phase) > 0 ? 1 : -1;
              break;
            case 'sawtooth':
              waveform = 2 * ((layer.freq * layerT) % 1) - 1;
              break;
            case 'triangle':
              waveform = Math.abs(4 * ((layer.freq * layerT) % 1) - 2) - 1;
              break;
          }

          const progress = layerT / layer.duration;
          const envelope = 1 - Math.pow(progress, 2);
          sample += waveform * envelope * layer.volume;
        }
      }

      sample = Math.max(-1, Math.min(1, sample));
      const pcm = Math.floor(sample * 32767);
      view.setInt16(44 + i * 2, pcm, true);
    }

    return this.bufferToDataUrl(buffer);
  }

  private generateSweepSound(
    startFreq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType,
    volume: number
  ): string {
    const sampleRate = 44100;
    const numSamples = Math.floor(sampleRate * duration);

    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    this.writeWavHeader(view, numSamples);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const progress = t / duration;
      const freq = startFreq + (endFreq - startFreq) * progress;
      const phase = 2 * Math.PI * freq * t;

      let sample = 0;
      switch (type) {
        case 'sine':
          sample = Math.sin(phase);
          break;
        case 'square':
          sample = Math.sin(phase) > 0 ? 1 : -1;
          break;
        case 'sawtooth':
          sample = 2 * ((freq * t) % 1) - 1;
          break;
        case 'triangle':
          sample = Math.abs(4 * ((freq * t) % 1) - 2) - 1;
          break;
      }

      const envelope = 1 - progress;
      sample *= envelope * volume;

      const pcm = Math.floor(sample * 32767);
      view.setInt16(44 + i * 2, pcm, true);
    }

    return this.bufferToDataUrl(buffer);
  }

  private generateAmbientTone(frequency: number, duration: number, volume: number): string {
    const sampleRate = 44100;
    const numSamples = Math.floor(sampleRate * duration);

    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    this.writeWavHeader(view, numSamples);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      let sample = Math.sin(2 * Math.PI * frequency * t) * 0.5;
      sample += Math.sin(2 * Math.PI * frequency * 1.5 * t) * 0.25;
      sample += Math.sin(2 * Math.PI * frequency * 2 * t) * 0.15;

      const modulation = 0.8 + 0.2 * Math.sin(2 * Math.PI * 0.5 * t);
      sample *= modulation * volume;

      const pcm = Math.floor(sample * 32767);
      view.setInt16(44 + i * 2, pcm, true);
    }

    return this.bufferToDataUrl(buffer);
  }

  private writeWavHeader(view: DataView, numSamples: number): void {
    const sampleRate = 44100;
    const channels = 1;

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * channels * 2, true);
    view.setUint16(32, channels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true);
  }

  private bufferToDataUrl(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return 'data:audio/wav;base64,' + btoa(binary);
  }

  public dispose(): void {
    this.sounds.forEach(sound => sound.howl.unload());
    this.music.forEach(music => music.howl.unload());
    this.sounds.clear();
    this.music.clear();
  }
}
