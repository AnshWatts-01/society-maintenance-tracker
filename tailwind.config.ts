import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef6ff",
          100: "#d9ecff",
          200: "#bcdcff",
          300: "#8ec4ff",
          400: "#59a4ff",
          500: "#3182f6",
          600: "#1f63e0",
          700: "#1a4fb5",
          800: "#1b428f",
          900: "#1b3a72",
        },
      },
    },
  },
  plugins: [],
};

export default config;
