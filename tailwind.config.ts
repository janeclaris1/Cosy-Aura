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
        roboto: ["var(--font-roboto)", "system-ui", "sans-serif"],
        inter: ["var(--font-roboto)", "system-ui", "sans-serif"],
        accent: ["var(--font-accent)", "cursive"],
        // Body default
        cantora: ["var(--font-roboto)", "system-ui", "sans-serif"],
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
        "chat-teaser-in":
          "chatTeaserIn 0.65s cubic-bezier(0.22, 1, 0.36, 1) 0.6s both",
        "chat-teaser-float": "chatTeaserFloat 3.6s ease-in-out 1.4s infinite",
        "chat-fab-in":
          "chatFabIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) 0.25s both",
        "chat-fab-pulse": "chatFabPulse 2.4s ease-in-out 1s infinite",
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
        chatTeaserIn: {
          "0%": { opacity: "0", transform: "translateX(18px) scale(0.96)" },
          "100%": { opacity: "1", transform: "translateX(0) scale(1)" },
        },
        chatTeaserFloat: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        chatFabIn: {
          "0%": { opacity: "0", transform: "scale(0.72)" },
          "70%": { opacity: "1", transform: "scale(1.06)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        chatFabPulse: {
          "0%, 100%": { boxShadow: "0 10px 24px rgba(3, 4, 94, 0.18)" },
          "50%": {
            boxShadow:
              "0 10px 24px rgba(3, 4, 94, 0.18), 0 0 0 10px rgba(255, 210, 0, 0.22)",
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;
