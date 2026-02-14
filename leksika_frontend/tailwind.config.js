/** @type {import('tailwindcss').Config} */

import scrollbar from 'tailwind-scrollbar';
import typography from '@tailwindcss/typography';

export default {
  darkMode: 'class',

  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // --- PENYESUAIAN BERDASARKAN APP.VUE ---
        'primary': 'var(--color-primary)',
        'on-primary': 'var(--color-on-primary)',
        'primary-container': 'var(--color-primary-container)',
        'on-primary-container': 'var(--color-on-primary-container)',
        'secondary': 'var(--color-secondary)',
        'on-secondary': 'var(--color-on-secondary)',
        'secondary-container': 'var(--color-secondary-container)',
        'on-secondary-container': 'var(--color-on-secondary-container)',
        'tertiary': 'var(--color-tertiary)',
        'on-tertiary': 'var(--color-on-tertiary)',
        'tertiary-container': 'var(--color-tertiary-container)',
        'on-tertiary-container': 'var(--color-on-tertiary-container)',
        'error': 'var(--color-error)',
        'on-error': 'var(--color-on-error)',
        'error-container': 'var(--color-error-container)',
        'on-error-container': 'var(--color-on-error-container)',
        'background': 'var(--color-background)',
        'on-background': 'var(--color-on-background)',
        'surface': 'var(--color-surface)',
        'on-surface': 'var(--color-on-surface)',
        'surface-variant': 'var(--color-surface-variant)',
        'on-surface-variant': 'var(--color-on-surface-variant)',
        'outline': 'var(--color-outline)',
        'outline-variant': 'var(--color-outline-variant)',
        'shadow': 'var(--color-shadow)',
        'scrim': 'var(--color-scrim)',
        'inverse-surface': 'var(--color-inverse-surface)',
        'inverse-on-surface': 'var(--color-inverse-on-surface)',
        'inverse-primary': 'var(--color-inverse-primary)',
        'surface-dim': 'var(--color-surface-dim)',
        'surface-bright': 'var(--color-surface-bright)',
        'surface-container-lowest': 'var(--color-surface-container-lowest)',
        'surface-container-low': 'var(--color-surface-container-low)',
        'surface-container': 'var(--color-surface-container)',
        'surface-container-high': 'var(--color-surface-container-high)',
        'surface-container-highest': 'var(--color-surface-container-highest)',
        'control-normal': 'var(--color-control-normal)',
        'control-activated': 'var(--color-control-activated)',

        // Palet warna tema yang sudah ada
        'theme-orange': {
          100: '#fff7ed', 400: '#fb923c', 500: '#f97316', DEFAULT: '#f97316', 600: '#ea580c',
        },
        'theme-yellow': {
          100: '#fefce8', 400: '#facc15', 500: '#eab308', DEFAULT: '#eab308', 600: '#ca8a04',
        },
        'theme-green': {
          100: '#f0fdf4', 400: '#4ade80', 500: '#22c55e', DEFAULT: '#22c55e', 600: '#16a34a',
        },
        'theme-cyan': {
          100: '#ecfeff', 400: '#22d3ee', 500: '#06b6d4', DEFAULT: '#06b6d4', 600: '#0891b2',
        },
        'theme-indigo': {
          100: '#eef2ff', 400: '#818cf8', 500: '#6366f1', DEFAULT: '#6366f1', 600: '#4f46e5',
        },
        'theme-purple': {
          100: '#f5f3ff', 400: '#a78bfa', 500: '#8b5cf6', DEFAULT: '#8b5cf6', 600: '#7c3aed',
        },
        pink: {
          50: '#fdf2f8', 100: '#fce7f3', 200: '#fbcfe8', 300: '#f9a8d4', 400: '#f472b6',
          500: '#ec4899', 600: '#db2777', 700: '#be185d', 800: '#9d174d', 900: '#831843',
          950: '#500724',
        },
      }
    },
  },
  plugins: [
    scrollbar({ nocompatible: true }),
    typography(),
  ],
}
