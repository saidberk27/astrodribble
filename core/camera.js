import * as THREE from 'three';

export let camera;
let targetPlayer;

// Kamera ayarları
const cameraOffset = new THREE.Vector3(0, 4, 8); // Oyuncunun arkasında ve yukarıda
const lookAtOffset = new THREE.Vector3(0, 1, 0); // Oyuncuya direkt bak
const smoothFactor = 0.05; // Daha yumuşak takip
const rotationSmoothFactor = 0.03; // Dönüş yumuşatması

// Kamera durumu
let currentRotation = 0;
let targetCameraRotation = 0;

export function createCamera() {
    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.copy(cameraOffset);
    return camera;
}

export function enableCameraMotions(renderer, player) {
    targetPlayer = player;
    // Başlangıç rotasyonunu ayarla
    currentRotation = targetPlayer.getRotation();
    targetCameraRotation = currentRotation;
}

export function updateCameraPosition() {
    if (!targetPlayer) return;

    // Hareket yönünü hesapla
    const velocity = targetPlayer.body.velocity;
    if (Math.abs(velocity.x) > 0.1 || Math.abs(velocity.z) > 0.1) {
        targetCameraRotation = Math.atan2(velocity.x, velocity.z);
    }

    // Kamera rotasyonunu yumuşat
    currentRotation += (targetCameraRotation - currentRotation) * rotationSmoothFactor;

    // Oyuncunun hareket yönüne göre kamera ofsetini hesapla
    const rotatedOffset = cameraOffset.clone().applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        currentRotation
    );

    // Hedef kamera pozisyonunu hesapla
    const targetPosition = targetPlayer.getPosition().clone().add(rotatedOffset);

    // Kamerayı yumuşak bir şekilde hedef pozisyona taşı
    camera.position.lerp(targetPosition, smoothFactor);

    // Baş noktasını oyuncunun önüne doğru ayarla
    const rotatedLookAtOffset = lookAtOffset.clone().applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        currentRotation
    );

    // Kameranın bakış noktasını hesapla
    const lookAtPoint = targetPlayer.getPosition().clone().add(rotatedLookAtOffset);
    camera.lookAt(lookAtPoint);
}
