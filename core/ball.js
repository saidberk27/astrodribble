import * as THREE from 'three';

export class Ball {
    constructor(gravityValue = 0.015) { // Varsayılan değer Dünya yerçekimi, game.js'den ayarlanacak
        // Top geometrisi ve materyali
        const geometry = new THREE.SphereGeometry(0.3, 32, 32);
        const material = new THREE.MeshPhongMaterial({
            color: 0xf85e00,
            roughness: 0.7,
            metalness: 0.1
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(2, 0.3, 0); // Başlangıç pozisyonu

        // Atış mekaniği değişkenleri
        this.isHeld = false;
        this.holder = null;
        this.velocity = new THREE.Vector3();
        this.gravity = gravityValue; // Seviyeye göre ayarlanacak yerçekimi
        this.isMoving = false;

        // Topun fiziksel özellikleri
        this.radius = 0.3;
        this.previousPosition = new THREE.Vector3(); // Önceki konumu saklamak için
        this.ballSphere = new THREE.Sphere(this.mesh.position, this.radius); // Çarpışma tespiti için

        // Skorlama ile ilgili değişkenler
        this.hasScored = false; // Bu atışta skor oldu mu?
        this.scoreTimeout = null; // Skor sonrası bekleme için

        // Oyuncuya göre yerel ofset (topun tutulduğu nokta)
        this.localOffset = new THREE.Vector3(0.0, 0.5, -0.7); // Bu değerleri modelinize göre ayarlayın
        this.tempQuaternion = new THREE.Quaternion();
    }

    // GÜNCELLENDİ: update fonksiyonu artık deltaTime parametresi alıyor
    update(deltaTime) {
        // Konum güncellenmeden ÖNCE mevcut konumu sakla
        this.previousPosition.copy(this.mesh.position);

        if (this.isHeld && this.holder) {
            // Oyuncunun mevcut dönüş açısını al
            const playerRotation = this.holder.rotation.y;
            // Dönüşü Quaternion'a çevir
            this.tempQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), playerRotation);
            // Ofseti oyuncunun dönüşüne göre döndür
            const rotatedOffset = this.localOffset.clone().applyQuaternion(this.tempQuaternion);
            // Topun nihai pozisyonunu ayarla
            this.mesh.position.copy(this.holder.position).add(rotatedOffset);

        } else if (this.isMoving) {
            // --- FİZİK GÜNCELLEMESİ (deltaTime İLE DÜZELTİLDİ) ---
            // 60 FPS'i baz alarak bir ölçekleme faktörü oluşturuyoruz.
            const timeScale = deltaTime * 60;

            // Yerçekimini geçen süreye göre uygula
            this.velocity.y -= this.gravity * timeScale;
            // Hızı geçen süreyle çarparak pozisyonu güncelle
            this.mesh.position.add(this.velocity.clone().multiplyScalar(timeScale));
            // --------------------------------------------------------

            // --- SINIR KONTROLLERİ (Saha Dışı ve Zemin/Tavan) ---
            const courtWidth = 15.24; // Orijinal saha genişliği
            const courtLength = 28.65; // Orijinal saha uzunluğu
            const maxHeight = 15.0;   // Tavan yüksekliği
            const elasticity = 0.7;   // Duvarların ve tavanın sekme katsayısı

            const minX = -courtWidth / 2 + this.radius;
            const maxX = courtWidth / 2 - this.radius;
            const minZ = -courtLength / 2 + this.radius;
            const maxZ = courtLength / 2 - this.radius;
            const minY = this.radius; // Zemin seviyesi

            // X Ekseni Sınırları
            if (this.mesh.position.x < minX) {
                this.mesh.position.x = minX;
                this.velocity.x *= -elasticity;
            } else if (this.mesh.position.x > maxX) {
                this.mesh.position.x = maxX;
                this.velocity.x *= -elasticity;
            }

            // Z Ekseni Sınırları
            if (this.mesh.position.z < minZ) {
                this.mesh.position.z = minZ;
                this.velocity.z *= -elasticity;
            } else if (this.mesh.position.z > maxZ) {
                this.mesh.position.z = maxZ;
                this.velocity.z *= -elasticity;
            }

            // Y Ekseni Sınırları (Zemin)
            if (this.mesh.position.y <= minY) {
                this.mesh.position.y = minY;
                this.velocity.y *= -0.6; // Zemin sekmesi biraz daha fazla
                this.velocity.x *= 0.8;  // Zeminde sürtünme
                this.velocity.z *= 0.8;

                if (this.velocity.length() < 0.05) { // Neredeyse durduysa
                    this.isMoving = false;
                    this.velocity.set(0, 0, 0);
                }
            }
            // Y Ekseni Sınırları (Tavan)
            else if (this.mesh.position.y > maxHeight - this.radius) {
                this.mesh.position.y = maxHeight - this.radius;
                this.velocity.y *= -elasticity;
            }
            // --- SINIR KONTROLLERİ SONU ---
        }

        // Her durumda topun küre temsilini güncelle
        this.ballSphere.center.copy(this.mesh.position);
    }

    throw(direction) {
        if (this.isHeld) {
            this.isHeld = false;
            this.holder = null;
            this.isMoving = true;
            this.velocity.copy(direction);
            // Atıştan hemen sonra skor kontrolünü aktifleştir
            this.hasScored = false;
            if (this.scoreTimeout) clearTimeout(this.scoreTimeout);
        }
    }

    pickUp(player) {
        if (!this.isHeld && !this.isMoving) {
            this.isHeld = true;
            this.holder = player;
            this.velocity.set(0, 0, 0); // Topu tuttuğunda hızını sıfırla
            this.hasScored = false;     // Topu alınca skor durumu sıfırlanmalı
        }
    }

    checkHoopCollision(hoops, onScoreCallback) {
        if (!this.isMoving || this.hasScored) return;

        hoops.forEach(hoop => {
            const hoopCollisionMesh = hoop.userData.collisionMesh;
            if (!hoopCollisionMesh) return;

            const hoopY = hoopCollisionMesh.position.y;
            const hoopRadius = hoopCollisionMesh.geometry.parameters.radius; // Torus'un ana yarıçapı
            const collisionTolerance = 0.5; // Yeni: Çarpışma toleransı (bu değeri artırarak kolaylaştırın)
            const effectiveHoopRadius = hoopRadius + collisionTolerance; // Etkili yarıçap

            // Topun küresi, pota çemberinin sınır kutusu ile kesişiyor mu? (Hızlı ön kontrol)
            const hoopBBox = new THREE.Box3().setFromObject(hoopCollisionMesh);

            if (hoopBBox.intersectsSphere(this.ballSphere)) {
                // Topun X ve Z koordinatlarının pota çemberinin içinde olup olmadığını kontrol edin
                const distanceToHoopCenterXZ = Math.sqrt(
                    Math.pow(this.mesh.position.x - hoopCollisionMesh.position.x, 2) +
                    Math.pow(this.mesh.position.z - hoopCollisionMesh.position.z, 2)
                );

                if (distanceToHoopCenterXZ < effectiveHoopRadius) { // Yeni: Etkili yarıçapı kullan
                    // Daha detaylı kontrol:
                    // 1. Top aşağı doğru mu hareket ediyor?
                    // 2. Top bir önceki karede pota çemberinin ÜSTÜNDE miydi?
                    // 3. Top şimdiki karede pota çemberinin ALTINDA veya HİZASINDA mı?
                    // 4. Topun X ve Z koordinatları çemberin içinde mi? (Yukarıda kontrol edildi)
                    if (this.velocity.y < 0 &&
                        this.previousPosition.y > hoopY &&
                        this.mesh.position.y <= hoopY) {

                        console.log("%cSKOR!", "color: green; font-size: 24px;");
                        this.hasScored = true;

                        if (onScoreCallback) {
                            onScoreCallback();
                        }

                        if (this.scoreTimeout) clearTimeout(this.scoreTimeout);
                        this.scoreTimeout = setTimeout(() => {
                            this.hasScored = false;
                        }, 2000);
                    }
                }
            }
        });
    }
}