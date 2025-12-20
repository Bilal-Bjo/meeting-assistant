/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx,html}'],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: 'var(--background)',
          secondary: 'var(--background-secondary)',
          tertiary: 'var(--background-tertiary)',
        },
        surface: {
          DEFAULT: 'var(--surface)',
          hover: 'var(--surface-hover)',
          active: 'var(--surface-active)',
        },
        border: {
          DEFAULT: 'var(--border)',
          subtle: 'var(--border-subtle)',
          strong: 'var(--border-strong)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          muted: 'var(--text-muted)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
        },
        success: {
          DEFAULT: 'var(--success)',
          hover: 'var(--success-hover)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          hover: 'var(--destructive-hover)',
        },
        warning: 'var(--warning)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
    },
  },
  plugins: [],
}
