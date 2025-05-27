import * as THREE from 'three';
// GLTFLoader'ı buradan kaldırıyoruz, game.js'den gelecek.
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
    const court = new THREE.Mesh(courtGeometry, courtMaterial);
    court.rotation.x = -Math.PI / 2;
    court.receiveShadow = true;
    scene.add(court);
}

// createHoops fonksiyonunu güncelliyoruz
export function createHoops(hoopsArray, gltf_loader) { // hoopsArray ve gltf_loader parametre olarak alınıyor

    const hoopRingHeight = 3.05; // Standart pota yüksekliği
    const hoopRingRadius = 0.45; // Pota çemberi yarıçapı (yaklaşık)
    const hoopTubeRadius = 0.03; // Pota çemberi kalınlığı (yaklaşık)


    // --- DENEME YANILMA İÇİN OFSETLER ---
    // Bu değerlerle oynayarak çemberleri tam potanın üzerine getirmeye çalışın.
    const hoop1_Z_offset = -0.6; // Örneğin, -0.1 veya +0.1 gibi değerler deneyin
    const hoop2_Z_offset = 0.6; // Örneğin, -0.1 veya +0.1 gibi değerler deneyin
    // ------------------------------------

 gltf_loader.load(
        'models/basketball_hoop2.glb',
        function (gltf) {
            // --- Birinci Pota ---
            const hoop1 = gltf.scene;
            hoop1.scale.set(0.01, 0.01, 0.01);
            hoop1.position.set(0, 2, 12.5);
            hoop1.rotation.y = Math.PI; // Bu doğru görünüyordu
            hoop1.castShadow = false;
            hoop1.receiveShadow = false;
            scene.add(hoop1);

            const torusGeo1 = new THREE.TorusGeometry(hoopRingRadius, hoopTubeRadius, 16, 50);
            const torusMat1 = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
            const hoop1CollisionMesh = new THREE.Mesh(torusGeo1, torusMat1);
            // Çarpışma çemberinin pozisyonunu pota pozisyonu + ofset olarak ayarla
            hoop1CollisionMesh.position.set(hoop1.position.x, hoopRingHeight, hoop1.position.z + hoop1_Z_offset);
            hoop1CollisionMesh.rotation.x = Math.PI / 2;
            scene.add(hoop1CollisionMesh);
            hoop1.userData.collisionMesh = hoop1CollisionMesh;
            hoopsArray.push(hoop1);

            // --- İkinci Pota ---
            const hoop2 = gltf.scene.clone();
            hoop2.scale.set(0.01, 0.01, 0.01); // Ölçeği burada da ayarlamayı unutmayın
            hoop2.position.set(0, 2, -12.5);
            // --- DÜZELTME: İkinci potanın da yönünü ilk pota gibi yapalım ---
            hoop2.rotation.y = Math.PI; // Eğer bu da tersse 0 deneyin.
            // --------------------------------------------------------------
            hoop2.castShadow = false;
            hoop2.receiveShadow = false;
            scene.add(hoop2);

            const torusGeo2 = new THREE.TorusGeometry(hoopRingRadius, hoopTubeRadius, 16, 50);
            const torusMat2 = new THREE.MeshBasicMaterial({ color: 0x0000ff, wireframe: true });
            const hoop2CollisionMesh = new THREE.Mesh(torusGeo2, torusMat2);
            // Çarpışma çemberinin pozisyonunu pota pozisyonu + ofset olarak ayarla
            hoop2CollisionMesh.position.set(hoop2.position.x, hoopRingHeight, hoop2.position.z + hoop2_Z_offset);
            hoop2CollisionMesh.rotation.x = Math.PI / 2;
            scene.add(hoop2CollisionMesh);
            hoop2.userData.collisionMesh = hoop2CollisionMesh;
            hoopsArray.push(hoop2);

            console.log("Potalar ve çarpışma çemberleri (düzeltilmiş) oluşturuldu.");
        },
        function (xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% pota modeli yüklendi');
        },
        function (error) {
            console.error('Pota modeli yüklenirken hata oluştu:', error);
        }
    );
}