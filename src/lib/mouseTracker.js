/**
 * Mouse movement tracker - Enhanced v2.
 * - 5s rolling window for faster activity detection
 * - Direction changes per second (jerkiness)
 * - Idle burst detection (mouse paused > 3s)
 * - Periodic tick so idle state is emitted even without mouse movement
 */

export class MouseTracker {
    constructor(windowMs = 5000) {
        this.windowMs = windowMs;
        this.positions = [];
        this.isListening = false;
        this.onUpdate = null;
        this._moveHandler = null;
        this._clickHandler = null;
        this._tickTimer = null;
        this.clickCount = 0;
        this.totalDistance = 0;
        this.lastPos = null;
        this._target = null;
        this.startError = null;

        this.lastDx = 0;
        this.lastDy = 0;
        this.directionChanges = 0;
        this.dirChangesWindow = [];

        this.idlePauses = 0;
        this.lastMoveTime = Date.now();
        this.IDLE_THRESHOLD_MS = 3000;
    }

    start(onUpdate) {
        if (this.isListening) {
            this.onUpdate = onUpdate;
            return;
        }
        this.onUpdate = onUpdate;
        this.lastMoveTime = Date.now();
        this.startError = null;

        this._usePointer = typeof window !== "undefined" && "PointerEvent" in window;
        this._moveEvent = this._usePointer ? "pointermove" : "mousemove";
        this._clickEvent = this._usePointer ? "pointerdown" : "mousedown";

        this._moveHandler = (e) => {
            if (this._usePointer && e.pointerType && e.pointerType !== "mouse" && e.pointerType !== "") return;
            const now = Date.now();

            if (now - this.lastMoveTime > this.IDLE_THRESHOLD_MS) {
                this.idlePauses++;
            }
            this.lastMoveTime = now;

            const pos = { x: e.clientX, y: e.clientY, t: now };

            if (this.lastPos) {
                const dx = pos.x - this.lastPos.x;
                const dy = pos.y - this.lastPos.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                this.totalDistance += dist;

                if (dist > 3) {
                    if (
                        (this.lastDx !== 0 && Math.sign(dx) !== Math.sign(this.lastDx)) ||
                        (this.lastDy !== 0 && Math.sign(dy) !== Math.sign(this.lastDy))
                    ) {
                        this.directionChanges++;
                        this.dirChangesWindow.push(now);
                        this.dirChangesWindow = this.dirChangesWindow.filter(t => t > now - 10000);
                    }
                    if (Math.abs(dx) > 3) this.lastDx = dx;
                    if (Math.abs(dy) > 3) this.lastDy = dy;
                }
            }
            this.lastPos = pos;
            this.positions.push(pos);
            this._cleanup();
            this._emitUpdate();
        };

        this._clickHandler = (e) => {
            if (this._usePointer && e.pointerType && e.pointerType !== "mouse" && e.pointerType !== "") return;
            if (typeof e.button === "number" && e.button !== 0) return;
            this.clickCount++;
            this._emitUpdate();
        };

        // Periodic tick: re-emit metrics every 500ms so idle state is detected
        // even when the mouse has not moved.
        this._tickTimer = setInterval(() => {
            this._cleanup();
            this._emitUpdate();
        }, 500);

        try {
            const target = typeof document !== "undefined" ? document : window;
            this._target = target;
            // Capture on document so overlays / stopPropagation cannot hide activity.
            target.addEventListener(this._moveEvent, this._moveHandler, { capture: true, passive: true });
            target.addEventListener(this._clickEvent, this._clickHandler, { capture: true });
            this.isListening = true;
        } catch (err) {
            this.startError = err && err.message ? err.message : String(err);
            this.isListening = false;
        }
    }

    stop() {
        const target = this._target || (typeof document !== "undefined" ? document : window);
        if (this._moveHandler) {
            target.removeEventListener(this._moveEvent || "pointermove", this._moveHandler, { capture: true });
            this._moveHandler = null;
        }
        if (this._clickHandler) {
            target.removeEventListener(this._clickEvent || "pointerdown", this._clickHandler, { capture: true });
            this._clickHandler = null;
        }
        if (this._tickTimer) {
            clearInterval(this._tickTimer);
            this._tickTimer = null;
        }
        this.isListening = false;
    }

    _cleanup() {
        const cutoff = Date.now() - this.windowMs;
        this.positions = this.positions.filter((p) => p.t > cutoff);
        // Also prune direction-change window
        const dcCutoff = Date.now() - 10000;
        this.dirChangesWindow = this.dirChangesWindow.filter(t => t > dcCutoff);
    }

    _emitUpdate() {
        if (!this.onUpdate) return;
        this.onUpdate(this.getMetrics());
    }

    getMetrics() {
        this._cleanup();

        // Speed: average pixels/second across positions in the window
        let speed = 0;
        if (this.positions.length >= 2) {
            let totalDist = 0;
            for (let i = 1; i < this.positions.length; i++) {
                const dx = this.positions[i].x - this.positions[i - 1].x;
                const dy = this.positions[i].y - this.positions[i - 1].y;
                totalDist += Math.sqrt(dx * dx + dy * dy);
            }
            const timeSpan = (this.positions[this.positions.length - 1].t - this.positions[0].t) / 1000;
            speed = timeSpan > 0 ? Math.round(totalDist / timeSpan) : 0;
        }

        // Active: any movement in the last 2 seconds
        const recentCutoff = Date.now() - 2000;
        const isActive = this.positions.some((p) => p.t > recentCutoff);

        // Intensity: how densely packed the window is (0-100)
        const intensity = Math.min(100, Math.round((this.positions.length / 40) * 100));

        // Jerkiness: direction changes per second in last 10s (0-100)
        const jerkiness = Math.min(100, Math.round((this.dirChangesWindow.length / 10) * 100));

        return {
            speed,
            totalDistance: Math.round(this.totalDistance),
            clickCount: this.clickCount,
            isActive,
            intensity,
            positionsInWindow: this.positions.length,
            directionChanges: this.dirChangesWindow.length,
            jerkiness,
            idlePauses: this.idlePauses,
            idleMs: Math.max(0, Date.now() - this.lastMoveTime),
            listening: this.isListening,
            startError: this.startError || null,
        };
    }
}