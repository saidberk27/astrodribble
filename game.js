import { createScene, createRenderer, handleWindowResize } from './core/scene.js';
import { createCamera, enableCameraMotions, updateCameraPosition } from './core/camera.js';
import { createLights, createCourt, createHoops } from './core/world.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';


export const gltf_loader = new GLTFLoader();
function init() {
    const scene = createScene();
    const camera = createCamera();
    const renderer = createRenderer();

    enableCameraMotions(renderer);
    handleWindowResize(camera); createLights();
    createCourt();
    createHoops();

    animate(renderer, scene, camera);
}

function animate(renderer, scene, camera) {
    requestAnimationFrame(() => animate(renderer, scene, camera));
    updateCameraPosition();
    renderer.render(scene, camera);
}

// Başlat
init();