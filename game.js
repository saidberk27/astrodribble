import { createScene, createRenderer, handleWindowResize } from './core/scene.js';
import { createCamera, enableCameraMotions, updateCameraPosition } from './core/camera.js';
import { createLights, createCourt, createHoops } from './core/world.js';
import { createPlayer, setupPlayerControls } from './core/player.js';
import { Ball } from './core/ball.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { updatePhysics } from './core/physics.js';

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

    // Oyuncu kontrollerini ayarla
    updatePlayerMovement = setupPlayerControls(player, ball);

    // Kamera takip sistemini oyuncuya bağla
    enableCameraMotions(renderer, player);

    handleWindowResize(camera);
    createLights();
    createCourt();
    createHoops();

    animate(renderer, scene, camera);
}

function animate(renderer, scene, camera) {
    requestAnimationFrame(() => animate(renderer, scene, camera));

    // Fizik motorunu güncelle
    updatePhysics();

    // Oyuncu ve top güncellemeleri
    if (updatePlayerMovement) {
        updatePlayerMovement();
    }
    if (ball) {
        ball.update();

        // Pota pozisyonları için basket kontrolü
        ball.checkBasket({ x: 0, y: 3.05, z: 12.5 });  // İlk pota
        ball.checkBasket({ x: 0, y: 3.05, z: -12.5 }); // İkinci pota
    }

    updateCameraPosition();
    renderer.render(scene, camera);
}

// Başlat
init();