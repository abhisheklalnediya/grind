import {
  appearanceColors,
  appearanceKey,
  readAppearance,
  resolveAppearance,
} from "./appearance";
import { darkColors, lightColors } from "./tokens";
it("normalizes stored preferences and resolves explicit versus system appearance", () => {
  expect(readAppearance("light")).toBe("light");
  expect(readAppearance("dark")).toBe("dark");
  for (const value of [null, "system", "corrupt"])
    expect(readAppearance(value)).toBe("system");
  expect(resolveAppearance("system", "light")).toBe("light");
  for (const value of [null, undefined, "dark"])
    expect(resolveAppearance("system", value)).toBe("dark");
  expect(resolveAppearance("dark", "light")).toBe("dark");
  expect(resolveAppearance("light", "dark")).toBe("light");
  expect(appearanceColors("dark")).toBe(darkColors);
  expect(appearanceColors("light")).toBe(lightColors);
  expect(appearanceKey("backend/a:user")).toBe(
    "grind.appearance.v1.backend%2Fa%3Auser",
  );
  expect(appearanceKey("backend/a:user")).not.toBe(
    appearanceKey("backend/b:user"),
  );
});
function luminance(hex: string) {
  const channels = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return channels.reduce(
    (sum, value, i) => sum + value * ([0.2126, 0.7152, 0.0722][i] ?? 0),
    0,
  );
}
function contrast(a: string, b: string) {
  const values = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return ((values[1] ?? 0) + 0.05) / ((values[0] ?? 0) + 0.05);
}
it("keeps text, muted copy, accent text and errors readable in both palettes", () => {
  for (const colors of [darkColors, lightColors]) {
    for (const text of [
      colors.text,
      colors.secondary,
      colors.accentText,
      colors.error,
    ]) {
      expect(contrast(text, colors.background)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(text, colors.surface)).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(colors.onAccent, colors.accent)).toBeGreaterThanOrEqual(
      4.5,
    );
  }
});
