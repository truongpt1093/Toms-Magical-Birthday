# Design Spec: 3D Scene Upgrade with Mini Arena Assets (3D2)

- **Date:** 2026-11-03
- **Topic:** Upgrade game environment, entrance, stage, and landscape into "Prince Tom's Royal Fairytale Garden" using `3D2` (`Mini Arena` asset pack).
- **Target File:** `index.html`, `3D2/`, and `3D/models-data.js`

## 1. Objectives
1. **Transform Entrance Gate into a Royal Archway:**
   - Replace procedural torus with `wall-gate.glb` flanked by stone walls (`wall.glb`) and celebration banners (`banner.glb`).
   - Station 2 miniature Royal Guards (`character-soldier.glb`) saluting and waving to guests entering via the red carpet.
2. **Elevate Center Stage & Red Carpet Promenade:**
   - Line both sides of the red carpet with classic stone columns (`column.glb`) and stone borders (`border-straight.glb`).
   - Add stone stairs (`stairs.glb`) ascending to the birthday cake stage.
   - Flank the stage with golden celebration trophies (`trophy.glb`) and festive banners.
3. **Lush Landscape & Perimeter Garden:**
   - Plant 3D stylized trees (`tree.glb`) around the garden boundaries and courtyard edges, creating depth, warmth, and lushness.
   - Add a hero statue (`statue.glb`) in the photo booth / courtyard plaza as an interactive landmark.
4. **Self-Contained & High Performance:**
   - Package `3D2` models into `3D/models-data.js` with embedded textures for instant in-memory loading (supporting both direct `file://` protocol and web servers).
   - Maintain 60 FPS on both mobile and desktop via mesh caching and instancing.

## 2. Architecture & Scene Composition

### 2.1 Asset Packaging (`3D2` integration into `CharacterAssetManager`)
- Pack `3D2` GLB models (`wall-gate`, `wall`, `column`, `stairs`, `tree`, `banner`, `trophy`, `statue`, `character-soldier`) with their embedded colormap texture into base64 storage.
- Update `CharacterAssetManager` to cache and provide instances for both character models (`3D`) and environment props (`3D2`).

### 2.2 Scene Zones Upgrade (`World.build()`)

#### A. Cổng chào Hoàng gia (Royal Entrance Gate at Z = 24..28)
- Model: `wall-gate.glb` (scale ~2.2x), placed at (0, 0, 24).
- Flanked by `wall.glb` on left (X = -4.5) and right (X = +4.5).
- Banners: 2 `banner.glb` on top of the gate towers.
- Guards: 2 Royal Guards (`character-soldier.glb`) standing at (-2.2, 0, 24.5) and (2.2, 0, 24.5) with `idle` and `emote-yes` animations.
- Banners / Signboard: "HAPPY BIRTHDAY TOM" banner gracefully mounted on the gate arch.

#### B. Đại lộ Thảm đỏ & Sân tiệc (Red Carpet Aisle & Courtyard at Z = 22..-8)
- 6 Stone Columns (`column.glb`, scale 1.8x) lining the red carpet at:
  - (-2.8, 0, 20), (2.8, 0, 20)
  - (-2.8, 0, 14), (2.8, 0, 14)
  - (-2.8, 0, 8), (2.8, 0, 8)
- Stone borders (`border-straight.glb`) lining the walkway.
- Giant 3.8m Teddy Bear preserved in the courtyard with fairy lights.

#### C. Sân khấu Bánh kem Hoàng gia (Center Stage at Z = -13..-15)
- Stone stairs (`stairs.glb`, scale 1.6x) positioned in front of the stage at (0, 0, -9.8).
- Two royal stone columns (`column.glb`) framing the backdrop at (-5.5, 0, -14.5) and (5.5, 0, -14.5).
- Golden trophies (`trophy.glb`, scale 1.5x) on stone pedestals flanking the cake table at (-3.5, 0.5, -13) and (3.5, 0.5, -13).
- Banners mounted on the stage frame.

#### D. Khu vườn xanh cổ tích (Perimeter & Landscape Trees)
- 24+ Stylized Trees (`tree.glb`, scale 1.8x - 2.5x with random rotations and slight scale variations) positioned along the perimeter:
  - North boundary: Z = -22 to -24
  - South boundary: Z = +26 to +28
  - East boundary: X = +24 to +26
  - West boundary: X = -24 to -26
- Hero Statue (`statue.glb`) placed at the photo booth / courtyard boundary as a photo landmark.

## 3. Verification Plan
1. Test packaging of all 9 `3D2` models with zero texture missing warnings.
2. Verify visual placement of gate, guards, columns, trees, stairs, and trophy.
3. Test collisions to ensure player can walk up through the gate, along the red carpet, and around trees without getting stuck.
4. Verify animations of Royal Guards (`character-soldier`).
5. Run automated browser tests (both `http://localhost:8089` and `file:///` protocol) confirming 60 FPS, zero console errors, and render output.
