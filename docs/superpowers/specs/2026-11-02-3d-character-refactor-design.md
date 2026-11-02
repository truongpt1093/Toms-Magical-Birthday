# Design Spec: 3D Character Refactor & Control Fix

- **Date:** 2026-11-02
- **Topic:** Refactor 3D visual characters with Kenney Mini Characters pack & fix A/D key inversion
- **Target File:** `index.html`

## 1. Objectives
1. **Fix Inverted A/D Controls:**
   - Fix the camera-relative movement calculation in `PlayerController.update(delta)`.
   - Ensure A/ArrowLeft moves left and D/ArrowRight moves right according to current camera yaw angle.
2. **Refactor Character Visuals with 3D Assets:**
   - Replace procedural canvas-faced spheres/cylinders with rigged 3D models from `3D/Models/GLB format/`.
   - Retain Kenney's 32 built-in skeletal animations (`idle`, `walk`, `sprint`, `emote-yes`, `interact-right`, `wheelchair-sit`, etc.).
   - Use `GLTFLoader` and `SkeletonUtils.clone` to share loaded templates across Player, Bé Tôm, and 38-60 AI Guests without redundant I/O or memory overhead.
3. **Seamless Integration:**
   - Scale models to match existing scene dimensions (approx 1.8x scale).
   - Integrate animation transitions (`crossFadeTo`) between `idle` and `walk` for moving characters.
   - Attach accessories/props (glasses, party hats, crown for Bé Tôm) and wheelchair variants for guest variety.
   - Ensure backward compatibility and fallback so that if assets are loading or unavailable, the game does not crash.

## 2. Architecture & Implementation Details

### 2.1 Control Inversion Fix
In `PlayerController.update(delta)`:
- Existing:
  ```javascript
  const forward = new THREE.Vector3(-Math.sin(this.cameraAngle.theta), 0, -Math.cos(this.cameraAngle.theta));
  const right = new THREE.Vector3(forward.z, 0, -forward.x);
  ```
- Change to:
  ```javascript
  const forward = new THREE.Vector3(-Math.sin(this.cameraAngle.theta), 0, -Math.cos(this.cameraAngle.theta));
  const right = new THREE.Vector3(-forward.z, 0, forward.x);
  ```
- This directly fixes both keyboard (A/D, arrows) and virtual joystick lateral steering.

### 2.2 Asset Preloader & Cache (`CharacterAssetManager`)
- Load GLTF models asynchronously using Three.js `GLTFLoader`:
  - List of character templates: `character-male-a` through `f`, `character-female-a` through `f`.
  - Accessory templates: `aid-glasses`, `aid-sunglasses`, `wheelchair`.
- Path resolution: `./3D/Models/GLB format/<name>.glb`
- Store parsed GLTF objects in a memory cache: `Map<string, { scene, animations }>`.
- Instantiation method:
  ```javascript
  function createAnimatedCharacterInstance(templateName) {
      const template = cache.get(templateName);
      const cloneScene = SkeletonUtils.clone(template.scene);
      const mixer = new THREE.AnimationMixer(cloneScene);
      const actions = {};
      template.animations.forEach(clip => {
          actions[clip.name] = mixer.clipAction(clip);
      });
      return { root: cloneScene, mixer, actions };
  }
  ```

### 2.3 Character Roles

#### A. Player Character
- Default cute model (e.g. `character-male-a` or user customized).
- Equipped with cute birthday party hat.
- Animation states:
  - Moving -> `walk` (or `sprint` if fast)
  - Stopped -> `idle`
  - Smooth cross-fade between clips.

#### B. Bé Tôm (Phạm Hoàng Minh Trí - 1 Year Old Birthday Boy)
- Model: Chibi baby boy character, scaled slightly smaller (1.4x - 1.5x) standing on stage next to birthday cake.
- Wears shiny golden prince crown (`crown`).
- Animations:
  - Normal stage state: `idle` + periodic `emote-yes` (smiling and cheering).
  - Candle blowing state: `interact-right` leaning towards birthday cake to blow candles.

#### C. AI Guests (`AIGuestManager`)
- Randomly assigned from the 12 male/female models.
- Random accessories (sunglasses, glasses, party hats).
- A small percentage (e.g. 5-10%) use wheelchair with `wheelchair-sit` / `wheelchair-move-forward`.
- Behaviors:
  - `wander`: `walk` animation towards destination waypoint.
  - `dance` / `cheer`: `emote-yes` or rhythmic celebratory animation.
  - `chat`: `idle` animation facing conversation partner with Vietnamese wish bubbles.

### 2.4 Error Handling & Fallbacks
- Preload essential models at startup with a friendly loading progress indicator.
- If a GLB fails to fetch (e.g. strict `file://` sandbox), gracefully fall back to procedural mesh generator so the scene remains functional and playable.

## 3. Verification Plan
1. Test keyboard A/D and ArrowLeft/ArrowRight to ensure right key moves right and left key moves left in relation to camera view.
2. Verify virtual joystick moves player in the intuitive direction.
3. Verify Player model renders with proper texture (`colormap.png`) and animations (`idle` when still, `walk` when moving).
4. Verify Bé Tôm is positioned correctly by the cake with crown and cheering animation.
5. Verify 38+ AI guests wander around garden with distinct character models, varied animations, and speech bubbles.
6. Verify no console errors and smooth 60fps rendering.
