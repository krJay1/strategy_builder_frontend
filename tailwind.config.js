/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: "#0A0A0A",
        card: "#1e2124",
        surface: {
          DEFAULT: "#1e2124",
          subtle: "#24282d",
          muted: "#2b3036",
          card: "#1e2124",
        },
        border: {
          DEFAULT: "#2d3239",
          subtle: "#262a30",
          bright: "#3c434d",
        },
        accent: {
          DEFAULT: "#6366F1",
          hover: "#4F46E5",
          cyan: "#06B6D4",
          emerald: "#10B981",
          rose: "#F43F5E",
          amber: "#F59E0B",
        },
        trade: {
          buy: "#10B981",
          buyBg: "rgba(16, 185, 129, 0.12)",
          sell: "#F43F5E",
          sellBg: "rgba(244, 63, 94, 0.12)",
          profit: "#059669",
          loss: "#E11D48",
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'card': '0 4px 20px -2px rgba(0, 0, 0, 0.4)',
        'glow-primary': '0 0 20px -5px rgba(99, 102, 241, 0.25)',
        'glow-emerald': '0 0 20px -5px rgba(16, 185, 129, 0.25)',
        'glow-rose': '0 0 20px -5px rgba(244, 63, 94, 0.25)',
      },
    },
  },
  plugins: [],
}
