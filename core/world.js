import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry';
import { scene } from './scene.js';

export function createLights() {
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 20, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
}

export function createCourt() {
    const courtGeometry = new THREE.PlaneGeometry(15.24, 28.65);

    const textureLoader = new THREE.TextureLoader();
    const courtTexture = textureLoader.load('textures/court_texture.jpg');

    const courtMaterial = new THREE.MeshStandardMaterial({
        map: courtTexture,
        side: THREE.DoubleSide
    });

    const court = new THREE.Mesh(courtGeometry, courtMaterial); // Court Mesh oluşturulan yer

    court.rotation.x = -Math.PI / 2;
    court.receiveShadow = true;
    scene.add(court);


}
