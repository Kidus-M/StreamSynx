/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0B0B0E",          // Page background (near black)
        'primary-soft': "#101015",   // Slightly raised background
        secondary: "#15151B",        // Card / section surfaces
        'secondary-light': "#23232B",// Borders, subtle elements
        accent: "#E9B949",           // Gold (buttons, highlights)
        'accent-hover': "#D4A43A",   // Darker gold (hover)
        'accent-secondary': "#F5D48A",
        textprimary: "#F4F4F5",
        textsecondary: "#9B9BA5",
      },
      fontFamily: {
        // `font-poppins` is kept as an alias so existing markup picks up the new stack.
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
        poppins: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
        'dm-display': ['"DM Serif Display"', 'serif'],
      },
      letterSpacing: {
        tighter: '-0.03em',
        tight: '-0.02em',
      },
      boxShadow: {
        'card': '0 1px 2px rgba(0,0,0,0.4), 0 8px 24px -12px rgba(0,0,0,0.6)',
        'lift': '0 18px 40px -18px rgba(0,0,0,0.85)',
        'glow': '0 0 0 1px rgba(233,185,73,0.35), 0 12px 32px -12px rgba(233,185,73,0.35)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both',
        'fade-in': 'fade-in 0.4s ease-out both',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
