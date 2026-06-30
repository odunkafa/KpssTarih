// ==========================================
// JS/MODULES/GAMEENGINE.JS
// Game Logic: 10-Question Loop, Badges, Mechanics
// ==========================================

class GameEngine {
    constructor(userProgress) {
        this.userProgress = userProgress;
        this.currentSession = null;
    }

    // ========== SESSION MANAGEMENT ==========
    startSession(subtopicId, unitId, topicId, questions) {
        this.currentSession = {
            subtopicId,
            unitId,
            topicId,
            questions: [...questions], // Çalışma kopyası
            originalQuestions: questions,
            currentIndex: 0,
            wrongAnswerCount: {}, // qId -> count
            correctCount: 0,
            totalAttempts: 0,
            startTime: Date.now(),
            sessionComplete: false
        };

        Logger.info('Session started', { subtopicId, questionCount: questions.length });
        return this.currentSession;
    }

    getCurrentQuestion() {
        if (!this.currentSession || this.currentSession.sessionComplete) {
            return null;
        }
        return this.currentSession.questions[this.currentSession.currentIndex];
    }

    getProgress() {
        if (!this.currentSession) return { current: 0, total: 0 };
        
        return {
            current: this.currentSession.currentIndex + 1,
            total: this.currentSession.questions.length,
            correctCount: this.currentSession.correctCount
        };
    }

    // ========== ANSWER HANDLING (yeni renderQuestion motoru için) ==========
    // Soru zaten cevaplandı (renderQuestion içinde); burada sadece ilerlet ve sayaç tut.
    advanceToNext(wasCorrect) {
        if (wasCorrect) {
            this.currentSession.correctCount++;
        }
        this.currentSession.totalAttempts++;
        this.currentSession.currentIndex++;

        if (this.currentSession.currentIndex >= this.currentSession.questions.length) {
            this.completeSession();
        }
    }

    completeSession() {
        this.currentSession.sessionComplete = true;
        this.currentSession.endTime = Date.now();
        this.currentSession.duration = this.currentSession.endTime - this.currentSession.startTime;

        Logger.success('Session completed', {
            subtopicId: this.currentSession.subtopicId,
            duration: this.currentSession.duration,
            accuracy: this.calculateSessionAccuracy()
        });
    }

    calculateSessionAccuracy() {
        const total = this.currentSession.totalAttempts;
        const correct = this.currentSession.correctCount;
        return total > 0 ? Math.round((correct / total) * 100) : 0;
    }

    isSessionComplete() {
        return this.currentSession && this.currentSession.sessionComplete;
    }

    getSessionSummary() {
        if (!this.currentSession) return null;

        return {
            subtopicId: this.currentSession.subtopicId,
            totalQuestions: this.currentSession.originalQuestions.length,
            correctCount: this.currentSession.correctCount,
            totalAttempts: this.currentSession.totalAttempts,
            accuracy: this.calculateSessionAccuracy(),
            duration: this.currentSession.duration,
            perfectScore: this.currentSession.correctCount === this.currentSession.originalQuestions.length
        };
    }

    // ========== EXPLANATION HELPERS ==========
    getCorrectExplanation(question) {
        const correctIndex = question.options.findIndex(o => o.correct);
        if (question.explanations && question.explanations[correctIndex]) {
            return question.explanations[correctIndex];
        }
        return 'Doğru cevap!';
    }

    getOptionExplanation(question, optionIndex) {
        if (question.explanations && question.explanations[optionIndex]) {
            return question.explanations[optionIndex];
        }
        return question.options[optionIndex].correct ? 'Doğru!' : 'Yanlış cevap.';
    }

    // ========== BADGE CHECKS ==========
    checkPerfectScoreBadge() {
        // İlk kusursuz konu tamamlamada rozet
        const completedCount = this.userProgress.data.completedSubtopics.length;
        if (completedCount === 1) {
            this.userProgress.unlockBadge('first_subtopic');
        }
    }

    checkSpeedBadge() {
        const durationMinutes = this.currentSession.duration / 1000 / 60;
        if (durationMinutes < 3) {
            this.userProgress.unlockBadge('speedrunner');
        }
    }

    checkMasteryBadge(topicId, allSubtopicsInTopic) {
        const allCompleted = allSubtopicsInTopic.every(s => 
            this.userProgress.isSubtopicCompleted(s.subtopicId)
        );

        if (allCompleted) {
            this.userProgress.unlockBadge('history_master');
            this.userProgress.completeTopic(topicId);
        }
    }

    // ========== REVIEW MODE (Gözden Geçir) ==========
    startReviewSession(failedQuestions, contentPool) {
        // Failed questions'dan review session başlat
        const questions = failedQuestions.map(fq => fq.questionData).filter(Boolean);
        
        if (questions.length === 0) {
            return null;
        }

        return this.startSession('review', null, null, questions);
    }

    // ========== LESSON CARDS (Durak 1: Bilgi + Kontrol Sorusu) ==========
    startLessonSession(lessonCards) {
        this.currentLesson = {
            cards: lessonCards,
            index: 0
        };
        return this.currentLesson;
    }

    getCurrentLessonCard() {
        if (!this.currentLesson) return null;
        return this.currentLesson.cards[this.currentLesson.index];
    }

    getLessonProgress() {
        if (!this.currentLesson) return { current: 0, total: 0 };
        return {
            current: this.currentLesson.index + 1,
            total: this.currentLesson.cards.length
        };
    }

    advanceLessonCard() {
        this.currentLesson.index++;
        return this.currentLesson.index < this.currentLesson.cards.length;
    }

    isLessonComplete() {
        return !this.currentLesson || this.currentLesson.index >= this.currentLesson.cards.length;
    }

    // ========== MATCH PAIRS (Durak 3: Eşleştirme) ==========
    startMatchSession(matchPairs) {
        const terms = matchPairs.map((p, i) => ({ text: p.term, pairId: i, type: 'term' }));
        const defs = matchPairs.map((p, i) => ({ text: p.def, pairId: i, type: 'def' }));
        const cards = Helpers.shuffleArray([...terms, ...defs]);

        this.currentMatch = {
            cards,
            totalPairs: matchPairs.length,
            solved: 0,
            selected: null
        };
        return this.currentMatch;
    }

    // Bir karta tıklandığında çağrılır; sonucu döner: 'selected' | 'match' | 'mismatch'
    handleMatchSelection(cardData) {
        const m = this.currentMatch;
        if (!m.selected) {
            m.selected = cardData;
            return { status: 'selected' };
        }

        if (m.selected.pairId === cardData.pairId && m.selected.type !== cardData.type) {
            m.solved++;
            m.selected = null;
            const complete = m.solved >= m.totalPairs;
            return { status: 'match', solved: m.solved, total: m.totalPairs, complete };
        }

        const prevSelected = m.selected;
        m.selected = null;
        return { status: 'mismatch', previous: prevSelected };
    }

    isMatchComplete() {
        return this.currentMatch && this.currentMatch.solved >= this.currentMatch.totalPairs;
    }

    // ========== FLASHCARDS (Durak 5: Bilgi Kartları) ==========
    startFlashSession(flashcards) {
        this.currentFlash = {
            cards: flashcards,
            index: 0,
            knewCount: 0
        };
        return this.currentFlash;
    }

    getCurrentFlashcard() {
        if (!this.currentFlash) return null;
        return this.currentFlash.cards[this.currentFlash.index];
    }

    getFlashProgress() {
        if (!this.currentFlash) return { current: 0, total: 0 };
        return {
            current: this.currentFlash.index + 1,
            total: this.currentFlash.cards.length
        };
    }

    advanceFlashcard(knew) {
        if (knew) this.currentFlash.knewCount++;
        this.currentFlash.index++;
        return this.currentFlash.index < this.currentFlash.cards.length;
    }

    isFlashComplete() {
        return !this.currentFlash || this.currentFlash.index >= this.currentFlash.cards.length;
    }
}

// Global instance
window.gameEngineInstance = null;
