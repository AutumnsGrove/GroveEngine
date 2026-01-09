/**
 * Editor Theme Composable
 * Applies the Grove theme CSS variables to the editor
 *
 * Note: Multiple themes were removed for simplicity. The editor uses
 * a single "Grove" theme that matches the overall Grove aesthetic.
 */

export interface Theme {
  name: string;
  label: string;
  desc: string;
  accent: string;
  accentDim: string;
  accentBright: string;
  accentGlow: string;
  bg: string;
  bgSecondary: string;
  bgTertiary: string;
  border: string;
  borderAccent: string;
  text: string;
  textDim: string;
  statusBg: string;
  statusBorder: string;
}

// Single Grove theme (other themes removed for simplicity)
export const themes: Record<string, Theme> = {
  grove: {
    name: "grove",
    label: "Grove",
    desc: "forest green",
    accent: "#8bc48b",
    accentDim: "#7a9a7a",
    accentBright: "#a8dca8",
    accentGlow: "#c8f0c8",
    bg: "#1e1e1e",
    bgSecondary: "#252526",
    bgTertiary: "#1a1a1a",
    border: "#3a3a3a",
    borderAccent: "#4a7c4a",
    text: "#d4d4d4",
    textDim: "#9d9d9d",
    statusBg: "#2d4a2d",
    statusBorder: "#3d5a3d",
  },
};

export interface EditorThemeManager {
  currentTheme: string;
  themes: Record<string, Theme>;
  loadTheme: () => void;
}

/**
 * Creates an editor theme manager
 * Simplified to always use the Grove theme
 */
export function useEditorTheme(): EditorThemeManager {
  const theme = themes.grove;

  /**
   * Apply the Grove theme CSS variables to the document
   */
  function applyTheme(): void {
    const root = document.documentElement;
    root.style.setProperty("--editor-accent", theme.accent);
    root.style.setProperty("--editor-accent-dim", theme.accentDim);
    root.style.setProperty("--editor-accent-bright", theme.accentBright);
    root.style.setProperty("--editor-accent-glow", theme.accentGlow);
    root.style.setProperty("--editor-bg", theme.bg);
    root.style.setProperty("--editor-bg-secondary", theme.bgSecondary);
    root.style.setProperty("--editor-bg-tertiary", theme.bgTertiary);
    root.style.setProperty("--editor-border", theme.border);
    root.style.setProperty("--editor-border-accent", theme.borderAccent);
    root.style.setProperty("--editor-text", theme.text);
    root.style.setProperty("--editor-text-dim", theme.textDim);
    root.style.setProperty("--editor-status-bg", theme.statusBg);
    root.style.setProperty("--editor-status-border", theme.statusBorder);
  }

  /**
   * Load theme (always applies Grove theme)
   */
  function loadTheme(): void {
    applyTheme();
  }

  return {
    currentTheme: "grove",
    themes,
    loadTheme,
  };
}
