import * as THREE from 'three';
import { fbx_loader, levelSettings, currentLevel } from '../game.js';
import { scene } from './scene.js';

export class Alien {
    constructor(player) {
        this.mesh = new THREE.Object3D();
        this.mesh.position.set(0, 0, -12); // Start at the opposite end of the court
        this.direction = new THREE.Vector3(0, 0, 1);
        this.speed = 0.0; // Slower than player
        this.player = player; // Reference to player for chasing

        this.velocityY = 0;
        this.isJumping = false;
        this.onGround = true;
        this.jumpForce = 0.25;
        this.alienGravity = levelSettings[currentLevel] ? levelSettings[currentLevel].gravity * 0.8 : 0.015 * 0.8;
        this.modelObject = null;

        this.mixer = null;
        this.actions = {};
        this.activeActionName = null;
        this.isAnimatingAction = false;

        // First add the mesh to the scene
        scene.add(this.mesh);

        // Then load the model
        this.loadCharacterAndAnimations();
    }

    loadCharacterAndAnimations() {
        const modelPath = '../models/Idle.fbx'; // Ana modelimiz (Idle animasyonunu da içeriyor)
        console.log('Loading alien model from:', modelPath);


        const animPaths = {
            run: '../models/running.fbx',          // Koşma (Run With Sword.fbx'ten)
            jump_up: '../models/jumping_up.fbx',    // Zıplama başlangıcı
            jump_down: '../models/jumping_down.fbx',// İniş
            shoot: '../models/shooting.fbx'       // Atış (Throw In.fbx'ten)
        };
        fbx_loader.load(
            modelPath,
            (loadedFbx) => {
                console.log('Alien model loaded successfully');
                this.modelObject = loadedFbx;
                this.modelObject.scale.set(0.01, 0.01, 0.01);
                this.modelObject.rotation.y = Math.PI;

                // Make the alien red-tinted to distinguish it from the player
                this.modelObject.traverse(child => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        // Add red tint to the material
                        if (child.material) {
                            // Handle both single materials and material arrays
                            if (Array.isArray(child.material)) {
                                child.material = child.material.map(mat => {
                                    const newMat = mat.clone ? mat.clone() : new THREE.MeshStandardMaterial().copy(mat);
                                    newMat.color.setHex(0x00ff00);
                                    return newMat;
                                });
                            } else {
                                child.material = child.material.clone ?
                                    child.material.clone() :
                                    new THREE.MeshStandardMaterial().copy(child.material);
                                child.material.color.setHex(0xff6666);
                            }
                        }
                    }
                });

                this.mesh.add(this.modelObject);
                scene.add(this.mesh);

                this.mixer = new THREE.AnimationMixer(this.modelObject);

                if (loadedFbx.animations && loadedFbx.animations.length > 0) {
                    const idleClip = loadedFbx.animations[0];
                    this.actions['idle'] = this.mixer.clipAction(idleClip);
                    this.actions['idle'].play();
                    this.activeActionName = 'idle';
                }

                // Load other animations
                Object.keys(animPaths).forEach(animName => {
                    const path = animPaths[animName];
                    fbx_loader.load(path, (animFbx) => {
                        if (animFbx.animations && animFbx.animations.length > 0) {
                            const clip = animFbx.animations[0];
                            this.actions[animName] = this.mixer.clipAction(clip);

                            if (['jump_up', 'jump_down'].includes(animName)) {
                                this.actions[animName].setLoop(THREE.LoopOnce);
                                this.actions[animName].clampWhenFinished = true;
                            }
                        }
                    });
                });
            },
            (progress) => {
                console.log('Alien loading progress:', (progress.loaded / progress.total * 100) + '%');
            },
            (error) => {
                console.error('Error loading alien model:', error);
                console.error('Model path was:', modelPath);
                console.error('Full error details:', error.stack || error);
            }
        );
    }

    // Alien sınıfı içinde
    playAnimation(name, crossFadeDuration = 0.2) {
        if (this.activeActionName === name || !this.actions[name] || !this.mixer || this.isAnimatingAction) return;

        const previousAction = this.actions[this.activeActionName];
        const newAction = this.actions[name];

        if (previousAction && previousAction !== newAction) {
            previousAction.fadeOut(crossFadeDuration);
        }

        // Sadece tek seferlik animasyonlar için reset() çağrısı yapın
        // Alien'ın da zıplama veya atış gibi tek seferlik animasyonları varsa buraya ekleyin
        if (['jump_up', 'jump_down', 'shoot'].includes(name)) { // Eğer alien'ın bu animasyonları varsa
            newAction.reset();
        }

        newAction
            .setEffectiveTimeScale(1)
            .setEffectiveWeight(1)
            .fadeIn(crossFadeDuration)
            .play();

        this.activeActionName = name;
    }

    // Alien sınıfı içinde update metodu
    update() {
        if (!this.player || !this.player.mesh || !this.modelObject) return;

        // Calculate direction to player
        const targetPosition = this.player.mesh.position.clone();
        const direction = targetPosition.sub(this.mesh.position).normalize();

        // Move towards player
        const moveVector = direction.multiplyScalar(this.speed);
        this.mesh.position.add(moveVector);

        // Update rotation to face player (Player sınıfındaki gibi Math.atan2 kullanın)
        const alienPosition = this.mesh.position.clone();
        const playerPosition = this.player.mesh.position.clone();
        const lookAtVector = playerPosition.sub(alienPosition);
        const angle = Math.atan2(lookAtVector.x, lookAtVector.z);
        this.modelObject.rotation.y = angle; // + Math.PI; // Modelin varsayılan yönüne göre ayarlayın

        // Keep alien on the court
        const courtWidth = 15.24;
        const courtLength = 28.65;
        const margin = 0.3;
        const minX = -courtWidth / 2 + margin;
        const maxX = courtWidth / 2 - margin;
        const minZ = -courtLength / 2 + margin;
        const maxZ = courtLength / 2 - margin;

        this.mesh.position.x = Math.max(minX, Math.min(maxX, this.mesh.position.x));
        this.mesh.position.z = Math.max(minZ, Math.min(maxZ, this.mesh.position.z));

        // Play run animation while moving
        // Burada da Player'daki gibi isAnimatingAction kontrolü ekleyebilirsiniz
        // Eğer alien'ın tek seferlik animasyonları varsa (örn: saldırı animasyonu)
        if (!this.isAnimatingAction) { // Eğer tek seferlik bir animasyon oynamıyorsa
            if (moveVector.length() > 0.01) {
                this.playAnimation('run');
            } else {
                this.playAnimation('idle');
            }
        }


        // Update animation mixer
        if (this.mixer) {
            const deltaTime = 0.0166;
            this.mixer.update(deltaTime);
        }

        // Check collision with player
        this.checkPlayerCollision();
    }

    checkPlayerCollision() {
        if (!this.player || !this.player.mesh) return;

        const distance = this.mesh.position.distanceTo(this.player.mesh.position);
        const collisionThreshold = 1.0; // Adjust this value based on your models' sizes

        if (distance < collisionThreshold) {
            // Trigger game over
            this.triggerGameOver();
        }
    }

    triggerGameOver() {
        // Dispatch a custom event that game.js will listen for
        const gameOverEvent = new CustomEvent('gameOver', {
            detail: { reason: 'Caught by alien!' }
        });
        window.dispatchEvent(gameOverEvent);
    }
}

export function createAlien(player) {
    return new Alien(player);
}
