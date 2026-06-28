// ==========================================
// JS/MODULES/GEOSERVICES.JS
// Map & Geocoding Services (Leaflet + Nominatim)
// ==========================================

class GeoServices {
    constructor() {
        this.map = null;
        this.markers = [];
        this.geocodeCache = Helpers.loadFromStorage('kpss_geocode_cache', {});
    }

    // ========== GEOCODING (Nominatim) ==========
    async getCoordinates(placeName) {
        const cacheKey = Helpers.slugify(placeName);
        if (this.geocodeCache[cacheKey]) {
            return this.geocodeCache[cacheKey];
        }

        try {
            const url = `${CONFIG.APIS.NOMINATIM}?q=${encodeURIComponent(placeName)}&format=json&limit=1&accept-language=tr`;
            
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'KPSS-Tarih-App/1.0'
                }
            });

            if (!response.ok) {
                throw new Error(`Nominatim API error: ${response.status}`);
            }

            const data = await response.json();

            if (data.length === 0) {
                Logger.warn(`No coordinates found for: ${placeName}`);
                return null;
            }

            const result = {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon),
                displayName: data[0].display_name
            };

            this.geocodeCache[cacheKey] = result;
            this.saveGeocodeCache();

            return result;
        } catch (error) {
            Logger.error(`Geocoding failed for: ${placeName}`, error);
            return null;
        }
    }

    saveGeocodeCache() {
        Helpers.saveToStorage('kpss_geocode_cache', this.geocodeCache);
    }

    // ========== MAP INITIALIZATION ==========
    initMap(containerId, options = {}) {
        if (this.map) {
            this.destroyMap();
        }

        const container = document.getElementById(containerId);
        if (!container) {
            Logger.error(`Map container not found: ${containerId}`);
            return null;
        }

        const center = options.center || CONFIG.MAP.DEFAULT_CENTER;
        const zoom = options.zoom || CONFIG.MAP.DEFAULT_ZOOM;

        this.map = L.map(containerId, {
            zoomControl: true,
            attributionControl: true
        }).setView(center, zoom);

        L.tileLayer(CONFIG.MAP.TILE_LAYER, {
            attribution: CONFIG.MAP.ATTRIBUTION,
            maxZoom: 18
        }).addTo(this.map);

        Logger.info('Map initialized', { containerId, center, zoom });
        return this.map;
    }

    destroyMap() {
        if (this.map) {
            this.map.remove();
            this.map = null;
            this.markers = [];
        }
    }

    // ========== MARKERS ==========
    addPin(lat, lng, label, options = {}) {
        if (!this.map) {
            Logger.error('Map not initialized');
            return null;
        }

        if (!Helpers.isValidCoordinate(lat, lng)) {
            Logger.warn(`Invalid coordinates: ${lat}, ${lng}`);
            return null;
        }

        const icon = options.icon || this.createCustomIcon(options.iconType || 'default');

        const marker = L.marker([lat, lng], { icon })
            .bindPopup(`<strong>${label}</strong>${options.description ? `<br>${options.description}` : ''}`)
            .addTo(this.map);

        this.markers.push(marker);
        return marker;
    }

    createCustomIcon(type = 'default') {
        const icons = {
            default: '📍',
            capital: '🏛️',
            river: '🌊',
            mountain: '⛰️',
            battle: '⚔️',
            culture: '🏺'
        };

        return L.divIcon({
            html: `<div style="font-size: 24px;">${icons[type] || icons.default}</div>`,
            className: 'custom-map-icon',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
    }

    addMultiplePins(locations) {
        const bounds = [];
        
        locations.forEach(loc => {
            if (loc.coords && loc.coords[0] && loc.coords[1]) {
                this.addPin(loc.coords[0], loc.coords[1], loc.place, {
                    description: loc.context
                });
                bounds.push(loc.coords);
            }
        });

        if (bounds.length > 0) {
            this.fitBounds(bounds);
        }
    }

    clearMarkers() {
        this.markers.forEach(marker => marker.remove());
        this.markers = [];
    }

    // ========== MAP CONTROLS ==========
    panTo(lat, lng, zoom = null) {
        if (!this.map) return;
        
        if (zoom) {
            this.map.setView([lat, lng], zoom);
        } else {
            this.map.panTo([lat, lng]);
        }
    }

    fitBounds(coordsArray) {
        if (!this.map || coordsArray.length === 0) return;
        
        const bounds = L.latLngBounds(coordsArray);
        this.map.fitBounds(bounds, { padding: [50, 50] });
    }

    setZoom(zoom) {
        if (this.map) {
            this.map.setZoom(zoom);
        }
    }

    // ========== AREA DRAWING (Bölge çizimi) ==========
    drawArea(coordsArray, options = {}) {
        if (!this.map) return null;

        const polygon = L.polygon(coordsArray, {
            color: options.color || CONFIG.COLORS.accent,
            fillColor: options.fillColor || CONFIG.COLORS.accent,
            fillOpacity: options.fillOpacity || 0.2,
            weight: 2
        }).addTo(this.map);

        return polygon;
    }

    drawCircleArea(lat, lng, radiusKm, options = {}) {
        if (!this.map) return null;

        const circle = L.circle([lat, lng], {
            radius: radiusKm * 1000,
            color: options.color || CONFIG.COLORS.accent,
            fillColor: options.fillColor || CONFIG.COLORS.accent,
            fillOpacity: options.fillOpacity || 0.2
        }).addTo(this.map);

        return circle;
    }

    // ========== GEO REFERENCE DETECTION (Text parsing fallback) ==========
    detectPotentialPlaces(text) {
        const matches = text.match(CONSTANTS.PATTERNS.PLACE_NAME) || [];
        return [...new Set(matches)];
    }
}

// Global instance
window.geoServicesInstance = null;
