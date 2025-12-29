import * as THREE from 'three';
import { Game } from '../core/Game';
import { GAME_CONSTANTS } from '../types';

export type ShopType = 'health' | 'ammo';

export class ShopStation {
    public mesh: THREE.Group;
    private game: Game;
    private shopType: ShopType;
    public cost: number;
    private cooldownTimer: number = 0;
    private readonly cooldownDuration: number = 3; // 3 seconds between uses

    constructor(game: Game, position: THREE.Vector3, type: ShopType) {
        this.game = game;
        this.shopType = type;
        this.mesh = new THREE.Group();

        // Set cost based on type
        this.cost = type === 'health'
            ? GAME_CONSTANTS.SHOP.HEALTH_COST
            : GAME_CONSTANTS.SHOP.AMMO_COST;

        this.createMesh();
        this.mesh.position.copy(position);
    }

    private createMesh(): void {
        // Base material colors
        const boxColor = this.shopType === 'health' ? 0xff3333 : 0x33ff33;
        const glowColor = this.shopType === 'health' ? 0xff0000 : 0x00ff00;

        // Create box
        const boxMaterial = new THREE.MeshStandardMaterial({
            color: boxColor,
            roughness: 0.3,
            metalness: 0.6,
            emissive: glowColor,
            emissiveIntensity: 0.3
        });

        const box = new THREE.Mesh(
            new THREE.BoxGeometry(1.2, 0.8, 1.2),
            boxMaterial
        );
        box.position.y = 0.4;
        box.castShadow = true;
        box.receiveShadow = true;
        this.mesh.add(box);

        // Cross or bullet symbol on top
        if (this.shopType === 'health') {
            // Red cross
            const crossMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.5 });
            const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.05, 0.5), crossMat);
            crossV.position.y = 0.83;
            this.mesh.add(crossV);

            const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.15), crossMat);
            crossH.position.y = 0.83;
            this.mesh.add(crossH);
        } else {
            // Bullet symbol (ammo)
            const bulletMat = new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 0.8 });
            const bullet = new THREE.Mesh(
                new THREE.CylinderGeometry(0.08, 0.1, 0.3, 8),
                bulletMat
            );
            bullet.position.y = 0.95;
            this.mesh.add(bullet);

            const tip = new THREE.Mesh(
                new THREE.ConeGeometry(0.08, 0.15, 8),
                new THREE.MeshStandardMaterial({ color: 0xcc8800 })
            );
            tip.position.y = 1.15;
            this.mesh.add(tip);
        }

        // Base light glow
        const light = new THREE.PointLight(glowColor, 0.5, 5);
        light.position.y = 0.5;
        this.mesh.add(light);
    }

    public update(delta: number): void {
        // Floating animation
        this.mesh.children[0].position.y = 0.4 + Math.sin(Date.now() * 0.003) * 0.05;

        // Slow rotation
        this.mesh.rotation.y += delta * 0.5;

        // Update cooldown
        if (this.cooldownTimer > 0) {
            this.cooldownTimer -= delta;
        }
    }

    public getPosition(): THREE.Vector3 {
        return this.mesh.position.clone();
    }

    public canUse(playerCoins: number): boolean {
        return playerCoins >= this.cost && this.cooldownTimer <= 0;
    }

    public isOnCooldown(): boolean {
        return this.cooldownTimer > 0;
    }

    public use(): boolean {
        if (this.cooldownTimer > 0) return false;

        this.cooldownTimer = this.cooldownDuration;
        return true;
    }

    public getType(): ShopType {
        return this.shopType;
    }

    public getDescription(): string {
        if (this.shopType === 'health') {
            return `Buy Health (+${GAME_CONSTANTS.SHOP.HEALTH_AMOUNT} HP) - ${this.cost} coins`;
        } else {
            return `Buy Ammo (Full Pistol) - ${this.cost} coins`;
        }
    }
}
