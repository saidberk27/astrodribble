import * as THREE from 'three';

export let camera;
export const cameraControls = {
    moveSpeed: 0.1,
    lookSpeed: 0.002,
    keys: {
        forward: false,
        backward: false,
        left: false,
        right: false,
        up: false,
        down: false
    },
    mouse: {
        x: 0,
        y: 0,
        isLocked: false
    },
    yaw: 0,
    pitch: 0
};

export function createCamera() {
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 8, 15);
    camera.lookAt(0, 0, 0);
    return camera;
}

export function enableCameraMotions(renderer) {
    const canvas = renderer.domElement;

    function onMouseMove(event) {
        if (!cameraControls.mouse.isLocked) return;

        const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

        cameraControls.yaw -= movementX * cameraControls.lookSpeed;
        cameraControls.pitch -= movementY * cameraControls.lookSpeed;
        cameraControls.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cameraControls.pitch));
    }

    canvas.addEventListener('click', () => {
        canvas.requestPointerLock = canvas.requestPointerLock ||
            canvas.mozRequestPointerLock ||
            canvas.webkitRequestPointerLock;
        canvas.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', () => {
        cameraControls.mouse.isLocked = document.pointerLockElement === canvas;
    });

    document.addEventListener('mozpointerlockchange', () => {
        cameraControls.mouse.isLocked = document.mozPointerLockElement === canvas;
    });

    function onKeyDown(event) {
        switch (event.code) {
            case 'KeyW': cameraControls.keys.forward = true; break;
            case 'KeyS': cameraControls.keys.backward = true; break;
            case 'KeyA': cameraControls.keys.left = true; break;
            case 'KeyD': cameraControls.keys.right = true; break;
            case 'Space': cameraControls.keys.up = true; break;
            case 'ShiftLeft':
            case 'ShiftRight': cameraControls.keys.down = true; break;
        }
    }

    function onKeyUp(event) {
        switch (event.code) {
            case 'KeyW': cameraControls.keys.forward = false; break;
            case 'KeyS': cameraControls.keys.backward = false; break;
            case 'KeyA': cameraControls.keys.left = false; break;
            case 'KeyD': cameraControls.keys.right = false; break;
            case 'Space': cameraControls.keys.up = false; break;
            case 'ShiftLeft':
            case 'ShiftRight': cameraControls.keys.down = false; break;
        }
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    document.addEventListener('keydown', (event) => {
        if (event.code === 'Escape' && document.pointerLockElement) {
            document.exitPointerLock();
        }
    });
}

export function updateCameraPosition() {
    if (!cameraControls.mouse.isLocked) return;

    camera.rotation.order = 'YXZ';
    camera.rotation.y = cameraControls.yaw;
    camera.rotation.x = cameraControls.pitch;

    const moveVector = new THREE.Vector3();

    if (cameraControls.keys.forward) moveVector.z -= cameraControls.moveSpeed;
    if (cameraControls.keys.backward) moveVector.z += cameraControls.moveSpeed;
    if (cameraControls.keys.left) moveVector.x -= cameraControls.moveSpeed;
    if (cameraControls.keys.right) moveVector.x += cameraControls.moveSpeed;
    if (cameraControls.keys.up) moveVector.y += cameraControls.moveSpeed;
    if (cameraControls.keys.down) moveVector.y -= cameraControls.moveSpeed;

    moveVector.applyQuaternion(camera.quaternion);
    camera.position.add(moveVector);
}
