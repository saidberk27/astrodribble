import * as THREE from 'three';

export let scene;
export let renderer;
export let loadingManager;
let loadingScreen;

function createLoadingScreen() {
    loadingScreen = document.createElement('div');
    loadingScreen.style.position = 'fixed';
    loadingScreen.style.top = '0';
    loadingScreen.style.left = '0';
    loadingScreen.style.width = '100%';
    loadingScreen.style.height = '100%';
    loadingScreen.style.background = 'rgba(0, 0, 0, 0.9)';
    loadingScreen.style.display = 'flex';
    loadingScreen.style.flexDirection = 'column';
    loadingScreen.style.justifyContent = 'center';
    loadingScreen.style.alignItems = 'center';
    loadingScreen.style.zIndex = '1000';
    loadingScreen.style.transition = 'opacity 0.5s';

    const progressBar = document.createElement('div');
    progressBar.style.width = '200px';
    progressBar.style.height = '20px';
    progressBar.style.background = '#111';
    progressBar.style.border = '2px solid #333';
    progressBar.style.borderRadius = '10px';
    progressBar.style.overflow = 'hidden';
    progressBar.style.marginBottom = '10px';

    const progressFill = document.createElement('div');
    progressFill.style.width = '0%';
    progressFill.style.height = '100%';
    progressFill.style.background = '#4CAF50';
    progressFill.style.transition = 'width 0.3s';
    progressBar.appendChild(progressFill);

    const progressText = document.createElement('div');
    progressText.style.color = '#fff';
    progressText.style.fontFamily = 'Arial, sans-serif';
    progressText.style.marginTop = '10px';
    progressText.textContent = 'Loading...';

    loadingScreen.appendChild(progressBar);
    loadingScreen.appendChild(progressText);
    document.body.appendChild(loadingScreen);

    return { progressFill, progressText };
}

export function showLoadingScreen(show = true, message = 'Loading...') {
    if (!loadingScreen) {
        createLoadingScreen();
    }
    loadingScreen.style.opacity = show ? '1' : '0';
    loadingScreen.style.pointerEvents = show ? 'all' : 'none';
    const progressText = loadingScreen.querySelector('div:last-child');
    if (progressText) {
        progressText.textContent = message;
    }
}

export function updateLoadingProgress(progress, message) {
    if (!loadingScreen) return;
    const progressFill = loadingScreen.querySelector('div > div');
    const progressText = loadingScreen.querySelector('div:last-child');
    if (progressFill) {
        progressFill.style.width = `${progress * 100}%`;
    }
    if (progressText && message) {
        progressText.textContent = message;
    }
}

export function createScene() {
    scene = new THREE.Scene();
    scene.fog = null; // Disable fog
    return scene;
}

export function createRenderer() {
    // Initialize loading manager
    loadingManager = new THREE.LoadingManager(
        // onLoad
        () => {
            setTimeout(() => showLoadingScreen(false), 500); // Hide with slight delay for smooth transition
        },
        // onProgress
        (url, itemsLoaded, itemsTotal) => {
            const progress = itemsLoaded / itemsTotal;
            updateLoadingProgress(progress, `Loading ${Math.round(progress * 100)}%`);
        },
        // onError
        (url) => {
            console.error('Error loading:', url);
            updateLoadingProgress(1, 'Error loading some assets');
        }
    );

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);
    return renderer;
}

export function handleWindowResize(camera) {
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}
