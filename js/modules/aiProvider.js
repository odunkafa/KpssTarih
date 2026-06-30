// ==========================================
// JS/MODULES/AIPROVIDER.JS
// Google Gemini API Integration via Apps Script Proxy
// ==========================================

class AIProvider {
    constructor() {
        this.proxyURL = 'https://script.google.com/macros/s/AKfycbyblvsUJc7mCn2daEOmTGgITmMnj0kxZ2lGDqduDRATQN-kQiJo4gWT2rFLnq0ljDGy/exec';
    }

    isConfigured() {
        return this.proxyURL && this.proxyURL.length > 0;
    }

    async generateSubtopicContent(unitName, topicName, subtopicName) {
        if (!this.isConfigured()) {
            throw new Error(CONSTANTS.ERRORS.API_KEY_MISSING);
        }

        const prompt = this.buildSubtopicPrompt(unitName, topicName, subtopicName);

        try {
            const response = await this.callGeminiAPI(prompt, 2000);
            const content = this.parseJSONResponse(response);
            this.validateSubtopicContent(content);
            return content;
        } catch (error) {
            Logger.error('AI content generation failed', error);
            throw error;
        }
    }

    buildSubtopicPrompt(unitName, topicName, subtopicName) {
        return CONFIG.PROMPTS.SUBTOPIC_CONTENT
            .replace('{unit}', unitName)
            .replace('{topic}', topicName)
            .replace('{subtopic}', subtopicName)
            .replace('{curriculum}', 'KPSS Tarih Müfredatı (Resmi)');
    }

    validateSubtopicContent(content) {
        const required = ['lessonCards', 'quickTest', 'matchPairs', 'fullTest', 'flashcards'];
        for (const field of required) {
            if (!Array.isArray(content[field]) || content[field].length === 0) {
                throw new Error('Missing or empty required field: ' + field);
            }
        }

        content.lessonCards.forEach(function(card, i) {
            if (!card.title || !card.text || !card.quiz) {
                throw new Error('lessonCards[' + i + '] is missing title/text/quiz');
            }
            if (!Array.isArray(card.quiz.opts) || card.quiz.opts.length < 3) {
                throw new Error('lessonCards[' + i + '] quiz has insufficient options');
            }
        });

        content.quickTest.forEach(function(q, i) {
            if (!Array.isArray(q.opts) || q.opts.length < 3) {
                throw new Error('quickTest[' + i + '] has insufficient options');
            }
            if (typeof q.correct !== 'number') {
                throw new Error('quickTest[' + i + '] missing correct index');
            }
        });

        content.fullTest.forEach(function(q, i) {
            if (!Array.isArray(q.opts) || q.opts.length < 4) {
                throw new Error('fullTest[' + i + '] has insufficient options');
            }
            if (typeof q.correct !== 'number') {
                throw new Error('fullTest[' + i + '] missing correct index');
            }
        });

        content.matchPairs.forEach(function(p, i) {
            if (!p.term || !p.def) {
                throw new Error('matchPairs[' + i + '] missing term/def');
            }
        });

        content.flashcards.forEach(function(c, i) {
            if (!c.front || !c.back) {
                throw new Error('flashcards[' + i + '] missing front/back');
            }
        });
    }

    async generateWordExplanation(word, context) {
        if (!this.isConfigured()) {
            return 'AI servisi yapılandırılmamış.';
        }

        const prompt = CONFIG.PROMPTS.WORD_EXPLANATION
            .replace('{word}', word)
            .replace('{context}', context);

        try {
            const response = await this.callGeminiAPI(prompt, 200);
            return this.extractTextResponse(response);
        } catch (error) {
            Logger.error('Word explanation generation failed', error);
            return 'Açıklama yüklenirken bir hata oluştu.';
        }
    }

    async callGeminiAPI(prompt, maxTokens) {
        const response = await fetch(this.proxyURL, {
            method: 'POST',
            body: JSON.stringify({
                prompt: prompt,
                maxTokens: maxTokens
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error('Gemini API error (' + response.status + '): ' + errorBody);
        }

        const data = await response.json();
        return data;
    }

    extractTextResponse(apiResponse) {
        try {
            if (apiResponse.candidates && apiResponse.candidates.length > 0) {
                const parts = apiResponse.candidates[0].content.parts;
                if (parts && parts.length > 0) {
                    return parts.map(function(p) { return p.text; }).join('\n').trim();
                }
            }
            return '';
        } catch (error) {
            Logger.error('Response extraction failed', error);
            return '';
        }
    }

    parseJSONResponse(apiResponse) {
        const text = this.extractTextResponse(apiResponse);

        const cleaned = text
            .replace(/```json\s*/g, '')
            .replace(/```\s*/g, '')
            .trim();

        try {
            return JSON.parse(cleaned);
        } catch (error) {
            Logger.error('JSON parsing failed', { text: cleaned, error: error });
            throw new Error(CONSTANTS.ERRORS.PARSING_ERROR);
        }
    }

    async callWithRetry(fn, maxRetries, delay) {
        maxRetries = maxRetries || 2;
        delay = delay || 1000;
        var lastError;

        for (var i = 0; i <= maxRetries; i++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                Logger.warn('API call failed, attempt ' + (i + 1) + '/' + (maxRetries + 1), error);
                if (i < maxRetries) {
                    await Helpers.sleep(delay * (i + 1));
                }
            }
        }

        throw lastError;
    }
}

window.aiProviderInstance = null;
