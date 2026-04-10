import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#020617", // slate-950
        foreground: "#e5e7eb", // slate-200
        // Paletas trazidas das calculadoras externas (apenas UI/cores).
        ink: {
          950: "#0d1117",
          900: "#111827",
          800: "#161b2e",
          750: "#19203a",
          700: "#1c2437",
          600: "#252d42",
          500: "#2e3a55",
          400: "#3d4e6e",
          300: "#5a6b8a",
          200: "#8899b3",
          100: "#adb9cc",
          50: "#d1dcea",
        },
        ml: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
        },
        shopee: {
          50: "#fff4f0",
          100: "#ffe4d6",
          200: "#ffc4a8",
          300: "#ff9d72",
          400: "#ff6b3a",
          500: "#ee4d2d",
          600: "#d63a1a",
          700: "#b22c12",
          800: "#8f2310",
          900: "#761e0f",
        },
      },
      fontFamily: {
        sans: ["system-ui", "ui-sans-serif", "sans-serif"],
      },
      borderRadius: {
        xl: "1rem",
      },
      boxShadow: {
        "neon-cyan": "0 0 25px rgba(34, 211, 238, 0.45)",
        "neon-purple": "0 0 25px rgba(168, 85, 247, 0.45)",
        "neon-emerald": "0 0 25px rgba(16, 185, 129, 0.45)",
        card: "0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06)",
        "card-dark": "0 1px 3px rgba(0,0,0,0.4),  0 4px 16px rgba(0,0,0,0.3)",
        glow: "0 0 0 3px rgba(245,158,11,0.2)",
        "glow-cyan": "0 0 0 3px rgba(34,211,238,0.2)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

