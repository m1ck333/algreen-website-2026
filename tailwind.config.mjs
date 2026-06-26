/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
  theme: {
    extend: {
      colors: {
        // Algreen brand: deep charcoal + warm aluminium/gold accent
        ink: {
          DEFAULT: '#1f1c1c',
          900: '#161313',
          800: '#1f1c1c',
          700: '#2b2727',
        },
        brand: {
          50: '#f5f7f4',
          100: '#e3ebe0',
          200: '#c6d6bf',
          300: '#9fb894',
          400: '#769566',
          500: '#577a47', // algreen "green"
          600: '#436035',
          700: '#374d2d',
          800: '#2e3e27',
          900: '#283523',
        },
        gold: {
          DEFAULT: '#bfa46f',
          light: '#d8c79c',
          dark: '#9c8350',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      maxWidth: {
        content: '1200px',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.7s ease-out both',
      },
    },
  },
  plugins: [],
};
