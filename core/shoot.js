// shooting.js

import * as THREE from 'three';
import { scene } from './scene.js'; // scene'i import ettiğinizden emin olun

export class ShootingSystem {
    constructor() {
        this.mousePosition = { x: 0, y: 0 }; // Mouse Y dikey açı için kullanılacak
        this.throwPower = 0;
        this.maxThrowPower = 1.0;
        this.isCharging = false;
        this.powerDirection = 1;
        this.powerBarElement = this.createPowerBar();
        this.directionArrow = null;
        this.arrowLength = 1.8; // Ok uzunluğunu biraz artırdım
        this.arrowColor = 0xffaa00; // Ok rengini değiştirdim (turuncu)
        this.defaultThrowForce = 8;
        this.chargedThrowMultiplier = 12;

        // Dikey atış açısı limitleri (radyan cinsinden)
        this.minVerticalAngle = Math.PI / 18; // Minimum 10 derece yukarı
        this.maxVerticalAngle = Math.PI / 2.8;  // Maksimum ~64 derece yukarı (daha yükseğe atış için)

        this.setupMouseListeners();
    }

    createPowerBar() {
        // ... (createPowerBar fonksiyonu önceki gibi)
        const powerBar = document.createElement('div');
        powerBar.style.position = 'fixed';
        powerBar.style.left = '20px';
        powerBar.style.top = '20px';
        powerBar.style.width = '20px';
        powerBar.style.height = '200px';
        powerBar.style.backgroundColor = '#333';
        powerBar.style.border = '2px solid #fff';
        powerBar.style.zIndex = '1000';

        const powerLevel = document.createElement('div');
        powerLevel.style.position = 'absolute';
        powerLevel.style.bottom = '0';
        powerLevel.style.width = '100%';
        powerLevel.style.backgroundColor = '#4CAF50';
        powerLevel.style.transition = 'height 0.05s linear';
        powerLevel.style.height = '0%';

        powerBar.appendChild(powerLevel);
        document.body.appendChild(powerBar);
        return powerBar;
    }

    setupMouseListeners() {
        window.addEventListener('mousemove', (event) => {
            // Mouse Y pozisyonunu alıyoruz, X'i artık yön için kullanmıyoruz
            this.mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1; // [-1, 1] aralığında
        });
    }

    createDirectionArrow(position, direction) {
        if (this.directionArrow) {
            scene.remove(this.directionArrow);
        }
        const origin = new THREE.Vector3(position.x, position.y + 0.5, position.z); // Oyuncunun el hizası
        // Başlangıçta ok yatay başlasın, updateDirectionArrow dikey açıyı ekleyecek
        const horizontalDirection = new THREE.Vector3(direction.x, 0, direction.z).normalize();
        this.directionArrow = new THREE.ArrowHelper(
            horizontalDirection,
            origin,
            this.arrowLength,
            this.arrowColor,
            0.35, // Ok başı uzunluğu
            0.25  // Ok başı genişliği
        );
        scene.add(this.directionArrow);
    }

    updateDirectionArrow(ball) {
        if (!ball.isHeld || !ball.holder) {
            if (this.directionArrow) {
                scene.remove(this.directionArrow);
                this.directionArrow = null;
            }
            return;
        }

        if (!this.directionArrow && this.isCharging) {
            const holderPos = ball.holder.getPosition();
            // Oyuncunun mevcut baktığı yöne doğru bir ok oluştur
            const playerYRotation = ball.holder.getRotationY();
            const initialHorizontalDirection = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerYRotation);
            this.createDirectionArrow(holderPos, initialHorizontalDirection);
        }

        if (!this.directionArrow) return;

        const holderPosition = ball.holder.getPosition();
        const arrowOrigin = holderPosition.clone();
        arrowOrigin.y += 0.5; // Okun başlangıç noktasını ayarla
        this.directionArrow.position.copy(arrowOrigin);

        // 1. Yatay Yönü Belirle (Oyuncunun baktığı yön)
        const baseHorizontalDirection = new THREE.Vector3(0, 0, -1); // Oyuncunun lokal -Z
        const playerYRotation = ball.holder.getRotationY();
        const horizontalDirection = baseHorizontalDirection.clone()
            .applyAxisAngle(new THREE.Vector3(0, 1, 0), playerYRotation);

        // 2. Dikey Açıyı Hesapla
        const normalizedMouseY = (this.mousePosition.y + 1) / 2; // Mouse Y'yi [0, 1] aralığına getir
        const verticalAngle = this.minVerticalAngle + normalizedMouseY * (this.maxVerticalAngle - this.minVerticalAngle);

        // 3. Yatay Yöne Dikey Açıyı Uygula
        // Oyuncunun sağına doğru olan vektörü bul (rotasyon ekseni için)
        const rightVector = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), horizontalDirection).normalize();

        const finalDirection3D = horizontalDirection.clone(); // Önce yatay yönü al
        finalDirection3D.applyAxisAngle(rightVector, -verticalAngle); // Sonra dikey açıyı uygula (mouse yukarı = açı artar)
        // Eksi işaretini kontrol et, mouse yukarı hareket ettiğinde topun yukarı gitmesi için.

        this.directionArrow.setDirection(finalDirection3D.normalize()); // Okun yönünü 3D olarak ayarla

        const currentVisualPower = this.isCharging ? this.throwPower : 0.3;
        this.directionArrow.setLength(
            this.arrowLength * (0.2 + currentVisualPower),
            0.35,
            0.25
        );
        const hue = (1 - this.throwPower / this.maxThrowPower) * 120;
        this.directionArrow.setColor(new THREE.Color(`hsl(${hue}, 100%, 50%)`));
    }

    startCharging(ball) {
        if (!ball.isHeld || ball.holder === null) return;
        this.isCharging = true;
        this.powerDirection = 1;
        this.throwPower = 0;
        this.updatePowerBar();

        const holderPos = ball.holder.getPosition();
        const playerYRotation = ball.holder.getRotationY();
        const initialHorizontalDirection = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerYRotation);
        this.createDirectionArrow(holderPos, initialHorizontalDirection); // Ok oluşturulurken yatay yönle başla
    }

    updateCharging(ball) {
        if (this.isCharging) {
            this.throwPower += 0.02 * this.powerDirection;
            if (this.throwPower >= this.maxThrowPower) {
                this.powerDirection = -1;
                this.throwPower = this.maxThrowPower;
            } else if (this.throwPower <= 0) {
                this.powerDirection = 1;
                this.throwPower = 0;
            }
            this.updatePowerBar();
        }
        this.updateDirectionArrow(ball); // Şarj sırasında yön okunu sürekli güncelle
    }

    updatePowerBar() {
        // ... (updatePowerBar fonksiyonu önceki gibi)
    }

    releaseCharge(ball) {
        if (!ball.isHeld || ball.holder === null) return;

        const wasCharging = this.isCharging;
        this.isCharging = false;

        // Atış yönünü hesapla (updateDirectionArrow ile aynı mantık)
        const baseHorizontalDirection = new THREE.Vector3(0, 0, -1);
        const playerYRotation = ball.holder.getRotationY();
        const horizontalDirection = baseHorizontalDirection.clone()
            .applyAxisAngle(new THREE.Vector3(0, 1, 0), playerYRotation);

        const normalizedMouseY = (this.mousePosition.y + 1) / 2;
        const verticalAngle = this.minVerticalAngle + normalizedMouseY * (this.maxVerticalAngle - this.minVerticalAngle);

        const rightVector = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), horizontalDirection).normalize();
        const finalThrowDirection3D = horizontalDirection.clone();
        finalThrowDirection3D.applyAxisAngle(rightVector, -verticalAngle);
        finalThrowDirection3D.normalize();

        let powerRatio = this.throwPower / this.maxThrowPower;
        if (!wasCharging || powerRatio < 0.05) {
            powerRatio = 0.4;
        }

        const finalSpeed = this.defaultThrowForce + (powerRatio * this.chargedThrowMultiplier);
        const finalVelocity = finalThrowDirection3D.multiplyScalar(finalSpeed);

        ball.throw(finalVelocity);

        this.throwPower = 0;
        this.powerDirection = 1;
        this.updatePowerBar();

        if (this.directionArrow) {
            scene.remove(this.directionArrow);
            this.directionArrow = null;
        }
    }

    dispose() {
        if (this.powerBarElement && this.powerBarElement.parentNode) {
            this.powerBarElement.parentNode.removeChild(this.powerBarElement);
        }
        if (this.directionArrow) {
            scene.remove(this.directionArrow);
            this.directionArrow = null;
        }
    }
}