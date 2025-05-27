import * as CANNON from 'cannon-es';

// Fizik dünyası
export const world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.82, 0)
});

// Fizik dünyasını güncelle
export function updatePhysics() {
    world.step(1 / 60);  // 60 FPS için sabit time step
}

// Materyal tanımlamaları
export const groundMaterial = new CANNON.Material("groundMaterial");
export const playerMaterial = new CANNON.Material("playerMaterial");
export const ballMaterial = new CANNON.Material("ballMaterial");

// Contact material tanımlamaları
const playerGroundContact = new CANNON.ContactMaterial(
    groundMaterial,
    playerMaterial,
    {
        friction: 0,
        restitution: 0.0,
        contactEquationStiffness: 1e8,
        contactEquationRelaxation: 3
    }
);

const ballGroundContact = new CANNON.ContactMaterial(
    groundMaterial,
    ballMaterial,
    {
        friction: 0.4,
        restitution: 0.6,
        contactEquationStiffness: 1e8,
        contactEquationRelaxation: 3
    }
);

// Player-Ball çarpışması için contact material
const playerBallContact = new CANNON.ContactMaterial(
    playerMaterial,
    ballMaterial,
    {
        friction: 0.1,
        restitution: 0.5,
        contactEquationStiffness: 1e8,
        contactEquationRelaxation: 3
    }
);

// Fizik motorunu başlat
export function initPhysics() {
    // Material özellikleri
    groundMaterial.friction = 0.3;
    groundMaterial.restitution = 0.4;

    // Contact material'leri dünyaya ekle
    world.addContactMaterial(playerGroundContact);
    world.addContactMaterial(ballGroundContact);
    world.addContactMaterial(playerBallContact);  // Yeni contact material'i ekle

    // Genel fizik ayarları
    world.defaultContactMaterial.friction = 0.5;
    world.defaultContactMaterial.restitution = 0.3;
    world.solver.iterations = 10;
    world.solver.tolerance = 0.001;

    // Zemini oluştur
    createGroundPhysics();
}

// Zemin için fizik gövdesi oluştur
export function createGroundPhysics() {
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({
        mass: 0,
        shape: groundShape,
        material: groundMaterial,
        position: new CANNON.Vec3(0, 0, 0),
        collisionFilterGroup: 1,
        collisionFilterMask: -1  // Her şeyle çarpışsın
    });

    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    groundBody.position.set(0, 0, 0);

    world.addBody(groundBody);
    return groundBody;
}

// Top için fizik gövdesi oluştur
export function createBallPhysics(radius) {
    const shape = new CANNON.Sphere(radius);
    const body = new CANNON.Body({
        mass: 0.6,
        shape: shape,
        material: ballMaterial,
        position: new CANNON.Vec3(2, 2, 0), // Oyuncudan biraz uzağa yerleştir
        collisionFilterGroup: 2,
        collisionFilterMask: -1  // Her şeyle çarpışsın
    });

    body.linearDamping = 0.3;
    body.angularDamping = 0.3;
    body.allowSleep = true;  // Performans için uyku moduna geçebilir
    body.sleepSpeedLimit = 0.1;  // Bu hızın altındayken uyuyabilir
    body.sleepTimeLimit = 1;  // 1 saniye hareketsizlikten sonra uyu

    world.addBody(body);
    return body;
}

// Oyuncu için fizik gövdesi oluştur
export function createPlayerPhysics() {
    const shape = new CANNON.Box(new CANNON.Vec3(0.3, 0.6, 0.3));
    const body = new CANNON.Body({
        mass: 70,
        collisionResponse: true,
        fixedRotation: true, // Oyuncunun dönmesini engelle
        shape: shape,
        material: playerMaterial,
        position: new CANNON.Vec3(0, 2, 0),
        collisionFilterGroup: 4,
        collisionFilterMask: -1,  // Her şeyle çarpışsın
        fixedRotation: true,
        linearDamping: 0.9
    });

    world.addBody(body);
    return body;
}


// Pota için fiziksel gövde oluştur
export function createHoopPhysics(position) {
    // Pota direği için fiziksel gövde
    const poleShape = new CANNON.Cylinder(0.15, 0.15, 3.05, 8);
    const poleBody = new CANNON.Body({
        mass: 0, // Statik cisim
        position: new CANNON.Vec3(position.x, position.y / 2, position.z),
        shape: poleShape,
        material: groundMaterial // Zemin materyalini kullan
    });

    // Pota tahtası için fiziksel gövde
    const boardShape = new CANNON.Box(new CANNON.Vec3(0.9, 0.75, 0.15)); // Boyutların yarısını kullan
    const boardBody = new CANNON.Body({
        mass: 0, // Statik cisim
        position: new CANNON.Vec3(position.x, 3.05 - 0.75, position.z + 0.2),
        shape: boardShape,
        material: groundMaterial // Zemin materyalini kullan
    });

    // Çember için fiziksel gövde
    const ringShape = new CANNON.Cylinder(0.45, 0.45, 0.02, 8); // Çember boyutları
    const ringBody = new CANNON.Body({
        mass: 0,
        position: new CANNON.Vec3(position.x, position.y, position.z + 0.3), // Biraz öne çıkar
        shape: ringShape,
        material: groundMaterial
    });
    ringBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2); // Yatay pozisyon

    world.addBody(poleBody);
    world.addBody(boardBody);
    world.addBody(ringBody);
    return { poleBody, boardBody, ringBody };

    return { poleBody, boardBody };
}
