import * as THREE from 'three';
import { Game } from '../../core/Game';
import { Enemy } from '../Enemy';
import { EnemyState, EnemyType, GAME_CONSTANTS } from '../../types';

// Fat Zombie - Big, slow, lots of health
export class FatZombieEnemy extends Enemy {
    private groanTimer: number = 0;
    private groanInterval: number = 4 + Math.random() * 3;
    private bouncePhase: number = Math.random() * Math.PI * 2;

    constructor(game: Game, position: THREE.Vector3) {
        const config = GAME_CONSTANTS.ENEMY.FAT_ZOMBIE;
        super(game, position, {
            type: EnemyType.FAT_ZOMBIE,
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
        // Fat zombie - big round body
        const bodyGeometry = new THREE.SphereGeometry(0.8, 12, 12);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a6b4a, // Greenish
            roughness: 0.9,
            metalness: 0.1
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 1.0;
        body.scale.set(1, 0.9, 0.8); // Squashed sphere
        body.castShadow = true;

        // Small head on top
        const headGeometry = new THREE.SphereGeometry(0.35, 10, 10);
        const headMaterial = new THREE.MeshStandardMaterial({
            color: 0x556b55,
            roughness: 0.9
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.set(0, 0.9, 0.2);
        body.add(head);

        // Angry red eyes
        const eyeGeometry = new THREE.SphereGeometry(0.08, 8, 8);
        const eyeMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.8
        });

        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.12, 0.05, 0.25);
        head.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.12, 0.05, 0.25);
        head.add(rightEye);

        // Short stubby arms
        const armGeometry = new THREE.BoxGeometry(0.25, 0.5, 0.25);
        const armMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a6b4a,
            roughness: 0.9
        });

        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-0.7, 0, 0.3);
        leftArm.rotation.z = 0.5;
        body.add(leftArm);

        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(0.7, 0, 0.3);
        rightArm.rotation.z = -0.5;
        body.add(rightArm);

        // Stubby legs
        const legGeometry = new THREE.BoxGeometry(0.3, 0.4, 0.3);
        const leftLeg = new THREE.Mesh(legGeometry, armMaterial);
        leftLeg.position.set(-0.35, -0.8, 0);
        body.add(leftLeg);

        const rightLeg = new THREE.Mesh(legGeometry, armMaterial);
        rightLeg.position.set(0.35, -0.8, 0);
        body.add(rightLeg);

        // Reference eye
        const eye = new THREE.Mesh(
            new THREE.SphereGeometry(0.01),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        eye.position.set(0, 2, 0.5);

        return { body, eye };
    }

    public update(delta: number): void {
        super.update(delta);

        // Bounce animation while moving
        if (this.state === EnemyState.CHASE && this.bodyMesh) {
            this.bouncePhase += delta * 6;
            const bounce = Math.abs(Math.sin(this.bouncePhase)) * 0.1;
            this.bodyMesh.position.y = 1.0 + bounce;
        }

        // Groaning
        this.groanTimer += delta;
        if (this.groanTimer >= this.groanInterval) {
            this.groanTimer = 0;
            this.groanInterval = 4 + Math.random() * 3;

            // Heavy body shake
            if (this.bodyMesh) {
                const originalScale = this.bodyMesh.scale.x;
                this.bodyMesh.scale.x = originalScale * 1.1;
                setTimeout(() => {
                    if (this.bodyMesh) {
                        this.bodyMesh.scale.x = originalScale;
                    }
                }, 200);
            }
        }
    }

    protected getScoreValue(): number {
        return 100; // Worth more points
    }
}
