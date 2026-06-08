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
        // Path of Exile 2 palette: blood-red accent, obsidian surfaces.
        primary: {
          DEFAULT: '#d24b4b', // PoE2 blood red
          hover: '#e06a6a',
          muted: '#9a3535',
        },
        surface: {
          DEFAULT: '#16202c',
          elevated: '#22303f',
          overlay: '#0b111a',
        },
        accent: {
          green: '#4fb6c4', // PoE2 teal (kept under the 'green' key for class compatibility)
          'green-hover': '#3a98a6',
        },
        border: {
          DEFAULT: '#2b3744',
          subtle: 'rgba(255,255,255,0.05)',
        },
      },
      fontFamily: {
        sans: ['Fira Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'ui-monospace', 'monospace'],
      },
      backgroundImage: {
        'grid-pattern': 'radial-gradient(circle, #334155 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid': '32px 32px',
      },
      gridTemplateColumns: {
        // 24-column grid for the commits-by-hour chart (Tailwind ships only 1–12)
        '24': 'repeat(24, minmax(0, 1fr))',
      },
    },
  },
  plugins: [
    // Enables `compact:` utilities, active when the root has the `compact`
    // class. Used by Compact Mode to tighten UI-chrome density.
    function ({ addVariant }) {
      addVariant('compact', '.compact &')
    },
  ],
}
