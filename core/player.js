import * as THREE from 'three';

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

    // Tuş basma olaylarını dinle
    window.addEventListener('keydown', (event) => {
        keysPressed[event.key] = true;

        // Space tuşu ile top tutma/atma
        if (event.code === 'Space') {
            if (!ball.isHeld) {
                // Top ile oyuncu arasındaki mesafeyi kontrol et
                const distance = player.mesh.position.distanceTo(ball.mesh.position);
                if (distance < 2) { // 2 birim mesafe içindeyse topu tutabilir
                    ball.pickUp(player.mesh);
                }
            } else if (ball.holder === player.mesh) {
                // Topu at
                ball.throw(player.direction);
            }
        }
    });

    window.addEventListener('keyup', (event) => {
        keysPressed[event.key] = false;
    });

    return function updatePlayerMovement() {
        player.move(keysPressed);
    };
}
