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
        primary: {
          DEFAULT: "#03045e",
          light: "#0077b6",
        },
        secondary: {
          DEFAULT: "#d4d4d4",
          light: "#ececec",
        },
        accent: {
          DEFAULT: "#ffffff",
          cream: "#ffffff",
        },
        highlight: {
          DEFAULT: "#03045e",
          light: "#0077b6",
        },
        surface: "#ffffff",
        ivory: "#ffffff",
        espresso: "#03045e",
        mocha: "#6b6b6b",
        success: "#6f9a76",
        warning: "#0077b6",
        error: "#b56b6b",
        gold: {
          DEFAULT: "#03045e",
          light: "#0077b6",
        },
        signal: {
          DEFAULT: "#FFD200",
          dark: "#E6BC00",
        },
        navy: {
          DEFAULT: "#03045e",
          deep: "#02033f",
        },
        wf: {
          black: "#03045e",
          gray: "#6b6b6b",
          border: "#e8e8e8",
          light: "#ffffff",
        },
      },
      fontFamily: {
        // Display headings (Alice via --font-playfair for existing font-playfair classes)
        playfair: ["var(--font-playfair)", "Georgia", "serif"],
        alice: ["var(--font-playfair)", "Georgia", "serif"],
        cormorant: ["var(--font-cormorant)", "Georgia", "serif"],
        inter: ["var(--font-inter)", "system-ui", "sans-serif"],
        accent: ["var(--font-accent)", "cursive"],
        // Body default (was Cantora)
        cantora: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      transitionTimingFunction: {
        organic: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      },
      transitionDuration: {
        organic: "400ms",
      },
      animation: {
        "fade-up": "fadeUp 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards",
        shimmer: "shimmer 2.4s infinite",
        "brand-scroll": "brandScroll 45s linear infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        brandScroll: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
