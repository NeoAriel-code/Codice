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
        ink: {
          DEFAULT: "#12141f",
          panel: "#181b29",
          border: "#262a3c",
          hover: "#1d2133",
        },
        parchment: "#ece6d6",
        muted: "#8b8a9a",
        gold: {
          DEFAULT: "#c9a24b",
          hover: "#b8923d",
        },
        burgundy: {
          DEFAULT: "#7a2331",
          hover: "#6b1e2a",
        },
        moss: {
          DEFAULT: "#3f6b4f",
          hover: "#355b43",
        },
      },
      fontFamily: {
        display: ["var(--font-cinzel)", "Cinzel", "Georgia", "serif"],
        body: ["var(--font-crimson)", "Crimson Pro", "Georgia", "serif"],
        mono: ["var(--font-courier)", "Courier Prime", "monospace"],
      },
      keyframes: {
        "sello-estampa": {
          "0%": { transform: "scale(1)", opacity: "0" },
          "20%": { transform: "scale(0.92)", opacity: "1" },
          "60%": { transform: "scale(1.04)", opacity: "0.6" },
          "100%": { transform: "scale(1.15)", opacity: "0" },
        },
        "sello-spin": {
          "from": { transform: "rotate(0deg)" },
          "to": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "sello-estampa": "sello-estampa 450ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "sello-spin": "sello-spin 3s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
