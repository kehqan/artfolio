import type { Config } from "tailwindcss";

/* All design values come from CSS variables in src/styles/tokens.css.
   Use these semantic names (bg-surface, text-fg-2, shadow-hard-1,
   rounded-control, text-h2 …) instead of hex values or inline styles. */

const v = (name: string) => `var(--${name})`;

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // legacy: body is still Darker Grotesque until pages migrate
        sans: ["'Darker Grotesque'", "system-ui", "sans-serif"],
        mono: ["'Courier New'", "Courier", "monospace"],
        // design system
        display: [v("font-display")],
        ui: [v("font-ui")],
        code: [v("font-mono")],
      },
      colors: {
        // legacy page color, replaced by `page` in the app shell PR
        paper: "#FFFBEA",

        ink: v("color-ink"),
        mango: {
          DEFAULT: v("color-mango"),
          hover: v("color-mango-hover"),
          soft: v("color-mango-soft"),
        },
        "on-mango": v("color-on-mango"),
        page: v("color-page"),
        surface: v("color-surface"),
        sunken: v("color-sunken"),
        inverse: v("color-inverse"),
        "on-inverse": v("color-on-inverse"),
        scrim: v("color-scrim"),
        n: {
          100: v("color-n-100"),
          200: v("color-n-200"),
          300: v("color-n-300"),
          400: v("color-n-400"),
          500: v("color-n-500"),
          600: v("color-n-600"),
          700: v("color-n-700"),
        },
        fg: {
          DEFAULT: v("color-fg"),
          2: v("color-fg-2"),
          3: v("color-fg-3"),
          disabled: v("color-fg-disabled"),
        },
        line: {
          DEFAULT: v("color-line"),
          strong: v("color-line-strong"),
        },
        ok: { DEFAULT: v("color-ok"), well: v("color-ok-well") },
        warn: { DEFAULT: v("color-warn"), well: v("color-warn-well") },
        bad: { DEFAULT: v("color-bad"), well: v("color-bad-well") },
        info: { DEFAULT: v("color-info"), well: v("color-info-well") },
        tag: {
          coral: v("color-tag-coral"),
          teal: v("color-tag-teal"),
          violet: v("color-tag-violet"),
          pink: v("color-tag-pink"),
          sky: v("color-tag-sky"),
          "coral-well": v("color-tag-coral-well"),
          "teal-well": v("color-tag-teal-well"),
          "violet-well": v("color-tag-violet-well"),
          "pink-well": v("color-tag-pink-well"),
          "sky-well": v("color-tag-sky-well"),
        },
      },
      fontSize: {
        display: [v("text-display"), { lineHeight: v("leading-display"), fontWeight: "800" }],
        h1: [v("text-h1"), { lineHeight: v("leading-h1"), fontWeight: "800" }],
        h2: [v("text-h2"), { lineHeight: v("leading-h2"), fontWeight: "800" }],
        h3: [v("text-h3"), { lineHeight: v("leading-h3"), fontWeight: "800" }],
        lead: [v("text-lead"), { lineHeight: v("leading-lead") }],
        body: [v("text-body"), { lineHeight: v("leading-body") }],
        "body-sm": [v("text-body-sm"), { lineHeight: v("leading-body-sm") }],
        label: [v("text-label"), { lineHeight: v("leading-label") }],
        caption: [v("text-caption"), { lineHeight: v("leading-caption") }],
        control: [v("text-control"), { lineHeight: "1.2" }],
      },
      borderRadius: {
        chip: v("radius-chip"),
        control: v("radius-control"),
        card: v("radius-card"),
        pill: v("radius-pill"),
      },
      borderWidth: {
        outline: v("border-outline"),
        hair: v("border-hair"),
      },
      boxShadow: {
        // legacy names kept so existing pages don't change
        yellow: "4px 4px 0px #111110",
        "yellow-sm": "2px 2px 0px #111110",
        "yellow-lg": "6px 6px 0px #111110",
        // design system
        "hard-1": v("shadow-hard-1"),
        "hard-2": v("shadow-hard-2"),
        "hard-3": v("shadow-hard-3"),
      },
      transitionTimingFunction: {
        out: v("ease-standard"),
      },
      transitionDuration: {
        fast: v("duration-fast"),
        base: v("duration-base"),
      },
      keyframes: {
        "drop-in": {
          from: { opacity: "0", transform: "translateY(-6px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        "drop-in": "drop-in var(--duration-base) var(--ease-standard)",
      },
      spacing: {
        rail: v("shell-rail"),
        header: v("shell-header"),
      },
      maxWidth: {
        content: v("shell-content"),
      },
      zIndex: {
        nav: v("z-nav"),
        dropdown: v("z-dropdown"),
        modal: v("z-modal"),
        toast: v("z-toast"),
      },
    },
  },
  plugins: [],
};

export default config;
