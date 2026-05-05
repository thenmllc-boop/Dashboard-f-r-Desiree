import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1440px" },
    },
    extend: {
      colors: {
        bg: "#F5F3EE",
        cream: "#FBFAF6",
        sage: {
          DEFAULT: "#7FAF9B",
          50: "#EEF5F1",
          100: "#DCEAE2",
          200: "#BAD5C5",
          300: "#97C0A8",
          400: "#7FAF9B",
          500: "#5F9682",
          600: "#487667",
          700: "#33574B",
        },
        forest: {
          DEFAULT: "#1F3D34",
          900: "#13251F",
          800: "#1F3D34",
          700: "#2A5448",
        },
        gold: {
          DEFAULT: "#C6A76D",
          100: "#F5EDDB",
          200: "#E8D7B0",
          300: "#D6BC8D",
          400: "#C6A76D",
          500: "#A88751",
        },
        border: "#E6E1D6",
        ring: "#7FAF9B",
        background: "#F5F3EE",
        foreground: "#1F3D34",
        muted: { DEFAULT: "#EFEBE0", foreground: "#6B7A72" },
        card: { DEFAULT: "#FFFFFF", foreground: "#1F3D34" },
        popover: { DEFAULT: "#FFFFFF", foreground: "#1F3D34" },
        primary: { DEFAULT: "#1F3D34", foreground: "#F5F3EE" },
        secondary: { DEFAULT: "#7FAF9B", foreground: "#FFFFFF" },
        accent: { DEFAULT: "#C6A76D", foreground: "#1F3D34" },
        destructive: { DEFAULT: "#C2453B", foreground: "#FFFFFF" },
        success: { DEFAULT: "#5F9682", foreground: "#FFFFFF" },
        warning: { DEFAULT: "#D49A3A", foreground: "#1F3D34" },
        input: "#E6E1D6",
      },
      borderRadius: {
        lg: "16px",
        md: "12px",
        sm: "8px",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-fraunces)", "Georgia", "serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(31,61,52,0.04), 0 4px 16px rgba(31,61,52,0.06)",
        card: "0 1px 3px rgba(31,61,52,0.05), 0 8px 24px rgba(31,61,52,0.06)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        shimmer: { "0%": { backgroundPosition: "-1000px 0" }, "100%": { backgroundPosition: "1000px 0" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 2s infinite linear",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
