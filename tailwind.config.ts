import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        rose: {
          50: "#fff5f5",
          100: "#ffe0e0",
          200: "#ffc2c2",
          300: "#ff9999",
          400: "#ff7070",
          500: "#e84c6a",
          600: "#c43a56",
        },
        soft: {
          bg: "#fef7f4",
          surface: "#fff0eb",
          text: "#4a3728",
          muted: "#9a8578",
          border: "#f0d5c9",
        },
        dark: {
          bg: "#0f0f0f",
          surface: "#1a1a1a",
          text: "#e8e0db",
          muted: "#6b6360",
          border: "#2a2a2a",
        },
      },
    },
  },
  plugins: [],
};

export default config;
