import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 18);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const light = new THREE.PointLight(0xffffff, 1, 100);
light.position.set(10, 10, 10);
scene.add(light);
scene.add(new THREE.AmbientLight(0x404040, 1.5));

const abacusGroup = new THREE.Group();
scene.add(abacusGroup);

const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.4 });
const metalMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.6, roughness: 0.2 });
const beadMat = new THREE.MeshStandardMaterial({ color: 0xff8c00, roughness: 0.2 });

const frameGeo = new THREE.BoxGeometry(28, 1, 2);
const postGeo = new THREE.BoxGeometry(1, 14, 2);
const rodGeo = new THREE.CylinderGeometry(0.12, 0.12, 12, 16);
const beadGeo = new THREE.SphereGeometry(0.65, 32, 16);
beadGeo.scale(1, 0.7, 1);

const topFrame = new THREE.Mesh(frameGeo, woodMat);
topFrame.position.y = 6.5;
abacusGroup.add(topFrame);

const bottomFrame = new THREE.Mesh(frameGeo, woodMat);
bottomFrame.position.y = -6.5;
abacusGroup.add(bottomFrame);

const divider = new THREE.Mesh(new THREE.BoxGeometry(28, 0.6, 2), woodMat);
divider.position.y = 2.5;
abacusGroup.add(divider);

const leftPost = new THREE.Mesh(postGeo, woodMat);
leftPost.position.x = -14.5;
abacusGroup.add(leftPost);

const rightPost = new THREE.Mesh(postGeo, woodMat);
rightPost.position.x = 14.5;
abacusGroup.add(rightPost);

const columns = [];
const interactables = [];

for (let i = 0; i < 13; i++) {
    const x = -12 + (i * 2);
    
    const rod = new THREE.Mesh(rodGeo, metalMat);
    rod.position.set(x, 0, 0);
    abacusGroup.add(rod);

    const colBeads = { top: [], bottom: [] };
    
    const heavenBead = new THREE.Mesh(beadGeo, beadMat);
    heavenBead.position.set(x, 5.2, 0);
    heavenBead.userData = { 
        isBead: true, 
        isHeaven: true, 
        colIndex: i, 
        homeY: 5.2, 
        activeY: 3.5 
    };
    abacusGroup.add(heavenBead);
    colBeads.top.push(heavenBead);
    interactables.push(heavenBead);

    for (let j = 0; j < 4; j++) {
        const earthBead = new THREE.Mesh(beadGeo, beadMat);
        const y = -5.5 + (j * 1.05);
        earthBead.position.set(x, y, 0);
        earthBead.userData = { 
            isBead: true, 
            isHeaven: false, 
            colIndex: i, 
            beadIndex: j,
            homeY: -5.5 + (j * 1.05),
            activeY: 1.5 - ((3-j) * 1.05)
        };
        abacusGroup.add(earthBead);
        colBeads.bottom.push(earthBead);
        interactables.push(earthBead);
    }
    columns.push(colBeads);
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

let draggedObj = null;
let offset = new THREE.Vector3();
let isDragging = false;

window.addEventListener('pointerdown', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(interactables);

    if (intersects.length > 0) {
        isDragging = true;
        draggedObj = intersects[0].object;
        renderer.domElement.setPointerCapture(e.pointerId);
        
        const intersectionPoint = new THREE.Vector3();
        raycaster.ray.intersectPlane(dragPlane, intersectionPoint);
        offset.subVectors(draggedObj.position, intersectionPoint);
    }
});

window.addEventListener('pointermove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    if (isDragging && draggedObj) {
        raycaster.setFromCamera(mouse, camera);
        const targetPoint = new THREE.Vector3();
        raycaster.ray.intersectPlane(dragPlane, targetPoint);
        targetPoint.add(offset);
        
        const ud = draggedObj.userData;
        const col = columns[ud.colIndex];
        
        if (ud.isHeaven) {
            draggedObj.position.y = Math.max(3.5, Math.min(5.2, targetPoint.y));
        } else {
            const idx = ud.beadIndex;
            let maxY = 1.5 - ((3 - idx) * 1.05);
            let minY = -5.5 + (idx * 1.05);

            if (idx < 3) maxY = Math.min(maxY, col.bottom[idx + 1].position.y - 1.05);
            if (idx > 0) minY = Math.max(minY, col.bottom[idx - 1].position.y + 1.05);

            draggedObj.position.y = Math.max(minY, Math.min(maxY, targetPoint.y));
        }
    } else if (e.buttons === 1) {
        abacusGroup.rotation.y += e.movementX * 0.005;
        abacusGroup.rotation.x += e.movementY * 0.005;
    }
});

window.addEventListener('pointerup', (e) => {
    if (draggedObj) {
        const ud = draggedObj.userData;
        const currentY = draggedObj.position.y;
        const threshold = (ud.homeY + ud.activeY) / 2;
        
        let targetY;
        const snapToActive = currentY > threshold;

        if (snapToActive) {
            targetY = ud.activeY;
        } else {
            targetY = ud.homeY;
        }

        if (!ud.isHeaven) {
            const col = columns[ud.colIndex].bottom;
            const idx = ud.beadIndex;

            if (snapToActive) {
                if (idx < 3 && col[idx + 1].position.y < targetY + 0.1) {
                    targetY = ud.homeY;
                }
            } else {
                if (idx > 0 && col[idx - 1].position.y > targetY - 0.1) {
                    targetY = ud.activeY;
                }
            }
        }

        draggedObj.position.y = targetY;
    }
    isDragging = false;
    draggedObj = null;
    renderer.domElement.releasePointerCapture(e.pointerId);
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

animate();