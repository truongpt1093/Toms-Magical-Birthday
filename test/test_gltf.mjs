// Test if GLTF files can be read and verified
import fs from 'fs';
import path from 'path';

const glbDir = './3D/Models/GLB format';
const models = [
    'character-male-a', 'character-male-b', 'character-male-c',
    'character-male-d', 'character-male-e', 'character-male-f',
    'character-female-a', 'character-female-b', 'character-female-c',
    'character-female-d', 'character-female-e', 'character-female-f',
    'wheelchair', 'aid-sunglasses', 'aid-glasses'
];

let allExist = true;
for (const m of models) {
    const p = path.join(glbDir, `${m}.glb`);
    if (!fs.existsSync(p)) {
        console.error(`Missing model: ${p}`);
        allExist = false;
    }
}
const texPath = path.join(glbDir, 'Textures', 'colormap.png');
if (!fs.existsSync(texPath)) {
    console.error(`Missing texture: ${texPath}`);
    allExist = false;
}

if (allExist) {
    console.log("All 15 required GLB model files and colormap texture exist on disk!");
} else {
    process.exit(1);
}
