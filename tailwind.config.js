const { fontFamily } = require('tailwindcss/defaultTheme')

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a'
        },
        accent: {
          100: '#fbcfe8',
          200: '#f472b6',
          300: '#ec4899'
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', ...fontFamily.sans]
      },
      boxShadow: {
        glass: '0 20px 45px -25px rgba(59, 130, 246, 0.45)'
      }
    }
  },
  plugins: [require('@tailwindcss/typography')]
}
