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
      },
    },
  },
  plugins: [],
};

export default config;

