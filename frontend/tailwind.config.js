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
        inter: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
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
        warning: { DEFAULT: c('--warning'), border: c('--warning-border'), foreground: c('--warning-foreground') },
      },
      backgroundImage: {
        // Green→teal gradients on brand/CTA/accent surfaces only (never on data surfaces).
        emerald: 'linear-gradient(135deg, oklch(0.72 0.19 155), oklch(0.6 0.18 172))',
        'emerald-soft': 'radial-gradient(closest-side, oklch(0.85 0.14 155 / 0.35), transparent)',
        'sidebar-dark': 'linear-gradient(165deg, oklch(0.18 0.03 220), oklch(0.14 0.025 240))',
        'sql-dark': 'linear-gradient(165deg, oklch(0.2 0.03 250), oklch(0.15 0.025 260))',
        'table-head': 'linear-gradient(90deg, oklch(0.95 0.03 155), oklch(0.96 0.015 200))',
        shimmer:
          'linear-gradient(90deg, oklch(0.95 0.006 90) 25%, oklch(0.9 0.02 155) 37%, oklch(0.95 0.006 90) 63%)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        green: '0 6px 16px oklch(0.65 0.19 155 / 0.4)',
        'green-lg': '0 8px 20px -6px oklch(0.6 0.18 165 / 0.5)',
        card: '0 4px 16px -8px oklch(0.2 0.02 220 / 0.14)',
        frame: '0 2px 4px oklch(0.2 0 0 / 0.04), 0 40px 80px -20px oklch(0.35 0.1 155 / 0.28)',
      },
      keyframes: {
        caret: { '0%,49%': { opacity: '1' }, '50%,100%': { opacity: '0' } },
        shimmer: { '0%': { backgroundPosition: '200% 0' }, '100%': { backgroundPosition: '-200% 0' } },
        glowPulse: {
          '0%,100%': { boxShadow: '0 6px 16px oklch(0.65 0.19 155 / 0.4)' },
          '50%': { boxShadow: '0 6px 22px oklch(0.65 0.19 155 / 0.65)' },
        },
        gradientShift: { '0%,100%': { backgroundPosition: '0% 50%' }, '50%': { backgroundPosition: '100% 50%' } },
        orbFloat: {
          '0%,100%': { transform: 'translate(0,0) scale(1)' },
          '25%': { transform: 'translate(30px,-40px) scale(1.1)' },
          '50%': { transform: 'translate(-20px,20px) scale(0.95)' },
          '75%': { transform: 'translate(15px,30px) scale(1.05)' },
        },
        particleFade: {
          '0%,100%': { opacity: '0', transform: 'translateY(0)' },
          '50%': { opacity: '0.4', transform: 'translateY(-20px)' },
        },
      },
      animation: {
        caret: 'caret 1s steps(1) infinite',
        shimmer: 'shimmer 1.6s linear infinite',
        glow: 'glowPulse 3.5s ease-in-out infinite',
        'gradient-shift': 'gradientShift 6s ease infinite',
        'orb-float': 'orbFloat 20s ease-in-out infinite',
        particle: 'particleFade 4s ease-in-out infinite',
      },
    },
  },
  plugins: [require('@tailwindcss/typography'), require('tailwindcss-animate')],
};
