// ==========================================
// CONFIG.JS - Global Configuration
// ==========================================
// CLAUDE API KEY: Buraya sana vereceğin key'i yapıştıracaksın
// ==========================================

const CONFIG = {
    // ============ API KEYS ============
    CLAUDE_API_KEY: '', // Kullanılmıyor (Gemini kullanıyoruz)
    GOOGLE_SHEETS_ID: '', // Otomatik oluşturulacak
    GOOGLE_APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyblvsUJc7mCn2daEOmTGgITmMnj0kxZ2lGDqduDRATQN-kQiJo4gWT2rFLnq0ljDGy/exec',
    
    // ============ APP SETTINGS ============
    APP_NAME: 'KPSS Tarih Öğrenme',
    APP_VERSION: '1.0.0',
    CACHE_VERSION: 'v1',
    
    // ============ GAMEPLAY SETTINGS ============
    XP_PER_QUESTION: 15,
    XP_PER_COMPLETED_SUBTOPIC: 100,
    XP_PER_COMPLETED_PART: 20,
    QUESTIONS_PER_SUBTOPIC: 10,
    WRONG_ANSWER_RETRY_POSITION: 'end', // 'end' = listenin sonuna ekle

    // ============ 5 ÖĞRENME MODU (Parça Patikası) ============
    LEARNING_PARTS: [
        { key: 'lesson',    icon: '💡', label: 'Bilgi + Kontrol Sorusu' },
        { key: 'quickTest', icon: '⚡', label: 'Hızlı Test' },
        { key: 'match',     icon: '🔗', label: 'Eşleştirme' },
        { key: 'fullTest',  icon: '🎯', label: 'KPSS Testi' },
        { key: 'flash',     icon: '🃏', label: 'Bilgi Kartları' }
    ],
    
    // ============ LEVELS & BADGES ============
    LEVELS: [
        { name: 'Tohum', minXP: 0, color: '#8b7355' },
        { name: 'Filiz', minXP: 100, color: '#90ee90' },
        { name: 'Ağaç', minXP: 300, color: '#228b22' },
        { name: 'Orman', minXP: 700, color: '#006400' },
        { name: 'Efsane', minXP: 1500, color: '#ffd700' }
    ],
    
    BADGES: [
        { id: 'first_subtopic', name: 'İlk Mühür', icon: '🔰', xp: 100 },
        { id: 'history_master', name: 'Tarih Ustası', icon: '📚', xp: 500 },
        { id: 'speedrunner', name: 'Hızlı Öğrenci', icon: '⚡', xp: 300 },
        { id: 'perfect_week', name: 'Mükemmel Hafta', icon: '🔥', xp: 400 },
        { id: 'matcher', name: 'Eşleştirme Ustası', icon: '🔗', xp: 250 }
    ],
    
    // ============ STORAGE ============
    LOCAL_STORAGE_KEYS: {
        USER_PROGRESS: 'kpss_user_progress',
        CONTENT_POOL: 'kpss_content_pool',
        SETTINGS: 'kpss_settings'
    },
    
    // ============ UI COLORS (Duolingo-esque) ============
    COLORS: {
        primary: '#1a1a2e',      // Dark navy
        secondary: '#16213e',    // Darker blue
        accent: '#00d4ff',       // Bright cyan
        success: '#00ff41',      // Neon green
        warning: '#ffaa00',      // Gold
        danger: '#ff006e',       // Magenta
        background: '#0f3460',   // Deep blue
        cardBg: '#16213e',
        text: '#ffffff',
        textDim: '#b0b0b0'
    },
    
    // ============ API ENDPOINTS ============
    APIS: {
        CLAUDE: 'https://api.anthropic.com/v1/messages',
        NOMINATIM: 'https://nominatim.openstreetmap.org/search',
        NOMINATIM_REVERSE: 'https://nominatim.openstreetmap.org/reverse'
    },
    
    // ============ LEAFLET MAP ============
    MAP: {
        DEFAULT_CENTER: [39.0, 35.0], // Türkiye ortası
        DEFAULT_ZOOM: 5,
        TILE_LAYER: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        ATTRIBUTION: '&copy; OpenStreetMap contributors'
    },
    
    // ============ NOMINATIM (Geocoding) ============
    GEOCODING: {
        TIMEOUT: 5000,
        MAX_RESULTS: 5,
        LANGUAGE: 'tr'
    },
    
    // ============ CLAUDE PROMPT TEMPLATES ============
    PROMPTS: {
        // 5 öğrenme modunu tek seferde üreten ana prompt.
        // Şema, uiRenderer.js + gameEngine.js'in beklediği yapı ile birebir eşleşir.
        SUBTOPIC_CONTENT: `
Sen KPSS Tarih sınavına hazırlanan öğrenciler için, Duolingo tarzı "lokma lokma" bir öğrenme deneyimi tasarlayan bir içerik editörüsün. İçerik MEB/KPSS resmi müfredatına sadık, sınav formatına uygun ve gerçek bilgi içermeli (uydurma tarih/isim YASAK).

Aşağıdaki formatta SADECE JSON döndür (başka hiçbir açıklama, markdown işareti veya metin ekleme):

{
  "lessonCards": [
    {
      "eyebrow": "Kısa kategori etiketi (ör: 'İlk Türk Devleti')",
      "title": "Kart başlığı (kısa, çarpıcı)",
      "text": "3-5 cümlelik öğretici metin. En kritik kavramları <span class=\\"hl\\">böyle</span> vurgula.",
      "tip": "KPSS'de bu konunun nasıl sorulduğuna dair somut bir ipucu (1-2 cümle)",
      "quiz": {
        "q": "Bu lokmadaki bilgiyi pekiştiren kısa kontrol sorusu",
        "opts": ["Seçenek A", "Seçenek B", "Seçenek C"],
        "correct": 1,
        "optExplain": ["A neden yanlış/eksik", "B neden doğru", "C neden yanlış/eksik"]
      }
    }
  ],
  "quickTest": [
    {
      "q": "3 şıklı hızlı test sorusu",
      "opts": ["Seçenek A", "Seçenek B", "Seçenek C"],
      "correct": 0,
      "optExplain": ["A açıklaması", "B açıklaması", "C açıklaması"]
    }
  ],
  "matchPairs": [
    { "term": "Kavram/isim", "def": "Kısa tanımı veya ilişkili olduğu olgu" }
  ],
  "fullTest": [
    {
      "q": "5 şıklı, gerçek KPSS formatına yakın soru",
      "opts": ["A", "B", "C", "D", "E"],
      "correct": 2,
      "explain": "Doğru cevabın kısa açıklaması"
    }
  ],
  "flashcards": [
    { "front": "Kavram/isim/tarih", "back": "Kısa, net açıklama" }
  ]
}

Kurallar:
- lessonCards: 4-6 adet, her biri TEK bir alt-kavramı anlatsın (lokma lokma ilerleme mantığı).
- quickTest: tam 10 adet, 3 şıklı.
- matchPairs: 4-6 adet, terim-tanım eşleşmesi net ve tek doğru olmalı.
- fullTest: tam 10 adet, 5 şıklı, gerçek KPSS sınav diline yakın (sadece "explain" yeterli, optExplain gerekmez).
- flashcards: lessonCards ile aynı sayıda veya yakın, en önemli kavram/tarih/isimleri içersin.
- Tüm sorularda yanlış şıklar mantıklı çeldiriciler olmalı (rastgele saçma seçenek değil).
- Türkçe, sınav diline uygun, resmi ama sıkıcı olmayan bir üslup kullan.

Ünite: {unit}
Konu: {topic}
Alt Konu: {subtopic}
KPSS Müfredatı: {curriculum}
        `,
        
        WORD_EXPLANATION: `
KPSS Tarih bağlamında, bu kelime/kelime grubunun kısa açıklamasını yap (1-2 cümle):

Kelime: {word}
Bağlam: {context}

SADECE açıklamayı yaz, başka şey yazma.
        `
    },
    
    // ============ TESTING ============
    DEBUG: true,
    LOG_LEVEL: 'info' // 'debug', 'info', 'warn', 'error'
};

// Export (Node.js compatibility için - opsiyonel)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
