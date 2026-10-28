import { darkColors, lightColors } from "./tokens";
export type AppearancePreference = "system" | "light" | "dark";
export type AppearanceMode = "light" | "dark";
export function readAppearance(value: string | null): AppearancePreference {
  return value === "light" || value === "dark" ? value : "system";
}
export function resolveAppearance(
  preference: AppearancePreference,
  system: string | null | undefined,
): AppearanceMode {
  return preference === "system"
    ? system === "light"
      ? "light"
      : "dark"
    : preference;
}
export function appearanceColors(mode: AppearanceMode) {
  return mode === "light" ? lightColors : darkColors;
}
export function appearanceKey(scope: string) {
  return `grind.appearance.v1.${encodeURIComponent(scope)}`;
}
