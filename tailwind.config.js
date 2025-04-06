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
        primary: "#121212",
        secondary: "#282828",
        tertiary: "#DAA520",
      },
      fontFamily: {
        'dm-display': ['"DM Serif Display"', 'serif'],
        'poppins': ['Poppins', 'sans-serif'],
      },      
    },
  },
  plugins: [],
};
