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

    updateTrajectoryLine(ball) { /* ... Bu kısım aynı ... */
        if (!ball.isHeld || !ball.holder) { this.hideTrajectory(); return; }
        const initialVelocity = this.calculateThrowVelocity(ball);
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
        if (!this.isAimAssisted && this.throwPower <= 0) return;

        console.log("Atış yapılıyor... Güç:", this.throwPower.toFixed(1), "Açı:", THREE.MathUtils.radToDeg(this.verticalAngle).toFixed(1));
        
        // Atış animasyonu player.js'de mousedown içinde tetikleniyor.
        // Burada sadece topu fırlatma mantığı kalıyor.
        // Eğer atış animasyonu burada tetiklenecekse, this.player üzerinden çağrılabilirdi:
        // if (this.player && this.player.actions['shoot']) {
        //     this.player.playAnimationOnce('shoot', () => {
        //         const velocity = this.calculateThrowVelocity(ball);
        //         ball.throw(velocity);
        //     });
        // } else {
        //     const velocity = this.calculateThrowVelocity(ball);
        //     ball.throw(velocity);
        // }
        // Şimdilik player.js bu mantığı yönetiyor.

        const velocity = this.calculateThrowVelocity(ball);
        ball.throw(velocity);

        this.throwPower = 0;
        this.updatePowerBar();
        this.hideTrajectory();
        this.isAimAssisted = false;
    }

    // --- GÜNCELLENDİ: performAutoShot ---
    performAutoShot(ball, hoops) {
        if (!ball.isHeld || !hoops || hoops.length === 0) return;

        console.log("X Tuşu: Otomatik Nişan ve Güç Ayarlanıyor...");
        this.hideTrajectory(); // Önceki yörüngeyi temizle

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
            const targetPos = targetHoop.userData.collisionMesh.position;
            const startPos = ball.mesh.position.clone();
            const g = this.gravity;
            const T_frames = 65; // Uçuş süresi (frame) - Atışın kavisini belirler
            const dP = targetPos.clone().sub(startPos);

            // İdeal dikey hız (Vy) ve yatay hızların toplam büyüklüğü (V_horizontal_magnitude)
            const idealVy = (dP.y / T_frames) + (g * (T_frames + 1) / 2);
            // Yataydaki mesafeyi T_frames'de almak için gereken yatay hız büyüklüğü
            const dP_horizontal = new THREE.Vector3(dP.x, 0, dP.z);
            const V_horizontal_magnitude = dP_horizontal.length() / T_frames;

            // Atış yönünü belirle (yatayda hedefe doğru)
            const aimDirectionHorizontal = dP_horizontal.normalize();

            // Yönümüzü (mouse X'i etkileyen) bu ideal yatay yöne göre ayarlamalıyız.
            // Bu, player'ın Z eksenine göre ne kadar döneceğini bulmak demek.
            // Player'ın mevcut yönü (0,0,-1) + player.rotation.y
            // Hedefin yönü aimDirectionHorizontal
            // Aradaki açıyı bulup mousePosition.x'e yansıtmak yerine, doğrudan
            // calculateThrowVelocity içinde kullanılacak bir yön ayarlayabiliriz.
            // ŞİMDİLİK, horizontal açıyı manuel olarak ayarlayalım, sonra bunu hassaslaştırırız.
            // playerDir'den aimDirectionHorizontal'a olan açıyı bulup mouse'a set etmek yerine,
            // en iyisi calculateThrowVelocity'nin doğrudan bir hedef yön almasını sağlamak.
            // Ya da performAutoShot'ta geçici olarak mousePosition.x'i override etmek.

            // Geçici Çözüm: mousePosition.x'i hedefe göre ayarla
            // Bu kısım çok doğru değil ama bir başlangıç
            const worldForward = new THREE.Vector3(0, 0, -1);
            const playerRotationY = ball.holder.rotation.y;
            // Oyuncunun kendi "ön" vektörünü al
            const playerFrontVector = worldForward.clone().applyAxisAngle(new THREE.Vector3(0,1,0), playerRotationY);
            // Oyuncunun önü ile hedefe olan yatay yön arasındaki açıyı bul
            let angleToTarget = playerFrontVector.angleTo(aimDirectionHorizontal);
            // Sağa mı sola mı olduğunu bulmak için cross product
            const cross = playerFrontVector.clone().cross(aimDirectionHorizontal);
            if (cross.y < 0) angleToTarget = -angleToTarget; // Eğer sağdaysa negatif açı
            // Bu açıyı mousePosition.x'e çevir
            this.mousePosition.x = Math.max(-1, Math.min(1, (angleToTarget / (Math.PI / 4))));


            // İdeal dikey açıyı ve gücü bulmak için:
            // finalPower * sin(verticalAngle) = idealVy
            // finalPower * cos(verticalAngle) = V_horizontal_magnitude
            // tan(verticalAngle) = idealVy / V_horizontal_magnitude
            this.verticalAngle = Math.atan2(idealVy, V_horizontal_magnitude);
            this.verticalAngle = Math.max(this.minAngle, Math.min(this.maxAngle, this.verticalAngle)); // Sınırla

            // Gücü ayarla
            // finalPower = sqrt(idealVy^2 + V_horizontal_magnitude^2)
            const idealTotalSpeed = Math.sqrt(idealVy * idealVy + V_horizontal_magnitude * V_horizontal_magnitude);
            const basePower = 0.35;
            const powerBarFactor = 0.50;
            // idealTotalSpeed = basePower + (this.throwPower * powerBarFactor)
            // this.throwPower = (idealTotalSpeed - basePower) / powerBarFactor
            this.throwPower = (idealTotalSpeed - basePower) / powerBarFactor;
            this.throwPower = Math.max(0, Math.min(this.maxThrowPower, this.throwPower)); // Sınırla

            this.isAimAssisted = true; // Nişan yardımı aktif
            this.updatePowerBar();
            this.updateTrajectoryLine(ball); // Yeni ayarlarla yörüngeyi göster
            console.log("Otomatik Nişan Ayarlandı. Sol Tıkla Atış Yap.");

        } else {
            console.log("Uygun bir hedef pota bulunamadı.");
            this.isAimAssisted = false;
        }
    }

    dispose() { /* ... Bu kısım aynı ... */
        if (this.powerBarElement && this.powerBarElement.parentNode) { this.powerBarElement.parentNode.removeChild(this.powerBarElement); }
        this.hideTrajectory();
    }
}