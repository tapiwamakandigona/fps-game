import * as THREE from 'three';
import { Game } from '../core/Game';
import { Enemy } from '../entities/Enemy';
import { BasicEnemy } from '../entities/EnemyTypes/BasicEnemy';
import { FastEnemy } from '../entities/EnemyTypes/FastEnemy';
import { BossEnemy } from '../entities/EnemyTypes/BossEnemy';
import { ZombieEnemy } from '../entities/EnemyTypes/ZombieEnemy';
import { FatZombieEnemy } from '../entities/EnemyTypes/FatZombieEnemy';
import { FastZombieEnemy } from '../entities/EnemyTypes/FastZombieEnemy';
import { GunnerZombieEnemy } from '../entities/EnemyTypes/GunnerZombieEnemy';
import { Pickup } from '../entities/Pickup';
import { MysteryBox } from '../entities/MysteryBox';
import { ShopStation } from '../entities/ShopStation';
import { EnemyType, PickupType, ColorPalette, LevelConfig, EnemySpawn, PickupSpawn, GameState } from '../types';

export class LevelManager {
  private game: Game;
  private currentLevel: number = 0;
  private enemies: Enemy[] = [];
  private pickups: Pickup[] = [];
  private levelObjects: THREE.Object3D[] = [];
  private playerSpawn: THREE.Vector3 = new THREE.Vector3(0, 1.8, 0);
  private currentWave: number = 0;
  private maxWave: number = 1;
  private waveSpawnDelay: number = 3;
  private waveTimer: number = 0;
  private waveActive: boolean = false;

  // Endless mode properties
  private isEndlessMode: boolean = false;
  private endlessWaveCount: number = 0;
  private zombiesPerWave: number = 5;
  private zombieSpawnPoints: THREE.Vector3[] = [];
  private mysteryBox: MysteryBox | null = null;
  private healthStation: ShopStation | null = null;
  private ammoStation: ShopStation | null = null;
  private readonly maxZombiesCap: number = 10; // Hard cap on simultaneous zombies

  // Level configs
  private levelConfigs: LevelConfig[] = [
    // Level 1: Training Grounds
    {
      id: 1,
      name: 'Training Grounds',
      description: 'An open outdoor area to learn the basics',
      enemySpawns: [
        { position: new THREE.Vector3(10, 0, 10), type: EnemyType.BASIC, wave: 1 },
        { position: new THREE.Vector3(-10, 0, 10), type: EnemyType.BASIC, wave: 1 },
        { position: new THREE.Vector3(0, 0, 15), type: EnemyType.BASIC, wave: 1 },
        { position: new THREE.Vector3(15, 0, -5), type: EnemyType.BASIC, wave: 2 },
        { position: new THREE.Vector3(-15, 0, -5), type: EnemyType.BASIC, wave: 2 },
      ],
      pickupSpawns: [
        { position: new THREE.Vector3(5, 0.5, 5), type: PickupType.HEALTH },
        { position: new THREE.Vector3(-5, 0.5, 5), type: PickupType.AMMO },
        { position: new THREE.Vector3(0, 0.5, -10), type: PickupType.HEALTH },
      ],
      playerSpawn: new THREE.Vector3(0, 0, -15),
      ambientColor: 0x404060,
      fogColor: 0x1a1a2e,
      fogDensity: 0.015
    },
    // Level 2: The Warehouse
    {
      id: 2,
      name: 'The Warehouse',
      description: 'An indoor industrial environment',
      enemySpawns: [
        { position: new THREE.Vector3(8, 0, 8), type: EnemyType.BASIC, wave: 1 },
        { position: new THREE.Vector3(-8, 0, 8), type: EnemyType.BASIC, wave: 1 },
        { position: new THREE.Vector3(12, 0, 0), type: EnemyType.FAST, wave: 1 },
        { position: new THREE.Vector3(-12, 0, 0), type: EnemyType.BASIC, wave: 2 },
        { position: new THREE.Vector3(0, 0, 12), type: EnemyType.BASIC, wave: 2 },
        { position: new THREE.Vector3(8, 0, -8), type: EnemyType.FAST, wave: 2 },
        { position: new THREE.Vector3(-8, 0, -8), type: EnemyType.BASIC, wave: 3 },
        { position: new THREE.Vector3(0, 0, -12), type: EnemyType.BASIC, wave: 3 },
        { position: new THREE.Vector3(15, 0, 15), type: EnemyType.FAST, wave: 3 },
      ],
      pickupSpawns: [
        { position: new THREE.Vector3(10, 0.5, 0), type: PickupType.HEALTH },
        { position: new THREE.Vector3(-10, 0.5, 0), type: PickupType.AMMO },
        { position: new THREE.Vector3(0, 0.5, 10), type: PickupType.AMMO },
        { position: new THREE.Vector3(0, 0.5, -10), type: PickupType.HEALTH },
      ],
      playerSpawn: new THREE.Vector3(0, 0, -18),
      ambientColor: 0x303040,
      fogColor: 0x16213e,
      fogDensity: 0.02
    },
    // Level 3: Zombie Survival (Endless Mode)
    {
      id: 3,
      name: 'Zombie Survival',
      description: 'Survive endless waves of the undead',
      isEndless: true,
      enemySpawns: [], // Zombies are spawned dynamically
      pickupSpawns: [
        // No free pickups in zombie mode - must buy from shop stations
      ],
      playerSpawn: new THREE.Vector3(0, 0, 0),
      ambientColor: 0x101020,
      fogColor: 0x050510,
      fogDensity: 0.03
    }
  ];

  constructor(game: Game) {
    this.game = game;
  }

  public async loadLevel(levelId: number): Promise<void> {
    // Clear previous level
    this.clearLevel();

    // Get level config
    const config = this.levelConfigs[levelId - 1];
    if (!config) {
      console.error(`Level ${levelId} not found`);
      return;
    }

    this.currentLevel = levelId;
    this.playerSpawn = config.playerSpawn.clone();
    this.isEndlessMode = config.isEndless || false;

    if (this.isEndlessMode) {
      // Endless mode setup
      this.endlessWaveCount = 0;
      this.zombiesPerWave = 5;
      this.currentWave = 0;
      this.maxWave = Infinity;
      this.waveActive = false;
      this.waveTimer = 2; // Start first wave after 2 seconds

      // Define zombie spawn points around the edges
      this.zombieSpawnPoints = [
        new THREE.Vector3(22, 0, 22),
        new THREE.Vector3(-22, 0, 22),
        new THREE.Vector3(22, 0, -22),
        new THREE.Vector3(-22, 0, -22),
        new THREE.Vector3(22, 0, 0),
        new THREE.Vector3(-22, 0, 0),
        new THREE.Vector3(0, 0, 22),
        new THREE.Vector3(0, 0, -22),
        new THREE.Vector3(15, 0, 22),
        new THREE.Vector3(-15, 0, 22),
        new THREE.Vector3(15, 0, -22),
        new THREE.Vector3(-15, 0, -22),
      ];

      // Configure weapon system for zombie mode
      if (this.game.player) {
        this.game.player.weaponSystem.configureZombieMode();
      }

      // Show coins UI
      this.game.uiManager.showCoins(true);
    } else {
      // Normal level setup
      this.maxWave = Math.max(...config.enemySpawns.map(s => s.wave));
      this.currentWave = 0;
      this.waveActive = false;
      this.waveTimer = 0;
    }

    // Setup scene
    this.setupLighting(config);
    this.setupFog(config);
    this.buildEnvironment(levelId);

    // Create pickups
    config.pickupSpawns.forEach(spawn => {
      this.createPickup(spawn);
    });

    // Show wave UI for endless mode
    if (this.isEndlessMode) {
      this.game.uiManager.updateWave(1, true);
    } else {
      this.game.uiManager.updateWave(0, false);
    }

    // Start first wave
    if (!this.isEndlessMode) {
      this.startNextWave();
    }
  }

  private clearLevel(): void {
    // Remove enemies
    this.enemies.forEach(enemy => {
      this.game.scene.remove(enemy.mesh);
      enemy.dispose();
    });
    this.enemies = [];

    // Remove pickups
    this.pickups.forEach(pickup => {
      this.game.scene.remove(pickup.mesh);
      pickup.dispose();
    });
    this.pickups = [];

    // Remove level-specific objects (lights, walls, props, etc.)
    this.levelObjects.forEach(obj => {
      this.game.scene.remove(obj);
    });
    this.levelObjects = [];

    // Ensure any boss UI is hidden when leaving a level
    this.game.uiManager.showBossHealth(false);
  }

  private setupLighting(config: LevelConfig): void {
    // Ambient light
    const ambient = new THREE.AmbientLight(config.ambientColor, 0.4);
    this.game.scene.add(ambient);
    this.levelObjects.push(ambient);

    // Directional light (sun)
    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(10, 20, 10);
    directional.castShadow = true;
    directional.shadow.mapSize.width = 2048;
    directional.shadow.mapSize.height = 2048;
    directional.shadow.camera.near = 0.5;
    directional.shadow.camera.far = 50;
    directional.shadow.camera.left = -30;
    directional.shadow.camera.right = 30;
    directional.shadow.camera.top = 30;
    directional.shadow.camera.bottom = -30;
    this.game.scene.add(directional);
    this.levelObjects.push(directional);

    // Point lights for atmosphere
    if (this.currentLevel === 3) {
      // Red lights for boss arena
      const light1 = new THREE.PointLight(0xff0000, 0.5, 20);
      light1.position.set(15, 5, 15);
      this.game.scene.add(light1);
      this.levelObjects.push(light1);

      const light2 = new THREE.PointLight(0xff0000, 0.5, 20);
      light2.position.set(-15, 5, -15);
      this.game.scene.add(light2);
      this.levelObjects.push(light2);
    }
  }

  private setupFog(config: LevelConfig): void {
    this.game.scene.fog = new THREE.FogExp2(config.fogColor, config.fogDensity);
    this.game.renderer.setClearColor(config.fogColor);
  }

  private buildEnvironment(levelId: number): void {
    // Create floor
    const floorGeometry = new THREE.PlaneGeometry(50, 50);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: ColorPalette.FLOOR,
      roughness: 0.8,
      metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.game.scene.add(floor);
    this.levelObjects.push(floor);

    // Create grid pattern on floor
    const gridHelper = new THREE.GridHelper(50, 50, 0x444444, 0x333333);
    gridHelper.position.y = 0.01;
    this.game.scene.add(gridHelper);
    this.levelObjects.push(gridHelper);

    // Build level-specific geometry
    switch (levelId) {
      case 1:
        this.buildLevel1();
        break;
      case 2:
        this.buildLevel2();
        break;
      case 3:
        this.buildLevel3();
        break;
    }

    // Create boundary walls
    this.createBoundaryWalls();
  }

  private buildLevel1(): void {
    // Training grounds - open area with some obstacles
    const boxMaterial = new THREE.MeshStandardMaterial({
      color: ColorPalette.NEUTRAL,
      roughness: 0.7
    });

    // Crates/barriers
    const cratePositions = [
      { x: 5, z: 0 },
      { x: -5, z: 0 },
      { x: 0, z: 5 },
      { x: 8, z: 8 },
      { x: -8, z: 8 },
      { x: 10, z: -5 },
      { x: -10, z: -5 },
    ];

    cratePositions.forEach(pos => {
      const crate = this.createCrate(pos.x, pos.z, boxMaterial);
      this.game.scene.add(crate);
      this.levelObjects.push(crate);
    });

    // Pillars
    const pillarMaterial = new THREE.MeshStandardMaterial({
      color: 0x5a6a7a,
      roughness: 0.5
    });

    const pillarPositions = [
      { x: 15, z: 15 },
      { x: -15, z: 15 },
      { x: 15, z: -15 },
      { x: -15, z: -15 },
    ];

    pillarPositions.forEach(pos => {
      const pillar = this.createPillar(pos.x, pos.z, pillarMaterial);
      this.game.scene.add(pillar);
      this.levelObjects.push(pillar);
    });
  }

  private buildLevel2(): void {
    // Warehouse - more enclosed with rooms
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: ColorPalette.WALL,
      roughness: 0.9
    });

    const boxMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      roughness: 0.8
    });

    // Central pillar
    const centerPillar = this.createPillar(0, 0, wallMaterial, 2, 6);
    this.game.scene.add(centerPillar);
    this.levelObjects.push(centerPillar);

    // Create interior walls
    const wallPositions = [
      { x: 10, z: 5, rotY: 0, width: 8 },
      { x: -10, z: 5, rotY: 0, width: 8 },
      { x: 10, z: -5, rotY: 0, width: 8 },
      { x: -10, z: -5, rotY: 0, width: 8 },
      { x: 5, z: 10, rotY: Math.PI / 2, width: 6 },
      { x: -5, z: -10, rotY: Math.PI / 2, width: 6 },
    ];

    wallPositions.forEach(pos => {
      const wall = this.createWall(pos.x, pos.z, pos.rotY, pos.width, wallMaterial);
      this.game.scene.add(wall);
      this.levelObjects.push(wall);
    });

    // Crates scattered around
    const cratePositions = [
      { x: 5, z: -5 },
      { x: -5, z: 5 },
      { x: 12, z: 12 },
      { x: -12, z: -12 },
      { x: 15, z: 0 },
      { x: -15, z: 0 },
    ];

    cratePositions.forEach(pos => {
      const crate = this.createCrate(pos.x, pos.z, boxMaterial);
      this.game.scene.add(crate);
      this.levelObjects.push(crate);
    });
  }

  private buildLevel3(): void {
    // ZOMBIE SURVIVAL MAP - Dark graveyard theme (no safe platform)

    // Tombstone material
    const tombstoneMaterial = new THREE.MeshStandardMaterial({
      color: 0x555566,
      roughness: 0.8,
      metalness: 0.1
    });

    // Dead tree/pillar material
    const deadWoodMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a1a0a,
      roughness: 0.9,
      metalness: 0
    });

    // Fence material
    const fenceMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.6,
      metalness: 0.7
    });

    // Central bonfire (visual only, no collision)
    const bonfireMaterial = new THREE.MeshStandardMaterial({
      color: 0xff6600,
      emissive: 0xff3300,
      emissiveIntensity: 0.8
    });

    const bonfireBase = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 2, 0.3, 8),
      new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    bonfireBase.position.set(0, 0.15, 0);
    this.game.scene.add(bonfireBase);
    this.levelObjects.push(bonfireBase);

    // Fire glow
    const fireLight = new THREE.PointLight(0xff6600, 2, 15);
    fireLight.position.set(0, 1.5, 0);
    this.game.scene.add(fireLight);
    this.levelObjects.push(fireLight);

    // Animated fire effect (simple cone)
    const fireGeom = new THREE.ConeGeometry(0.8, 2, 6);
    const fire = new THREE.Mesh(fireGeom, bonfireMaterial);
    fire.position.set(0, 1.2, 0);
    this.game.scene.add(fire);
    this.levelObjects.push(fire);

    // ========== TOMBSTONES (cover) ==========
    const tombstonePositions = [
      { x: 10, z: 5 }, { x: -10, z: 5 }, { x: 10, z: -8 }, { x: -10, z: -8 },
      { x: 15, z: 12 }, { x: -15, z: 12 }, { x: 15, z: -12 }, { x: -15, z: -12 },
      { x: 8, z: 15 }, { x: -8, z: 15 }, { x: 8, z: -15 }, { x: -8, z: -15 },
      { x: 18, z: 5 }, { x: -18, z: 5 }, { x: 18, z: -5 }, { x: -18, z: -5 },
    ];

    tombstonePositions.forEach(pos => {
      // Tombstone base
      const tombGeom = new THREE.BoxGeometry(1.5, 2 + Math.random(), 0.4);
      const tomb = new THREE.Mesh(tombGeom, tombstoneMaterial);
      tomb.position.set(pos.x, 1, pos.z);
      tomb.rotation.y = Math.random() * 0.3 - 0.15; // Slight random tilt
      tomb.castShadow = true;
      tomb.receiveShadow = true;
      tomb.userData.isCollider = true;
      this.game.scene.add(tomb);
      this.levelObjects.push(tomb);

      // Cross on some tombstones
      if (Math.random() > 0.5) {
        const crossV = new THREE.Mesh(
          new THREE.BoxGeometry(0.15, 1, 0.15),
          tombstoneMaterial
        );
        crossV.position.set(pos.x, 2.5, pos.z);
        this.game.scene.add(crossV);
        this.levelObjects.push(crossV);

        const crossH = new THREE.Mesh(
          new THREE.BoxGeometry(0.6, 0.15, 0.15),
          tombstoneMaterial
        );
        crossH.position.set(pos.x, 2.8, pos.z);
        this.game.scene.add(crossH);
        this.levelObjects.push(crossH);
      }
    });

    // ========== DEAD TREES ==========
    const treePositions = [
      { x: 20, z: 15 }, { x: -20, z: 15 }, { x: 20, z: -15 }, { x: -20, z: -15 },
      { x: 12, z: 20 }, { x: -12, z: 20 }, { x: 12, z: -20 }, { x: -12, z: -20 },
    ];

    treePositions.forEach(pos => {
      // Trunk
      const trunkGeom = new THREE.CylinderGeometry(0.3, 0.5, 6, 6);
      const trunk = new THREE.Mesh(trunkGeom, deadWoodMaterial);
      trunk.position.set(pos.x, 3, pos.z);
      trunk.rotation.z = Math.random() * 0.2 - 0.1;
      trunk.castShadow = true;
      trunk.userData.isCollider = true;
      this.game.scene.add(trunk);
      this.levelObjects.push(trunk);

      // Dead branches
      for (let i = 0; i < 3; i++) {
        const branchGeom = new THREE.CylinderGeometry(0.05, 0.15, 2, 4);
        const branch = new THREE.Mesh(branchGeom, deadWoodMaterial);
        const angle = (i / 3) * Math.PI * 2 + Math.random();
        branch.position.set(
          pos.x + Math.cos(angle) * 0.8,
          4 + i * 0.5,
          pos.z + Math.sin(angle) * 0.8
        );
        branch.rotation.z = Math.PI / 4 + Math.random() * 0.5;
        branch.rotation.y = angle;
        this.game.scene.add(branch);
        this.levelObjects.push(branch);
      }
    });

    // ========== ATMOSPHERIC LIGHTING ==========
    // Eerie fog lights
    const fogLightPositions = [
      { x: 15, z: 15, color: 0x334455 },
      { x: -15, z: 15, color: 0x334455 },
      { x: 15, z: -15, color: 0x443344 },
      { x: -15, z: -15, color: 0x443344 },
      { x: 0, z: 20, color: 0x223344 },
      { x: 0, z: -20, color: 0x223344 },
    ];

    fogLightPositions.forEach(pos => {
      const light = new THREE.PointLight(pos.color, 0.5, 20);
      light.position.set(pos.x, 2, pos.z);
      this.game.scene.add(light);
      this.levelObjects.push(light);
    });

    // Moon light (dim blue)
    const moonLight = new THREE.DirectionalLight(0x6666aa, 0.3);
    moonLight.position.set(10, 30, 10);
    this.game.scene.add(moonLight);
    this.levelObjects.push(moonLight);

    // ========== IRON FENCE AROUND PERIMETER ==========
    const fenceHeight = 3;
    const fenceSpacing = 2;
    const arenaSize = 24;

    for (let i = -arenaSize; i <= arenaSize; i += fenceSpacing) {
      // North and South fences
      [-arenaSize, arenaSize].forEach(z => {
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.08, fenceHeight, 6),
          fenceMaterial
        );
        post.position.set(i, fenceHeight / 2, z);
        post.userData.isCollider = true;
        this.game.scene.add(post);
        this.levelObjects.push(post);

        // Spear top
        const spear = new THREE.Mesh(
          new THREE.ConeGeometry(0.1, 0.3, 4),
          fenceMaterial
        );
        spear.position.set(i, fenceHeight + 0.15, z);
        this.game.scene.add(spear);
        this.levelObjects.push(spear);
      });

      // East and West fences
      [arenaSize, -arenaSize].forEach(x => {
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.08, fenceHeight, 6),
          fenceMaterial
        );
        post.position.set(x, fenceHeight / 2, i);
        post.userData.isCollider = true;
        this.game.scene.add(post);
        this.levelObjects.push(post);

        const spear = new THREE.Mesh(
          new THREE.ConeGeometry(0.1, 0.3, 4),
          fenceMaterial
        );
        spear.position.set(x, fenceHeight + 0.15, i);
        this.game.scene.add(spear);
        this.levelObjects.push(spear);
      });
    }

    // ========== MYSTERY BOX ==========
    this.mysteryBox = new MysteryBox(this.game, new THREE.Vector3(-20, 0, 0));
    this.game.scene.add(this.mysteryBox.mesh);
    this.levelObjects.push(this.mysteryBox.mesh);

    // ========== HEALTH STATION ==========
    this.healthStation = new ShopStation(this.game, new THREE.Vector3(15, 0, 15), 'health');
    this.game.scene.add(this.healthStation.mesh);
    this.levelObjects.push(this.healthStation.mesh);

    // ========== AMMO STATION ==========
    this.ammoStation = new ShopStation(this.game, new THREE.Vector3(15, 0, -15), 'ammo');
    this.game.scene.add(this.ammoStation.mesh);
    this.levelObjects.push(this.ammoStation.mesh);
  }

  private createCrate(x: number, z: number, material: THREE.Material): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const crate = new THREE.Mesh(geometry, material);
    crate.position.set(x, 1, z);
    crate.castShadow = true;
    crate.receiveShadow = true;
    crate.userData.isCollider = true;
    return crate;
  }

  private createPillar(x: number, z: number, material: THREE.Material, radius: number = 1, height: number = 5): THREE.Mesh {
    const geometry = new THREE.CylinderGeometry(radius, radius, height, 8);
    const pillar = new THREE.Mesh(geometry, material);
    pillar.position.set(x, height / 2, z);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    pillar.userData.isCollider = true;
    return pillar;
  }

  private createWall(x: number, z: number, rotY: number, width: number, material: THREE.Material): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(width, 4, 0.5);
    const wall = new THREE.Mesh(geometry, material);
    wall.position.set(x, 2, z);
    wall.rotation.y = rotY;
    wall.castShadow = true;
    wall.receiveShadow = true;
    wall.userData.isCollider = true;
    return wall;
  }

  private createPlatform(x: number, z: number, material: THREE.Material): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(6, 1, 6);
    const platform = new THREE.Mesh(geometry, material);
    platform.position.set(x, 0.5, z);
    platform.castShadow = true;
    platform.receiveShadow = true;
    platform.userData.isCollider = true;
    return platform;
  }

  private createBoundaryWalls(): void {
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: ColorPalette.DARK,
      roughness: 0.9
    });

    const size = 25;
    const height = 8;
    const thickness = 1;

    // North wall
    const northWall = new THREE.Mesh(
      new THREE.BoxGeometry(size * 2, height, thickness),
      wallMaterial
    );
    northWall.position.set(0, height / 2, size);
    northWall.userData.isCollider = true;
    this.game.scene.add(northWall);
    this.levelObjects.push(northWall);

    // South wall
    const southWall = new THREE.Mesh(
      new THREE.BoxGeometry(size * 2, height, thickness),
      wallMaterial
    );
    southWall.position.set(0, height / 2, -size);
    southWall.userData.isCollider = true;
    this.game.scene.add(southWall);
    this.levelObjects.push(southWall);

    // East wall
    const eastWall = new THREE.Mesh(
      new THREE.BoxGeometry(thickness, height, size * 2),
      wallMaterial
    );
    eastWall.position.set(size, height / 2, 0);
    eastWall.userData.isCollider = true;
    this.game.scene.add(eastWall);
    this.levelObjects.push(eastWall);

    // West wall
    const westWall = new THREE.Mesh(
      new THREE.BoxGeometry(thickness, height, size * 2),
      wallMaterial
    );
    westWall.position.set(-size, height / 2, 0);
    westWall.userData.isCollider = true;
    this.game.scene.add(westWall);
    this.levelObjects.push(westWall);
  }

  private startNextWave(): void {
    this.currentWave++;
    this.waveActive = true;

    const config = this.levelConfigs[this.currentLevel - 1];
    if (!config) return;

    // Spawn enemies for this wave
    const waveSpawns = config.enemySpawns.filter(s => s.wave === this.currentWave);
    waveSpawns.forEach(spawn => {
      this.spawnEnemy(spawn);
    });
  }

  private spawnEnemy(spawn: EnemySpawn): void {
    let enemy: Enemy;

    switch (spawn.type) {
      case EnemyType.FAST:
        enemy = new FastEnemy(this.game, spawn.position.clone());
        break;
      case EnemyType.BOSS:
        enemy = new BossEnemy(this.game, spawn.position.clone());
        this.game.uiManager.showBossHealth(true);
        break;
      case EnemyType.ZOMBIE:
        enemy = new ZombieEnemy(this.game, spawn.position.clone());
        break;
      case EnemyType.BASIC:
      default:
        enemy = new BasicEnemy(this.game, spawn.position.clone());
        break;
    }

    this.enemies.push(enemy);
    this.game.scene.add(enemy.mesh);
  }

  private spawnZombieWave(): void {
    this.endlessWaveCount++;
    this.currentWave = this.endlessWaveCount;
    this.waveActive = true;

    // Show wave announcement
    this.game.uiManager.showWaveAnnouncement(this.endlessWaveCount);
    this.game.uiManager.updateWave(this.endlessWaveCount, true);

    // Play wave start sound
    this.game.audioManager.playSound('waveStart');

    // Calculate how many zombies to spawn (respecting the hard cap)
    const waveZombieTarget = Math.min(this.maxZombiesCap, 5 + Math.floor(this.endlessWaveCount / 2));
    const currentZombies = this.enemies.length;
    const zombiesToSpawn = Math.max(0, waveZombieTarget - currentZombies);

    // Zombie stats scale with waves
    const healthMultiplier = 1 + (this.endlessWaveCount - 1) * 0.1; // +10% health per wave
    const damageMultiplier = 1 + (this.endlessWaveCount - 1) * 0.05; // +5% damage per wave
    const speedMultiplier = 1 + Math.min(1, (this.endlessWaveCount - 1) * 0.08); // Caps at 2x

    // Spawn zombies with staggered timing
    for (let i = 0; i < zombiesToSpawn; i++) {
      setTimeout(() => {
        if (this.game.getGameState() !== GameState.PLAYING) return;
        if (this.enemies.length >= this.maxZombiesCap) return; // Double check cap

        const spawnPoint = this.zombieSpawnPoints[
          Math.floor(Math.random() * this.zombieSpawnPoints.length)
        ];

        const offset = new THREE.Vector3(
          (Math.random() - 0.5) * 4,
          0,
          (Math.random() - 0.5) * 4
        );

        const position = spawnPoint.clone().add(offset);

        // Determine zombie type based on wave
        let zombie: Enemy;

        if (this.endlessWaveCount >= 8 && Math.random() < 0.15) {
          // Wave 8+: 15% chance for Gunner Zombie
          zombie = new GunnerZombieEnemy(this.game, position);
        } else if (this.endlessWaveCount >= 6 && Math.random() < 0.2) {
          // Wave 6+: 20% chance for Fat Zombie
          zombie = new FatZombieEnemy(this.game, position);
        } else if (this.endlessWaveCount >= 4 && Math.random() < 0.25) {
          // Wave 4+: 25% chance for Fast Zombie
          zombie = new FastZombieEnemy(this.game, position);
        } else {
          // Regular zombie with speed scaling
          zombie = new ZombieEnemy(this.game, position, speedMultiplier);
        }

        this.enemies.push(zombie);
        this.game.scene.add(zombie.mesh);
      }, i * 300); // 300ms between spawns
    }
  }

  // Continuous spawning for endless mode (called from update)
  private checkZombieRespawn(): void {
    if (!this.isEndlessMode) return;
    if (this.game.getGameState() !== GameState.PLAYING) return;

    // If we're below the cap, spawn more zombies
    if (this.enemies.length < this.maxZombiesCap * 0.5) { // Below 50% capacity
      this.spawnSingleZombie();
    }
  }

  private spawnSingleZombie(): void {
    if (this.enemies.length >= this.maxZombiesCap) return;

    const spawnPoint = this.zombieSpawnPoints[
      Math.floor(Math.random() * this.zombieSpawnPoints.length)
    ];

    const offset = new THREE.Vector3(
      (Math.random() - 0.5) * 4,
      0,
      (Math.random() - 0.5) * 4
    );

    const position = spawnPoint.clone().add(offset);
    const speedMultiplier = 1 + Math.min(1, (this.endlessWaveCount - 1) * 0.08);

    // Determine type based on wave
    let zombie: Enemy;
    const rand = Math.random();

    if (this.endlessWaveCount >= 8 && rand < 0.1) {
      zombie = new GunnerZombieEnemy(this.game, position);
    } else if (this.endlessWaveCount >= 6 && rand < 0.15) {
      zombie = new FatZombieEnemy(this.game, position);
    } else if (this.endlessWaveCount >= 4 && rand < 0.2) {
      zombie = new FastZombieEnemy(this.game, position);
    } else {
      zombie = new ZombieEnemy(this.game, position, speedMultiplier);
    }

    this.enemies.push(zombie);
    this.game.scene.add(zombie.mesh);
  }

  private createPickup(spawn: PickupSpawn): void {
    const pickup = new Pickup(this.game, spawn.position.clone(), spawn.type);
    this.pickups.push(pickup);
    this.game.scene.add(pickup.mesh);
  }

  public update(delta: number): void {
    // Safety check: if game is not in playing state, don't update
    if (this.game.getGameState() !== GameState.PLAYING) {
      return;
    }

    // Update enemies with safe iteration
    const enemiesToRemove: Enemy[] = [];

    for (const enemy of this.enemies) {
      try {
        enemy.update(delta);

        if (enemy.isDead()) {
          enemiesToRemove.push(enemy);
        }
      } catch (e) {
        console.warn('Error updating enemy:', e);
        enemiesToRemove.push(enemy);
      }
    }

    // Remove dead enemies safely
    for (const enemy of enemiesToRemove) {
      try {
        // Check if boss and hide health bar
        if (enemy instanceof BossEnemy) {
          this.game.uiManager.showBossHealth(false);
        }

        this.game.scene.remove(enemy.mesh);
        enemy.dispose();

        const index = this.enemies.indexOf(enemy);
        if (index > -1) {
          this.enemies.splice(index, 1);
        }
      } catch (e) {
        console.warn('Error removing enemy:', e);
      }
    }

    // Update pickups safely
    for (const pickup of this.pickups) {
      try {
        pickup.update(delta);
      } catch (e) {
        console.warn('Error updating pickup:', e);
      }
    }

    // Update mystery box
    if (this.mysteryBox) {
      this.mysteryBox.update(delta);
    }

    // Update shop stations
    if (this.healthStation) {
      this.healthStation.update(delta);
    }
    if (this.ammoStation) {
      this.ammoStation.update(delta);
    }

    // Check for wave completion
    if (this.waveActive && this.enemies.length === 0) {
      this.waveActive = false;

      if (this.isEndlessMode) {
        // Endless mode: always spawn next wave after delay
        this.waveTimer = this.waveSpawnDelay;
      } else if (this.currentWave < this.maxWave) {
        // Normal mode: check if more waves
        this.waveTimer = this.waveSpawnDelay;
      }
    }

    // Handle wave timer
    if (!this.waveActive && this.waveTimer > 0) {
      this.waveTimer -= delta;
      if (this.waveTimer <= 0) {
        if (this.isEndlessMode) {
          this.spawnZombieWave();
        } else {
          this.startNextWave();
        }
      }
    }

    // Update boss health UI safely (not in endless mode)
    if (!this.isEndlessMode) {
      try {
        const boss = this.enemies.find(e => e instanceof BossEnemy) as BossEnemy | undefined;
        if (boss && !boss.isDead()) {
          const healthPercent = (boss.health / boss.maxHealth) * 100;
          this.game.uiManager.updateBossHealth(healthPercent);
        }
      } catch (e) {
        // Ignore boss UI update errors
      }
    }
  }

  public getPlayerSpawn(): THREE.Vector3 {
    return this.playerSpawn.clone();
  }

  public getEnemies(): Enemy[] {
    return this.enemies;
  }

  public getPickups(): Pickup[] {
    return this.pickups;
  }

  public removePickup(pickup: Pickup): void {
    const index = this.pickups.indexOf(pickup);
    if (index > -1) {
      this.pickups.splice(index, 1);
      this.game.scene.remove(pickup.mesh);
      pickup.dispose();
    }
  }

  public getLevelObjects(): THREE.Object3D[] {
    return this.levelObjects;
  }

  public isLevelComplete(): boolean {
    // Endless mode never completes (player survives until death)
    if (this.isEndlessMode) {
      return false;
    }
    // Level is complete when all waves are done and no enemies remain
    return this.currentWave >= this.maxWave && this.enemies.length === 0 && !this.waveActive;
  }

  public getCurrentLevel(): number {
    return this.currentLevel;
  }

  public getMysteryBox(): MysteryBox | null {
    return this.mysteryBox;
  }

  public getHealthStation(): ShopStation | null {
    return this.healthStation;
  }

  public getAmmoStation(): ShopStation | null {
    return this.ammoStation;
  }

  public dispose(): void {
    this.clearLevel();
  }
}
