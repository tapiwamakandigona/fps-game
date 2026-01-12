import * as THREE from 'three';
import { Game } from '../core/Game';
import { GAME_CONSTANTS } from '../types';

export class Rocket {
    private game: Game;
    public mesh: THREE.Group;
    private velocity: THREE.Vector3;
    private lifetime: number;
    private isDead: boolean = false;

    constructor(game: Game, position: THREE.Vector3, direction: THREE.Vector3) {
        this.game = game;
        this.velocity = direction.normalize().multiplyScalar(GAME_CONSTANTS.ROCKET.SPEED);
        this.lifetime = GAME_CONSTANTS.ROCKET.LIFETIME;

        this.mesh = this.createModel();
        this.mesh.position.copy(position);

        // Orient rocket to face direction
        this.mesh.lookAt(position.clone().add(direction));
    }

    private createModel(): THREE.Group {
        const group = new THREE.Group();

        // Rocket body construction:
        // We want the rocket to face "Forward" which is Negative Z in standard Three.js convention
        // So Nose should be at -Z, Thruster at +Z

        // Main body
        const bodyGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x556655, // Olive green
            roughness: 0.6
        });
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        body.rotation.x = Math.PI / 2;
        group.add(body);

        // Nose cone
        const noseGeom = new THREE.ConeGeometry(0.08, 0.2, 8);
        const noseMat = new THREE.MeshStandardMaterial({
            color: 0xaa0000, // Red tip
            roughness: 0.4
        });
        const nose = new THREE.Mesh(noseGeom, noseMat);
        nose.rotation.x = -Math.PI / 2; // Point tip towards -Z (default cone points +Y)
        nose.position.z = -0.4; // Front
        group.add(nose);

        // Fins
        const finGeom = new THREE.BoxGeometry(0.4, 0.02, 0.15);
        const finMat = new THREE.MeshStandardMaterial({ color: 0x333333 });

        const fin1 = new THREE.Mesh(finGeom, finMat);
        fin1.position.z = 0.25; // Back
        group.add(fin1);

        const fin2 = new THREE.Mesh(finGeom, finMat);
        fin2.position.z = 0.25; // Back
        fin2.rotation.z = Math.PI / 2;
        group.add(fin2);

        // Thruster light
        const light = new THREE.PointLight(0xffaa00, 1, 3);
        light.position.z = 0.3; // Back
        group.add(light);

        // Thruster particle (visual only, simple)
        const thrusterGeom = new THREE.SphereGeometry(0.06);
        const thrusterMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
        const thruster = new THREE.Mesh(thrusterGeom, thrusterMat);
        thruster.position.z = 0.3; // Back
        group.add(thruster);

        return group;
    }

    public update(delta: number): void {
        if (this.isDead) return;

        // Move
        const displacement = this.velocity.clone().multiplyScalar(delta);
        const nextPosition = this.mesh.position.clone().add(displacement);

        // Collision detection
        if (this.checkCollision(nextPosition)) {
            this.explode();
            return;
        }

        this.mesh.position.copy(nextPosition);

        // Update lifetime
        this.lifetime -= delta;
        if (this.lifetime <= 0) {
            this.explode();
        }
    }

    private checkCollision(nextPosition: THREE.Vector3): boolean {
        // Raycast from current position to next position
        const direction = nextPosition.clone().sub(this.mesh.position).normalize();
        const distance = this.mesh.position.distanceTo(nextPosition);

        const raycaster = new THREE.Raycaster(this.mesh.position, direction, 0, distance);

        // Check enemies
        const enemies = this.game.levelManager.getEnemies();
        const enemyMeshes = enemies.map(e => e.mesh);
        const enemyHits = raycaster.intersectObjects(enemyMeshes, true);

        if (enemyHits.length > 0) {
            return true;
        }

        // Check level objects
        const levelObjects = this.game.levelManager.getLevelObjects();
        const levelHits = raycaster.intersectObjects(levelObjects, true);

        if (levelHits.length > 0) {
            return true;
        }

        // Also check floor (y <= 0)
        if (nextPosition.y <= 0) {
            return true;
        }

        return false;
    }

    private explode(): void {
        if (this.isDead) return;
        this.isDead = true;

        // Visual effect
        this.createExplosionEffect();

        // Sound effect
        // Reuse enemy death sound for now as it's an explosion-like sound
        this.game.audioManager.playSound('enemyDeath');

        // Area damage
        const enemies = this.game.levelManager.getEnemies();
        const explosionRadius = GAME_CONSTANTS.ROCKET.EXPLOSION_RADIUS;
        // Use configured weapon damage instead of separate constant for consistency,
        // or fallback to GAME_CONSTANTS.ROCKET.EXPLOSION_DAMAGE if needed.
        // Since Rocket doesn't have reference to the weapon instance, we'll use the constant which is tuned for the rocket.
        const maxDamage = GAME_CONSTANTS.ROCKET.EXPLOSION_DAMAGE;

        for (const enemy of enemies) {
            const distance = this.mesh.position.distanceTo(enemy.mesh.position);

            if (distance <= explosionRadius) {
                // Damage falls off with distance
                const damageFactor = 1 - (distance / explosionRadius);
                const damage = Math.floor(maxDamage * damageFactor);

                if (damage > 0) {
                    enemy.takeDamage(damage);

                    // Knockback (optional, if supported)
                }
            }
        }
    }

    private createExplosionEffect(): void {
        const geometry = new THREE.SphereGeometry(0.5, 16, 16);
        const material = new THREE.MeshBasicMaterial({
            color: 0xff4400,
            transparent: true,
            opacity: 1
        });

        const explosion = new THREE.Mesh(geometry, material);
        explosion.position.copy(this.mesh.position);
        this.game.scene.add(explosion);

        let lifetime = 0;
        const duration = 0.5;

        // Create a simple object to track animation state
        const animState = {
            update: (delta: number) => {
                lifetime += delta;

                const scale = 1 + (lifetime / duration) * GAME_CONSTANTS.ROCKET.EXPLOSION_RADIUS;
                explosion.scale.set(scale, scale, scale);
                material.opacity = 1 - (lifetime / duration);

                if (lifetime >= duration) {
                    this.game.scene.remove(explosion);
                    geometry.dispose();
                    material.dispose();
                    return true; // Finished
                }
                return false; // Still running
            }
        };

        // We can attach this to the game loop or LevelManager if we want proper delta time
        // For now, let's use a simpler approach: attach it to a temporary entity in LevelManager
        // But since we don't have a generic particle system, we'll use a self-contained loop that uses performance.now() for delta

        let lastTime = performance.now();
        const animate = () => {
            if (this.game.getGameState() !== 'PLAYING' && this.game.getGameState() !== 'LEVEL_COMPLETE' && this.game.getGameState() !== 'VICTORY' && this.game.getGameState() !== 'GAME_OVER') {
                 // If paused or menu, just wait (or could use game loop delta if integrated)
                 // For simplicity, we just stop if game state changes significantly to avoid leaks
                 if (this.game.getGameState() === 'MAIN_MENU') {
                     this.game.scene.remove(explosion);
                     geometry.dispose();
                     material.dispose();
                     return;
                 }
            }

            const now = performance.now();
            const delta = Math.min((now - lastTime) / 1000, 0.1); // Cap delta to avoid huge jumps
            lastTime = now;

            const finished = animState.update(delta);
            if (!finished) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    public shouldRemove(): boolean {
        return this.isDead;
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
