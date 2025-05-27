import * as THREE from 'three';

export class Ball {
    constructor() {
        // Top geometrisi ve materyali (Mevcut haliyle kalıyor)
        const geometry = new THREE.SphereGeometry(0.3, 32, 32);
        const material = new THREE.MeshPhongMaterial({
            color: 0xf85e00,
            roughness: 0.7,
            metalness: 0.1
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(2, 0.3, 0); // Başlangıç pozisyonu

        // --- Mekanik Değişkenler ---
        this.isHeld = false;
        this.holder = null;
        this.velocity = new THREE.Vector3();
        this.gravity = 0.015;
        this.isMoving = false;

        // --- Yeni / Güncellenmiş Değişkenler ---
        this.radius = 0.3; // Topun yarıçapı
        this.previousPosition = new THREE.Vector3(); // Önceki konumu saklamak için
        // Topun çarpışma tespiti için küre temsili
        this.ballSphere = new THREE.Sphere(this.mesh.position, this.radius);
        this.hasScored = false; // Basket oldu mu? (Tek atışta bir basket için)
        this.scoreTimeout = null; // Basket sonrası bekleme süresi için

        // Yerel ofset ve Quaternion (Mevcut haliyle kalıyor)
        this.localOffset = new THREE.Vector3(0.0, 1.0, -0.7);
        this.tempQuaternion = new THREE.Quaternion();
    }

    update() {
        // Konum güncellenmeden ÖNCE mevcut konumu sakla
        this.previousPosition.copy(this.mesh.position);

        if (this.isHeld && this.holder) {
            // Oyuncunun dönüşünü al
            const playerRotation = this.holder.rotation.y;
            // Dönüşü Quaternion'a çevir
            this.tempQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), playerRotation);
            // Ofseti döndür
            const rotatedOffset = this.localOffset.clone().applyQuaternion(this.tempQuaternion);
            // Topun pozisyonunu ayarla
            this.mesh.position.copy(this.holder.position).add(rotatedOffset);

        } else if (this.isMoving) {
            // Fizik simülasyonu
            this.velocity.y -= this.gravity;
            this.mesh.position.add(this.velocity);

            // --- YENİ: SINIR KONTROLLERİ ---
            const courtWidth = 15.24;
            const courtLength = 28.65;
            const maxHeight = 15.0;   // Tavan yüksekliği (istediğiniz gibi ayarlayın)
            const elasticity = 0.7;   // Duvarların ve tavanın sekme katsayısı (0 ile 1 arası)

            const minX = -courtWidth / 2 + this.radius;
            const maxX = courtWidth / 2 - this.radius;
            const minZ = -courtLength / 2 + this.radius;
            const maxZ = courtLength / 2 - this.radius;
            const minY = this.radius; // Zemin seviyesi (topun yarıçapı kadar)

            // X Ekseni Sınırları (Sağ/Sol Duvarlar)
            if (this.mesh.position.x < minX) {
                this.mesh.position.x = minX;        // Topu sınırın içine çek
                this.velocity.x *= -elasticity;     // X hızını ters çevir ve azalt (sekme)
            } else if (this.mesh.position.x > maxX) {
                this.mesh.position.x = maxX;
                this.velocity.x *= -elasticity;
            }

            // Z Ekseni Sınırları (Ön/Arka Duvarlar)
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
                this.velocity.y *= -0.6; // Zeminde biraz daha fazla zıplasın (0.6)
                this.velocity.x *= 0.8;  // Zeminde sürtünme
                this.velocity.z *= 0.8;

                // Neredeyse durduysa tamamen durdur
                if (this.velocity.length() < 0.05) {
                   this.isMoving = false;
                   this.velocity.set(0, 0, 0);
                }
            }
            // Y Ekseni Sınırları (Tavan)
            else if (this.mesh.position.y > maxHeight - this.radius) {
                this.mesh.position.y = maxHeight - this.radius;
                this.velocity.y *= -elasticity; // Tavandan sekme
            }
            // --- SINIR KONTROLLERİ SONU ---

            // Topun küre temsilini güncelle
            this.ballSphere.center.copy(this.mesh.position);
        }

        // Her durumda topun küre temsilini güncelle (eğer tutulmuyorsa bile)
        if (!this.isHeld) {
             this.ballSphere.center.copy(this.mesh.position);
        }
    }

    throw(direction) {
        if (this.isHeld) {
            this.isHeld = false;
            this.holder = null;
            this.isMoving = true;
            this.velocity.copy(direction);
            // Atıştan hemen sonra skor kontrolünü aktifleştir
            this.hasScored = false;
            if(this.scoreTimeout) clearTimeout(this.scoreTimeout);
        }
    }

    pickUp(player) {
        if (!this.isHeld && !this.isMoving) {
            this.isHeld = true;
            this.holder = player;
            this.velocity.set(0, 0, 0);
            this.hasScored = false; // Topu alınca skor durumu sıfırlanmalı
        }
    }

    // --- YENİ checkHoopCollision Fonksiyonu ---
   // --- GÜNCELLENEN checkHoopCollision Fonksiyonu ---
    checkHoopCollision(hoops, onScoreCallback) { // 'onScoreCallback' parametresi eklendi
        // Eğer top hareket etmiyorsa veya bu atışta zaten basket olduysa, kontrol etme.
        if (!this.isMoving || this.hasScored) return;

        hoops.forEach(hoop => {
            const hoopCollisionMesh = hoop.userData.collisionMesh;
            if (!hoopCollisionMesh) return;

            const hoopY = hoopCollisionMesh.position.y;
            const hoopBBox = new THREE.Box3().setFromObject(hoopCollisionMesh);

            if (hoopBBox.intersectsSphere(this.ballSphere)) {

                if (this.velocity.y < 0 &&
                    this.previousPosition.y > hoopY &&
                    this.mesh.position.y <= hoopY)
                {
                    // --- BASKET! ---
                    this.hasScored = true;

                    // --- DEĞİŞİKLİK ---
                    // Konsola yazmak yerine, gelen callback fonksiyonunu çağırıyoruz.
                    if (onScoreCallback) {
                        onScoreCallback();
                    }
                    // -----------------

                    // Skor durumunu sıfırla
                    if (this.scoreTimeout) clearTimeout(this.scoreTimeout);
                    this.scoreTimeout = setTimeout(() => {
                        this.hasScored = false;
                        console.log("Tekrar basket atılabilir.");
                    }, 2000);
                }
            }
        });
    }
    // --- GÜNCELLENEN FONKSİYONUN SONU ---
}