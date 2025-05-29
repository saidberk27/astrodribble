import * as THREE from 'three';
import { ShootingSystem } from './shoot.js';
import { fbx_loader, levelSettings, currentLevel } from '../game.js';
import { scene } from './scene.js';

export class Player {
    constructor() {
        this.mesh = new THREE.Object3D();
        this.mesh.position.set(0, 0, 0);
        this.direction = new THREE.Vector3(0, 0, -1);
        this.speed = 0.15;
        this.rotationSpeed = 0.05;

        this.velocityY = 0;
        this.isJumping = false;
        this.onGround = true;
        this.jumpForce = 0.25;
        this.playerGravity = levelSettings[currentLevel] ? levelSettings[currentLevel].gravity * 0.8 : 0.015 * 0.8;
        this.modelObject = null;
        this.isMovingHorizontal = false;  // Add this property

        this.mixer = null;
        this.actions = {};
        this.activeActionName = null;
        this.isAnimatingAction = false; // Tek seferlik animasyon oynuyor mu?

        this.loadCharacterAndAnimations();
    }

    loadCharacterAndAnimations() {
        const modelPath = 'models/Idle.fbx'; // Ana modelimiz (Idle animasyonunu da içeriyor)
        const animPaths = {
            run: 'models/running.fbx',          // Koşma (Run With Sword.fbx'ten)
            jump_up: 'models/jumping_up.fbx',    // Zıplama başlangıcı
            jump_down: 'models/jumping_down.fbx',// İniş
            shoot: 'models/shooting.fbx'       // Atış (Throw In.fbx'ten)
        };

        fbx_loader.load(modelPath, (loadedFbx) => {
            this.modelObject = loadedFbx;
            this.modelObject.scale.set(0.01, 0.01, 0.01);
            this.modelObject.rotation.y = Math.PI; // Yön düzeltmesi

            this.modelObject.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            this.mesh.add(this.modelObject);
            scene.add(this.mesh);
            console.log("Oyuncu ana modeli (Idle) yüklendi:", modelPath);

            this.mixer = new THREE.AnimationMixer(this.modelObject);

            if (loadedFbx.animations && loadedFbx.animations.length > 0) {
                const idleClip = loadedFbx.animations[0];
                this.actions['idle'] = this.mixer.clipAction(idleClip);
                this.actions['idle'].play();
                this.activeActionName = 'idle';
                console.log("Varsayılan 'idle' animasyonu oynatılıyor:", idleClip.name);
            } else {
                console.warn(modelPath + " içinde varsayılan animasyon bulunamadı.");
            }

            // Diğer animasyonları yükle
            Object.keys(animPaths).forEach(animName => {
                const path = animPaths[animName];
                fbx_loader.load(path, (animFbx) => {
                    if (animFbx.animations && animFbx.animations.length > 0) {
                        const clip = animFbx.animations[0]; // Her FBX'in ilk animasyonunu al
                        this.actions[animName] = this.mixer.clipAction(clip);
                        console.log("'" + animName + "' animasyonu yüklendi:", clip.name);

                        // Tek seferlik oynayacak animasyonların ayarları
                        if (['jump_up', 'jump_down', 'shoot'].includes(animName)) {
                            this.actions[animName].setLoop(THREE.LoopOnce);
                            this.actions[animName].clampWhenFinished = true;
                        }
                    } else {
                        console.warn(path + " içinde animasyon klibi bulunamadı.");
                    }
                }, undefined, (error) => console.error(path + " yüklenirken hata:", error));
            });

        }, undefined, (error) => {
            console.error(modelPath + ' yüklenirken hata:', error);
        });
    }

    playAnimation(name, crossFadeDuration = 0.2) {
        if (this.activeActionName === name || !this.actions[name] || !this.mixer || this.isAnimatingAction) return;

        const previousAction = this.actions[this.activeActionName];
        const newAction = this.actions[name];

        if (previousAction && previousAction !== newAction) {
            previousAction.fadeOut(crossFadeDuration);
        }

        newAction
            .reset()
            .setEffectiveTimeScale(1)
            .setEffectiveWeight(1)
            .fadeIn(crossFadeDuration)
            .play();

        this.activeActionName = name;
    }

    playAnimationOnce(name, onFinishedCallback, crossFadeDuration = 0.1) {
        if (!this.actions[name] || !this.mixer || this.isAnimatingAction) {
            if (onFinishedCallback) onFinishedCallback(); // Eğer zaten animasyondaysak veya animasyon yoksa callback'i hemen çağır.
            return;
        }

        this.isAnimatingAction = true; // Tek seferlik animasyon oynuyor bayrağı
        const actionToPlay = this.actions[name];
        const previousActionName = this.activeActionName;

        // Önceki animasyonu yavaşça sonlandır
        if (this.actions[previousActionName] && this.actions[previousActionName] !== actionToPlay) {
            this.actions[previousActionName].fadeOut(crossFadeDuration);
        }

        // Yeni animasyonu başlat
        actionToPlay
            .reset()
            .setLoop(THREE.LoopOnce, 1) // Tekrar döngü ayarını teyit et
            .setEffectiveTimeScale(1)
            .setEffectiveWeight(1)
            .fadeIn(crossFadeDuration)
            .play();
        this.activeActionName = name; // Aktif animasyonu güncelle


        const listener = (event) => {
            if (event.action === actionToPlay) {
                this.mixer.removeEventListener('finished', listener);
                this.isAnimatingAction = false; // Animasyon bitti bayrağı

                // Biten animasyon 'shoot' veya 'jump_down' değilse idle'a dön
                // 'shoot' ve 'jump_down' bittikten sonraki durumları kendi özel mantıklarında ele almalılar
                if (name !== 'shoot' && name !== 'jump_down') {
                    this.playAnimation(this.isMovingHorizontal ? 'run' : 'idle'); // Use this.isMovingHorizontal
                }

                if (onFinishedCallback) {
                    onFinishedCallback();
                }
            }
        };
        this.mixer.addEventListener('finished', listener);
    }


    jump() {
        if (this.onGround && !this.isAnimatingAction) {
            this.velocityY = this.jumpForce;
            this.isJumping = true;
            this.onGround = false;
            this.playAnimationOnce('jump_up', () => {
                // jump_up bittikten sonra, eğer hala havadaysak bir "falling" animasyonuna geçebiliriz.
                // Şimdilik, yere inme kontrolü move() içinde jump_down'ı tetikleyecek.
                // Veya jump_up bitince direkt idle/run'a dönebilir eğer falling animasyonumuz yoksa.
                // Şu anki playAnimationOnce mantığı, jump_up bitince koşuyor/duruyor durumuna göre animasyona dönecek.
            });
        }
    }

    move(keysPressed) {
        this.playerGravity = levelSettings[currentLevel] ? levelSettings[currentLevel].gravity * 0.8 : 0.015 * 0.8;
        const moveVector = new THREE.Vector3(0, 0, 0);
        this.isMovingHorizontal = false;  // Reset at start of move

        if (keysPressed['w'] || keysPressed['arrowup']) { moveVector.z = -this.speed; this.isMovingHorizontal = true; }
        if (keysPressed['s'] || keysPressed['arrowdown']) { moveVector.z = this.speed; this.isMovingHorizontal = true; }
        if (keysPressed['a'] || keysPressed['arrowleft']) { this.mesh.rotation.y += this.rotationSpeed; }
        if (keysPressed['d'] || keysPressed['arrowright']) { this.mesh.rotation.y -= this.rotationSpeed; }

        moveVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
        this.mesh.position.add(moveVector);

        this.velocityY -= this.playerGravity;
        this.mesh.position.y += this.velocityY;

        if (this.mesh.position.y < 0) { // Zemin kontrolü
            this.mesh.position.y = 0;
            this.velocityY = 0;
            if (this.isJumping) { // Eğer zıplama durumundan geliyorsa
                this.playAnimationOnce('jump_down', () => {
                    // İniş animasyonu bittikten sonra idle veya run'a geç
                    this.playAnimation(this.isMovingHorizontal ? 'run' : 'idle');
                });
            }
            this.isJumping = false;
            this.onGround = true;
        }

        // Animasyon Durumunu Ayarla (Tek seferlik bir animasyon oynamıyorsa)
        if (!this.isAnimatingAction && this.onGround) {
            if (this.isMovingHorizontal) {
                this.playAnimation('run');
            } else {
                this.playAnimation('idle');
            }
        }

        // Saha Sınırları
        const courtWidth = 15.24; const courtLength = 28.65; const playerMargin = 0.3;
        const minX = -courtWidth / 2 + playerMargin; const maxX = courtWidth / 2 - playerMargin;
        const minZ = -courtLength / 2 + playerMargin; const maxZ = courtLength / 2 - playerMargin;
        this.mesh.position.x = Math.max(minX, Math.min(maxX, this.mesh.position.x));
        this.mesh.position.z = Math.max(minZ, Math.min(maxZ, this.mesh.position.z));

        this.direction.set(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);

        if (this.mixer) {
            const deltaTime = 0.0166; // THREE.Clock kullanmak daha iyi
            this.mixer.update(deltaTime);
        }
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
    // ShootingSystem constructor'ına player referansını artık göndermiyoruz,
    // çünkü atış animasyonu doğrudan player.js içinde mousedown ile tetikleniyor.
    const shootingSystem = new ShootingSystem();

    window.addEventListener('keydown', (event) => {
        const key = event.key.toLowerCase();
        keysPressed[key] = true;
        if (key === ' ' && ball.isHeld && !shootingSystem.isAimAssisted && !player.isAnimatingAction) { // Animasyon yokken güç artır
            shootingSystem.increasePower();
            event.preventDefault();
        }
        if (key === 'f' && !ball.isHeld) {
            const distance = player.mesh.position.distanceTo(ball.mesh.position);
            if (distance < 2) {
                ball.pickUp(player.mesh);
                if (ball.isHeld) { shootingSystem.showTrajectory(ball); }
            }
        }
        if (key === 'shift' && event.location === KeyboardEvent.DOM_KEY_LOCATION_LEFT) { // Sol Shift
            player.jump();
            event.preventDefault();
        }
    });

    window.addEventListener('keyup', (event) => {
        const key = event.key.toLowerCase();
        keysPressed[key] = false;
        if (key === 'x' && ball.isHeld) {
            shootingSystem.performAutoShot(ball, hoops);
        }
    });

    window.addEventListener('mousedown', (event) => {
        if (event.button === 0 && ball.isHeld && !player.isAnimatingAction) { // Sol Tıklama
            player.playAnimationOnce('shoot'); // Sadece animasyonu başlat, callback yok

            // Atış animasyonunun yaklaşık ne kadar sürede topu "bıraktığını" tahmin etmemiz lazım.
            // Örneğin, animasyon 0.5 saniyede topu bırakıyorsa:
            const releaseTime = 500; // milisaniye (0.5 saniye) - BU DEĞERİ ANİMASYONUNUZA GÖRE AYARLAYIN!

            setTimeout(() => {
                // Eğer hala top tutuluyorsa ve otomatik nişan aktif değilse fırlat
                // (Oyuncu bu süre içinde topu bırakmış veya X'e basmış olabilir)
                if (ball.isHeld && !shootingSystem.isAimAssisted) {
                    shootingSystem.releaseCharge(ball);
                }
            }, releaseTime);
        }
    });

    window.addEventListener('beforeunload', () => {
        shootingSystem.dispose();
    });

    return function updatePlayerMovement() {
        player.move(keysPressed);
        if (ball.isHeld) {
            if (!shootingSystem.isAimAssisted && !player.isAnimatingAction) { // Animasyon yokken açı ayarla
                if (keysPressed['q']) { shootingSystem.adjustAngle(-shootingSystem.angleChangeSpeed); }
                if (keysPressed['e']) { shootingSystem.adjustAngle(shootingSystem.angleChangeSpeed); }
            }
            shootingSystem.update(ball);
        } else {
            shootingSystem.hideTrajectory();
        }
    };
}