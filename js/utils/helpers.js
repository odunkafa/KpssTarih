// ==========================================
// JS/UTILS/HELPERS.JS
// Utility Functions
// ==========================================

const Helpers = {
    // ========== ID GENERATION ==========
    generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    getOrCreateUserId() {
        let userId = localStorage.getItem('kpss_user_id');
        if (!userId) {
            userId = this.generateId('user');
            localStorage.setItem('kpss_user_id', userId);
        }
        return userId;
    },

    // ========== STORAGE HELPERS ==========
    saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            Logger.error('Storage save failed', e);
            return false;
        }
    },

    loadFromStorage(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            Logger.error('Storage load failed', e);
            return defaultValue;
        }
    },

    removeFromStorage(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            return false;
        }
    },

    // ========== ARRAY HELPERS ==========
    shuffleArray(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    },

    moveToEnd(array, index) {
        const arr = [...array];
        const item = arr.splice(index, 1)[0];
        arr.push(item);
        return arr;
    },

    randomItem(array) {
        return array[Math.floor(Math.random() * array.length)];
    },

    // ========== STRING HELPERS ==========
    truncate(text, maxLength = 100) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },

    capitalize(text) {
        return text.charAt(0).toUpperCase() + text.slice(1);
    },

    slugify(text) {
        return text
            .toLowerCase()
            .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
            .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
    },

    // ========== EXTRACT BRACKETED WORDS ==========
    // "Anav [kültür merkezi] dir" -> kelimeleri parse et
    extractInteractiveWords(text) {
        const regex = /\[([^\]]+)\]/g;
        const matches = [];
        let match;
        while ((match = regex.exec(text)) !== null) {
            matches.push(match[1]);
        }
        return matches;
    },

    renderInteractiveText(text, interactiveWords = [], geoReferences = []) {
        let html = text;
        
        // Geo references önce işaretlenir (yer isimleri)
        geoReferences.forEach(geo => {
            const regex = new RegExp(`\\[${this.escapeRegex(geo.place)}\\]`, 'g');
            html = html.replace(regex, 
                `<span class="geo-reference" data-place="${this.escapeHtml(geo.place)}" data-lat="${geo.coords ? geo.coords[0] : ''}" data-lng="${geo.coords ? geo.coords[1] : ''}">
                    <span class="geo-icon">📍</span>${geo.place}
                </span>`
            );
        });

        // Sonra normal interactive words
        html = html.replace(/\[([^\]]+)\]/g, (match, word) => {
            return `<span class="interactive-word" data-word="${this.escapeHtml(word)}">${word}</span>`;
        });

        return html;
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    escapeRegex(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    },

    // ========== DATE/TIME HELPERS ==========
    formatDate(date = new Date()) {
        return new Intl.DateTimeFormat('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(date);
    },

    timeAgo(date) {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        if (seconds < 60) return 'şimdi';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} dk önce`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} sa önce`;
        const days = Math.floor(hours / 24);
        return `${days} gün önce`;
    },

    getWeekNumber(date = new Date()) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
        const week1 = new Date(d.getFullYear(), 0, 4);
        return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    },

    // ========== VALIDATION HELPERS ==========
    isValidCoordinate(lat, lng) {
        return CONSTANTS.PATTERNS.LATITUDE.test(lat) && 
               CONSTANTS.PATTERNS.LONGITUDE.test(lng);
    },

    isEmpty(value) {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string') return value.trim() === '';
        if (Array.isArray(value)) return value.length === 0;
        if (typeof value === 'object') return Object.keys(value).length === 0;
        return false;
    },

    // ========== DOM HELPERS ==========
    createElement(tag, attrs = {}, children = []) {
        const el = document.createElement(tag);
        Object.entries(attrs).forEach(([key, value]) => {
            if (key === 'className') {
                el.className = value;
            } else if (key.startsWith('on') && typeof value === 'function') {
                el.addEventListener(key.substring(2).toLowerCase(), value);
            } else {
                el.setAttribute(key, value);
            }
        });
        children.forEach(child => {
            if (typeof child === 'string') {
                el.appendChild(document.createTextNode(child));
            } else if (child instanceof Node) {
                el.appendChild(child);
            }
        });
        return el;
    },

    qs(selector, parent = document) {
        return parent.querySelector(selector);
    },

    qsa(selector, parent = document) {
        return Array.from(parent.querySelectorAll(selector));
    },

    // ========== ANIMATION HELPERS ==========
    addAnimationClass(element, animationClass, duration = 1000) {
        element.classList.add(animationClass);
        setTimeout(() => {
            element.classList.remove(animationClass);
        }, duration);
    },

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    // ========== DEBOUNCE / THROTTLE ==========
    debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    },

    throttle(func, limit = 300) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // ========== NUMBER FORMATTING ==========
    formatNumber(num) {
        return new Intl.NumberFormat('tr-TR').format(num);
    },

    formatXP(xp) {
        if (xp >= 1000) {
            return `${(xp / 1000).toFixed(1)}k`;
        }
        return xp.toString();
    },

    // ========== COLOR HELPERS ==========
    hexToRgba(hex, alpha = 1) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
};

// ==========================================
// LOGGER - Console logging wrapper
// ==========================================
const Logger = {
    debug(...args) {
        if (CONFIG.DEBUG) console.log('🔍 [DEBUG]', ...args);
    },
    info(...args) {
        if (CONFIG.DEBUG) console.log('ℹ️ [INFO]', ...args);
    },
    warn(...args) {
        console.warn('⚠️ [WARN]', ...args);
    },
    error(...args) {
        console.error('❌ [ERROR]', ...args);
    },
    success(...args) {
        if (CONFIG.DEBUG) console.log('✅ [SUCCESS]', ...args);
    }
};

// Export for Node.js compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Helpers, Logger };
}
