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
          DEFAULT: '#c2a24c',
          light: '#e3cf94',
          dark: '#9a7c33',
        },
        // warm luxe neutrals for a more premium feel than flat white
        cream: {
          DEFAULT: '#f7f4ee',
          50: '#faf8f3',
          100: '#f2ede3',
          200: '#e7dfce',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Cormorant Garamond"', '"Playfair Display"', 'Georgia', 'serif'],
      },
      letterSpacing: {
        widest2: '0.28em',
      },
      maxWidth: {
        content: '1240px',
      },
      backgroundImage: {
        'gold-line': 'linear-gradient(90deg, transparent, #c2a24c, transparent)',
        'gold-text': 'linear-gradient(100deg, #9a7c33, #e3cf94 45%, #9a7c33)',
        'noise':
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")",
      },
      boxShadow: {
        luxe: '0 30px 60px -25px rgba(31,28,28,0.35)',
        'luxe-lg': '0 40px 80px -30px rgba(31,28,28,0.45)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        kenburns: {
          '0%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1.18)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% center' },
          '100%': { backgroundPosition: '-200% center' },
        },
        'scroll-cue': {
          '0%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
          '50%': { transform: 'translateY(8px)', opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.8s cubic-bezier(0.22,1,0.36,1) both',
        kenburns: 'kenburns 18s ease-out both',
        'scroll-cue': 'scroll-cue 1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
