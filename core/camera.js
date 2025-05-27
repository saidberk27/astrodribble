// core/camera.js

import * as THREE from 'three';

// --- Modül Seviyesi Değişkenler ---
export let camera; // Dışa aktarılacak ana kamera nesnesi
let targetPlayer; // Takip edilecek oyuncu nesnesi

// Kamera ayarları - Bu değerleri projenize göre ayarlayabilirsiniz
const cameraOffset = new THREE.Vector3(0, 2.5, 6); // Oyuncunun ne kadar arkasında ve yukarısında olacağı
const lookAtOffset = new THREE.Vector3(0, 1.0, 0); // Kameranın oyuncunun neresine bakacağı (genellikle biraz yukarısı)
const smoothFactor = 0.08; // Kamera hareketinin yumuşaklık faktörü (daha düşük değer daha yumuşak)

// --- Kamera Oluşturma Fonksiyonu ---
/**
 * Perspektif kamera oluşturur ve başlangıç konumunu ayarlar.
 * @returns {THREE.PerspectiveCamera} Oluşturulan kamera nesnesi.
 */
export function createCamera() {
    camera = new THREE.PerspectiveCamera(
        60, // Görüş açısı (FOV)
        window.innerWidth / window.innerHeight, // En-boy oranı
        0.1, // Yakın kırpma düzlemi
        1000 // Uzak kırpma düzlemi
    );
    // Başlangıçta kamerayı ofset kadar geriye konumlandır (dünya merkezine göre)
    // Gerçek konumlandırma updateCameraPosition içinde oyuncuya göre yapılacak.
    camera.position.copy(cameraOffset);
    camera.lookAt(new THREE.Vector3(0, lookAtOffset.y, 0)); // Başlangıçta merkeze bak
    return camera;
}

// --- Kamera Takibini Etkinleştirme ---
/**
 * Kameranın belirtilen oyuncuyu takip etmesini sağlar.
 * @param {THREE.WebGLRenderer} renderer - (Şu an kullanılmıyor ama gelecekte gerekebilir)
 * @param {object} player - Takip edilecek oyuncu nesnesi.
 * Bu nesnenin getPosition() ve body.quaternion özelliklerine sahip olması beklenir.
 */
export function enableCameraMotions(renderer, player) {
    targetPlayer = player;
}

// --- Kamera Pozisyonunu Güncelleme ---
/**
 * Her animasyon karesinde çağrılarak kameranın pozisyonunu ve bakış yönünü günceller.
 * Oyuncunun mevcut dönüşüne (Y ekseni) göre kamerayı konumlandırır.
 */
export function updateCameraPosition() {
    if (!camera || !targetPlayer || !targetPlayer.body || typeof targetPlayer.getPosition !== 'function') {
        // Gerekli nesneler yoksa veya getPosition bir fonksiyon değilse işlem yapma
        return;
    }

    // 1. Oyuncunun mevcut dünya konumunu al (THREE.Vector3 olarak)
    const playerPosition = targetPlayer.getPosition();

    // 2. Oyuncunun mevcut fiziksel gövdesinin dönüşünü al (CANNON.Quaternion)
    const playerBodyQuaternion = targetPlayer.body.quaternion;

    // 3. Oyuncunun Y ekseni etrafındaki dönüş açısını (radyan) hesapla
    // CANNON.Quaternion'u THREE.Quaternion'a çevirip Euler açılarını al
    const threePlayerQuaternion = new THREE.Quaternion(
        playerBodyQuaternion.x,
        playerBodyQuaternion.y,
        playerBodyQuaternion.z,
        playerBodyQuaternion.w
    );
    const euler = new THREE.Euler().setFromQuaternion(threePlayerQuaternion, 'YXZ'); // Sıralama önemli olabilir
    const playerYRotation = targetPlayer.getRotationY(); // Yeni player.js'deki metodu kullan

    // 4. Kamera ofsetini oyuncunun Y ekseni dönüşüne göre döndür
    const rotatedOffset = cameraOffset.clone().applyAxisAngle(
        new THREE.Vector3(0, 1, 0), // Y ekseni etrafında döndür
        playerYRotation // Oyuncunun Y eksenindeki mevcut açısı kadar
    );

    // 5. Hedef kamera pozisyonunu hesapla: oyuncunun konumu + döndürülmüş ofset
    const targetCameraPosition = playerPosition.clone().add(rotatedOffset);

    // 6. Kameranın mevcut pozisyonunu yumuşak bir şekilde (lerp ile) hedef pozisyona taşı
    camera.position.lerp(targetCameraPosition, smoothFactor);

    // 7. Kameranın bakacağı noktayı hesapla: oyuncunun konumu + bakış ofseti
    // Bakış ofsetini de oyuncunun dönüşüne göre ayarlayabiliriz, ancak genellikle oyuncunun merkezine bakmak yeterlidir.
    // Eğer bakış noktasının da oyuncuyla dönmesi isteniyorsa:
    // const rotatedLookAtOffset = lookAtOffset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), playerYRotation);
    // const lookAtPoint = playerPosition.clone().add(rotatedLookAtOffset);
    // Şimdilik basit tutalım:
    const lookAtPoint = playerPosition.clone().add(lookAtOffset);

    camera.lookAt(lookAtPoint);
}

// --- Pencere Boyutlandırma İşleyicisi ---
/**
 * Pencere yeniden boyutlandırıldığında kameranın en-boy oranını ve
 * renderer'ın boyutunu günceller.
 */
export function handleWindowResize(currentCamera, currentRenderer) {
    const onResize = () => {
        if (currentCamera && currentRenderer) {
            currentCamera.aspect = window.innerWidth / window.innerHeight;
            currentCamera.updateProjectionMatrix();
            currentRenderer.setSize(window.innerWidth, window.innerHeight);
        }
    };
    window.addEventListener('resize', onResize);
    // Başlangıçta bir kere çağır
    onResize();
}