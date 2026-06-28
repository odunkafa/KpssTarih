// ==========================================
// JS/MODULES/UIRENDERER.JS
// DOM Rendering & UI Logic
// ==========================================

class UIRenderer {
    constructor(userProgress, gameEngine, contentPool, geoServices) {
        this.userProgress = userProgress;
        this.gameEngine = gameEngine;
        this.contentPool = contentPool;
        this.geoServices = geoServices;
        this.curriculumData = null;
        this.container = document.getElementById('main-content');
        this.activePopup = null;
    }

    setCurriculumData(data) {
        this.curriculumData = data;
    }

    // ========== SCREEN TRANSITIONS ==========
    render(html, animationClass = 'fade-in') {
        this.container.innerHTML = html;
        this.container.classList.add(animationClass);
        setTimeout(() => this.container.classList.remove(animationClass), 500);
        window.scrollTo(0, 0);
    }

    // ========== HEADER ==========
    renderHeader() {
        const xp = this.userProgress.data.xp;
        const streak = this.userProgress.getStreak();
        
        return `
            <div class="header">
                <div class="header__title">📚 KPSS Tarih</div>
                <div class="header__stats">
                    <div class="stat">
                        <span class="stat__icon">⭐</span>
                        <span class="stat__value">${Helpers.formatXP(xp)}</span>
                    </div>
                    <div class="stat">
                        <span class="stat__icon">🔥</span>
                        <span class="stat__value">${streak}</span>
                    </div>
                </div>
            </div>
        `;
    }

    // ========== BOTTOM NAV ==========
    renderBottomNav(activeTab = 'learn') {
        const tabs = [
            { id: 'learn', icon: '📖', label: 'Öğren' },
            { id: 'leaderboard', icon: '🏅', label: 'Liderlik' },
            { id: 'review', icon: '🔄', label: 'Gözden Geç' },
            { id: 'stats', icon: '📊', label: 'İstatistik' }
        ];

        const items = tabs.map(tab => `
            <div class="nav-item ${tab.id === activeTab ? 'active' : ''}" data-nav="${tab.id}">
                <span class="nav-item__icon">${tab.icon}</span>
                <span class="nav-item__label">${tab.label}</span>
            </div>
        `).join('');

        return `<div class="bottom-nav">${items}</div>`;
    }

    // ========== HOME SCREEN (Roadmap) ==========
    renderHomeScreen() {
        if (!this.curriculumData) {
            return this.renderError('Müfredat verisi yüklenemedi.');
        }

        const continueButton = this.renderContinueButton();
        const unitsHtml = this.curriculumData.units.map((unit, index) => 
            this.renderUnitCard(unit, index)
        ).join('');

        const html = `
            ${this.renderHeader()}
            <div class="roadmap">
                ${continueButton}
                <div class="roadmap__title">Üniteler</div>
                ${unitsHtml}
            </div>
            ${this.renderBottomNav('learn')}
        `;

        this.render(html);
        this.attachHomeListeners();
    }

    renderContinueButton() {
        const hasStarted = this.userProgress.hasStarted();
        
        if (!hasStarted) {
            return '';
        }

        const pos = this.userProgress.getCurrentPosition();

        return `
            <button class="btn btn--primary btn--large btn--icon" id="continue-btn" 
                data-unit="${pos.unitId}" data-topic="${pos.topicId}" data-subtopic="${pos.subtopicId}">
                <span>🎯</span> Kaldığın Yerden Devam Et
            </button>
        `;
    }

    renderUnitCard(unit, index) {
        const isLocked = index > 0 && !this.isUnitUnlocked(unit, index);
        const completedTopics = unit.topics.filter(t => this.userProgress.isTopicCompleted(t.topicId)).length;
        const totalTopics = unit.topics.length;
        const isCompleted = completedTopics === totalTopics;

        let statusClass = '';
        let statusIcon = '';
        
        if (isLocked) {
            statusClass = 'card--locked';
            statusIcon = '🔒';
        } else if (isCompleted) {
            statusClass = 'card--completed';
            statusIcon = '✅';
        } else {
            statusClass = 'card--active';
            statusIcon = '📖';
        }

        return `
            <div class="card ${statusClass}" ${!isLocked ? `data-unit-id="${unit.unitId}"` : ''}>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-size: 12px; color: var(--text-dim);">Ünite ${index + 1}</div>
                        <div style="font-size: 18px; font-weight: 700;">${unit.unitName}</div>
                        <div style="font-size: 13px; color: var(--text-dim); margin-top: 4px;">
                            ${completedTopics}/${totalTopics} konu tamamlandı
                        </div>
                    </div>
                    <div style="font-size: 28px;">${statusIcon}</div>
                </div>
            </div>
        `;
    }

    isUnitUnlocked(unit, index) {
        if (index === 0) return true;
        const previousUnit = this.curriculumData.units[index - 1];
        const allTopicsCompleted = previousUnit.topics.every(t => 
            this.userProgress.isTopicCompleted(t.topicId)
        );
        return allTopicsCompleted;
    }

    attachHomeListeners() {
        const continueBtn = Helpers.qs('#continue-btn');
        if (continueBtn) {
            continueBtn.addEventListener('click', () => {
                window.appInstance.navigateToSubtopic(
                    continueBtn.dataset.unit,
                    continueBtn.dataset.topic,
                    continueBtn.dataset.subtopic
                );
            });
        }

        Helpers.qsa('[data-unit-id]').forEach(card => {
            card.addEventListener('click', () => {
                window.appInstance.navigateToUnit(card.dataset.unitId);
            });
        });

        this.attachNavListeners();
    }

    attachNavListeners() {
        Helpers.qsa('[data-nav]').forEach(item => {
            item.addEventListener('click', () => {
                window.appInstance.navigateToTab(item.dataset.nav);
            });
        });
    }

    // ========== UNIT DETAIL SCREEN (Topics Path) ==========
    renderUnitScreen(unit) {
        const topicsHtml = unit.topics.map((topic, index) => 
            this.renderTopicPathItem(topic, index, unit.topics)
        ).join('');

        const html = `
            ${this.renderHeader()}
            <div class="roadmap">
                <button class="btn btn--secondary" id="back-btn">← Geri</button>
                <div class="roadmap__title">${unit.unitName}</div>
                <div class="topics-container">
                    ${topicsHtml}
                </div>
            </div>
            ${this.renderBottomNav('learn')}
        `;

        this.render(html);
        this.attachUnitListeners(unit);
    }

    renderTopicPathItem(topic, index, allTopics) {
        const isCompleted = this.userProgress.isTopicCompleted(topic.topicId);
        const isUnlocked = index === 0 || this.userProgress.isTopicCompleted(allTopics[index - 1].topicId);
        const isLocked = !isUnlocked && !isCompleted;
        const isActive = isUnlocked && !isCompleted;

        let statusClass = 'locked';
        let icon = '🔒';

        if (isCompleted) {
            statusClass = 'completed';
            icon = '✓';
        } else if (isActive) {
            statusClass = 'active';
            icon = '▶';
        }

        const completedSubtopics = topic.subtopics.filter(s => 
            this.userProgress.isSubtopicCompleted(s.subtopicId)
        ).length;

        return `
            <div class="topic-item ${statusClass}" ${!isLocked ? `data-topic-id="${topic.topicId}"` : ''}>
                <div class="topic-item__marker">${icon}</div>
                <div class="topic-item__content">
                    <div class="topic-item__name">${topic.topicName}</div>
                    <div class="topic-item__meta">${completedSubtopics}/${topic.subtopics.length} alt konu</div>
                </div>
            </div>
        `;
    }

    attachUnitListeners(unit) {
        Helpers.qs('#back-btn').addEventListener('click', () => {
            window.appInstance.navigateHome();
        });

        Helpers.qsa('[data-topic-id]').forEach(item => {
            item.addEventListener('click', () => {
                window.appInstance.navigateToTopic(unit.unitId, item.dataset.topicId);
            });
        });

        this.attachNavListeners();
    }

    // ========== TOPIC DETAIL SCREEN (Subtopics Path) ==========
    renderTopicScreen(unit, topic) {
        const subtopicsHtml = topic.subtopics.map((subtopic, index) => 
            this.renderSubtopicPathItem(subtopic, index, topic.subtopics)
        ).join('');

        const html = `
            ${this.renderHeader()}
            <div class="roadmap">
                <button class="btn btn--secondary" id="back-btn">← Geri</button>
                <div class="roadmap__title">${topic.topicName}</div>
                <div class="topics-container">
                    ${subtopicsHtml}
                </div>
            </div>
            ${this.renderBottomNav('learn')}
        `;

        this.render(html);
        this.attachTopicListeners(unit, topic);
    }

    renderSubtopicPathItem(subtopic, index, allSubtopics) {
        const isCompleted = this.userProgress.isSubtopicCompleted(subtopic.subtopicId);
        const isUnlocked = index === 0 || this.userProgress.isSubtopicCompleted(allSubtopics[index - 1].subtopicId);
        const isLocked = !isUnlocked && !isCompleted;
        const isActive = isUnlocked && !isCompleted;

        let statusClass = 'locked';
        let icon = '🔒';

        if (isCompleted) {
            statusClass = 'completed';
            icon = '✓';
        } else if (isActive) {
            statusClass = 'active';
            icon = '▶';
        }

        return `
            <div class="topic-item ${statusClass}" ${!isLocked ? `data-subtopic-id="${subtopic.subtopicId}"` : ''}>
                <div class="topic-item__marker">${icon}</div>
                <div class="topic-item__content">
                    <div class="topic-item__name">${subtopic.subtopicName}</div>
                </div>
            </div>
        `;
    }

    attachTopicListeners(unit, topic) {
        Helpers.qs('#back-btn').addEventListener('click', () => {
            window.appInstance.navigateToUnit(unit.unitId);
        });

        Helpers.qsa('[data-subtopic-id]').forEach(item => {
            item.addEventListener('click', () => {
                window.appInstance.navigateToSubtopic(unit.unitId, topic.topicId, item.dataset.subtopicId);
            });
        });

        this.attachNavListeners();
    }

    // ========== ERROR SCREEN ==========
    renderError(message) {
        const html = `
            ${this.renderHeader()}
            <div class="card text-center">
                <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">Bir Hata Oluştu</div>
                <div class="text-dim">${message}</div>
                <button class="btn btn--primary mt" onclick="location.reload()">Yenile</button>
            </div>
        `;
        this.render(html);
    }

    renderLoadingState(message = 'Yükleniyor...') {
        const html = `
            ${this.renderHeader()}
            <div class="card text-center">
                <div class="spinner" style="margin: 20px auto;"></div>
                <div class="text-dim">${message}</div>
            </div>
        `;
        this.render(html);
    }

    // ========== INFO CARD SCREEN (Bilgi Kartı) ==========
    renderInfoCard(content, unit, topic, subtopic) {
        const interactiveText = Helpers.renderInteractiveText(
            content.mainText, 
            content.interactiveWords, 
            content.geoReferences
        );

        const hasGeo = content.geoReferences && content.geoReferences.length > 0;

        const html = `
            ${this.renderHeader()}
            <div class="info-card">
                <button class="btn btn--secondary" id="back-btn" style="margin-bottom: 16px;">← Geri</button>
                <div class="info-card__title">${subtopic.subtopicName}</div>
                <div class="info-card__text">${interactiveText}</div>
                
                <div class="info-card__geo-bridge">
                    🔗 <strong>Coğrafya Köprüsü:</strong><br>
                    ${Helpers.renderInteractiveText(content.geoInfo, [], content.geoReferences)}
                </div>

                ${hasGeo ? `
                    <button class="btn btn--secondary btn--large btn--icon" id="show-map-btn">
                        <span>📍</span> Haritada Gör
                    </button>
                ` : ''}

                <button class="btn btn--primary btn--large btn--icon" id="start-test-btn">
                    <span>✅</span> Anladım, Teste Başla!
                </button>
            </div>
        `;

        this.render(html);
        this.attachInfoCardListeners(content, unit, topic, subtopic);
    }

    attachInfoCardListeners(content, unit, topic, subtopic) {
        Helpers.qs('#back-btn').addEventListener('click', () => {
            window.appInstance.navigateToTopic(unit.unitId, topic.topicId);
        });

        Helpers.qs('#start-test-btn').addEventListener('click', () => {
            window.appInstance.startQuestionSession(content, unit, topic, subtopic);
        });

        const mapBtn = Helpers.qs('#show-map-btn');
        if (mapBtn) {
            mapBtn.addEventListener('click', () => {
                this.showMapOverlay(content.geoReferences);
            });
        }

        Helpers.qsa('.interactive-word').forEach(el => {
            el.addEventListener('click', (e) => {
                this.showWordPopup(e.target, content.mainText);
            });
        });

        Helpers.qsa('.geo-reference').forEach(el => {
            el.addEventListener('click', (e) => {
                const lat = parseFloat(el.dataset.lat);
                const lng = parseFloat(el.dataset.lng);
                const place = el.dataset.place;
                
                if (lat && lng) {
                    this.showMapOverlay(content.geoReferences, { lat, lng, place });
                }
            });
        });

        this.attachNavListeners();
    }

    // ========== WORD POPUP (Kelime Açıklaması) ==========
    async showWordPopup(element, context) {
        this.closeActivePopup();

        const word = element.dataset.word;
        const rect = element.getBoundingClientRect();

        const popup = Helpers.createElement('div', {
            className: 'popup',
            style: `position: fixed; top: ${rect.bottom + 8}px; left: ${Math.min(rect.left, window.innerWidth - 320)}px;`
        });

        popup.innerHTML = `
            <div class="popup__word">${word}</div>
            <div class="popup__text"><span class="spinner" style="width: 16px; height: 16px; display: inline-block; vertical-align: middle;"></span> Yükleniyor...</div>
        `;

        document.body.appendChild(popup);
        this.activePopup = popup;

        const closeHandler = (e) => {
            if (!popup.contains(e.target) && e.target !== element) {
                this.closeActivePopup();
                document.removeEventListener('click', closeHandler);
            }
        };
        setTimeout(() => document.addEventListener('click', closeHandler), 100);

        try {
            const explanation = await this.contentPool.getWordExplanation(word, context);
            popup.querySelector('.popup__text').textContent = explanation;
        } catch (error) {
            popup.querySelector('.popup__text').textContent = 'Açıklama yüklenemedi.';
        }
    }

    closeActivePopup() {
        if (this.activePopup) {
            this.activePopup.remove();
            this.activePopup = null;
        }
    }

    // ========== MAP OVERLAY ==========
    showMapOverlay(geoReferences, focusLocation = null) {
        const overlay = Helpers.createElement('div', { className: 'modal-overlay' });
        
        overlay.innerHTML = `
            <div class="modal" style="width: 90vw; max-width: 600px;">
                <div class="modal__header">
                    <div class="modal__title">🗺️ Coğrafi Konum</div>
                    <button class="modal__close" id="close-map-modal">✕</button>
                </div>
                <div class="modal__content">
                    <div id="map" class="map-container" style="margin: 0;"></div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        setTimeout(() => {
            this.geoServices.initMap('map');
            
            const validLocations = geoReferences.filter(g => g.coords && g.coords[0] && g.coords[1]);
            
            if (validLocations.length > 0) {
                this.geoServices.addMultiplePins(validLocations);
            }

            if (focusLocation) {
                this.geoServices.panTo(focusLocation.lat, focusLocation.lng, 8);
            }
        }, 100);

        Helpers.qs('#close-map-modal', overlay).addEventListener('click', () => {
            this.geoServices.destroyMap();
            overlay.remove();
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.geoServices.destroyMap();
                overlay.remove();
            }
        });
    }

    // ========== QUESTION SCREEN ==========
    renderQuestionScreen(question, progress) {
        const optionsHtml = question.options.map((opt, i) => `
            <label class="option" data-option-index="${i}">
                <input type="radio" name="answer" value="${i}">
                <span>${String.fromCharCode(65 + i)}) ${opt.text}</span>
            </label>
        `).join('');

        const html = `
            ${this.renderHeader()}
            <div class="question-container">
                <div class="question-header">
                    <div class="question-progress">Soru ${progress.current}/${progress.total}</div>
                    <div class="question-xp">⭐ +${CONFIG.XP_PER_QUESTION} XP</div>
                </div>
                <div class="question-text">${question.q}</div>
                <div class="options">${optionsHtml}</div>
                <button class="btn btn--primary btn--large" id="submit-answer-btn" disabled>Seç</button>
            </div>
        `;

        this.render(html);
        this.attachQuestionListeners();
    }

    attachQuestionListeners() {
        let selectedIndex = null;

        Helpers.qsa('.option').forEach(option => {
            option.addEventListener('click', () => {
                Helpers.qsa('.option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                option.querySelector('input').checked = true;
                selectedIndex = parseInt(option.dataset.optionIndex);
                Helpers.qs('#submit-answer-btn').disabled = false;
            });
        });

        Helpers.qs('#submit-answer-btn').addEventListener('click', () => {
            if (selectedIndex !== null) {
                window.appInstance.submitAnswer(selectedIndex);
            }
        });
    }

    // ========== FEEDBACK SCREENS ==========
    renderFeedback(result) {
        let feedbackHtml = '';

        if (result.status === 'correct') {
            feedbackHtml = `
                <div class="feedback feedback--success scale-in">
                    <div class="feedback__title">✅ Harika! +${result.xpGained} XP</div>
                    <div class="feedback__text">${result.explanation}</div>
                </div>
            `;
        } else if (result.status === 'wrong_requeue') {
            feedbackHtml = `
                <div class="feedback feedback--error scale-in">
                    <div class="feedback__title">❌ Maalesef, yanlış!</div>
                    <div class="feedback__text">Bu soru listenin sonuna eklendi. Daha sonra tekrar sorulacak.</div>
                </div>
            `;
        } else if (result.status === 'final_wrong') {
            feedbackHtml = `
                <div class="feedback feedback--info scale-in">
                    <div class="feedback__title">📖 Doğru Cevap: ${result.correctAnswer.text}</div>
                    <div class="feedback__text">${result.explanation}</div>
                </div>
            `;
        }

        const continueBtn = `
            <button class="btn btn--primary btn--large" id="continue-question-btn">
                ${this.gameEngine.isSessionComplete() ? 'Sonuçları Gör' : 'Devam Et'}
            </button>
        `;

        const html = `
            ${this.renderHeader()}
            <div class="question-container">
                ${feedbackHtml}
                ${continueBtn}
            </div>
        `;

        this.render(html);

        Helpers.qs('#continue-question-btn').addEventListener('click', () => {
            window.appInstance.continueAfterFeedback();
        });
    }

    // ========== COMPLETION SCREEN ==========
    renderCompletionScreen(summary, unit, topic, subtopic) {
        const badgeHtml = summary.perfectScore ? `
            <div class="badge badge-unlock" style="margin: 20px auto;">
                <div class="badge__icon">🏆</div>
                <div class="badge__name">${subtopic.subtopicName} Uzmanı</div>
            </div>
        ` : '';

        const html = `
            ${this.renderHeader()}
            <div class="card text-center">
                <div style="font-size: 64px; margin-bottom: 16px;" class="bounce">🎉</div>
                <div style="font-size: 24px; font-weight: 700; margin-bottom: 8px;">BRAVOOOoo!</div>
                
                ${badgeHtml}

                <div style="font-size: 18px; color: var(--warning); font-weight: 600; margin: 16px 0;">
                    +${summary.correctCount * CONFIG.XP_PER_QUESTION + CONFIG.XP_PER_COMPLETED_SUBTOPIC} XP
                </div>

                <div style="display: flex; justify-content: space-around; margin: 20px 0;">
                    <div>
                        <div style="font-size: 24px; font-weight: 700; color: var(--success);">${summary.accuracy}%</div>
                        <div class="text-dim" style="font-size: 12px;">Doğruluk</div>
                    </div>
                    <div>
                        <div style="font-size: 24px; font-weight: 700; color: var(--accent);">${summary.correctCount}/${summary.totalQuestions}</div>
                        <div class="text-dim" style="font-size: 12px;">Doğru</div>
                    </div>
                </div>

                <button class="btn btn--secondary btn--large" id="back-to-topic-btn">← Konu Seç</button>
                <button class="btn btn--primary btn--large" id="next-subtopic-btn">Sonraki Konu →</button>
            </div>
        `;

        this.render(html);
        this.attachCompletionListeners(unit, topic, subtopic);
    }

    attachCompletionListeners(unit, topic, subtopic) {
        Helpers.qs('#back-to-topic-btn').addEventListener('click', () => {
            window.appInstance.navigateToTopic(unit.unitId, topic.topicId);
        });

        Helpers.qs('#next-subtopic-btn').addEventListener('click', () => {
            window.appInstance.navigateToNextSubtopic(unit.unitId, topic.topicId, subtopic.subtopicId);
        });
    }

    // ========== LEADERBOARD SCREEN ==========
    async renderLeaderboardScreen() {
        this.renderLoadingState('Liderlik tablosu yükleniyor...');

        const leaderboard = await window.googleSheetsInstance.getLeaderboard(10);

        const rowsHtml = leaderboard.map((entry, i) => `
            <div class="card" style="display: flex; justify-content: space-between; align-items: center; margin: 8px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="font-size: 20px; font-weight: 700; width: 30px;">
                        ${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${entry.rank}`}
                    </div>
                    <div>
                        <div style="font-weight: 600;">${entry.displayName}</div>
                        <div class="text-dim" style="font-size: 12px;">${entry.level}</div>
                    </div>
                </div>
                <div style="font-weight: 700; color: var(--warning);">${Helpers.formatXP(entry.xp)} XP</div>
            </div>
        `).join('');

        const html = `
            ${this.renderHeader()}
            <div class="roadmap">
                <div class="roadmap__title">🏅 Liderlik Tablosu</div>
                ${rowsHtml || '<div class="text-center text-dim mt">Henüz veri yok.</div>'}
            </div>
            ${this.renderBottomNav('leaderboard')}
        `;

        this.render(html);
        this.attachNavListeners();
    }

    // ========== REVIEW SCREEN (Gözden Geçir) ==========
    renderReviewScreen() {
        const reviewQueue = this.userProgress.getReviewQueue();

        const itemsHtml = reviewQueue.map(item => `
            <div class="card">
                <div style="font-weight: 600;">Soru tekrar gerekiyor</div>
                <div class="text-dim" style="font-size: 13px;">Yanlış sayısı: ${item.attempts}</div>
            </div>
        `).join('');

        const html = `
            ${this.renderHeader()}
            <div class="roadmap">
                <div class="roadmap__title">🔄 Gözden Geçir</div>
                ${reviewQueue.length > 0 ? itemsHtml : '<div class="text-center text-dim mt">Tebrikler! Tekrar edilecek soru yok.</div>'}
            </div>
            ${this.renderBottomNav('review')}
        `;

        this.render(html);
        this.attachNavListeners();
    }

    // ========== STATS SCREEN ==========
    renderStatsScreen() {
        const accuracy = this.userProgress.getAccuracy();
        const badges = this.userProgress.getUnlockedBadges();
        const lockedBadges = this.userProgress.getLockedBadges();

        const badgesHtml = badges.map(b => `
            <div class="badge">
                <div class="badge__icon">${b.icon}</div>
                <div class="badge__name">${b.name}</div>
            </div>
        `).join('');

        const lockedBadgesHtml = lockedBadges.map(b => `
            <div class="badge badge--locked">
                <div class="badge__icon">${b.icon}</div>
                <div class="badge__name">${b.name}</div>
            </div>
        `).join('');

        const html = `
            ${this.renderHeader()}
            <div class="roadmap">
                <div class="roadmap__title">📊 İstatistikler</div>
                
                <div class="card">
                    <div style="display: flex; justify-content: space-around; text-align: center;">
                        <div>
                            <div style="font-size: 28px; font-weight: 700; color: var(--accent);">${this.userProgress.data.xp}</div>
                            <div class="text-dim" style="font-size: 12px;">Toplam XP</div>
                        </div>
                        <div>
                            <div style="font-size: 28px; font-weight: 700; color: var(--success);">${accuracy}%</div>
                            <div class="text-dim" style="font-size: 12px;">Doğruluk</div>
                        </div>
                        <div>
                            <div style="font-size: 28px; font-weight: 700; color: var(--warning);">${this.userProgress.getStreak()}</div>
                            <div class="text-dim" style="font-size: 12px;">Gün Serisi</div>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div style="font-weight: 600; margin-bottom: 12px;">🏆 Rozetler</div>
                    <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                        ${badgesHtml}
                        ${lockedBadgesHtml}
                    </div>
                </div>

                <div class="card">
                    <div style="font-weight: 600; margin-bottom: 12px;">📈 Tamamlanan Konular</div>
                    <div style="font-size: 24px; font-weight: 700; color: var(--accent);">
                        ${this.userProgress.data.completedSubtopics.length}
                    </div>
                </div>
            </div>
            ${this.renderBottomNav('stats')}
        `;

        this.render(html);
        this.attachNavListeners();
    }

    // ========== TOAST NOTIFICATIONS ==========
    showToast(message, type = 'info') {
        const toast = Helpers.createElement('div', {
            className: `toast feedback feedback--${type}`,
            style: 'position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%); z-index: 2000; min-width: 250px;'
        });
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => toast.remove(), 3500);
    }

    // ========== BADGE UNLOCK MODAL ==========
    showBadgeUnlockModal(badge) {
        const overlay = Helpers.createElement('div', { className: 'modal-overlay' });
        
        overlay.innerHTML = `
            <div class="modal text-center">
                <div class="badge badge-unlock" style="margin: 0 auto 16px;">
                    <div class="badge__icon" style="font-size: 48px;">${badge.icon}</div>
                    <div class="badge__name">${badge.name}</div>
                </div>
                <div style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">Yeni Rozet Kazandın!</div>
                <div class="text-dim mb">+${badge.xp} XP Bonus</div>
                <button class="btn btn--primary btn--large" id="close-badge-modal">Harika!</button>
            </div>
        `;

        document.body.appendChild(overlay);

        Helpers.qs('#close-badge-modal', overlay).addEventListener('click', () => {
            overlay.remove();
        });
    }
}

// Global instance
window.uiRendererInstance = null;
