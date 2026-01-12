import * as THREE from 'three';
import { Game } from '../core/Game';

export enum ParticleType {
  MUZZLE_FLASH = 'MUZZLE_FLASH',
  IMPACT = 'IMPACT',
  BLOOD = 'BLOOD',
  EXPLOSION = 'EXPLOSION',
  SMOKE = 'SMOKE',
  SHELL = 'SHELL'
}

interface Particle {
  mesh: THREE.Mesh;
  type: ParticleType;
  velocity: THREE.Vector3;
  lifetime: number;
  maxLifetime: number;
  scale: number;
  rotationSpeed: THREE.Vector3;
  active: boolean;
}

export class ParticleManager {
  private game: Game;
  private particles: Particle[] = [];
  private poolSize: number = 200;
  private particleGroup: THREE.Group;

  // Geometries
  private boxGeometry: THREE.BoxGeometry;
  private sphereGeometry: THREE.SphereGeometry;
  private shellGeometry: THREE.CylinderGeometry;

  // Materials
  private muzzleMaterial: THREE.MeshBasicMaterial;
  private impactMaterial: THREE.MeshBasicMaterial;
  private bloodMaterial: THREE.MeshBasicMaterial;
  private explosionMaterial: THREE.MeshBasicMaterial;
  private smokeMaterial: THREE.MeshBasicMaterial;
  private shellMaterial: THREE.MeshStandardMaterial;

  constructor(game: Game) {
    this.game = game;
    this.particleGroup = new THREE.Group();
    this.game.scene.add(this.particleGroup);

    // Initialize geometries
    this.boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.sphereGeometry = new THREE.SphereGeometry(1, 8, 8);
    this.shellGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.05, 6);
    this.shellGeometry.rotateX(Math.PI / 2);

    // Initialize materials
    this.muzzleMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffaa,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    this.impactMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true
    });
    this.bloodMaterial = new THREE.MeshBasicMaterial({
      color: 0xaa0000,
      transparent: true
    });
    this.explosionMaterial = new THREE.MeshBasicMaterial({
      color: 0xff5500,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
    this.smokeMaterial = new THREE.MeshBasicMaterial({
      color: 0x888888,
      transparent: true,
      opacity: 0.5
    });
    this.shellMaterial = new THREE.MeshStandardMaterial({
      color: 0xcfb53b,
      roughness: 0.3,
      metalness: 0.8
    });

    // Initialize pool
    this.initPool();
  }

  private initPool(): void {
    // We'll create meshes on demand or just reuse a generic one if possible?
    // Actually, it's better to instantiate them when needed or have separate pools per type.
    // For simplicity, we'll create a single array and instantiate meshes as needed,
    // or just creating a bunch of simple meshes and reusing them is tricky if they have different geometries.
    // Let's just create new meshes for now and manage them in the array, but with a limit.
    // Optimization: In a real heavy app, we'd use InstancedMesh.
    // Given the constraints and existing code style, individual meshes are fine for < 500 particles.
  }

  public createParticle(
    type: ParticleType,
    position: THREE.Vector3,
    direction: THREE.Vector3,
    speed: number = 0
  ): void {
    if (this.particles.length >= this.poolSize) {
      // Remove oldest particle
      const old = this.particles.shift();
      if (old) {
        this.particleGroup.remove(old.mesh);
        // Geometries/Materials are shared, don't dispose them here
      }
    }

    let mesh: THREE.Mesh;
    let lifetime = 1.0;
    let scale = 1.0;
    const velocity = direction.clone().normalize().multiplyScalar(speed);
    const rotationSpeed = new THREE.Vector3(
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10
    );

    switch (type) {
      case ParticleType.MUZZLE_FLASH:
        mesh = new THREE.Mesh(this.sphereGeometry, this.muzzleMaterial);
        lifetime = 0.05;
        scale = 0.2 + Math.random() * 0.2;
        break;
      case ParticleType.IMPACT:
        mesh = new THREE.Mesh(this.sphereGeometry, this.impactMaterial);
        lifetime = 0.2;
        scale = 0.05 + Math.random() * 0.05;
        velocity.add(new THREE.Vector3((Math.random()-0.5), (Math.random()-0.5), (Math.random()-0.5)).multiplyScalar(2));
        break;
      case ParticleType.BLOOD:
        mesh = new THREE.Mesh(this.boxGeometry, this.bloodMaterial);
        lifetime = 0.5;
        scale = 0.05 + Math.random() * 0.05;
        velocity.add(new THREE.Vector3((Math.random()-0.5)*2, Math.random()*2, (Math.random()-0.5)*2)); // Spray
        // Add gravity effect in update
        break;
      case ParticleType.EXPLOSION:
        mesh = new THREE.Mesh(this.sphereGeometry, this.explosionMaterial);
        lifetime = 0.8;
        scale = 0.5 + Math.random();
        velocity.multiplyScalar(0.1); // Expand slowly
        break;
      case ParticleType.SMOKE:
        mesh = new THREE.Mesh(this.sphereGeometry, this.smokeMaterial);
        lifetime = 1.5;
        scale = 0.2 + Math.random() * 0.3;
        velocity.y += 0.5; // Rise
        velocity.add(new THREE.Vector3((Math.random()-0.5)*0.5, 0, (Math.random()-0.5)*0.5));
        break;
      case ParticleType.SHELL:
        mesh = new THREE.Mesh(this.shellGeometry, this.shellMaterial);
        lifetime = 2.0;
        scale = 1.0;
        // Shell casing physics are handled in update
        velocity.add(new THREE.Vector3((Math.random()-0.5)*0.5, 2 + Math.random(), (Math.random()-0.5)*0.5));
        break;
      default:
        mesh = new THREE.Mesh(this.boxGeometry, this.impactMaterial);
    }

    mesh.position.copy(position);
    mesh.scale.set(scale, scale, scale);
    this.particleGroup.add(mesh);

    this.particles.push({
      mesh,
      type,
      velocity,
      lifetime,
      maxLifetime: lifetime,
      scale,
      rotationSpeed,
      active: true
    });
  }

  public createExplosion(position: THREE.Vector3, count: number = 10, color: number = 0xff5500): void {
    // Flash
    const flash = new THREE.PointLight(color, 5, 10);
    flash.position.copy(position);
    this.game.scene.add(flash);
    setTimeout(() => this.game.scene.remove(flash), 100);

    // Particles
    for (let i = 0; i < count; i++) {
      const dir = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize();
      this.createParticle(ParticleType.EXPLOSION, position, dir, 2 + Math.random() * 5);
    }

    // Smoke
    for (let i = 0; i < count / 2; i++) {
       const dir = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random(),
        Math.random() - 0.5
      ).normalize();
       this.createParticle(ParticleType.SMOKE, position, dir, 1 + Math.random() * 2);
    }
  }

  public createBloodSplatter(position: THREE.Vector3, direction: THREE.Vector3, count: number = 5): void {
    for (let i = 0; i < count; i++) {
      const dir = direction.clone().add(new THREE.Vector3(
        (Math.random() - 0.5),
        (Math.random() - 0.5),
        (Math.random() - 0.5)
      )).normalize();
      this.createParticle(ParticleType.BLOOD, position, dir, 2 + Math.random() * 3);
    }
  }

  public update(delta: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.lifetime -= delta;

      if (p.lifetime <= 0) {
        this.particleGroup.remove(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }

      // Physics
      p.mesh.position.add(p.velocity.clone().multiplyScalar(delta));

      // Rotation
      p.mesh.rotation.x += p.rotationSpeed.x * delta;
      p.mesh.rotation.y += p.rotationSpeed.y * delta;
      p.mesh.rotation.z += p.rotationSpeed.z * delta;

      // Type specific behavior
      if (p.type === ParticleType.BLOOD || p.type === ParticleType.SHELL) {
        p.velocity.y -= 9.8 * delta; // Gravity

        // Floor collision
        if (p.mesh.position.y < 0.05) {
            p.mesh.position.y = 0.05;
            p.velocity.y *= -0.5; // Bounce
            p.velocity.x *= 0.5; // Friction
            p.velocity.z *= 0.5;
            if (p.velocity.length() < 0.1) {
                p.velocity.set(0,0,0);
                p.rotationSpeed.set(0,0,0);
            }
        }
      } else if (p.type === ParticleType.SMOKE) {
        p.velocity.y *= 0.9; // Drag
      }

      // Visual fading/scaling
      const lifeRatio = p.lifetime / p.maxLifetime;

      if (p.type === ParticleType.EXPLOSION) {
        // Expand
        const scale = p.scale * (1 + (1 - lifeRatio) * 3);
        p.mesh.scale.set(scale, scale, scale);
        (p.mesh.material as THREE.Material).opacity = lifeRatio;
      } else if (p.type === ParticleType.SMOKE) {
        const scale = p.scale * (1 + (1 - lifeRatio) * 2);
        p.mesh.scale.set(scale, scale, scale);
        (p.mesh.material as THREE.Material).opacity = lifeRatio * 0.5;
      } else if (p.type === ParticleType.IMPACT || p.type === ParticleType.MUZZLE_FLASH) {
         (p.mesh.material as THREE.Material).opacity = lifeRatio;
      }
    }
  }
}
