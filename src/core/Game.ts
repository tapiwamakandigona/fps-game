import * as THREE from 'three';
import { GameState, GameStats } from '../types';
import { GameLoop } from './GameLoop';
import { InputManager } from '../managers/InputManager';
import { AudioManager } from '../managers/AudioManager';
import { UIManager } from '../managers/UIManager';
import { LevelManager } from '../managers/LevelManager';
import { Player } from '../entities/Player';

export class Game {
  private static instance: Game;

  // Three.js core
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;

  // Managers
  public inputManager: InputManager;
  public audioManager: AudioManager;
  public uiManager: UIManager;
  public levelManager: LevelManager;

  // Game state
  private gameState: GameState = GameState.LOADING;
  private gameLoop: GameLoop;

  // Player
  public player: Player | null = null;

  // Stats
  public stats: GameStats = {
    score: 0,
    kills: 0,
    accuracy: 0,
    shotsFired: 0,
    shotsHit: 0,
    timeElapsed: 0,
    currentLevel: 1
  };

  // Kill combo system
  private comboCount: number = 0;
  private comboTimer: number = 0;
  private readonly comboDuration: number = 2; // 2 seconds to continue combo
  private readonly maxCombo: number = 10;

  // Coins (for zombie mode)
  private coins: number = 0;

  // Container
  private container: HTMLElement;

  private constructor() {
    // Get container
    this.container = document.getElementById('game-container')!;

    // Initialize renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x1a1a2e);
    this.container.appendChild(this.renderer.domElement);

    // Initialize scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x1a1a2e, 0.02);

    // Initialize camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    // Initialize managers
    this.inputManager = new InputManager(this);
    this.audioManager = new AudioManager();
    this.uiManager = new UIManager(this);
    this.levelManager = new LevelManager(this);

    // Initialize game loop
    this.gameLoop = new GameLoop(this);

    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));

    // Update loading progress
    this.updateLoadingProgress(10, 'Initializing renderer...');
  }

  public static getInstance(): Game {
    if (!Game.instance) {
      Game.instance = new Game();
    }
    return Game.instance;
  }

  public async init(): Promise<void> {
    try {
      // Load audio
      this.updateLoadingProgress(30, 'Loading audio...');
      await this.audioManager.init();

      // Initialize UI
      this.updateLoadingProgress(50, 'Setting up UI...');
      this.uiManager.init();

      // Load first level
      this.updateLoadingProgress(70, 'Loading level...');
      await this.levelManager.loadLevel(1);

      // Initialize player
      this.updateLoadingProgress(90, 'Spawning player...');
      this.initPlayer();

      // Complete loading
      this.updateLoadingProgress(100, 'Ready!');

      // Wait a moment before hiding loading screen
      await new Promise(resolve => setTimeout(resolve, 500));

      // Show click to play
      this.hideLoadingScreen();
      this.showClickToPlay();

      // Render initial frame so the scene is visible
      this.render();

    } catch (error) {
      console.error('Failed to initialize game:', error);
      this.updateLoadingProgress(0, 'Error loading game!');
    }
  }

  private initPlayer(): void {
    const spawnPoint = this.levelManager.getPlayerSpawn();
    console.log('Initializing player at spawn point:', spawnPoint);
    this.player = new Player(this, spawnPoint);
    this.scene.add(this.player.mesh);
    console.log('Player mesh added to scene. Scene children count:', this.scene.children.length);
    console.log('Camera world position:', this.camera.getWorldPosition(new THREE.Vector3()));
  }

  public start(): void {
    console.log('Game.start() called, current state:', this.gameState);

    if (this.gameState === GameState.LOADING) {
      console.warn('Game.start() aborted - still in LOADING state');
      return;
    }

    // Prevent starting if already playing
    if (this.gameState === GameState.PLAYING) {
      console.warn('Game.start() aborted - already playing');
      return;
    }

    console.log('Starting game...');
    this.setGameState(GameState.PLAYING);

    // Start game loop first, then request pointer lock
    // This ensures the game is running even if pointer lock fails
    this.gameLoop.start();
    this.audioManager.playMusic('level1');

    // Show touch controls on mobile
    if (this.inputManager.isMobileDevice()) {
      this.inputManager.showTouchControls();
      // Request fullscreen for better mobile experience
      this.inputManager.requestFullscreen();
    } else {
      // Request pointer lock on desktop - this may fail but game should still work
      try {
        this.inputManager.lockPointer();
      } catch (e) {
        console.warn('Failed to lock pointer:', e);
      }
    }

    console.log('Game started successfully, state:', this.gameState);
  }

  public pause(): void {
    if (this.gameState !== GameState.PLAYING) return;

    this.setGameState(GameState.PAUSED);
    this.inputManager.unlockPointer();
    this.inputManager.hideTouchControls();
    this.uiManager.showPauseMenu();
    this.audioManager.pauseMusic();
  }

  public resume(): void {
    if (this.gameState !== GameState.PAUSED) return;

    this.setGameState(GameState.PLAYING);
    if (this.inputManager.isMobileDevice()) {
      this.inputManager.showTouchControls();
    } else {
      this.inputManager.lockPointer();
    }
    this.uiManager.hidePauseMenu();
    this.audioManager.resumeMusic();
  }

  public gameOver(): void {
    this.setGameState(GameState.GAME_OVER);
    this.inputManager.unlockPointer();
    this.audioManager.playSound('gameOver');
    this.audioManager.stopMusic();
    this.uiManager.showGameOver();
  }

  public victory(): void {
    this.setGameState(GameState.VICTORY);
    this.inputManager.unlockPointer();
    this.audioManager.playSound('victory');
    this.audioManager.stopMusic();
    this.uiManager.showVictory();
  }

  public levelComplete(): void {
    // Prevent multiple level complete triggers
    if (this.gameState === GameState.LEVEL_COMPLETE) return;

    this.setGameState(GameState.LEVEL_COMPLETE);
    this.audioManager.playSound('levelComplete');

    // Show level complete message
    this.uiManager.showLevelComplete(this.stats.currentLevel);

    // Auto-advance to next level after delay
    setTimeout(() => {
      this.nextLevel();
    }, 2000);
  }

  public async nextLevel(): Promise<void> {
    const nextLevelId = this.stats.currentLevel + 1;

    if (nextLevelId > 3) {
      this.victory();
      return;
    }

    this.stats.currentLevel = nextLevelId;
    await this.levelManager.loadLevel(nextLevelId);

    // Reset player position
    if (this.player) {
      const spawnPoint = this.levelManager.getPlayerSpawn();
      this.player.reset(spawnPoint);
    }

    this.setGameState(GameState.PLAYING);
    this.inputManager.lockPointer();
    this.audioManager.playMusic(`level${nextLevelId}`);
  }

  public restart(): void {
    // Store current level before reset
    const currentLevel = this.stats.currentLevel;

    // Reset stats (keep current level)
    this.stats = {
      score: 0,
      kills: 0,
      accuracy: 0,
      shotsFired: 0,
      shotsHit: 0,
      timeElapsed: 0,
      currentLevel: currentLevel
    };

    // Reset coins
    this.coins = 0;
    this.uiManager.updateCoins(0);

    // Reload current level
    this.levelManager.loadLevel(currentLevel);

    // Reset player
    if (this.player) {
      const spawnPoint = this.levelManager.getPlayerSpawn();
      this.player.reset(spawnPoint);

      // Configure zombie mode if Level 3
      if (currentLevel === 3) {
        this.player.weaponSystem.configureZombieMode();
      }
    }

    // Start game
    this.setGameState(GameState.PLAYING);
    this.inputManager.lockPointer();
    this.uiManager.hideAllMenus();
    this.audioManager.playMusic(currentLevel === 3 ? 'ambient' : `level${currentLevel}`);
  }

  public mainMenu(): void {
    // Stop the game loop
    this.gameLoop.stop();

    // Hide touch controls
    this.inputManager.hideTouchControls();

    // Reset stats
    this.stats = {
      score: 0,
      kills: 0,
      accuracy: 0,
      shotsFired: 0,
      shotsHit: 0,
      timeElapsed: 0,
      currentLevel: 1
    };

    // Reset coins and hide coins UI
    this.coins = 0;
    this.uiManager.showCoins(false);
    this.uiManager.hideInteractPrompt();

    // Reload level 1
    this.levelManager.loadLevel(1);

    // Reset player
    if (this.player) {
      const spawnPoint = this.levelManager.getPlayerSpawn();
      this.player.reset(spawnPoint);
    }

    this.setGameState(GameState.MAIN_MENU);
    this.inputManager.unlockPointer();
    this.uiManager.hideAllMenus();
    this.uiManager.showMainMenu();
    this.audioManager.playMusic('menu');

    // Re-attach click-to-play handler
    this.attachClickToPlayHandler();

    // Render a frame so the scene is visible behind the menu
    this.render();
  }

  private attachClickToPlayHandler(): void {
    const clickToPlay = document.getElementById('click-to-play');
    if (clickToPlay) {
      // Remove any existing listeners by cloning and replacing
      const newClickToPlay = clickToPlay.cloneNode(true) as HTMLElement;
      clickToPlay.parentNode?.replaceChild(newClickToPlay, clickToPlay);

      // Get skip button from cloned element
      const skipBtn = newClickToPlay.querySelector('#skip-tutorial-btn');

      const handleStart = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Click-to-play activated (re-attached)!');
        newClickToPlay.classList.remove('visible');

        // Small delay to ensure the overlay is hidden before starting
        requestAnimationFrame(() => {
          this.start();
        });
      };

      const handleSkipToZombie = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Skip to Zombie Mode activated (re-attached)!');
        newClickToPlay.classList.remove('visible');

        requestAnimationFrame(() => {
          this.startFromLevel(3);
        });
      };

      newClickToPlay.addEventListener('click', handleStart);
      newClickToPlay.addEventListener('touchstart', handleStart, { passive: false });

      if (skipBtn) {
        skipBtn.addEventListener('click', handleSkipToZombie);
        skipBtn.addEventListener('touchstart', handleSkipToZombie, { passive: false });
      }
    }
  }

  public update(delta: number): void {
    if (this.gameState !== GameState.PLAYING) return;

    // Update stats
    this.stats.timeElapsed += delta;

    // Update player
    if (this.player) {
      this.player.update(delta);
    }

    // Update level (enemies, pickups, etc.)
    this.levelManager.update(delta);

    // Update combo timer
    if (this.comboTimer > 0) {
      this.comboTimer -= delta;
      if (this.comboTimer <= 0) {
        this.comboCount = 0;
        this.uiManager.hideCombo();
      }
    }

    // Update UI
    this.uiManager.update();

    // Check for level completion
    if (this.levelManager.isLevelComplete()) {
      this.levelComplete();
    }
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public getGameState(): GameState {
    return this.gameState;
  }

  public setGameState(state: GameState): void {
    this.gameState = state;
  }

  public addScore(points: number): void {
    // Apply combo multiplier
    this.comboCount = Math.min(this.maxCombo, this.comboCount + 1);
    this.comboTimer = this.comboDuration;

    const multiplier = 1 + (this.comboCount - 1) * 0.2; // 1x, 1.2x, 1.4x... up to 2.8x
    const finalPoints = Math.round(points * multiplier);

    this.stats.score += finalPoints;
    this.stats.kills++;
    this.uiManager.updateScore(this.stats.score);

    // Give coins in endless/zombie mode (Level 3)
    if (this.levelManager.getCurrentLevel() === 3) {
      this.addCoins(10);
    }

    // Show combo if above 1
    if (this.comboCount > 1) {
      this.uiManager.showCombo(this.comboCount, multiplier);
    }
  }

  public addCoins(amount: number): void {
    this.coins += amount;
    this.uiManager.updateCoins(this.coins);
  }

  public spendCoins(amount: number): boolean {
    if (this.coins >= amount) {
      this.coins -= amount;
      this.uiManager.updateCoins(this.coins);
      return true;
    }
    return false;
  }

  public getCoins(): number {
    return this.coins;
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private updateLoadingProgress(percent: number, text: string): void {
    const loadingBar = document.getElementById('loading-bar');
    const loadingText = document.getElementById('loading-text');

    if (loadingBar) {
      loadingBar.style.width = `${percent}%`;
    }
    if (loadingText) {
      loadingText.textContent = text;
    }
  }

  private hideLoadingScreen(): void {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.classList.add('hidden');
    }
  }

  private showClickToPlay(): void {
    console.log('showClickToPlay() called');
    const clickToPlay = document.getElementById('click-to-play');
    const skipBtn = document.getElementById('skip-tutorial-btn');

    if (clickToPlay) {
      clickToPlay.classList.add('visible');

      const handleStart = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Click-to-play activated!');
        clickToPlay.classList.remove('visible');
        clickToPlay.removeEventListener('click', handleStart);
        clickToPlay.removeEventListener('touchstart', handleStart);

        // Small delay to ensure the overlay is hidden before starting
        requestAnimationFrame(() => {
          this.start();
        });
      };

      const handleSkipToZombie = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Skip to Zombie Mode activated!');
        clickToPlay.classList.remove('visible');

        // Skip directly to Level 3
        requestAnimationFrame(() => {
          this.startFromLevel(3);
        });
      };

      clickToPlay.addEventListener('click', handleStart);
      clickToPlay.addEventListener('touchstart', handleStart, { passive: false });

      if (skipBtn) {
        skipBtn.addEventListener('click', handleSkipToZombie);
        skipBtn.addEventListener('touchstart', handleSkipToZombie, { passive: false });
      }
    } else {
      console.error('click-to-play element not found!');
    }
    this.setGameState(GameState.MAIN_MENU);
    console.log('Game state set to MAIN_MENU');
  }

  private startFromLevel(level: number): void {
    console.log(`Starting from Level ${level}...`);
    this.setGameState(GameState.PLAYING);

    // Set current level in stats
    this.stats.currentLevel = level;

    // Load level first to get spawn point
    this.levelManager.loadLevel(level);
    const spawnPoint = this.levelManager.getPlayerSpawn();

    // Reset or create player
    if (!this.player) {
      this.player = new Player(this, spawnPoint);
    } else {
      this.player.reset(spawnPoint);
    }

    // Configure zombie mode for Level 3 (MUST be after player is ready)
    if (level === 3 && this.player) {
      this.player.weaponSystem.configureZombieMode();
      this.uiManager.showCoins(true);
    }

    // Request pointer lock or show touch controls
    if (this.inputManager.isMobileDevice()) {
      this.inputManager.showTouchControls();
      this.inputManager.requestFullscreen();
    } else {
      this.inputManager.lockPointer();
    }

    // Reset coins
    this.coins = 0;
    this.uiManager.updateCoins(0);

    // Play music
    this.audioManager.playMusic('ambient');

    // Start game loop
    this.gameLoop.start();
  }

  public dispose(): void {
    this.gameLoop.stop();
    this.inputManager.dispose();
    this.audioManager.dispose();
    this.levelManager.dispose();
    if (this.player) {
      this.player.dispose();
    }
    this.renderer.dispose();
  }
}
