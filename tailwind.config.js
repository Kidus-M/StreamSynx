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
        primary: "#121212",        // Near Black (Page Background)
        secondary: "#282828",      // Dark Gray (Card/Section Backgrounds)
        'secondary-light': '#333333', // Lighter Gray (Borders, Subtle Elements)
        accent: "#DAA520",         // Goldenrod (Buttons, Highlights)
        'accent-hover': "#C8941A",  // Darker Gold (Hover)
        'accent-secondary': "#F4BF4F", // Softer Gold (Alternative Accent)
        textprimary: "#EAEAEA",     // Very Light Gray (Main Text)
        textsecondary: "#A0A0A0",   // Medium Gray (Subtle Text, Labels)
      },
      fontFamily: {
        'dm-display': ['"DM Serif Display"', 'serif'],
        'poppins': ['Poppins', 'sans-serif'],
      },      
    },
  },
  plugins: [],
};
