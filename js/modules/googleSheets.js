// ==========================================
// JS/MODULES/GOOGLESHEETS.JS
// Google Sheets Sync (via Apps Script)
// ==========================================

class GoogleSheetsSync {
    constructor(appsScriptUrl) {
        this.appsScriptUrl = appsScriptUrl || CONFIG.GOOGLE_APPS_SCRIPT_URL;
        this.syncQueue = [];
        this.isSyncing = false;
    }

    isConfigured() {
        return this.appsScriptUrl && this.appsScriptUrl.length > 0;
    }

    async saveUserProgress(userData) {
        if (!this.isConfigured()) {
            Logger.debug('Google Sheets not configured, skipping sync');
            return null;
        }

        try {
            const response = await fetch(this.appsScriptUrl, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'saveProgress',
                    userId: userData.userId,
                    displayName: userData.displayName || 'Anonim',
                    xp: userData.xp,
                    level: userData.level,
                    badges: userData.badges,
                    completedSubtopics: userData.completedSubtopics.length,
                    streak: userData.streak,
                    accuracy: this.calculateAccuracy(userData),
                    timestamp: new Date().toISOString()
                })
            });

            if (!response.ok) {
                throw new Error('Sheets sync failed: ' + response.status);
            }

            return await response.json();
        } catch (error) {
            Logger.warn('Google Sheets sync failed, queuing for retry', error);
            this.queueForRetry(userData);
            return null;
        }
    }

    calculateAccuracy(userData) {
        if (userData.totalQuestionsAnswered === 0) return 0;
        return Math.round((userData.totalCorrectAnswers / userData.totalQuestionsAnswered) * 100);
    }

    queueForRetry(userData) {
        this.syncQueue.push({
            data: userData,
            timestamp: Date.now()
        });

        if (this.syncQueue.length > 10) {
            this.syncQueue.shift();
        }
    }

    async processSyncQueue() {
        if (this.isSyncing || this.syncQueue.length === 0) return;

        this.isSyncing = true;

        while (this.syncQueue.length > 0) {
            var item = this.syncQueue.shift();
            try {
                await this.saveUserProgress(item.data);
            } catch (error) {
                Logger.warn('Retry sync failed', error);
                break;
            }
        }

        this.isSyncing = false;
    }

    async getLeaderboard(limit) {
        limit = limit || 10;

        if (!this.isConfigured()) {
            return this.getMockLeaderboard();
        }

        try {
            const response = await fetch(this.appsScriptUrl + '?action=getLeaderboard&limit=' + limit);

            if (!response.ok) {
                throw new Error('Leaderboard fetch failed: ' + response.status);
            }

            const data = await response.json();
            return data.leaderboard || [];
        } catch (error) {
            Logger.error('Leaderboard fetch failed', error);
            return this.getMockLeaderboard();
        }
    }

    getMockLeaderboard() {
        var userProgress = window.userProgressInstance;
        if (!userProgress) return [];

        return [
            {
                userId: userProgress.data.userId,
                displayName: userProgress.data.displayName || 'Sen',
                xp: userProgress.data.xp,
                level: userProgress.data.level,
                rank: 1
            }
        ];
    }

    async backupContentPool(contentPoolData) {
        if (!this.isConfigured()) return null;

        try {
            const response = await fetch(this.appsScriptUrl, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'backupContent',
                    content: JSON.stringify(contentPoolData),
                    timestamp: new Date().toISOString()
                })
            });

            return await response.json();
        } catch (error) {
            Logger.warn('Content backup failed', error);
            return null;
        }
    }

    async restoreContentPool() {
        if (!this.isConfigured()) return null;

        try {
            const response = await fetch(this.appsScriptUrl + '?action=getContentBackup');
            const data = await response.json();

            if (data.content) {
                return JSON.parse(data.content);
            }
            return null;
        } catch (error) {
            Logger.warn('Content restore failed', error);
            return null;
        }
    }
}

window.googleSheetsInstance = null;
