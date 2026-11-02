# 3D Character Refactor & Control Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor procedural 3D characters in `index.html` with rigged Kenney Mini Characters GLB models with skeletal animations and fix the inverted A/D / Left-Right keyboard and joystick steering.

**Architecture:** Load GLB character assets from `3D/Models/GLB format/` via Three.js `GLTFLoader`, cache template scenes, and clone instances with `SkeletonUtils.clone` to bind independent `AnimationMixer` instances for Player, Bé Tôm, and AI Guests. Fix lateral vector direction in `PlayerController` by computing correct perpendicular vector.

**Tech Stack:** Three.js (r160), GLTFLoader, SkeletonUtils, Web Audio API, Vanilla HTML5 / JavaScript.

## Global Constraints
- Target game entry: `D:\Cá nhân\Codex\Toms-Magical-Birthday\index.html`
- Kenney asset folder: `D:\Cá nhân\Codex\Toms-Magical-Birthday\3D\Models\GLB format\`
- Keep single-file architecture of `index.html` intact with graceful procedural fallback if GLB files fail to load.
- Ensure 60 FPS performance by instantiating via `SkeletonUtils.clone` instead of re-fetching files.

---

### Task 1: Fix A/D and Left/Right Movement Direction

**Files:**
- Modify: `index.html:2831-2836`
- Test: Manual keyboard / joystick vector verification script

**Interfaces:**
- Consumes: `this.cameraAngle.theta`, `this.moveDir`, `this.keys`
- Produces: Correct `moveVec` where +normX moves right and -normX moves left

- [ ] **Step 1: Write verification script to test vector logic**

Create a test script `test_controls.js`:
```javascript
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

function computeMoveVec(theta, inputX, inputZ) {
    const forward = new THREE.Vector3(-Math.sin(theta), 0, -Math.cos(theta));
    const right = new THREE.Vector3(-forward.z, 0, forward.x);
    return new THREE.Vector3()
        .addScaledVector(right, inputX)
        .addScaledVector(forward, -inputZ)
        .normalize();
}

// When theta = 0 (looking towards -Z), pressing D (inputX = 1) should produce (1, 0, 0)
const vRight = computeMoveVec(0, 1, 0);
console.assert(Math.abs(vRight.x - 1) < 1e-4 && Math.abs(vRight.z) < 1e-4, `Expected +X (1,0,0) for right, got (${vRight.x}, ${vRight.z})`);

// When pressing A (inputX = -1) should produce (-1, 0, 0)
const vLeft = computeMoveVec(0, -1, 0);
console.assert(Math.abs(vLeft.x - (-1)) < 1e-4 && Math.abs(vLeft.z) < 1e-4, `Expected -X (-1,0,0) for left, got (${vLeft.x}, ${vLeft.z})`);

console.log("Control vector test passed!");
```

- [ ] **Step 2: Run verification script**

Run: `node test/test_controls.mjs`
Expected: Output `Control vector test passed!`

- [ ] **Step 3: Modify `index.html` line 2831-2836**

In `PlayerController.update(delta)`:
Replace:
```javascript
const forward = new THREE.Vector3(-Math.sin(this.cameraAngle.theta), 0, -Math.cos(this.cameraAngle.theta));
const right = new THREE.Vector3(forward.z, 0, -forward.x);
```
With:
```javascript
const forward = new THREE.Vector3(-Math.sin(this.cameraAngle.theta), 0, -Math.cos(this.cameraAngle.theta));
const right = new THREE.Vector3(-forward.z, 0, forward.x);
```

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "fix: invert right vector in PlayerController for correct A/D steering"
```

---

### Task 2: Integrate `GLTFLoader`, `SkeletonUtils`, and `CharacterAssetManager`

**Files:**
- Modify: `index.html:1236-1240` (import GLTFLoader and SkeletonUtils)
- Add: `CharacterAssetManager` module before character classes in `index.html`

**Interfaces:**
- Consumes: `three/addons/loaders/GLTFLoader.js`, `three/addons/utils/SkeletonUtils.js`
- Produces: `CharacterAssetManager.init()`, `CharacterAssetManager.createInstance(modelKey)`, `CharacterAssetManager.isReady`

- [ ] **Step 1: Update imports in `<script type="module">`**

Add imports:
```javascript
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
```

- [ ] **Step 2: Add `CharacterAssetManager` class**

```javascript
const CharacterAssetManager = {
    cache: new Map(),
    isReady: false,
    loader: null,
    models: [
        'character-male-a', 'character-male-b', 'character-male-c',
        'character-male-d', 'character-male-e', 'character-male-f',
        'character-female-a', 'character-female-b', 'character-female-c',
        'character-female-d', 'character-female-e', 'character-female-f'
    ],
    accessories: ['aid-glasses', 'aid-sunglasses', 'wheelchair'],

    async init(onProgress) {
        this.loader = new GLTFLoader();
        const loadList = [...this.models, ...this.accessories];
        let loaded = 0;

        const promises = loadList.map(async (name) => {
            const url = `3D/Models/GLB%20format/${name}.glb`;
            try {
                const gltf = await this.loader.loadAsync(url);
                // Enable shadows on meshes
                gltf.scene.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                this.cache.set(name, {
                    scene: gltf.scene,
                    animations: gltf.animations || []
                });
            } catch (err) {
                console.warn(`Could not load GLB model ${name}:`, err);
            }
            loaded++;
            if (onProgress) onProgress(loaded / loadList.length);
        });

        await Promise.all(promises);
        this.isReady = this.cache.size > 0;
        return this.isReady;
    },

    createInstance(name) {
        const item = this.cache.get(name);
        if (!item) return null;
        const clone = SkeletonUtils.clone(item.scene);
        const mixer = new THREE.AnimationMixer(clone);
        const actions = new Map();
        item.animations.forEach(clip => {
            actions.set(clip.name, mixer.clipAction(clip));
        });
        return { root: clone, mixer, actions };
    },

    getRandomCharacterKey() {
        return this.models[Math.floor(Math.random() * this.models.length)];
    }
};
```

- [ ] **Step 3: Test asset loading via node test or browser check**

Verify `CharacterAssetManager` loads without syntax errors.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add GLTFLoader, SkeletonUtils, and CharacterAssetManager"
```

---

### Task 3: Refactor `ChibiCharacter` and Player Integration

**Files:**
- Modify: `index.html:2596-2695` (`ChibiCharacter` implementation)
- Modify: `index.html:2820-2860` (`PlayerController.update`)

**Interfaces:**
- Consumes: `CharacterAssetManager.createInstance(modelKey)`
- Produces: `ChibiCharacter.update(delta)`, `ChibiCharacter.setAnimation(animName)`

- [ ] **Step 1: Refactor `ChibiCharacter` to use GLB instance with procedural fallback**

Replace procedural mesh construction with:
```javascript
class ChibiCharacter {
    constructor(name, colorHex = '#89CFF0', isPlayer = false, modelKey = null) {
        this.name = name;
        this.colorHex = colorHex;
        this.isPlayer = isPlayer;
        this.group = new THREE.Group();
        this.speed = 7.0;
        this.isMoving = false;
        this.currentAnim = null;
        this.modelKey = modelKey || (isPlayer ? 'character-male-a' : CharacterAssetManager.getRandomCharacterKey());

        this.initMesh();
    }

    initMesh() {
        const instance = CharacterAssetManager.createInstance(this.modelKey);
        if (instance) {
            this.modelInstance = instance;
            this.mixer = instance.mixer;
            this.actions = instance.actions;
            
            // Adjust scale to match world dimensions (~1.7x)
            instance.root.scale.set(1.7, 1.7, 1.7);
            this.group.add(instance.root);
            
            // Start default idle animation
            this.playAnimation('idle');

            // Add cute party hat on head for player
            if (this.isPlayer) {
                const hatMat = new THREE.MeshLambertMaterial({ color: 0xF5D061 });
                const hat = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.35, 10), hatMat);
                hat.position.set(0, 1.15, 0);
                this.group.add(hat);
            }
        } else {
            // Procedural fallback
            this.initProceduralMesh();
        }
        scene.add(this.group);
    }

    playAnimation(name, duration = 0.25) {
        if (!this.actions || !this.actions.has(name)) return;
        const nextAction = this.actions.get(name);
        if (this.currentAction === nextAction) return;

        if (this.currentAction) {
            this.currentAction.fadeOut(duration);
        }
        nextAction.reset().fadeIn(duration).play();
        this.currentAction = nextAction;
        this.currentAnim = name;
    }

    animateWalking(delta) {
        if (this.mixer) {
            this.mixer.update(delta);
            const targetAnim = this.isMoving ? 'walk' : 'idle';
            if (this.currentAnim !== targetAnim && this.currentAnim !== 'dance' && this.currentAnim !== 'cheer') {
                this.playAnimation(targetAnim);
            }
        } else if (this.leftLeg) {
            // Procedural walk animation fallback
            this.animateProceduralWalking(delta);
        }
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: refactor ChibiCharacter to use Kenney GLB model and AnimationMixer"
```

---

### Task 4: Refactor `TomCharacter` (Bé Tôm on Stage)

**Files:**
- Modify: `index.html:2516-2595` (`TomCharacter` implementation)

**Interfaces:**
- Consumes: `CharacterAssetManager.createInstance('character-male-b')`
- Produces: `TomCharacter.update(delta)`, `TomCharacter.isBlowing`

- [ ] **Step 1: Refactor `TomCharacter` with 3D model, crown, and celebration animation**

```javascript
class TomCharacter {
    constructor() {
        this.group = new THREE.Group();
        this.group.position.set(1.4, 0.9, -14); // Standing next to cake on stage
        this.animTime = 0;
        this.isBlowing = false;
        this.initModel();
    }

    initModel() {
        const instance = CharacterAssetManager.createInstance('character-male-b');
        if (instance) {
            this.modelInstance = instance;
            this.mixer = instance.mixer;
            this.actions = instance.actions;

            // Baby scale (1.45x)
            instance.root.scale.set(1.45, 1.45, 1.45);
            this.group.add(instance.root);

            // Gold crown for 1-year birthday boy
            const crownMat = new THREE.MeshLambertMaterial({ color: 0xF5D061 });
            const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.14, 5), crownMat);
            crown.position.set(0, 1.05, 0);
            this.group.add(crown);

            // Play celebratory cheer / idle animation
            if (this.actions.has('emote-yes')) {
                this.actions.get('emote-yes').play();
            } else if (this.actions.has('idle')) {
                this.actions.get('idle').play();
            }
        } else {
            this.initProceduralModel();
        }
        scene.add(this.group);
    }

    update(delta) {
        if (this.mixer) {
            this.mixer.update(delta);
            if (this.isBlowing && this.actions.has('interact-right')) {
                if (this.currentAction !== this.actions.get('interact-right')) {
                    this.actions.get('emote-yes')?.stop();
                    this.actions.get('interact-right').reset().fadeIn(0.2).play();
                    this.currentAction = this.actions.get('interact-right');
                }
            }
        }
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: refactor TomCharacter with 3D model, gold crown, and animations"
```

---

### Task 5: Refactor `AIGuestManager` (Guest Diversity & Behaviors)

**Files:**
- Modify: `index.html:2911-3060` (`AIGuestManager`)

**Interfaces:**
- Consumes: `CharacterAssetManager.getRandomCharacterKey()`, `ChibiCharacter`
- Produces: 38-60 animated guests with varied models, animations, and speech bubbles

- [ ] **Step 1: Update guest spawning with diverse models and behavior-driven animations**

Map behavior states:
- `wander`: `g.chibi.playAnimation('walk')` while moving, `idle` when pausing
- `dance`: `g.chibi.playAnimation('jump')` or `emote-yes`
- `cheer`: `g.chibi.playAnimation('emote-yes')`
- `sit`: `g.chibi.playAnimation('sit')` (or wheelchair guests)

- [ ] **Step 2: Initialize assets before starting the main loop**

Call `await CharacterAssetManager.init()` during the game initialization flow (`initGame()`).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: update AIGuestManager to support animated GLB guests and varied behaviors"
```

---

### Task 6: Comprehensive Verification & Polishing

**Files:**
- Test: Local web server test with node / python
- Verify:
  1. A/D and Left/Right key controls
  2. Virtual Joystick
  3. Character 3D visuals and animations
  4. Bé Tôm blowing candles interaction
  5. Guest interactions and scrapbook photo export

- [ ] **Step 1: Start local test server and check console for errors**
- [ ] **Step 2: Verify movement direction mathematics**
- [ ] **Step 3: Verification commit and report**
