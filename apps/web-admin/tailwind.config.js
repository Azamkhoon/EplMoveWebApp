/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#eef2f8", 100: "#d6e0ee", 200: "#aec1dd", 300: "#7f9cc7",
          400: "#5176ad", 500: "#345a92", 600: "#274574", 700: "#1d3559",
          800: "#142540", 900: "#0b1a2e", 950: "#06101d",
        },
        // Admin accent: violet/purple — distinct from shipper (blue), carrier (teal), broker (teal)
        brand: {
          50:  "#f5f3ff", 100: "#ede9fe", 200: "#ddd6fe", 300: "#c4b5fd",
          400: "#a78bfa", 500: "#8b5cf6", 600: "#7c3aed", 700: "#6d28d9",
          800: "#5b21b6", 900: "#4c1d95",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(11,26,46,0.04), 0 1px 6px -1px rgba(11,26,46,0.08)",
      },
      keyframes: {
        "fade-in": { "0%": { opacity: "0", transform: "translateY(4px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
      },
      animation: { "fade-in": "fade-in 0.2s ease-out" },
    },
  },
  plugins: [],
};
