// ==========================================
// JS/APP.JS
// Main Application Logic & Orchestration
// ==========================================

class App {
    constructor() {
        this.curriculumData = null;
        this.currentScreen = CONSTANTS.STATES.LOADING;
        this.navigationStack = [];
        
        // Şu anki navigasyon context'i
        this.currentUnit = null;
        this.currentTopic = null;
        this.currentSubtopic = null;
        this.currentContent = null;
    }

    async init() {
        Logger.info('App initializing...');

        try {
            // 1. Modülleri instantiate et
            this.initModules();

            // 2. Curriculum data'yı yükle
            await this.loadCurriculum();

            // 3. UI Renderer'a curriculum ver
            window.uiRendererInstance.setCurriculumData(this.curriculumData);

            // 4. Loading ekranını kapat
            this.hideLoadingScreen();

            // 5. Ana ekranı göster
            this.navigateHome();

            Logger.success('App initialized successfully');
        } catch (error) {
            Logger.error('App initialization failed', error);
            this.showFatalError(error.message);
        }
    }

    initModules() {
        // Sıra önemli: dependency injection
        window.userProgressInstance = new UserProgress();
        window.geoServicesInstance = new GeoServices();
        window.aiProviderInstance = new AIProvider();
        window.contentPoolInstance = new ContentPool();
        window.contentPoolInstance.setAIProvider(window.aiProviderInstance);
        window.gameEngineInstance = new GameEngine(window.userProgressInstance);
        window.googleSheetsInstance = new GoogleSheetsSync(CONFIG.GOOGLE_APPS_SCRIPT_URL);
        window.userProgressInstance.setGoogleSheetsSync(window.googleSheetsInstance);

        window.uiRendererInstance = new UIRenderer(
            window.userProgressInstance,
            window.gameEngineInstance,
            window.contentPoolInstance,
            window.geoServicesInstance
        );

        // Shortcuts
        this.userProgress = window.userProgressInstance;
        this.gameEngine = window.gameEngineInstance;
        this.contentPool = window.contentPoolInstance;
        this.ui = window.uiRendererInstance;
        this.geoServices = window.geoServicesInstance;
    }

    async loadCurriculum() {
        try {
            const response = await fetch('data/curriculum.json');
            if (!response.ok) {
                throw new Error(`Curriculum fetch failed: ${response.status}`);
            }
            this.curriculumData = await response.json();
            Logger.success('Curriculum loaded', { unitCount: this.curriculumData.units.length });
        } catch (error) {
            Logger.error('Failed to load curriculum', error);
            throw new Error('Müfredat verisi yüklenemedi. İnternet bağlantınızı kontrol edin.');
        }
    }

    hideLoadingScreen() {
        const loadingEl = document.getElementById('loading');
        const mainEl = document.getElementById('main-content');
        
        if (loadingEl) loadingEl.style.display = 'none';
        if (mainEl) mainEl.classList.remove('hidden');
    }

    showFatalError(message) {
        const loadingEl = document.getElementById('loading');
        if (loadingEl) {
            loadingEl.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                    <p style="color: #ff006e; margin-bottom: 16px;">${message}</p>
                    <button onclick="location.reload()" style="padding: 12px 24px; background: #00d4ff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        Yeniden Dene
                    </button>
                </div>
            `;
        }
    }

    // ========== NAVIGATION ==========
    navigateHome() {
        this.currentScreen = CONSTANTS.STATES.HOME;
        this.currentUnit = null;
        this.currentTopic = null;
        this.currentSubtopic = null;
        this.ui.renderHomeScreen();
    }

    navigateToUnit(unitId) {
        const unit = this.curriculumData.units.find(u => u.unitId === unitId);
        if (!unit) {
            Logger.error(`Unit not found: ${unitId}`);
            return;
        }

        this.currentScreen = CONSTANTS.STATES.UNIT_SELECT;
        this.currentUnit = unit;
        this.ui.renderUnitScreen(unit);
    }

    navigateToTopic(unitId, topicId) {
        const unit = this.curriculumData.units.find(u => u.unitId === unitId);
        const topic = unit?.topics.find(t => t.topicId === topicId);
        
        if (!unit || !topic) {
            Logger.error(`Topic not found: ${unitId}/${topicId}`);
            return;
        }

        this.currentUnit = unit;
        this.currentTopic = topic;
        this.ui.renderTopicScreen(unit, topic);
    }

    async navigateToSubtopic(unitId, topicId, subtopicId) {
        const unit = this.curriculumData.units.find(u => u.unitId === unitId);
        const topic = unit?.topics.find(t => t.topicId === topicId);
        const subtopic = topic?.subtopics.find(s => s.subtopicId === subtopicId);

        if (!unit || !topic || !subtopic) {
            Logger.error(`Subtopic not found: ${unitId}/${topicId}/${subtopicId}`);
            this.ui.showToast('Konu bulunamadı', 'error');
            return;
        }

        this.currentUnit = unit;
        this.currentTopic = topic;
        this.currentSubtopic = subtopic;

        // İlerleme kaydı
        this.userProgress.setCurrentPosition(unitId, topicId, subtopicId);

        // İçeriği yükle (cache veya AI generate)
        this.ui.renderLoadingState('İçerik hazırlanıyor...');

        try {
            const content = await this.contentPool.getSubtopicContent(
                unitId, topicId, subtopicId, this.curriculumData
            );

            this.currentContent = content;
            this.ui.renderInfoCard(content, unit, topic, subtopic);

        } catch (error) {
            Logger.error('Content loading failed', error);
            
            if (error.message === CONSTANTS.ERRORS.API_KEY_MISSING) {
                this.ui.renderError('AI servis anahtarı tanımlı değil. Lütfen config.js dosyasını kontrol edin.');
            } else {
                this.ui.renderError('İçerik yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
            }
        }
    }

    navigateToNextSubtopic(unitId, topicId, currentSubtopicId) {
        const unit = this.curriculumData.units.find(u => u.unitId === unitId);
        const topic = unit?.topics.find(t => t.topicId === topicId);
        
        if (!topic) {
            this.navigateHome();
            return;
        }

        const currentIndex = topic.subtopics.findIndex(s => s.subtopicId === currentSubtopicId);
        const nextSubtopic = topic.subtopics[currentIndex + 1];

        if (nextSubtopic) {
            this.navigateToSubtopic(unitId, topicId, nextSubtopic.subtopicId);
        } else {
            // Bu topic'teki tüm subtopic'ler tamamlandı
            this.gameEngine.checkMasteryBadge(topicId, topic.subtopics);
            this.navigateToTopic(unitId, topicId);
        }
    }

    navigateToTab(tabId) {
        switch (tabId) {
            case 'learn':
                this.navigateHome();
                break;
            case 'leaderboard':
                this.ui.renderLeaderboardScreen();
                break;
            case 'review':
                this.ui.renderReviewScreen();
                break;
            case 'stats':
                this.ui.renderStatsScreen();
                break;
            default:
                Logger.warn(`Unknown tab: ${tabId}`);
        }
    }

    // ========== QUESTION SESSION FLOW ==========
    startQuestionSession(content, unit, topic, subtopic) {
        const questions = Helpers.shuffleArray(content.questions);
        
        this.gameEngine.startSession(
            subtopic.subtopicId, 
            unit.unitId, 
            topic.topicId, 
            questions
        );

        this.showNextQuestion();
    }

    showNextQuestion() {
        const question = this.gameEngine.getCurrentQuestion();
        
        if (!question) {
            this.showSessionResults();
            return;
        }

        const progress = this.gameEngine.getProgress();
        this.ui.renderQuestionScreen(question, progress);
    }

    submitAnswer(selectedOptionIndex) {
        const result = this.gameEngine.submitAnswer(selectedOptionIndex);
        
        if (!result) {
            Logger.error('Answer submission failed');
            return;
        }

        this.ui.renderFeedback(result);
    }

    continueAfterFeedback() {
        if (this.gameEngine.isSessionComplete()) {
            this.showSessionResults();
        } else {
            this.showNextQuestion();
        }
    }

    showSessionResults() {
        const summary = this.gameEngine.getSessionSummary();
        
        this.ui.renderCompletionScreen(
            summary, 
            this.currentUnit, 
            this.currentTopic, 
            this.currentSubtopic
        );
    }

    // ========== EVENT LISTENERS (Global) ==========
    setupGlobalEventListeners() {
        EventBus.on(CONSTANTS.EVENTS.BADGE_UNLOCKED, (badge) => {
            this.ui.showBadgeUnlockModal(badge);
        });

        EventBus.on(CONSTANTS.EVENTS.LEVEL_UP, ({ oldLevel, newLevel }) => {
            this.ui.showToast(`🎉 Seviye Atladın: ${newLevel}!`, 'success');
        });

        // Keyboard shortcuts (opsiyonel UX iyileştirmesi)
        document.addEventListener('keydown', (e) => {
            if (e.key === CONSTANTS.KEYS.ESCAPE) {
                this.ui.closeActivePopup();
            }
        });

        // Online/offline durumu
        window.addEventListener('online', () => {
            this.ui.showToast('İnternet bağlantısı sağlandı', 'success');
            window.googleSheetsInstance.processSyncQueue();
        });

        window.addEventListener('offline', () => {
            this.ui.showToast('Çevrimdışı moddasınız', 'warning');
        });
    }
}

// ==========================================
// APP BOOTSTRAP
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    window.appInstance = new App();
    window.appInstance.setupGlobalEventListeners();
    window.appInstance.init();
});
