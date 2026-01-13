import * as THREE from 'three';
import { Game } from './Game';

/**
 * ScreenEffects - Visual feedback system for game events
 * Includes screen shake, damage vignette, and hit flash effects
 */
export class ScreenEffects {
    private game: Game;

    // Screen shake
    private shakeIntensity: number = 0;
    private shakeDecay: number = 0.9;
    private originalCameraPos: THREE.Vector3 = new THREE.Vector3();
    private shakeOffset: THREE.Vector3 = new THREE.Vector3();

    // Damage vignette (CSS-based)
    private vignetteElement: HTMLElement | null = null;
    private vignetteOpacity: number = 0;
    private vignetteDecay: number = 0.95;

    // Hit flash
    private hitFlashElement: HTMLElement | null = null;
    private hitFlashOpacity: number = 0;
    private hitFlashDecay: number = 0.85;

    constructor(game: Game) {
        this.game = game;
        this.createVignetteOverlay();
        this.createHitFlashOverlay();
    }

    private createVignetteOverlay(): void {
        this.vignetteElement = document.createElement('div');
        this.vignetteElement.id = 'damage-vignette';
        this.vignetteElement.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 100;
      opacity: 0;
      background: radial-gradient(ellipse at center, 
        transparent 0%, 
        transparent 40%, 
        rgba(200, 0, 0, 0.6) 100%
      );
    `;
        document.body.appendChild(this.vignetteElement);
    }

    private createHitFlashOverlay(): void {
        this.hitFlashElement = document.createElement('div');
        this.hitFlashElement.id = 'hit-flash';
        this.hitFlashElement.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 99;
      opacity: 0;
      background: rgba(255, 255, 255, 0.3);
    `;
        document.body.appendChild(this.hitFlashElement);
    }

    /**
     * Trigger screen shake effect
     * @param intensity Shake intensity (0.01 to 0.2 typical)
     */
    public shake(intensity: number = 0.05): void {
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
        this.originalCameraPos.copy(this.game.camera.position);
    }

    /**
     * Trigger damage vignette effect
     * @param intensity Vignette intensity (0.0 to 1.0)
     */
    public damageVignette(intensity: number = 0.7): void {
        this.vignetteOpacity = Math.min(1, Math.max(this.vignetteOpacity, intensity));
    }

    /**
     * Trigger hit flash when player hits enemy
     * @param intensity Flash intensity (0.0 to 1.0)  
     */
    public hitFlash(intensity: number = 0.4): void {
        this.hitFlashOpacity = Math.min(1, Math.max(this.hitFlashOpacity, intensity));
    }

    /**
     * Combined effect for taking damage
     */
    public onPlayerDamage(damagePercent: number): void {
        const intensity = Math.min(1, damagePercent * 2);
        this.shake(0.03 + intensity * 0.07);
        this.damageVignette(0.3 + intensity * 0.5);

        // Trigger haptic on mobile
        this.game.inputManager.damageHaptic();
    }

    /**
     * Effect when player hits an enemy
     */
    public onEnemyHit(): void {
        this.hitFlash(0.3);
    }

    /**
     * Effect when player fires weapon
     */
    public onWeaponFire(recoilIntensity: number = 0.01): void {
        this.shake(recoilIntensity);
        this.game.inputManager.shootHaptic();
    }

    /**
     * Update effects each frame
     */
    public update(delta: number): void {
        // Update screen shake
        if (this.shakeIntensity > 0.001) {
            this.shakeOffset.set(
                (Math.random() - 0.5) * 2 * this.shakeIntensity,
                (Math.random() - 0.5) * 2 * this.shakeIntensity,
                0
            );

            // Apply shake to camera
            this.game.camera.position.add(this.shakeOffset);

            // Decay shake
            this.shakeIntensity *= this.shakeDecay;
        }

        // Update damage vignette
        if (this.vignetteOpacity > 0.01 && this.vignetteElement) {
            this.vignetteElement.style.opacity = String(this.vignetteOpacity);
            this.vignetteOpacity *= this.vignetteDecay;
        } else if (this.vignetteElement) {
            this.vignetteElement.style.opacity = '0';
        }

        // Update hit flash
        if (this.hitFlashOpacity > 0.01 && this.hitFlashElement) {
            this.hitFlashElement.style.opacity = String(this.hitFlashOpacity);
            this.hitFlashOpacity *= this.hitFlashDecay;
        } else if (this.hitFlashElement) {
            this.hitFlashElement.style.opacity = '0';
        }
    }

    /**
     * Clean up DOM elements
     */
    public dispose(): void {
        if (this.vignetteElement && this.vignetteElement.parentNode) {
            this.vignetteElement.parentNode.removeChild(this.vignetteElement);
        }
        if (this.hitFlashElement && this.hitFlashElement.parentNode) {
            this.hitFlashElement.parentNode.removeChild(this.hitFlashElement);
        }
    }
}
