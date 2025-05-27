import * as THREE from 'three';
import { ShootingSystem } from './shoot.js';
import { gltf_loader, levelSettings, currentLevel } from '../game.js'; // levelSettings ve currentLevel'ı import et
import { scene } from './scene.js';

export class Player {
    constructor() {
        this.mesh = new THREE.Object3D();
        this.mesh.position.set(0, 0, 0); // Modelin altı y=0'da olacak şekilde ayarlanacak
        this.direction = new THREE.Vector3(0, 0, -1);
        this.speed = 0.15;
        this.rotationSpeed = 0.05;

        // --- YENİ: Zıplama ve Yerçekimi Değişkenleri ---
        this.velocityY = 0; // Dikey hız
        this.isJumping = false;
        this.onGround = true; // Yerde mi?
        this.jumpForce = 0.25; // Zıplama kuvveti (ayarlanabilir)
        // Oyuncunun yerçekimi, mevcut seviyeden alınacak
        this.playerGravity = levelSettings[currentLevel].gravity * 0.8; // Topun yerçekiminden biraz daha az olabilir veya aynı
        // ---------------------------------------------
        this.modelHeight = 0; // Model yüklendikten sonra ayarlanacak

        this.loadModel();
    }

    loadModel() {
        const modelPath = 'models/astronaut.glb';

        gltf_loader.load(
            modelPath,
            (gltf) => {
                const model = gltf.scene;
                model.scale.set(0.6, 0.6, 0.6);
                const box = new THREE.Box3().setFromObject(model);
                this.modelHeight = box.max.y - box.min.y; // Modelin gerçek yüksekliği
                model.position.y = this.modelHeight / 2; // Modelin altını ana mesh'in y=0'ına getir
                this.mesh.add(model);
                scene.add(this.mesh); // Ana mesh sahneye ekleniyor
                // Başlangıç pozisyonunu modelin boyuna göre ayarla (ayakları y=0'da olsun)
                // this.mesh.position.y = 0; // Ana mesh'in y'si 0'da
                console.log("Oyuncu modeli yüklendi. Model Yüksekliği:", this.modelHeight);
            },
            undefined,
            (error) => {
                console.error('Oyuncu modeli yüklenirken hata:', error);
                const geometry = new THREE.BoxGeometry(0.6, 1.2, 0.6);
                const material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
                const errorBox = new THREE.Mesh(geometry, material);
                this.modelHeight = 1.2; // Kutu için varsayılan yükseklik
                errorBox.position.y = this.modelHeight / 2;
                this.mesh.add(errorBox);
                scene.add(this.mesh);
            }
        );
    }

    // --- YENİ: Zıplama Fonksiyonu ---
    jump() {
        if (this.onGround) { // Sadece yerdeyse zıplasın
            this.velocityY = this.jumpForce;
            this.isJumping = true;
            this.onGround = false;
            console.log("Zıpladı! Kuvvet:", this.jumpForce);
        }
    }
    // -----------------------------

    move(keysPressed) {
        const moveVector = new THREE.Vector3(0, 0, 0);
        // Oyuncunun yerçekimini mevcut seviyeden al (her frame'de güncellemek iyi bir pratik)
        this.playerGravity = levelSettings[currentLevel].gravity * 0.8;


        if (keysPressed['w'] || keysPressed['arrowup']) { moveVector.z = -this.speed; }
        if (keysPressed['s'] || keysPressed['arrowdown']) { moveVector.z = this.speed; }
        if (keysPressed['a'] || keysPressed['arrowleft']) { this.mesh.rotation.y += this.rotationSpeed; }
        if (keysPressed['d'] || keysPressed['arrowright']) { this.mesh.rotation.y -= this.rotationSpeed; }

        moveVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
        this.mesh.position.add(moveVector);

        // --- YENİ: Dikey Hareket ve Yerçekimi ---
        this.velocityY -= this.playerGravity; // Yerçekimini uygula
        this.mesh.position.y += this.velocityY; // Dikey hızı pozisyona ekle

        // Zemin Kontrolü (Oyuncunun ayakları y=0 olacak şekilde)
        if (this.mesh.position.y < 0) { // Modelin altı 0'ın altına indiyse
            this.mesh.position.y = 0;    // Yere sabitle
            this.velocityY = 0;
            this.isJumping = false;
            this.onGround = true;
        }
        // -------------------------------------

        // Saha Sınır Kontrolleri
        const courtWidth = 15.24;
        const courtLength = 28.65;
        const playerMargin = 0.3; // Modelin yarı genişliği/derinliği gibi düşünün

        const minX = -courtWidth / 2 + playerMargin;
        const maxX = courtWidth / 2 - playerMargin;
        const minZ = -courtLength / 2 + playerMargin;
        const maxZ = courtLength / 2 - playerMargin;

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

export function setupPlayerControls(player, ball, hoops) {
    const keysPressed = {};
    const shootingSystem = new ShootingSystem();

    window.addEventListener('keydown', (event) => {
        const key = event.key.toLowerCase();
        keysPressed[key] = true;

        if (key === ' ' && ball.isHeld && !shootingSystem.isAimAssisted) {
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

        // --- YENİ: Zıplama Tuşu (Sol Shift) ---
        if (key === 'shift' && event.location === KeyboardEvent.DOM_KEY_LOCATION_LEFT) { // Sol Shift
            player.jump();
            event.preventDefault(); // Sayfanın varsayılan shift davranışını engelle
        }
        // ---------------------------------
    });

    window.addEventListener('keyup', (event) => {
        const key = event.key.toLowerCase();
        keysPressed[key] = false;

        if (key === 'x' && ball.isHeld) {
            shootingSystem.performAutoShot(ball, hoops);
        }
    });

    window.addEventListener('mousedown', (event) => {
        if (event.button === 0 && ball.isHeld) {
            shootingSystem.releaseCharge(ball);
        }
    });

    window.addEventListener('beforeunload', () => {
        shootingSystem.dispose();
    });

    return function updatePlayerMovement() {
        player.move(keysPressed);

        if (ball.isHeld) {
            if (!shootingSystem.isAimAssisted) {
                if (keysPressed['q']) {
                    shootingSystem.adjustAngle(-shootingSystem.angleChangeSpeed);
                }
                if (keysPressed['e']) {
                    shootingSystem.adjustAngle(shootingSystem.angleChangeSpeed);
                }
            }
            shootingSystem.update(ball);
        } else {
            shootingSystem.hideTrajectory();
        }
    };
}