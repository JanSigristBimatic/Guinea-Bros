# Landscape Assets Download Guide

Das Spiel unterstützt GLB-Modelle für Landschaftselemente. Ohne Assets wird automatisch eine prozedurale Fallback-Generation verwendet.

---

## Empfohlene Asset-Quellen (CC0 / Kostenlos)

### 1. KayKit Forest Nature Pack (BESTE WAHL)
**URL:** https://kaylousberg.itch.io/kaykit-forest

- **Lizenz:** CC0 (frei für kommerzielle Nutzung)
- **Inhalt:** 100+ Modelle (Trees, Rocks, Bushes, Grass)
- **Format:** GLTF, FBX, OBJ
- **Optimiert für:** Mobile & Games

**Download & Setup:**
1. Gehe zu https://kaylousberg.itch.io/kaykit-forest
2. Klicke "Download Now" (Name your own price - $0 funktioniert)
3. Lade "KayKit_ForestPack_1.0_FREE.zip" herunter
4. Entpacke und kopiere die GLTF-Dateien wie unten beschrieben

---

### 2. Sketchfab Low Poly Pack
**URL:** https://sketchfab.com/3d-models/low-poly-trees-grass-and-rocks-4e0463f5df36420bb53079f9de35e81f

- **Lizenz:** CC-BY (Attribution erforderlich)
- **Inhalt:** Trees (2), Grass (2), Rocks (4), Mushrooms (2), Bushes (2), Stump, Branch

---

### 3. Gabriel Dev - Trees and Rocks
**URL:** https://gabriel-dev.itch.io/trees-and-rocks-low-poly

- **Lizenz:** CC0 (Public Domain)
- **Inhalt:** Low Poly Trees und Rocks

---

## Ordnerstruktur

Platziere die GLB-Dateien in folgender Struktur:

```
public/glb/Landscape/
├── Trees/
│   ├── tree_pine_large.glb
│   ├── tree_pine_medium.glb
│   ├── tree_pine_small.glb
│   ├── tree_oak_large.glb
│   ├── tree_oak_medium.glb
│   └── tree_dead.glb
├── Rocks/
│   ├── rock_large.glb
│   ├── rock_medium.glb
│   ├── rock_small.glb
│   └── rock_flat.glb
├── Bushes/
│   ├── bush_large.glb
│   ├── bush_medium.glb
│   ├── bush_small.glb
│   └── bush_berry.glb
└── Props/
    ├── stump.glb
    ├── log.glb
    ├── mushroom_red.glb
    ├── mushroom_brown.glb
    └── flowers.glb
```

---

## KayKit Pack Mapping

Wenn du das KayKit Forest Pack verwendest, benenne die Dateien wie folgt um:

| KayKit Original | Zielname |
|-----------------|----------|
| `tree_pineDefaultA.gltf` | `Trees/tree_pine_large.glb` |
| `tree_pineSmallB.gltf` | `Trees/tree_pine_medium.glb` |
| `tree_pineSmallD.gltf` | `Trees/tree_pine_small.glb` |
| `tree_oak.gltf` | `Trees/tree_oak_large.glb` |
| `tree_oakSmall.gltf` | `Trees/tree_oak_medium.glb` |
| `tree_dead.gltf` | `Trees/tree_dead.glb` |
| `rock_largeA.gltf` | `Rocks/rock_large.glb` |
| `rock_mediumA.gltf` | `Rocks/rock_medium.glb` |
| `rock_smallA.gltf` | `Rocks/rock_small.glb` |
| `rock_flatA.gltf` | `Rocks/rock_flat.glb` |
| `bush_largeA.gltf` | `Bushes/bush_large.glb` |
| `bush_mediumA.gltf` | `Bushes/bush_medium.glb` |
| `bush_smallA.gltf` | `Bushes/bush_small.glb` |
| `bush_berriesA.gltf` | `Bushes/bush_berry.glb` |
| `stump.gltf` | `Props/stump.glb` |
| `log.gltf` | `Props/log.glb` |
| `mushroom_redGroup.gltf` | `Props/mushroom_red.glb` |
| `mushroom_brownGroup.gltf` | `Props/mushroom_brown.glb` |
| `flower_purpleA.gltf` | `Props/flowers.glb` |

**Tipp:** GLTF-Dateien funktionieren direkt - oder konvertiere sie mit Blender zu GLB für bessere Performance.

---

## GLTF zu GLB Konvertierung

### Option 1: Blender (empfohlen)
1. Öffne Blender
2. File → Import → glTF 2.0
3. File → Export → glTF 2.0
4. Wähle "GLB" Format und exportiere

### Option 2: Online Converter
- https://gltf.report/ (Drag & Drop)
- https://sbtron.github.io/makeglb/

### Option 3: CLI Tool
```bash
npm install -g gltf-pipeline
gltf-pipeline -i model.gltf -o model.glb
```

---

## Ohne Assets (Procedural Mode)

Wenn keine GLB-Assets gefunden werden, generiert das Spiel automatisch prozedurale Landschaftselemente:

- **Bäume:** Zylindrische Stämme mit Kegel/Kugel-Kronen
- **Felsen:** Deformierte Dodecahedrons
- **Büsche:** Mehrere überlagerte Kugeln

Der prozedurale Modus ist vollständig spielbar, aber GLB-Assets sehen natürlich besser aus!

---

## Troubleshooting

### Assets werden nicht geladen
1. Prüfe die Browser-Konsole (F12) auf Fehlermeldungen
2. Stelle sicher, dass die Dateinamen exakt übereinstimmen (case-sensitive!)
3. Prüfe, ob die GLB-Dateien gültig sind (öffne sie in https://gltf-viewer.donmccurdy.com/)

### Performance-Probleme
1. Reduziere `count` Werte in `src/constants/landscape.js`
2. Deaktiviere `castShadow` für kleinere Objekte
3. Verwende LOD (Level of Detail) für sehr große Maps

---

## Attribution (wenn erforderlich)

Falls du Assets mit CC-BY Lizenz verwendest, füge diese Attribution hinzu:

```
3D models by [Creator Name] from Sketchfab/itch.io
Licensed under CC-BY 4.0
```
