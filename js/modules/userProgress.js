// ==========================================
// JS/MODULES/USERPROGRESS.JS
// User Progress & State Management
// ==========================================

class UserProgress {
    constructor() {
        this.data = this.load();
        this.googleSheets = null; // app.js'de set edilecek
    }

    setGoogleSheetsSync(syncInstance) {
        this.googleSheets = syncInstance;
    }

    load() {
        const defaultData = {
            userId: Helpers.getOrCreateUserId(),
            displayName: '',
            xp: 0,
            level: 'Tohum',
            badges: [],
            completedSubtopics: [],
            completedTopics: [],
            completedParts: [], // 'subtopicId-partKey' formatında, ör: 'sub_1_1_1-lesson'
            currentUnitId: null,
            currentTopicId: null,
            currentSubtopicId: null,
            failedQuestions: [],
            reviewQueue: [], // Gözden geçir için
            weeklyStats: {},
            totalQuestionsAnswered: 0,
            totalCorrectAnswers: 0,
            streak: 0,
            lastActiveDate: null,
            createdAt: new Date().toISOString()
        };

        const saved = Helpers.loadFromStorage(CONFIG.LOCAL_STORAGE_KEYS.USER_PROGRESS, {});
        return { ...defaultData, ...saved };
    }

    save() {
        Helpers.saveToStorage(CONFIG.LOCAL_STORAGE_KEYS.USER_PROGRESS, this.data);
        this.updateStreak();
        this.syncToCloud();
    }

    async syncToCloud() {
        if (this.googleSheets) {
            try {
                await this.googleSheets.saveUserProgress(this.data);
            } catch (error) {
                Logger.warn('Cloud sync failed, will retry later', error);
            }
        }
    }

    // ========== XP & LEVEL ==========
    addXP(amount) {
        this.data.xp += amount;
        this.checkLevelUp();
        this.save();
        
        EventBus.emit(CONSTANTS.EVENTS.XP_GAINED, { amount, total: this.data.xp });
        
        return this.data.xp;
    }

    checkLevelUp() {
        const levels = CONFIG.LEVELS;
        let newLevel = levels[0].name;
        
        for (const level of levels) {
            if (this.data.xp >= level.minXP) {
                newLevel = level.name;
            }
        }
        
        if (newLevel !== this.data.level) {
            const oldLevel = this.data.level;
            this.data.level = newLevel;
            EventBus.emit(CONSTANTS.EVENTS.LEVEL_UP, { oldLevel, newLevel });
            return true;
        }
        return false;
    }

    getCurrentLevelInfo() {
        return CONFIG.LEVELS.find(l => l.name === this.data.level) || CONFIG.LEVELS[0];
    }

    getNextLevelInfo() {
        const currentIndex = CONFIG.LEVELS.findIndex(l => l.name === this.data.level);
        return CONFIG.LEVELS[currentIndex + 1] || null;
    }

    getXPProgress() {
        const current = this.getCurrentLevelInfo();
        const next = this.getNextLevelInfo();
        
        if (!next) return 100; // Max level
        
        const range = next.minXP - current.minXP;
        const progress = this.data.xp - current.minXP;
        return Math.min(100, Math.round((progress / range) * 100));
    }

    // ========== BADGES ==========
    unlockBadge(badgeId) {
        if (this.data.badges.includes(badgeId)) {
            return false; // Already unlocked
        }

        const badge = CONFIG.BADGES.find(b => b.id === badgeId);
        if (!badge) {
            Logger.warn(`Badge not found: ${badgeId}`);
            return false;
        }

        this.data.badges.push(badgeId);
        this.addXP(badge.xp);
        this.save();

        EventBus.emit(CONSTANTS.EVENTS.BADGE_UNLOCKED, badge);
        return true;
    }

    hasBadge(badgeId) {
        return this.data.badges.includes(badgeId);
    }

    getUnlockedBadges() {
        return CONFIG.BADGES.filter(b => this.hasBadge(b.id));
    }

    getLockedBadges() {
        return CONFIG.BADGES.filter(b => !this.hasBadge(b.id));
    }

    // ========== ANSWER TRACKING ==========
    recordAnswer(questionId, isCorrect, subtopicId) {
        this.data.totalQuestionsAnswered++;
        
        if (isCorrect) {
            this.data.totalCorrectAnswers++;
            this.addXP(CONFIG.XP_PER_QUESTION);
            EventBus.emit(CONSTANTS.EVENTS.QUESTION_CORRECT, { questionId, subtopicId });
        } else {
            this.addToReviewQueue(questionId, subtopicId);
            EventBus.emit(CONSTANTS.EVENTS.QUESTION_WRONG, { questionId, subtopicId });
        }

        this.save();
    }

    addToReviewQueue(questionId, subtopicId) {
        const existing = this.data.failedQuestions.find(f => f.qId === questionId);
        
        if (existing) {
            existing.attempts++;
            existing.lastAttempt = new Date().toISOString();
        } else {
            this.data.failedQuestions.push({
                qId: questionId,
                subtopicId,
                attempts: 1,
                lastAttempt: new Date().toISOString()
            });
        }
    }

    removeFromReviewQueue(questionId) {
        this.data.failedQuestions = this.data.failedQuestions.filter(f => f.qId !== questionId);
        this.save();
    }

    getReviewQueue() {
        return this.data.failedQuestions;
    }

    getAccuracy() {
        if (this.data.totalQuestionsAnswered === 0) return 0;
        return Math.round((this.data.totalCorrectAnswers / this.data.totalQuestionsAnswered) * 100);
    }

    // ========== PART PROGRESS (5 Öğrenme Modu) ==========
    partKey(subtopicId, partKey) {
        return subtopicId + '-' + partKey;
    }

    isPartCompleted(subtopicId, partKey) {
        return this.data.completedParts.includes(this.partKey(subtopicId, partKey));
    }

    completePart(subtopicId, partKey) {
        const key = this.partKey(subtopicId, partKey);
        if (this.data.completedParts.includes(key)) {
            return; // zaten tamamlanmış, tekrar XP verme
        }
        this.data.completedParts.push(key);
        this.addXP(CONFIG.XP_PER_COMPLETED_PART);
        this.save();
    }

    getCompletedPartsCount(subtopicId) {
        const prefix = subtopicId + '-';
        return this.data.completedParts.filter(k => k.startsWith(prefix)).length;
    }

    // ========== SUBTOPIC PROGRESS ==========
    completeSubtopic(subtopicId, unitId, topicId) {
        if (this.data.completedSubtopics.includes(subtopicId)) {
            return; // Already completed
        }

        this.data.completedSubtopics.push(subtopicId);
        this.addXP(CONFIG.XP_PER_COMPLETED_SUBTOPIC);
        
        EventBus.emit(CONSTANTS.EVENTS.SUBTOPIC_COMPLETED, { subtopicId, unitId, topicId });
        
        this.save();
    }

    isSubtopicCompleted(subtopicId) {
        return this.data.completedSubtopics.includes(subtopicId);
    }

    completeTopic(topicId) {
        if (!this.data.completedTopics.includes(topicId)) {
            this.data.completedTopics.push(topicId);
            this.save();
        }
    }

    isTopicCompleted(topicId) {
        return this.data.completedTopics.includes(topicId);
    }

    // ========== CURRENT POSITION ==========
    setCurrentPosition(unitId, topicId, subtopicId) {
        this.data.currentUnitId = unitId;
        this.data.currentTopicId = topicId;
        this.data.currentSubtopicId = subtopicId;
        this.save();
    }

    getCurrentPosition() {
        return {
            unitId: this.data.currentUnitId,
            topicId: this.data.currentTopicId,
            subtopicId: this.data.currentSubtopicId
        };
    }

    hasStarted() {
        return this.data.currentSubtopicId !== null;
    }

    // ========== UNLOCKING LOGIC ==========
    isSubtopicUnlocked(subtopicId, allSubtopicsInOrder) {
        const index = allSubtopicsInOrder.findIndex(s => s.subtopicId === subtopicId);
        
        if (index === 0) return true; // İlk konu her zaman açık
        
        const previousSubtopic = allSubtopicsInOrder[index - 1];
        return this.isSubtopicCompleted(previousSubtopic.subtopicId);
    }

    isTopicUnlocked(topicId, allTopicsInOrder) {
        const index = allTopicsInOrder.findIndex(t => t.topicId === topicId);
        
        if (index === 0) return true;
        
        const previousTopic = allTopicsInOrder[index - 1];
        return this.isTopicCompleted(previousTopic.topicId);
    }

    // ========== STREAK TRACKING ==========
    updateStreak() {
        const today = new Date().toDateString();
        const lastActive = this.data.lastActiveDate ? new Date(this.data.lastActiveDate).toDateString() : null;

        if (lastActive === today) {
            return; // Already counted today
        }

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (lastActive === yesterday.toDateString()) {
            this.data.streak++;
        } else if (lastActive !== today) {
            this.data.streak = 1; // Reset streak
        }

        this.data.lastActiveDate = new Date().toISOString();
    }

    getStreak() {
        return this.data.streak;
    }

    // ========== WEEKLY STATS ==========
    recordWeeklyActivity() {
        const week = Helpers.getWeekNumber();
        const year = new Date().getFullYear();
        const key = `${year}_W${week}`;

        if (!this.data.weeklyStats[key]) {
            this.data.weeklyStats[key] = {
                questionsAnswered: 0,
                correctAnswers: 0,
                xpEarned: 0,
                subtopicsCompleted: 0
            };
        }

        return this.data.weeklyStats[key];
    }

    getWeeklyStats(weeksBack = 4) {
        const stats = [];
        const now = new Date();
        
        for (let i = 0; i < weeksBack; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() - (i * 7));
            const week = Helpers.getWeekNumber(date);
            const year = date.getFullYear();
            const key = `${year}_W${week}`;
            
            stats.unshift({
                week: key,
                ...(this.data.weeklyStats[key] || {
                    questionsAnswered: 0,
                    correctAnswers: 0,
                    xpEarned: 0,
                    subtopicsCompleted: 0
                })
            });
        }
        
        return stats;
    }

    // ========== RESET (Debug/Testing) ==========
    reset() {
        if (confirm('Tüm ilerleme silinecek. Onaylıyor musunuz?')) {
            Helpers.removeFromStorage(CONFIG.LOCAL_STORAGE_KEYS.USER_PROGRESS);
            this.data = this.load();
            location.reload();
        }
    }

    exportData() {
        return JSON.stringify(this.data, null, 2);
    }
}

// ==========================================
// EVENT BUS - Simple pub/sub system
// ==========================================
const EventBus = {
    listeners: {},

    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    },

    off(event, callback) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    },

    emit(event, data) {
        if (!this.listeners[event]) return;
        this.listeners[event].forEach(callback => callback(data));
    }
};

// Global instance
window.userProgressInstance = null;
