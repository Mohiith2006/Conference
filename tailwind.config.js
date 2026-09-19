/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        beige: {
          50: '#FAF8F5',
          100: '#F5F1E9',
          150: '#EFEAE0',
          200: '#E8E2D5',
          300: '#D9D0C1',
          400: '#C2B6A3',
          500: '#A89984',
          600: '#8A7A66',
          700: '#6C5E4E',
          800: '#4D4236',
          900: '#2E271F',
        },
        ink: {
          900: '#1C1A18',
          800: '#2B2826',
          700: '#423D38',
          600: '#5E5750',
          500: '#7D756C',
          400: '#A1988D',
          300: '#C4BCB1',
        },
        terracotta: {
          50: '#FBF5F3',
          100: '#F5E6E1',
          600: '#9C4A32',
          700: '#853C26',
          800: '#6E301D',
        },
        sage: {
          50: '#F4F6F4',
          100: '#E4EAE4',
          600: '#47634F',
          700: '#394F3F',
        }
      },
      fontFamily: {
        serif: ['Merriweather', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
