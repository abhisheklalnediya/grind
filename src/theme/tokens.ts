export type ThemeColors = {
  background: string;
  surface: string;
  border: string;
  text: string;
  secondary: string;
  accent: string;
  accentText: string;
  onAccent: string;
  error: string;
  disabledSurface: string;
  disabledText: string;
};
export const darkColors: ThemeColors = {
  background: "#111418",
  surface: "#1B2026",
  border: "#30363E",
  text: "#F1F1F1",
  secondary: "#A5AFBB",
  accent: "#E8F84C",
  accentText: "#E8F84C",
  onAccent: "#111418",
  error: "#FF9999",
  disabledSurface: "#303842",
  disabledText: "#A5AFBB",
};
export const lightColors: ThemeColors = {
  background: "#FAFBFC",
  surface: "#F0F2F5",
  border: "#CDD3D9",
  text: "#17202A",
  secondary: "#52606D",
  accent: "#E8F84C",
  accentText: "#4F5D00",
  onAccent: "#111418",
  error: "#A82035",
  disabledSurface: "#E4E8EC",
  disabledText: "#596777",
};
// Compatibility for untouched callers; interactive screens consume useTheme().
export const colors = darkColors;
export const spacing = { xs: 8, sm: 12, md: 16, lg: 24, xl: 32 } as const;
