/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.{html,js}"],
  theme: {
    extend: {
      colors: {
        primary: 'var(--bitcoin-orange)',
        'primary-hover': 'var(--bitcoin-orange-hover)',
        'primary-active': 'var(--bitcoin-orange-active)',
        background: '#000',
        secondary: '#fff',
      }
    },
  },
  plugins: [],
}