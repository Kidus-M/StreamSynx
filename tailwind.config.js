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
        primary: "#121212", // Near Black
        secondary: "#282828", // Dark Gray
        accent: "#DAA520", // Goldenrod
        accentcopper: "#B87333", // Copper
        accentsoftgold: "#F4BF4F", // Softer Gold
        textprimary: "#EAEAEA", // Very Light Gray
        textsecondary: "#A0A0A0", // Medium Gray
      },
      fontFamily: {
        'dm-display': ['"DM Serif Display"', 'serif'],
        'poppins': ['Poppins', 'sans-serif'],
      },      
    },
  },
  plugins: [],
};
