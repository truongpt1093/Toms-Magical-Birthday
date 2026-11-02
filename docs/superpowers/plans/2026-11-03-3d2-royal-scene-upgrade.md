# 3D Scene Upgrade with Mini Arena Assets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the game scene in `index.html` into "Prince Tom's Royal Fairytale Garden" using 3D environment assets from `3D2` (stone arch gatehouse, royal guards, classical columns, stage stairs, trophies, and lush trees).

**Architecture:** Embed and package `3D2` models with textures into `3D/models-data.js` and extend `CharacterAssetManager` so environment elements and animated soldiers can be cloned and placed dynamically in `World.build()`.

**Tech Stack:** Three.js (r160), GLTFLoader, SkeletonUtils, Playwright E2E verification.

## Global Constraints
- Target game file: `D:\Cá nhân\Codex\Toms-Magical-Birthday\index.html`
- Source asset folder: `D:\Cá nhân\Codex\Toms-Magical-Birthday\3D2\Models\GLB format\`
- Keep all existing party activities, mini-games, and interactions working 100%.
- Ensure seamless loading via both local web server and direct file access.

---

### Task 1: Package `3D2` Assets into `CharacterAssetManager` and `models-data.js`

**Files:**
- Modify: `test/pack_models.py`
- Modify: `3D/models-data.js`
- Modify: `index.html:2520-2560` (`CharacterAssetManager`)

**Interfaces:**
- Consumes: `3D2/Models/GLB format/*.glb`, `3D2/Models/GLB format/Textures/colormap.png`
- Produces: `CharacterAssetManager.createInstance(propName)` for `wall-gate`, `wall`, `column`, `stairs`, `tree`, `banner`, `trophy`, `statue`, `character-soldier`

- [ ] **Step 1: Update `test/pack_models.py` to pack both `3D` and `3D2` models**

Include:
```python
models_3d2 = [
    'wall-gate', 'wall', 'column', 'stairs', 'tree', 'banner', 'trophy', 'statue', 'character-soldier', 'border-straight'
]
```
Embed `3D2` colormap in `3D2` models and append all to `window.KENNEY_MODELS_DATA`.

- [ ] **Step 2: Run `python test/pack_models.py`**

Run: `python test/pack_models.py`
Expected: Output showing all 3D and 3D2 models packed into `3D/models-data.js`.

- [ ] **Step 3: Update `CharacterAssetManager.envModels` in `index.html`**

Add `envModels` list to `CharacterAssetManager`:
```javascript
envModels: [
    'wall-gate', 'wall', 'column', 'stairs', 'tree', 'banner', 'trophy', 'statue', 'character-soldier', 'border-straight'
]
```
Ensure `CharacterAssetManager.init()` loads `envModels` alongside character models.

- [ ] **Step 4: Commit**

```bash
git add test/pack_models.py 3D/models-data.js index.html
git commit -m "feat: package 3D2 environment models and integrate into CharacterAssetManager"
```

---

### Task 2: Upgrade Royal Entrance Gate & Royal Guards

**Files:**
- Modify: `index.html:1807-1865` (`World.buildEntranceGate`)

**Interfaces:**
- Consumes: `CharacterAssetManager.createInstance('wall-gate')`, `CharacterAssetManager.createInstance('character-soldier')`, `CharacterAssetManager.createInstance('banner')`, `CharacterAssetManager.createInstance('wall')`
- Produces: Majestic royal castle entrance with 2 animated royal guards

- [ ] **Step 1: Refactor `buildEntranceGate()` in `World`**

Replace procedural arch with:
1. `wall-gate` model at (0, 0, 24) scaled 2.2x.
2. `wall` flanking the left and right towers.
3. 2 `banner` models waving on top of the gate towers.
4. Mount "HAPPY BIRTHDAY TOM" banner gracefully over the gate archway.
5. Station 2 miniature Royal Guards (`character-soldier`) at gate left (-2.4, 0, 25) and right (2.4, 0, 25) with `idle` and `emote-yes` animations.
6. Register guards in `World.decorations` so their `AnimationMixer` updates each frame in `World.update(delta)`.
7. Update colliders for the gate towers.

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: upgrade entrance gate into royal arch with animated guards and banners"
```

---

### Task 3: Upgrade Red Carpet Aisle & Center Stage

**Files:**
- Modify: `index.html:1867-1900` (`World.buildPartyCourtyard`)
- Modify: `index.html:2014-2083` (`World.buildBirthdayStage`)

**Interfaces:**
- Consumes: `CharacterAssetManager.createInstance('column')`, `CharacterAssetManager.createInstance('border-straight')`, `CharacterAssetManager.createInstance('stairs')`, `CharacterAssetManager.createInstance('trophy')`
- Produces: Grand royal promenade and regal stage with stone stairs and trophies

- [ ] **Step 1: Add stone columns along Red Carpet in `buildPartyCourtyard()`**

Place 6 columns at:
`[[-2.8, 20], [2.8, 20], [-2.8, 14], [2.8, 14], [-2.8, 8], [2.8, 8]]` (scale ~1.8x)
Add border stones along the carpet edges.

- [ ] **Step 2: Add stone stairs and trophies to Center Stage in `buildBirthdayStage()`**

Place:
1. `stairs` model leading up onto the stage deck at (0, 0, -9.8).
2. Two royal columns framing the backdrop at (-5.5, 0, -14.5) and (5.5, 0, -14.5).
3. Two golden celebration trophies (`trophy`, scale 1.5x) flanking the birthday cake table.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: upgrade red carpet columns and center stage with stairs and trophies"
```

---

### Task 4: Upgrade Garden Perimeter & Landscape with Lush 3D Trees and Statue

**Files:**
- Modify: `index.html:1754-1805` (`World.buildFence`)
- Modify: `index.html:2257-2308` (`World.buildPhotoZone`)

**Interfaces:**
- Consumes: `CharacterAssetManager.createInstance('tree')`, `CharacterAssetManager.createInstance('statue')`
- Produces: Lush perimeter of 3D trees and royal hero statue landmark

- [ ] **Step 1: Add perimeter 3D trees in `World.build()`**

Create `World.buildTrees()`:
Place 28 stylized 3D trees (`tree`) with varying scales (1.8x to 2.4x) and random rotations around the boundary perimeter:
- Along North (Z = -22 to -24)
- Along South (Z = +26 to +28)
- Along East (X = +24 to +26)
- Along West (X = -24 to -26)

- [ ] **Step 2: Add hero statue to Photo Booth in `buildPhotoZone()`**

Place `statue` model beside the photo frame as a commemorative photo landmark.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add 3D trees perimeter and royal statue to photo booth"
```

---

### Task 5: Comprehensive Verification & Visual Inspection

**Files:**
- Test: `test/verify_scene.py`

**Interfaces:**
- Consumes: Chromium browser via Playwright
- Produces: Screenshot and automated assertion verification of all new models

- [ ] **Step 1: Write `test/verify_scene.py` to inspect gate, guards, columns, trees, and take full-scene screenshot**
- [ ] **Step 2: Run verification script**
- [ ] **Step 3: Final commit and summary**
