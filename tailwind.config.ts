import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-syne)", "var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-plus-jakarta)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      colors: {
        // Brand yellow
        yellow: {
          50:  "#fffde7",
          100: "#fff9c4",
          200: "#fff59d",
          300: "#fff176",
          400: "#fee622",  // PRIMARY BRAND
          500: "#fdd835",
          600: "#f9a825",
          700: "#f57f17",
        },
        stone: {
          25:  "#fdfcfb",
          50:  "#faf9f7",
          100: "#f5f4f0",
          200: "#e8e5de",
          300: "#d4cfc4",
          400: "#a89f8c",
          500: "#8a8070",
          600: "#6b6357",
          700: "#504a40",
          800: "#3a352d",
          900: "#111110",  // near-black
          950: "#0a0a09",
        },
        rose: {
          400: "#fb7185",
          500: "#f43f5e",
          100: "#ffe4e6",
          700: "#be123c",
        },
        sky: {
          400: "#38bdf8",
          500: "#0ea5e9",
          100: "#e0f2fe",
          700: "#0369a1",
        },
        emerald: {
          50:  "#ecfdf5",
          100: "#d1fae5",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
        },
        amber: {
          100: "#fef3c7",
          400: "#fbbf24",
          500: "#f59e0b",
          700: "#b45309",
        },
      },
      boxShadow: {
        yellow: "4px 4px 0px 0px #111110",
        "yellow-sm": "2px 2px 0px 0px #111110",
      },
    },
  },
  plugins: [],
};
export default config;
