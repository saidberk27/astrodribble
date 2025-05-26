import { createScene, createRenderer, handleWindowResize } from './core/scene.js';
import { createCamera, enableCameraMotions, updateCameraPosition } from './core/camera.js';
import { createLights, createCourt } from './core/world.js';

// Game state variables will be managed here if needed

function init() {
    const scene = createScene();
    const camera = createCamera();
    const renderer = createRenderer();

    enableCameraMotions(renderer);
    handleWindowResize(camera);

    createLights();
    createCourt();

    animate(renderer, scene, camera);
}

function animate(renderer, scene, camera) {
    requestAnimationFrame(() => animate(renderer, scene, camera));
    updateCameraPosition();
    renderer.render(scene, camera);
}

// Başlat
init();