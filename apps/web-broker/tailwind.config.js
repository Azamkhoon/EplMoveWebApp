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
        // Broker portal accent: teal/emerald to differentiate from shipper (blue) & carrier (blue)
        brand: {
          50:  "#f0fdf9", 100: "#ccfbef", 200: "#99f6e0", 300: "#5eead4",
          400: "#2dd4bf", 500: "#14b8a6", 600: "#0d9488", 700: "#0f766e",
          800: "#115e59", 900: "#134e4a",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(11,26,46,0.04), 0 1px 6px -1px rgba(11,26,46,0.08)",
        "card-hover": "0 4px 12px -2px rgba(11,26,46,0.12), 0 2px 6px -2px rgba(11,26,46,0.08)",
      },
      borderRadius: { xl: "0.875rem", "2xl": "1.125rem" },
      keyframes: {
        "fade-in": { "0%": { opacity: "0", transform: "translateY(4px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
      },
      animation: { "fade-in": "fade-in 0.25s ease-out" },
    },
  },
  plugins: [],
};
