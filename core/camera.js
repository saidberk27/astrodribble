import * as THREE from 'three';

export let camera;
let targetPlayer;

// Kamera ayarları
const cameraOffset = new THREE.Vector3(0, 3, 6); // Oyuncunun arkasındaki mesafe
const lookAtOffset = new THREE.Vector3(0, 1, 0); // Oyuncunun biraz yukarısına bak
const smoothFactor = 0.1; // Kamera takip yumuşaklığı

export function createCamera() {
    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.copy(cameraOffset);
    return camera;
}

export function enableCameraMotions(renderer, player) {
    targetPlayer = player;
}

export function updateCameraPosition() {
    if (!targetPlayer) return;

    // Oyuncunun dönüşüne göre kamera ofsetini hesapla
    const rotatedOffset = cameraOffset.clone().applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        targetPlayer.getRotation()
    );

    // Hedef kamera pozisyonunu hesapla
    const targetPosition = targetPlayer.getPosition().clone().add(rotatedOffset);

    // Kamerayı yumuşak bir şekilde hedef pozisyona taşı
    camera.position.lerp(targetPosition, smoothFactor);

    // Kameranın bakış noktasını hesapla (oyuncunun biraz yukarısı)
    const lookAtPoint = targetPlayer.getPosition().clone().add(lookAtOffset);
    camera.lookAt(lookAtPoint);
}
