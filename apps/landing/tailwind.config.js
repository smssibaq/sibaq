/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        'surface-subtle': 'var(--color-surface-subtle)',
        border: 'var(--color-border)',
        foreground: 'var(--color-text)',
        'muted-foreground': 'var(--color-text-muted)',
        primary: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          foreground: 'var(--color-accent-foreground, #0B1F19)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          foreground: 'var(--color-text)',
        },
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        danger: 'var(--color-danger)',
        info: 'var(--color-info)',
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius-md)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        dropdown: 'var(--shadow-dropdown)',
      },
      maxWidth: {
        container: '1200px',
      },
      minHeight: {
        control: '44px',
      },
    },
  },
  plugins: [],
};

