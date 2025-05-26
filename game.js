import { createScene, createRenderer, handleWindowResize } from './core/scene.js';
import { createCamera, enableCameraMotions, updateCameraPosition } from './core/camera.js';
import { createLights, createCourt, createHoops } from './core/world.js';
import { createPlayer, setupPlayerControls } from './core/player.js';
import { Ball } from './core/ball.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';


export const gltf_loader = new GLTFLoader();
let updatePlayerMovement;
let ball;
let hoops = []; // Potaları tutacak dizi

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

    // Potaları oluştur ve diziye ekle
    gltf_loader.load(
        'models/basketball_hoop2.glb',
        function (gltf) {
            const hoop1 = gltf.scene;
            hoop1.scale.set(0.01, 0.01, 0.01);
            hoop1.position.set(0, 2, 12.5);
            hoop1.rotation.y = Math.PI;
            scene.add(hoop1);
            hoops.push(hoop1);

            const hoop2 = gltf.scene.clone();
            hoop2.position.set(0, 2, -12.5);
            hoop2.rotation.y = Math.PI;
            scene.add(hoop2);
            hoops.push(hoop2);
        }
    );

    // Oyuncu kontrollerini ayarla
    updatePlayerMovement = setupPlayerControls(player, ball);

    // Kamera takip sistemini oyuncuya bağla
    enableCameraMotions(renderer, player);

    handleWindowResize(camera);
    createLights();
    createCourt();

    animate(renderer, scene, camera);
}

function animate(renderer, scene, camera) {
    requestAnimationFrame(() => animate(renderer, scene, camera));
    if (updatePlayerMovement) {
        updatePlayerMovement();
    }
    if (ball) {
        ball.update();
        ball.checkHoopCollision(hoops); // Pota etkileşimini kontrol et
    }
    updateCameraPosition();
    renderer.render(scene, camera);
}

// Başlat
init();