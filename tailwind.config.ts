import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Bungee', 'cursive'],
        body: ['Karla', 'sans-serif'],
        mono: ['"Space Mono"', 'monospace'],
      },
      colors: {
        // Brand palette — paleta (popsicle) flavor colors
        brand: {
          tinta:  '#241A12', // ink — hand-painted signage black
          fresa:  '#FF3D68', // strawberry
          limon:  '#FFC83D', // lemon
          crema:  '#FFF6E7', // paper / cream
          menta:  '#0FA88F', // mint
          mora:   '#7A3FA0', // grape
        },
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        sticker: '4px 4px 0 0 #241A12',
        'sticker-sm': '2px 2px 0 0 #241A12',
        'sticker-lg': '6px 6px 0 0 #241A12',
        // For badge buttons sitting on a dark (tinta) background
        'sticker-cream': '4px 4px 0 0 #FFF6E7',
        'sticker-cream-lg': '6px 6px 0 0 #FFF6E7',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        drip: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(3px)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        wiggle: 'wiggle 1s ease-in-out infinite',
        float: 'float 3s ease-in-out infinite',
        'slide-up': 'slide-up 0.4s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'scale-in': 'scale-in 0.3s ease-out',
        shimmer: 'shimmer 2s infinite linear',
        drip: 'drip 2.4s ease-in-out infinite',
      },
      backgroundImage: {
        // Hand-painted paleteria cart awning — arcing flavor stripes
        'paleta-arc': "radial-gradient(circle at 50% 130%, #FF3D68 0%, #FF3D68 36%, #FFC83D 36%, #FFC83D 44%, #0FA88F 44%, #0FA88F 52%, #7A3FA0 52%, #7A3FA0 60%, #241A12 60%, #241A12 100%)",
        'card-gradient': "linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))",
      },
    },
  },
  plugins: [],
}

export default config
