import { createScene, createRenderer, handleWindowResize, scene as globalScene } from './core/scene.js';
import { showLoadingScreen, loadingManager } from './core/loading.js';
import { createCamera, enableCameraMotions, updateCameraPosition } from './core/camera.js';
import { createLights, createCourt, createHoops } from './core/world.js';
import { createPlayer, setupPlayerControls } from './core/player.js';
import { createAlien } from './core/alien.js';
import { Ball } from './core/ball.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'; // <-- YENİ IMPORT
import * as THREE from 'three';

export const gltf_loader = new GLTFLoader();
export const fbx_loader = new FBXLoader(); // <-- YENİ LOADER
let updatePlayerMovement; // setupPlayerControls'dan dönen fonksiyonu saklar
let cleanupPlayerSystem = null; // Arkadaşının eklediği cleanup sistemi
let cleanupResizeHandler = null; // Arkadaşının eklediği cleanup sistemi
let ball;
let alien; // Add alien variable
export let hoops = [];
let score = 0;
let scoreElement;
let isGameOver = false; // Add game over state

export let currentLevel = 1; // Başlangıç seviyesi
let currentMusic = null; // Şu an çalan müzik

export const levelSettings = {
    1: {
        name: "Dünya",
        gravity: 0.015,
        courtTexture: 'textures/court_texture.jpg',
        hdriPath: 'textures/hdri/PlanetaryEarth4k.hdr',
        skyColor: 0x87CEEB,
        music: 'musics/main.mp3'
    },
    2: {
        name: "Mars",
        gravity: 0.0057,
        courtTexture: 'textures/court_texture_mars.jpg',
        hdriPath: 'textures/hdri/mars_sky.hdr',
        skyColor: 0xFF7F50,
        music: 'musics/mars.mp3'
    },
    3: {
        name: "Europa Uydusu",
        gravity: 0.01125,
        courtTexture: 'textures/court_texture_europa.jpg',
        hdriPath: 'textures/hdri/europa_sky.hdr',
        skyColor: 0xADD8E6,
        music: 'musics/europa.mp3'
    },
    4: {
        name: "Kara Delik Gezegeni",
        gravity: 0.0225,
        courtTexture: 'textures/court_texture_blackhole.jpg',
        hdriPath: 'textures/hdri/blackhole_sky.hdr',
        skyColor: 0x101020,
        music: 'musics/black_hole.mp3'
    }
};

// Müzik yönetimi için fonksiyonlar
function playMusic(musicPath) {
    if (currentMusic) {
        currentMusic.pause();
        currentMusic = null;
    }

    const audio = new Audio(musicPath);
    audio.loop = true; // Müziği sürekli çal
    audio.volume = 0.5; // Ses seviyesini yarıya indir

    // Tarayıcının otomatik çalma politikası için kullanıcı etkileşimi gerekiyor
    const playPromise = audio.play();
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            console.log('Müzik otomatik başlatılamadı, kullanıcı etkileşimi bekleniyor...');
            // Kullanıcı etkileşimi için tek seferlik bir event listener ekle
            const startAudio = () => {
                audio.play().then(() => {
                    document.removeEventListener('click', startAudio);
                    document.removeEventListener('keydown', startAudio);
                }).catch(e => console.warn('Müzik çalınırken hata:', e));
            };
            document.addEventListener('click', startAudio);
            document.addEventListener('keydown', startAudio);
        });
    }
    currentMusic = audio;
}

function stopMusic() {
    if (currentMusic) {
        currentMusic.pause();
        currentMusic = null;
    }
}

const rgbeLoader = new RGBELoader(); // RGBELoader'ı bir kere oluştur
const clock = new THREE.Clock(); // Arkadaşının eklediği deltaTime için

function setEnvironment(settings) {
    return new Promise((resolve, reject) => {
        if (settings.hdriPath) {
            rgbeLoader.load(settings.hdriPath, function (texture) {
                texture.mapping = THREE.EquirectangularReflectionMapping;
                globalScene.background = texture;
                globalScene.environment = texture;
                console.log(settings.name + " için HDRI yüklendi ve ayarlandı.");
                resolve();
            }, undefined, (err) => {
                console.error("HDRI yüklenirken hata: " + settings.hdriPath + ". Yedek renk kullanılıyor.", err);
                globalScene.background = new THREE.Color(settings.skyColor || 0x333333);
                globalScene.environment = null;
                resolve();
            });
        } else {
            globalScene.background = new THREE.Color(settings.skyColor || 0x333333);
            globalScene.environment = null;
            resolve();
        }
    });
}

function updateScoreDisplay() {
    if (scoreElement) {
        scoreElement.innerText = 'Score: ' + score;
    }
}

export function incrementScore() {
    score++;
    updateScoreDisplay();
    console.log("Score:", score);
}

let renderer;
let animationFrameId = null;

function cleanupScene() {
    console.log("Sahne temizleniyor...");

    // Müziği durdur
    stopMusic();

    // DOM'dan güç barını kaldır
    const powerBar = document.querySelector('div[style*="fixed"][style*="20px"][style*="200px"]');
    if (powerBar && powerBar.parentElement === document.body) {
        console.log("Güç barı kaldırılıyor.");
        document.body.removeChild(powerBar);
    }

    // Yörünge çizgisini temizle (shoot.js'deki dispose da bu işi yapmalı)
    // Eğer shootingSystem'e global bir referansımız olsaydı, dispose'unu çağırabilirdik.
    // Şimdilik, adı "trajectoryLine_Astrodribble" olan nesneyi arayıp kaldıralım (bu isim shoot.js'de verilmeli)
    const trajectoryLine = globalScene.getObjectByName("trajectoryLine_Astrodribble"); // Bu isimlendirme shoot.js'de yapılmalı
    if (trajectoryLine) {
        globalScene.remove(trajectoryLine);
        if (trajectoryLine.geometry) trajectoryLine.geometry.dispose();
        if (trajectoryLine.material) trajectoryLine.material.dispose();
        console.log("Yörünge çizgisi (varsa) kaldırıldı.");
    }

    // Arkadaşının gelişmiş cleanup sistemi
    for (let i = globalScene.children.length - 1; i >= 0; i--) {
        const child = globalScene.children[i];
        // Kamera ve ışıkları sahnede tut
        if (child.isCamera || child.isLight) {
            continue;
        }

        // Belleği temizle
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
            if (Array.isArray(child.material)) {
                child.material.forEach(material => { if (material.dispose) material.dispose(); });
            } else if (child.material.dispose) {
                child.material.dispose();
            }
        }
        child.traverse(subChild => {
            if (subChild.isMesh) {
                if (subChild.geometry) subChild.geometry.dispose();
                if (subChild.material) {
                    if (Array.isArray(subChild.material)) {
                        subChild.material.forEach(material => { if (material.dispose) material.dispose(); });
                    } else if (subChild.material.dispose) {
                        subChild.material.dispose();
                    }
                }
            }
        });
        globalScene.remove(child);
    }
    hoops = []; // Pota dizisini sıfırla
    // ball ve player init içinde yeniden oluşturulacak
}

async function resetAndInitLevel() {
    console.log("resetAndInitLevel çağrıldı.");

    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        console.log("Animasyon durduruldu.");
    }

    // Arkadaşının cleanup sistemi
    if (cleanupPlayerSystem) {
        cleanupPlayerSystem();
        cleanupPlayerSystem = null;
    }
    updatePlayerMovement = null;
    if (cleanupResizeHandler) {
        cleanupResizeHandler();
        cleanupResizeHandler = null;
    }

    cleanupScene();

    score = 0; // Seviye değişince Scoreu sıfırla
    updateScoreDisplay();

    if (renderer && renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
        // renderer.dispose(); // WebGL context'ini de temizler, her zaman gerekli olmayabilir
    }
    // renderer = null; // Yeniden kullanılacağı için null yapmayalım

    console.log("Sahne temizlendi, yeni seviye için init() çağrılıyor.");
    await init();
}

export async function changeLevel(levelId) {
    if (levelSettings[levelId] && currentLevel !== levelId) {
        showLoadingScreen(true, `Loading ${levelSettings[levelId].name}...`);
        console.log((levelSettings[currentLevel]?.name || "Bilinmeyen Gezegen") + " gezegeninden " + (levelSettings[levelId]?.name || "Bilinmeyen Gezegen") + " gezegenine geçiliyor...");
        currentLevel = levelId;

        // Yeni müziği çal
        if (levelSettings[levelId].music) {
            playMusic(levelSettings[levelId].music);
        }

        await resetAndInitLevel();
    } else if (currentLevel === levelId) {
        console.log((levelSettings[currentLevel]?.name || "Bilinmeyen Gezegen") + " gezegenindesiniz zaten.");
    } else {
        console.warn("Geçersiz seviye ID'si:", levelId);
    }
}

function handleGameOver(event) {
    if (isGameOver) return;
    isGameOver = true;

    // Create game over screen
    const gameOverScreen = document.createElement('div');
    gameOverScreen.style.position = 'fixed';
    gameOverScreen.style.top = '50%';
    gameOverScreen.style.left = '50%';
    gameOverScreen.style.transform = 'translate(-50%, -50%)';
    gameOverScreen.style.background = 'rgba(0, 0, 0, 0.8)';
    gameOverScreen.style.color = 'white';
    gameOverScreen.style.padding = '20px';
    gameOverScreen.style.borderRadius = '10px';
    gameOverScreen.style.textAlign = 'center';
    gameOverScreen.style.zIndex = '1000';

    gameOverScreen.innerHTML = `
    <div style="
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 20px;
        padding: 40px;
        text-align: center;
        box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        border: 3px solid #fff;
        max-width: 400px;
        margin: 0 auto;
        animation: slideIn 0.5s ease-out;
    ">
        <div style="
            background: rgba(255,255,255,0.1);
            border-radius: 50%;
            width: 80px;
            height: 80px;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
        ">
            💀
        </div>
        
        <h1 style="
            color: #fff;
            font-size: 2.5em;
            margin: 0 0 15px 0;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
            font-family: 'Arial Black', sans-serif;
        ">GAME OVER</h1>
        
        <p style="
            color: #ffeb3b;
            font-size: 1.2em;
            margin: 15px 0;
            font-weight: bold;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
        ">${event.detail.reason}</p>
        
        <div style="
            background: rgba(255,255,255,0.2);
            border-radius: 15px;
            padding: 15px;
            margin: 20px 0;
            border: 2px solid rgba(255,255,255,0.3);
        ">
            <p style="
                color: #fff;
                font-size: 1.4em;
                margin: 0;
                font-weight: bold;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
            ">Final Score: <span style="color: #4caf50; font-size: 1.2em;">${score}</span></p>
        </div>
        
        <button id="restartButton" style="
            background: linear-gradient(45deg, #4caf50, #45a049);
            color: white;
            border: none;
            padding: 15px 30px;
            font-size: 1.1em;
            font-weight: bold;
            border-radius: 25px;
            cursor: pointer;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 10px;
        " 
        onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 7px 20px rgba(0,0,0,0.4)'"
        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 5px 15px rgba(0,0,0,0.3)'"
        onmousedown="this.style.transform='translateY(1px)'"
        onmouseup="this.style.transform='translateY(-2px)'">
            🔄 Restart Level
        </button>
    </div>
    
    <style>
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(-50px) scale(0.8);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }
    </style>
`;

    document.body.appendChild(gameOverScreen);

    // Add restart button handler
    document.getElementById('restartButton').addEventListener('click', () => {
        document.body.removeChild(gameOverScreen);
        isGameOver = false;
        resetAndInitLevel();
    });
}

async function init() {
    showLoadingScreen(true, 'Initializing game...');
    var settings = levelSettings[currentLevel];
    if (!settings) {
        console.error("Geçerli seviye ayarları bulunamadı! Seviye ID:", currentLevel);
        currentLevel = 1;
        settings = levelSettings[currentLevel];
    }
    console.log(settings.name + " gezegeni yükleniyor... Yerçekimi:", settings.gravity);

    createScene();
    await setEnvironment(settings);

    const camera = createCamera(); // camera.js'deki global kamerayı kullanır

    if (!renderer) {
        renderer = createRenderer();
    } else {
        if (!renderer.domElement.parentElement) { // DOM'da değilse ekle
            document.body.appendChild(renderer.domElement);
        }
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    scoreElement = document.getElementById('score');
    updateScoreDisplay();

    // Initialize loading managers for loaders
    gltf_loader.manager = loadingManager;
    fbx_loader.manager = loadingManager;

    const player = createPlayer();
    alien = createAlien(player); // Create alien after player

    ball = new Ball(settings.gravity);
    globalScene.add(ball.mesh);

    // Potaları yeniden oluştur (hoops dizisini temizlemiştik)
    hoops = []; // Önceki seviyeden kalan potaları temizle (cleanupScene'de de yapılıyor ama burada da garanti)
    createHoops(hoops, gltf_loader);

    // Arkadaşının cleanup sistemi ile uyumlu
    const playerControlSystem = setupPlayerControls(player, ball, hoops);
    updatePlayerMovement = playerControlSystem.update;
    cleanupPlayerSystem = playerControlSystem.cleanup;

    enableCameraMotions(renderer, player);
    cleanupResizeHandler = handleWindowResize(camera, renderer); // Arkadaşının cleanup sistemi
    createLights(); // Bu ışıklar HDRI ile birlikte çalışacak
    createCourt(settings.courtTexture);

    // Initialize loading managers for loaders
    gltf_loader.manager = loadingManager;
    fbx_loader.manager = loadingManager;

    const buttonConfigs = [
        { id: 'goToWorldButton', level: 1 },
        { id: 'goToMarsButton', level: 2 },
        { id: 'goToEuropaButton', level: 3 },
        { id: 'goToBlackholeButton', level: 4 }
    ];

    buttonConfigs.forEach(config => {
        const button = document.getElementById(config.id);
        if (button) {
            const newButton = button.cloneNode(true); // Eski listener'ları silmek için
            if (button.parentNode) {
                button.parentNode.replaceChild(newButton, button);
            }
            newButton.addEventListener('click', () => changeLevel(config.level));
        }
    });

    // Add game over event listener
    window.addEventListener('gameOver', handleGameOver);

    // Play background music for the current level only if we have music to play
    if (settings.music) {
        playMusic(settings.music);
    }

    if (!animationFrameId) {
        console.log("Animasyon döngüsü başlatılıyor.");
        clock.start(); // Arkadaşının eklediği deltaTime için
        animate(renderer, globalScene, camera);
    }
}

function animate(renderer, sceneRef, cameraRef) {
    animationFrameId = requestAnimationFrame(() => animate(renderer, sceneRef, cameraRef));

    const deltaTime = clock.getDelta(); // Arkadaşının eklediği deltaTime

    if (!isGameOver) {
        if (updatePlayerMovement) {
            updatePlayerMovement(deltaTime); // Arkadaşının deltaTime parametresi
        }
        if (ball) {
            ball.update(deltaTime); // Arkadaşının deltaTime parametresi
            ball.checkHoopCollision(hoops, incrementScore);
        }
        if (alien) {
            alien.update();
        }
    }

    updateCameraPosition();
    renderer.render(sceneRef, cameraRef);
}

// Oyunu başlat
init();