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
    XP_PER_QUESTION: 50,
    XP_PER_COMPLETED_SUBTOPIC: 150,
    QUESTIONS_PER_SUBTOPIC: 10,
    WRONG_ANSWER_RETRY_POSITION: 'end', // 'end' = listenin sonuna ekle
    
    // ============ LEVELS & BADGES ============
    LEVELS: [
        { name: 'Tohum', minXP: 0, color: '#8b7355' },
        { name: 'Filiz', minXP: 100, color: '#90ee90' },
        { name: 'Ağaç', minXP: 300, color: '#228b22' },
        { name: 'Orman', minXP: 700, color: '#006400' },
        { name: 'Efsane', minXP: 1500, color: '#ffd700' }
    ],
    
    BADGES: [
        { id: 'geo_detective', name: 'Coğrafya Dedektifi', icon: '🗺️', xp: 200 },
        { id: 'history_master', name: 'Tarih Ustası', icon: '📚', xp: 500 },
        { id: 'speedrunner', name: 'Hızlı Öğrenci', icon: '⚡', xp: 300 },
        { id: 'perfect_week', name: 'Mükemmel Hafta', icon: '🔥', xp: 400 },
        { id: 'map_explorer', name: 'Harita Kaşifi', icon: '🧭', xp: 250 }
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
        SUBTOPIC_CONTENT: `
Siz KPSS Tarih sınavına hazırlanan öğrenciler için içerik oluşturuyorsunuz.

Aşağıdaki formatta SADECE JSON döndürün (başka bir şey yazmayın):

{
  "mainText": "20-30 satırlık ana metin. Kelimeleri [brackets] içine al (seçilebilir)",
  "geoInfo": "Coğrafya köprüsü: Bu konunun coğrafyası neden önemli? 5-10 cümle",
  "geoReferences": [
    { "place": "Yer adı", "context": "Bu yerin konuyla ilişkisi" },
    { "place": "Başka Yer", "context": "Açıklama" }
  ],
  "interactiveWords": [
    { "word": "kelime veya kelime grubu", "explanation": "Kısa açıklama (1-2 cümle)" }
  ],
  "questions": [
    {
      "q": "Soru metni (kısa, net, KPSS tarzı)",
      "options": [
        { "text": "Seçenek 1", "correct": false },
        { "text": "Doğru Cevap", "correct": true },
        { "text": "Seçenek 3", "correct": false }
      ],
      "explanations": [
        "Seçenek 1 neden yanlış: açıklama",
        "Doğru cevap açıklaması",
        "Seçenek 3 neden yanlış: açıklama"
      ]
    }
  ]
}

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
