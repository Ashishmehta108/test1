export const THEME_COOKIE = "ot_theme";

export const THEME_OPTIONS = [
  { value: "light", label: "Light", hint: "Always light" },
  { value: "dark", label: "Dark", hint: "Always dark" },
  { value: "system", label: "Auto", hint: "Match this device" },
] as const;

export type Theme = (typeof THEME_OPTIONS)[number]["value"];

/** Anything but an explicit light or dark choice means "follow the device". */
export function themeFrom(value: string | undefined): Theme {
  return value === "light" || value === "dark" ? value : "system";
}
