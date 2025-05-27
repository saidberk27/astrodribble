// game.js DOSYASININ TAMAMI (DEĞİŞİKLİKLER İŞARETLENDİ)

import { createScene, createRenderer, handleWindowResize } from './core/scene.js';
import { createCamera, enableCameraMotions, updateCameraPosition } from './core/camera.js';
import { createLights, createCourt, createHoops } from './core/world.js';
import { createPlayer, setupPlayerControls } from './core/player.js';
import { Ball } from './core/ball.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export const gltf_loader = new GLTFLoader();
let updatePlayerMovement;
let ball;
export let hoops = [];

// ===================================
// === 1. YENİ DEĞİŞİKLİK (BAŞLANGIÇ) ===
// ===================================
let score = 0; // Skoru tutacak değişken
let scoreElement; // Skor tabelası (div) elementi için referans
// ===================================
// === 1. YENİ DEĞİŞİKLİK (BİTİŞ) ===
// ===================================


function init() {
    const scene = createScene();
    const camera = createCamera();
    const renderer = createRenderer();

        // ===================================
    // === 2. YENİ DEĞİŞİKLİK (BAŞLANGIÇ) ===
    // ===================================
    // HTML'deki skor elementini değişkene ata
    scoreElement = document.getElementById('score');
    // ===================================
    // === 2. YENİ DEĞİŞİKLİK (BİTİŞ) ===
    // ===================================
    // Oyuncuyu oluştur
    // Oyuncuyu oluştur (gltf_loader'ı parametre olarak gönderiyoruz)
    const player = createPlayer(gltf_loader);
    // scene.add(player.mesh); // Bu satırı SİLİN! Model yüklenince player.js ekleyecek.
    scene.add(player.mesh);

    // Topu oluştur
    ball = new Ball();
    scene.add(ball.mesh);

        // ===================================
    // === 3. YENİ DEĞİŞİKLİK (BAŞLANGIÇ) ===
    // ===================================
    // Eski pota yükleme kodunu SİLİP bunu ekliyoruz
    createHoops(hoops, gltf_loader);
    // ===================================
    // === 3. YENİ DEĞİŞİKLİK (BİTİŞ) ===
    // ===================================
    // Oyuncu kontrollerini ayarla
    updatePlayerMovement = setupPlayerControls(player, ball,hoops);

    // Kamera takip sistemini oyuncuya bağla
    enableCameraMotions(renderer, player);

    handleWindowResize(camera);
    createLights();
    createCourt();

    animate(renderer, scene, camera);
}
// ===================================
// === 4. YENİ DEĞİŞİKLİK (BAŞLANGIÇ) ===
// ===================================
// Skoru güncelleyen yeni fonksiyonumuz
function updateScore() {
    score++; // Skoru 1 artır
    scoreElement.innerText = 'Skor: ' + score; // HTML'i güncelle
    console.log("Skor güncellendi:", score);
}
// ===================================
// === 4. YENİ DEĞİŞİKLİK (BİTİŞ) ===
// ===================================

function animate(renderer, scene, camera) {
    requestAnimationFrame(() => animate(renderer, scene, camera));
    if (updatePlayerMovement) {
        updatePlayerMovement();
    }
    if (ball) {
        ball.update();
        // ===================================
        // === 5. YENİ DEĞİŞİKLİK (BAŞLANGIÇ) ===
        // ===================================
        // ball.checkHoopCollision(hoops); YERİNE AŞAĞIDAKİNİ YAZIYORUZ:
        ball.checkHoopCollision(hoops, updateScore); // updateScore fonksiyonunu gönderiyoruz
        // ===================================
        // === 5. YENİ DEĞİŞİKLİK (BİTİŞ) ===
        // ===================================
    }
    updateCameraPosition();
    renderer.render(scene, camera);
}

// Başlat
init();