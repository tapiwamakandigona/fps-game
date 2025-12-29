import * as THREE from 'three';
import { Game } from '../core/Game';
import { GAME_CONSTANTS, WeaponType, ColorPalette } from '../types';

interface WeaponData {
    type: WeaponType;
    name: string;
    damage: number;
    fireRate: number;
    magazineSize: number;
    currentAmmo: number;
    reserveAmmo: number;
    maxReserveAmmo: number;
    reloadTime: number;
    range: number;
    spread: number;
    infiniteAmmo: boolean;
    pellets: number;
    adsZoom: number;
    mesh: THREE.Group;
    isTemporary?: boolean; // Mystery box weapons are temporary
}

export class WeaponSystem {
    private game: Game;
    private weapons: Map<WeaponType, WeaponData> = new Map();
    private currentWeaponType: WeaponType = WeaponType.PISTOL;
    private currentWeapon: WeaponData | null = null;

    // State
    private fireTimer: number = 0;
    private isReloading: boolean = false;
    private reloadTimer: number = 0;
    private isAiming: boolean = false;
    private aimTransition: number = 0;

    // Animation
    private basePosition: THREE.Vector3 = new THREE.Vector3(0.3, -0.3, -0.5);
    private aimPosition: THREE.Vector3 = new THREE.Vector3(0, -0.15, -0.4);
    private kickbackAmount: number = 0;
    private swayAmount: THREE.Vector2 = new THREE.Vector2();
    private reloadAnimPhase: number = 0;

    // Knife attack state
    private isKnifeSwinging: boolean = false;
    private knifeSwingTimer: number = 0;

    // Visuals
    private muzzleFlash: THREE.PointLight;
    private muzzleFlashTimer: number = 0;

    // Raycasting
    private raycaster: THREE.Raycaster;

    // Mystery box weapon tracking
    private temporaryWeaponType: WeaponType | null = null;
    private temporaryWeaponTimer: number = 0; // 30 second timer for mystery box weapons
    private isZombieMode: boolean = false;

    // Container mesh (attached to camera)
    public containerMesh: THREE.Group;

    constructor(game: Game) {
        this.game = game;
        this.containerMesh = new THREE.Group();

        // Create muzzle flash
        this.muzzleFlash = new THREE.PointLight(0xffaa00, 0, 5);
        this.muzzleFlash.position.set(0, 0, -0.8);
        this.containerMesh.add(this.muzzleFlash);

        // Initialize raycaster
        this.raycaster = new THREE.Raycaster();

        // Initialize all weapons
        this.initWeapons();

        // Equip starting weapon
        this.equipWeapon(WeaponType.PISTOL);
    }

    private initWeapons(): void {
        // Pistol - infinite ammo backup weapon
        const pistolConfig = GAME_CONSTANTS.WEAPONS.PISTOL;
        this.weapons.set(WeaponType.PISTOL, {
            type: WeaponType.PISTOL,
            name: pistolConfig.name,
            damage: pistolConfig.damage,
            fireRate: pistolConfig.fireRate,
            magazineSize: pistolConfig.magazineSize,
            currentAmmo: pistolConfig.magazineSize,
            reserveAmmo: Infinity,
            maxReserveAmmo: Infinity,
            reloadTime: pistolConfig.reloadTime,
            range: pistolConfig.range,
            spread: pistolConfig.spread,
            infiniteAmmo: true,
            pellets: 1,
            adsZoom: pistolConfig.adsZoom || 1.2,
            mesh: this.createPistolModel()
        });

        // Rifle
        const rifleConfig = GAME_CONSTANTS.WEAPONS.RIFLE;
        this.weapons.set(WeaponType.RIFLE, {
            type: WeaponType.RIFLE,
            name: rifleConfig.name,
            damage: rifleConfig.damage,
            fireRate: rifleConfig.fireRate,
            magazineSize: rifleConfig.magazineSize,
            currentAmmo: rifleConfig.magazineSize,
            reserveAmmo: rifleConfig.maxReserveAmmo,
            maxReserveAmmo: rifleConfig.maxReserveAmmo,
            reloadTime: rifleConfig.reloadTime,
            range: rifleConfig.range,
            spread: rifleConfig.spread,
            infiniteAmmo: false,
            pellets: 1,
            adsZoom: rifleConfig.adsZoom || 1.5,
            mesh: this.createRifleModel()
        });

        // Shotgun
        const shotgunConfig = GAME_CONSTANTS.WEAPONS.SHOTGUN;
        this.weapons.set(WeaponType.SHOTGUN, {
            type: WeaponType.SHOTGUN,
            name: shotgunConfig.name,
            damage: shotgunConfig.damage,
            fireRate: shotgunConfig.fireRate,
            magazineSize: shotgunConfig.magazineSize,
            currentAmmo: shotgunConfig.magazineSize,
            reserveAmmo: shotgunConfig.maxReserveAmmo,
            maxReserveAmmo: shotgunConfig.maxReserveAmmo,
            reloadTime: shotgunConfig.reloadTime,
            range: shotgunConfig.range,
            spread: shotgunConfig.spread,
            infiniteAmmo: false,
            pellets: shotgunConfig.pellets || 8,
            adsZoom: shotgunConfig.adsZoom || 1.1,
            mesh: this.createShotgunModel()
        });

        // Sniper
        const sniperConfig = GAME_CONSTANTS.WEAPONS.SNIPER;
        this.weapons.set(WeaponType.SNIPER, {
            type: WeaponType.SNIPER,
            name: sniperConfig.name,
            damage: sniperConfig.damage,
            fireRate: sniperConfig.fireRate,
            magazineSize: sniperConfig.magazineSize,
            currentAmmo: sniperConfig.magazineSize,
            reserveAmmo: sniperConfig.maxReserveAmmo,
            maxReserveAmmo: sniperConfig.maxReserveAmmo,
            reloadTime: sniperConfig.reloadTime,
            range: sniperConfig.range,
            spread: sniperConfig.spread,
            infiniteAmmo: false,
            pellets: 1,
            adsZoom: sniperConfig.adsZoom || 3.0,
            mesh: this.createSniperModel()
        });

        // Knife
        const knifeConfig = GAME_CONSTANTS.WEAPONS.KNIFE;
        this.weapons.set(WeaponType.KNIFE, {
            type: WeaponType.KNIFE,
            name: knifeConfig.name,
            damage: knifeConfig.damage,
            fireRate: knifeConfig.fireRate,
            magazineSize: Infinity,
            currentAmmo: Infinity,
            reserveAmmo: Infinity,
            maxReserveAmmo: Infinity,
            reloadTime: 0,
            range: knifeConfig.range,
            spread: 0,
            infiniteAmmo: true,
            pellets: 1,
            adsZoom: 1.0,
            mesh: this.createKnifeModel()
        });

        // Machine Gun
        const mgConfig = GAME_CONSTANTS.WEAPONS.MACHINE_GUN;
        this.weapons.set(WeaponType.MACHINE_GUN, {
            type: WeaponType.MACHINE_GUN,
            name: mgConfig.name,
            damage: mgConfig.damage,
            fireRate: mgConfig.fireRate,
            magazineSize: mgConfig.magazineSize,
            currentAmmo: mgConfig.magazineSize,
            reserveAmmo: mgConfig.maxReserveAmmo,
            maxReserveAmmo: mgConfig.maxReserveAmmo,
            reloadTime: mgConfig.reloadTime,
            range: mgConfig.range,
            spread: mgConfig.spread,
            infiniteAmmo: false,
            pellets: 1,
            adsZoom: mgConfig.adsZoom || 1.3,
            mesh: this.createMachineGunModel()
        });
    }

    private createPistolModel(): THREE.Group {
        const group = new THREE.Group();

        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            roughness: 0.3,
            metalness: 0.8
        });

        const accentMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 0.6,
            metalness: 0.3
        });

        // Slide
        const slide = new THREE.Mesh(
            new THREE.BoxGeometry(0.04, 0.06, 0.2),
            bodyMaterial
        );
        slide.position.set(0, 0.03, -0.05);
        group.add(slide);

        // Barrel
        const barrel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.012, 0.012, 0.12, 8),
            bodyMaterial
        );
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.03, -0.2);
        group.add(barrel);

        // Grip
        const grip = new THREE.Mesh(
            new THREE.BoxGeometry(0.04, 0.1, 0.06),
            accentMaterial
        );
        grip.position.set(0, -0.05, 0.02);
        grip.rotation.x = 0.2;
        group.add(grip);

        // Trigger guard
        const guard = new THREE.Mesh(
            new THREE.TorusGeometry(0.02, 0.005, 8, 16, Math.PI),
            bodyMaterial
        );
        guard.position.set(0, -0.02, 0);
        guard.rotation.y = Math.PI / 2;
        group.add(guard);

        return group;
    }

    private createRifleModel(): THREE.Group {
        const group = new THREE.Group();

        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.4,
            metalness: 0.8
        });

        const accentMaterial = new THREE.MeshStandardMaterial({
            color: ColorPalette.PRIMARY,
            roughness: 0.3,
            metalness: 0.6
        });

        // Main body
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.12, 0.6),
            bodyMaterial
        );
        body.position.set(0, 0, -0.1);
        group.add(body);

        // Barrel
        const barrel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.025, 0.4, 8),
            bodyMaterial
        );
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.02, -0.5);
        group.add(barrel);

        // Stock
        const stock = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 0.1, 0.2),
            bodyMaterial
        );
        stock.position.set(0, -0.02, 0.2);
        stock.rotation.x = -0.2;
        group.add(stock);

        // Magazine
        const mag = new THREE.Mesh(
            new THREE.BoxGeometry(0.04, 0.15, 0.08),
            accentMaterial
        );
        mag.position.set(0, -0.12, 0);
        group.add(mag);

        // Sight
        const sight = new THREE.Mesh(
            new THREE.BoxGeometry(0.03, 0.04, 0.08),
            accentMaterial
        );
        sight.position.set(0, 0.08, -0.1);
        group.add(sight);

        return group;
    }

    private createShotgunModel(): THREE.Group {
        const group = new THREE.Group();

        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.5,
            metalness: 0.7
        });

        const woodMaterial = new THREE.MeshStandardMaterial({
            color: 0x5D3A1A,
            roughness: 0.8,
            metalness: 0.1
        });

        // Double barrel
        const barrel1 = new THREE.Mesh(
            new THREE.CylinderGeometry(0.025, 0.025, 0.5, 8),
            bodyMaterial
        );
        barrel1.rotation.x = Math.PI / 2;
        barrel1.position.set(-0.02, 0.02, -0.35);
        group.add(barrel1);

        const barrel2 = new THREE.Mesh(
            new THREE.CylinderGeometry(0.025, 0.025, 0.5, 8),
            bodyMaterial
        );
        barrel2.rotation.x = Math.PI / 2;
        barrel2.position.set(0.02, 0.02, -0.35);
        group.add(barrel2);

        // Receiver
        const receiver = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.1, 0.25),
            bodyMaterial
        );
        receiver.position.set(0, 0, 0);
        group.add(receiver);

        // Stock
        const stock = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.12, 0.3),
            woodMaterial
        );
        stock.position.set(0, -0.02, 0.25);
        stock.rotation.x = -0.15;
        group.add(stock);

        // Pump
        const pump = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 0.05, 0.12),
            woodMaterial
        );
        pump.position.set(0, -0.05, -0.2);
        group.add(pump);

        return group;
    }

    private createSniperModel(): THREE.Group {
        const group = new THREE.Group();

        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x2d2d2d,
            roughness: 0.3,
            metalness: 0.9
        });

        const scopeMaterial = new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.2,
            metalness: 0.95
        });

        // Long barrel
        const barrel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.025, 0.8, 8),
            bodyMaterial
        );
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.02, -0.5);
        group.add(barrel);

        // Body
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 0.1, 0.5),
            bodyMaterial
        );
        body.position.set(0, 0, 0);
        group.add(body);

        // Stock
        const stock = new THREE.Mesh(
            new THREE.BoxGeometry(0.05, 0.08, 0.25),
            bodyMaterial
        );
        stock.position.set(0, -0.02, 0.3);
        stock.rotation.x = -0.1;
        group.add(stock);

        // Scope
        const scope = new THREE.Mesh(
            new THREE.CylinderGeometry(0.025, 0.025, 0.2, 8),
            scopeMaterial
        );
        scope.rotation.x = Math.PI / 2;
        scope.position.set(0, 0.08, -0.05);
        group.add(scope);

        // Scope lens (front)
        const lensFront = new THREE.Mesh(
            new THREE.CircleGeometry(0.025, 16),
            new THREE.MeshStandardMaterial({ color: 0x3399ff, emissive: 0x001133, emissiveIntensity: 0.3 })
        );
        lensFront.position.set(0, 0.08, -0.15);
        group.add(lensFront);

        // Bipod
        const bipodMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8 });
        const leg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.15, 6), bipodMat);
        leg1.position.set(-0.04, -0.08, -0.3);
        leg1.rotation.z = 0.3;
        group.add(leg1);

        const leg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.15, 6), bipodMat);
        leg2.position.set(0.04, -0.08, -0.3);
        leg2.rotation.z = -0.3;
        group.add(leg2);

        return group;
    }

    private createKnifeModel(): THREE.Group {
        const group = new THREE.Group();

        const bladeMaterial = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            roughness: 0.2,
            metalness: 0.95
        });

        const handleMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.8,
            metalness: 0.2
        });

        // Blade
        const bladeShape = new THREE.Shape();
        bladeShape.moveTo(0, 0);
        bladeShape.lineTo(0.15, 0.01);
        bladeShape.lineTo(0.18, 0);
        bladeShape.lineTo(0.15, -0.01);
        bladeShape.lineTo(0, -0.015);
        bladeShape.lineTo(0, 0);

        const extrudeSettings = { depth: 0.008, bevelEnabled: false };
        const bladeGeom = new THREE.ExtrudeGeometry(bladeShape, extrudeSettings);
        const blade = new THREE.Mesh(bladeGeom, bladeMaterial);
        blade.rotation.y = Math.PI / 2;
        blade.position.set(0, 0.05, -0.1);
        group.add(blade);

        // Handle
        const handle = new THREE.Mesh(
            new THREE.BoxGeometry(0.025, 0.08, 0.03),
            handleMaterial
        );
        handle.position.set(0, 0, 0.02);
        group.add(handle);

        // Guard
        const guard = new THREE.Mesh(
            new THREE.BoxGeometry(0.04, 0.015, 0.015),
            bladeMaterial
        );
        guard.position.set(0, 0.02, -0.02);
        group.add(guard);

        return group;
    }

    private createMachineGunModel(): THREE.Group {
        const group = new THREE.Group();

        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            roughness: 0.4,
            metalness: 0.8
        });

        const accentMaterial = new THREE.MeshStandardMaterial({
            color: 0x444444,
            roughness: 0.5,
            metalness: 0.6
        });

        // Long body
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.12, 0.7),
            bodyMaterial
        );
        body.position.set(0, 0, -0.15);
        group.add(body);

        // Long barrel
        const barrel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.025, 0.03, 0.5, 8),
            bodyMaterial
        );
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.02, -0.65);
        group.add(barrel);

        // Box magazine
        const mag = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.2, 0.12),
            accentMaterial
        );
        mag.position.set(0, -0.18, 0);
        group.add(mag);

        // Stock
        const stock = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.1, 0.25),
            bodyMaterial
        );
        stock.position.set(0, -0.02, 0.25);
        stock.rotation.x = -0.1;
        group.add(stock);

        // Carry handle
        const handle = new THREE.Mesh(
            new THREE.BoxGeometry(0.03, 0.06, 0.15),
            accentMaterial
        );
        handle.position.set(0, 0.09, -0.1);
        group.add(handle);

        // Bipod legs
        const bipodMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7 });
        const leg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 6), bipodMat);
        leg1.position.set(-0.05, -0.1, -0.4);
        leg1.rotation.z = 0.4;
        group.add(leg1);

        const leg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 6), bipodMat);
        leg2.position.set(0.05, -0.1, -0.4);
        leg2.rotation.z = -0.4;
        group.add(leg2);

        return group;
    }

    public equipWeapon(type: WeaponType): void {
        // Remove current weapon mesh
        if (this.currentWeapon) {
            this.containerMesh.remove(this.currentWeapon.mesh);
        }

        // Get new weapon
        const weapon = this.weapons.get(type);
        if (!weapon) return;

        this.currentWeaponType = type;
        this.currentWeapon = weapon;
        this.isReloading = false;
        this.reloadTimer = 0;
        this.isAiming = false;
        this.aimTransition = 0;

        // Add weapon mesh
        weapon.mesh.position.copy(this.basePosition);
        this.containerMesh.add(weapon.mesh);

        // Update raycaster range
        this.raycaster.far = weapon.range;

        // Update UI
        this.updateUI();
    }

    public update(delta: number): void {
        if (!this.currentWeapon) return;

        // Update fire timer
        if (this.fireTimer > 0) {
            this.fireTimer -= delta;
        }

        // Update mystery box weapon timer
        if (this.temporaryWeaponTimer > 0 && this.temporaryWeaponType) {
            this.temporaryWeaponTimer -= delta;

            // Get weapon name for display
            const weapon = this.weapons.get(this.temporaryWeaponType);
            const weaponName = weapon ? weapon.name : 'MYSTERY WEAPON';

            // Update UI timer display
            this.game.uiManager.updateWeaponTimer(this.temporaryWeaponTimer, weaponName);

            if (this.temporaryWeaponTimer <= 0) {
                this.removeTemporaryWeapon();
                this.game.uiManager.hideWeaponTimer();
            }
        } else {
            // Hide timer if no temporary weapon
            this.game.uiManager.hideWeaponTimer();
        }

        // Handle reload animation
        if (this.isReloading) {
            this.reloadTimer -= delta;
            this.reloadAnimPhase += delta * 4;

            // Reload animation: weapon dips down and comes back up
            const reloadProgress = 1 - (this.reloadTimer / this.currentWeapon.reloadTime);
            if (reloadProgress < 0.3) {
                // Dip down
                this.currentWeapon.mesh.position.y = this.basePosition.y - (reloadProgress / 0.3) * 0.2;
                this.currentWeapon.mesh.rotation.x = (reloadProgress / 0.3) * 0.3;
            } else if (reloadProgress < 0.7) {
                // Stay down (magazine swap)
                this.currentWeapon.mesh.position.y = this.basePosition.y - 0.2;
                this.currentWeapon.mesh.rotation.x = 0.3;
            } else {
                // Come back up
                const upProgress = (reloadProgress - 0.7) / 0.3;
                this.currentWeapon.mesh.position.y = this.basePosition.y - 0.2 * (1 - upProgress);
                this.currentWeapon.mesh.rotation.x = 0.3 * (1 - upProgress);
            }

            if (this.reloadTimer <= 0) {
                this.completeReload();
            }
        }

        // Handle knife swing animation
        if (this.isKnifeSwinging) {
            this.knifeSwingTimer -= delta;
            const swingProgress = 1 - (this.knifeSwingTimer / 0.3);

            if (swingProgress < 0.5) {
                // Swing out
                this.currentWeapon.mesh.rotation.z = swingProgress * 2 * 1.5;
                this.currentWeapon.mesh.position.x = this.basePosition.x + swingProgress * 2 * 0.3;
            } else {
                // Swing back
                this.currentWeapon.mesh.rotation.z = (1 - swingProgress) * 2 * 1.5;
                this.currentWeapon.mesh.position.x = this.basePosition.x + (1 - swingProgress) * 2 * 0.3;
            }

            if (this.knifeSwingTimer <= 0) {
                this.isKnifeSwinging = false;
                this.currentWeapon.mesh.rotation.z = 0;
                this.currentWeapon.mesh.position.x = this.basePosition.x;
            }
        }

        // Handle aim transition
        if (this.isAiming) {
            this.aimTransition = Math.min(1, this.aimTransition + delta * 8);
        } else {
            this.aimTransition = Math.max(0, this.aimTransition - delta * 8);
        }

        // Apply aim position if not reloading or knife swinging
        if (!this.isReloading && !this.isKnifeSwinging) {
            const targetPos = new THREE.Vector3().lerpVectors(
                this.basePosition,
                this.aimPosition,
                this.aimTransition
            );

            this.applyWeaponSway(delta);

            this.currentWeapon.mesh.position.x = targetPos.x + this.swayAmount.x * (1 - this.aimTransition);
            this.currentWeapon.mesh.position.y = targetPos.y + this.swayAmount.y * (1 - this.aimTransition);
            this.currentWeapon.mesh.position.z = targetPos.z + this.kickbackAmount * 0.1;

            this.currentWeapon.mesh.rotation.x = -this.kickbackAmount * 0.2;
        }

        // Update muzzle flash
        if (this.muzzleFlashTimer > 0) {
            this.muzzleFlashTimer -= delta;
            this.muzzleFlash.intensity = this.muzzleFlashTimer > 0 ? 2 : 0;
        }

        // Apply kickback recovery
        if (this.kickbackAmount > 0) {
            this.kickbackAmount *= Math.pow(0.001, delta);
            if (this.kickbackAmount < 0.001) this.kickbackAmount = 0;
        }

        // Update camera FOV for ADS zoom
        if (this.currentWeapon) {
            const baseFOV = 75;
            const aimFOV = baseFOV / this.currentWeapon.adsZoom;
            this.game.camera.fov = THREE.MathUtils.lerp(baseFOV, aimFOV, this.aimTransition);
            this.game.camera.updateProjectionMatrix();
        }
    }

    private applyWeaponSway(delta: number): void {
        const targetSway = new THREE.Vector2();

        if (this.game.inputManager.isKeyPressed('KeyA') || this.game.inputManager.isKeyPressed('ArrowLeft')) {
            targetSway.x = 0.02;
        }
        if (this.game.inputManager.isKeyPressed('KeyD') || this.game.inputManager.isKeyPressed('ArrowRight')) {
            targetSway.x = -0.02;
        }
        if (this.game.inputManager.isKeyPressed('KeyW') || this.game.inputManager.isKeyPressed('ArrowUp')) {
            targetSway.y = -0.01;
        }
        if (this.game.inputManager.isKeyPressed('KeyS') || this.game.inputManager.isKeyPressed('ArrowDown')) {
            targetSway.y = 0.01;
        }

        this.swayAmount.x += (targetSway.x - this.swayAmount.x) * 5 * delta;
        this.swayAmount.y += (targetSway.y - this.swayAmount.y) * 5 * delta;
    }

    public setAiming(aiming: boolean): void {
        this.isAiming = aiming;
    }

    public shoot(): boolean {
        if (!this.currentWeapon) return false;
        if (this.fireTimer > 0) return false;
        if (this.isReloading) return false;
        if (this.isKnifeSwinging) return false;

        // Knife attack
        if (this.currentWeaponType === WeaponType.KNIFE) {
            return this.knifeAttack();
        }

        // Check ammo
        if (this.currentWeapon.currentAmmo <= 0) {
            this.game.audioManager.playSound('empty');
            this.reload();
            return false;
        }

        // Fire!
        this.currentWeapon.currentAmmo--;
        this.fireTimer = this.currentWeapon.fireRate;
        this.game.stats.shotsFired++;

        // Update UI
        this.updateUI();

        // Play sound based on weapon type
        switch (this.currentWeaponType) {
            case WeaponType.PISTOL:
                this.game.audioManager.playSound('pistolShoot');
                break;
            case WeaponType.RIFLE:
            case WeaponType.MACHINE_GUN:
                this.game.audioManager.playSound('rifleShoot');
                break;
            case WeaponType.SHOTGUN:
                this.game.audioManager.playSound('shotgunShoot');
                break;
            case WeaponType.SNIPER:
                this.game.audioManager.playSound('sniperShoot');
                break;
            default:
                this.game.audioManager.playSound('pistolShoot');
        }

        // Muzzle flash
        this.muzzleFlashTimer = 0.05;
        this.muzzleFlash.intensity = 2;

        // Kickback (more for shotgun, less for pistol)
        switch (this.currentWeaponType) {
            case WeaponType.SHOTGUN:
                this.kickbackAmount = 0.8;
                break;
            case WeaponType.SNIPER:
                this.kickbackAmount = 0.6;
                break;
            case WeaponType.RIFLE:
            case WeaponType.MACHINE_GUN:
                this.kickbackAmount = 0.4;
                break;
            default:
                this.kickbackAmount = 0.3;
        }

        // Perform raycast(s)
        for (let i = 0; i < this.currentWeapon.pellets; i++) {
            this.performRaycast();
        }

        return true;
    }

    private knifeAttack(): boolean {
        if (this.isKnifeSwinging) return false;
        if (!this.currentWeapon) return false;

        this.isKnifeSwinging = true;
        this.knifeSwingTimer = 0.3;
        this.fireTimer = this.currentWeapon.fireRate;

        // Play knife swing sound
        this.game.audioManager.playSound('knifeSwing');

        // Check for enemies in melee range
        const camera = this.game.camera;
        const origin = new THREE.Vector3();
        camera.getWorldPosition(origin);

        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion()));

        this.raycaster.set(origin, direction);
        this.raycaster.far = this.currentWeapon.range;

        const enemies = this.game.levelManager.getEnemies();
        const enemyMeshes = enemies.map(e => e.mesh);
        const hits = this.raycaster.intersectObjects(enemyMeshes, true);

        if (hits.length > 0) {
            for (const enemy of enemies) {
                let isHit = false;
                for (const hit of hits) {
                    if (enemy.mesh === hit.object) {
                        isHit = true;
                        break;
                    }
                    let parent = hit.object.parent;
                    while (parent) {
                        if (parent === enemy.mesh) {
                            isHit = true;
                            break;
                        }
                        parent = parent.parent;
                    }
                    if (isHit) break;
                }

                if (isHit) {
                    enemy.takeDamage(this.currentWeapon.damage);
                    this.game.stats.shotsHit++;
                    this.createHitEffect(hits[0].point, true);
                    break;
                }
            }
        }

        return true;
    }

    private performRaycast(): void {
        if (!this.currentWeapon) return;

        const camera = this.game.camera;
        const origin = new THREE.Vector3();
        camera.getWorldPosition(origin);

        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion()));

        // Add spread (reduced when aiming)
        const spreadMultiplier = this.isAiming ? 0.3 : 1;
        direction.x += (Math.random() - 0.5) * this.currentWeapon.spread * spreadMultiplier;
        direction.y += (Math.random() - 0.5) * this.currentWeapon.spread * spreadMultiplier;
        direction.normalize();

        this.raycaster.set(origin, direction);

        const enemies = this.game.levelManager.getEnemies();
        const enemyMeshes = enemies.map(e => e.mesh);
        const levelObjects = this.game.levelManager.getLevelObjects();

        // Check enemies first
        const enemyHits = this.raycaster.intersectObjects(enemyMeshes, true);

        if (enemyHits.length > 0) {
            const hit = enemyHits[0];

            for (const enemy of enemies) {
                let isHit = false;
                if (enemy.mesh === hit.object) {
                    isHit = true;
                } else {
                    let parent = hit.object.parent;
                    while (parent) {
                        if (parent === enemy.mesh) {
                            isHit = true;
                            break;
                        }
                        parent = parent.parent;
                    }
                }

                if (isHit) {
                    enemy.takeDamage(this.currentWeapon.damage);
                    this.game.stats.shotsHit++;
                    this.createHitEffect(hit.point, true);
                    return;
                }
            }
        }

        // Check walls
        const levelHits = this.raycaster.intersectObjects(levelObjects, true);
        if (levelHits.length > 0) {
            this.createHitEffect(levelHits[0].point, false);
        }
    }

    private createHitEffect(position: THREE.Vector3, isEnemy: boolean): void {
        const geometry = new THREE.SphereGeometry(0.1, 8, 8);
        const material = new THREE.MeshBasicMaterial({
            color: isEnemy ? 0xff0000 : 0xffff00,
            transparent: true,
            opacity: 1
        });

        const particle = new THREE.Mesh(geometry, material);
        particle.position.copy(position);
        this.game.scene.add(particle);

        let lifetime = 0;
        const animate = () => {
            lifetime += 0.016;

            const scale = 1 + lifetime * 5;
            particle.scale.set(scale, scale, scale);
            material.opacity = 1 - lifetime * 5;

            if (lifetime < 0.2) {
                requestAnimationFrame(animate);
            } else {
                this.game.scene.remove(particle);
                geometry.dispose();
                material.dispose();
            }
        };

        animate();

        if (isEnemy) {
            this.game.audioManager.playSound('enemyHit');
        } else {
            this.game.audioManager.playSound('hit');
        }
    }

    public reload(): void {
        if (!this.currentWeapon) return;
        if (this.isReloading) return;
        if (this.currentWeaponType === WeaponType.KNIFE) return;
        if (this.currentWeapon.currentAmmo === this.currentWeapon.magazineSize) return;

        // Check reserve ammo (except for infinite ammo weapons)
        if (!this.currentWeapon.infiniteAmmo && this.currentWeapon.reserveAmmo <= 0) {
            return;
        }

        this.isReloading = true;
        this.reloadTimer = this.currentWeapon.reloadTime;
        this.reloadAnimPhase = 0;

        this.game.uiManager.updateAmmo(
            this.currentWeapon.currentAmmo,
            this.currentWeapon.magazineSize,
            true
        );

        this.game.audioManager.playSound('reload');
    }

    private completeReload(): void {
        if (!this.currentWeapon) return;

        const ammoNeeded = this.currentWeapon.magazineSize - this.currentWeapon.currentAmmo;

        if (this.currentWeapon.infiniteAmmo) {
            this.currentWeapon.currentAmmo = this.currentWeapon.magazineSize;
        } else {
            const ammoToAdd = Math.min(ammoNeeded, this.currentWeapon.reserveAmmo);
            this.currentWeapon.currentAmmo += ammoToAdd;
            this.currentWeapon.reserveAmmo -= ammoToAdd;
        }

        this.isReloading = false;
        this.currentWeapon.mesh.rotation.x = 0;

        this.updateUI();
    }

    public addAmmo(type: WeaponType, amount: number): void {
        const weapon = this.weapons.get(type);
        if (!weapon || weapon.infiniteAmmo) return;

        // In zombie mode, ammo pickups only work for pistol (not mystery box weapons)
        if (this.isZombieMode && weapon.isTemporary) {
            return; // Don't add ammo to mystery box weapons
        }

        weapon.reserveAmmo = Math.min(weapon.maxReserveAmmo, weapon.reserveAmmo + amount);

        if (type === this.currentWeaponType) {
            this.updateUI();
        }
    }

    // Configure for zombie mode (Level 3)
    public configureZombieMode(): void {
        this.isZombieMode = true;
        this.temporaryWeaponType = null;
        this.temporaryWeaponTimer = 0;

        // Make pistol have limited ammo in zombie mode and reset it
        const pistol = this.weapons.get(WeaponType.PISTOL);
        if (pistol) {
            pistol.infiniteAmmo = false;
            pistol.currentAmmo = pistol.magazineSize;
            pistol.reserveAmmo = 60;
            pistol.maxReserveAmmo = 120;
        }

        // Clear ALL other weapons (set ammo to 0) - player can only use pistol and knife
        const weaponsToClear = [WeaponType.RIFLE, WeaponType.SHOTGUN, WeaponType.SNIPER, WeaponType.MACHINE_GUN];
        for (const weaponType of weaponsToClear) {
            const weapon = this.weapons.get(weaponType);
            if (weapon) {
                weapon.currentAmmo = 0;
                weapon.reserveAmmo = 0;
                weapon.isTemporary = false;
            }
        }

        // Force equip pistol
        this.equipWeapon(WeaponType.PISTOL);
        this.updateUI();

        console.log('Zombie mode configured: Only pistol and knife available');
    }

    // Give weapon from mystery box (temporary weapon)
    public giveMysteryBoxWeapon(type: WeaponType): void {
        const weapon = this.weapons.get(type);
        if (!weapon) return;

        // Remove any existing temporary weapon first
        if (this.temporaryWeaponType) {
            this.removeTemporaryWeapon();
        }

        // Mark as temporary
        weapon.isTemporary = true;
        this.temporaryWeaponType = type;

        // Start 30 second timer
        this.temporaryWeaponTimer = GAME_CONSTANTS.MYSTERY_BOX.WEAPON_DURATION;

        // Give full ammo
        weapon.currentAmmo = weapon.magazineSize;
        weapon.reserveAmmo = weapon.maxReserveAmmo;

        // Equip it
        this.equipWeapon(type);

        // Play pickup sound
        this.game.audioManager.playSound('pickup');
    }

    // Check if current weapon is empty and temporary (should be removed)
    public checkTemporaryWeaponEmpty(): boolean {
        if (!this.currentWeapon) return false;
        if (!this.currentWeapon.isTemporary) return false;

        // If both magazine and reserve are empty, remove the weapon
        if (this.currentWeapon.currentAmmo <= 0 && this.currentWeapon.reserveAmmo <= 0) {
            this.removeTemporaryWeapon();
            return true;
        }
        return false;
    }

    private removeTemporaryWeapon(): void {
        if (this.temporaryWeaponType) {
            const weapon = this.weapons.get(this.temporaryWeaponType);
            if (weapon) {
                weapon.isTemporary = false;
                weapon.currentAmmo = 0;
                weapon.reserveAmmo = 0;
            }
            this.temporaryWeaponType = null;
            this.temporaryWeaponTimer = 0;
        }

        // Switch back to pistol
        this.equipWeapon(WeaponType.PISTOL);
    }

    public hasTemporaryWeapon(): boolean {
        return this.temporaryWeaponType !== null;
    }

    public getTemporaryWeaponType(): WeaponType | null {
        return this.temporaryWeaponType;
    }

    public getTemporaryWeaponTimeLeft(): number {
        return this.temporaryWeaponTimer;
    }

    public refillPistolAmmo(): void {
        const pistol = this.weapons.get(WeaponType.PISTOL);
        if (pistol) {
            pistol.currentAmmo = pistol.magazineSize;
            pistol.reserveAmmo = pistol.maxReserveAmmo;

            if (this.currentWeaponType === WeaponType.PISTOL) {
                this.updateUI();
            }
        }
    }

    private updateUI(): void {
        if (!this.currentWeapon) return;

        const displayAmmo = this.currentWeapon.currentAmmo === Infinity ? '∞' : this.currentWeapon.currentAmmo;
        const displayReserve = this.currentWeapon.reserveAmmo === Infinity ? '∞' : this.currentWeapon.reserveAmmo;

        this.game.uiManager.updateAmmo(
            this.currentWeapon.currentAmmo,
            this.currentWeapon.magazineSize,
            this.isReloading
        );

        this.game.uiManager.updateWeaponName(this.currentWeapon.name);
        this.game.uiManager.updateReserveAmmo(this.currentWeapon.reserveAmmo);
    }

    public getCurrentWeaponType(): WeaponType {
        return this.currentWeaponType;
    }

    public getCurrentAmmo(): number {
        return this.currentWeapon?.currentAmmo || 0;
    }

    public getMaxAmmo(): number {
        return this.currentWeapon?.magazineSize || 0;
    }

    public isWeaponReloading(): boolean {
        return this.isReloading;
    }

    public reset(): void {
        // Reset all weapons to full ammo
        this.weapons.forEach((weapon, type) => {
            weapon.currentAmmo = weapon.magazineSize;
            if (!weapon.infiniteAmmo) {
                weapon.reserveAmmo = weapon.maxReserveAmmo;
            }
        });

        this.fireTimer = 0;
        this.isReloading = false;
        this.reloadTimer = 0;
        this.isAiming = false;
        this.aimTransition = 0;
        this.kickbackAmount = 0;
        this.swayAmount.set(0, 0);

        this.equipWeapon(WeaponType.PISTOL);
    }

    public dispose(): void {
        this.weapons.forEach(weapon => {
            weapon.mesh.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.geometry.dispose();
                    if (child.material instanceof THREE.Material) {
                        child.material.dispose();
                    }
                }
            });
        });
    }
}
