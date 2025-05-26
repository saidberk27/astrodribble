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

        // Top özellikleri
        this.isHeld = false;
        this.holder = null; // Topu tutan oyuncu (THREE.Object3D veya Mesh)
        this.throwForce = new THREE.Vector3(); // Atış kuvveti için kullanılabilir

        // Top fiziği için değişkenler
        this.velocity = new THREE.Vector3();
        this.gravity = 0.015; // Yerçekimi ivmesi
        this.isMoving = false; // Topun havada olup olmadığını belirtir

        // Topun oyuncuya göre yerel ofseti
        // Bu, oyuncu 0 derece döndüğünde topun oyuncuya göre nerede duracağını belirler.
        // x: sağ/sol (negatif sol), y: yukarı/aşağı, z: ön/arka (pozitif ön)
        // Şu anki ayar: Oyuncunun tam 0.5 birim önünde.
        this.localOffset = new THREE.Vector3(0.0, 0.0, 0.5);

        // Quaternion nesnesi, her karede yeniden oluşturmak yerine bir kez oluşturulup güncellenebilir.
        // Bu, performansı artırır.
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
    }

    throw(direction) {
        if (this.isHeld) {
            this.isHeld = false;
            this.holder = null;
            this.isMoving = true;

            // Atış yönü ve kuvveti
            // direction vektörü, atışın dünya koordinatlarındaki yönünü temsil etmeli.
            // Örneğin, oyuncunun ileri yönü + kamera yönü gibi.
            this.velocity.copy(direction).multiplyScalar(0.4);
            this.velocity.y = 0.3; // Yukarı doğru başlangıç hızı ekle
        }
    }

    pickUp(player) {
        if (!this.isHeld && !this.isMoving) {
            this.isHeld = true;
            this.holder = player;
            this.velocity.set(0, 0, 0); // Topu tuttuğunda hızını sıfırla
        }
    }
}