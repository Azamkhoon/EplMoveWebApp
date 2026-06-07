/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand navy
        navy: {
          50: "#eef2f8",
          100: "#d6e0ee",
          200: "#aec1dd",
          300: "#7f9cc7",
          400: "#5176ad",
          500: "#345a92",
          600: "#274574",
          700: "#1d3559",
          800: "#142540",
          900: "#0b1a2e",
          950: "#06101d",
        },
        // Accent blue
        brand: {
          50: "#eff5ff",
          100: "#dbe8fe",
          200: "#bfd6fe",
          300: "#93bbfd",
          400: "#609afa",
          500: "#3b82f6",
          600: "#1d4ed8",
          700: "#1e40af",
          800: "#1e3a8a",
          900: "#1e3a8a",
        },
        // Semantic status palette
        status: {
          posted: "#2563eb",
          draft: "#64748b",
          transit: "#d97706",
          delivered: "#16a34a",
          delayed: "#dc2626",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(11, 26, 46, 0.04), 0 1px 6px -1px rgba(11, 26, 46, 0.08)",
        "card-hover":
          "0 4px 12px -2px rgba(11, 26, 46, 0.12), 0 2px 6px -2px rgba(11, 26, 46, 0.08)",
        nav: "0 1px 0 0 rgba(11, 26, 46, 0.06)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          "0%": { opacity: "0", transform: "translateX(12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.8)", opacity: "0.6" },
          "100%": { transform: "scale(2.2)", opacity: "0" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
        "pulse-ring": "pulse-ring 1.6s ease-out infinite",
      },
    },
  },
  plugins: [],
};
