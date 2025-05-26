# Astrodribble

Astrodribble, Three.js kullanılarak geliştirilmiş 3B bir basketbol oyunudur.

## Kurulum

Projeyi çalıştırmak için aşağıdaki adımları takip edin:

1. Öncelikle bilgisayarınızda [Node.js](https://nodejs.org/) yüklü olduğundan emin olun.

2. Projeyi klonlayın veya indirin:
```bash
git clone [proje-url]
```

3. Proje dizinine gidin:
```bash
cd Astrodribble
```

4. Gerekli bağımlılıkları yükleyin:
```bash
npm install
```

5. Geliştirme sunucusunu başlatın:
```bash
npm run dev
```

6. Tarayıcınızda [http://localhost:5173](http://localhost:5173) adresine giderek oyunu görebilirsiniz.

## Teknolojiler

- [Three.js](https://threejs.org/) - 3B grafik kütüphanesi
- [Vite](https://vitejs.dev/) - Modern web geliştirme aracı

## Proje Yapısı

- `core/` - Temel oyun bileşenleri
  - `camera.js` - Kamera ayarları
  - `scene.js` - Sahne yönetimi
  - `world.js` - Oyun dünyası ve nesneler
- `textures/` - Oyunda kullanılan dokular
- `game.js` - Ana oyun mantığı
