import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';

const rodCount = 13;
const rodHeight = 12;
const rodRadius = 0.15;
const spacing = 2;
const framePadding = 4;
const beadsPerRod = 5;
const beadRadius = 0.6;
const beadStartY = 3;
const beadSpacingY = -1.5;

const rodSpan = (rodCount - 1) * spacing;
const frameWidth = rodSpan + framePadding;
const startX = -rodSpan / 2;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xA0522D);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 15;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.touchAction = 'none';
renderer.domElement.style.cursor = 'grab';
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

const abacusGroup = new THREE.Group();
scene.add(abacusGroup);

const woodMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.6, metalness: 0.1 });
const rodMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8, roughness: 0.3 });
const beadMaterial = new THREE.MeshStandardMaterial({ color: 0xD2691E, metalness: 0.2, roughness: 0.6 });

const topGeo = new THREE.BoxGeometry(frameWidth, 1, 2);
const topBar = new THREE.Mesh(topGeo, woodMaterial);
topBar.position.y = 6;
abacusGroup.add(topBar);

const botGeo = new THREE.BoxGeometry(frameWidth, 1, 2);
const botBar = new THREE.Mesh(botGeo, woodMaterial);
botBar.position.y = -6;
abacusGroup.add(botBar);

const sideGeo = new THREE.BoxGeometry(1, 13, 2);
const leftPost = new THREE.Mesh(sideGeo, woodMaterial);
leftPost.position.x = -(frameWidth / 2) - 0.5;
abacusGroup.add(leftPost);

const rightPost = new THREE.Mesh(sideGeo, woodMaterial);
rightPost.position.x = (frameWidth / 2) + 0.5;
abacusGroup.add(rightPost);

const dividerGeo = new THREE.BoxGeometry(frameWidth, 0.5, 1.5);
const divider = new THREE.Mesh(dividerGeo, woodMaterial);
divider.position.y = 2;
abacusGroup.add(divider);

const beads = [];
const rodsBeads = new Array(rodCount).fill(0).map(() => []);

for (let i = 0; i < rodCount; i++) {
    const x = startX + i * spacing;
    const rodGeo = new THREE.CylinderGeometry(rodRadius, rodRadius, rodHeight, 16);
    const rod = new THREE.Mesh(rodGeo, rodMaterial);
    rod.position.set(x, 0, 0);
    abacusGroup.add(rod);

    for (let b = 0; b < beadsPerRod; b++) {
        const y = beadStartY + b * beadSpacingY;
        const beadGeo = new THREE.SphereGeometry(beadRadius, 24, 24);
        const bead = new THREE.Mesh(beadGeo, beadMaterial);
        bead.position.set(x, y, 0);
        bead.userData = { rodIndex: i };
        abacusGroup.add(bead);
        beads.push(bead);
        rodsBeads[i].push(bead);
    }
}

let isPointerDown = false;
let lastPointer = { x: 0, y: 0 };
const rotationSpeed = 0.005;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let selectedBead = null;
let isDraggingBead = false;
let hoverBead = null;

function pickBeadByScreen(clientX, clientY, maxPixels = 40) {
    const rect = renderer.domElement.getBoundingClientRect();
    let best = null;
    let bestDist = Infinity;
    for (const bead of beads) {
        const worldPos = new THREE.Vector3();
        bead.getWorldPosition(worldPos);
        worldPos.project(camera);
        const sx = rect.left + (worldPos.x * 0.5 + 0.5) * rect.width;
        const sy = rect.top + (-worldPos.y * 0.5 + 0.5) * rect.height;
        const dx = sx - clientX;
        const dy = sy - clientY;
        const d = Math.hypot(dx, dy);
        if (d < bestDist && d <= maxPixels) {
            bestDist = d;
            best = bead;
        }
    }
    return best;
}

function onPointerDown(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    const picked = pickBeadByScreen(event.clientX, event.clientY, 40);
    if (picked) {
        selectedBead = picked;
        isDraggingBead = true;
        renderer.domElement.style.cursor = 'grabbing';
        renderer.domElement.setPointerCapture(event.pointerId);
        return;
    }

    isPointerDown = true;
    renderer.domElement.style.cursor = 'grabbing';
    lastPointer.x = event.clientX;
    lastPointer.y = event.clientY;
    renderer.domElement.setPointerCapture(event.pointerId);
}

function onPointerMove(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    if (isDraggingBead && selectedBead) {
        raycaster.setFromCamera(pointer, camera);
        
        const rodWorldPos = new THREE.Vector3();
        selectedBead.getWorldPosition(rodWorldPos);
        
        const yDirWorldTop = new THREE.Vector3(0, 1, 0);
        const yOriginWorld = new THREE.Vector3(0, 0, 0);
        abacusGroup.localToWorld(yDirWorldTop);
        abacusGroup.localToWorld(yOriginWorld);
        const lineDir = yDirWorldTop.clone().sub(yOriginWorld).normalize();

        const camDir = new THREE.Vector3();
        camera.getWorldDirection(camDir); 
        
        const plane = new THREE.Plane(camDir, -camDir.dot(rodWorldPos));
        const planeIntersect = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, planeIntersect); // Always succeeds in this view

        const toP = planeIntersect.clone().sub(rodWorldPos);
        const t = toP.dot(lineDir);
        const closestPointOnRod = rodWorldPos.clone().add(lineDir.multiplyScalar(t));

        const localPoint = closestPointOnRod.clone();
        abacusGroup.worldToLocal(localPoint);
        
        let newYLocal = Math.max(-5, Math.min(5, localPoint.y));
        const rodIndex = selectedBead.userData.rodIndex;
        const beadsOnRod = rodsBeads[rodIndex];
        const sorted = beadsOnRod.slice().sort((a, b) => b.position.y - a.position.y);
        const idx = sorted.indexOf(selectedBead);
        const minGap = beadRadius * 2 + 0.05;

        if (idx > 0) newYLocal = Math.min(newYLocal, sorted[idx - 1].position.y - minGap);
        if (idx < sorted.length - 1) newYLocal = Math.max(newYLocal, sorted[idx + 1].position.y + minGap);

        selectedBead.position.y = newYLocal;
        return;
    }

    if (!isPointerDown) {
        const hover = pickBeadByScreen(event.clientX, event.clientY, 36);
        if (hover !== hoverBead) {
            if (hoverBead) hoverBead.scale.setScalar(1);
            hoverBead = hover;
            if (hoverBead) hoverBead.scale.setScalar(1.15);
        }
        renderer.domElement.style.cursor = hover ? 'pointer' : 'grab';
        return;
    }

    const deltaX = event.clientX - lastPointer.x;
    const deltaY = event.clientY - lastPointer.y;
    abacusGroup.rotation.y += deltaX * rotationSpeed;
    abacusGroup.rotation.x = Math.max(-1.47, Math.min(1.47, abacusGroup.rotation.x + deltaY * rotationSpeed));
    
    lastPointer.x = event.clientX;
    lastPointer.y = event.clientY;
}

function onPointerUp(event) {
    if (isDraggingBead) {
        isDraggingBead = false;
        selectedBead = null;
    } else {
        isPointerDown = false;
    }
    renderer.domElement.style.cursor = 'grab';
    renderer.domElement.releasePointerCapture(event.pointerId);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

renderer.domElement.addEventListener('pointerdown', onPointerDown);
window.addEventListener('pointermove', onPointerMove);
window.addEventListener('pointerup', onPointerUp);
window.addEventListener('resize', onWindowResize, false);

animate();