import * as THREE from 'three';
import { Game } from '../../core/Game';
import { Enemy } from '../Enemy';
import { EnemyState, EnemyType, GAME_CONSTANTS } from '../../types';

export class ZombieEnemy extends Enemy {
    private groanTimer: number = 0;
    private groanInterval: number = 3 + Math.random() * 5;
    private armSwingPhase: number = Math.random() * Math.PI * 2;
    private leftArm: THREE.Mesh | null = null;
    private rightArm: THREE.Mesh | null = null;
    private stuckTimer: number = 0;
    private lastPosition: THREE.Vector3 = new THREE.Vector3();
    private strafeDirection: number = 0;

    constructor(game: Game, position: THREE.Vector3, speedMultiplier: number = 1) {
        super(game, position, {
            type: EnemyType.ZOMBIE,
            health: GAME_CONSTANTS.ENEMY.ZOMBIE.HEALTH,
            speed: GAME_CONSTANTS.ENEMY.ZOMBIE.SPEED * speedMultiplier,
            damage: GAME_CONSTANTS.ENEMY.ZOMBIE.DAMAGE,
            attackRange: GAME_CONSTANTS.ENEMY.ZOMBIE.ATTACK_RANGE,
            detectionRange: GAME_CONSTANTS.ENEMY.ZOMBIE.DETECTION_RANGE,
            attackCooldown: GAME_CONSTANTS.ENEMY.ZOMBIE.ATTACK_COOLDOWN
        });

        // Zombies start idle, will chase when player is detected
        this.state = EnemyState.IDLE;
        this.lastPosition.copy(position);
    }

    protected createBody(): { body: THREE.Mesh; eye: THREE.Mesh } {
        // Zombie body - hunched humanoid
        const bodyGeometry = new THREE.BoxGeometry(0.8, 1.2, 0.5);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x3d5c3d, // Sickly green
            roughness: 0.9,
            metalness: 0.1
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.8;
        body.rotation.x = 0.2; // Hunched forward
        body.castShadow = true;

        // Zombie head - slightly tilted
        const headGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.4);
        const headMaterial = new THREE.MeshStandardMaterial({
            color: 0x556b55,
            roughness: 0.9
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.set(0, 0.9, 0.1);
        head.rotation.z = 0.15; // Tilted head
        body.add(head);

        // Glowing red eyes
        const eyeGeometry = new THREE.SphereGeometry(0.08, 8, 8);
        const eyeMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.8
        });

        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.12, 0.05, 0.2);
        head.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.12, 0.05, 0.2);
        head.add(rightEye);

        // Arms - extended forward (zombie reaching pose)
        const armGeometry = new THREE.BoxGeometry(0.2, 0.8, 0.2);
        const armMaterial = new THREE.MeshStandardMaterial({
            color: 0x3d5c3d,
            roughness: 0.9
        });

        this.leftArm = new THREE.Mesh(armGeometry, armMaterial);
        this.leftArm.position.set(-0.5, 0.4, 0.4);
        this.leftArm.rotation.x = -1.2; // Extended forward
        this.leftArm.rotation.z = 0.3;
        body.add(this.leftArm);

        this.rightArm = new THREE.Mesh(armGeometry, armMaterial);
        this.rightArm.position.set(0.5, 0.4, 0.4);
        this.rightArm.rotation.x = -1.2;
        this.rightArm.rotation.z = -0.3;
        body.add(this.rightArm);

        // Legs
        const legGeometry = new THREE.BoxGeometry(0.25, 0.7, 0.25);
        const leftLeg = new THREE.Mesh(legGeometry, armMaterial);
        leftLeg.position.set(-0.2, -0.55, 0);
        body.add(leftLeg);

        const rightLeg = new THREE.Mesh(legGeometry, armMaterial);
        rightLeg.position.set(0.2, -0.55, 0);
        body.add(rightLeg);

        // Tattered clothing effect (simple box overlay)
        const clothGeometry = new THREE.BoxGeometry(0.85, 0.6, 0.55);
        const clothMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a3728, // Brown tattered clothes
            roughness: 1.0
        });
        const cloth = new THREE.Mesh(clothGeometry, clothMaterial);
        cloth.position.set(0, 0.2, 0);
        body.add(cloth);

        // Reference eye for facing
        const eye = new THREE.Mesh(
            new THREE.SphereGeometry(0.01),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        eye.position.set(0, 1.7, 0.5);

        return { body, eye };
    }

    public update(delta: number): void {
        super.update(delta);

        // Animate arms swinging while moving
        if (this.state === EnemyState.CHASE && this.leftArm && this.rightArm) {
            this.armSwingPhase += delta * 8;
            const swing = Math.sin(this.armSwingPhase) * 0.3;
            this.leftArm.rotation.x = -1.2 + swing;
            this.rightArm.rotation.x = -1.2 - swing;
        }

        // Zombie groaning (visual wobble effect)
        this.groanTimer += delta;
        if (this.groanTimer >= this.groanInterval) {
            this.groanTimer = 0;
            this.groanInterval = 3 + Math.random() * 5;

            // Slight body shake when groaning
            if (this.bodyMesh) {
                const originalRot = this.bodyMesh.rotation.z;
                this.bodyMesh.rotation.z += 0.1;
                setTimeout(() => {
                    if (this.bodyMesh) {
                        this.bodyMesh.rotation.z = originalRot;
                    }
                }, 200);
            }
        }
    }

    // Override chase to add obstacle avoidance
    protected updateChase(delta: number, playerPos: THREE.Vector3, distance: number): void {
        // Check if stuck (hasn't moved much)
        const distMoved = this.mesh.position.distanceTo(this.lastPosition);
        if (distMoved < 0.05 && distance > this.attackRange) {
            this.stuckTimer += delta;
            if (this.stuckTimer > 0.3) {
                // Try to strafe around obstacle
                if (this.strafeDirection === 0) {
                    this.strafeDirection = Math.random() > 0.5 ? 1 : -1;
                }
                this.strafeAroundObstacle(delta, playerPos);
            }
        } else {
            this.stuckTimer = 0;
            this.strafeDirection = 0;
        }

        this.lastPosition.copy(this.mesh.position);

        // Normal chase behavior
        super.updateChase(delta, playerPos, distance);
    }

    private strafeAroundObstacle(delta: number, playerPos: THREE.Vector3): void {
        // Move perpendicular to player direction to get around obstacle
        const toPlayer = new THREE.Vector3().subVectors(playerPos, this.mesh.position);
        toPlayer.y = 0;
        toPlayer.normalize();

        // Get perpendicular direction
        const strafeDir = new THREE.Vector3(-toPlayer.z * this.strafeDirection, 0, toPlayer.x * this.strafeDirection);

        const newPosition = this.mesh.position.clone();
        newPosition.x += strafeDir.x * this.speed * delta * 1.5;
        newPosition.z += strafeDir.z * this.speed * delta * 1.5;

        if (!this.checkCollision(newPosition)) {
            this.mesh.position.copy(newPosition);
        } else {
            // Try opposite direction
            this.strafeDirection *= -1;
        }

        // Reset stuck timer after a bit of strafing
        if (this.stuckTimer > 1.5) {
            this.stuckTimer = 0;
            this.strafeDirection = 0;
        }
    }

    protected getScoreValue(): number {
        return 50;
    }
}
