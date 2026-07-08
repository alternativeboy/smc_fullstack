/** @type {import('tailwindcss').Config} */
const c = (v) => `oklch(var(${v}) / <alpha-value>)`;

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        border: c('--border'),
        input: c('--input'),
        ring: c('--ring'),
        background: c('--background'),
        foreground: c('--foreground'),
        primary: { DEFAULT: c('--primary'), foreground: c('--primary-foreground') },
        secondary: { DEFAULT: c('--secondary'), foreground: c('--secondary-foreground') },
        destructive: { DEFAULT: c('--destructive'), foreground: c('--destructive-foreground') },
        muted: { DEFAULT: c('--muted'), foreground: c('--muted-foreground') },
        accent: { DEFAULT: c('--accent'), foreground: c('--accent-foreground') },
        card: { DEFAULT: c('--card'), foreground: c('--card-foreground') },
        popover: { DEFAULT: c('--popover'), foreground: c('--popover-foreground') },
        sidebar: { DEFAULT: c('--sidebar'), border: c('--sidebar-border') },
        warning: { DEFAULT: c('--warning'), border: c('--warning-border'), foreground: c('--warning-foreground') },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        green: '0 3px 8px oklch(0.62 0.13 155 / 0.35)',
        'green-lg': '0 4px 12px oklch(0.62 0.13 155 / 0.28)',
        frame: '0 1px 2px oklch(0.2 0 0 / 0.04), 0 24px 48px -12px oklch(0.2 0.02 250 / 0.16)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
