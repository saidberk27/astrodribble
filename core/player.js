import * as THREE from 'three';
import { ShootingSystem } from './shoot.js';
import { createPlayerPhysics } from './physics.js';

export class Player {
    constructor() {
        // Görsel mesh
        const geometry = new THREE.BoxGeometry(0.6, 1.2, 0.6);
        const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(0, 2, 0); // Başlangıç yüksekliği 2 metre

        // Fizik gövdesi
        this.body = createPlayerPhysics();

        this.direction = new THREE.Vector3(0, 0, -1);
        this.speed = 5; // Hızı artırdık
        this.rotationSpeed = 1;
        this.jumpForce = 4; // Zıplama kuvveti
        this.canJump = true; // Zıplama kontrolü
    } move(keysPressed) {
        // Hareket vektörünü oluştur
        const moveVector = new THREE.Vector3(0, 0, 0);
        const currentVelocity = this.body.velocity;

        // Yürüme kontrolü - diyagonal hareketi normalize et
        if (keysPressed['ArrowUp'] || keysPressed['w']) {
            moveVector.z = -this.speed;
        }
        if (keysPressed['ArrowDown'] || keysPressed['s']) {
            moveVector.z = this.speed;
        }
        if (keysPressed['ArrowLeft'] || keysPressed['a']) {
            moveVector.x = -this.speed;
        }
        if (keysPressed['ArrowRight'] || keysPressed['d']) {
            moveVector.x = this.speed;
        }

        // Zıplama kontrolü
        if (keysPressed[' '] && this.canJump) {
            this.body.velocity.y = this.jumpForce;
            this.canJump = false;
            setTimeout(() => this.canJump = true, 1000); // 1 saniye zıplama bekleme süresi
        }            // Hareket vektörünü normalize et ve hızı uygula
        if (moveVector.lengthSq() > 0) {
            moveVector.normalize();
            moveVector.multiplyScalar(this.speed);

            // Yatay hareketi yumuşat
            const alpha = 0.15; // Yumuşatma faktörü
            this.body.velocity.x = this.body.velocity.x * (1 - alpha) + moveVector.x * alpha;
            this.body.velocity.z = this.body.velocity.z * (1 - alpha) + moveVector.z * alpha;
        }

        // Oyuncunun yönünü hareket yönüne göre ayarla (velocity'ye göre)
        const horizontalVelocity = new THREE.Vector2(this.body.velocity.x, this.body.velocity.z);
        if (horizontalVelocity.lengthSq() > 0.1) {
            const targetRotation = Math.atan2(this.body.velocity.x, this.body.velocity.z);
            // Yumuşak dönüş için lerp kullan
            const rotationAlpha = 0.1;
            this.mesh.rotation.y += (targetRotation - this.mesh.rotation.y) * rotationAlpha;
            this.body.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
        } else {
            // Hareket tuşuna basılmadığında yavaşla
            this.body.velocity.x *= 0.95;
            this.body.velocity.z *= 0.95;
        }

        // Saha sınırlarını kontrol et (15.24 x 28.65)
        const maxX = 7; // 15.24/2 - biraz margin
        const maxZ = 13; // 28.65/2 - biraz margin

        if (Math.abs(this.body.position.x) > maxX) {
            this.body.position.x = Math.sign(this.body.position.x) * maxX;
            this.body.velocity.x = 0;
        }

        if (Math.abs(this.body.position.z) > maxZ) {
            this.body.position.z = Math.sign(this.body.position.z) * maxZ;
            this.body.velocity.z = 0;
        }

        // Mesh pozisyonunu fizik gövdesiyle senkronize et
        this.mesh.position.copy(this.body.position);
        this.direction.set(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
    }

    getPosition() {
        return this.mesh.position;
    }

    getDirection() {
        return this.direction;
    }

    getRotation() {
        return this.mesh.rotation.y;
    }
}

export function createPlayer() {
    return new Player();
}

export function setupPlayerControls(player, ball) {
    const keysPressed = {};
    const shootingSystem = new ShootingSystem();

    // Tuş basma olaylarını dinle
    window.addEventListener('keydown', (event) => {
        keysPressed[event.key] = true;
    });

    window.addEventListener('keyup', (event) => {
        keysPressed[event.key] = false;

        // Space tuşu ile top tutma
        if (event.code === 'Enter' && !shootingSystem.isCharging) {
            if (!ball.isHeld) {
                const distance = player.mesh.position.distanceTo(ball.mesh.position);
                if (distance < 2) {
                    ball.pickUp(player.mesh);
                }
            }
        }
    });

    // Mouse olaylarını dinle
    window.addEventListener('mousedown', (event) => {
        if (event.button === 0 && ball.isHeld) { // Sol tıklama
            shootingSystem.startCharging(ball);
        }
    });

    window.addEventListener('mouseup', (event) => {
        if (event.button === 0 && ball.isHeld) { // Sol tıklama bırakıldı
            shootingSystem.releaseCharge(ball);
        }
    });

    // Pencere kapatıldığında temizlik
    window.addEventListener('beforeunload', () => {
        shootingSystem.dispose();
    });

    return function updatePlayerMovement() {
        player.move(keysPressed);

        // Top tutuluyorsa ve atış şarj ediliyorsa
        if (ball.isHeld && shootingSystem.isCharging) {
            shootingSystem.updateCharging(ball);
        }
    };
}
