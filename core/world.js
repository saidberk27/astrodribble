import * as THREE from 'three';
import { gltf_loader } from '../game.js';
import { scene } from './scene.js';
import { world, createHoopPhysics, createGroundPhysics, initPhysics } from './physics.js';

// Fizik motorunu başlat
initPhysics();

export function createLights() {
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.set(0, 20, 0);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
}

export function createCourt() {
    // Saha boyutları
    const courtWidth = 15.24;
    const courtLength = 28.65;

    const courtGeometry = new THREE.PlaneGeometry(courtWidth, courtLength);
    const textureLoader = new THREE.TextureLoader();
    const courtTexture = textureLoader.load('textures/court_texture.jpg');

    const courtMaterial = new THREE.MeshStandardMaterial({
        map: courtTexture,
        side: THREE.DoubleSide
    });

    const court = new THREE.Mesh(courtGeometry, courtMaterial);
    court.rotation.x = -Math.PI / 2;
    court.receiveShadow = true;
    scene.add(court);

    // Saha için fizik gövdesi oluştur
    createGroundPhysics(courtWidth, courtLength);


}

// Pota kolizyon nesnelerini tutacak dizi
export const hoopColliders = [];

// Potaların fizik gövdelerini tutacak dizi
export const hoopBodies = [];

export function createHoops() {
    gltf_loader.load(
        'models/basketball_hoop2.glb',
        function (gltf) {
            // Pota parametreleri
            const hoopRadius = 0.45;
            const hoopHeight = 3.05;
            const poleRadius = 0.15;
            const boardWidth = 1.8;
            const boardHeight = 1.5;
            const boardDepth = 0.3;
            const poleHeight = 3.05;

            // İlk pota
            const hoop1 = gltf.scene;
            hoop1.scale.set(0.01, 0.01, 0.01);
            hoop1.position.set(0, hoopHeight / 2, 12.5);
            hoop1.rotation.y = Math.PI;
            scene.add(hoop1);            // İlk pota için fizik gövdeleri oluştur
            const hoop1Physics = createHoopPhysics(new THREE.Vector3(0, hoopHeight, 12.5));
            hoopColliders.push(hoop1Physics);

            // Görünür basket bölgesi çemberi (1. pota)
            const ringGeometry = new THREE.TorusGeometry(hoopRadius, 0.02, 8, 24);
            const ringMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                transparent: true,
                opacity: 0.5
            });
            const ring1 = new THREE.Mesh(ringGeometry, ringMaterial);
            ring1.position.set(0, hoopHeight, 12.5);
            ring1.rotation.x = Math.PI / 2;
            scene.add(ring1);

            // İkinci pota
            const hoop2 = gltf.scene.clone();
            hoop2.position.set(0, hoopHeight / 2, -12.5);
            hoop2.rotation.y = Math.PI;
            scene.add(hoop2);            // İkinci pota için fizik gövdeleri oluştur
            const hoop2Physics = createHoopPhysics(new THREE.Vector3(0, hoopHeight, -12.5));
            hoopColliders.push(hoop2Physics);

            const ring2 = ring1.clone();
            ring2.position.set(0, hoopHeight, -12.5);
            scene.add(ring2);
        },
        // Yükleme sırasında ilerlemeyi göster
        function (xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% yüklendi');
        },
        // Hata durumunda
        function (error) {
            console.error('Model yüklenirken hata oluştu:', error);
        }
    );
}
