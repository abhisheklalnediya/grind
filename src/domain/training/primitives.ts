import { z } from "zod";

export const loadModeSchema = z.enum([
  "external",
  "bodyweight",
  "assisted",
  "weighted_bodyweight",
]);
export const trackingTypeSchema = z.enum([
  "reps",
  "duration",
  "distance_duration",
]);
export const distanceUnitSchema = z.enum(["km", "mi"]);
export const durationSchema = z.number().int().min(1).max(86400);
export const distanceSchema = z
  .string()
  .max(32)
  .regex(/^(?:\d+(?:\.\d{1,3})?|\.\d{1,3})$/)
  .refine(
    (value) => Number(value) > 0 && Number(value) <= 100000,
    "Distance must be positive and at most 100000.",
  );
export type TrackingType = z.infer<typeof trackingTypeSchema>;
export type DistanceUnit = z.infer<typeof distanceUnitSchema>;
export const unitSchema = z.enum(["kg", "lb"]);
export const setTypeSchema = z.enum([
  "warmup",
  "working",
  "drop",
  "failure",
  "rest_pause",
]);
export const idSchema = z.uuid();
export const nameSchema = z.string().trim().min(1).max(80);
export const notesSchema = z.string().max(2000);
export const positionSchema = z.number().int().min(0).max(99);
export const restSchema = z.number().int().min(15).max(3600);
export const repsSchema = z.number().int().min(1).max(10000);
export const decimalLoadSchema = z
  .string()
  .max(32)
  .regex(/^(?:\d+(?:\.\d{1,3})?|\.\d{1,3})$/)
  .refine((value) => Number(value) <= 100000, "Load must not exceed 100000.");
export const timestampSchema = z.iso.datetime({ offset: true });
export type LoadMode = z.infer<typeof loadModeSchema>;
export type WeightUnit = z.infer<typeof unitSchema>;
export type SetType = z.infer<typeof setTypeSchema>;
