import { createScene, createRenderer, handleWindowResize } from './core/scene.js';
import { createCamera, enableCameraMotions, updateCameraPosition } from './core/camera.js';
import { createLights, createCourt, createHoops } from './core/world.js';
import { createPlayer, setupPlayerControls } from './core/player.js';
import { Ball } from './core/ball.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { initPhysics, updatePhysics } from './core/physics.js';
import { ShootingSystem } from './core/shoot.js';

export const gltf_loader = new GLTFLoader();

let player;
let updatePlayerMovement;
let ball;
let gameRenderer;
let gameCamera;
let gameScene;
let shootingSystem;

function init() {
    gameScene = createScene();
    gameCamera = createCamera(); // Kamera oluşturuluyor
    gameRenderer = createRenderer();
    shootingSystem = new ShootingSystem();

    // Eksen yardımcısını artık kaldırabiliriz, eğer hala duruyorsa
    // const axesHelper = gameScene.getObjectByName("axesHelper"); // İsme göre bulup kaldırma
    // if (axesHelper) gameScene.remove(axesHelper);

    initPhysics();

    player = createPlayer();
    gameScene.add(player.mesh);

    ball = new Ball();
    if (ball.mesh) {
        gameScene.add(ball.mesh);
    }

    updatePlayerMovement = setupPlayerControls(player, ball, shootingSystem);

    // ---- KAMERA TAKİBİNİ AKTİF HALE GETİRİYORUZ ----
    enableCameraMotions(gameRenderer, player); // Bu satırı yorumdan çıkarın
    // ---- KAMERA TAKİBİ AKTİF ----

    // ---- SABİT KAMERA AYARLARINI YORUM SATIRINA ALIN VEYA SİLİN ----
    // gameCamera.position.set(0, 5, 10);
    // gameCamera.lookAt(0, 1, 0);
    // ---- SABİT KAMERA AYARLARI SONU ----

    handleWindowResize(gameCamera, gameRenderer);

    createLights(gameScene);
    createCourt(gameScene);
    createHoops(gameScene);

    animate();
}

function animate() {
    requestAnimationFrame(animate);

    updatePhysics();

    if (updatePlayerMovement) {
        updatePlayerMovement();
    }
    if (player && typeof player.update === 'function') {
        player.update();
    }
    if (ball && typeof ball.update === 'function') {
        ball.update();
        // ball.checkBasket(...);
    }

    // ---- KAMERA POZİSYON GÜNCELLEMESİNİ AKTİF HALE GETİRİYORUZ ----
    if (typeof updateCameraPosition === 'function') {
        updateCameraPosition(); // Bu satırı yorumdan çıkarın
    }
    // ---- KAMERA POZİSYON GÜNCELLEMESİ AKTİF ----

    if (gameRenderer && gameScene && gameCamera) {
        gameRenderer.render(gameScene, gameCamera);
    }
}

// Başlat
init();

