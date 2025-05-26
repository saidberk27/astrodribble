import * as THREE from 'three';
import { ShootingSystem } from './shoot.js';

export class Player {
    constructor() {
        const geometry = new THREE.BoxGeometry(0.6, 1.2, 0.6);
        const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(0, 1, 0);

        this.direction = new THREE.Vector3(0, 0, -1); // İleri yön
        this.speed = 0.2;
        this.rotationSpeed = 0.1;
    }

    move(keysPressed) {
        // Hareket vektörünü oluştur
        const moveVector = new THREE.Vector3(0, 0, 0);

        if (keysPressed['ArrowUp']) {
            moveVector.z = -this.speed; // İleri
        }
        if (keysPressed['ArrowDown']) {
            moveVector.z = this.speed; // Geri
        }

        // Dönüş kontrolü
        if (keysPressed['ArrowLeft']) {
            this.mesh.rotation.y += this.rotationSpeed;
        }
        if (keysPressed['ArrowRight']) {
            this.mesh.rotation.y -= this.rotationSpeed;
        }

        // Hareket vektörünü oyuncunun yönüne göre döndür
        moveVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);

        // Pozisyonu güncelle
        this.mesh.position.add(moveVector);

        // Yön vektörünü güncelle
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
        if (event.code === 'Space' && !shootingSystem.isCharging) {
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
