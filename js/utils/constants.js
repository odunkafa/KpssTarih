// ==========================================
// JS/UTILS/CONSTANTS.JS
// Global Constants & Enums
// ==========================================

const CONSTANTS = {
    // ========== APP STATES ==========
    STATES: {
        LOADING: 'loading',
        HOME: 'home',
        UNIT_SELECT: 'unit_select',
        INFO_CARD: 'info_card',
        QUESTION: 'question',
        RESULT: 'result',
        COMPLETION: 'completion',
        LEADERBOARD: 'leaderboard',
        SETTINGS: 'settings',
        ERROR: 'error'
    },
    
    // ========== EVENTS ==========
    EVENTS: {
        ANSWER_SUBMITTED: 'answer_submitted',
        QUESTION_CORRECT: 'question_correct',
        QUESTION_WRONG: 'question_wrong',
        SUBTOPIC_COMPLETED: 'subtopic_completed',
        BADGE_UNLOCKED: 'badge_unlocked',
        LEVEL_UP: 'level_up',
        XP_GAINED: 'xp_gained',
        CONTENT_LOADED: 'content_loaded',
        ERROR_OCCURRED: 'error_occurred'
    },
    
    // ========== ERROR CODES ==========
    ERRORS: {
        API_KEY_MISSING: 'API_KEY_MISSING',
        NETWORK_ERROR: 'NETWORK_ERROR',
        PARSING_ERROR: 'PARSING_ERROR',
        STORAGE_ERROR: 'STORAGE_ERROR',
        CONTENT_NOT_FOUND: 'CONTENT_NOT_FOUND',
        INVALID_CONFIG: 'INVALID_CONFIG'
    },
    
    // ========== LOG LEVELS ==========
    LOG_LEVELS: {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3
    },
    
    // ========== NAVIGATION TABS ==========
    NAV_TABS: {
        LEARN: 'learn',
        LEADERBOARD: 'leaderboard',
        REVIEW: 'review',
        STATS: 'stats'
    },
    
    // ========== UI ANIMATIONS ==========
    ANIMATIONS: {
        FADE_IN: 'fade-in',
        FADE_OUT: 'fade-out',
        SLIDE_IN_UP: 'slide-in-up',
        SCALE_IN: 'scale-in',
        BOUNCE: 'bounce',
        PULSE: 'pulse',
        GLOW: 'glow'
    },
    
    // ========== DURATIONS (ms) ==========
    DURATIONS: {
        SHORT: 300,
        MEDIUM: 500,
        LONG: 1000,
        EXTRA_LONG: 2000
    },
    
    // ========== TOAST TYPES ==========
    TOAST_TYPES: {
        SUCCESS: 'success',
        ERROR: 'error',
        INFO: 'info',
        WARNING: 'warning'
    },
    
    // ========== BADGE RARITY ==========
    BADGE_RARITY: {
        COMMON: 'common',
        UNCOMMON: 'uncommon',
        RARE: 'rare',
        LEGENDARY: 'legendary'
    },
    
    // ========== DIFFICULTY LEVELS ==========
    DIFFICULTY: {
        EASY: 'easy',
        MEDIUM: 'medium',
        HARD: 'hard',
        EXPERT: 'expert'
    },
    
    // ========== API REQUEST METHODS ==========
    HTTP_METHODS: {
        GET: 'GET',
        POST: 'POST',
        PUT: 'PUT',
        DELETE: 'DELETE'
    },
    
    // ========== CACHE EXPIRY (ms) ==========
    CACHE_EXPIRY: {
        SHORT: 5 * 60 * 1000,           // 5 min
        MEDIUM: 30 * 60 * 1000,         // 30 min
        LONG: 24 * 60 * 60 * 1000,      // 24 hours
        PERMANENT: null                 // Never expires
    },
    
    // ========== REGEX PATTERNS ==========
    PATTERNS: {
        EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        URL: /^https?:\/\/.+/,
        LATITUDE: /^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?)$/,
        LONGITUDE: /^[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/,
        WORD: /\b\w+\b/g,
        PLACE_NAME: /[A-Z][a-zşğıöüç\s]+/g
    },
    
    // ========== SORTING OPTIONS ==========
    SORT_OPTIONS: {
        DATE_ASC: 'date_asc',
        DATE_DESC: 'date_desc',
        NAME_ASC: 'name_asc',
        NAME_DESC: 'name_desc',
        XP_HIGH: 'xp_high',
        XP_LOW: 'xp_low'
    },
    
    // ========== FILTER OPTIONS ==========
    FILTER_OPTIONS: {
        COMPLETED: 'completed',
        IN_PROGRESS: 'in_progress',
        LOCKED: 'locked',
        FAILED: 'failed',
        ALL: 'all'
    },
    
    // ========== TIME UNITS ==========
    TIME_UNITS: {
        MILLISECONDS: 'ms',
        SECONDS: 's',
        MINUTES: 'min',
        HOURS: 'h',
        DAYS: 'd',
        WEEKS: 'w',
        MONTHS: 'mo',
        YEARS: 'y'
    },
    
    // ========== KEYBOARD KEYS ==========
    KEYS: {
        ENTER: 'Enter',
        ESCAPE: 'Escape',
        SPACE: ' ',
        ARROW_UP: 'ArrowUp',
        ARROW_DOWN: 'ArrowDown',
        ARROW_LEFT: 'ArrowLeft',
        ARROW_RIGHT: 'ArrowRight',
        TAB: 'Tab'
    }
};

// Export for Node.js compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONSTANTS;
}
