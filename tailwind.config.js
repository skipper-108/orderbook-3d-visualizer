/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bid': '#4ade80', // Green for bids
        'ask': '#f87171', // Red for asks
      },
    },
  },
  plugins: [],
}