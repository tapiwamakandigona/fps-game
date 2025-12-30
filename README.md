# 🎮 Zombie Survival FPS

A thrilling browser-based 3D first-person shooter built with Three.js! Battle through waves of zombies, collect weapons, and survive as long as you can.

[![Play Now](https://img.shields.io/badge/🎮_Play_Now-Live_Demo-brightgreen?style=for-the-badge)](https://tapiwamakandigona.github.io/fps-game/)
[![GitHub](https://img.shields.io/badge/GitHub-Source_Code-black?style=for-the-badge&logo=github)](https://github.com/tapiwamakandigona/fps-game)

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-000000?style=flat&logo=three.js&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)

---

## ✨ Features

### 🎯 Gameplay
- **Wave-Based Survival** - Battle endless waves of increasingly difficult enemies
- **Multiple Enemy Types** - Zombies, Fast Zombies, Fat Zombies, and Gunners
- **Mystery Boxes** - Random weapon drops with exciting reveals
- **Shop Stations** - Purchase weapons and upgrades between waves
- **Progressive Difficulty** - Each wave gets harder with more enemies

### 🔫 Weapons Arsenal
- **Pistol** - Starting weapon, reliable and accurate
- **Rifle** - High fire rate, medium damage
- **Shotgun** - Devastating close-range power
- **SMG** - Spray and pray with high mobility

### 🎨 Visuals & Audio
- **Low-Poly Stylized Graphics** - Smooth 60fps performance
- **Particle Effects** - Muzzle flashes, blood splatter, explosions
- **Dynamic Lighting** - Atmospheric game environments
- **Full Sound Design** - Weapon sounds, enemy growls, background music

### 📱 Cross-Platform
- **Desktop Controls** - WASD + Mouse
- **Mobile Controls** - Touch joystick and buttons
- **Responsive UI** - Works on all screen sizes

---

## 🎮 Controls

### Desktop
| Key | Action |
|-----|--------|
| `W A S D` | Move |
| `Mouse` | Look Around |
| `Left Click` | Shoot |
| `R` | Reload |
| `E` | Interact (Buy, Open) |
| `1-4` | Switch Weapons |
| `ESC` | Pause Menu |

### Mobile
- **Left Joystick** - Movement
- **Right Area** - Look/Aim (drag)
- **Fire Button** - Shoot (drag to aim while firing)
- **Action Buttons** - Reload, Jump, Interact

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **TypeScript** | Type-safe game logic |
| **Three.js** | 3D rendering engine |
| **Howler.js** | Audio management |
| **Vite** | Build tool & dev server |
| **GitHub Pages** | Hosting |

---

## 🚀 Local Development

```bash
# Clone the repository
git clone https://github.com/tapiwamakandigona/fps-game.git
cd fps-game

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

---

## 📁 Project Structure

```
src/
├── core/              # Game engine core
│   ├── Game.ts        # Main game controller
│   └── GameLoop.ts    # Frame timing & updates
├── managers/          # System managers
│   ├── AudioManager   # Sound effects & music
│   ├── InputManager   # Keyboard/Mouse/Touch
│   ├── LevelManager   # Wave spawning & levels
│   └── UIManager      # HUD & menus
├── entities/          # Game objects
│   ├── Player.ts      # Player controller
│   ├── WeaponSystem   # Weapon handling
│   ├── MysteryBox     # Random rewards
│   └── EnemyTypes/    # Enemy implementations
└── main.ts            # Entry point
```

---

## 👨‍💻 Author

**Tapiwa Makandigona**

- 🌐 Portfolio: [tapiwamakandigona.github.io/portfolio](https://tapiwamakandigona.github.io/portfolio)
- 💻 GitHub: [@tapiwamakandigona](https://github.com/tapiwamakandigona)
- 📧 Email: silentics.org@gmail.com

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<div align="center">

**[🎮 Play Now](https://tapiwamakandigona.github.io/fps-game/) • [⭐ Star on GitHub](https://github.com/tapiwamakandigona/fps-game)**

*Built with ❤️ by Tapiwa Makandigona*

</div>
