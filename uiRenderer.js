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

    // ========== SUBTOPIC CONTENT GENERATION ==========
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
        const required = ['mainText', 'geoInfo', 'questions'];
        for (const field of required) {
            if (!content[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        if (!Array.isArray(content.questions) || content.questions.length === 0) {
            throw new Error('Questions array is empty or invalid');
        }

        // Her sorunun en az 3 seçeneği ve 1 doğru cevabı olmalı
        content.questions.forEach((q, i) => {
            if (!q.options || q.options.length < 3) {
                throw new Error(`Question ${i} has insufficient options`);
            }
            const hasCorrect = q.options.some(o => o.correct === true);
            if (!hasCorrect) {
                throw new Error(`Question ${i} has no correct answer marked`);
            }
            // qId ekle eğer yoksa
            if (!q.qId) {
                q.qId = Helpers.generateId('q');
            }
        });

        // geoReferences yoksa boş array yap
        if (!content.geoReferences) {
            content.geoReferences = [];
        }

        // interactiveWords yoksa boş array yap
        if (!content.interactiveWords) {
            content.interactiveWords = [];
        }
    }

    // ========== WORD EXPLANATION ==========
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

    // ========== CORE API CALL (via Apps Script Proxy) ==========
    async callGeminiAPI(prompt, maxTokens = 1000) {
        const response = await fetch(this.proxyURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: prompt,
                maxTokens: maxTokens
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Gemini API error (${response.status}): ${errorBody}`);
        }

        const data = await response.json();
        return data;
    }

    extractTextResponse(apiResponse) {
        // Gemini API response yapısı: { candidates: [{ content: { parts: [{ text: "..." }] } }] }
        try {
            if (apiResponse.candidates && apiResponse.candidates.length > 0) {
                const parts = apiResponse.candidates[0].content.parts;
                if (parts && parts.length > 0) {
                    return parts.map(p => p.text).join('\n').trim();
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
        
        // JSON fence'leri temizle (```json ... ```)
        const cleaned = text
            .replace(/```json\s*/g, '')
            .replace(/```\s*/g, '')
            .trim();

        try {
            return JSON.parse(cleaned);
        } catch (error) {
            Logger.error('JSON parsing failed', { text: cleaned, error });
            throw new Error(CONSTANTS.ERRORS.PARSING_ERROR);
        }
    }

    // ========== RETRY LOGIC ==========
    async callWithRetry(fn, maxRetries = 2, delay = 1000) {
        let lastError;
        
        for (let i = 0; i <= maxRetries; i++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                Logger.warn(`API call failed, attempt ${i + 1}/${maxRetries + 1}`, error);
                
                if (i < maxRetries) {
                    await Helpers.sleep(delay * (i + 1));
                }
            }
        }
        
        throw lastError;
    }
}

// Global instance
window.aiProviderInstance = null;
