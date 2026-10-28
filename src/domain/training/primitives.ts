import { z } from "zod";

export const loadModeSchema = z.enum([
  "external",
  "bodyweight",
  "assisted",
  "weighted_bodyweight",
]);
export const unitSchema = z.enum(["kg", "lb"]);
export const setTypeSchema = z.enum(["warmup", "working"]);
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
