import * as THREE from 'three';

let loadingScreen = null;
let progressFill = null;
let progressPercentage = null; // Yüzde metni için yeni element
let loadingMessageElement = null; // Ana yükleme mesajı için
let minDisplayTimeout = null;
const MIN_DISPLAY_TIME = 1000; // Minimum 1 saniye gösterim süresi

function createLoadingScreenElements() {
    loadingScreen = document.createElement('div');
    loadingScreen.id = 'loading-screen';
    loadingScreen.style.position = 'fixed';
    loadingScreen.style.top = '0';
    loadingScreen.style.left = '0';
    loadingScreen.style.width = '100%';
    loadingScreen.style.height = '100%';
    loadingScreen.style.background = 'linear-gradient(to bottom, #1a1a2e, #16213e)'; // Gradyan arka plan
    loadingScreen.style.display = 'flex';
    loadingScreen.style.flexDirection = 'column';
    loadingScreen.style.justifyContent = 'center';
    loadingScreen.style.alignItems = 'center';
    loadingScreen.style.zIndex = '9999';
    loadingScreen.style.opacity = '1';
    loadingScreen.style.visibility = 'visible';
    loadingScreen.style.transition = 'opacity 0.7s ease-in-out, visibility 0.7s ease-in-out';
    loadingScreen.style.pointerEvents = 'all';

    // Oyun logosu (isteğe bağlı)
    const logo = document.createElement('img');
    logo.src = '../assets/logo.png'; // Kendi logonuzun yolunu buraya ekleyin
    logo.alt = 'Game Logo';
    logo.style.maxWidth = '200px';
    logo.style.marginBottom = '30px';
    logo.style.animation = 'pulse 2s infinite alternate';
    loadingScreen.appendChild(logo);

    // Animasyonlu Spinner
    const spinner = document.createElement('div');
    spinner.style.border = '6px solid rgba(255, 255, 255, 0.2)';
    spinner.style.borderTop = '6px solid #00bcd4';
    spinner.style.borderRadius = '50%';
    spinner.style.width = '60px';
    spinner.style.height = '60px';
    spinner.style.animation = 'spin 1.2s linear infinite';
    spinner.style.marginBottom = '20px';
    loadingScreen.appendChild(spinner);

    // İlerleme Çubuğu
    const progressBar = document.createElement('div');
    progressBar.style.width = '300px';
    progressBar.style.height = '25px';
    progressBar.style.background = '#333'; // Koyu gri arka plan
    progressBar.style.border = '2px solid #555';
    progressBar.style.borderRadius = '15px';
    progressBar.style.overflow = 'hidden';
    progressBar.style.marginBottom = '20px';
    progressBar.style.boxShadow = '0 0 15px rgba(0, 255, 0, 0.5)';

    progressFill = document.createElement('div'); // Global değişkene atama
    progressFill.style.width = '0%';
    progressFill.style.height = '100%';
    progressFill.style.background = 'linear-gradient(to right, #4CAF50, #8BC34A)'; // Gradyan dolgu
    progressFill.style.transition = 'width 0.4s ease-out';
    progressFill.style.borderRadius = '15px';
    progressBar.appendChild(progressFill);

    // İlerleme Yüzdesi Metni
    progressPercentage = document.createElement('div'); // Global değişkene atama
    progressPercentage.style.color = '#fff';
    progressPercentage.style.fontFamily = 'Verdana, sans-serif';
    progressPercentage.style.fontSize = '1.2em';
    progressPercentage.style.fontWeight = 'bold';
    progressPercentage.style.textShadow = '1px 1px 3px rgba(0,0,0,0.7)';
    progressPercentage.textContent = '0%';

    // Yükleme Mesajı
    loadingMessageElement = document.createElement('div'); // Global değişkene atama
    loadingMessageElement.style.color = '#eee';
    loadingMessageElement.style.fontFamily = 'Arial, sans-serif';
    loadingMessageElement.style.fontSize = '1.1em';
    loadingMessageElement.style.marginTop = '15px';
    loadingMessageElement.textContent = 'Initializing game...';

    // İpuçları (isteğe bağlı)
    const tips = [
        "Tip: Explore the court for hidden secrets!",
        "Tip: Master your jump shot for extra points!",
        "Tip: The alien is always watching...",
        "Tip: Use 'F' to pick up the ball, 'X' for auto-shot."
    ];
    const tipElement = document.createElement('div');
    tipElement.style.color = 'rgba(255, 255, 255, 0.7)';
    tipElement.style.fontFamily = 'Georgia, serif';
    tipElement.style.fontSize = '0.9em';
    tipElement.style.marginTop = '25px';
    tipElement.style.maxWidth = '400px';
    tipElement.style.textAlign = 'center';
    tipElement.style.fontStyle = 'italic';
    tipElement.textContent = tips[Math.floor(Math.random() * tips.length)];
    loadingScreen.appendChild(tipElement);

    loadingScreen.appendChild(progressBar);
    loadingScreen.appendChild(progressPercentage);
    loadingScreen.appendChild(loadingMessageElement);
    document.body.appendChild(loadingScreen);

    // Dinamik CSS animasyonları için style etiketi ekle
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            100% { transform: scale(1.05); opacity: 0.9; }
        }
    `;
    document.head.appendChild(style);
}

export function showLoadingScreen(show = true, message = 'Loading...') {
    if (!loadingScreen) {
        createLoadingScreenElements(); // Elementleri oluştur
    }

    if (show) {
        loadingScreen.style.opacity = '1';
        loadingScreen.style.visibility = 'visible';
        loadingScreen.style.pointerEvents = 'all';
        if (loadingMessageElement) loadingMessageElement.textContent = message;
        if (progressPercentage) progressPercentage.textContent = '0%';
        if (progressFill) progressFill.style.width = '0%'; // Çubuğu sıfırla

        // Minimum gösterim süresi için zamanlayıcıyı başlat
        minDisplayTimeout = setTimeout(() => {
            minDisplayTimeout = null;
        }, MIN_DISPLAY_TIME);
    } else {
        // Eğer minimum süre dolmadıysa, dolana kadar beklet
        if (minDisplayTimeout) {
            clearTimeout(minDisplayTimeout);
            setTimeout(() => {
                loadingScreen.style.opacity = '0';
                loadingScreen.style.visibility = 'hidden';
                loadingScreen.style.pointerEvents = 'none';
            }, MIN_DISPLAY_TIME - (Date.now() - (performance.now() - MIN_DISPLAY_TIME))); // Kalan süreyi hesapla
        } else {
            loadingScreen.style.opacity = '0';
            loadingScreen.style.visibility = 'hidden';
            loadingScreen.style.pointerEvents = 'none';
        }
    }
}

export function updateLoadingProgress(progress, message = null) {
    if (!loadingScreen || !progressFill || !progressPercentage) return;

    const percentage = Math.round(progress * 100);
    progressFill.style.width = `${percentage}%`;
    progressPercentage.textContent = `${percentage}%`;

    if (message && loadingMessageElement) {
        loadingMessageElement.textContent = message;
    }
}

// THREE.js LoadingManager'ı burada tanımlıyoruz
export const loadingManager = new THREE.LoadingManager(
    // onLoad
    () => {
        setTimeout(() => showLoadingScreen(false), 500); // Hide with slight delay for smooth transition
    },
    // onProgress
    (url, itemsLoaded, itemsTotal) => {
        const progress = itemsLoaded / itemsTotal;
        updateLoadingProgress(progress, `Loading assets: ${itemsLoaded}/${itemsTotal}`);
    },
    // onError
    (url) => {
        console.error('Error loading:', url);
        updateLoadingProgress(1, 'Error loading some assets. Please refresh.'); // Hata durumunda mesaj göster
    }
);