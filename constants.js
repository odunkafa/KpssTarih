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

    // ========== ANSWER HANDLING ==========
    submitAnswer(selectedOptionIndex) {
        const question = this.getCurrentQuestion();
        if (!question) {
            Logger.error('No current question to answer');
            return null;
        }

        this.currentSession.totalAttempts++;
        const selectedOption = question.options[selectedOptionIndex];
        const isCorrect = selectedOption.correct;

        const qId = question.qId || question.q; // Fallback to question text as ID

        if (isCorrect) {
            return this.handleCorrectAnswer(question, qId);
        } else {
            return this.handleWrongAnswer(question, qId);
        }
    }

    handleCorrectAnswer(question, qId) {
        this.currentSession.correctCount++;
        
        // Eğer bu soru daha önce yanlış bilinmiş ve şimdi doğru bilindiyse
        const wrongCount = this.currentSession.wrongAnswerCount[qId] || 0;

        // Kullanıcı progress'i güncelle
        this.userProgress.recordAnswer(qId, true, this.currentSession.subtopicId);

        const result = {
            status: 'correct',
            question,
            wasRetry: wrongCount > 0,
            explanation: this.getCorrectExplanation(question),
            xpGained: CONFIG.XP_PER_QUESTION
        };

        this.advanceToNext();
        
        return result;
    }

    handleWrongAnswer(question, qId) {
        const currentWrongCount = (this.currentSession.wrongAnswerCount[qId] || 0) + 1;
        this.currentSession.wrongAnswerCount[qId] = currentWrongCount;

        this.userProgress.recordAnswer(qId, false, this.currentSession.subtopicId);

        if (currentWrongCount >= 2) {
            // İkinci yanlış: doğru cevabı göster ve döngüyü sonlandır (bu soru için)
            const result = {
                status: 'final_wrong',
                question,
                correctAnswer: question.options.find(o => o.correct),
                explanation: this.getCorrectExplanation(question),
                wrongCount: currentWrongCount
            };

            this.advanceToNext();
            return result;
        } else {
            // İlk yanlış: soruyu listenin sonuna ekle
            this.requeueQuestion();

            const result = {
                status: 'wrong_requeue',
                question,
                wrongCount: currentWrongCount
            };

            return result;
        }
    }

    requeueQuestion() {
        const question = this.currentSession.questions[this.currentSession.currentIndex];
        
        // Şu anki sorudan sonraki tüm soruları al
        const remainingQuestions = this.currentSession.questions.slice(this.currentSession.currentIndex + 1);
        
        // Bu soruyu sona ekle
        this.currentSession.questions = [
            ...this.currentSession.questions.slice(0, this.currentSession.currentIndex),
            ...remainingQuestions,
            question
        ];

        // currentIndex değişmez, çünkü şu anki soru kaldırıldı ve yeni soru onun yerine geldi
    }

    advanceToNext() {
        this.currentSession.currentIndex++;
        
        if (this.currentSession.currentIndex >= this.currentSession.questions.length) {
            this.completeSession();
        }
    }

    completeSession() {
        this.currentSession.sessionComplete = true;
        this.currentSession.endTime = Date.now();
        this.currentSession.duration = this.currentSession.endTime - this.currentSession.startTime;

        // Subtopic'i tamamlandı olarak işaretle
        this.userProgress.completeSubtopic(
            this.currentSession.subtopicId,
            this.currentSession.unitId,
            this.currentSession.topicId
        );

        // Perfect score badge kontrolü
        const hadAnyWrong = Object.keys(this.currentSession.wrongAnswerCount).length > 0;
        if (!hadAnyWrong) {
            this.checkPerfectScoreBadge();
        }

        this.checkSpeedBadge();
        
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
            perfectScore: Object.keys(this.currentSession.wrongAnswerCount).length === 0
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
            this.userProgress.unlockBadge('geo_detective');
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
}

// Global instance
window.gameEngineInstance = null;
