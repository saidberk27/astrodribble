import { createScene, createRenderer, handleWindowResize } from './core/scene.js';
import { createCamera, enableCameraMotions, updateCameraPosition } from './core/camera.js';
import { createLights, createCourt, createHoops } from './core/world.js';
import { createPlayer, setupPlayerControls } from './core/player.js';
import { Ball } from './core/ball.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';


export const gltf_loader = new GLTFLoader();
let updatePlayerMovement;
let ball;

function init() {
    const scene = createScene();
    const camera = createCamera();
    const renderer = createRenderer();

    // Oyuncuyu oluştur
    const player = createPlayer();
    scene.add(player.mesh);

    // Topu oluştur
    ball = new Ball();
    scene.add(ball.mesh);

    // Oyuncu kontrollerini ayarla (kamera parametresini ekledik)
    updatePlayerMovement = setupPlayerControls(player, ball, camera);

    enableCameraMotions(renderer);
    handleWindowResize(camera); createLights();
    createCourt();
    createHoops();

    animate(renderer, scene, camera);
}

function animate(renderer, scene, camera) {
    requestAnimationFrame(() => animate(renderer, scene, camera));
    if (updatePlayerMovement) {
        updatePlayerMovement();
    }
    if (ball) {
        ball.update();
    }
    updateCameraPosition();
    renderer.render(scene, camera);
}

// Başlat
init();