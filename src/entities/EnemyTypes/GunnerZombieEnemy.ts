import * as THREE from 'three';
import { Game } from '../../core/Game';
import { Enemy } from '../Enemy';
import { EnemyState, EnemyType, GAME_CONSTANTS } from '../../types';

// Gunner Zombie - Has a pistol and shoots at the player from range
export class GunnerZombieEnemy extends Enemy {
    private gunMesh: THREE.Mesh | null = null;
    private muzzleFlash: THREE.PointLight | null = null;
    private aimTimer: number = 0;
    private shootCooldown: number = 0;

    constructor(game: Game, position: THREE.Vector3) {
        const config = GAME_CONSTANTS.ENEMY.GUNNER_ZOMBIE;
        super(game, position, {
            type: EnemyType.GUNNER_ZOMBIE,
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
        // Military-style zombie body
        const bodyGeometry = new THREE.BoxGeometry(0.6, 1.0, 0.4);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x3d5c3d, // Dark green (military)
            roughness: 0.8,
            metalness: 0.2
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.8;
        body.castShadow = true;

        // Head with helmet
        const headGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.35);
        const headMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a6a4a,
            roughness: 0.9
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.set(0, 0.7, 0);
        body.add(head);

        // Helmet
        const helmetGeometry = new THREE.SphereGeometry(0.25, 10, 10, 0, Math.PI * 2, 0, Math.PI / 2);
        const helmetMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a3a2a,
            roughness: 0.5,
            metalness: 0.4
        });
        const helmet = new THREE.Mesh(helmetGeometry, helmetMaterial);
        helmet.position.set(0, 0.15, 0);
        head.add(helmet);

        // Red glowing eyes
        const eyeGeometry = new THREE.SphereGeometry(0.06, 8, 8);
        const eyeMaterial = new THREE.MeshStandardMaterial({
            color: 0xff3300,
            emissive: 0xff3300,
            emissiveIntensity: 0.9
        });

        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.1, 0, 0.15);
        head.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.1, 0, 0.15);
        head.add(rightEye);

        // Arms
        const armGeometry = new THREE.BoxGeometry(0.15, 0.6, 0.15);
        const armMaterial = new THREE.MeshStandardMaterial({
            color: 0x3d5c3d,
            roughness: 0.8
        });

        // Left arm holding gun
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-0.4, 0.2, 0.2);
        leftArm.rotation.x = -0.5;
        body.add(leftArm);

        // Right arm supporting
        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(0.4, 0.2, 0.15);
        rightArm.rotation.x = -0.3;
        body.add(rightArm);

        // Gun (pistol)
        const gunMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.3,
            metalness: 0.9
        });

        this.gunMesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.08, 0.2),
            gunMaterial
        );
        this.gunMesh.position.set(-0.35, 0.3, 0.5);
        body.add(this.gunMesh);

        // Muzzle flash light
        this.muzzleFlash = new THREE.PointLight(0xff6600, 0, 3);
        this.muzzleFlash.position.set(-0.35, 0.3, 0.7);
        body.add(this.muzzleFlash);

        // Legs
        const legGeometry = new THREE.BoxGeometry(0.18, 0.6, 0.18);
        const leftLeg = new THREE.Mesh(legGeometry, armMaterial);
        leftLeg.position.set(-0.15, -0.5, 0);
        body.add(leftLeg);

        const rightLeg = new THREE.Mesh(legGeometry, armMaterial);
        rightLeg.position.set(0.15, -0.5, 0);
        body.add(rightLeg);

        // Reference eye
        const eye = new THREE.Mesh(
            new THREE.SphereGeometry(0.01),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        eye.position.set(0, 1.5, 0.5);

        return { body, eye };
    }

    public update(delta: number): void {
        super.update(delta);

        // Update muzzle flash
        if (this.muzzleFlash && this.muzzleFlash.intensity > 0) {
            this.muzzleFlash.intensity -= delta * 20;
            if (this.muzzleFlash.intensity < 0) this.muzzleFlash.intensity = 0;
        }
    }

    // Override chase to keep distance and shoot
    protected updateChase(delta: number, playerPos: THREE.Vector3, distance: number): void {
        // If close enough to shoot, stop and aim
        if (distance < this.attackRange && distance > 5) {
            this.setState(EnemyState.ATTACK);
            return;
        }

        // If too close, back up
        if (distance < 5) {
            const direction = new THREE.Vector3();
            direction.subVectors(this.mesh.position, playerPos);
            direction.y = 0;
            direction.normalize();

            const newPos = this.mesh.position.clone();
            newPos.x += direction.x * this.speed * delta;
            newPos.z += direction.z * this.speed * delta;

            if (!this.checkCollision(newPos)) {
                this.mesh.position.copy(newPos);
            }
            return;
        }

        // Move towards player if too far
        super.updateChase(delta, playerPos, distance);
    }

    // Override attack to shoot
    protected performAttack(): void {
        if (!this.game.player) return;

        const distance = this.mesh.position.distanceTo(this.game.player.getPosition());

        // Only hit if in range and with some accuracy randomness
        if (distance < this.attackRange && Math.random() > 0.3) {
            this.game.player.takeDamage(this.damage);
        }

        // Muzzle flash effect
        if (this.muzzleFlash) {
            this.muzzleFlash.intensity = 2;
        }

        // Play gunshot sound
        this.game.audioManager.playSound('pistolShoot');
    }

    protected getScoreValue(): number {
        return 75;
    }
}
