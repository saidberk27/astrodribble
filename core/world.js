import * as THREE from 'three';
// GLTFLoader'ı buradan kaldırıyoruz, game.js'den gelecek.
import { scene } from './scene.js';

export function createLights() {
    // Güneş için parlak materyal oluştur
    const sunGeometry = new THREE.SphereGeometry(1, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 0.8
    });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.position.set(20, 20, 20); // Güneşin pozisyonu
    scene.add(sun);

    // Directional light'ı güneşin pozisyonuna göre ayarla
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.copy(sun.position);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Ambient light'ı daha düşük yoğunlukta tut
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    // Güneşin etrafında bir parıltı efekti
    const spriteMaterial = new THREE.SpriteMaterial({
        map: new THREE.TextureLoader().load('textures/glow.png'),
        color: 0xffff00,
        transparent: true,
        blending: THREE.AdditiveBlending
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(4, 4, 1);
    sun.add(sprite);

    // Güneşi hareket ettirmek için bir animasyon fonksiyonu
    function animateSun() {
        const time = Date.now() * 0.001;
        const radius = 30;
        sun.position.x = Math.cos(time * 0.3) * radius;
        sun.position.z = Math.sin(time * 0.3) * radius;
        sun.position.y = 20 + Math.sin(time * 0.5) * 5;
        directionalLight.position.copy(sun.position);
        requestAnimationFrame(animateSun);
    }
    animateSun();
}

export function createCourt(texturePath = 'textures/court_texture.jpg') { // texturePath parametresi eklendi
    const courtGeometry = new THREE.PlaneGeometry(15.24, 28.65);
    const textureLoader = new THREE.TextureLoader();

    // Doku yolunu parametreden al
    console.log("Saha dokusu yükleniyor:", texturePath); // Hangi dokunun yüklendiğini görmek için
    const courtTexture = textureLoader.load(texturePath); // Parametreyi kullan

    const courtMaterial = new THREE.MeshStandardMaterial({
        map: courtTexture,
        side: THREE.DoubleSide
    });
    const court = new THREE.Mesh(courtGeometry, courtMaterial);
    court.rotation.x = -Math.PI / 2;
    court.receiveShadow = true;
    scene.add(court); // scene'i global olarak (scene.js'den import ederek) kullandığınızı varsayıyorum
}

// createHoops fonksiyonunu güncelliyoruz
export function createHoops(hoopsArray, gltf_loader) { // hoopsArray ve gltf_loader parametre olarak alınıyor

    const hoopRingHeight = 3.05; // Pota çemberinin standart yerden yüksekliği (Y ekseni)
    const hoopRingRadius = 0.45; // Pota çemberi yarıçapı (yaklaşık)
    const hoopTubeRadius = 0.03; // Pota çemberi kalınlığı (yaklaşık)

    // --- BURASI ÇOK ÖNEMLİ: HİZALAMA AYARLARI ---
    // Bu ofset değerleriyle oynayarak kırmızı ve mavi tel kafes çemberleri
    // görsel pota modelinin tam içine oturacak şekilde ayarlamanız gerekiyor.
    // Özellikle Z eksenindeki kaymayı düzeltmek için bu değerleri değiştirin.
    // Örnek: Değeri -0.5, -0.4, 0, 0.1 gibi değiştirerek test edin.
    const hoop1_Z_offset = -0.6; // Birinci potanın (pozitif Z tarafındaki) tel kafes çemberinin Z ofseti.
    const hoop2_Z_offset = 0.6;  // İkinci potanın (negatif Z tarafındaki) tel kafes çemberinin Z ofseti.
    // ---------------------------------------------

    gltf_loader.load(
        'models/basketball_hoop2.glb',
        function (gltf) {
            // --- Birinci Pota ---
            const hoop1 = gltf.scene;
            hoop1.scale.set(0.01, 0.01, 0.01);
            hoop1.position.set(0, 2, 12.5); // Görsel modelin pozisyonu
            hoop1.rotation.y = Math.PI; // Bu doğru görünüyordu
            hoop1.castShadow = false;
            hoop1.receiveShadow = false;
            scene.add(hoop1);

            const torusGeo1 = new THREE.TorusGeometry(hoopRingRadius, hoopTubeRadius, 16, 50);
            const torusMat1 = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
            const hoop1CollisionMesh = new THREE.Mesh(torusGeo1, torusMat1);

            // Çarpışma çemberinin pozisyonunu buradan ayarlayın
            hoop1CollisionMesh.position.set(hoop1.position.x, hoopRingHeight, hoop1.position.z + hoop1_Z_offset);
            hoop1CollisionMesh.rotation.x = Math.PI / 2;
            scene.add(hoop1CollisionMesh);
            hoop1.userData.collisionMesh = hoop1CollisionMesh;
            hoopsArray.push(hoop1);

            // --- İkinci Pota ---
            const hoop2 = gltf.scene.clone();
            hoop2.scale.set(0.01, 0.01, 0.01); // Ölçeği burada da ayarlamayı unutmayın
            hoop2.position.set(0, 2, -12.5); // Görsel modelin pozisyonu
            // --- DÜZELTME: İkinci potanın da yönünü ilk pota gibi yapalım ---
            hoop2.rotation.y = Math.PI; // İkinci potanın yönü tersse burayı "0" olarak deneyin.
            // --------------------------------------------------------------
            hoop2.castShadow = false;
            hoop2.receiveShadow = false;
            scene.add(hoop2);

            const torusGeo2 = new THREE.TorusGeometry(hoopRingRadius, hoopTubeRadius, 16, 50);
            const torusMat2 = new THREE.MeshBasicMaterial({ color: 0x0000ff, wireframe: true });
            const hoop2CollisionMesh = new THREE.Mesh(torusGeo2, torusMat2);

            // Çarpışma çemberinin pozisyonunu buradan ayarlayın
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