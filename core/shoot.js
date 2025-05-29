import * as THREE from 'three';
import { scene } from './scene.js';
import { Ball } from './ball.js';

// Yörüngeyi hesaplamak için yardımcı fonksiyon (Aynı kalıyor)
function calculateTrajectory(startPos, startVel, gravity, numSteps) {
    const points = [];
    const currentPos = startPos.clone();
    const currentVel = startVel.clone();
    points.push(currentPos.clone());
    for (let i = 1; i <= numSteps; i++) {
        currentVel.y -= gravity;
        currentPos.add(currentVel);
        points.push(currentPos.clone());
        if (currentPos.y < 0.1) break;
    }
    return points;
}

export class ShootingSystem {
    constructor(playerRef) { // <-- playerRef parametresi eklendi
        this.mousePosition = { x: 0, y: 0 };
        this.throwPower = 0;
        this.maxThrowPower = 1.0;
        this.powerBarElement = this.createPowerBar();
        this.trajectoryLine = null;
        this.gravity = new Ball().gravity;
        this.verticalAngle = Math.PI / 4;
        this.minAngle = Math.PI / 8;
        this.maxAngle = Math.PI / 2.5;
        this.angleChangeSpeed = 0.02;
        this.powerIncrement = 0.1;
        this.isAimAssisted = false;
        this.autoAimVelocity = new THREE.Vector3(); // Arkadaşının eklediği özellik

        this.player = playerRef; // <-- Oyuncu referansını sakla

        this.setupMouseListeners();
        this.updatePowerBar();
    }

    createPowerBar() { /* ... Bu kısım aynı ... */
        const powerBarContainer = document.createElement('div'); powerBarContainer.style.position = 'fixed';
        powerBarContainer.style.left = '30px'; powerBarContainer.style.top = '50%';
        powerBarContainer.style.transform = 'translateY(-50%)'; powerBarContainer.style.width = '20px';
        powerBarContainer.style.height = '200px'; powerBarContainer.style.backgroundColor = '#222';
        powerBarContainer.style.border = '2px solid #fff'; powerBarContainer.style.borderRadius = '5px';
        powerBarContainer.style.overflow = 'hidden'; powerBarContainer.style.zIndex = '100';
        const powerLevel = document.createElement('div'); powerLevel.style.position = 'absolute';
        powerLevel.style.bottom = '0'; powerLevel.style.width = '100%';
        powerLevel.style.backgroundColor = '#4CAF50'; powerLevel.style.transition = 'height 0.1s ease-out';
        powerLevel.style.height = '0%'; powerBarContainer.appendChild(powerLevel);
        document.body.appendChild(powerBarContainer); return powerBarContainer;
    }

    setupMouseListeners() {
        window.addEventListener('mousemove', (event) => {
            if (!this.isAimAssisted) { // Sadece manuel nişanda mouse X'i kullan
                this.mousePosition.x = -((event.clientX / window.innerWidth) * 2 - 1);
            }
        });
    }

    adjustAngle(amount) {
        if (this.isAimAssisted) return; // Otomatik nişan aktifken açıyı manuel değiştirme
        this.verticalAngle += amount;
        this.verticalAngle = Math.max(this.minAngle, Math.min(this.maxAngle, this.verticalAngle));
    }

    increasePower() {
        if (this.isAimAssisted) return; // Otomatik nişan aktifken gücü manuel değiştirme

        if (this.throwPower >= this.maxThrowPower) {
            this.throwPower = 0;
        } else {
            this.throwPower += this.powerIncrement;
            this.throwPower = Math.min(this.throwPower, this.maxThrowPower);
        }
        this.updatePowerBar();
    }

    calculateThrowVelocity(ball) {
        const basePower = 0.35;
        const powerBarFactor = 0.50;

        // Yatay yönü mouse X ve oyuncu dönüşü ile belirle
        const horizontalDirection = new THREE.Vector3(0, 0, -1);
        let horizontalAngle;

        if (this.isAimAssisted && this.lockedTargetDirection) {
            // Otomatik nişanda kilitlenmiş yönü kullan
            // lockedTargetDirection, oyuncuya göre değil, dünya koordinatlarında olmalı
            // Bu yüzden oyuncu dönüşünü burada tekrar uygulamamalıyız.
            // Aslında, lockedTargetDirection'ı doğrudan kullanabiliriz.
            // Şimdilik, mousePosition.x'i kilitlenmiş bir değere set ettiğimizi varsayalım.
            // Ya da daha iyisi, calculateThrowVelocity direkt bir "targetDirection" alsın.
            // ŞİMDİLİK BASİT TUTALIM: Otomatik nişan horizontalAngle'ı da kilitler.
            // Bu, performAutoShot içinde ayarlanacak. mousePosition.x'i orada set edeceğiz.
            horizontalAngle = this.mousePosition.x * Math.PI / 4;
        } else {
            horizontalAngle = this.mousePosition.x * Math.PI / 4;
        }

        horizontalDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), horizontalAngle);
        if (ball.holder) {
            horizontalDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), ball.holder.rotation.y);
        }

        let throwDirection = horizontalDirection.clone();
        throwDirection.y = Math.tan(this.verticalAngle);
        throwDirection.normalize();

        const finalPower = basePower + (this.throwPower * powerBarFactor);
        return throwDirection.multiplyScalar(finalPower);
    }

    hideTrajectory() { /* ... Bu kısım aynı ... */
        if (this.trajectoryLine) { scene.remove(this.trajectoryLine); this.trajectoryLine.geometry.dispose(); this.trajectoryLine.material.dispose(); this.trajectoryLine = null; }
    }

    showTrajectory(ball) { this.updateTrajectoryLine(ball); }

    updateTrajectoryLine(ball) { /* ... Arkadaşının iyileştirmesi ile güncellenmiş ... */
        if (!ball.isHeld || !ball.holder) { this.hideTrajectory(); return; }
        this.gravity = ball.gravity; // Arkadaşının eklediği: dinamik gravity güncellemesi
        const initialVelocity = this.isAimAssisted ? this.autoAimVelocity : this.calculateThrowVelocity(ball);
        const points = calculateTrajectory(ball.mesh.position, initialVelocity, this.gravity, 70);
        this.hideTrajectory(); if (points.length < 2) return;
        const curve = new THREE.CatmullRomCurve3(points);
        const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.03, 8, false);
        const tubeMat = new THREE.MeshBasicMaterial({ color: 0xffa500 });
        this.trajectoryLine = new THREE.Mesh(tubeGeo, tubeMat);
        scene.add(this.trajectoryLine);
    }

    update(ball) { // hoops parametresini kaldırdık, X tuşu için ayrıca gönderiliyor
        if (ball.isHeld) {
            this.updateTrajectoryLine(ball);
        }
    }

    updatePowerBar() { /* ... Bu kısım aynı ... */
        if (!this.powerBarElement) return; const powerLevel = this.powerBarElement.firstChild; if (!powerLevel) return;
        const percentage = (this.throwPower / this.maxThrowPower) * 100; powerLevel.style.height = `${percentage}%`;
        const hue = (1 - this.throwPower / this.maxThrowPower) * 120;
        powerLevel.style.backgroundColor = `hsl(${hue}, 90%, 50%)`;
    }

    releaseCharge(ball) {
        if (!ball.isHeld) return;

        let velocity;
        if (this.isAimAssisted) {
            console.log("Otomatik atış yapılıyor...");
            velocity = this.autoAimVelocity.clone(); // Arkadaşının iyileştirmesi
        } else {
            if (this.throwPower <= 0) return;
            console.log("Manuel atış yapılıyor... Güç:", this.throwPower.toFixed(1), "Açı:", THREE.MathUtils.radToDeg(this.verticalAngle).toFixed(1));
            velocity = this.calculateThrowVelocity(ball);
        }

        // Atış animasyonu player.js'de mousedown içinde tetikleniyor.
        // Burada sadece topu fırlatma mantığı kalıyor.
        // Eğer atış animasyonu burada tetiklenecekse, this.player üzerinden çağrılabilirdi:
        // if (this.player && this.player.actions['shoot']) {
        //     this.player.playAnimationOnce('shoot', () => {
        //         ball.throw(velocity);
        //     });
        // } else {
        //     ball.throw(velocity);
        // }
        // Şimdilik player.js bu mantığı yönetiyor.

        ball.throw(velocity);

        this.throwPower = 0;
        this.updatePowerBar();
        this.hideTrajectory();
        this.isAimAssisted = false;
        this.autoAimVelocity.set(0, 0, 0); // Arkadaşının eklediği temizleme
    }

    // --- GÜNCELLENDİ: performAutoShot - Arkadaşının fizik hesaplamaları ile iyileştirilmiş ---
    performAutoShot(ball, hoops) {
        if (!ball.isHeld || !hoops || hoops.length === 0) return;

        console.log("X Tuşu: Otomatik Nişan ve Güç Hesaplanıyor...");
        this.hideTrajectory(); // Önceki yörüngeyi temizle
        this.gravity = ball.gravity; // Arkadaşının eklediği: dinamik gravity güncellemesi

        const playerPos = ball.holder.position.clone();
        const playerDir = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), ball.holder.rotation.y).normalize();

        let targetHoop = null;
        let maxDot = 0.1;
        hoops.forEach(hoop => {
            if (hoop.userData && hoop.userData.collisionMesh) {
                const hoopPos = hoop.userData.collisionMesh.position;
                const toHoop = hoopPos.clone().sub(playerPos).normalize();
                const dot = playerDir.dot(toHoop);
                if (dot > maxDot) {
                    maxDot = dot;
                    targetHoop = hoop;
                }
            }
        });

        if (targetHoop) {
            // Arkadaşının iyileştirilmiş fizik hesaplamaları
            const targetPos = targetHoop.userData.collisionMesh.position.clone();
            targetPos.y += 0.25; // Arkadaşının eklediği: hedef yükseklik ayarı

            const startPos = ball.mesh.position.clone();

            // SORUNUN KAYNAĞI BU SATIRDI. Skorlama koşulunu bozuyordu.
            // Bu satırı kaldırarak doğrudan çemberin merkezine nişan alıyoruz.
            // targetPos.y -= 0.15; (Arkadaşının yorumu)

            const g = this.gravity;
            const dP_horizontal = new THREE.Vector3(targetPos.x - startPos.x, 0, targetPos.z - startPos.z);
            const delta_x = dP_horizontal.length();
            const delta_y = targetPos.y - startPos.y;

            const theta = Math.PI / 4; // 45 derece sabit açı
            const cosTheta = Math.cos(theta);
            const tanTheta = Math.tan(theta);

            const numerator = g * delta_x * delta_x;
            const denominator = 2 * cosTheta * cosTheta * (delta_x * tanTheta - delta_y);

            if (denominator <= 0) {
                console.log("Hedef bu açıyla ulaşılamaz.");
                this.isAimAssisted = false;
                return;
            }

            const v0_squared = numerator / denominator;
            const v0 = Math.sqrt(v0_squared);

            if (isNaN(v0)) {
                console.log("Hesaplama hatası (v0 = NaN), hedef ulaşılamaz.");
                this.isAimAssisted = false;
                return;
            }

            const aimDirectionHorizontal = dP_horizontal.normalize();
            const horizontal_velocity_component = aimDirectionHorizontal.multiplyScalar(v0 * cosTheta);
            const idealVelocity = new THREE.Vector3(
                horizontal_velocity_component.x,
                v0 * Math.sin(theta),
                horizontal_velocity_component.z
            );

            this.autoAimVelocity.copy(idealVelocity); // Arkadaşının eklediği: hesaplanan hızı sakla
            this.isAimAssisted = true; // Nişan yardımı aktif

            // Güç çubuğu için görsel güncelleme
            const finalPower = idealVelocity.length();
            const basePower = 0.35;
            const powerBarFactor = 0.50;
            this.throwPower = (finalPower - basePower) / powerBarFactor;
            this.throwPower = Math.max(0, Math.min(this.maxThrowPower, this.throwPower));
            this.verticalAngle = theta;

            console.log("Otomatik Nişan Ayarlandı. Güç:", this.throwPower.toFixed(2), "Açı:", THREE.MathUtils.radToDeg(this.verticalAngle).toFixed(1));
            this.updatePowerBar();
            this.updateTrajectoryLine(ball); // Yeni ayarlarla yörüngeyi göster
            console.log("Sol Tıkla Atış Yap.");

        } else {
            console.log("Uygun bir hedef pota bulunamadı.");
            this.isAimAssisted = false;
        }
    }

    dispose() { /* ... Arkadaşının iyileştirmesi ile güncellenmiş ... */
        if (this.powerBarElement && this.powerBarElement.parentNode) {
            this.powerBarElement.parentNode.removeChild(this.powerBarElement);
            this.powerBarElement = null; // Arkadaşının eklediği: null set etme
        }
        this.hideTrajectory();
    }
}