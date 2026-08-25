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
        subheading: ['"Baloo 2"', 'sans-serif'],
        body: ['"Nunito Sans"', 'sans-serif'],
        mono: ['"Space Mono"', 'monospace'],
      },
      colors: {
        // Brand palette — agencia espacial Mados
        brand: {
          verde:      '#C8FD5F', // Verde Despegue — contorno de logo, acentos, titulares sobre azul
          azul:       '#3C5DDC', // Azul Órbita — color base de marca, fondos, botones
          ingravidez: '#8898D7', // Azul Ingravidez — detalles, texto secundario, líneas
          blanco:     '#FFFFFF', // Blanco Casco
          naranja:    '#FF7A3D', // Naranja Reentrada — precios, promos del día
          rosa:       '#FF4F8B', // Rosa Picafresa — nostalgia dulce
          amarillo:   '#FFD447', // Amarillo Medalla — premios, insignias, estrellas
          morado:     '#6B3FA0', // Morado Nebulosa — fondos nocturnos, sabores nuevos
          noche:      '#23327A', // Azul noche — contraste/fondo oscuro alternativo
          sombra:     '#1C2440', // Sombra — contornos, sombras duras, texto
          gris:       '#6B7390', // Gris medio — texto secundario/metadatos
          grisclaro:  '#CFD4E4', // Gris claro — bordes suaves
          papel:      '#F4F6FB', // Papel — fondo claro alterno
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
        // Sombra dura diagonal — plana, sin blur, offset 8-14px (regla de "trazo cómic")
        sticker: '10px 10px 0 0 #1C2440',
        'sticker-sm': '6px 6px 0 0 #1C2440',
        'sticker-lg': '14px 14px 0 0 #1C2440',
        // Para piezas sobre fondo azul de marca
        'sticker-white': '10px 10px 0 0 #FFFFFF',
        'sticker-verde': '10px 10px 0 0 #C8FD5F',
        // Tarjeta estándar (brand book §4)
        card: '8px 8px 0 rgba(60,93,220,.22)',
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
        // Trama de puntos — rellena fondos vacíos al ~15% de opacidad
        'dots-azul': "radial-gradient(circle, rgba(255,255,255,0.15) 1.5px, transparent 1.5px)",
        'dots-papel': "radial-gradient(circle, rgba(28,36,64,0.15) 1.5px, transparent 1.5px)",
        'card-gradient': "linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))",
      },
      backgroundSize: {
        dots: '18px 18px',
      },
    },
  },
  plugins: [],
}

export default config
