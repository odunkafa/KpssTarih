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
    }

    setCurriculumData(data) {
        this.curriculumData = data;
    }

    // ========== SCREEN TRANSITIONS ==========
    render(html, animationClass = 'fade-in') {
        this.hideResultPanel();
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
        const topicsHtml = unit.topics.map((topic, index) => {
            const connector = index > 0 ? '<div class="box-connector"></div>' : '';
            return connector + this.renderTopicPathItem(topic, index, unit.topics);
        }).join('');

        const html = `
            ${this.renderHeader()}
            <div class="roadmap">
                <button class="btn btn--secondary" id="back-btn">← Geri</button>
                <div class="roadmap__title">${unit.unitName}</div>
                <div class="box-list">
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
        const colorClass = 'topic-c' + (index % 6);
        const completedSubtopics = topic.subtopics.filter(s =>
            this.userProgress.isSubtopicCompleted(s.subtopicId)
        ).length;

        return `
            <div class="box-node ${colorClass} ${isLocked ? 'locked' : (isCompleted ? 'done' : '')}" ${!isLocked ? `data-topic-id="${topic.topicId}"` : ''}>
                <div class="box-num">${isLocked ? '🔒' : (isCompleted ? '' : (index + 1))}</div>
                <div>
                    <div class="box-label">${topic.topicName}</div>
                    <div class="box-sub">${completedSubtopics}/${topic.subtopics.length} alt konu</div>
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
        const colorClass = 'topic-c' + (unit.topics.indexOf(topic) % 6);
        const subtopicsHtml = topic.subtopics.map((subtopic, index) => {
            const connector = index > 0 ? '<div class="box-connector"></div>' : '';
            return connector + this.renderSubtopicPathItem(subtopic, index, topic.subtopics, colorClass);
        }).join('');

        const html = `
            ${this.renderHeader()}
            <div class="roadmap">
                <button class="btn btn--secondary" id="back-btn">← Geri</button>
                <div class="roadmap__title">${topic.topicName}</div>
                <div class="box-list">
                    ${subtopicsHtml}
                </div>
            </div>
            ${this.renderBottomNav('learn')}
        `;

        this.render(html);
        this.attachTopicListeners(unit, topic);
    }

    renderSubtopicPathItem(subtopic, index, allSubtopics, colorClass) {
        const isCompleted = this.userProgress.isSubtopicCompleted(subtopic.subtopicId);
        const isUnlocked = index === 0 || this.userProgress.isSubtopicCompleted(allSubtopics[index - 1].subtopicId);
        const isLocked = !isUnlocked && !isCompleted;
        const partsCount = this.userProgress.getCompletedPartsCount(subtopic.subtopicId);
        const subLabel = isCompleted ? 'Tamamlandı' : `${partsCount}/${CONFIG.LEARNING_PARTS.length} durak tamamlandı`;

        return `
            <div class="box-node ${colorClass} ${isLocked ? 'locked' : (isCompleted ? 'done' : '')}" ${!isLocked ? `data-subtopic-id="${subtopic.subtopicId}"` : ''}>
                <div class="box-num">${isLocked ? '🔒' : (isCompleted ? '' : (index + 1))}</div>
                <div>
                    <div class="box-label">${subtopic.subtopicName}</div>
                    <div class="box-sub">${subLabel}</div>
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

    // ========== PARÇA PATİKASI (5 Öğrenme Modu Durağı) ==========
    renderPartPath(content, unit, topic, subtopic) {
        const parts = CONFIG.LEARNING_PARTS;
        const positions = ['align-start', 'align-end', 'align-start', 'align-end', 'align-start'];

        let bodyHtml = '';
        parts.forEach((p, i) => {
            const isDone = this.userProgress.isPartCompleted(subtopic.subtopicId, p.key);
            const isLocked = i > 0 && !this.userProgress.isPartCompleted(subtopic.subtopicId, parts[i - 1].key);

            if (i > 0) {
                const goingRight = (i % 2 === 1);
                bodyHtml += this.renderPartConnector(goingRight);
            }

            const sealClass = isLocked ? 'locked' : (isDone ? 'done' : 'unlocked');
            const sealContent = isLocked ? '🔒' : (isDone ? '★' : p.icon);
            const subText = isLocked ? 'Önceki durağı tamamla' : (isDone ? 'Tamamlandı' : 'Hazır');

            bodyHtml += `
                <div class="part-row ${positions[i]}">
                    <button class="part-seal ${sealClass}" ${!isLocked ? `data-part-index="${i}"` : ''}>${sealContent}</button>
                    <div class="part-row__info">
                        <div class="part-row__title">${p.label}</div>
                        <div class="part-row__sub">${subText}</div>
                    </div>
                </div>
            `;
        });

        const html = `
            ${this.renderHeader()}
            <div class="part-path">
                <button class="btn btn--secondary" id="back-btn">← Geri</button>
                <div class="part-path__intro">
                    <h2>${subtopic.subtopicName}</h2>
                    <p>5 durağı sırayla tamamla, konuyu ustalaş</p>
                </div>
                ${bodyHtml}
            </div>
            ${this.renderBottomNav('learn')}
        `;

        this.render(html);
        this.attachPartPathListeners(content, unit, topic, subtopic);
    }

    renderPartConnector(goingRight) {
        const d = goingRight
            ? 'M 32 0 C 32 22, 332 22, 332 44'
            : 'M 332 0 C 332 22, 32 22, 32 44';
        return `<svg class="part-connector" viewBox="0 0 364 44" preserveAspectRatio="none">
            <path d="${d}" stroke="var(--line)" stroke-width="3" fill="none" stroke-linecap="round"/>
        </svg>`;
    }

    attachPartPathListeners(content, unit, topic, subtopic) {
        Helpers.qs('#back-btn').addEventListener('click', () => {
            window.appInstance.navigateToTopic(unit.unitId, topic.topicId);
        });

        Helpers.qsa('[data-part-index]').forEach(btn => {
            btn.addEventListener('click', () => {
                const partIndex = parseInt(btn.dataset.partIndex);
                window.appInstance.startPart(partIndex, content, unit, topic, subtopic);
            });
        });

        this.attachNavListeners();
    }

    // ========== ORTAK SORU-CEVAP MOTORU ==========
    // optExplain varsa: her şıkkın altına kendi açıklaması açılır, alttan "İlerle" eklenir (lokma kontrol + hızlı test)
    // optExplain yoksa: alttan kayan sonuç paneli ile tek açıklama gösterilir (KPSS testi)
    renderQuestion(cfg) {
        const body = Helpers.qs('#' + cfg.bodyId);
        const letters = ['A', 'B', 'C', 'D', 'E'];
        let optsHtml = '';
        cfg.opts.forEach((opt, i) => {
            optsHtml += `<div class="q-option-wrap">
                <button class="q-option" data-idx="${i}"><span class="letter">${letters[i]}</span><span>${opt}</span></button>
                <div class="opt-explain" id="optExplain-${i}"></div>
            </div>`;
        });

        body.innerHTML = `<div class="q-kicker">${cfg.kicker}</div><div class="q-text">${cfg.q}</div><div class="q-options" id="qOptionsContainer">${optsHtml}</div>`;

        const optionEls = body.querySelectorAll('.q-option');
        optionEls.forEach(el => {
            el.addEventListener('click', () => {
                if (el.classList.contains('disabled')) return;
                optionEls.forEach(o => o.classList.add('disabled'));
                const idx = parseInt(el.dataset.idx);
                const isCorrect = idx === cfg.correct;
                el.classList.add(isCorrect ? 'correct' : 'incorrect');
                if (!isCorrect) optionEls[cfg.correct].classList.add('correct');

                if (cfg.optExplain) {
                    cfg.optExplain.forEach((txt, i) => {
                        const box = body.querySelector('#optExplain-' + i);
                        const isThisCorrect = i === cfg.correct;
                        box.innerHTML = `<span class="opt-explain-icon">${isThisCorrect ? '✓' : '✕'}</span>${txt}`;
                        box.classList.add('show', isThisCorrect ? 'ok' : 'no');
                    });
                    this.showInlineContinue(cfg.bodyId, () => cfg.onContinue(isCorrect));
                } else {
                    optionEls.forEach(o => { if (o !== el && parseInt(o.dataset.idx) !== cfg.correct) o.classList.add('dimmed'); });
                    this.showResultPanel(isCorrect, cfg.explain, () => { this.hideResultPanel(); cfg.onContinue(isCorrect); });
                }
            });
        });
    }

    showInlineContinue(bodyId, onContinue) {
        const body = Helpers.qs('#' + bodyId);
        const old = body.querySelector('.inline-continue-wrap');
        if (old) old.remove();
        const wrap = Helpers.createElement('div', { className: 'inline-continue-wrap' });
        wrap.innerHTML = `<button class="btn btn--primary btn--large">İlerle</button>`;
        wrap.querySelector('button').addEventListener('click', onContinue);
        body.appendChild(wrap);
        wrap.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }

    showResultPanel(isCorrect, explainText, onContinue) {
        let panel = Helpers.qs('#resultPanel');
        if (!panel) {
            panel = Helpers.createElement('div', { id: 'resultPanel', className: 'result-panel' });
            document.body.appendChild(panel);
        }
        panel.innerHTML = `
            <div class="result-head">
                <div class="result-icon">${isCorrect ? '✓' : '✕'}</div>
                <div class="result-title">${isCorrect ? 'Doğru!' : 'Yanlış'}</div>
            </div>
            ${explainText ? `<div class="result-explain">${explainText}</div>` : ''}
            <button class="btn btn--primary btn--large" id="resultContinueBtn">İlerle</button>
        `;
        panel.className = 'result-panel show ' + (isCorrect ? 'correct' : 'incorrect');
        Helpers.qs('#resultContinueBtn', panel).addEventListener('click', onContinue);
    }

    hideResultPanel() {
        const panel = Helpers.qs('#resultPanel');
        if (panel) panel.remove();
    }

    // ========== DURAK 1: LOKMA BİLGİ KARTI ==========
    renderLessonCard(card, progress) {
        const html = `
            ${this.renderHeader()}
            <div class="lesson-card">
                <button class="btn btn--secondary" id="back-btn" style="margin-bottom: 1rem;">✕</button>
                <div class="lesson-card__eyebrow">${card.eyebrow || ''}</div>
                <div class="lesson-card__title">💡 ${card.title}</div>
                <p class="lesson-card__text">${card.text}</p>
                <div class="tip-box"><b>📌 KPSS İpucu:</b> ${card.tip}</div>
                <button class="btn btn--primary btn--large" id="lesson-continue-btn" style="margin-top: 1.4rem;">İlerle</button>
            </div>
            ${this.renderBottomNav('learn')}
        `;
        this.render(html);
        Helpers.qs('#back-btn').addEventListener('click', () => window.appInstance.exitPart());
        Helpers.qs('#lesson-continue-btn').addEventListener('click', () => window.appInstance.goToLessonQuiz());
    }

    renderLessonQuiz(card, onContinue) {
        const html = `
            ${this.renderHeader()}
            <div class="q-screen" id="lessonQuizBody"></div>
            ${this.renderBottomNav('learn')}
        `;
        this.render(html);
        this.renderQuestion({
            bodyId: 'lessonQuizBody',
            kicker: 'Hızlı Kontrol',
            q: card.quiz.q,
            opts: card.quiz.opts,
            correct: card.quiz.correct,
            optExplain: card.quiz.optExplain,
            onContinue
        });
    }

    // ========== DURAK 2/4: HIZLI TEST & KPSS TESTİ ==========
    renderTestQuestion(question, progress, useOptExplain, onContinue) {
        const html = `
            ${this.renderHeader()}
            <div class="q-screen" id="testBody"></div>
            ${this.renderBottomNav('learn')}
        `;
        this.render(html);
        this.renderQuestion({
            bodyId: 'testBody',
            kicker: `Soru ${progress.current} / ${progress.total}`,
            q: question.q,
            opts: question.opts,
            correct: question.correct,
            explain: question.explain,
            optExplain: useOptExplain ? question.optExplain : null,
            onContinue
        });
    }

    // ========== DURAK 3: EŞLEŞTİRME ==========
    renderMatchScreen(matchSession) {
        const cardsHtml = matchSession.cards.map((c, idx) => `
            <div class="match-card" data-idx="${idx}" data-pair-id="${c.pairId}" data-type="${c.type}">${c.text}</div>
        `).join('');

        const html = `
            ${this.renderHeader()}
            <div class="match-screen">
                <button class="btn btn--secondary" id="back-btn">✕</button>
                <div class="q-kicker" style="margin-top: 1rem;">Eşleştirme Oyunu</div>
                <div class="q-text">Kavramları doğru tanımlarla eşleştir</div>
                <div class="match-grid" id="matchGrid">${cardsHtml}</div>
            </div>
            ${this.renderBottomNav('learn')}
        `;
        this.render(html);
        Helpers.qs('#back-btn').addEventListener('click', () => window.appInstance.exitPart());
        this.attachMatchListeners(matchSession);
    }

    attachMatchListeners(matchSession) {
        const cardEls = Helpers.qsa('.match-card');
        cardEls.forEach(el => {
            el.addEventListener('click', () => {
                if (el.classList.contains('matched')) return;
                const cardData = {
                    pairId: parseInt(el.dataset.pairId),
                    type: el.dataset.type
                };
                window.appInstance.handleMatchClick(el, cardData);
            });
        });
    }

    // ========== DURAK 5: BİLGİ KARTLARI (FLASHCARD) ==========
    renderFlashcard(card, progress) {
        const html = `
            ${this.renderHeader()}
            <div class="flip-wrap">
                <button class="btn btn--secondary" id="back-btn" style="align-self: flex-start; margin-bottom: 1rem;">✕</button>
                <div class="flip-hint">Kartı çevirmek için dokun</div>
                <div class="flip-card" id="flipCard">
                    <div class="flip-inner" id="flipInner">
                        <div class="flip-face flip-front"><div class="flip-label">KAVRAM</div><div class="flip-content">${card.front}</div></div>
                        <div class="flip-face flip-back"><div class="flip-label">AÇIKLAMA</div><div class="flip-content">${card.back}</div></div>
                    </div>
                </div>
                <div class="flip-actions" id="flipActions" style="visibility: hidden;">
                    <button class="repeat" id="flip-repeat-btn">🔁 Tekrar Et</button>
                    <button class="know" id="flip-know-btn">✓ Biliyorum</button>
                </div>
            </div>
            ${this.renderBottomNav('learn')}
        `;
        this.render(html);

        Helpers.qs('#back-btn').addEventListener('click', () => window.appInstance.exitPart());
        Helpers.qs('#flipCard').addEventListener('click', () => {
            Helpers.qs('#flipInner').classList.add('flipped');
            Helpers.qs('#flipActions').style.visibility = 'visible';
        });
        Helpers.qs('#flip-repeat-btn').addEventListener('click', () => window.appInstance.flashAnswer(false));
        Helpers.qs('#flip-know-btn').addEventListener('click', () => window.appInstance.flashAnswer(true));
    }

    // ========== ALT BAŞLIK TAMAMLANDI EKRANI ==========
    renderCompletionScreen(summary, unit, topic, subtopic) {
        const xpEarned = CONFIG.XP_PER_COMPLETED_SUBTOPIC + (CONFIG.LEARNING_PARTS.length * CONFIG.XP_PER_COMPLETED_PART);
        const badgeHtml = summary.perfectScore ? `
            <div class="badge" style="margin: 0 auto 1.2rem;">
                <div class="badge__icon">🏆</div>
                <div class="badge__name">${subtopic.subtopicName} Uzmanı</div>
            </div>
        ` : '';

        const html = `
            ${this.renderHeader()}
            <div class="completion-wrap">
                <div class="completion-emoji bounce">🎉</div>
                <h2>Tebrikler!</h2>
                <p>${subtopic.subtopicName} tamamlandı</p>

                ${badgeHtml}

                <div style="font-size: 1.1rem; color: var(--accent); font-weight: 700; margin-bottom: 1.2rem;">+${xpEarned} XP</div>

                <div class="completion-stats">
                    <div class="stat-pill">
                        <div class="num">${summary.accuracy}%</div>
                        <div class="lbl">Doğruluk</div>
                    </div>
                    <div class="stat-pill">
                        <div class="num">${summary.correctCount}/${summary.totalQuestions}</div>
                        <div class="lbl">Doğru</div>
                    </div>
                </div>

                <button class="btn btn--secondary btn--large" id="back-to-topic-btn">← Konu Seç</button>
                <button class="btn btn--primary btn--large" id="next-subtopic-btn">Sonraki Konu →</button>
            </div>
            ${this.renderBottomNav('learn')}
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

        this.attachNavListeners();
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
            style: 'position: fixed; top: 72px; left: 50%; transform: translateX(-50%); z-index: 2000; min-width: 250px; max-width: 90vw; pointer-events: none; box-shadow: 0 6px 20px rgba(0,0,0,0.4);'
        });
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => toast.remove(), 3000);
    }

    // ========== BADGE UNLOCK MODAL ==========
    showBadgeUnlockModal(badge) {
        // Aynı anda birden fazla rozet açılırsa (ör. art arda iki tetikleyici),
        // üst üste binen overlay yerine sıraya alıp birini kapatınca diğerini göster.
        if (!this.badgeQueue) this.badgeQueue = [];

        const alreadyShowing = !!Helpers.qs('.modal-overlay');
        this.badgeQueue.push(badge);

        if (alreadyShowing) return; // sıraya eklendi, mevcut modal kapanınca gösterilecek

        this.displayNextBadgeModal();
    }

    displayNextBadgeModal() {
        if (!this.badgeQueue || this.badgeQueue.length === 0) return;
        const badge = this.badgeQueue.shift();

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
            this.displayNextBadgeModal();
        });
    }
}

// Global instance
window.uiRendererInstance = null;
