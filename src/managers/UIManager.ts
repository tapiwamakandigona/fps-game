import { Game } from '../core/Game';

export class UIManager {
  private game: Game;
  private hudContainer: HTMLElement | null = null;
  private healthBar: HTMLElement | null = null;
  private healthText: HTMLElement | null = null;
  private ammoText: HTMLElement | null = null;
  private scoreText: HTMLElement | null = null;
  private crosshair: HTMLElement | null = null;
  private damageOverlay: HTMLElement | null = null;
  private bossHealthContainer: HTMLElement | null = null;
  private bossHealthBar: HTMLElement | null = null;
  private weaponNameText: HTMLElement | null = null;
  private reserveAmmoText: HTMLElement | null = null;
  private waveText: HTMLElement | null = null;
  private comboText: HTMLElement | null = null;
  private coinsText: HTMLElement | null = null;
  private interactPrompt: HTMLElement | null = null;
  private weaponTimerText: HTMLElement | null = null;

  constructor(game: Game) {
    this.game = game;
  }

  public init(): void {
    this.createHUD();
    this.createDamageOverlay();
    this.createBossHealthBar();
    this.setupMenuButtons();
  }

  private createHUD(): void {
    // Create HUD container
    this.hudContainer = document.createElement('div');
    this.hudContainer.id = 'hud';
    this.hudContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 100;
      font-family: 'Arial', sans-serif;
    `;
    document.body.appendChild(this.hudContainer);

    // Create crosshair
    this.crosshair = document.createElement('div');
    this.crosshair.id = 'crosshair';
    this.crosshair.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 20px;
      height: 20px;
    `;
    this.crosshair.innerHTML = `
      <svg viewBox="0 0 20 20" style="width: 100%; height: 100%;">
        <line x1="10" y1="0" x2="10" y2="8" stroke="#fff" stroke-width="2"/>
        <line x1="10" y1="12" x2="10" y2="20" stroke="#fff" stroke-width="2"/>
        <line x1="0" y1="10" x2="8" y2="10" stroke="#fff" stroke-width="2"/>
        <line x1="12" y1="10" x2="20" y2="10" stroke="#fff" stroke-width="2"/>
        <circle cx="10" cy="10" r="2" fill="#fff"/>
      </svg>
    `;
    this.hudContainer.appendChild(this.crosshair);

    // Create score display (top left)
    this.scoreText = document.createElement('div');
    this.scoreText.id = 'score';
    this.scoreText.style.cssText = `
      position: absolute;
      top: 20px;
      left: 20px;
      color: #fff;
      font-size: 24px;
      font-weight: bold;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
    `;
    this.scoreText.textContent = 'SCORE: 0';
    this.hudContainer.appendChild(this.scoreText);

    // Create health bar container (bottom left)
    const healthContainer = document.createElement('div');
    healthContainer.style.cssText = `
      position: absolute;
      bottom: 30px;
      left: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    `;

    // Health bar background
    const healthBarBg = document.createElement('div');
    healthBarBg.style.cssText = `
      width: 200px;
      height: 20px;
      background: rgba(0,0,0,0.5);
      border: 2px solid #fff;
      border-radius: 4px;
      overflow: hidden;
    `;

    // Health bar fill
    this.healthBar = document.createElement('div');
    this.healthBar.id = 'health-bar';
    this.healthBar.style.cssText = `
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, #e74c3c 0%, #2ecc71 100%);
      transition: width 0.2s ease;
    `;
    healthBarBg.appendChild(this.healthBar);

    // Health text
    this.healthText = document.createElement('div');
    this.healthText.id = 'health-text';
    this.healthText.style.cssText = `
      color: #fff;
      font-size: 18px;
      font-weight: bold;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
      min-width: 80px;
    `;
    this.healthText.textContent = '100/100 HP';

    healthContainer.appendChild(healthBarBg);
    healthContainer.appendChild(this.healthText);
    this.hudContainer.appendChild(healthContainer);

    // Create ammo display (bottom right)
    const ammoContainer = document.createElement('div');
    ammoContainer.style.cssText = `
      position: absolute;
      bottom: 30px;
      right: 20px;
      text-align: right;
    `;

    this.weaponNameText = document.createElement('div');
    this.weaponNameText.id = 'weapon-name';
    this.weaponNameText.style.cssText = `
      color: #4A90D9;
      font-size: 14px;
      font-weight: bold;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
      margin-bottom: 5px;
    `;
    this.weaponNameText.textContent = 'PISTOL';
    ammoContainer.appendChild(this.weaponNameText);

    this.ammoText = document.createElement('div');
    this.ammoText.id = 'ammo';
    this.ammoText.style.cssText = `
      color: #fff;
      font-size: 24px;
      font-weight: bold;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
    `;
    this.ammoText.innerHTML = '12/12 <span style="color: #4A90D9;">[R]</span>';
    ammoContainer.appendChild(this.ammoText);

    this.reserveAmmoText = document.createElement('div');
    this.reserveAmmoText.id = 'reserve-ammo';
    this.reserveAmmoText.style.cssText = `
      color: #888;
      font-size: 14px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
      margin-top: 5px;
    `;
    this.reserveAmmoText.textContent = 'Reserve: ∞';
    ammoContainer.appendChild(this.reserveAmmoText);

    // Create weapon timer display (for mystery box weapons)
    this.weaponTimerText = document.createElement('div');
    this.weaponTimerText.id = 'weapon-timer';
    this.weaponTimerText.style.cssText = `
      color: #FFD700;
      font-size: 16px;
      font-weight: bold;
      text-shadow: 0 0 10px rgba(255, 215, 0, 0.8), 2px 2px 4px rgba(0,0,0,0.8);
      margin-top: 8px;
      padding: 5px 10px;
      background: rgba(139, 0, 0, 0.6);
      border: 1px solid #FFD700;
      border-radius: 5px;
      display: none;
    `;
    ammoContainer.appendChild(this.weaponTimerText);

    this.hudContainer.appendChild(ammoContainer);

    // Create wave display (top center, for endless mode)
    this.waveText = document.createElement('div');
    this.waveText.id = 'wave-text';
    this.waveText.style.cssText = `
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      color: #e74c3c;
      font-size: 28px;
      font-weight: bold;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
      display: none;
      font-family: 'Arial Black', sans-serif;
    `;
    this.waveText.textContent = 'WAVE 1';
    this.hudContainer.appendChild(this.waveText);

    // Create combo display (center-right)
    this.comboText = document.createElement('div');
    this.comboText.id = 'combo-text';
    this.comboText.style.cssText = `
      position: absolute;
      top: 50%;
      right: 40px;
      transform: translateY(-50%);
      font-family: 'Arial Black', sans-serif;
      font-size: 36px;
      color: #ff6600;
      text-shadow: 0 0 15px rgba(255, 100, 0, 0.8), 2px 2px 4px rgba(0,0,0,0.8);
      display: none;
      text-align: right;
    `;
    this.hudContainer.appendChild(this.comboText);

    // Create coins display (for zombie mode)
    this.coinsText = document.createElement('div');
    this.coinsText.id = 'coins-text';
    this.coinsText.style.cssText = `
      position: absolute;
      top: 140px;
      left: 20px;
      font-family: 'Arial Black', sans-serif;
      font-size: 24px;
      color: #FFD700;
      text-shadow: 0 0 10px rgba(255, 215, 0, 0.6), 2px 2px 4px rgba(0,0,0,0.8);
      display: none;
    `;
    this.coinsText.textContent = '🪙 0';
    this.hudContainer.appendChild(this.coinsText);

    // Create interact prompt (for mystery box, etc.)
    this.interactPrompt = document.createElement('div');
    this.interactPrompt.id = 'interact-prompt';
    this.interactPrompt.style.cssText = `
      position: absolute;
      bottom: 120px;
      left: 50%;
      transform: translateX(-50%);
      font-family: 'Arial Black', sans-serif;
      font-size: 18px;
      color: #ffffff;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
      padding: 10px 20px;
      background: rgba(0, 0, 0, 0.6);
      border: 2px solid #FFD700;
      border-radius: 8px;
      display: none;
      text-align: center;
    `;
    this.hudContainer.appendChild(this.interactPrompt);
  }

  private createDamageOverlay(): void {
    this.damageOverlay = document.createElement('div');
    this.damageOverlay.id = 'damage-overlay';
    this.damageOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: radial-gradient(ellipse at center, transparent 0%, rgba(231,76,60,0) 50%, rgba(231,76,60,0.5) 100%);
      pointer-events: none;
      z-index: 99;
      opacity: 0;
      transition: opacity 0.1s ease;
    `;
    document.body.appendChild(this.damageOverlay);
  }

  private createBossHealthBar(): void {
    this.bossHealthContainer = document.createElement('div');
    this.bossHealthContainer.id = 'boss-health';
    this.bossHealthContainer.style.cssText = `
      position: fixed;
      top: 50px;
      left: 50%;
      transform: translateX(-50%);
      width: 400px;
      display: none;
      flex-direction: column;
      align-items: center;
      z-index: 100;
    `;

    const bossName = document.createElement('div');
    bossName.style.cssText = `
      color: #e74c3c;
      font-size: 24px;
      font-weight: bold;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
      margin-bottom: 10px;
      font-family: 'Arial Black', sans-serif;
    `;
    bossName.textContent = 'THE GUARDIAN';

    const bossBarBg = document.createElement('div');
    bossBarBg.style.cssText = `
      width: 100%;
      height: 25px;
      background: rgba(0,0,0,0.7);
      border: 2px solid #e74c3c;
      border-radius: 4px;
      overflow: hidden;
    `;

    this.bossHealthBar = document.createElement('div');
    this.bossHealthBar.style.cssText = `
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, #c0392b 0%, #e74c3c 100%);
      transition: width 0.3s ease;
    `;

    bossBarBg.appendChild(this.bossHealthBar);
    this.bossHealthContainer.appendChild(bossName);
    this.bossHealthContainer.appendChild(bossBarBg);
    document.body.appendChild(this.bossHealthContainer);
  }

  private setupMenuButtons(): void {
    // Resume button
    const resumeBtn = document.getElementById('resume-btn');
    if (resumeBtn) {
      resumeBtn.addEventListener('click', () => {
        this.game.resume();
      });
    }

    // Restart button
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        this.hidePauseMenu();
        this.game.restart();
      });
    }

    // Main menu button
    const mainMenuBtn = document.getElementById('main-menu-btn');
    if (mainMenuBtn) {
      mainMenuBtn.addEventListener('click', () => {
        this.hidePauseMenu();
        this.game.mainMenu();
      });
    }
  }

  public update(): void {
    // Update is called from game loop, but most updates are event-driven
  }

  public updateHealth(current: number, max: number): void {
    const percent = (current / max) * 100;

    if (this.healthBar) {
      this.healthBar.style.width = `${percent}%`;

      // Change color based on health
      if (percent > 60) {
        this.healthBar.style.background = 'linear-gradient(90deg, #27ae60 0%, #2ecc71 100%)';
      } else if (percent > 30) {
        this.healthBar.style.background = 'linear-gradient(90deg, #f39c12 0%, #f1c40f 100%)';
      } else {
        this.healthBar.style.background = 'linear-gradient(90deg, #c0392b 0%, #e74c3c 100%)';
      }
    }

    if (this.healthText) {
      this.healthText.textContent = `${Math.ceil(current)}/${max} HP`;
    }
  }

  public updateAmmo(current: number, max: number, isReloading: boolean = false): void {
    if (this.ammoText) {
      if (isReloading) {
        this.ammoText.innerHTML = '<span style="color: #f1c40f;">RELOADING...</span>';
      } else {
        const color = current === 0 ? '#e74c3c' : '#fff';
        this.ammoText.innerHTML = `<span style="color: ${color};">${current}/${max}</span> <span style="color: #4A90D9;">[R]</span>`;
      }
    }
  }

  public updateScore(score: number): void {
    if (this.scoreText) {
      this.scoreText.textContent = `SCORE: ${score}`;
    }
  }

  public updateWeaponName(name: string): void {
    if (this.weaponNameText) {
      this.weaponNameText.textContent = name.toUpperCase();
    }
  }

  public updateReserveAmmo(reserve: number): void {
    if (this.reserveAmmoText) {
      if (reserve === Infinity) {
        this.reserveAmmoText.textContent = 'Reserve: ∞';
      } else {
        this.reserveAmmoText.textContent = `Reserve: ${reserve}`;
      }
    }
  }

  public updateWave(wave: number, showWave: boolean = true): void {
    if (this.waveText) {
      this.waveText.style.display = showWave ? 'block' : 'none';
      this.waveText.textContent = `WAVE ${wave}`;

      // Pulse animation on new wave
      this.waveText.style.animation = 'none';
      setTimeout(() => {
        if (this.waveText) {
          this.waveText.style.animation = 'wavePulse 0.5s ease-out';
        }
      }, 10);
    }
  }

  public showCombo(combo: number, multiplier: number): void {
    if (this.comboText) {
      this.comboText.style.display = 'block';
      this.comboText.innerHTML = `${combo}x COMBO!<br><span style="font-size: 20px; color: #ffaa00;">×${multiplier.toFixed(1)}</span>`;

      // Color based on combo size
      if (combo >= 8) {
        this.comboText.style.color = '#ff0000';
        this.comboText.style.textShadow = '0 0 20px rgba(255, 0, 0, 0.9), 0 0 40px rgba(255, 100, 0, 0.5)';
      } else if (combo >= 5) {
        this.comboText.style.color = '#ff6600';
        this.comboText.style.textShadow = '0 0 15px rgba(255, 100, 0, 0.8)';
      } else {
        this.comboText.style.color = '#ffaa00';
        this.comboText.style.textShadow = '0 0 10px rgba(255, 170, 0, 0.6)';
      }

      // Scale animation
      this.comboText.style.transform = 'translateY(-50%) scale(1.2)';
      setTimeout(() => {
        if (this.comboText) {
          this.comboText.style.transform = 'translateY(-50%) scale(1)';
        }
      }, 100);
    }
  }

  public hideCombo(): void {
    if (this.comboText) {
      this.comboText.style.display = 'none';
    }
  }

  public updateCoins(coins: number): void {
    if (this.coinsText) {
      this.coinsText.textContent = `🪙 ${coins}`;
      this.coinsText.style.display = 'block';

      // Pulse animation on coin update
      this.coinsText.style.transform = 'scale(1.2)';
      setTimeout(() => {
        if (this.coinsText) {
          this.coinsText.style.transform = 'scale(1)';
        }
      }, 100);
    }
  }

  public showCoins(show: boolean): void {
    if (this.coinsText) {
      this.coinsText.style.display = show ? 'block' : 'none';
    }
  }

  public showInteractPrompt(text: string, canAfford: boolean): void {
    if (this.interactPrompt) {
      this.interactPrompt.textContent = text;
      this.interactPrompt.style.display = 'block';
      this.interactPrompt.style.borderColor = canAfford ? '#FFD700' : '#ff4444';
      this.interactPrompt.style.color = canAfford ? '#ffffff' : '#ff8888';
    }
  }

  public hideInteractPrompt(): void {
    if (this.interactPrompt) {
      this.interactPrompt.style.display = 'none';
    }
  }

  public updateWeaponTimer(timeLeft: number, weaponName: string): void {
    if (!this.weaponTimerText) return;

    if (timeLeft > 0) {
      this.weaponTimerText.style.display = 'block';
      const seconds = Math.ceil(timeLeft);
      this.weaponTimerText.textContent = `⏱️ ${weaponName}: ${seconds}s`;

      // Change color based on time remaining
      if (seconds <= 5) {
        this.weaponTimerText.style.color = '#ff4444';
        this.weaponTimerText.style.borderColor = '#ff4444';
        this.weaponTimerText.style.background = 'rgba(139, 0, 0, 0.8)';
        this.weaponTimerText.style.animation = 'pulse 0.5s ease-in-out infinite';
      } else if (seconds <= 10) {
        this.weaponTimerText.style.color = '#FFA500';
        this.weaponTimerText.style.borderColor = '#FFA500';
        this.weaponTimerText.style.background = 'rgba(139, 69, 0, 0.6)';
        this.weaponTimerText.style.animation = 'none';
      } else {
        this.weaponTimerText.style.color = '#FFD700';
        this.weaponTimerText.style.borderColor = '#FFD700';
        this.weaponTimerText.style.background = 'rgba(139, 0, 0, 0.6)';
        this.weaponTimerText.style.animation = 'none';
      }
    } else {
      this.weaponTimerText.style.display = 'none';
    }
  }

  public hideWeaponTimer(): void {
    if (this.weaponTimerText) {
      this.weaponTimerText.style.display = 'none';
    }
  }

  public showWaveAnnouncement(wave: number): void {
    const announcement = document.createElement('div');
    announcement.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-family: 'Arial Black', sans-serif;
      font-size: 64px;
      color: #e74c3c;
      text-shadow: 0 0 30px rgba(231, 76, 60, 0.8);
      z-index: 700;
      animation: waveAnnounce 2s ease-out forwards;
      pointer-events: none;
    `;
    announcement.textContent = `WAVE ${wave}`;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes waveAnnounce {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(2); }
        20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        80% { opacity: 1; }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
      }
      @keyframes wavePulse {
        0% { transform: translateX(-50%) scale(1); }
        50% { transform: translateX(-50%) scale(1.2); color: #ff6b6b; }
        100% { transform: translateX(-50%) scale(1); }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(announcement);

    setTimeout(() => {
      announcement.remove();
      style.remove();
    }, 2000);
  }

  public showDamageEffect(): void {
    if (this.damageOverlay) {
      this.damageOverlay.style.opacity = '1';
      setTimeout(() => {
        if (this.damageOverlay) {
          this.damageOverlay.style.opacity = '0';
        }
      }, 150);
    }
  }

  public showBossHealth(show: boolean): void {
    if (this.bossHealthContainer) {
      this.bossHealthContainer.style.display = show ? 'flex' : 'none';
    }
  }

  public updateBossHealth(percent: number): void {
    if (this.bossHealthBar) {
      this.bossHealthBar.style.width = `${percent}%`;
    }
  }

  public showPauseMenu(): void {
    const pauseMenu = document.getElementById('pause-menu');
    if (pauseMenu) {
      pauseMenu.classList.add('visible');
    }
  }

  public hidePauseMenu(): void {
    const pauseMenu = document.getElementById('pause-menu');
    if (pauseMenu) {
      pauseMenu.classList.remove('visible');
    }
  }

  public showMainMenu(): void {
    const clickToPlay = document.getElementById('click-to-play');
    if (clickToPlay) {
      clickToPlay.classList.add('visible');
    }
  }

  public showGameOver(): void {
    this.showEndScreen('GAME OVER', '#e74c3c');
  }

  public showVictory(): void {
    this.showEndScreen('VICTORY!', '#2ecc71');
  }

  public showLevelComplete(level: number): void {
    // Create a temporary level complete notification
    const notification = document.createElement('div');
    notification.id = 'level-complete-notification';
    notification.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-family: 'Arial Black', sans-serif;
      font-size: 48px;
      color: #2ecc71;
      text-shadow: 0 0 20px rgba(46, 204, 113, 0.5);
      z-index: 700;
      animation: levelComplete 2s ease-out forwards;
      pointer-events: none;
    `;
    notification.textContent = `LEVEL ${level} COMPLETE!`;

    // Add animation keyframes
    const style = document.createElement('style');
    style.textContent = `
      @keyframes levelComplete {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
        20% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
        40% { transform: translate(-50%, -50%) scale(1); }
        80% { opacity: 1; }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(1); }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(notification);

    // Remove after animation
    setTimeout(() => {
      notification.remove();
      style.remove();
    }, 2000);
  }

  private showEndScreen(title: string, color: string): void {
    const endScreen = document.createElement('div');
    endScreen.id = 'end-screen';
    endScreen.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 700;
    `;

    const titleEl = document.createElement('div');
    titleEl.style.cssText = `
      font-family: 'Arial Black', sans-serif;
      font-size: 64px;
      color: ${color};
      text-shadow: 0 0 20px ${color};
      margin-bottom: 20px;
    `;
    titleEl.textContent = title;

    const scoreEl = document.createElement('div');
    scoreEl.style.cssText = `
      font-family: 'Arial', sans-serif;
      font-size: 32px;
      color: #fff;
      margin-bottom: 40px;
    `;
    scoreEl.textContent = `Final Score: ${this.game.stats.score}`;

    const restartBtn = document.createElement('button');
    restartBtn.className = 'menu-button';
    restartBtn.textContent = 'Play Again';
    restartBtn.style.cssText = `
      font-family: 'Arial', sans-serif;
      font-size: 24px;
      color: #ECF0F1;
      background: #2C3E50;
      border: none;
      padding: 15px 40px;
      margin: 10px;
      cursor: pointer;
      border-radius: 5px;
      pointer-events: auto;
    `;
    restartBtn.addEventListener('click', () => {
      endScreen.remove();
      this.game.restart();
    });

    endScreen.appendChild(titleEl);
    endScreen.appendChild(scoreEl);
    endScreen.appendChild(restartBtn);
    document.body.appendChild(endScreen);
  }

  public hideAllMenus(): void {
    this.hidePauseMenu();

    const clickToPlay = document.getElementById('click-to-play');
    if (clickToPlay) {
      clickToPlay.classList.remove('visible');
    }

    const endScreen = document.getElementById('end-screen');
    if (endScreen) {
      endScreen.remove();
    }
  }

  public showHUD(): void {
    if (this.hudContainer) {
      this.hudContainer.style.display = 'block';
    }
  }

  public hideHUD(): void {
    if (this.hudContainer) {
      this.hudContainer.style.display = 'none';
    }
  }

  public dispose(): void {
    if (this.hudContainer) {
      this.hudContainer.remove();
    }
    if (this.damageOverlay) {
      this.damageOverlay.remove();
    }
    if (this.bossHealthContainer) {
      this.bossHealthContainer.remove();
    }
  }
}
