/**
 * @fileoverview Zod validation schemas for all MindGuard.ai API endpoints.
 *
 * Each schema is co-located near its use-case and exported for use in Route Handlers.
 * All schemas use `.strip()` to silently drop unknown keys (prevent parameter pollution).
 */

import { z } from "zod";

// ─── Profile ─────────────────────────────────────────────────────────────────

export const createProfileSchema = z
  .object({
    full_name: z.string().min(1).max(100),
    date_of_birth: z.string().date().optional().nullable(),
    gender: z.enum(["male", "female", "non_binary", "prefer_not_to_say"]).optional().nullable(),
    occupation: z.string().max(100).optional().nullable(),
    is_student: z.boolean().optional().default(false),
  })
  .strip();

export const updateProfileSchema = createProfileSchema.partial().strip();

// ─── Settings ────────────────────────────────────────────────────────────────

export const updateSettingsSchema = z
  .object({
    theme: z.enum(["void", "aurora", "solar"]).optional(),
    notification_preferences: z.record(z.boolean()).optional(),
    privacy_preferences: z.record(z.boolean()).optional(),
    baseline_settings: z.record(z.unknown()).optional(),
  })
  .strip();

// ─── Monitoring Sessions ──────────────────────────────────────────────────────

export const createSessionSchema = z
  .object({
    started_at: z.string().datetime({ offset: true }).optional(),
  })
  .strip();

export const endSessionSchema = z
  .object({
    ended_at: z.string().datetime({ offset: true }),
    duration_seconds: z.number().int().min(0),
    average_cognitive_load: z.number().min(0).max(100),
    average_stress: z.number().min(0).max(100),
    average_fatigue: z.number().min(0).max(100),
    average_focus: z.number().min(0).max(100),
    average_energy: z.number().min(0).max(100),
    average_recovery_need: z.number().min(0).max(100),
    average_burnout_risk: z.number().min(0).max(100),
    wellness_score: z.number().min(0).max(100),
  })
  .strip();

// ─── Sensor Snapshots ─────────────────────────────────────────────────────────

const snapshotSchema = z
  .object({
    timestamp: z.string().datetime({ offset: true }),
    ear: z.number().min(0).max(1),
    blink_rate: z.number().min(0),
    head_yaw: z.number().min(-90).max(90),
    head_pitch: z.number().min(-90).max(90),
    distraction_score: z.number().min(0).max(100),
    typing_wpm: z.number().min(0),
    iki_variance: z.number().min(0).max(100),
    typing_error_rate: z.number().min(0).max(100),
    mouse_speed: z.number().min(0),
    mouse_intensity: z.number().min(0).max(100),
    mouse_jerkiness: z.number().min(0).max(100),
    idle_duration: z.number().min(0),
    cognitive_load: z.number().min(0).max(100),
    stress: z.number().min(0).max(100),
    fatigue: z.number().min(0).max(100),
    focus: z.number().min(0).max(100),
    energy: z.number().min(0).max(100),
    recovery_need: z.number().min(0).max(100),
    wellness_score: z.number().min(0).max(100),
  })
  .strip();

export const createSnapshotsBatchSchema = z.object({
  snapshots: z.array(snapshotSchema).min(1).max(200),
});

// ─── Sleep Records ────────────────────────────────────────────────────────────

export const createSleepRecordSchema = z
  .object({
    sleep_date: z.string().date(),
    sleep_duration: z.string().max(20),         // e.g. "7-8h"
    sleep_quality: z.number().int().min(1).max(5),
    bedtime: z.string().optional().nullable(),  // e.g. "23:30"
    wake_time: z.string().optional().nullable(), // e.g. "07:00"
    notes: z.string().max(500).optional().nullable(),
  })
  .strip();

export const updateSleepRecordSchema = createSleepRecordSchema.partial().strip();

// ─── AURA Messages ───────────────────────────────────────────────────────────

export const createAuraMessageSchema = z
  .object({
    message: z.string().min(1).max(2000),
    intent: z.string().max(50).optional().nullable(),
    response: z.string().max(5000),
    wellness_context: z.record(z.unknown()).optional().nullable(),
  })
  .strip();

// ─── Reports ─────────────────────────────────────────────────────────────────

export const createReportSchema = z
  .object({
    session_id: z.string().uuid().optional().nullable(),
    report_type: z.enum(["session", "weekly", "monthly", "burnout", "custom"]),
    report_data: z.record(z.unknown()),
  })
  .strip();

// ─── Baseline ────────────────────────────────────────────────────────────────

export const updateBaselineSchema = z
  .object({
    baseline_wpm: z.number().min(0).optional(),
    baseline_ear: z.number().min(0).max(1).optional(),
    baseline_mouse_activity: z.number().min(0).optional(),
    baseline_focus: z.number().min(0).max(100).optional(),
    calibration_data: z.record(z.unknown()).optional(),
  })
  .strip();

// ─── Utility ─────────────────────────────────────────────────────────────────

/**
 * Safely parse a request body with a Zod schema.
 * Returns { data } on success, { error } on failure.
 *
 * @template T
 * @param {Request} req
 * @param {import('zod').ZodSchema<T>} schema
 * @returns {Promise<{ data: T } | { error: import('zod').ZodError }>}
 */
export async function parseBody(req, schema) {
  try {
    const json = await req.json();
    const result = schema.safeParse(json);
    if (!result.success) return { error: result.error };
    return { data: result.data };
  } catch {
    return {
      error: new Error("Invalid JSON body"),
    };
  }
}
