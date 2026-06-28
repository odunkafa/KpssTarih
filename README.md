# 📚 KPSS Tarih Öğrenme Uygulaması

**Duolingo tarzı, oyunlaştırılmış KPSS tarih müfredatı öğrenme platformu**

## 🎯 Özellikler

- ✅ **Modüler & Interaktif İçerik**: Kelime seçimi, coğrafi tespit
- ✅ **10 Soruluk Döngü**: Adaptive testing, yanlış soruları yeniden soru
- ✅ **Oyunlaştırma**: XP, rozetler, seviyelendirme
- ✅ **Coğrafya Entegrasyonu**: Leaflet harita, Nominatim geocoding
- ✅ **PWA**: Web + installable app, offline support
- ✅ **Google Sheets Sync**: Verileriniz cloud'da güvenle saklanır
- ✅ **Duolingo UI**: Mobile-first, sade, eğlenceli tasarım

---

## 📦 Kurulum

### Gereklilikler
- GitHub hesabı
- Claude API Key (Anthropic'den)
- Google Sheets + Google Apps Script (opsiyonel, ileri özellik)
- Modern browser (Chrome, Firefox, Safari, Edge)

### Adımlar

1. **Repo'yu clone et**
   ```bash
   git clone https://github.com/[username]/kpss-tarih-ogrenme.git
   cd kpss-tarih-ogrenme
   ```

2. **API Keys ekle**
   - `config.js` aç
   - `CLAUDE_API_KEY` alanına API key'ini yapıştır
   - `GOOGLE_SHEETS_ID` ve `GOOGLE_APPS_SCRIPT_URL` ekle (opsiyonel)

3. **GitHub Pages'a deploy et**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

4. **Erişim**
   - `https://[username].github.io/kpss-tarih-ogrenme/`

---

## 🏗️ Proje Yapısı

```
kpss-tarih-ogrenme/
├── index.html                    # Ana sayfa (PWA entry point)
├── manifest.json                 # PWA ayarları
├── sw.js                         # Service Worker (offline)
├── config.js                     # Global ayarlar & API keys
├── css/
│   ├── styles.css               # Ana stiller
│   ├── responsive.css           # Responsive design
│   └── animations.css           # Animasyonlar & transitions
├── js/
│   ├── app.js                   # Ana app logic
│   ├── modules/
│   │   ├── contentPool.js       # Content caching & AI integration
│   │   ├── userProgress.js      # Kullanıcı ilerleme tracking
│   │   ├── gameEngine.js        # XP, badges, döngü mantığı
│   │   ├── uiRenderer.js        # DOM manipulation
│   │   ├── geoServices.js       # Harita & geocoding
│   │   ├── aiProvider.js        # Claude API wrapper
│   │   └── googleSheets.js      # Google Sheets senkronizasyon
│   └── utils/
│       ├── helpers.js           # Utility functions
│       └── constants.js         # Global constants
├── data/
│   └── curriculum.json          # KPSS müfredatı
└── README.md                     # Bu dosya
```

---

## 🚀 Nasıl Çalışır?

### 1. Öğrenme Akışı
```
Ünite Seç → Konuyu Aç → Bilgi Kartı (Interaktif Metin)
  ↓
Harita Gör (Coğrafya) → "Anladım" Butonu
  ↓
10 Soruluk Test Başla
  ↓
Doğru Cevap → XP + Açıklama
Yanlış Cevap → Listenin Sonuna Ekle → Tekrar Sor
  ↓
Tamamlandı → Rozet & Seviyelendir
```

### 2. AI Entegrasyonu
- **İlk Açılış**: Konu adı → Claude → metin, sorular, coğrafya referansları
- **Caching**: Tüm içerik localStorage'a kaydedilir → 2. kullanıcı beklemez
- **Coğrafya Tespiti**: AI otomatik yerler bulur → Nominatim'den koordinat çeker

### 3. Oyunlaştırma
- **XP**: Her doğru soru +50, konu tamamlama +150
- **Seviyeler**: Tohum → Filiz → Ağaç → Orman → Efsane
- **Rozetler**: Coğrafya Dedektifi, Tarih Ustası, etc.

---

## ⚙️ Konfigürasyon

`config.js` aç ve şunları ayarla:

```javascript
CONFIG = {
    CLAUDE_API_KEY: 'sk-...', // Sana verilecek
    GOOGLE_SHEETS_ID: 'xxx',  // (Opsiyonel)
    XP_PER_QUESTION: 50,       // Soru başına XP
    COLORS: {...},             // Tema renkleri
    // ... daha fazla ayar
}
```

---

## 🧠 AI İçerik Oluşturma

### İlk Kez Açılan Bir Konuya Ne Olur?

```javascript
// 1. Kullanıcı konuya tıklar
// 2. Cache'de yoksa:
const content = await AI.generateSubtopic(unitId, topicId, subtopicId);
// 3. AI döndürür:
{
    mainText: "Metin [seçilebilir kelimeler]...",
    geoInfo: "Coğrafya köprüsü...",
    geoReferences: [{ place: "Şehir", coords: [...] }],
    questions: [{q: "...", options: [...], ...}]
}
// 4. localStorage'a cache
// 5. UI'de render
```

### Kelime Seçimi (Interactive)
Kullanıcı bir kelimeye basılı tutarsa:
```
Popup:
"[Kelime]: Açıklama (1-2 cümle)"
```

### Harita (Coğrafi Tespit)
Metin içindeki şehir/yer otomatik harita iconuyla işaretlenir. Tıklandığında:
```
Leaflet harita açılır
↓
Koordinatlar gösterilir
↓
Zoom & pan
```

---

## 📊 Veri Yapısı (JSON)

### ContentPool Örneği
```json
{
  "topic": {
    "topicId": "topic_1_anav",
    "mainText": "Anav, [Orta Asya]'nın...",
    "geoReferences": [
      {
        "place": "Türkmenistan",
        "coords": [38.9601, 59.5563],
        "context": "Anav bulunduğu bölge"
      }
    ],
    "questions": [
      {
        "q": "Anav hangi coğrafyada?",
        "options": ["A", "B", "C"],
        "answer": 1,
        "explanations": ["...", "Doğru!", "..."]
      }
    ]
  }
}
```

### User Progress Örneği
```json
{
  "userId": "user_123",
  "xp": 250,
  "badges": ["Coğrafya Dedektifi"],
  "completedSubtopics": ["sub_1_1_1"],
  "currentSubtopic": "sub_1_1_2",
  "failedQuestions": [{ "qId": "q_1_1_1_3", "attempts": 1 }]
}
```

---

## 🌐 Google Sheets Entegrasyonu (İleri)

### Setup
1. Google Sheets oluştur
2. Google Apps Script yazıp deploy et
3. `config.js`'e URL'i ekle

### Veri Akışı
```
Kullanıcı Cevap Verir
  ↓
localStorage'a kaydedilir
  ↓
Background sync (Service Worker)
  ↓
Google Sheets'e POST
  ↓
Liderlik tablosu güncellenir
```

---

## 📱 PWA Yükleme

### Chrome/Edge
1. Siteyi aç
2. Sağ üst köşe menü → "Yükle"
3. Başlat menüsüne eklenir

### Safari (iOS)
1. Siteyi aç
2. Paylaş → Ana Ekrana Ekle
3. Homescreen'de app gibi açılır

---

## 🐛 Troubleshooting

### "API Key error"
→ `config.js`'de CLAUDE_API_KEY boş mı? Ekle.

### "Cache error"
→ DevTools → Application → Clear Storage → Yenile

### "Maps not loading"
→ Nominatim overburdened. 5sn sonra tekrar dene.

### "Offline mode"
→ Service Worker sayesinde app offline çalışır (sadece cached content)

---

## 📚 KPSS Müfredatı

`data/curriculum.json` şu yapıya sahip:

```json
{
  "units": [
    {
      "unitId": "unit_1",
      "unitName": "İslamiyet Öncesi Türk Devletleri",
      "topics": [
        {
          "topicId": "topic_1_1",
          "topicName": "Anav Kültürü",
          "subtopics": [...]
        }
      ]
    }
  ]
}
```

---

## 🛠️ Geliştirme

### Yeni Feature Eklemek
1. İlgili modülü düzenle (js/modules/)
2. `app.js`'de entegre et
3. Test et
4. Commit & Push

### CSS Özelleştirme
- `css/styles.css`: Global
- `css/responsive.css`: Breakpoints
- `css/animations.css`: Keyframes

### Yeni Modül Oluşturmak
```javascript
// js/modules/myModule.js
class MyModule {
    constructor() {
        // Init
    }
    
    method() {
        // Logic
    }
}
```

---

## 📄 Lisans

MIT License - Özgürce kullan ve modifiye et.

---

## 🤝 Katkılar

Sorular, öneriler, bug reports için GitHub Issues'i kullan.

---

## 📞 İletişim

- **Author**: [Senin adın]
- **GitHub**: [GitHub profilin]
- **Email**: [E-mail]

---

**Made with ❤️ for KPSS Candidates**

🚀 Başarılar dilerim! Good luck with your exam!
