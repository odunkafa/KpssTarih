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

        // İçeriği yükle (cache veya AI generate) — 5 modun tamamını içeren paket
        this.ui.renderLoadingState('İçerik hazırlanıyor...');

        try {
            const content = await this.contentPool.getSubtopicContent(
                unitId, topicId, subtopicId, this.curriculumData
            );

            this.currentContent = content;
            this.ui.renderPartPath(content, unit, topic, subtopic);

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

    // ========== PARÇA PATİKASI ORKESTRASYONU (5 Öğrenme Modu) ==========
    startPart(partIndex, content, unit, topic, subtopic) {
        this.activePartIndex = partIndex;
        const partKey = CONFIG.LEARNING_PARTS[partIndex].key;

        if (partKey === 'lesson') this.startLessonPart(content);
        else if (partKey === 'quickTest') this.startQuickTestPart(content);
        else if (partKey === 'match') this.startMatchPart(content);
        else if (partKey === 'fullTest') this.startFullTestPart(content);
        else if (partKey === 'flash') this.startFlashPart(content);
    }

    exitPart() {
        this.ui.hideResultPanel();
        this.ui.renderPartPath(this.currentContent, this.currentUnit, this.currentTopic, this.currentSubtopic);
    }

    finishCurrentPart() {
        this.ui.hideResultPanel();
        const partKey = CONFIG.LEARNING_PARTS[this.activePartIndex].key;
        this.userProgress.completePart(this.currentSubtopic.subtopicId, partKey);

        if (this.activePartIndex >= CONFIG.LEARNING_PARTS.length - 1) {
            // Son parça (flashcards) tamamlandı: tüm alt başlık bitti
            this.completeSubtopicFlow();
        } else {
            this.ui.renderPartPath(this.currentContent, this.currentUnit, this.currentTopic, this.currentSubtopic);
        }
    }

    completeSubtopicFlow() {
        this.userProgress.completeSubtopic(
            this.currentSubtopic.subtopicId,
            this.currentUnit.unitId,
            this.currentTopic.topicId
        );

        const summary = this.lastFullTestSummary || { accuracy: 0, correctCount: 0, totalQuestions: 0, perfectScore: false };

        if (summary.perfectScore) {
            this.gameEngine.checkPerfectScoreBadge();
        }
        if (this.gameEngine.currentSession) {
            this.gameEngine.checkSpeedBadge();
        }

        this.ui.renderCompletionScreen(summary, this.currentUnit, this.currentTopic, this.currentSubtopic);
    }

    // ---------- Durak 1: Lokma Bilgi Kartları ----------
    startLessonPart(content) {
        this.gameEngine.startLessonSession(content.lessonCards);
        this.showLessonCard();
    }

    showLessonCard() {
        const card = this.gameEngine.getCurrentLessonCard();
        this.ui.renderLessonCard(card, this.gameEngine.getLessonProgress());
    }

    goToLessonQuiz() {
        const card = this.gameEngine.getCurrentLessonCard();
        this.ui.renderLessonQuiz(card, (isCorrect) => {
            this.userProgress.recordAnswer(
                'lesson_' + this.gameEngine.currentLesson.index,
                isCorrect,
                this.currentSubtopic.subtopicId
            );
            const hasMore = this.gameEngine.advanceLessonCard();
            if (hasMore) {
                this.showLessonCard();
            } else {
                this.finishCurrentPart();
            }
        });
    }

    // ---------- Durak 2: Hızlı Test ----------
    startQuickTestPart(content) {
        this.gameEngine.startSession('quick_' + this.currentSubtopic.subtopicId, this.currentUnit.unitId, this.currentTopic.topicId, content.quickTest);
        this.showTestQuestion(true, () => this.finishCurrentPart());
    }

    // ---------- Durak 4: KPSS Testi ----------
    startFullTestPart(content) {
        this.gameEngine.startSession('full_' + this.currentSubtopic.subtopicId, this.currentUnit.unitId, this.currentTopic.topicId, content.fullTest);
        this.showTestQuestion(false, () => {
            this.lastFullTestSummary = this.gameEngine.getSessionSummary();
            this.finishCurrentPart();
        });
    }

    showTestQuestion(useOptExplain, onAllDone) {
        const question = this.gameEngine.getCurrentQuestion();
        if (!question) { onAllDone(); return; }

        const progress = this.gameEngine.getProgress();
        this.ui.renderTestQuestion(question, progress, useOptExplain, (isCorrect) => {
            const qId = question.qId || question.q;
            this.userProgress.recordAnswer(qId, isCorrect, this.currentSubtopic.subtopicId);
            this.gameEngine.advanceToNext(isCorrect);
            this.showTestQuestion(useOptExplain, onAllDone);
        });
    }

    // ---------- Durak 3: Eşleştirme ----------
    startMatchPart(content) {
        const session = this.gameEngine.startMatchSession(content.matchPairs);
        this.ui.renderMatchScreen(session);
    }

    handleMatchClick(el, cardData) {
        const result = this.gameEngine.handleMatchSelection(cardData);

        if (result.status === 'selected') {
            el.classList.add('selected');
        } else if (result.status === 'match') {
            el.classList.add('matched');
            Helpers.qsa(`.match-card[data-pair-id="${cardData.pairId}"]`).forEach(c => {
                c.classList.add('matched');
                c.classList.remove('selected');
            });
            if (result.complete) {
                this.userProgress.unlockBadge('matcher');
                setTimeout(() => this.finishCurrentPart(), 500);
            }
        } else if (result.status === 'mismatch') {
            el.classList.add('wrong');
            const prevEl = Helpers.qsa('.match-card').find(c =>
                parseInt(c.dataset.pairId) === result.previous.pairId && c.dataset.type === result.previous.type
            );
            if (prevEl) prevEl.classList.add('wrong');
            setTimeout(() => {
                el.classList.remove('wrong', 'selected');
                if (prevEl) prevEl.classList.remove('wrong', 'selected');
            }, 600);
        }
    }

    // ---------- Durak 5: Bilgi Kartları (Flashcard) ----------
    startFlashPart(content) {
        this.gameEngine.startFlashSession(content.flashcards);
        this.showFlashcard();
    }

    showFlashcard() {
        const card = this.gameEngine.getCurrentFlashcard();
        this.ui.renderFlashcard(card, this.gameEngine.getFlashProgress());
    }

    flashAnswer(knew) {
        const hasMore = this.gameEngine.advanceFlashcard(knew);
        if (hasMore) {
            this.showFlashcard();
        } else {
            this.finishCurrentPart();
        }
    }

    // ========== EVENT LISTENERS (Global) ==========
    setupGlobalEventListeners() {
        EventBus.on(CONSTANTS.EVENTS.BADGE_UNLOCKED, (badge) => {
            this.ui.showBadgeUnlockModal(badge);
        });

        EventBus.on(CONSTANTS.EVENTS.LEVEL_UP, ({ oldLevel, newLevel }) => {
            this.ui.showToast(`🎉 Seviye Atladın: ${newLevel}!`, 'success');
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
