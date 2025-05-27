import * as THREE from 'three';
import { ShootingSystem } from './shoot.js';
import { gltf_loader } from '../game.js';
import { scene } from './scene.js';

export class Player {
    constructor() {
        this.mesh = new THREE.Object3D();
        this.mesh.position.set(0, 0, 0);
        this.direction = new THREE.Vector3(0, 0, -1);
        this.speed = 0.15;
        this.rotationSpeed = 0.05;
        this.loadModel();
    }

    loadModel() {
        const modelPath = 'models/astronaut.glb'; // Modelinizin adı farklıysa burayı değiştirin

        gltf_loader.load(
            modelPath,
            (gltf) => {
                const model = gltf.scene;
                model.scale.set(0.6, 0.6, 0.6); // Boyutu buradan ayarlayabilirsiniz
                const box = new THREE.Box3().setFromObject(model);
                const height = box.max.y - box.min.y;
                model.position.y = height / 2;
                this.mesh.add(model);
                scene.add(this.mesh);
                console.log("Oyuncu modeli yüklendi.");
            },
            undefined,
            (error) => {
                console.error('Oyuncu modeli yüklenirken hata:', error);
                const geometry = new THREE.BoxGeometry(0.6, 1.2, 0.6);
                const material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
                const errorBox = new THREE.Mesh(geometry, material);
                errorBox.position.y = 0.6;
                this.mesh.add(errorBox);
                scene.add(this.mesh);
            }
        );
    }

    move(keysPressed) {
        const moveVector = new THREE.Vector3(0, 0, 0);
        if (keysPressed['w'] || keysPressed['arrowup']) { moveVector.z = -this.speed; }
        if (keysPressed['s'] || keysPressed['arrowdown']) { moveVector.z = this.speed; }
        if (keysPressed['a'] || keysPressed['arrowleft']) { this.mesh.rotation.y += this.rotationSpeed; }
        if (keysPressed['d'] || keysPressed['arrowright']) { this.mesh.rotation.y -= this.rotationSpeed; }
        moveVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
        this.mesh.position.add(moveVector);
        const courtWidth = 15.24; const courtLength = 28.65; const playerMargin = 0.5;
        const minX = -courtWidth / 2 + playerMargin; const maxX = courtWidth / 2 - playerMargin;
        const minZ = -courtLength / 2 + playerMargin; const maxZ = courtLength / 2 - playerMargin;
        this.mesh.position.x = Math.max(minX, Math.min(maxX, this.mesh.position.x));
        this.mesh.position.z = Math.max(minZ, Math.min(maxZ, this.mesh.position.z));
        this.direction.set(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
    }

    getPosition() { return this.mesh.position; }
    getDirection() { return this.direction; }
    getRotation() { return this.mesh.rotation.y; }
}

export function createPlayer() {
    return new Player();
}

// setupPlayerControls fonksiyonu 'hoops' parametresini alacak şekilde güncellendi
export function setupPlayerControls(player, ball, hoops) {
    const keysPressed = {};
    const shootingSystem = new ShootingSystem();

    window.addEventListener('keydown', (event) => {
        const key = event.key.toLowerCase();
        keysPressed[key] = true;

        if (key === ' ' && ball.isHeld && !shootingSystem.isAimAssisted) { // Otomatik nişan aktif değilse gücü artır
            shootingSystem.increasePower();
            event.preventDefault();
        }

        if (key === 'f' && !ball.isHeld) {
            const distance = player.mesh.position.distanceTo(ball.mesh.position);
            if (distance < 2) {
                ball.pickUp(player.mesh);
                if (ball.isHeld) {
                    shootingSystem.showTrajectory(ball);
                }
            }
        }
    });

    window.addEventListener('keyup', (event) => {
        const key = event.key.toLowerCase();
        keysPressed[key] = false;

        // --- OTOMATİK ATIŞ (X TUŞU BIRAKILINCA) ---
        if (key === 'x' && ball.isHeld) {
            shootingSystem.performAutoShot(ball, hoops); // hoops parametresini gönderiyoruz
        }
        // -------------------------------------------
    });

    window.addEventListener('mousedown', (event) => {
        if (event.button === 0 && ball.isHeld) { // Sol Tıklama
            shootingSystem.releaseCharge(ball); // Manuel atış
        }
    });

    window.addEventListener('beforeunload', () => {
        shootingSystem.dispose();
    });

    return function updatePlayerMovement() {
        player.move(keysPressed);

        if (ball.isHeld) {
            // Sadece otomatik nişan aktif DEĞİLSE Q/E çalışsın
            if (!shootingSystem.isAimAssisted) {
                if (keysPressed['q']) {
                    shootingSystem.adjustAngle(-shootingSystem.angleChangeSpeed);
                }
                if (keysPressed['e']) {
                    shootingSystem.adjustAngle(shootingSystem.angleChangeSpeed);
                }
            }
            // Atış sistemini güncelle (Yörüngeyi çizer)
            shootingSystem.update(ball); // hoops'a burada ihtiyacı yok
        } else {
            shootingSystem.hideTrajectory();
        }
    };
}