/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",

    // Or if using `src` directory:
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#01151d",
        secondary: "#ff7f50",
        tertiary: "#FAF3E0",
      },
      fontFamily: {
        'dm-display': ['"DM Serif Display"', 'serif'],
      },      
    },
  },
  plugins: [],
};
