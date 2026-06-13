# Architecture

## Overview

The game follows an Entity-Component-System inspired architecture with a central Game controller managing the game loop, entities, and systems.

## Core Systems

### Game Loop (`core/GameLoop.ts`)
- Fixed timestep update (60 FPS target)
- Delta time smoothing for consistent physics
- RequestAnimationFrame-based rendering

### Game Controller (`core/Game.ts`)
- Initializes Three.js scene, camera, renderer
- Manages game state (menu, playing, paused, game over)
- Coordinates all managers and entities
- Handles wave progression and difficulty scaling

### Screen Effects (`core/ScreenEffects.ts`)
- Damage vignette overlay
- Hit markers
- Screen shake on explosions

## Managers

### InputManager
- Keyboard (WASD) and mouse input
- Pointer lock for FPS controls
- Touch controls for mobile (virtual joystick)

### AudioManager
- Procedurally generated weapon sounds (per-weapon type)
- Enemy and player feedback sounds
- Looping background music per level

### LevelManager
- Procedural level generation
- Wave configuration (enemy types, counts, health)
- Difficulty curve (exponential scaling)

### ParticleManager
- Object pooling for performance
- Muzzle flash particles
- Blood splatter effects
- Explosion particles
- Debris system

### UIManager
- HUD (health, ammo, wave, score)
- Crosshair system
- Shop interface
- Mystery box UI
- Mobile touch controls overlay

## Entities

### Player
- First-person camera controller
- Health system with invincibility frames
- Sphere-box collision detection
- Movement (walk, jump)

### Weapons
- Weapon switching system
- Per-weapon stats (damage, fire rate, magazine, reload time)
- Ammo management
- Recoil patterns
- Hit detection via raycasting

### Enemies
- **BasicEnemy** - Standard zombie, melee attack
- **FastZombieEnemy** - High speed, low health
- **FatZombieEnemy** - Slow, high health, area damage
- **GunnerZombieEnemy** - Ranged attacks
- **BossEnemy** - Large, special attacks, appears at milestones

### Interactables
- **MysteryBox** - Random weapon drops
- **ShopStation** - Buy weapons and upgrades
- **Pickup** - Health and ammo pickups

## Performance

- Delta time smoothing for consistent physics
- Particle count capping (pool limit of 200)
- Mobile-specific optimizations (reduced DPR, basic shadow maps, no anti-aliasing)
- Manual shadow map updates

## Build

```
Three.js (rendering) -> Vite (bundling) -> GitHub Pages (hosting)
```

TypeScript strict mode throughout. No runtime dependencies beyond Three.js and Howler.js.
