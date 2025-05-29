import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'; // FBXLoader'ı import edin
import { loadingManager } from './loading.js';

export let scene;
export let renderer;

export const fbx_loader = new FBXLoader(loadingManager);


export function createScene() {
    scene = new THREE.Scene();
    scene.fog = null; // Disable fog
    return scene;
}

export function createRenderer() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);
    return renderer;
}

export function handleWindowResize(camera) {
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

