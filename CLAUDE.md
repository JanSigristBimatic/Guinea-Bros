# Guinea Bros - Tower Defense Roguelike

## Project Overview
3D Tower Defense Roguelike mit React 18 + Three.js 0.160. Guinea Pigs verteidigen ihren Bau gegen Wellen von Feinden (Foxes, Ravens, Snakes).

## Quick Start
```bash
npm run dev          # Dev Server (Port 3000)
npm run dev:config   # GLB Configurator
npm run build        # Production Build
npm run lint         # ESLint Check
```

## Tech Stack
- **Frontend**: React 18.2, Vite 5
- **3D Engine**: Three.js 0.160
- **Styling**: Tailwind CSS 3.3
- **State**: React Hooks + localStorage Persistence

---

## Recommended Claude Tools

### Primary Skills (Skill Tool)
| Skill | Verwendung |
|-------|------------|
| `threejs-expert` | 3D-Szenen, Shader, Performance, GLB-Loading |
| `CleanCode` | Refactoring des monolithischen Codes |
| `animejs-animation-expert` | UI-Animationen, Menü-Transitions |

### Primary Agents (Task Tool)
| Agent | Verwendung |
|-------|------------|
| `Explore` | Codebase-Navigation, Suche nach Patterns |
| `Plan` | Größere Features/Refactoring planen |
| `code-implementer` | Präzise Implementierungen |
| `brahma-optimizer` | Performance-Optimierung |

### Quick Commands
```
/research   - Dokumentationsrecherche (Three.js, React)
/plan       - Implementierungsplan erstellen
/implement  - Code mit Self-Correction implementieren
```

---

## Architecture

### Core Files
```
guinea-pig-td-roguelike.jsx  # Haupt-Game-Komponente (3.7k Zeilen) - MONOLITH
src/
├── constants/               # Game Balance & Config
│   ├── config.js           # GAME_CONFIG, COLORS, LIGHTING
│   ├── buildings.js        # Tower/Hut Definitionen
│   ├── enemies.js          # Wave-System, Enemy-Stats
│   ├── skills.js           # Skill Tree (6 Tiers)
│   ├── guineaPigs.js       # 8 Hero-Klassen
│   └── weather.js          # 4 Wetter-Typen
├── game/
│   ├── engine.js           # Three.js Scene Setup
│   ├── entities/           # GuineaPig, Enemy, Building, etc.
│   └── systems/            # combat.js, waves.js, weather.js
├── hooks/
│   ├── useGameState.js     # Game State Manager
│   └── useControls.js      # Input (Keyboard + Touch)
└── components/UI/          # HUD, BuildMenu, SkillTree, etc.
```

### 3D Assets
```
public/glb/
├── Maincharacter.glb, Healer.glb, Tank.glb, Turret.glb
├── Bomber.glb, Sammler.glb
├── House.glb, Tower.glb, Fort.glb
└── Bombe.glb, Karotte.glb
```

---

## Key Systems

### Game Loop
- `requestAnimationFrame`-basiert (~60fps)
- FRAME_TIME_CAP: 0.05s für konsistente Updates
- Phases: menu → loading → day → night → gameOver/victory

### Entity System
- Grid-basierte Welt (120×120 Einheiten)
- Entities als Three.js Groups mit `userData`
- userData: `{ type, health, maxHealth, damage, range, ... }`

### Combat System
- Distanzberechnung auf XZ-Ebene
- Cooldown-basierte Attacken
- Crit-Chance + Rage-Bonus-Multiplier
- Spezialisierte Attacktypen (Bomber → Projektile)

### Skill Tree
- 6 Tiers × 15+ Skills
- Level-basiert mit Kosten-Array
- Persistent in localStorage (`guineaPigTD_skills`)

### Wave System
- 8 Waves mit eskalierenden Enemy-Counts
- Boss-Waves: 3 (Fox), 6 (Raven), 8 (Both)
- Spawn auf Kreis (Radius 38)

---

## Code Conventions

### Three.js Patterns
```javascript
// Material erstellen
const material = new THREE.MeshStandardMaterial({
  color: COLORS.PRIMARY,
  roughness: 0.7,
  metalness: 0.1
});

// Entity mit userData
const entity = new THREE.Group();
entity.userData = { type: 'enemy', health: 100, ... };
scene.add(entity);
```

### State Updates
```javascript
// Immer functional updates für Arrays
setBuildings(prev => [...prev, newBuilding]);
setEnemies(prev => prev.filter(e => e.userData.health > 0));
```

### localStorage Keys
- `guineaPigTD_skills` - Skill Tree State
- `guineaPigTD_meta` - Progression (totalGames, bestWave, etc.)

---

## Performance Guidelines

### Limits
- Shadow Map: 2048×2048
- Grass Instances: 800
- Rain Particles: 1000
- Pixel Ratio: max 2 (mobile)

### Optimization Opportunities
1. Instanced Meshes für wiederholte Geometrie
2. Object Pooling für Projektile/Partikel
3. Frustum Culling für Off-Screen Entities
4. LOD für entfernte Objekte

---

## Known Architecture Debt

### Monolith Problem
`guinea-pig-td-roguelike.jsx` enthält 3.7k Zeilen und sollte aufgeteilt werden:
- [ ] Game Loop Manager extrahieren
- [ ] Input Handler separieren
- [ ] Entity Factory/Manager erstellen
- [ ] Particle System modularisieren

### Refactoring Priority
1. **High**: Game Loop aus JSX extrahieren
2. **Medium**: Entity Management zentralisieren
3. **Low**: UI-Komponenten weiter aufteilen

---

## Common Development Tasks

### Neuen Enemy-Typ hinzufügen
1. Definition in `src/constants/enemies.js`
2. Visuelle Darstellung in Entity-Creation
3. Wave-Konfiguration anpassen
4. Combat-Interaktion prüfen

### Neues Skill hinzufügen
1. Definition in `src/constants/skills.js`
2. Effekt-Logik in Game Loop
3. UI in `SkillTree.jsx`

### Neues Building hinzufügen
1. Definition in `src/constants/buildings.js`
2. GLB-Model in `public/glb/`
3. Build-Logik in Game Loop
4. UI in `BuildMenu.jsx`

### GLB-Model testen
```bash
npm run dev:config   # Öffnet GLB Configurator
```

---

## Environment

### Required
- Node.js 18+
- npm 9+

### Files (nicht committen)
- `.env.local` - Vercel OIDC Token

### Build Output
```
dist/
├── index.html
├── configurator.html
└── assets/
    ├── index-[HASH].js      # Main Game
    ├── three-[HASH].js      # Three.js Vendor
    └── react-vendor-[HASH].js
```
