import type { Config } from "tailwindcss";

/**
 * "Estate register" palette — ink navy, antique gold, warm ivory.
 * `brand` is kept as an alias of `royal` so long-lived class names in
 * feature code survive palette evolution.
 */
const royal = {
  50: "#EEF0FA",
  100: "#DDE1F4",
  200: "#BCC4E9",
  300: "#93A0DA",
  400: "#6577C4",
  500: "#4557AC",
  600: "#2F3E8F",
  700: "#273478",
  800: "#212C62",
  900: "#1C2450",
};

const config: Config = {
  content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        royal,
        brand: royal,
        ink: {
          DEFAULT: "#1C2340",
          soft: "#2A3255",
          mute: "#555B77",
        },
        gold: {
          300: "#E3CD96",
          400: "#D9B970",
          500: "#C4A052",
          600: "#B08A3E",
          700: "#8F6E2E",
        },
        paper: {
          DEFAULT: "#FAF7F0",
          deep: "#F3EEE2",
        },
        parch: "#E9E2D4",
        burgundy: {
          50: "#F9ECED",
          100: "#F1D6D9",
          600: "#8E2A35",
          700: "#75222C",
        },
        moss: {
          50: "#E9F2EC",
          100: "#D5E6DB",
          600: "#2E6B4F",
          700: "#265A42",
        },
        amberEstate: {
          50: "#F9F1DE",
          100: "#F3E4C2",
          600: "#A16A1B",
          700: "#855716",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(28, 35, 64, 0.05), 0 4px 16px rgba(28, 35, 64, 0.06)",
        lift: "0 2px 4px rgba(28, 35, 64, 0.07), 0 12px 28px rgba(28, 35, 64, 0.12)",
        modal: "0 8px 40px rgba(28, 35, 64, 0.28)",
      },
    },
  },
  plugins: [],
};

export default config;
