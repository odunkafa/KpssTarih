// ==========================================
// JS/MODULES/CONTENTPOOL.JS
// Content Caching & AI Integration
// ==========================================

class ContentPool {
    constructor() {
        this.cache = Helpers.loadFromStorage(CONFIG.LOCAL_STORAGE_KEYS.CONTENT_POOL, {});
        this.aiProvider = null; // app.js'de set edilecek
    }

    setAIProvider(provider) {
        this.aiProvider = provider;
    }

    // ========== SUBTOPIC CONTENT ==========
    async getSubtopicContent(unitId, topicId, subtopicId, curriculumData) {
        const cacheKey = `subtopic_${subtopicId}`;
        
        // 1. Cache'de var mı kontrol et
        if (this.cache[cacheKey]) {
            Logger.info(`Content found in cache: ${cacheKey}`);
            return this.cache[cacheKey];
        }

        Logger.info(`Generating new content for: ${cacheKey}`);

        // 2. Cache'de yoksa AI'dan generate et
        try {
            const subtopicInfo = this.findSubtopicInfo(curriculumData, unitId, topicId, subtopicId);
            
            if (!subtopicInfo) {
                throw new Error(`Subtopic not found: ${subtopicId}`);
            }

            const content = await this.generateContent(subtopicInfo);
            
            // 3. Geo references için coordinates çek
            if (content.geoReferences && content.geoReferences.length > 0) {
                content.geoReferences = await this.enrichGeoReferences(content.geoReferences);
            }

            // 4. Cache'e kaydet
            this.cache[cacheKey] = content;
            this.saveCache();

            return content;
        } catch (error) {
            Logger.error('Content generation failed', error);
            throw error;
        }
    }

    findSubtopicInfo(curriculumData, unitId, topicId, subtopicId) {
        const unit = curriculumData.units.find(u => u.unitId === unitId);
        if (!unit) return null;

        const topic = unit.topics.find(t => t.topicId === topicId);
        if (!topic) return null;

        const subtopic = topic.subtopics.find(s => s.subtopicId === subtopicId);
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
        const geoServices = window.geoServicesInstance;
        if (!geoServices) {
            Logger.warn('GeoServices not available, skipping coordinate enrichment');
            return geoReferences;
        }

        const enriched = [];
        for (const ref of geoReferences) {
            try {
                const coords = await geoServices.getCoordinates(ref.place);
                enriched.push({
                    ...ref,
                    coords: coords ? [coords.lat, coords.lng] : null,
                    displayName: coords ? coords.displayName : ref.place
                });
            } catch (error) {
                Logger.warn(`Could not get coordinates for: ${ref.place}`);
                enriched.push({ ...ref, coords: null });
            }
        }
        return enriched;
    }

    // ========== WORD EXPLANATION (Interactive Words) ==========
    async getWordExplanation(word, context) {
        const cacheKey = `word_${Helpers.slugify(word)}_${Helpers.slugify(context.substring(0, 30))}`;
        
        if (this.cache[cacheKey]) {
            return this.cache[cacheKey];
        }

        if (!this.aiProvider) {
            return 'Açıklama yüklenemiyor (AI servisi bağlı değil).';
        }

        try {
            const explanation = await this.aiProvider.generateWordExplanation(word, context);
            this.cache[cacheKey] = explanation;
            this.saveCache();
            return explanation;
        } catch (error) {
            Logger.error('Word explanation failed', error);
            return 'Açıklama yüklenirken bir hata oluştu.';
        }
    }

    // ========== CACHE MANAGEMENT ==========
    saveCache() {
        Helpers.saveToStorage(CONFIG.LOCAL_STORAGE_KEYS.CONTENT_POOL, this.cache);
    }

    clearCache() {
        this.cache = {};
        Helpers.removeFromStorage(CONFIG.LOCAL_STORAGE_KEYS.CONTENT_POOL);
        Logger.info('Content pool cache cleared');
    }

    getCacheSize() {
        return Object.keys(this.cache).length;
    }

    getCacheStats() {
        const keys = Object.keys(this.cache);
        const subtopics = keys.filter(k => k.startsWith('subtopic_')).length;
        const words = keys.filter(k => k.startsWith('word_')).length;
        
        return {
            total: keys.length,
            subtopics,
            words,
            sizeKB: Math.round(JSON.stringify(this.cache).length / 1024)
        };
    }

    // ========== PRELOAD (opsiyonel optimizasyon) ==========
    async preloadNextSubtopic(unitId, topicId, subtopicId, curriculumData) {
        // Background'da bir sonraki konuyu önceden yükle (UX iyileştirmesi)
        try {
            await this.getSubtopicContent(unitId, topicId, subtopicId, curriculumData);
            Logger.info(`Preloaded: ${subtopicId}`);
        } catch (error) {
            Logger.warn(`Preload failed for: ${subtopicId}`, error);
        }
    }
}

// Global instance
window.contentPoolInstance = null;
