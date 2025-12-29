import * as THREE from 'three';
import { Game } from '../../core/Game';
import { Enemy } from '../Enemy';
import { EnemyState, EnemyType, GAME_CONSTANTS } from '../../types';

// Fast Zombie - Small, quick, low health
export class FastZombieEnemy extends Enemy {
    private runCycle: number = 0;
    private leftArm: THREE.Mesh | null = null;
    private rightArm: THREE.Mesh | null = null;
    private leftLeg: THREE.Mesh | null = null;
    private rightLeg: THREE.Mesh | null = null;

    constructor(game: Game, position: THREE.Vector3) {
        const config = GAME_CONSTANTS.ENEMY.FAST_ZOMBIE;
        super(game, position, {
            type: EnemyType.FAST_ZOMBIE,
            health: config.HEALTH,
            speed: config.SPEED,
            damage: config.DAMAGE,
            attackRange: config.ATTACK_RANGE,
            detectionRange: config.DETECTION_RANGE,
            attackCooldown: config.ATTACK_COOLDOWN
        });

        this.state = EnemyState.IDLE;
    }

    protected createBody(): { body: THREE.Mesh; eye: THREE.Mesh } {
        // Small, lanky zombie body
        const bodyGeometry = new THREE.BoxGeometry(0.4, 0.8, 0.3);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x5a7a5a, // Lighter green
            roughness: 0.9,
            metalness: 0.1
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.6;
        body.rotation.x = 0.4; // Hunched forward for running
        body.castShadow = true;

        // Small head
        const headGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.25);
        const headMaterial = new THREE.MeshStandardMaterial({
            color: 0x6a8a6a,
            roughness: 0.9
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.set(0, 0.6, 0.15);
        body.add(head);

        // Glowing yellow eyes (feral)
        const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const eyeMaterial = new THREE.MeshStandardMaterial({
            color: 0xffff00,
            emissive: 0xffff00,
            emissiveIntensity: 0.8
        });

        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.08, 0.02, 0.12);
        head.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.08, 0.02, 0.12);
        head.add(rightEye);

        // Long thin arms
        const armGeometry = new THREE.BoxGeometry(0.12, 0.5, 0.12);
        const armMaterial = new THREE.MeshStandardMaterial({
            color: 0x5a7a5a,
            roughness: 0.9
        });

        this.leftArm = new THREE.Mesh(armGeometry, armMaterial);
        this.leftArm.position.set(-0.3, 0.2, 0.3);
        this.leftArm.rotation.x = -0.8;
        body.add(this.leftArm);

        this.rightArm = new THREE.Mesh(armGeometry, armMaterial);
        this.rightArm.position.set(0.3, 0.2, 0.3);
        this.rightArm.rotation.x = -0.8;
        body.add(this.rightArm);

        // Long thin legs
        const legGeometry = new THREE.BoxGeometry(0.12, 0.5, 0.12);
        this.leftLeg = new THREE.Mesh(legGeometry, armMaterial);
        this.leftLeg.position.set(-0.12, -0.5, 0);
        body.add(this.leftLeg);

        this.rightLeg = new THREE.Mesh(legGeometry, armMaterial);
        this.rightLeg.position.set(0.12, -0.5, 0);
        body.add(this.rightLeg);

        // Reference eye
        const eye = new THREE.Mesh(
            new THREE.SphereGeometry(0.01),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        eye.position.set(0, 1.2, 0.5);

        return { body, eye };
    }

    public update(delta: number): void {
        super.update(delta);

        // Fast running animation
        if (this.state === EnemyState.CHASE) {
            this.runCycle += delta * 15; // Fast cycle
            const swing = Math.sin(this.runCycle) * 0.6;

            if (this.leftArm) this.leftArm.rotation.x = -0.8 + swing;
            if (this.rightArm) this.rightArm.rotation.x = -0.8 - swing;
            if (this.leftLeg) this.leftLeg.rotation.x = swing * 0.5;
            if (this.rightLeg) this.rightLeg.rotation.x = -swing * 0.5;
        }
    }

    protected getScoreValue(): number {
        return 30;
    }
}
