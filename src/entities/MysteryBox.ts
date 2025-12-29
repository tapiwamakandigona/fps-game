import * as THREE from 'three';
import { Game } from '../core/Game';
import { WeaponType, GAME_CONSTANTS } from '../types';

export class MysteryBox {
    private game: Game;
    public mesh: THREE.Group;
    private boxMesh: THREE.Mesh;
    private lidMesh: THREE.Mesh;
    private glowLight: THREE.PointLight;
    private questionMarkMesh: THREE.Mesh;

    private isOpen: boolean = false;
    private openTimer: number = 0;
    private readonly openDuration: number = 2;
    private pendingWeapon: WeaponType | null = null;

    public readonly cost: number = GAME_CONSTANTS.MYSTERY_BOX.COST;

    constructor(game: Game, position: THREE.Vector3) {
        this.game = game;
        this.mesh = new THREE.Group();
        this.mesh.position.copy(position);

        // Create the box
        const boxMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513, // Brown wood
            roughness: 0.7,
            metalness: 0.2
        });

        const glowMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFD700, // Gold
            emissive: 0xFFD700,
            emissiveIntensity: 0.3,
            roughness: 0.3,
            metalness: 0.8
        });

        // Main box body
        this.boxMesh = new THREE.Mesh(
            new THREE.BoxGeometry(1.5, 0.8, 1),
            boxMaterial
        );
        this.boxMesh.position.y = 0.4;
        this.boxMesh.castShadow = true;
        this.boxMesh.receiveShadow = true;
        this.mesh.add(this.boxMesh);

        // Gold trim
        const trimMesh = new THREE.Mesh(
            new THREE.BoxGeometry(1.55, 0.1, 1.05),
            glowMaterial
        );
        trimMesh.position.y = 0.8;
        this.mesh.add(trimMesh);

        // Lid (opens when used)
        this.lidMesh = new THREE.Mesh(
            new THREE.BoxGeometry(1.5, 0.15, 1),
            boxMaterial
        );
        this.lidMesh.position.set(0, 0.88, 0);
        this.mesh.add(this.lidMesh);

        // Question mark on front
        const questionGeom = new THREE.BoxGeometry(0.1, 0.4, 0.05);
        this.questionMarkMesh = new THREE.Mesh(questionGeom, glowMaterial);
        this.questionMarkMesh.position.set(0, 0.5, 0.53);
        this.mesh.add(this.questionMarkMesh);

        // Glow light
        this.glowLight = new THREE.PointLight(0xFFD700, 1, 5);
        this.glowLight.position.y = 1.5;
        this.mesh.add(this.glowLight);

        // Mark as interactable
        this.mesh.userData.isMysteryBox = true;
        this.mesh.userData.instance = this;
    }

    public canUse(coins: number): boolean {
        return !this.isOpen && coins >= this.cost;
    }

    public use(): WeaponType | null {
        if (this.isOpen) return null;

        this.isOpen = true;
        this.openTimer = 0;

        // Pick random weapon from mystery box weapons
        const weapons = GAME_CONSTANTS.MYSTERY_BOX.WEAPONS;
        this.pendingWeapon = weapons[Math.floor(Math.random() * weapons.length)] as WeaponType;

        // Play sound
        this.game.audioManager.playSound('pickup');

        return this.pendingWeapon;
    }

    public update(delta: number): void {
        // Animate question mark
        this.questionMarkMesh.rotation.y += delta * 2;

        // Pulse glow
        const pulse = 0.8 + Math.sin(Date.now() * 0.003) * 0.3;
        this.glowLight.intensity = this.isOpen ? 2 : pulse;

        if (this.isOpen) {
            this.openTimer += delta;

            // Animate lid opening
            const openProgress = Math.min(1, this.openTimer / 0.5);
            this.lidMesh.rotation.x = -openProgress * Math.PI * 0.6;
            this.lidMesh.position.z = -0.3 * openProgress;
            this.lidMesh.position.y = 0.88 + 0.2 * openProgress;

            // Close after duration
            if (this.openTimer >= this.openDuration) {
                this.close();
            }
        }
    }

    private close(): void {
        this.isOpen = false;
        this.pendingWeapon = null;
        this.lidMesh.rotation.x = 0;
        this.lidMesh.position.set(0, 0.88, 0);
    }

    public getPosition(): THREE.Vector3 {
        return this.mesh.position.clone();
    }

    public dispose(): void {
        this.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.geometry.dispose();
                if (child.material instanceof THREE.Material) {
                    child.material.dispose();
                }
            }
        });
    }
}
