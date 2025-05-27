import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { world, createBallPhysics } from './physics.js';

export class Ball {
    constructor() {
        // Top geometrisi ve materyali
        this.geometry = new THREE.SphereGeometry(0.3, 32, 32);
        this.material = new THREE.MeshStandardMaterial({
            color: 0xf85e00,
            roughness: 0.7,
            metalness: 0.1
        });
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.radius = 0.3;

        // Fizik gövdesini oluştur
        this.body = createBallPhysics(this.radius);

        // Atış mekaniği değişkenleri
        this.isHeld = false;
        this.holder = null;
        this.hasScored = false;

        // Yerel ofset
        this.localOffset = new THREE.Vector3(0.0, 0.0, -0.5);
    }

    update() {
        if (this.isHeld && this.holder) {
            // Top tutuluyorsa, oyuncunun pozisyonunu takip et
            const quaternion = new THREE.Quaternion();
            quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.holder.rotation.y);
            const rotatedOffset = this.localOffset.clone().applyQuaternion(quaternion);

            // Topun pozisyonunu ve fizik gövdesini güncelle
            this.mesh.position.copy(this.holder.position).add(rotatedOffset);
            this.body.position.copy(this.mesh.position);
            this.body.velocity.setZero();
        } else {
            // Top serbest durumdaysa, fizik motorunun hesapladığı pozisyonu kullan
            this.mesh.position.copy(this.body.position);
            this.mesh.quaternion.copy(this.body.quaternion);
        }        // Yerde durma kontrolü
        if (!this.isHeld && Math.abs(this.body.velocity.y) < 0.1 && this.body.position.y <= this.radius + 0.01) {
            // Yatay hızı koruyarak sadece dikey hareketi sınırla
            const horizontalVelocity = new CANNON.Vec3(this.body.velocity.x, 0, this.body.velocity.z);
            if (horizontalVelocity.lengthSquared() < 0.01) {
                this.body.velocity.setZero();
                this.body.angularVelocity.setZero();
                this.body.sleep(); // Performans için uyku moduna al
            } else {
                // Yatay hareketi sürdür ama yavaşlat
                this.body.velocity.x *= 0.98;
                this.body.velocity.y = 0;
                this.body.velocity.z *= 0.98;
            }
            this.body.position.y = this.radius;
        }
    }

    throw(direction) {
        if (this.isHeld) {
            this.isHeld = false;
            this.holder = null;

            // Fizik gövdesini aktifleştir ve hız ver
            this.body.wakeUp();
            const throwVelocity = direction.multiplyScalar(10); // Hızı ayarla
            this.body.velocity.set(throwVelocity.x, throwVelocity.y, throwVelocity.z);
            this.body.angularVelocity.set(
                Math.random() * 2 - 1,
                Math.random() * 2 - 1,
                Math.random() * 2 - 1
            );
        }
    }

    pickUp(player) {
        if (!this.isHeld && this.body.velocity.lengthSquared() < 0.1) {
            this.isHeld = true;
            this.holder = player;
            this.body.velocity.setZero();
            this.body.angularVelocity.setZero();
        }
    }

    checkBasket(hoopPosition) {
        if (!this.hasScored && !this.isHeld) {
            const basketHeight = 3.05;
            const basketRadius = 0.45;

            // Top basket seviyesinden geçiyor mu?
            if (Math.abs(this.mesh.position.y - basketHeight) < 0.2 &&
                this.body.velocity.y < 0) {

                // Top basket çemberi içinden geçiyor mu?
                const horizontalDistance = new THREE.Vector2(
                    this.mesh.position.x - hoopPosition.x,
                    this.mesh.position.z - hoopPosition.z
                ).length();

                if (horizontalDistance < basketRadius - this.radius) {
                    console.log("BASKET!");
                    this.hasScored = true;

                    // Skor durumunu sıfırla
                    setTimeout(() => {
                        this.hasScored = false;
                    }, 1000);
                }
            }
        }
    }
}