import { createContext, useContext } from "react";
import { darkColors, type ThemeColors } from "./tokens";
import type { AppearanceMode, AppearancePreference } from "./appearance";
export type ThemeState = {
  scope: string;
  retry: () => void;
  colors: ThemeColors;
  mode: AppearanceMode;
  preference: AppearancePreference;
  setPreference: (value: AppearancePreference) => Promise<void>;
  hydrating: boolean;
  saving: boolean;
  error: string;
};
export const ThemeContext = createContext<ThemeState>({
  scope: "unconfigured",
  retry: () => {},
  colors: darkColors,
  mode: "dark",
  preference: "system",
  setPreference: async () => {},
  hydrating: false,
  saving: false,
  error: "",
});
export function useTheme() {
  return useContext(ThemeContext);
}
