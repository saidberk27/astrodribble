import * as THREE from 'three';

export class Player {
    constructor() {
        const geometry = new THREE.BoxGeometry(0.6, 1.2, 0.6);
        const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(0, 1, 0);

        // Oyuncu yönü
        this.direction = new THREE.Vector3(1, 0, 0);
        this.speed = 0.2;
    }

    move(keysPressed) {
        // Hareket vektörünü oyuncunun baktığı yöne göre hesapla
        const moveVector = new THREE.Vector3(0, 0, 0);

        if (keysPressed['ArrowUp']) {
            moveVector.z += this.speed;
        }
        if (keysPressed['ArrowDown']) {
            moveVector.z -= this.speed;
        }
        if (keysPressed['ArrowLeft']) {
            moveVector.x += this.speed;
        }
        if (keysPressed['ArrowRight']) {
            moveVector.x -= this.speed;
        }

        // Hareket vektörünü oyuncunun yönüne göre döndür
        moveVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);

        // Pozisyonu güncelle
        this.mesh.position.add(moveVector);
    }

    updateDirection(mouseX, mouseY, camera) {
        // Ekrandaki mouse pozisyonunu dünya koordinatlarına çevir
        const mouse = new THREE.Vector2(
            (mouseX / window.innerWidth) * 2 - 1,
            -(mouseY / window.innerHeight) * 2 + 1
        );

        // Mouse pozisyonundan ışın oluştur
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);

        // Oyuncunun y ekseni hizasında bir düzlem oluştur
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const target = new THREE.Vector3();

        // Işının düzlemle kesiştiği noktayı bul
        raycaster.ray.intersectPlane(plane, target);

        // Oyuncudan kesişim noktasına doğru yön vektörü hesapla
        this.direction.subVectors(target, this.mesh.position).normalize();
        this.direction.y = 0; // Yatay düzlemde tutmak için y bileşenini sıfırla

        // Oyuncuyu döndür
        const angle = Math.atan2(this.direction.x, this.direction.z);
        this.mesh.rotation.y = angle;
    }

    getPosition() {
        return this.mesh.position;
    }

    getDirection() {
        return this.direction;
    }
}

export function createPlayer() {
    return new Player();
}

export function setupPlayerControls(player, ball, camera) {
    const keysPressed = {};
    let mouseX = 0;
    let mouseY = 0;

    // Mouse pozisyonunu takip et
    window.addEventListener('mousemove', (event) => {
        mouseX = event.clientX;
        mouseY = event.clientY;
    });

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
                // Topu mouse'un gösterdiği yöne doğru at
                ball.throw(player.direction);
            }
        }
    });

    window.addEventListener('keyup', (event) => {
        keysPressed[event.key] = false;
    });

    return function updatePlayerMovement() {
        player.move(keysPressed);
        player.updateDirection(mouseX, mouseY, camera);
    };
}
