import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        "bg-base": "#FFFFFF",
        "surface-subtle": "#F9FAFB",
        "surface-hover": "#F3F4F6",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f1f3ff",
        "surface-container": "#e9edff",
        "surface-container-high": "#e1e8fd",
        "surface-bright": "#f9f9ff",
        "surface-dim": "#d3daef",
        "surface-tint": "#494bd6",
        // Borders
        "border-light": "#E5E7EB",
        "border-strong": "#D1D5DB",
        // Text
        "text-primary": "#111827",
        "text-secondary": "#6B7280",
        "text-muted": "#9CA3AF",
        "on-surface": "#141b2b",
        "on-surface-variant": "#464554",
        // Primary (indigo)
        "primary": "#6366F1",
        "primary-dark": "#4F46E5",
        "primary-container": "#6063ee",
        "primary-fixed": "#e1e0ff",
        "primary-fixed-dim": "#c0c1ff",
        "on-primary": "#ffffff",
        "on-primary-fixed": "#07006c",
        "on-primary-fixed-variant": "#2f2ebe",
        "on-primary-container": "#fffbff",
        "inverse-primary": "#c0c1ff",
        "accent-indigo-light": "#EEF2FF",
        "accent-indigo-dark": "#4F46E5",
        // Secondary (emerald)
        "secondary": "#006c49",
        "secondary-container": "#6cf8bb",
        "secondary-fixed": "#6ffbbe",
        "secondary-fixed-dim": "#4edea3",
        "on-secondary": "#ffffff",
        "on-secondary-container": "#00714d",
        "on-secondary-fixed": "#002113",
        "on-secondary-fixed-variant": "#005236",
        "accent-emerald-bg": "#ECFDF5",
        // Tertiary (amber)
        "tertiary": "#825100",
        "tertiary-container": "#a36700",
        "tertiary-fixed": "#ffddb8",
        "tertiary-fixed-dim": "#ffb95f",
        "on-tertiary": "#ffffff",
        "on-tertiary-container": "#fffbff",
        "on-tertiary-fixed": "#2a1700",
        "on-tertiary-fixed-variant": "#653e00",
        "accent-amber-bg": "#FFFBEB",
        // Accents
        "accent-red": "#EF4444",
        "accent-blue": "#3B82F6",
        // Error
        "error": "#ba1a1a",
        "error-container": "#ffdad6",
        "on-error": "#ffffff",
        "on-error-container": "#93000a",
        // Misc
        "outline": "#767586",
        "outline-variant": "#c7c4d7",
        "inverse-surface": "#293040",
        "inverse-on-surface": "#edf0ff",
        "background": "#f9f9ff",
        "on-background": "#141b2b",
        "surface-variant": "#dce2f7",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "'Fira Code'", "monospace"],
        headline: ["var(--font-inter)", "system-ui", "sans-serif"],
        "body-base": ["var(--font-inter)", "system-ui", "sans-serif"],
        "body-lg": ["var(--font-inter)", "system-ui", "sans-serif"],
        "label-caps": ["var(--font-inter)", "system-ui", "sans-serif"],
        "code-sm": ["var(--font-jetbrains)", "'Fira Code'", "monospace"],
        display: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      fontSize: {
        display: ["36px", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "700" }],
        headline: ["24px", { lineHeight: "1.3", fontWeight: "600" }],
        "body-lg": ["18px", { lineHeight: "1.6", fontWeight: "400" }],
        "body-base": ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        "code-sm": ["13px", { lineHeight: "1.6", fontWeight: "400" }],
        "label-caps": ["12px", { lineHeight: "1", letterSpacing: "0.05em", fontWeight: "600" }],
      },
      borderRadius: {
        DEFAULT: "4px",
        sm: "2px",
        md: "6px",
        lg: "6px",
        xl: "8px",
        "2xl": "12px",
        full: "9999px",
      },
      spacing: {
        "section-gap": "72px",
        "card-padding": "20px",
        "header-height": "60px",
      },
      maxWidth: {
        container: "1100px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)",
        "card-hover": "0 4px 12px rgba(0,0,0,0.09)",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "coin-slide": {
          "0%": { transform: "translateX(0px)", opacity: "0" },
          "8%": { opacity: "1" },
          "85%": { opacity: "1" },
          "100%": { transform: "translateX(64px)", opacity: "0" },
        },
        "flash-bg": {
          "0%, 100%": { fill: "#EEF2FF" },
          "70%": { fill: "#ECFDF5" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
        "bounce-dot": {
          "0%, 80%, 100%": { transform: "translateY(0)" },
          "40%": { transform: "translateY(-4px)" },
        },
      },
      animation: {
        marquee: "marquee 30s linear infinite",
        "coin-slide": "coin-slide 1.2s ease-in-out 0s infinite",
        "flash-bg": "flash-bg 3s ease-in-out 1.2s infinite",
        "bounce-dot": "bounce-dot 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
