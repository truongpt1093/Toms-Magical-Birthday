// Verification test for camera-relative movement vectors

function computeMoveVec(theta, inputX, inputZ) {
    const forward = {
        x: -Math.sin(theta),
        y: 0,
        z: -Math.cos(theta)
    };
    // Correct right vector: (-forward.z, 0, forward.x)
    const right = {
        x: -forward.z,
        y: 0,
        z: forward.x
    };

    const vx = right.x * inputX + forward.x * (-inputZ);
    const vz = right.z * inputX + forward.z * (-inputZ);
    const len = Math.hypot(vx, vz);
    if (len < 1e-6) return { x: 0, y: 0, z: 0 };
    return { x: vx / len, y: 0, z: vz / len };
}

// Case 1: Camera theta = 0 (looking towards -Z, North)
// Pressing D (inputX = 1): Character should move East (+X = 1, Z = 0)
const vRight0 = computeMoveVec(0, 1, 0);
console.assert(Math.abs(vRight0.x - 1) < 1e-5 && Math.abs(vRight0.z) < 1e-5, `Failed right at theta=0: got (${vRight0.x}, ${vRight0.z})`);

// Pressing A (inputX = -1): Character should move West (-X = -1, Z = 0)
const vLeft0 = computeMoveVec(0, -1, 0);
console.assert(Math.abs(vLeft0.x - (-1)) < 1e-5 && Math.abs(vLeft0.z) < 1e-5, `Failed left at theta=0: got (${vLeft0.x}, ${vLeft0.z})`);

// Pressing W (inputZ = -1): Character should move North (X = 0, -Z = -1)
const vFwd0 = computeMoveVec(0, 0, -1);
console.assert(Math.abs(vFwd0.x) < 1e-5 && Math.abs(vFwd0.z - (-1)) < 1e-5, `Failed forward at theta=0: got (${vFwd0.x}, ${vFwd0.z})`);

// Case 2: Camera theta = Math.PI / 2 (looking towards -X, West)
// Pressing D (inputX = 1): Character should move North (-Z = -1)
const vRight90 = computeMoveVec(Math.PI / 2, 1, 0);
console.assert(Math.abs(vRight90.x) < 1e-5 && Math.abs(vRight90.z - (-1)) < 1e-5, `Failed right at theta=PI/2: got (${vRight90.x}, ${vRight90.z})`);

console.log("All control movement vector tests passed successfully!");
