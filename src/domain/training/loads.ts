import {
  decimalLoadSchema,
  durationSchema,
  distanceSchema,
  distanceUnitSchema,
  type TrackingType,
  repsSchema,
  unitSchema,
  type LoadMode,
  type WeightUnit,
} from "./primitives";

export type LoadInput =
  | { status: "valid"; value: string | null }
  | { status: "incomplete" | "invalid" };
export function parseLoadInput(raw: string, mode: LoadMode): LoadInput {
  if (mode === "bodyweight")
    return raw === ""
      ? { status: "valid", value: null }
      : { status: "invalid" };
  if (raw === "" || raw === ".") return { status: "incomplete" };
  if (/^\d+\.$/.test(raw) && raw.length <= 32 && Number(raw) <= 100000)
    return { status: "incomplete" };
  if (!decimalLoadSchema.safeParse(raw).success) return { status: "invalid" };
  if (mode === "assisted" && Number(raw) === 0) return { status: "invalid" };
  return { status: "valid", value: raw };
}
export function isSetCompleteable(
  set: {
    entered_load: string | null;
    reps: number | null;
    duration_seconds?: number | null | undefined;
    entered_distance?: string | null | undefined;
    distance_unit?: "km" | "mi" | null | undefined;
  },
  mode: LoadMode,
  trackingType: TrackingType = "reps",
): boolean {
  if (trackingType === "duration")
    return durationSchema.safeParse(set.duration_seconds).success;
  if (trackingType === "distance_duration")
    return (
      durationSchema.safeParse(set.duration_seconds).success &&
      distanceSchema.safeParse(set.entered_distance).success &&
      distanceUnitSchema.safeParse(set.distance_unit).success
    );
  if (!repsSchema.safeParse(set.reps).success) return false;
  if (mode === "bodyweight") return set.entered_load === null;
  if (set.entered_load === null) return false;
  return parseLoadInput(set.entered_load, mode).status === "valid";
}
function scaledInteger(value: number, decimals: number): string {
  const padded = String(value).padStart(decimals + 1, "0");
  const whole = padded.slice(0, -decimals);
  const fraction = padded.slice(-decimals).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}
// Inputs are bounded so integer products stay below Number.MAX_SAFE_INTEGER.
// This exact string conversion is a client preview; SQL remains authoritative.
export function toCanonicalKg(value: string, unit: WeightUnit): string {
  decimalLoadSchema.parse(value);
  unitSchema.parse(unit);
  const dot = value.indexOf(".");
  const whole = dot === -1 ? value : value.slice(0, dot);
  const fraction = dot === -1 ? "" : value.slice(dot + 1);
  const milli = Number(whole) * 1000 + Number(fraction.padEnd(3, "0"));
  return unit === "kg"
    ? scaledInteger(milli, 3)
    : scaledInteger(milli * 45359237, 11);
}
// Display conversion only: callers must keep original values and units intact.
export function displayLoad(
  value: string,
  from: WeightUnit,
  to: WeightUnit,
): string {
  decimalLoadSchema.parse(value);
  unitSchema.parse(from);
  unitSchema.parse(to);
  if (from === to) return value;
  const converted =
    from === "lb" ? Number(value) * 0.45359237 : Number(value) / 0.45359237;
  return String(Number(converted.toFixed(3)));
}
export function loadFieldLabel(mode: LoadMode, unit: WeightUnit): string {
  switch (mode) {
    case "bodyweight":
      return "Reps only";
    case "assisted":
      return `Assistance (${unit})`;
    case "weighted_bodyweight":
      return `Added weight (${unit})`;
    case "external":
      return `Weight (${unit})`;
  }
}
