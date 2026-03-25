import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          50: "#faf9f7",
          100: "#f3f1ed",
          200: "#e8e4dd",
          300: "#d4cec3",
          400: "#b8b0a1",
          500: "#9d9382",
          600: "#857a6a",
          700: "#6e6457",
          800: "#5c544a",
          900: "#4e4840",
          950: "#1a1816",
        },
        accent: {
          50: "#fdf8ef",
          100: "#f9edd4",
          200: "#f2d8a8",
          300: "#eabd71",
          400: "#e4a543",
          500: "#dc8c24",
          600: "#c4701a",
          700: "#a35418",
          800: "#85431b",
          900: "#6d3819",
          950: "#3b1b0a",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      animation: {
        "fade-up": "fadeUp 0.7s ease-out forwards",
        "fade-in": "fadeIn 0.6s ease-out forwards",
        "slide-in": "slideIn 0.5s ease-out forwards",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateX(-16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
