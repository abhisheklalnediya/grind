import type { SetType } from "./primitives";

export const setTypeLabels: Record<SetType, string> = {
  warmup: "Warm-up",
  working: "Working",
  drop: "Drop",
  failure: "Failure",
  rest_pause: "Rest-pause",
};
export function setTypeShortLabel(
  type: SetType,
  workingOrdinal: number,
): string {
  if (type === "working") return String(workingOrdinal);
  return { warmup: "W", drop: "D", failure: "F", rest_pause: "RP" }[type];
}
