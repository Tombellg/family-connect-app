/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: '#6366f1',
      },
      boxShadow: {
        glow: '0 0 20px rgba(99, 102, 241, 0.45)',
      },
      backgroundImage: {
        'grid-glow': 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, rgba(15,23,42,0.95) 70%)',
        'brand-gradient': 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #0ea5e9 100%)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography'), require('@tailwindcss/forms')],
};
