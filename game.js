// main.js veya JavaScript dosyanız
// Bu, projenizin kök dizinindeki node_modules klasörünü varsayar.
// main.js ve index.html'in node_modules ile aynı seviyede olduğunu varsayalım.
import * as THREE from 'three';

// Diğer modüllerin yolları da benzer şekilde olmalı:
import { Line2 } from 'three/examples/jsm/lines/Line2';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry';

// Geri kalan Three.js kodunuz...

// Temel değişkenler
let scene, camera, renderer;

// Sahne kurulumu
function init() {
    // Scene oluştur
    createScene();
    createCamera();
    createRenderer();

    createLights();
    createCourt();
    // Animate fonksiyonunu başlat
    animate();
}

function createCamera() {
    // Camera oluştur
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 8, 15);
    camera.lookAt(0, 0, 0); // Sahnenin merkezine bak
}

function createScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Açık mavi gökyüzü
    return scene;
}

function createRenderer() {
    // Renderer oluştur
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    return renderer;
}

// Işık sistemi
function createLights() {
    // Directional Light (güneş ışığı gibi)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 20, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Ambient Light (genel ortam ışığı)
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    scene.add(ambientLight);
}

// Basketbol sahası
function createCourt() {
    // Saha zemini
    const courtGeometry = new THREE.PlaneGeometry(15.24, 28.65); //Düzlemsel yüzey için. Genişlik, yükseklik. Zemin ve duvarlar için genelde bu olur.
    const courtMaterial = new THREE.MeshLambertMaterial({ //Lambert Material -> Mat yüzey
        color: 0x8B4513,  // Kahverengi saha
        side: THREE.DoubleSide
    });
    const court = new THREE.Mesh(courtGeometry, courtMaterial); //Mesh 3D görünen bir nesne demektir. Geometry, Material.
    court.rotation.x = -Math.PI / 2; // 90 derece çevir (yatay yap)
    court.receiveShadow = true;
    scene.add(court);

    // Saha çizgileri
    const outerCircleGeometry = new THREE.RingGeometry(4, 4.2, 32);
    const outerCircleMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide
    });
    const outerCircle = new THREE.Mesh(outerCircleGeometry, outerCircleMaterial);
    outerCircle.rotation.x = -Math.PI / 2;
    outerCircle.position.y = 0.01; // Zeminin biraz üstünde


    const inncerCircleGeometry = new THREE.RingGeometry(2, 2.1, 32);
    const innerCircleMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide
    });
    const innerCircle = new THREE.Mesh(inncerCircleGeometry, innerCircleMaterial);
    innerCircle.rotation.x = -Math.PI / 2;
    innerCircle.position.y = 0.01; // Zeminin biraz üstünde

    const linePositions = [
        -10, 0, 0,  // Başlangıç noktası
        0, 10, 0,   // Orta nokta
        10, 0, 0    // Bitiş noktası
    ];

    const lineGeometry = new LineGeometry();
    lineGeometry.setPositions(linePositions); // Bu, LineGeometry'ye özel bir metottur
    scene.add(innerCircle, outerCircle);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

// Pencere boyutu değiştiğinde
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Başlat
init();