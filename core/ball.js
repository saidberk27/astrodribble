import * as THREE from 'three';

export class Ball {
    constructor() {
        // Top geometrisi ve materyali
        const geometry = new THREE.SphereGeometry(0.3, 32, 32);
        const material = new THREE.MeshPhongMaterial({
            color: 0xf85e00,
            roughness: 0.7,
            metalness: 0.1
        });
        this.mesh = new THREE.Mesh(geometry, material);

        // Topun başlangıç pozisyonu (sahneye ilk eklendiğinde nerede olacağı)
        this.mesh.position.set(2, 0.3, 0);

        // Atış mekaniği değişkenleri
        this.isHeld = false;
        this.holder = null;
        this.velocity = new THREE.Vector3();
        this.gravity = 0.015;
        this.isMoving = false;

        // Yerel ofset
        this.localOffset = new THREE.Vector3(0.0, 0.0, -0.5);
        this.tempQuaternion = new THREE.Quaternion();
    }

    update() {
        if (this.isHeld && this.holder) {
            // Oyuncunun mevcut dönüş açısını al
            // Three.js'te Object3D'nin rotation.y değeri Euler açısıdır.
            const playerRotation = this.holder.rotation.y;

            // 1. Oyuncunun dönüşünü bir Quaternion'a dönüştür.
            // Y ekseni etrafında dönme için (0, 1, 0) vektörünü kullanırız.
            this.tempQuaternion.setFromAxisAngle(
                new THREE.Vector3(0, 1, 0), // Dönme ekseni: Y ekseni
                playerRotation             // Oyuncunun mevcut dönüş açısı
            );

            // 2. Yerel ofseti oyuncunun dönüşüne göre döndür.
            // localOffset'ın bir kopyasını alıp ona Quaternion'ı uygularız.
            // Bu, topun oyuncunun lokal koordinat sistemindeki konumunu dünya koordinatlarına çevirir.
            const rotatedOffset = this.localOffset.clone().applyQuaternion(this.tempQuaternion);

            // 3. Topun nihai pozisyonunu ayarla.
            // Topun pozisyonu = Oyuncunun pozisyonu + Döndürülmüş Ofset
            this.mesh.position.copy(this.holder.position).add(rotatedOffset);

        } else if (this.isMoving) {
            // Top havadaysa (fizik simülasyonu)
            this.velocity.y -= this.gravity; // Yerçekimi uygula
            this.mesh.position.add(this.velocity); // Hıza göre pozisyonu güncelle

            // Yerle çarpışma kontrolü
            if (this.mesh.position.y <= 0.3) {
                this.mesh.position.y = 0.3; // Yere sabitle
                this.velocity.y *= -0.6; // Zıplama etkisi (yönü tersine çevir ve hızı azalt)
                this.velocity.x *= 0.8;  // Sürtünme etkisi (yatay hızı azalt)
                this.velocity.z *= 0.8;

                // Top neredeyse durduğunda
                if (Math.abs(this.velocity.y) < 0.01 &&
                    Math.abs(this.velocity.x) < 0.01 &&
                    Math.abs(this.velocity.z) < 0.01) {
                    this.isMoving = false; // Hareket etmiyor olarak işaretle
                    this.velocity.set(0, 0, 0); // Hızı sıfırla
                }
            }
        }
    } throw(direction) {
        if (this.isHeld) {
            this.isHeld = false;
            this.holder = null;
            this.isMoving = true;
            this.velocity.copy(direction);
        }
    }

    pickUp(player) {
        if (!this.isHeld && !this.isMoving) {
            this.isHeld = true;
            this.holder = player;
            this.velocity.set(0, 0, 0); // Topu tuttuğunda hızını sıfırla
        }
    }

    checkHoopCollision(hoops) {
        if (!this.isMoving) return;

        hoops.forEach(hoop => {
            const hoopPos = new THREE.Vector3(0, 3.05, hoop.position.z); // Pota çemberinin yüksekliği
            const distance = this.mesh.position.distanceTo(hoopPos);

            // Top pota hizasındaysa ve çember yakınındaysa
            if (Math.abs(this.mesh.position.y - hoopPos.y) < 0.3 && distance < this.hoopRadius) {
                if (!this.hasScored) {
                    console.log("Basket!");
                    this.hasScored = true;

                    // Skor durumunu sıfırla
                    if (this.scoreTimeout) clearTimeout(this.scoreTimeout);
                    this.scoreTimeout = setTimeout(() => {
                        this.hasScored = false;
                    }, 1000);
                }
            }

            // Pota ile çarpışma kontrolü
            if (distance < this.hoopRadius + 0.1) {
                // Çarpışma tepkisi
                const normal = this.mesh.position.clone().sub(hoopPos).normalize();
                this.velocity.reflect(normal);
                this.velocity.multiplyScalar(0.7); // Enerji kaybı
            }
        });
    }
}