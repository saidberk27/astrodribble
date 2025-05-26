import * as THREE from 'three';
import { scene } from './scene.js';

export class ShootingSystem {
    constructor() {
        this.mousePosition = { x: 0, y: 0 };
        this.throwPower = 0;
        this.maxThrowPower = 1.0;
        this.isCharging = false;
        this.chargingTimeout = null;
        this.powerDirection = 1; // 1: şarj oluyor, -1: deşarj oluyor
        this.powerBarElement = this.createPowerBar();

        // Atış yönü oku için
        this.directionArrow = null;
        this.arrowLength = 2; // Ok uzunluğu
        this.arrowColor = 0xff0000; // Kırmızı ok

        // Mouse olaylarını dinle
        this.setupMouseListeners();
    }

    createPowerBar() {
        const powerBar = document.createElement('div');
        powerBar.style.position = 'fixed';
        powerBar.style.left = '20px';
        powerBar.style.top = '20px';
        powerBar.style.width = '20px';
        powerBar.style.height = '200px';
        powerBar.style.backgroundColor = '#333';
        powerBar.style.border = '2px solid #fff';

        const powerLevel = document.createElement('div');
        powerLevel.style.position = 'absolute';
        powerLevel.style.bottom = '0';
        powerLevel.style.width = '100%';
        powerLevel.style.backgroundColor = '#4CAF50';
        powerLevel.style.transition = 'height 0.1s ease-out';
        powerLevel.style.height = '0%';

        powerBar.appendChild(powerLevel);
        document.body.appendChild(powerBar);
        return powerBar;
    } setupMouseListeners() {
        window.addEventListener('mousemove', (event) => {
            // Mouse x koordinatını ters çevir (-1 ile çarparak)
            this.mousePosition.x = -((event.clientX / window.innerWidth) * 2 - 1);
            this.mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;
        });
    }

    createDirectionArrow(position, direction) {
        // Eğer ok zaten varsa kaldır
        if (this.directionArrow) {
            scene.remove(this.directionArrow);
        }

        // Yeni ok oluştur
        const origin = new THREE.Vector3(position.x, position.y + 2.0, position.z);
        const arrowDirection = new THREE.Vector3(direction.x, 0, direction.z).normalize();

        this.directionArrow = new THREE.ArrowHelper(
            arrowDirection,
            origin,
            this.arrowLength,
            this.arrowColor,
            1.0, // Ok başı uzunluğu
            1.0  // Ok başı genişliği
        );

        scene.add(this.directionArrow);
    } updateDirectionArrow(ball) {
        if (this.isCharging && ball.holder && this.directionArrow) {
            // Ok pozisyonunu topun pozisyonuna güncelle
            const position = ball.mesh.position.clone();

            // Temel ileri yön vektörü (oyuncunun lokal z ekseni)
            const forwardDirection = new THREE.Vector3(0, 0, -1);

            // Mouse'un x pozisyonunu kullanarak açı hesapla (-45 ile +45 derece arası)
            const angle = this.mousePosition.x * Math.PI / 4; // ±45 derece

            // İleri yönü mouse'un x pozisyonuna göre döndür
            const direction = forwardDirection.clone();
            direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);

            // Oyuncunun kendi dönüşüne göre yönü döndür
            direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), ball.holder.rotation.y);

            // Ok pozisyonunu ve yönünü güncelle
            this.directionArrow.position.copy(position);
            this.directionArrow.setDirection(direction);

            // Okun uzunluğunu şarj gücüne göre ayarla
            this.directionArrow.setLength(
                this.arrowLength * (0.5 + this.throwPower), // Minimum uzunluk 0.5
                0.5, // Ok başı uzunluğu
                0.2  // Ok başı genişliği
            );

            // Okun rengini güç seviyesine göre değiştir
            const hue = (1 - this.throwPower / this.maxThrowPower) * 120;
            const color = new THREE.Color(`hsl(${hue}, 100%, 50%)`);
            this.directionArrow.setColor(color);
        }
    }

    startCharging(ball) {
        this.isCharging = true;
        this.powerDirection = 1;
        this.updatePowerBar();

        // Yön okunu oluştur
        const position = ball.mesh.position.clone();
        const direction = new THREE.Vector3(0, 0, -1);
        this.createDirectionArrow(position, direction);
    }

    updateCharging(ball) {
        if (this.isCharging) {
            // Güç değerini güncelle
            this.throwPower += 0.02 * this.powerDirection;

            // Sınırlara ulaşıldığında yönü değiştir
            if (this.throwPower >= this.maxThrowPower) {
                this.powerDirection = -1; // Deşarj moduna geç
                this.throwPower = this.maxThrowPower;
            } else if (this.throwPower <= 0) {
                this.powerDirection = 1; // Şarj moduna geç
                this.throwPower = 0;
            }

            this.updatePowerBar();
        }

        // Yön okunu güncelle
        this.updateDirectionArrow(ball);
    }

    updatePowerBar() {
        const powerLevel = this.powerBarElement.firstChild;
        const percentage = (this.throwPower / this.maxThrowPower) * 100;
        powerLevel.style.height = `${percentage}%`;

        // Renk değişimi: yeşilden kırmızıya
        const hue = (1 - this.throwPower / this.maxThrowPower) * 120;
        powerLevel.style.backgroundColor = `hsl(${hue}, 70%, 50%)`;
    } releaseCharge(ball) {
        if (!this.isCharging) return;

        this.isCharging = false;
        if (this.chargingTimeout) {
            clearTimeout(this.chargingTimeout);
        }

        // Temel ileri yön vektörü
        const throwDirection = new THREE.Vector3(0, 0, -1);

        // Mouse'un x pozisyonunu kullanarak açı hesapla (-45 ile +45 derece arası)
        const angle = this.mousePosition.x * Math.PI / 4;

        // İleri yönü mouse'un x pozisyonuna göre döndür
        throwDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);        // Yukarı yönde kuvvet ekle (mouse'un y pozisyonuna göre)
        throwDirection.y = Math.abs(this.mousePosition.y); // Dikey açıyı artır, sınırlamayı kaldır

        // Oyuncunun kendi dönüşüne göre yönü döndür
        throwDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), ball.holder.rotation.y);

        throwDirection.normalize();

        // Atış gücünü uygula
        throwDirection.multiplyScalar(this.throwPower);
        ball.throw(throwDirection);

        // Güç çubuğunu sıfırla
        this.throwPower = 0;
        this.powerDirection = 1;
        this.updatePowerBar();

        // Oku kaldır
        if (this.directionArrow) {
            scene.remove(this.directionArrow);
            this.directionArrow = null;
        }
    }

    dispose() {
        if (this.powerBarElement && this.powerBarElement.parentNode) {
            this.powerBarElement.parentNode.removeChild(this.powerBarElement);
        }
        if (this.chargingTimeout) {
            clearTimeout(this.chargingTimeout);
        }

        // Oku temizle
        if (this.directionArrow) {
            scene.remove(this.directionArrow);
            this.directionArrow = null;
        }
    }
}
