/**
 * @fileoverview Feature flags for MindGuard Health & Wellness module.
 * Set any flag to false to disable that feature globally.
 */

/**
 * @typedef {Object} FeatureFlags
 * @property {boolean} hydrationReminders - Hydration reminder toasts with stress-adjusted intervals
 * @property {boolean} movementPrompts - Desk-stretch banner when user is inactive or fatigued
 * @property {boolean} breathingGuide - 4-7-8 breathing overlay for acute stress reduction
 * @property {boolean} sleepTracker - Daily sleep quality log with focus correlation chart
 * @property {boolean} screenDistanceAlert - Webcam-based screen distance warning via IPD estimation
 */

/** @type {FeatureFlags} */
export const FEATURES = {
  hydrationReminders: true,
  movementPrompts: true,
  breathingGuide: true,
  sleepTracker: true,
  screenDistanceAlert: true,
};
