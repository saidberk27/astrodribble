// core/physics.js

import * as CANNON from 'cannon-es';

// Dünya ve materyaller
export const world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.82, 0),
});

export const groundMaterial = new CANNON.Material("groundMaterial");
export const playerMaterial = new CANNON.Material("playerMaterial");
export const ballMaterial = new CANNON.Material("ballMaterial");
export const wallMaterial = new CANNON.Material("wallMaterial"); // Duvarlar için yeni materyal

// Temas materyalleri
const playerGroundContact = new CANNON.ContactMaterial(
    groundMaterial,
    playerMaterial,
    {
        friction: 0.1,
        restitution: 0.0,
        contactEquationStiffness: 1e8,
        contactEquationRelaxation: 3
    }
);

const ballGroundContact = new CANNON.ContactMaterial(
    groundMaterial,
    ballMaterial,
    { friction: 0.4, restitution: 0.6 }
);
const playerBallContact = new CANNON.ContactMaterial(
    playerMaterial,
    ballMaterial,
    { friction: 0.1, restitution: 0.5 }
);

// Oyuncu-Duvar teması
const playerWallContact = new CANNON.ContactMaterial(
    playerMaterial,
    wallMaterial,
    {
        friction: 0.05, // Duvara sürtünme az olsun
        restitution: 0.1  // Duvardan hafifçe sekebilir
    }
);

// Top-Duvar teması
const ballWallContact = new CANNON.ContactMaterial(
    ballMaterial,
    wallMaterial,
    {
        friction: 0.3,
        restitution: 0.8 // Top duvardan iyi seksin
    }
);


export function initPhysics() {
    groundMaterial.friction = 0.3;
    groundMaterial.restitution = 0.3;
    playerMaterial.friction = 0.1;
    playerMaterial.restitution = 0.0;
    wallMaterial.friction = 0.05; // Duvar materyalinin özellikleri
    wallMaterial.restitution = 0.1;


    world.addContactMaterial(playerGroundContact);
    if (!world.contactmaterials.includes(ballGroundContact)) {
        world.addContactMaterial(ballGroundContact);
    }
    if (!world.contactmaterials.includes(playerBallContact)) {
        world.addContactMaterial(playerBallContact);
    }
    world.addContactMaterial(playerWallContact);
    world.addContactMaterial(ballWallContact);


    world.defaultContactMaterial.friction = 0.5;
    world.defaultContactMaterial.restitution = 0.3;
    world.solver.iterations = 10;
    world.solver.tolerance = 0.01;

    createGroundPhysics();
    createCourtBoundaries(); // Saha sınırlarını oluştur
}

export function createGroundPhysics() {
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({
        mass: 0,
        shape: groundShape,
        material: groundMaterial,
        position: new CANNON.Vec3(0, 0, 0)
    });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(groundBody);
    return groundBody;
}

// Saha sınırlarını oluşturan fonksiyon
export function createCourtBoundaries() {
    const courtWidth = 15.24; // world.js'deki saha genişliği ile aynı olmalı
    const courtLength = 28.65; // world.js'deki saha uzunluğu ile aynı olmalı
    const wallHeight = 10; // Duvarların yüksekliği (oyuncunun üzerinden atlayamayacağı kadar)
    const wallThickness = 0.5; // Duvarların kalınlığı

    const halfWidth = courtWidth / 2;
    const halfLength = courtLength / 2;

    // Duvar şekli (Box)
    const wallShapeEW = new CANNON.Box(new CANNON.Vec3(halfWidth, wallHeight / 2, wallThickness / 2)); // Doğu-Batı duvarları
    const wallShapeNS = new CANNON.Box(new CANNON.Vec3(wallThickness / 2, wallHeight / 2, halfLength)); // Kuzey-Güney duvarları

    // Duvarlar için gövdeler
    // Kuzey Duvarı (+Z yönü)
    const northWall = new CANNON.Body({
        mass: 0,
        shape: wallShapeEW,
        material: wallMaterial,
        position: new CANNON.Vec3(0, wallHeight / 2, halfLength + wallThickness / 2)
    });
    world.addBody(northWall);

    // Güney Duvarı (-Z yönü)
    const southWall = new CANNON.Body({
        mass: 0,
        shape: wallShapeEW,
        material: wallMaterial,
        position: new CANNON.Vec3(0, wallHeight / 2, -halfLength - wallThickness / 2)
    });
    world.addBody(southWall);

    // Doğu Duvarı (+X yönü)
    const eastWall = new CANNON.Body({
        mass: 0,
        shape: wallShapeNS,
        material: wallMaterial,
        position: new CANNON.Vec3(halfWidth + wallThickness / 2, wallHeight / 2, 0)
    });
    world.addBody(eastWall);

    // Batı Duvarı (-X yönü)
    const westWall = new CANNON.Body({
        mass: 0,
        shape: wallShapeNS,
        material: wallMaterial,
        position: new CANNON.Vec3(-halfWidth - wallThickness / 2, wallHeight / 2, 0)
    });
    world.addBody(westWall);
}


export function createPlayerPhysics() {
    const playerHeight = 1.2;
    const playerRadius = 0.3;
    const shape = new CANNON.Box(new CANNON.Vec3(playerRadius, playerHeight / 2, playerRadius));

    const body = new CANNON.Body({
        mass: 70,
        shape: shape,
        material: playerMaterial,
        position: new CANNON.Vec3(0, playerHeight / 2 + 0.05, 0),
        linearDamping: 0.1,
        angularDamping: 0.1,
    });

    body.updateMassProperties();
    body.invInertia.x = 0;
    body.invInertia.z = 0;
    body.invInertiaSolve.x = 0;
    body.invInertiaSolve.z = 0;
    body.updateInertiaWorld(true);


    world.addBody(body);
    return body;
}

export function createBallPhysics(radius = 0.2) {
    const shape = new CANNON.Sphere(radius);
    const body = new CANNON.Body({
        mass: 0.6, shape: shape, material: ballMaterial,
        position: new CANNON.Vec3(2, 2, 0),
        linearDamping: 0.3, angularDamping: 0.3
    });
    world.addBody(body);
    return body;
}
export function createHoopPhysics(position = { x: 0, y: 3.05, z: 12.5 }) {
    const poleMaterial = groundMaterial;
    const boardMaterial = groundMaterial;
    const ringMaterial = groundMaterial; // Çember için de duvar materyali kullanılabilir veya ayrı bir tane

    const poleShape = new CANNON.Cylinder(0.1, 0.1, position.y, 8);
    const poleBody = new CANNON.Body({
        mass: 0, shape: poleShape, material: poleMaterial,
        position: new CANNON.Vec3(position.x, position.y / 2, position.z)
    });
    world.addBody(poleBody);

    const boardDimensions = { width: 1.8, height: 1.05, depth: 0.05 };
    const boardShape = new CANNON.Box(new CANNON.Vec3(boardDimensions.width / 2, boardDimensions.height / 2, boardDimensions.depth / 2));
    const boardBody = new CANNON.Body({
        mass: 0, shape: boardShape, material: boardMaterial,
        position: new CANNON.Vec3(position.x, position.y - boardDimensions.height / 2 + 0.1, position.z - boardDimensions.depth / 2 - 0.225)
    });
    world.addBody(boardBody);

    const ringRadius = 0.225;
    const ringThickness = 0.02;
    const ringShape = new CANNON.Cylinder(ringRadius, ringRadius, ringThickness, 16);
    const ringBody = new CANNON.Body({
        mass: 0, shape: ringShape, material: ringMaterial, // Çember için ringMaterial
        position: new CANNON.Vec3(position.x, position.y, position.z)
    });
    ringBody.quaternion.setFromEuler(Math.PI / 2, 0, 0);
    world.addBody(ringBody);
    return { poleBody, boardBody, ringBody };
}


export function updatePhysics() {
    world.step(1 / 60);
}