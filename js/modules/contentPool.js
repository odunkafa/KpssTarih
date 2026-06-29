// ==========================================
// JS/MODULES/CONTENTPOOL.JS
// Content Caching & AI Integration
// Önce Sheets'ten kontrol, yoksa AI üret, Sheets'e kaydet
// ==========================================

class ContentPool {
    constructor() {
        this.localCache = Helpers.loadFromStorage(CONFIG.LOCAL_STORAGE_KEYS.CONTENT_POOL, {});
        this.aiProvider = null;
        this.proxyURL = 'https://script.google.com/macros/s/AKfycbyblvsUJc7mCn2daEOmTGgITmMnj0kxZ2lGDqduDRATQN-kQiJo4gWT2rFLnq0ljDGy/exec';
    }

    setAIProvider(provider) {
        this.aiProvider = provider;
    }

    // ========== SUBTOPIC CONTENT ==========
    async getSubtopicContent(unitId, topicId, subtopicId, curriculumData) {
        var cacheKey = 'subtopic_' + subtopicId;

        // 1. localStorage'da var mı?
        if (this.localCache[cacheKey]) {
            Logger.info('Content found in localStorage: ' + cacheKey);
            return this.localCache[cacheKey];
        }

        // 2. Google Sheets'te var mı?
        try {
            var sheetsContent = await this.loadFromSheets(subtopicId);
            if (sheetsContent) {
                Logger.info('Content found in Sheets: ' + cacheKey);
                this.localCache[cacheKey] = sheetsContent;
                this.saveLocalCache();
                return sheetsContent;
            }
        } catch (error) {
            Logger.warn('Sheets load failed, will try AI: ' + error);
        }

        // 3. Hiçbir yerde yok, AI'dan üret
        Logger.info('Generating new content for: ' + cacheKey);

        try {
            var subtopicInfo = this.findSubtopicInfo(curriculumData, unitId, topicId, subtopicId);

            if (!subtopicInfo) {
                throw new Error('Subtopic not found: ' + subtopicId);
            }

            var content = await this.generateContent(subtopicInfo);

            // Geo references için coordinates çek
            if (content.geoReferences && content.geoReferences.length > 0) {
                content.geoReferences = await this.enrichGeoReferences(content.geoReferences);
            }

            // 4. localStorage'a kaydet
            this.localCache[cacheKey] = content;
            this.saveLocalCache();

            // 5. Google Sheets'e kaydet (arka planda)
            this.saveToSheets(subtopicId, content);

            return content;
        } catch (error) {
            Logger.error('Content generation failed', error);
            throw error;
        }
    }

    findSubtopicInfo(curriculumData, unitId, topicId, subtopicId) {
        var unit = curriculumData.units.find(function(u) { return u.unitId === unitId; });
        if (!unit) return null;

        var topic = unit.topics.find(function(t) { return t.topicId === topicId; });
        if (!topic) return null;

        var subtopic = topic.subtopics.find(function(s) { return s.subtopicId === subtopicId; });
        if (!subtopic) return null;

        return {
            unitName: unit.unitName,
            topicName: topic.topicName,
            subtopicName: subtopic.subtopicName
        };
    }

    async generateContent(subtopicInfo) {
        if (!this.aiProvider) {
            throw new Error('AI Provider not initialized');
        }

        return await this.aiProvider.generateSubtopicContent(
            subtopicInfo.unitName,
            subtopicInfo.topicName,
            subtopicInfo.subtopicName
        );
    }

    async enrichGeoReferences(geoReferences) {
        var geoServices = window.geoServicesInstance;
        if (!geoServices) {
            Logger.warn('GeoServices not available, skipping coordinate enrichment');
            return geoReferences;
        }

        var enriched = [];
        for (var i = 0; i < geoReferences.length; i++) {
            var ref = geoReferences[i];
            try {
                var coords = await geoServices.getCoordinates(ref.place);
                enriched.push({
                    place: ref.place,
                    context: ref.context,
                    coords: coords ? [coords.lat, coords.lng] : null,
                    displayName: coords ? coords.displayName : ref.place
                });
            } catch (error) {
                Logger.warn('Could not get coordinates for: ' + ref.place);
                enriched.push({ place: ref.place, context: ref.context, coords: null });
            }
        }
        return enriched;
    }

    // ========== GOOGLE SHEETS OPERATIONS ==========
    async saveToSheets(subtopicId, content) {
        try {
            await fetch(this.proxyURL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'saveContent',
                    subtopicId: subtopicId,
                    content: content
                })
            });
            Logger.info('Content saved to Sheets: ' + subtopicId);
        } catch (error) {
            Logger.warn('Failed to save content to Sheets: ' + error);
        }
    }

    async loadFromSheets(subtopicId) {
        try {
            var response = await fetch(this.proxyURL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'loadContent',
                    subtopicId: subtopicId
                })
            });

            if (!response.ok) {
                return null;
            }

            var data = await response.json();

            if (data.success && data.content) {
                return data.content;
            }

            return null;
        } catch (error) {
            Logger.warn('Failed to load content from Sheets: ' + error);
            return null;
        }
    }

    // ========== WORD EXPLANATION (Interactive Words) ==========
    async getWordExplanation(word, context) {
        var cacheKey = 'word_' + Helpers.slugify(word) + '_' + Helpers.slugify(context.substring(0, 30));

        if (this.localCache[cacheKey]) {
            return this.localCache[cacheKey];
        }

        if (!this.aiProvider) {
            return 'Açıklama yüklenemiyor (AI servisi bağlı değil).';
        }

        try {
            var explanation = await this.aiProvider.generateWordExplanation(word, context);
            this.localCache[cacheKey] = explanation;
            this.saveLocalCache();
            return explanation;
        } catch (error) {
            Logger.error('Word explanation failed', error);
            return 'Açıklama yüklenirken bir hata oluştu.';
        }
    }

    // ========== LOCAL CACHE MANAGEMENT ==========
    saveLocalCache() {
        Helpers.saveToStorage(CONFIG.LOCAL_STORAGE_KEYS.CONTENT_POOL, this.localCache);
    }

    clearCache() {
        this.localCache = {};
        Helpers.removeFromStorage(CONFIG.LOCAL_STORAGE_KEYS.CONTENT_POOL);
        Logger.info('Content pool cache cleared');
    }

    getCacheSize() {
        return Object.keys(this.localCache).length;
    }

    getCacheStats() {
        var keys = Object.keys(this.localCache);
        var subtopics = keys.filter(function(k) { return k.startsWith('subtopic_'); }).length;
        var words = keys.filter(function(k) { return k.startsWith('word_'); }).length;

        return {
            total: keys.length,
            subtopics: subtopics,
            words: words,
            sizeKB: Math.round(JSON.stringify(this.localCache).length / 1024)
        };
    }

    async preloadNextSubtopic(unitId, topicId, subtopicId, curriculumData) {
        try {
            await this.getSubtopicContent(unitId, topicId, subtopicId, curriculumData);
            Logger.info('Preloaded: ' + subtopicId);
        } catch (error) {
            Logger.warn('Preload failed for: ' + subtopicId, error);
        }
    }
}

window.contentPoolInstance = null;
