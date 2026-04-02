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
        sans: ["'Darker Grotesque'", "system-ui", "sans-serif"],
        mono: ["'Courier New'", "Courier", "monospace"],
      },
      colors: {
        paper: "#FFFBEA",
      },
      boxShadow: {
        yellow: "4px 4px 0px #111110",
        "yellow-sm": "2px 2px 0px #111110",
        "yellow-lg": "6px 6px 0px #111110",
      },
    },
  },
  plugins: [],
};

export default config;
