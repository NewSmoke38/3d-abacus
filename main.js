import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xA0522D); 

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 15; 

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); 
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);
const abacusGroup = new THREE.Group();
scene.add(abacusGroup);

const woodMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x8B4513, 
    roughness: 0.6,
    metalness: 0.1
});

const topGeo = new THREE.BoxGeometry(20, 1, 2); 
const topBar = new THREE.Mesh(topGeo, woodMaterial);
topBar.position.y = 6; 
abacusGroup.add(topBar);

const botGeo = new THREE.BoxGeometry(22, 1, 2);
const botBar = new THREE.Mesh(botGeo, woodMaterial);
botBar.position.y = -6; 
abacusGroup.add(botBar);

const sideGeo = new THREE.BoxGeometry(1, 13, 2); 
const leftPost = new THREE.Mesh(sideGeo, woodMaterial);
leftPost.position.x = -10.5; 
abacusGroup.add(leftPost);

const rightPost = new THREE.Mesh(sideGeo, woodMaterial);
rightPost.position.x = 10.5; 
abacusGroup.add(rightPost);

const dividerGeo = new THREE.BoxGeometry(20, 0.5, 1.5); 
const divider = new THREE.Mesh(dividerGeo, woodMaterial);
divider.position.y = 2; 
abacusGroup.add(divider);

renderer.domElement.style.touchAction = 'none'; 
renderer.domElement.style.cursor = 'grab'; // drag to rotate 

let isPointerDown = false;
let lastPointer = { x: 0, y: 0 };
const rotationSpeed = 0.005;

function onPointerDown(event) {
    isPointerDown = true;
    renderer.domElement.style.cursor = 'grabbing';
    lastPointer.x = event.clientX;
    lastPointer.y = event.clientY;
    try { renderer.domElement.setPointerCapture(event.pointerId); } catch (e) {}
}

function onPointerMove(event) {
    if (!isPointerDown) return;
    const deltaX = event.clientX - lastPointer.x;
    const deltaY = event.clientY - lastPointer.y;

  abacusGroup.rotation.y += deltaX * rotationSpeed;
    abacusGroup.rotation.x += deltaY * rotationSpeed;

    const maxX = Math.PI / 2 - 0.1;
    const minX = -Math.PI / 2 + 0.1;
    abacusGroup.rotation.x = Math.max(minX, Math.min(maxX, abacusGroup.rotation.x));
    lastPointer.x = event.clientX;
    lastPointer.y = event.clientY;

    renderer.render(scene, camera);
}

function onPointerUp(event) {
    isPointerDown = false;
    renderer.domElement.style.cursor = 'grab';
    try { renderer.domElement.releasePointerCapture(event.pointerId); } catch (e) {}
}
renderer.domElement.addEventListener('pointerdown', onPointerDown);
window.addEventListener('pointermove', onPointerMove);
window.addEventListener('pointerup', onPointerUp);




function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.render(scene, camera);
}
window.addEventListener('resize', onWindowResize, false);

renderer.render(scene, camera);