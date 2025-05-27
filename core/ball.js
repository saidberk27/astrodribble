// ball.js

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { world, createBallPhysics } from './physics.js';

export class Ball {
    constructor() {
        this.geometry = new THREE.SphereGeometry(0.3, 32, 32);
        this.material = new THREE.MeshStandardMaterial({
            color: 0xf85e00,
            roughness: 0.7,
            metalness: 0.1
        });
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.radius = 0.3;
        this.body = createBallPhysics(this.radius);
        this.isHeld = false;
        this.holder = null;
        this.hasScored = false;
        this.localOffset = new THREE.Vector3(0.0, 0.5, -0.6);
    }

    update() {
        if (this.isHeld && this.holder && this.holder.body) {
            const playerBodyQuaternion = this.holder.body.quaternion;
            const threePlayerQuaternion = new THREE.Quaternion(
                playerBodyQuaternion.x,
                playerBodyQuaternion.y,
                playerBodyQuaternion.z,
                playerBodyQuaternion.w
            );
            const rotatedOffset = this.localOffset.clone().applyQuaternion(threePlayerQuaternion);
            const holderPosition = new THREE.Vector3(
                this.holder.body.position.x,
                this.holder.body.position.y,
                this.holder.body.position.z
            );
            this.mesh.position.copy(holderPosition).add(rotatedOffset);
            this.body.position.copy(this.mesh.position);
            this.body.velocity.setZero();
            this.body.angularVelocity.setZero();
        } else {
            if (this.body && this.mesh) {
                this.mesh.position.copy(this.body.position);
                this.mesh.quaternion.copy(this.body.quaternion);
            }
        }

        if (!this.isHeld && this.body && Math.abs(this.body.velocity.y) < 0.1 && this.body.position.y <= this.radius + 0.05) {
            const horizontalVelocity = new CANNON.Vec3(this.body.velocity.x, 0, this.body.velocity.z);
            if (horizontalVelocity.lengthSquared() < 0.01 && this.body.sleepState !== CANNON.Body.SLEEPING) {
                this.body.sleep();
            } else if (horizontalVelocity.lengthSquared() >= 0.01) {
                this.body.velocity.x *= 0.98;
                this.body.velocity.y = 0;
                this.body.velocity.z *= 0.98;
            }
            this.body.position.y = this.radius;
        }
    }

    throw(velocityVector) { // Parametre adı velocityVector olarak değiştirildi
        if (this.isHeld) {
            this.isHeld = false;
            this.body.wakeUp(); // Uyku modundan çıkar
            // Gelen velocityVector'ı doğrudan ata
            this.body.velocity.set(velocityVector.x, velocityVector.y, velocityVector.z);
            this.body.angularVelocity.set(
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10
            );
            this.holder = null; // Holder'ı temizle
            console.log("Top fırlatıldı, hız:", velocityVector);
        }
    }

    pickUp(player) {
        if (!this.isHeld && this.body.velocity.lengthSquared() < 1.5) { // Hız eşiği biraz daha artırıldı
            this.isHeld = true;
            this.holder = player;
            this.body.sleep();
            console.log("Ball picked up by player");
        }
    }

    // drop metodu (player.js'deki Enter ile bırakma için)
    drop() {
        if (this.isHeld) {
            this.isHeld = false;
            this.body.wakeUp();
            const dropVelocity = new CANNON.Vec3(
                (Math.random() - 0.5) * 0.3,
                0.2, // Hafif yukarı doğru
                (Math.random() - 0.5) * 0.3
            );
            this.body.velocity.copy(dropVelocity);
            this.body.angularVelocity.set(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            );
            this.holder = null;
            console.log("Top bırakıldı (drop metodu)");
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