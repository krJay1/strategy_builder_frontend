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
        canvas: {
          dark: "#0b0e14",
          light: "#f8fafc",
        },
        card: {
          dark: "#151921",
          light: "#ffffff",
        },
        surface: {
          dark: "#151921",
          light: "#ffffff",
          subtleDark: "#1c222b",
          subtleLight: "#f1f5f9",
          mutedDark: "#242c38",
          mutedLight: "#e2e8f0",
          inputDark: "#0d1117",
          inputLight: "#f8fafc",
        },
        border: {
          dark: "#232a35",
          light: "#e2e8f0",
          subtleDark: "#1a2029",
          subtleLight: "#f1f5f9",
          brightDark: "#333d4d",
          brightLight: "#cbd5e1",
        },
        accent: {
          DEFAULT: "#6366f1",
          hover: "#4f46e5",
          cyan: "#06b6d4",
          emerald: "#10b981",
          rose: "#f43f5e",
          amber: "#f59e0b",
        },
        trade: {
          buy: "#10b981",
          buyBg: "rgba(16, 185, 129, 0.12)",
          sell: "#f43f5e",
          sellBg: "rgba(244, 63, 94, 0.12)",
          profit: "#059669",
          loss: "#e11d48",
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'card-dark': '0 4px 20px -2px rgba(0, 0, 0, 0.4)',
        'card-light': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'glow-primary': '0 0 20px -5px rgba(99, 102, 241, 0.25)',
        'glow-emerald': '0 0 20px -5px rgba(16, 185, 129, 0.25)',
        'glow-rose': '0 0 20px -5px rgba(244, 63, 94, 0.25)',
      },
    },
  },
  plugins: [],
}
