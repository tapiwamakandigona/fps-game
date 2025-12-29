import { Game } from '../core/Game';
import { InputState, GameState } from '../types';

export class InputManager {
  private game: Game;
  private keys: Set<string> = new Set();
  private keysJustPressed: Set<string> = new Set(); // Keys pressed this frame
  private keysProcessed: Set<string> = new Set(); // Prevent repeated triggers
  private mouseButtons: Set<number> = new Set();
  private mouseDelta: { x: number; y: number } = { x: 0, y: 0 };
  private isPointerLocked: boolean = false;

  // Mobile touch controls
  private isMobile: boolean = false;
  private touchControls: HTMLElement | null = null;
  private joystickOuter: HTMLElement | null = null;
  private joystickInner: HTMLElement | null = null;
  private joystickActive: boolean = false;
  private joystickTouchId: number | null = null;
  private joystickStartPos: { x: number; y: number } = { x: 0, y: 0 };
  private joystickCurrentPos: { x: number; y: number } = { x: 0, y: 0 };
  private touchLookStartPos: { x: number; y: number } = { x: 0, y: 0 };
  private touchLookActive: boolean = false;
  private touchLookTouchId: number | null = null;
  private touchShootActive: boolean = false;
  private touchShootTouchId: number | null = null;
  private touchShootStartPos: { x: number; y: number } = { x: 0, y: 0 };
  private touchReloadActive: boolean = false;
  private touchInteractActive: boolean = false;
  private touchAimActive: boolean = false;
  private touchMeleeActive: boolean = false;
  private currentWeaponIndex: number = 1; // Track current weapon for cycling (1-4)

  // Input state for this frame
  private currentInput: InputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    shoot: false,
    reload: false,
    pause: false,
    jump: false,
    aim: false,
    melee: false,
    weapon1: false,
    weapon2: false,
    weapon3: false,
    weapon4: false,
    weapon5: false,
    mouseMovement: { x: 0, y: 0 }
  };

  // Mobile jump button state
  private touchJumpActive: boolean = false;

  constructor(game: Game) {
    this.game = game;
    this.isMobile = this.detectMobile();
    this.setupEventListeners();

    if (this.isMobile) {
      this.createTouchControls();
      this.requestLandscapeOrientation();
    }
  }

  private detectMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      ('ontouchstart' in window) ||
      (navigator.maxTouchPoints > 0);
  }

  private requestLandscapeOrientation(): void {
    // Try to lock to landscape orientation on mobile
    const orientation = screen.orientation as ScreenOrientation & { lock?: (orientation: string) => Promise<void> };
    if (orientation && typeof orientation.lock === 'function') {
      orientation.lock('landscape').catch(() => {
        // Orientation lock not supported or denied - that's okay
        console.log('Landscape orientation lock not available');
      });
    }
  }

  public requestFullscreen(): void {
    const elem = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void>;
      msRequestFullscreen?: () => void;
    };

    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => console.log('Fullscreen not available'));
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
      elem.msRequestFullscreen();
    }

    // Also request landscape after fullscreen
    setTimeout(() => this.requestLandscapeOrientation(), 100);
  }

  private setupEventListeners(): void {
    // Keyboard events
    document.addEventListener('keydown', this.onKeyDown.bind(this));
    document.addEventListener('keyup', this.onKeyUp.bind(this));

    // Mouse events
    document.addEventListener('mousedown', this.onMouseDown.bind(this));
    document.addEventListener('mouseup', this.onMouseUp.bind(this));
    document.addEventListener('mousemove', this.onMouseMove.bind(this));

    // Pointer lock events
    document.addEventListener('pointerlockchange', this.onPointerLockChange.bind(this));
    document.addEventListener('pointerlockerror', this.onPointerLockError.bind(this));

    // Prevent context menu
    document.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private onKeyDown(event: KeyboardEvent): void {
    // Track just pressed (only add if not already held)
    if (!this.keys.has(event.code) && !this.keysProcessed.has(event.code)) {
      this.keysJustPressed.add(event.code);
      this.keysProcessed.add(event.code);
    }

    this.keys.add(event.code);

    // Handle pause on Escape
    if (event.code === 'Escape') {
      if (this.game.getGameState() === GameState.PLAYING) {
        this.game.pause();
      } else if (this.game.getGameState() === GameState.PAUSED) {
        this.game.resume();
      }
    }

    // Prevent default for game keys
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyR', 'KeyE', 'Space', 'KeyV', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].includes(event.code)) {
      event.preventDefault();
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    this.keys.delete(event.code);
    this.keysProcessed.delete(event.code);
  }

  private onMouseDown(event: MouseEvent): void {
    this.mouseButtons.add(event.button);

    // Don't auto-lock pointer here - let the click-to-play handler manage this
    // The game.start() method will call lockPointer() when appropriate
  }

  private onMouseUp(event: MouseEvent): void {
    this.mouseButtons.delete(event.button);
  }

  private onMouseMove(event: MouseEvent): void {
    if (this.isPointerLocked) {
      this.mouseDelta.x += event.movementX;
      this.mouseDelta.y += event.movementY;
    }
  }

  private onPointerLockChange(): void {
    this.isPointerLocked = document.pointerLockElement === this.game.renderer.domElement;

    if (!this.isPointerLocked && this.game.getGameState() === GameState.PLAYING) {
      this.game.pause();
    }
  }

  private onPointerLockError(): void {
    console.error('Pointer lock error');
  }

  public lockPointer(): void {
    this.game.renderer.domElement.requestPointerLock();
  }

  public unlockPointer(): void {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }

  public getInput(): InputState {
    // Update input state from keyboard
    this.currentInput.forward = this.keys.has('KeyW') || this.keys.has('ArrowUp');
    this.currentInput.backward = this.keys.has('KeyS') || this.keys.has('ArrowDown');
    this.currentInput.left = this.keys.has('KeyA') || this.keys.has('ArrowLeft');
    this.currentInput.right = this.keys.has('KeyD') || this.keys.has('ArrowRight');
    this.currentInput.shoot = this.mouseButtons.has(0); // Left click
    this.currentInput.aim = this.mouseButtons.has(2); // Right click
    this.currentInput.reload = this.keys.has('KeyR');
    this.currentInput.pause = this.keys.has('Escape');
    this.currentInput.jump = this.keys.has('Space');
    this.currentInput.melee = this.keys.has('KeyV');

    // Weapon switching (1-5)
    this.currentInput.weapon1 = this.keys.has('Digit1');
    this.currentInput.weapon2 = this.keys.has('Digit2');
    this.currentInput.weapon3 = this.keys.has('Digit3');
    this.currentInput.weapon4 = this.keys.has('Digit4');
    this.currentInput.weapon5 = this.keys.has('Digit5');

    // Add touch joystick input
    if (this.isMobile && this.joystickActive) {
      // Joystick Y is inverted (up is negative)
      if (this.joystickCurrentPos.y < -0.3) this.currentInput.forward = true;
      if (this.joystickCurrentPos.y > 0.3) this.currentInput.backward = true;
      if (this.joystickCurrentPos.x < -0.3) this.currentInput.left = true;
      if (this.joystickCurrentPos.x > 0.3) this.currentInput.right = true;
    }

    // Add touch shoot input
    if (this.touchShootActive) {
      this.currentInput.shoot = true;
    }

    // Add touch reload input
    if (this.touchReloadActive) {
      this.currentInput.reload = true;
    }

    // Add touch jump input
    if (this.touchJumpActive) {
      this.currentInput.jump = true;
    }

    // Add touch aim input (toggle)
    if (this.touchAimActive) {
      this.currentInput.aim = true;
    }

    // Add touch melee input
    if (this.touchMeleeActive) {
      this.currentInput.melee = true;
    }

    // Get mouse movement and reset delta
    this.currentInput.mouseMovement = { ...this.mouseDelta };
    this.mouseDelta = { x: 0, y: 0 };

    return this.currentInput;
  }

  public isKeyPressed(code: string): boolean {
    return this.keys.has(code);
  }

  public isKeyJustPressed(code: string): boolean {
    // Check and consume the key (only returns true once per press)
    if (this.keysJustPressed.has(code)) {
      this.keysJustPressed.delete(code);
      return true;
    }
    return false;
  }

  public isMouseButtonPressed(button: number): boolean {
    return this.mouseButtons.has(button);
  }

  public getMouseDelta(): { x: number; y: number } {
    return { ...this.mouseDelta };
  }

  public isLocked(): boolean {
    return this.isPointerLocked || this.isMobile;
  }

  public isMobileDevice(): boolean {
    return this.isMobile;
  }

  private createTouchControls(): void {
    // Create touch controls container
    this.touchControls = document.createElement('div');
    this.touchControls.id = 'touch-controls';
    this.touchControls.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 200;
      display: none;
    `;
    document.body.appendChild(this.touchControls);

    // Create look area FIRST (so it's behind buttons in DOM order)
    // This covers the right side of the screen for looking around
    const lookArea = document.createElement('div');
    lookArea.id = 'look-area';
    lookArea.style.cssText = `
      position: absolute;
      top: 0;
      right: 0;
      width: 60%;
      height: 100%;
      pointer-events: auto;
      z-index: 1;
    `;
    this.touchControls.appendChild(lookArea);

    // Create joystick (left side for movement) - PUBG/COD style position
    const joystickContainer = document.createElement('div');
    joystickContainer.style.cssText = `
      position: absolute;
      bottom: 20px;
      left: 20px;
      width: 130px;
      height: 130px;
      pointer-events: auto;
      z-index: 10;
    `;

    this.joystickOuter = document.createElement('div');
    this.joystickOuter.style.cssText = `
      width: 130px;
      height: 130px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.15);
      border: 3px solid rgba(255, 255, 255, 0.3);
      position: relative;
    `;

    this.joystickInner = document.createElement('div');
    this.joystickInner.style.cssText = `
      width: 55px;
      height: 55px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.5);
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    `;

    this.joystickOuter.appendChild(this.joystickInner);
    joystickContainer.appendChild(this.joystickOuter);
    this.touchControls.appendChild(joystickContainer);

    // Create shoot button (right side) - Large for easy thumb access, also handles aim while shooting
    const shootButton = document.createElement('div');
    shootButton.id = 'shoot-button';
    shootButton.style.cssText = `
      position: absolute;
      bottom: 20px;
      right: 20px;
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: rgba(231, 76, 60, 0.5);
      border: 4px solid rgba(231, 76, 60, 0.8);
      pointer-events: auto;
      display: flex;
      justify-content: center;
      align-items: center;
      font-family: Arial, sans-serif;
      font-size: 16px;
      font-weight: bold;
      color: white;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
      z-index: 10;
    `;
    shootButton.textContent = 'FIRE';
    this.touchControls.appendChild(shootButton);

    // Create reload button - Above fire button on right
    const reloadButton = document.createElement('div');
    reloadButton.id = 'reload-button';
    reloadButton.style.cssText = `
      position: absolute;
      bottom: 140px;
      right: 25px;
      width: 55px;
      height: 55px;
      border-radius: 50%;
      background: rgba(52, 152, 219, 0.5);
      border: 3px solid rgba(52, 152, 219, 0.8);
      pointer-events: auto;
      display: flex;
      justify-content: center;
      align-items: center;
      font-family: Arial, sans-serif;
      font-size: 12px;
      font-weight: bold;
      color: white;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
      z-index: 10;
    `;
    reloadButton.textContent = 'R';
    this.touchControls.appendChild(reloadButton);

    // Create jump button (above joystick on left)
    const jumpButton = document.createElement('div');
    jumpButton.id = 'jump-button';
    jumpButton.style.cssText = `
      position: absolute;
      bottom: 170px;
      left: 25px;
      width: 55px;
      height: 55px;
      border-radius: 50%;
      background: rgba(46, 204, 113, 0.5);
      border: 3px solid rgba(46, 204, 113, 0.8);
      pointer-events: auto;
      display: flex;
      justify-content: center;
      align-items: center;
      font-family: Arial, sans-serif;
      font-size: 11px;
      font-weight: bold;
      color: white;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
      z-index: 10;
    `;
    jumpButton.textContent = 'JUMP';
    this.touchControls.appendChild(jumpButton);

    // Create interact button (E key) - Left side, easily reachable
    const interactButton = document.createElement('div');
    interactButton.id = 'interact-button';
    interactButton.style.cssText = `
      position: absolute;
      bottom: 170px;
      left: 95px;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: rgba(255, 215, 0, 0.5);
      border: 3px solid rgba(255, 215, 0, 0.9);
      pointer-events: auto;
      display: flex;
      justify-content: center;
      align-items: center;
      font-family: Arial, sans-serif;
      font-size: 16px;
      font-weight: bold;
      color: white;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
      z-index: 10;
    `;
    interactButton.textContent = 'E';
    this.touchControls.appendChild(interactButton);

    // Create pause button (top right)
    const pauseButton = document.createElement('div');
    pauseButton.id = 'pause-button';
    pauseButton.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      width: 45px;
      height: 45px;
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.4);
      border: 2px solid rgba(255, 255, 255, 0.4);
      pointer-events: auto;
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 18px;
      color: white;
      z-index: 10;
    `;
    pauseButton.textContent = '⏸️';
    this.touchControls.appendChild(pauseButton);

    // Create weapon switch container (left side above joystick area)
    const weaponSwitchContainer = document.createElement('div');
    weaponSwitchContainer.style.cssText = `
      position: absolute;
      top: 15px;
      left: 15px;
      display: flex;
      gap: 8px;
      pointer-events: auto;
      z-index: 10;
    `;

    // Pistol button (weapon 1)
    const pistolButton = document.createElement('div');
    pistolButton.id = 'pistol-button';
    pistolButton.style.cssText = `
      width: 50px;
      height: 50px;
      border-radius: 8px;
      background: rgba(100, 100, 100, 0.6);
      border: 2px solid rgba(255, 255, 255, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 22px;
      pointer-events: auto;
    `;
    pistolButton.textContent = '🔫';
    weaponSwitchContainer.appendChild(pistolButton);

    // Knife button (melee)
    const knifeButton = document.createElement('div');
    knifeButton.id = 'knife-button';
    knifeButton.style.cssText = `
      width: 50px;
      height: 50px;
      border-radius: 8px;
      background: rgba(192, 57, 43, 0.6);
      border: 2px solid rgba(192, 57, 43, 0.9);
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 22px;
      pointer-events: auto;
    `;
    knifeButton.textContent = '🔪';
    weaponSwitchContainer.appendChild(knifeButton);

    // Fullscreen button
    const fullscreenButton = document.createElement('div');
    fullscreenButton.id = 'fullscreen-button';
    fullscreenButton.style.cssText = `
      width: 50px;
      height: 50px;
      border-radius: 8px;
      background: rgba(52, 73, 94, 0.6);
      border: 2px solid rgba(52, 73, 94, 0.9);
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 18px;
      pointer-events: auto;
    `;
    fullscreenButton.textContent = '⛶';
    weaponSwitchContainer.appendChild(fullscreenButton);

    this.touchControls.appendChild(weaponSwitchContainer);

    // Create fire aim indicator (small joystick that appears when firing)
    const fireAimIndicator = document.createElement('div');
    fireAimIndicator.id = 'fire-aim-indicator';
    fireAimIndicator.style.cssText = `
      position: absolute;
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: rgba(231, 76, 60, 0.3);
      border: 2px solid rgba(231, 76, 60, 0.6);
      pointer-events: none;
      display: none;
      z-index: 15;
    `;

    const fireAimKnob = document.createElement('div');
    fireAimKnob.id = 'fire-aim-knob';
    fireAimKnob.style.cssText = `
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: rgba(231, 76, 60, 0.8);
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    `;
    fireAimIndicator.appendChild(fireAimKnob);
    this.touchControls.appendChild(fireAimIndicator);

    // Make controls responsive to orientation changes
    window.addEventListener('orientationchange', () => {
      if (!this.touchControls) return;
      // After rotation, allow the layout to adapt with new dimensions
      // and keep controls visible in both orientations
      setTimeout(() => {
        if (!this.touchControls) return;
        this.touchControls.style.width = '100%';
        this.touchControls.style.height = '100%';
        // Re-request landscape on orientation change
        this.requestLandscapeOrientation();
      }, 100);
    });

    // Setup touch event listeners with multi-touch support
    this.setupTouchListeners(joystickContainer, shootButton, reloadButton, lookArea, jumpButton, interactButton, pauseButton, knifeButton, pistolButton, fireAimIndicator, fullscreenButton);
  }

  private setupTouchListeners(
    joystickContainer: HTMLElement,
    shootButton: HTMLElement,
    reloadButton: HTMLElement,
    lookArea: HTMLElement,
    jumpButton: HTMLElement,
    interactButton: HTMLElement,
    pauseButton: HTMLElement,
    knifeButton: HTMLElement,
    pistolButton: HTMLElement,
    fireAimIndicator: HTMLElement,
    fullscreenButton: HTMLElement
  ): void {
    // Joystick touch events with touch identifier tracking
    joystickContainer.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const touch = e.changedTouches[0];
      this.joystickTouchId = touch.identifier;
      const rect = joystickContainer.getBoundingClientRect();
      this.joystickStartPos = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
      this.joystickActive = true;
    }, { passive: false });

    joystickContainer.addEventListener('touchmove', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!this.joystickActive || !this.joystickInner || this.joystickTouchId === null) return;

      // Find the touch with our identifier
      let touch: Touch | null = null;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === this.joystickTouchId) {
          touch = e.touches[i];
          break;
        }
      }
      if (!touch) return;

      const deltaX = touch.clientX - this.joystickStartPos.x;
      const deltaY = touch.clientY - this.joystickStartPos.y;

      // Limit joystick movement
      const maxDistance = 35;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const clampedDistance = Math.min(distance, maxDistance);
      const angle = Math.atan2(deltaY, deltaX);

      const clampedX = Math.cos(angle) * clampedDistance;
      const clampedY = Math.sin(angle) * clampedDistance;

      this.joystickCurrentPos = {
        x: clampedX / maxDistance,
        y: clampedY / maxDistance
      };

      // Update joystick visual
      this.joystickInner.style.transform = `translate(calc(-50% + ${clampedX}px), calc(-50% + ${clampedY}px))`;
    }, { passive: false });

    joystickContainer.addEventListener('touchend', (e) => {
      e.stopPropagation();
      // Check if our touch ended
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.joystickTouchId) {
          this.joystickActive = false;
          this.joystickTouchId = null;
          this.joystickCurrentPos = { x: 0, y: 0 };
          if (this.joystickInner) {
            this.joystickInner.style.transform = 'translate(-50%, -50%)';
          }
          break;
        }
      }
    });

    joystickContainer.addEventListener('touchcancel', (e) => {
      e.stopPropagation();
      this.joystickActive = false;
      this.joystickTouchId = null;
      this.joystickCurrentPos = { x: 0, y: 0 };
      if (this.joystickInner) {
        this.joystickInner.style.transform = 'translate(-50%, -50%)';
      }
    });

    // Shoot button events - with drag-to-aim like COD Mobile
    shootButton.addEventListener('touchstart', (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const touch = e.changedTouches[0];
      this.touchShootActive = true;
      this.touchShootTouchId = touch.identifier;
      this.touchShootStartPos = { x: touch.clientX, y: touch.clientY };
      shootButton.style.background = 'rgba(231, 76, 60, 0.9)';

      // Show the fire aim indicator at touch position
      const fireAimKnob = fireAimIndicator.querySelector('#fire-aim-knob') as HTMLElement;
      fireAimIndicator.style.display = 'block';
      fireAimIndicator.style.left = (touch.clientX - 40) + 'px';
      fireAimIndicator.style.top = (touch.clientY - 40) + 'px';
      if (fireAimKnob) {
        fireAimKnob.style.transform = 'translate(-50%, -50%)';
      }
    }, { passive: false });

    shootButton.addEventListener('touchmove', (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!this.touchShootActive || this.touchShootTouchId === null) return;

      // Find our touch
      let touch: Touch | null = null;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === this.touchShootTouchId) {
          touch = e.touches[i];
          break;
        }
      }
      if (!touch) return;

      // Calculate aim adjustment
      const deltaX = touch.clientX - this.touchShootStartPos.x;
      const deltaY = touch.clientY - this.touchShootStartPos.y;

      // Apply to mouse delta for aim adjustment (higher sensitivity for quick adjustments)
      const aimSensitivity = 0.6;
      this.mouseDelta.x += deltaX * aimSensitivity;
      this.mouseDelta.y += deltaY * aimSensitivity;

      // Update start pos for continuous movement
      this.touchShootStartPos = { x: touch.clientX, y: touch.clientY };

      // Update fire aim knob position
      const fireAimKnob = fireAimIndicator.querySelector('#fire-aim-knob') as HTMLElement;
      if (fireAimKnob) {
        const maxOffset = 20;
        const clampedX = Math.max(-maxOffset, Math.min(maxOffset, deltaX * 0.5));
        const clampedY = Math.max(-maxOffset, Math.min(maxOffset, deltaY * 0.5));
        fireAimKnob.style.transform = `translate(calc(-50% + ${clampedX}px), calc(-50% + ${clampedY}px))`;
      }
    }, { passive: false });

    shootButton.addEventListener('touchend', (e: TouchEvent) => {
      e.stopPropagation();
      this.touchShootActive = false;
      this.touchShootTouchId = null;
      shootButton.style.background = 'rgba(231, 76, 60, 0.5)';
      fireAimIndicator.style.display = 'none';
    });

    shootButton.addEventListener('touchcancel', (e: TouchEvent) => {
      e.stopPropagation();
      this.touchShootActive = false;
      this.touchShootTouchId = null;
      shootButton.style.background = 'rgba(231, 76, 60, 0.5)';
      fireAimIndicator.style.display = 'none';
    });

    // Reload button events
    reloadButton.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.touchReloadActive = true;
      reloadButton.style.background = 'rgba(52, 152, 219, 0.9)';
    }, { passive: false });

    reloadButton.addEventListener('touchend', (e) => {
      e.stopPropagation();
      this.touchReloadActive = false;
      reloadButton.style.background = 'rgba(52, 152, 219, 0.6)';
    });

    reloadButton.addEventListener('touchcancel', (e) => {
      e.stopPropagation();
      this.touchReloadActive = false;
      reloadButton.style.background = 'rgba(52, 152, 219, 0.6)';
    });

    // Look area touch events with touch identifier tracking
    lookArea.addEventListener('touchstart', (e) => {
      e.preventDefault();
      // Don't stop propagation - let it bubble but track our touch
      const touch = e.changedTouches[0];
      this.touchLookTouchId = touch.identifier;
      this.touchLookStartPos = { x: touch.clientX, y: touch.clientY };
      this.touchLookActive = true;
    }, { passive: false });

    lookArea.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!this.touchLookActive || this.touchLookTouchId === null) return;

      // Find the touch with our identifier
      let touch: Touch | null = null;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === this.touchLookTouchId) {
          touch = e.touches[i];
          break;
        }
      }
      if (!touch) return;

      const deltaX = touch.clientX - this.touchLookStartPos.x;
      const deltaY = touch.clientY - this.touchLookStartPos.y;

      // Add to mouse delta for look controls
      // Higher sensitivity for mobile look
      this.mouseDelta.x += deltaX * 2.5;
      this.mouseDelta.y += deltaY * 2.0;

      this.touchLookStartPos = { x: touch.clientX, y: touch.clientY };
    }, { passive: false });

    lookArea.addEventListener('touchend', (e) => {
      // Check if our touch ended
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.touchLookTouchId) {
          this.touchLookActive = false;
          this.touchLookTouchId = null;
          break;
        }
      }
    });

    lookArea.addEventListener('touchcancel', () => {
      this.touchLookActive = false;
      this.touchLookTouchId = null;
    });

    // Jump button events
    jumpButton.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.touchJumpActive = true;
      jumpButton.style.background = 'rgba(46, 204, 113, 0.9)';
    }, { passive: false });

    jumpButton.addEventListener('touchend', (e) => {
      e.stopPropagation();
      this.touchJumpActive = false;
      jumpButton.style.background = 'rgba(46, 204, 113, 0.6)';
    });

    jumpButton.addEventListener('touchcancel', (e) => {
      e.stopPropagation();
      this.touchJumpActive = false;
      jumpButton.style.background = 'rgba(46, 204, 113, 0.6)';
    });

    // Interact button events (E key for shops)
    interactButton.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.touchInteractActive = true;
      this.keysJustPressed.add('KeyE'); // Simulate E key press
      interactButton.style.background = 'rgba(255, 215, 0, 0.9)';
    }, { passive: false });

    interactButton.addEventListener('touchend', (e: TouchEvent) => {
      e.stopPropagation();
      this.touchInteractActive = false;
      interactButton.style.background = 'rgba(255, 215, 0, 0.5)';
    });

    // Weapon cycle button - cycles through all weapons 1→2→3→4→1...
    pistolButton.addEventListener('touchstart', (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Cycle to next weapon
      this.currentWeaponIndex = (this.currentWeaponIndex % 4) + 1;
      const weaponKey = `Digit${this.currentWeaponIndex}`;

      this.keys.add(weaponKey);
      pistolButton.style.background = 'rgba(100, 100, 100, 0.9)';

      // Update button text to show current weapon
      const weaponEmojis = ['🔫', '🔫', '💥', '🎯']; // Pistol, Rifle, Shotgun, Sniper
      pistolButton.textContent = weaponEmojis[this.currentWeaponIndex - 1];

      setTimeout(() => {
        this.keys.delete(weaponKey);
        pistolButton.style.background = 'rgba(100, 100, 100, 0.6)';
      }, 100);
    }, { passive: false });

    // Fullscreen button - toggle fullscreen
    fullscreenButton.addEventListener('touchstart', (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      fullscreenButton.style.background = 'rgba(52, 73, 94, 0.9)';
      this.requestFullscreen();
    }, { passive: false });

    fullscreenButton.addEventListener('touchend', (e: TouchEvent) => {
      e.stopPropagation();
      fullscreenButton.style.background = 'rgba(52, 73, 94, 0.6)';
    });

    // Pause button events
    pauseButton.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      pauseButton.style.background = 'rgba(0, 0, 0, 0.8)';
      // Toggle pause
      if (this.game.getGameState() === GameState.PLAYING) {
        this.game.pause();
      } else if (this.game.getGameState() === GameState.PAUSED) {
        this.game.resume();
      }
    }, { passive: false });

    pauseButton.addEventListener('touchend', (e) => {
      e.stopPropagation();
      pauseButton.style.background = 'rgba(0, 0, 0, 0.5)';
    });

    // Knife/melee button events
    knifeButton.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.touchMeleeActive = true;
      knifeButton.style.background = 'rgba(192, 57, 43, 0.9)';
    }, { passive: false });

    knifeButton.addEventListener('touchend', (e) => {
      e.stopPropagation();
      this.touchMeleeActive = false;
      knifeButton.style.background = 'rgba(192, 57, 43, 0.7)';
    });
  }

  public showTouchControls(): void {
    if (this.touchControls) {
      this.touchControls.style.display = 'block';
    }
  }

  public hideTouchControls(): void {
    if (this.touchControls) {
      this.touchControls.style.display = 'none';
    }
  }

  public dispose(): void {
    document.removeEventListener('keydown', this.onKeyDown.bind(this));
    document.removeEventListener('keyup', this.onKeyUp.bind(this));
    document.removeEventListener('mousedown', this.onMouseDown.bind(this));
    document.removeEventListener('mouseup', this.onMouseUp.bind(this));
    document.removeEventListener('mousemove', this.onMouseMove.bind(this));
    document.removeEventListener('pointerlockchange', this.onPointerLockChange.bind(this));
    document.removeEventListener('pointerlockerror', this.onPointerLockError.bind(this));

    if (this.touchControls) {
      this.touchControls.remove();
    }
  }
}
