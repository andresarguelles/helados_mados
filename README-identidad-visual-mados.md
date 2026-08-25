# Misión Mados — Guía de identidad visual (para implementación web)

Fuente: `Brand Book Helados Mados v2.dc.html` (31 diapositivas). Este README consolida todas las reglas de marca para llevarlas a la app web.

## 1. Concepto de marca

Helados Mados no es "helados con astronautas": es una **agencia espacial que reparte helados**. El espacio es estructura de negocio, no decoración. Vocabulario obligatorio en toda la interfaz:

| Término genérico | Término de marca |
|---|---|
| Puesto / sucursal | Estación (ej. "Estación 01 · Zaragoza") |
| Cliente / usuario | Cadete (rangos: Cadete → Piloto → Comandante) |
| Dinámica / promo | Entrenamiento |
| Helado gratis / premio | Medalla |
| Vendedor / staff | Comandante |
| Menú | Bitácora de sabores |
| Nuevo sabor | Descubrimiento |
| Audiencia / comunidad | Los Cadetes Mados |

**Naming:** estaciones = número de 2 dígitos + colonia/escuela. Los sabores NUNCA llevan nombre espacial (Picafresa sigue siendo Picafresa); lo espacial va en el formato/experiencia, no en el producto.

**Tagline principal:** "Despega por un helado".
**Elevator pitch:** agencia espacial de helados tradicionales de CDMX; estaciones móviles a la salida de escuelas; se juega, se gana, se vive en persona lo que se ve en TikTok.

**Tono de voz:** de tú, frases cortas gritables, humor de barrio tierno, español de México sin traducir (chido, aguas, va). Nunca: lenguaje corporativo ("experiencia premium"), tono condescendiente, "artesanal/gourmet", groserías o textos largos.

**Personalidad:** arquetipo principal El Bufón (humor, ruptura), secundario El Explorador (descubrir, avanzar, coleccionar). Muy juguetón, popular (no gourmet), energético, cálido, infantil sin ser infantiloide — debe gustarle también al adolescente que sigue la marca en TikTok.

## 2. Regla de oro de color (el cambio clave de v2)

**El fondo oscuro de marca es el azul #3C5DDC — NUNCA negro.** El negro/grises solo existen en texto, contornos, sombras duras y botones; jamás como fondo de una pieza completa o pintura de local.

Proporción de uso: **60% azul + blanco, 30% verde, 10% acentos.**

### Paleta principal (fija, intocable)
- **Verde Despegue** `#C8FD5F` — RGB 200,253,95 / CMYK 22,0,70,0 — contorno del logo, acentos, titulares sobre azul. Nunca como fondo de texto largo.
- **Azul Órbita** `#3C5DDC` — RGB 60,93,220 / CMYK 79,69,0,0 — color base de marca, fondos, botones, visor del casco.
- **Azul Ingravidez** `#8898D7` — RGB 136,152,215 / CMYK 42,31,0,16 — detalles, texto secundario, líneas, sombras planas, patrones.
- **Blanco Casco** `#FFFFFF` — traje, brillos, texto sobre azul.

### Acentos secundarios (uso puntual, nunca dominantes)
- Naranja Reentrada `#FF7A3D` — precios, promos del día, sabores cítricos.
- Rosa Picafresa `#FF4F8B` — fresa/tamarindo, nostalgia dulce.
- Amarillo Medalla `#FFD447` — premios, insignias, estrellas.
- Morado Nebulosa `#6B3FA0` — fondos nocturnos, sabores nuevos/misteriosos.

### Neutros (estructura, nunca fondo principal)
- Azul noche `#23327A` — contraste/fondo oscuro alternativo.
- Sombra `#1C2440` — contornos, sombras duras, texto.
- Gris medio `#6B7390` — texto secundario/metadatos.
- Gris claro `#CFD4E4` — bordes suaves.
- Papel `#F4F6FB` — fondo claro alterno (secciones sobre blanco/hueso).

## 3. Tipografía

Todas disponibles en Canva/Google Fonts:
- **Bungee** — SOLO mayúsculas, SOLO ≥40px. Títulos y rótulos de gran peso (iguala el grosor del contorno del logo).
- **Baloo 2 (ExtraBold/800)** — subtítulos, puente entre Bungee y cuerpo de texto.
- **Nunito Sans (400 regular / 900 black para destacados)** — cuerpo de texto, lectura general.
- **Space Mono (400/700)** — datos técnicos: horarios, códigos, números de estación, etiquetas, siempre en mayúsculas.

## 4. El "trazo cómic" — 4 reglas obligatorias de estilo

Cualquier pieza que cumpla las 4 reglas se ve "Mados", incluso sin el logo:

1. **Contorno:** todo lleva borde — 6px en piezas grandes, 4px en digital, color `#1C2440`, grosor constante (no varía).
2. **Sombra dura:** desplazada en diagonal (ej. offset 8-14px), un solo color plano, sin difuminado ni degradados. Nunca sombras suaves tipo `box-shadow` con blur.
3. **Trama de puntos:** patrón de puntos regular (radial-gradient repetido) al ~15% de opacidad para rellenar fondos vacíos.
4. **Etiqueta ladeada:** avisos/badges en pastilla (`border-radius: 999px`) rotados entre 2° y -8°, con borde de 3-4px y sombra dura — gesto de "sticker pegado a mano".

Contenedores de tarjeta estándar: `border: 4px solid #3C5DDC; border-radius: 20-24px; box-shadow: 8px 8px 0 rgba(60,93,220,.22)` sobre fondo blanco, o borde `#1C2440` con sombra sólida sobre fondo de color.

## 5. Logotipo

- No se rediseña: se usa el archivo existente (`mados-logo.svg`) tal cual, con sistema de aplicación.
- Elementos que lo hacen funcionar: contorno tipo sticker (verde, unificado), la O como OVNI (candidato a isotipo), astronauta de cabeza (mascota/prueba de humor), cruce verde+azul poco común en la categoría.
- **Versiones:** Principal horizontal (default), Secundaria vertical (formatos altos/perfiles), Isotipo OVNI (favicon, app, sellos, stickers pequeños), Monocromática (pendiente de generar a mano, para bordado/una tinta — nunca por filtro).
- **Área de seguridad:** 0.5X (X = altura del casco) libre en los 4 lados; nada entra ahí.
- **Tamaño mínimo impreso:** horizontal 35mm, vertical 25mm, isotipo 12mm.
- **Tamaño mínimo digital:** horizontal 160px, vertical 96px, isotipo/favicon 32px. Por debajo del mínimo usar solo el isotipo.
- **Combinaciones permitidas:** full color sobre blanco, sobre azul de marca `#3C5DDC`, sobre azul noche `#23327A`, sobre foto oscura con 40% de sombra. Versión de un tono en blanco solo sobre azul.
- **Prohibido:** deformar, rotar/inclinar, recolorear (hue-shift), poner sobre fondos saturados/gradientes ajenos, verde sobre verde, meterlo en otra caja/forma, añadirle sombras o contornos extra.

## 6. Iconografía y elementos gráficos

- **Iconos:** trazo uniforme 8px sobre lienzo 96, esquinas redondeadas, relleno plano de un solo color, sin degradados/sombras. Contorno verde cuando van sueltos sobre foto.
- **Ilustración:** estilo sticker — contorno grueso, sombra plana de un tono, sin texturas. Repertorio: astronauta, OVNI, planetas anillados, cometas, estrellas de 4 puntas, banderines, medallas.
- **Insignias/parches:** circulares, aro exterior verde, fondo azul, número en Space Mono. Son el motor del merch/coleccionismo (una por estación y por entrenamiento).
- **Patrones de fondo:** campo estelar (puntos dispersos verde/lila/amarillo sobre azul), estela diagonal (rayas repeating-linear-gradient azul/azul oscuro), onda de despegue (arcos concéntricos sutiles).

## 7. Fotografía

- Documental, no de estudio ni banco de imágenes. Nunca helado gourmet estilizado.
- Qué fotografiar: reacciones (risa, fila, manos recibiendo el helado), no producto estático.
- Encuadre: **vertical 9:16 nativo**, cámara a la altura del niño, contrapicado para que el producto se vea más grande.
- Luz: luz de día directa, sin filtros suaves; sombra dura permitida; alta saturación que deje respirar verde y azul de marca.

## 8. Aplicaciones ya definidas (mockups)

- **Estación móvil:** toldo verde, faldón blanco con número de estación, panel azul con logo, hieleras forradas con el sistema visual.
- **Uniformes/merch:** playera azul, gorra verde, parche de estación bordado (coleccionable).
- **Papelería:** tarjeta de cadete sellable, formato de anuncio vertical 9:16.
- **Redes sociales:** plantillas para TikTok respetando zona segura de la interfaz de la app.
- **Web:** la landing tiene un solo trabajo — decir dónde está la marca hoy y cuál es el reto/entrenamiento activo; todo lo demás es secundario.

## 9. Reglas rápidas para implementación en la app

1. Fondo oscuro global = `#3C5DDC`. Si necesitas un fondo claro alterno usa `#F4F6FB` (papel) o blanco. Nunca negro puro ni grises oscuros como fondo de pantalla completa.
2. Texto sobre azul: blanco o `#C8FD5F` para énfasis/números destacados; `rgba(255,255,255,.8)` para texto secundario.
3. Texto sobre blanco/papel: `#1C2440` cuerpo, `#3C5DDC` para títulos Bungee, `#6B7390` para labels/metadatos.
4. Componentes (cards, botones, badges) llevan borde sólido de 3-4px + sombra dura offset (no blur) en el color de contraste — nunca `box-shadow` difuso.
5. Badges/etiquetas de estado o categoría: pastilla verde `#C8FD5F` sobre `#1C2440`, texto en Space Mono mayúsculas, rotada levemente (-1.5° a -6°).
6. Botones primarios: fondo `#3C5DDC` con borde `#1C2440`, texto blanco o verde para el CTA principal.
7. Toda etiqueta técnica/numérica (horarios, número de estación, precios) en Space Mono mayúsculas.
8. Vocabulario de UI: usar siempre "estación", "cadete", "entrenamiento", "medalla", "comandante", "bitácora de sabores" en vez de los términos genéricos — ver tabla en sección 1.
9. Mínimo de logo en digital: 160px horizontal / 32px isotipo — no reducir el logo completo por debajo de eso; usar el isotipo del OVNI en su lugar.
