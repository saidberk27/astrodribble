import * as THREE from 'three';

export let camera;
export const cameraControls = {
    moveSpeed: 0.1,
    keys: {
        forward: false,
        backward: false,
        left: false,
        right: false,
        up: false,
        down: false
    }
};

export function createCamera() {
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 8, 15);
    camera.lookAt(0, 0, 0);
    return camera;
}

export function enableCameraMotions(renderer) {
    function onKeyDown(event) {
        switch (event.code) {
            case 'KeyW': cameraControls.keys.forward = true; break;
            case 'KeyS': cameraControls.keys.backward = true; break;
            case 'KeyA': cameraControls.keys.left = true; break;
            case 'KeyD': cameraControls.keys.right = true; break;
        }

        // Shift ve Ctrl tuşları için event.key kullanımı
        switch (event.key) {
            case 'Shift': cameraControls.keys.up = true; break;
            case 'Control': cameraControls.keys.down = true; break;
        }
    }

    function onKeyUp(event) {
        switch (event.code) {
            case 'KeyW': cameraControls.keys.forward = false; break;
            case 'KeyS': cameraControls.keys.backward = false; break;
            case 'KeyA': cameraControls.keys.left = false; break;
            case 'KeyD': cameraControls.keys.right = false; break;
        }

        // Shift ve Ctrl tuşları için event.key kullanımı
        switch (event.key) {
            case 'Shift': cameraControls.keys.up = false; break;
            case 'Control': cameraControls.keys.down = false; break;
        }
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
}

export function updateCameraPosition() {
    // Kamera pozisyonunu güncelle
    const moveVector = new THREE.Vector3();

    if (cameraControls.keys.forward) moveVector.z -= cameraControls.moveSpeed;
    if (cameraControls.keys.backward) moveVector.z += cameraControls.moveSpeed;
    if (cameraControls.keys.left) moveVector.x -= cameraControls.moveSpeed;
    if (cameraControls.keys.right) moveVector.x += cameraControls.moveSpeed;
    if (cameraControls.keys.up) moveVector.y += cameraControls.moveSpeed;
    if (cameraControls.keys.down) moveVector.y -= cameraControls.moveSpeed;

    camera.position.add(moveVector);
    camera.lookAt(0, 0, 0); // Kamera her zaman merkeze bakacak
}
