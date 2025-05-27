// core/player.js

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { createPlayerPhysics } from './physics.js';

// Global Değişkenler - Dosya kapsamında
const inputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
};

const playerSpeed = 10.0;
const playerRotationAmount = Math.PI / 60; // Her karede ne kadar döneceği (radyan)
const pickUpDistance = 1.5;

// --- Oyuncu Oluşturma Fonksiyonu ---
export function createPlayer() {
    const playerBody = createPlayerPhysics(); // physics.js'den doğru ayarlanmış body'yi alır
    const playerMesh = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.3, 0.6, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0x88dd88 })
    );
    playerMesh.castShadow = true;
    playerMesh.receiveShadow = true;

    const playerObject = {
        mesh: playerMesh,
        body: playerBody,
        onGround: true,

        getPosition: function () {
            return new THREE.Vector3(
                this.body.position.x,
                this.body.position.y,
                this.body.position.z
            );
        },
        getRotationY: function () {
            // physics.js'deki invInertia ve aşağıdaki update metodu sayesinde
            // body.quaternion'un X ve Z rotasyonları minimal olmalı.
            const q = this.body.quaternion;
            // Quaternion'dan Y ekseni etrafındaki dönüşü (yaw) almanın doğru yolu:
            // Bu formül, Y ekseninin "yukarı" olduğu bir sistem için yaw açısını verir.
            const yawAngle = Math.atan2(2 * (q.w * q.y + q.x * q.z), 1 - 2 * (q.y * q.y + q.z * q.z));
            return yawAngle;
        },
        update: function () {
            // 1. Oyuncunun X ve Z eksenlerindeki açısal hızını her karede sıfırla.
            // Bu, physics.js'deki invInertia ayarlarıyla birlikte devrilmeyi büyük ölçüde engellemelidir.
            this.body.angularVelocity.x = 0;
            this.body.angularVelocity.z = 0;

            // 2. Quaternion stabilizasyonunu basitleştir:
            // physics.js'deki invInertia.x = 0 ve invInertia.z = 0 ayarları,
            // fizik motorunun X ve Z eksenlerinde tork uygulamasını zaten engeller.
            // Bu nedenle, burada quaternion'u aşırı manipüle etmek yerine,
            // sadece normalize etmek genellikle yeterlidir.
            // Eğer hala küçük X/Z eğimleri oluşuyorsa, bu, çarpışmalar veya
            // diğer dış kuvvetlerden kaynaklanıyor olabilir ve bu durumda daha hassas bir
            // düzeltme gerekebilir, ancak şimdilik bu basitleştirmeyi deneyelim.
            this.body.quaternion.normalize();


            // 3. Görsel modeli fiziksel gövdeyle senkronize et
            this.mesh.position.copy(this.body.position);
            this.mesh.quaternion.copy(this.body.quaternion); // Fizik motorunun güncellediği ve normalize edilmiş quaternion'u kopyala
        }
    };
    return playerObject;
}

// --- Oyuncu Kontrollerini Ayarlama Fonksiyonu ---
export function setupPlayerControls(player, ball, shootingSystem) {
    let pickUpOrDropActionInitiated = false;

    const onKeyDown = (event) => {
        switch (event.code) {
            case 'KeyW': case 'ArrowUp': inputState.forward = true; break;
            case 'KeyS': case 'ArrowDown': inputState.backward = true; break;
            case 'KeyA': case 'ArrowLeft': inputState.left = true; break;
            case 'KeyD': case 'ArrowRight': inputState.right = true; break;
            case 'Enter':
                if (!pickUpOrDropActionInitiated) {
                    pickUpOrDropActionInitiated = true;
                    if (ball && ball.isHeld && ball.holder === player) {
                        if (typeof ball.drop === 'function') {
                            ball.drop();
                            console.log("Top bırakıldı (Enter ile)");
                        } else {
                            ball.throw(new THREE.Vector3(0, 0.1, 0).multiplyScalar(0.1));
                            console.log("Top bırakıldı (Enter ile - hafif fırlatma)");
                        }
                    } else if (ball && !ball.isHeld && player.mesh && ball.mesh) {
                        const distanceToBall = player.mesh.position.distanceTo(ball.mesh.position);
                        if (distanceToBall < pickUpDistance) {
                            ball.pickUp(player);
                            console.log("Top alındı (Enter ile)!");
                        }
                    }
                }
                break;
            case 'Space':
                if (player.onGround) {
                    inputState.jump = true;
                }
                break;
        }
    };

    const onKeyUp = (event) => {
        switch (event.code) {
            case 'KeyW': case 'ArrowUp': inputState.forward = false; break;
            case 'KeyS': case 'ArrowDown': inputState.backward = false; break;
            case 'KeyA': case 'ArrowLeft': inputState.left = false; break;
            case 'KeyD': case 'ArrowRight': inputState.right = false; break;
            case 'Enter':
                pickUpOrDropActionInitiated = false;
                break;
        }
    };

    const onMouseDown = (event) => {
        if (event.button === 0) {
            if (ball && ball.isHeld && ball.holder === player && shootingSystem && !shootingSystem.isCharging) {
                shootingSystem.startCharging(ball);
            }
        }
    };

    const onMouseUp = (event) => {
        if (event.button === 0) {
            if (shootingSystem && shootingSystem.isCharging) {
                shootingSystem.releaseCharge(ball);
            }
        }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);

    return function updatePlayerMovement() {
        if (!player || !player.body) return;

        const currentVelocityY = player.body.velocity.y;

        // Rotasyon
        const yAxis = new CANNON.Vec3(0, 1, 0);
        const rotationStepQuaternion = new CANNON.Quaternion();

        if (inputState.left) {
            rotationStepQuaternion.setFromAxisAngle(yAxis, playerRotationAmount);
            player.body.quaternion.mult(rotationStepQuaternion, player.body.quaternion);
        }
        if (inputState.right) {
            rotationStepQuaternion.setFromAxisAngle(yAxis, -playerRotationAmount);
            player.body.quaternion.mult(rotationStepQuaternion, player.body.quaternion);
        }
        if (inputState.left || inputState.right) {
            player.body.quaternion.normalize(); // Rotasyon sonrası normalize et
        }
        // Y eksenindeki açısal hızı sıfırlıyoruz çünkü rotasyonu doğrudan quaternion ile yapıyoruz.
        player.body.angularVelocity.y = 0;

        // Hareket
        let moveSpeed = 0;
        if (inputState.forward) moveSpeed = playerSpeed;
        if (inputState.backward) moveSpeed = -playerSpeed;
        const moveDirectionWorld = new CANNON.Vec3(0, 0, 0);
        if (moveSpeed !== 0) {
            const forwardVectorLocal = new CANNON.Vec3(0, 0, -1);
            // player.update() içinde quaternion zaten normalize edildiği için,
            // buradaki vmult işlemi daha tutarlı bir "ileri" yön vermeli.
            player.body.quaternion.vmult(forwardVectorLocal, moveDirectionWorld);
        }
        player.body.velocity.x = moveDirectionWorld.x * moveSpeed;
        player.body.velocity.z = moveDirectionWorld.z * moveSpeed;

        // Zıplama ve Yer Kontrolü
        if (inputState.jump && player.onGround) {
            player.body.velocity.y = 7;
            player.onGround = false;
            inputState.jump = false;
        } else {
            player.body.velocity.y = currentVelocityY;
        }
        const playerHalfHeight = player.body.shapes[0].halfExtents ? player.body.shapes[0].halfExtents.y : 0.6;
        if (player.body.position.y <= (playerHalfHeight + 0.1) && player.body.velocity.y < 0.01) {
            if (!player.onGround) {
                player.onGround = true;
            }
        }

        if (shootingSystem && shootingSystem.isCharging) {
            shootingSystem.updateCharging(ball);
        }
    };
}