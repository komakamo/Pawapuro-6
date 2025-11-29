/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      fontFamily: {
        mono: ['Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
  safelist: [
    { pattern: /bg-(red|yellow|blue|orange|green|fuchsia|cyan)-.+/ },
    { pattern: /border-(red|yellow|blue|orange|green|fuchsia|cyan)-.+/ },
    { pattern: /text-(red|yellow|blue|orange|green|fuchsia|cyan)-.+/ },
    { pattern: /shadow-.+/ },
    { pattern: /ring-.+/ },
  ]
}
