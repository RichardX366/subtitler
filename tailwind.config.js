const colors = require('tailwindcss/colors');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './node_modules/@richardx/components/dist/**/*.js',
  ],
  theme: {
    extend: {
      colors: {
        THEME: colors.sky,
      },
    },
  },
  plugins: [require('daisyui')],
};
