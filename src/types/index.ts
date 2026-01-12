import * as THREE from 'three';

// Game States
export enum GameState {
  LOADING = 'LOADING',
  MAIN_MENU = 'MAIN_MENU',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY',
  LEVEL_COMPLETE = 'LEVEL_COMPLETE'
}

// Enemy States
export enum EnemyState {
  IDLE = 'IDLE',
  PATROL = 'PATROL',
  ALERT = 'ALERT',
  CHASE = 'CHASE',
  ATTACK = 'ATTACK',
  DEAD = 'DEAD'
}

// Enemy Types
export enum EnemyType {
  BASIC = 'BASIC',
  FAST = 'FAST',
  BOSS = 'BOSS',
  ZOMBIE = 'ZOMBIE',
  FAT_ZOMBIE = 'FAT_ZOMBIE',
  FAST_ZOMBIE = 'FAST_ZOMBIE',
  GUNNER_ZOMBIE = 'GUNNER_ZOMBIE'
}

// Weapon Types
export enum WeaponType {
  PISTOL = 'PISTOL',
  RIFLE = 'RIFLE',
  SHOTGUN = 'SHOTGUN',
  SNIPER = 'SNIPER',
  KNIFE = 'KNIFE',
  MACHINE_GUN = 'MACHINE_GUN',
  ROCKET_LAUNCHER = 'ROCKET_LAUNCHER'
}

// Pickup Types
export enum PickupType {
  HEALTH = 'HEALTH',
  AMMO = 'AMMO',
  RIFLE_AMMO = 'RIFLE_AMMO',
  SHOTGUN_AMMO = 'SHOTGUN_AMMO',
  SNIPER_AMMO = 'SNIPER_AMMO',
  COIN = 'COIN'
}

// Player Configuration
export interface PlayerConfig {
  health: number;
  maxHealth: number;
  speed: number;
  lookSensitivity: number;
  height: number;
}

// Weapon Configuration
export interface WeaponConfig {
  name: string;
  type: WeaponType;
  damage: number;
  fireRate: number;
  magazineSize: number;
  maxReserveAmmo: number;
  reloadTime: number;
  range: number;
  spread: number;
  infiniteAmmo: boolean;
  pellets?: number; // For shotgun
  adsZoom?: number; // Aim down sights zoom multiplier
}

// Enemy Configuration
export interface EnemyConfig {
  type: EnemyType;
  health: number;
  speed: number;
  damage: number;
  attackRange: number;
  detectionRange: number;
  attackCooldown: number;
}

// Level Configuration
export interface LevelConfig {
  id: number;
  name: string;
  description: string;
  enemySpawns: EnemySpawn[];
  pickupSpawns: PickupSpawn[];
  playerSpawn: THREE.Vector3;
  ambientColor: number;
  fogColor: number;
  fogDensity: number;
  isEndless?: boolean;
}

// Spawn Point
export interface EnemySpawn {
  position: THREE.Vector3;
  type: EnemyType;
  wave: number;
}

export interface PickupSpawn {
  position: THREE.Vector3;
  type: PickupType;
  respawnTime?: number;
}

// Entity Interface
export interface Entity {
  mesh: THREE.Object3D;
  update(delta: number): void;
  dispose(): void;
}

// Damageable Interface
export interface Damageable {
  health: number;
  maxHealth: number;
  takeDamage(amount: number): void;
  isDead(): boolean;
}

// Audio Types
export interface SoundConfig {
  id: string;
  src: string;
  volume: number;
  loop: boolean;
}

// Input State
export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  shoot: boolean;
  reload: boolean;
  pause: boolean;
  jump: boolean;
  aim: boolean;
  melee: boolean;
  weapon1: boolean;
  weapon2: boolean;
  weapon3: boolean;
  weapon4: boolean;
  weapon5: boolean;
  weapon6: boolean;
  mouseMovement: { x: number; y: number };
}

// Game Stats
export interface GameStats {
  score: number;
  kills: number;
  accuracy: number;
  shotsFired: number;
  shotsHit: number;
  timeElapsed: number;
  currentLevel: number;
}

// Collision Layers
export const CollisionLayers = {
  PLAYER: 1,
  ENEMY: 2,
  ENVIRONMENT: 4,
  PROJECTILE: 8,
  PICKUP: 16
} as const;

// Color Palette
export const ColorPalette = {
  PRIMARY: 0x4A90D9,    // Blue (player elements)
  SECONDARY: 0xE74C3C,  // Red (enemies, danger)
  ACCENT: 0x2ECC71,     // Green (health, safe)
  NEUTRAL: 0x95A5A6,    // Gray (environment)
  DARK: 0x2C3E50,       // Dark blue (shadows)
  LIGHT: 0xECF0F1,      // Off-white (highlights)
  FLOOR: 0x3D5A80,      // Floor color
  WALL: 0x4A5568        // Wall color
} as const;

// Game Constants
export const GAME_CONSTANTS = {
  PLAYER: {
    DEFAULT_HEALTH: 100,
    DEFAULT_SPEED: 8,
    LOOK_SENSITIVITY: 0.0025,
    HEIGHT: 1.8,
    COLLISION_RADIUS: 0.5
  },
  WEAPONS: {
    PISTOL: {
      name: 'Pistol',
      type: WeaponType.PISTOL,
      damage: 15,
      fireRate: 0.25,
      magazineSize: 12,
      maxReserveAmmo: Infinity,
      reloadTime: 1.2,
      range: 50,
      spread: 0.03,
      infiniteAmmo: true,
      adsZoom: 1.2
    },
    RIFLE: {
      name: 'Assault Rifle',
      type: WeaponType.RIFLE,
      damage: 25,
      fireRate: 0.1,
      magazineSize: 30,
      maxReserveAmmo: 120,
      reloadTime: 2.0,
      range: 100,
      spread: 0.02,
      infiniteAmmo: false,
      adsZoom: 1.5
    },
    SHOTGUN: {
      name: 'Shotgun',
      type: WeaponType.SHOTGUN,
      damage: 15,
      fireRate: 0.8,
      magazineSize: 8,
      maxReserveAmmo: 32,
      reloadTime: 2.5,
      range: 20,
      spread: 0.15,
      infiniteAmmo: false,
      pellets: 8,
      adsZoom: 1.1
    },
    SNIPER: {
      name: 'Sniper Rifle',
      type: WeaponType.SNIPER,
      damage: 100,
      fireRate: 1.5,
      magazineSize: 5,
      maxReserveAmmo: 20,
      reloadTime: 3.0,
      range: 200,
      spread: 0.005,
      infiniteAmmo: false,
      adsZoom: 3.0
    },
    KNIFE: {
      name: 'Combat Knife',
      type: WeaponType.KNIFE,
      damage: 50,
      fireRate: 0.5,
      magazineSize: Infinity,
      maxReserveAmmo: Infinity,
      reloadTime: 0,
      range: 2.5,
      spread: 0,
      infiniteAmmo: true,
      adsZoom: 1.0
    },
    MACHINE_GUN: {
      name: 'Machine Gun',
      type: WeaponType.MACHINE_GUN,
      damage: 18,
      fireRate: 0.08,
      magazineSize: 50,
      maxReserveAmmo: 100,
      reloadTime: 3.5,
      range: 80,
      spread: 0.04,
      infiniteAmmo: false,
      adsZoom: 1.3
    },
    ROCKET_LAUNCHER: {
      name: 'Rocket Launcher',
      type: WeaponType.ROCKET_LAUNCHER,
      damage: 150, // Direct hit damage (AoE handled separately or combined)
      fireRate: 1.5,
      magazineSize: 4,
      maxReserveAmmo: 20,
      reloadTime: 3.0,
      range: 150,
      spread: 0.01,
      infiniteAmmo: false,
      adsZoom: 1.5
    }
  },
  ROCKET: {
    SPEED: 30,
    EXPLOSION_RADIUS: 8,
    EXPLOSION_DAMAGE: 120,
    LIFETIME: 5
  },
  ENEMY: {
    BASIC: {
      HEALTH: 30,
      SPEED: 3,
      DAMAGE: 10,
      ATTACK_RANGE: 2,
      DETECTION_RANGE: 20,
      ATTACK_COOLDOWN: 1.5
    },
    FAST: {
      HEALTH: 20,
      SPEED: 6,
      DAMAGE: 5,
      ATTACK_RANGE: 1.5,
      DETECTION_RANGE: 25,
      ATTACK_COOLDOWN: 0.8
    },
    BOSS: {
      HEALTH: 200,
      SPEED: 4,
      DAMAGE: 25,
      ATTACK_RANGE: 3,
      DETECTION_RANGE: 30,
      ATTACK_COOLDOWN: 2
    },
    ZOMBIE: {
      HEALTH: 40,
      SPEED: 2.5,
      DAMAGE: 15,
      ATTACK_RANGE: 2,
      DETECTION_RANGE: 50,
      ATTACK_COOLDOWN: 1.0
    },
    FAT_ZOMBIE: {
      HEALTH: 150,
      SPEED: 1.5,
      DAMAGE: 30,
      ATTACK_RANGE: 2.5,
      DETECTION_RANGE: 50,
      ATTACK_COOLDOWN: 2.0
    },
    FAST_ZOMBIE: {
      HEALTH: 25,
      SPEED: 6,
      DAMAGE: 10,
      ATTACK_RANGE: 1.5,
      DETECTION_RANGE: 50,
      ATTACK_COOLDOWN: 0.6
    },
    GUNNER_ZOMBIE: {
      HEALTH: 50,
      SPEED: 2,
      DAMAGE: 8,
      ATTACK_RANGE: 25,
      DETECTION_RANGE: 50,
      ATTACK_COOLDOWN: 1.5
    }
  },
  PICKUP: {
    HEALTH_AMOUNT: 25,
    AMMO_AMOUNT: 15,
    COIN_VALUE: 10,
    RESPAWN_TIME: 30
  },
  MYSTERY_BOX: {
    COST: 150,
    WEAPON_DURATION: 30, // Seconds before mystery box weapon disappears
    WEAPONS: [WeaponType.RIFLE, WeaponType.SHOTGUN, WeaponType.SNIPER, WeaponType.MACHINE_GUN, WeaponType.ROCKET_LAUNCHER]
  },
  SHOP: {
    HEALTH_COST: 50,
    HEALTH_AMOUNT: 50,
    AMMO_COST: 20
  }
} as const;

