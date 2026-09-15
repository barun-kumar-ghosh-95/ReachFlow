import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dbe6ff",
          200: "#bed0ff",
          300: "#91b0ff",
          400: "#5d85ff",
          500: "#3a61ff",
          600: "#2342f5",
          700: "#1b32dc",
          800: "#1c2cb1",
          900: "#1e2b8c",
        },
        slateish: {
          950: "#0a0e1a",
          900: "#0f1629",
          850: "#151c33",
          800: "#1b2440",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Inter",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,22,41,0.06), 0 1px 3px rgba(15,22,41,0.08)",
        "card-lg": "0 4px 12px rgba(15,22,41,0.08), 0 16px 40px -12px rgba(15,22,41,0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
