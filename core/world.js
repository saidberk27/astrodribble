import * as THREE from 'three';
import { gltf_loader } from '../game.js';
import { scene } from './scene.js';

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
    const courtGeometry = new THREE.PlaneGeometry(15.24, 28.65);

    const textureLoader = new THREE.TextureLoader();
    const courtTexture = textureLoader.load('textures/court_texture.jpg');

    const courtMaterial = new THREE.MeshStandardMaterial({
        map: courtTexture,
        side: THREE.DoubleSide
    });

    const court = new THREE.Mesh(courtGeometry, courtMaterial); // Court Mesh oluşturulan yer

    court.rotation.x = -Math.PI / 2;
    court.receiveShadow = true;
    scene.add(court);


}

export function createHoops() {

    gltf_loader.load(
        'models/basketball_hoop2.glb',
        function (gltf) {
            const hoop1 = gltf.scene;    // İlk pota 
            hoop1.scale.set(0.01, 0.01, 0.01); // Ölçeği ayarla (modele göre değişebilir)
            hoop1.position.set(0, 2, 12.5); // Sahanın bir ucuna yerleştir
            hoop1.castShadow = false;
            hoop1.receiveShadow = false;
            hoop1.rotation.y = Math.PI; // 180 derece döndür
            scene.add(hoop1);

            const hoop2 = gltf.scene.clone();// İkinci pota 
            hoop2.position.set(0, 2, -12.5); // Sahanın diğer ucuna yerleştir
            hoop2.rotation.y = Math.PI; // 180 derece döndür
            hoop2.castShadow = false;
            hoop2.receiveShadow = false;
            scene.add(hoop2);
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
