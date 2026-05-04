// activityTracker.js
// -----------------------------------------------------------------------------
// Tracks "active time" — wall-clock time minus periods where the user isn't
// actually paying attention. Used by Aleym to compute accurate durations for
// Appearance, Focus, and Read feedback signals.
//
// What counts as inactive:
//   - document.visibilityState === "hidden" (tab switched, window minimized)
//   - window blurred (focus moved to another app)
//   - Idle Detection API reports "idle" or screen "locked"
//     (https://developer.mozilla.org/en-US/docs/Web/API/Idle_Detection_API)
//   - When Idle Detection is unavailable or permission denied, falls back to
//     "no mouse/keyboard/touch/scroll input for IDLE_FALLBACK_MS"
//
// The Idle Detection API:
//   - Chromium-only at time of writing (Firefox/Safari don't ship it)
//   - Requires a permission via navigator.permissions.request(...) which
//     itself requires a transient user activation (a click, key press, etc.)
//   - Threshold minimum is 60 seconds — we can't ask for finer granularity
//
// Design:
//   - A single global IdleMonitor that watches visibility/focus/idle and
//     emits "active"/"inactive" state changes
//   - Per-target ActivitySessions that subscribe to the monitor and
//     accumulate active-time
// -----------------------------------------------------------------------------

const IDLE_THRESHOLD_SECONDS = 60; // Idle Detection API minimum
const IDLE_FALLBACK_MS = 60_000; // when Idle Detection isn't available
const INPUT_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "wheel",
];

// -----------------------------------------------------------------------------
// IdleMonitor — singleton that publishes the user's overall active/inactive state
// -----------------------------------------------------------------------------

class IdleMonitor {
  constructor() {
    this._listeners = new Set();
    this._active = this._computeInitialActive();

    // For the input-based fallback when Idle Detection isn't available
    this._lastInputAt = Date.now();
    this._fallbackTimer = null;
    this._fallbackEnabled = false;

    // Idle Detection API state
    this._idleDetector = null;
    this._idleApiActive = false; // true once we've successfully started one
    this._idleApiPermission = null; // null | "granted" | "denied" | "unsupported"

    // Always wire visibility/focus — those work everywhere and are cheap
    this._onVisibilityChange = this._onVisibilityChange.bind(this);
    this._onWindowFocus = this._onWindowFocus.bind(this);
    this._onWindowBlur = this._onWindowBlur.bind(this);
    this._onInput = this._onInput.bind(this);
    this._onIdleDetectorChange = this._onIdleDetectorChange.bind(this);

    document.addEventListener("visibilitychange", this._onVisibilityChange);
    window.addEventListener("focus", this._onWindowFocus);
    window.addEventListener("blur", this._onWindowBlur);

    // The fallback (input-based idle) is enabled by default and gets disabled
    // if Idle Detection API takes over.
    this._enableFallback();

    // Try to use Idle Detection API on first user gesture (browsers require
    // a transient activation for the permission prompt).
    this._setupIdleDetectionLazily();
  }

  // --- Public API ---------------------------------------------------------

  isActive() {
    return this._active;
  }

  /** Subscribe to active/inactive transitions. Returns an unsubscribe fn. */
  subscribe(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  /**
   * The current state of the Idle Detection API: "granted" | "denied" |
   * "unsupported" | null (not yet attempted). Useful for diagnostics.
   */
  idleApiState() {
    return this._idleApiPermission;
  }

  // --- Internals ----------------------------------------------------------

  _computeInitialActive() {
    if (typeof document === "undefined") return true;
    if (document.visibilityState === "hidden") return false;
    if (document.hasFocus && !document.hasFocus()) return false;
    return true;
  }

  _setActive(next) {
    if (next === this._active) return;
    this._active = next;
    for (const fn of this._listeners) {
      try {
        fn(next);
      } catch (e) {
        console.error("[activityTracker] listener threw:", e);
      }
    }
  }

  /**
   * Recompute the active flag from all signals. Active iff:
   *   - document is visible
   *   - window has focus (best-effort)
   *   - we don't believe the user is idle
   */
  _recompute() {
    const visible = document.visibilityState !== "hidden";
    const focused = document.hasFocus ? document.hasFocus() : true;

    let notIdle;
    if (this._idleApiActive) {
      // Idle Detection API is the source of truth when available.
      // We track its state via _onIdleDetectorChange and store it on _idleApiState.
      notIdle =
        this._idleUserState !== "idle" && this._idleScreenState !== "locked";
    } else {
      // Input-based fallback: idle if no input event in IDLE_FALLBACK_MS.
      notIdle = Date.now() - this._lastInputAt < IDLE_FALLBACK_MS;
    }

    this._setActive(visible && focused && notIdle);
  }

  _onVisibilityChange() {
    this._recompute();
  }
  _onWindowFocus() {
    this._recompute();
  }
  _onWindowBlur() {
    this._recompute();
  }

  _onInput() {
    this._lastInputAt = Date.now();
    // If we were idle due to the fallback, we're not anymore.
    if (!this._idleApiActive) this._recompute();
  }

  _enableFallback() {
    if (this._fallbackEnabled) return;
    this._fallbackEnabled = true;
    for (const ev of INPUT_EVENTS) {
      window.addEventListener(ev, this._onInput, {
        passive: true,
        capture: true,
      });
    }
    // Periodically recompute so we transition to inactive even when no event fires.
    this._fallbackTimer = setInterval(() => {
      if (!this._idleApiActive) this._recompute();
    }, 5_000);
  }

  _disableFallback() {
    if (!this._fallbackEnabled) return;
    this._fallbackEnabled = false;
    for (const ev of INPUT_EVENTS) {
      window.removeEventListener(ev, this._onInput, { capture: true });
    }
    if (this._fallbackTimer) {
      clearInterval(this._fallbackTimer);
      this._fallbackTimer = null;
    }
  }

  _setupIdleDetectionLazily() {
    if (typeof window === "undefined") return;
    if (typeof window.IdleDetector === "undefined") {
      this._idleApiPermission = "unsupported";
      return;
    }

    // Permission request needs a user gesture. Wait for one click anywhere.
    const onceClick = async () => {
      window.removeEventListener("pointerdown", onceClick, true);
      try {
        // Some browsers expose this via Permissions API first.
        let permission;
        try {
          permission = await window.IdleDetector.requestPermission();
        } catch {
          permission = "denied";
        }

        if (permission !== "granted") {
          this._idleApiPermission = "denied";
          return; // stick with input-based fallback
        }

        const detector = new window.IdleDetector();
        detector.addEventListener("change", this._onIdleDetectorChange);
        await detector.start({ threshold: IDLE_THRESHOLD_SECONDS * 1000 });

        this._idleDetector = detector;
        this._idleUserState = detector.userState; // "active" | "idle"
        this._idleScreenState = detector.screenState; // "locked" | "unlocked"
        this._idleApiActive = true;
        this._idleApiPermission = "granted";

        // Idle API is now the authority — disable the input-based fallback.
        this._disableFallback();
        this._recompute();
      } catch (err) {
        // Most likely an AbortError or a permissions issue. Fall back silently.
        console.debug(
          "[activityTracker] Idle Detection API failed, using fallback:",
          err,
        );
        this._idleApiPermission = "denied";
      }
    };

    window.addEventListener("pointerdown", onceClick, true);
  }

  _onIdleDetectorChange() {
    if (!this._idleDetector) return;
    this._idleUserState = this._idleDetector.userState;
    this._idleScreenState = this._idleDetector.screenState;
    this._recompute();
  }
}

// Lazy singleton — only created when first used so importing this module is
// side-effect-free in non-browser environments (e.g. tests).
let _monitor = null;
function getMonitor() {
  if (!_monitor && typeof window !== "undefined") _monitor = new IdleMonitor();
  return _monitor;
}

// -----------------------------------------------------------------------------
// ActivitySession — accumulates active time across pause/resume cycles
// -----------------------------------------------------------------------------

export class ActivitySession {
  constructor() {
    const monitor = getMonitor();
    this._monitor = monitor;
    this._accumulatedMs = 0;
    this._segmentStart = null; // ms timestamp when current active segment began
    this._stopped = false;
    this._unsubscribe = null;

    if (monitor) {
      // Begin a segment immediately if user is active.
      if (monitor.isActive()) this._segmentStart = Date.now();

      this._unsubscribe = monitor.subscribe((active) => {
        if (this._stopped) return;
        if (active) {
          // Resume: open a new segment.
          if (this._segmentStart === null) this._segmentStart = Date.now();
        } else {
          // Pause: close the current segment and bank the time.
          if (this._segmentStart !== null) {
            this._accumulatedMs += Date.now() - this._segmentStart;
            this._segmentStart = null;
          }
        }
      });
    } else {
      // SSR / non-browser — degenerate to wall-clock with a fixed start.
      this._segmentStart = Date.now();
    }
  }

  /** Active milliseconds accumulated so far. Safe to call any time. */
  getActiveMs() {
    let total = this._accumulatedMs;
    if (this._segmentStart !== null) total += Date.now() - this._segmentStart;
    return total;
  }

  /** Stop tracking and return the final active duration in ms. */
  stop() {
    if (this._stopped) return this._accumulatedMs;
    this._stopped = true;
    if (this._segmentStart !== null) {
      this._accumulatedMs += Date.now() - this._segmentStart;
      this._segmentStart = null;
    }
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
    return this._accumulatedMs;
  }
}

/** Diagnostic accessor — handy for showing API state in dev tools. */
export function getIdleApiState() {
  const m = getMonitor();
  return m ? m.idleApiState() : null;
}
