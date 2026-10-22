/**
 * Typing speed tracker — Enhanced v2.
 * - Shorter 8s rolling window for more responsive WPM
 * - Inter-Key Interval (IKI) variance for cognitive strain detection
 * - Error rate (Backspace / total keys)
 */

export class TypingTracker {
    constructor(windowMs = 8000) {
        this.windowMs = windowMs;
        this.keyTimestamps = [];       // timestamps of all tracked keypresses in window
        this.ikiValues = [];           // inter-key intervals (ms)
        this.charCount = 0;            // total chars ever typed
        this.backspaceCount = 0;       // total backspaces (error indicator)
        this.totalKeys = 0;            // total keys including backspace
        this.lastKeyTime = null;
        this.isListening = false;
        this.onUpdate = null;
        this._handler = null;
    }

    /**
     * Start listening for global keypresses.
     * @param {function} onUpdate - Called with { wpm, charsInWindow, ikiVariance, errorRate }
     */
    start(onUpdate) {
        if (this.isListening) return;
        this.onUpdate = onUpdate;

        this._handler = (e) => {
            const now = Date.now();

            // Track all meaningful keys
            const isMeaningful =
                e.key.length === 1 ||
                e.key === " " ||
                e.key === "Enter" ||
                e.key === "Backspace" ||
                e.key === "Tab" ||
                e.key === "Delete";

            if (!isMeaningful) return;

            // IKI: time between successive keypresses
            if (this.lastKeyTime !== null) {
                const iki = now - this.lastKeyTime;
                if (iki < 3000) { // ignore very long gaps (user paused)
                    this.ikiValues.push(iki);
                    if (this.ikiValues.length > 200) this.ikiValues.shift();
                }
            }
            this.lastKeyTime = now;

            this.totalKeys++;
            if (e.key === "Backspace" || e.key === "Delete") {
                this.backspaceCount++;
            } else {
                this.charCount++;
                this.keyTimestamps.push(now);
            }

            this._cleanup();
            if (this.onUpdate) {
                this.onUpdate({
                    wpm: this.getWPM(),
                    charsInWindow: this.keyTimestamps.length,
                    ikiVariance: this.getIKIVariance(),
                    errorRate: this.getErrorRate(),
                    totalChars: this.charCount,
                });
            }
        };

        document.addEventListener("keydown", this._handler, true);
        this.isListening = true;
    }

    stop() {
        if (this._handler) {
            document.removeEventListener("keydown", this._handler, true);
            this._handler = null;
        }
        this.isListening = false;
    }

    _cleanup() {
        const cutoff = Date.now() - this.windowMs;
        this.keyTimestamps = this.keyTimestamps.filter((t) => t > cutoff);
    }

    /**
     * Calculate WPM using 8s rolling window, scaled to per-minute.
     */
    getWPM() {
        this._cleanup();
        const chars = this.keyTimestamps.length;
        const scale = 60000 / this.windowMs; // scale 8s → 60s
        return Math.round((chars / 5) * scale);
    }

    /**
     * IKI Variance — higher = more erratic typing = cognitive strain.
     * Returns 0-100 normalized score.
     */
    getIKIVariance() {
        const recent = this.ikiValues.slice(-50);
        if (recent.length < 5) return 0;
        const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
        const variance = recent.reduce((sum, v) => sum + (v - mean) ** 2, 0) / recent.length;
        const stdDev = Math.sqrt(variance);
        // Normalize: stdDev of ~0ms = 0, stdDev of ~500ms+ = 100
        return Math.min(100, Math.round((stdDev / 500) * 100));
    }

    /**
     * Error rate: backspace % of total keys. Higher = more mistakes.
     * Returns 0-100.
     */
    getErrorRate() {
        if (this.totalKeys === 0) return 0;
        return Math.min(100, Math.round((this.backspaceCount / this.totalKeys) * 100));
    }

    getTotalChars() {
        return this.charCount;
    }
}
