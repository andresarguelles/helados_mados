/**
 * La superficie de un helado vista de frente y de muy cerca: el cuadro entero es helado, sin
 * vaso, sin bordes y sin fondo. Corre en el navegador (lo inyecta `build-sabores.mjs`) y no
 * depende de WebGL: todo se calcula en JS sobre un canvas.
 *
 * Dos pasos, y por eso todas las imágenes son una serie:
 *   1. `preparar()` calcula UNA vez el relieve y la luz (difuso con sombra suave, ambiente con
 *      oclusión, brillo especular, subsuperficie). La semilla es fija: misma forma siempre.
 *   2. `pintar(color)` solo combina esos términos con el color de cada sabor. Lo único que
 *      cambia entre una imagen y otra es el color.
 *
 * Modo foto: en vez del relieve calculado, `prepararFoto()` toma una foto real de helado
 * neutro (blanco, sin trozos) y `pintarFoto()` la recolorea. La foto aporta forma, textura,
 * luz y sombras; el sabor, solo el color. Hay una foto por base (leche y agua).
 *
 * Foto propia: `fotoTalCual()` usa la foto de un sabor sin recolorear, solo recortada.
 */
;(() => {
  const SEMILLA = 20261002

  function mulberry32(a) {
    return () => {
      a = (a + 0x6d2b79f5) | 0
      let t = Math.imul(a ^ (a >>> 15), 1 | a)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  const rand = mulberry32(SEMILLA)
  const tabla = new Uint8Array(256)
  for (let i = 0; i < 256; i++) tabla[i] = i
  for (let i = 255; i > 0; i--) {
    const j = (rand() * (i + 1)) | 0
    const t = tabla[i]; tabla[i] = tabla[j]; tabla[j] = t
  }
  const perm = new Uint8Array(512)
  for (let i = 0; i < 512; i++) perm[i] = tabla[i & 255]
  const gx = new Float32Array(256)
  const gy = new Float32Array(256)
  for (let i = 0; i < 256; i++) {
    const a = rand() * Math.PI * 2
    gx[i] = Math.cos(a); gy[i] = Math.sin(a)
  }

  const fade = t => t * t * t * (t * (t * 6 - 15) + 10)
  const suave = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)
  }

  /** Ruido de gradiente (Perlin) en [-1, 1] aprox. */
  function ruido(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y)
    const xf = x - xi, yf = y - yi
    const X = xi & 255, Y = yi & 255
    const a = perm[X + perm[Y]], b = perm[X + 1 + perm[Y]]
    const c = perm[X + perm[Y + 1]], d = perm[X + 1 + perm[Y + 1]]
    const n00 = gx[a] * xf + gy[a] * yf
    const n10 = gx[b] * (xf - 1) + gy[b] * yf
    const n01 = gx[c] * xf + gy[c] * (yf - 1)
    const n11 = gx[d] * (xf - 1) + gy[d] * (yf - 1)
    const u = fade(xf), v = fade(yf)
    const x0 = n00 + (n10 - n00) * u
    const x1 = n01 + (n11 - n01) * u
    return (x0 + (x1 - x0) * v) * 1.41
  }

  /** Suma de octavas, girando cada una para que no se note la rejilla. */
  function fbm(x, y, octavas) {
    let s = 0, a = 0.5
    for (let i = 0; i < octavas; i++) {
      s += a * ruido(x, y)
      const nx = 1.6 * x - 1.2 * y + 3.1
      y = 1.2 * x + 1.6 * y - 1.7
      x = nx
      a *= 0.5
    }
    return s
  }

  function hash(ix, iy, k) {
    let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(k, 2147483647) + SEMILLA
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
  }

  /** Burbujas de aire: hoyuelos redondos repartidos al azar. Devuelve la profundidad 0..1. */
  function poros(x, y, presencia) {
    const xi = Math.floor(x), yi = Math.floor(y)
    let prof = 0
    for (let j = -1; j <= 1; j++) {
      for (let i = -1; i <= 1; i++) {
        const cx = xi + i, cy = yi + j
        if (hash(cx, cy, 1) > presencia) continue
        const px = cx + hash(cx, cy, 2), py = cy + hash(cx, cy, 3)
        const r = 0.08 + 0.16 * hash(cx, cy, 4)
        const dx = (x - px) / r, dy = (y - py) / r
        const d2 = dx * dx + dy * dy
        // Perfil suave en el borde: con un corte seco se leían como anillos de vidrio.
        if (d2 < 1) prof = Math.max(prof, (1 - d2) * (1 - d2))
      }
    }
    return prof
  }

  /** El relieve: pliegues cremosos grandes, las capas que enrolla la cuchara y burbujas. */
  function altura(x, y) {
    const qx = fbm(x, y, 3)
    const qy = fbm(x + 5.2, y + 1.3, 3)
    const rx = fbm(x + 1.4 * qx + 1.7, y + 1.4 * qy + 9.2, 3)
    const ry = fbm(x + 1.4 * qx + 8.3, y + 1.4 * qy + 2.8, 3)
    const pliegues = fbm(x + 1.2 * rx, y + 1.2 * ry, 4)

    // Capas enrolladas: suben despacio y caen en un labio, como el helado que arrastra la
    // cuchara. Las bandas se deforman con los pliegues para que no sean rayas.
    // El labio no es liso: el helado se rasga al enrollarse, así que el borde lleva ruido.
    const s = y * 1.05 + 0.7 * pliegues + 0.45 * rx + 0.12 * x + 0.05 * ruido(x * 16, y * 16)
    const f = s - Math.floor(s)
    let capa = Math.pow(f, 1.4) * (1 - suave(0.86, 1.0, f))
    const mascara = suave(-0.25, 0.35, fbm(x * 0.5 + 11, y * 0.5 - 4, 2))
    capa *= 0.25 + 0.75 * mascara

    let h = 0.45 * pliegues + 0.3 * capa
    h -= 0.014 * poros(x * 10, y * 10, 0.08)
    h -= 0.005 * poros(x * 28 + 3, y * 28 + 5, 0.12)
    // Micro-rugosidad mate: el helado frío no es satín.
    h += 0.004 * fbm(x * 38 + 5, y * 38 - 2, 2)
    return h
  }

  /** Desenfoque de caja separable, en sitio sobre una copia. */
  function desenfocar(fuente, W, H, r) {
    const tmp = new Float32Array(W * H)
    const out = new Float32Array(W * H)
    const n = 2 * r + 1
    for (let y = 0; y < H; y++) {
      let acc = 0
      for (let k = -r; k <= r; k++) acc += fuente[y * W + Math.min(W - 1, Math.max(0, k))]
      for (let x = 0; x < W; x++) {
        tmp[y * W + x] = acc / n
        acc += fuente[y * W + Math.min(W - 1, x + r + 1)] - fuente[y * W + Math.max(0, x - r)]
      }
    }
    for (let x = 0; x < W; x++) {
      let acc = 0
      for (let k = -r; k <= r; k++) acc += tmp[Math.min(H - 1, Math.max(0, k)) * W + x]
      for (let y = 0; y < H; y++) {
        out[y * W + x] = acc / n
        acc += tmp[Math.min(H - 1, y + r + 1) * W + x] - tmp[Math.max(0, y - r) * W + x]
      }
    }
    return out
  }

  let estado = null
  /** Cuánto helado cabe de arriba abajo, en unidades del ruido: menos = cámara más cerca. */
  const ALTO_MUNDO = 0.95

  /** Relieve y luz, una sola vez. `superm` = supermuestreo por lado (2 = 4 muestras). */
  function preparar(ancho, alto, superm) {
    const W = ancho * superm, H = alto * superm
    const px = ALTO_MUNDO / H
    const RELIEVE = 0.24

    const h = new Float32Array(W * H)
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) h[y * W + x] = altura(x * px, y * px)
    }
    const hb = desenfocar(desenfocar(h, W, H, 8 * superm), W, H, 8 * superm)

    // Luz de estudio arriba a la izquierda, un poco hacia la cámara.
    let lx = -0.55, ly = -0.65, lz = 0.6
    const ln = Math.hypot(lx, ly, lz); lx /= ln; ly /= ln; lz /= ln
    const lxy = Math.hypot(lx, ly), dirx = lx / lxy, diry = ly / lxy, pendiente = lz / lxy
    // Medio vector para el brillo (cámara de frente: V = (0, 0, 1)).
    let hx = lx, hy = ly, hz = lz + 1
    const hn = Math.hypot(hx, hy, hz); hx /= hn; hy /= hn; hz /= hn

    const difuso = new Float32Array(W * H)
    const ambiente = new Float32Array(W * H)
    const especular = new Float32Array(W * H)
    const sub = new Float32Array(W * H)
    const PASOS = 48, PASO = 1.5 // en píxeles supermuestreados

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x
        const xa = Math.max(0, x - 1), xb = Math.min(W - 1, x + 1)
        const ya = Math.max(0, y - 1), yb = Math.min(H - 1, y + 1)
        const dhdx = (h[y * W + xb] - h[y * W + xa]) / ((xb - xa) * px)
        const dhdy = (h[yb * W + x] - h[ya * W + x]) / ((yb - ya) * px)
        let nx = -RELIEVE * dhdx, ny = -RELIEVE * dhdy, nz = 1
        const nn = Math.hypot(nx, ny, nz); nx /= nn; ny /= nn; nz /= nn

        const ndl = nx * lx + ny * ly + nz * lz
        // Difuso "envuelto": la luz rodea un poco las formas, como en un material lechoso.
        const dif = Math.max(0, (ndl + 0.3) / 1.3)

        // Sombra suave: recorrer el relieve hacia la luz.
        const z0 = RELIEVE * h[i]
        let sombra = 1
        for (let k = 1; k <= PASOS; k++) {
          const t = k * PASO
          const sx = Math.round(x + dirx * t), sy = Math.round(y + diry * t)
          if (sx < 0 || sy < 0 || sx >= W || sy >= H) break
          const tm = t * px
          const zr = z0 + pendiente * tm
          const zq = RELIEVE * h[sy * W + sx]
          sombra = Math.min(sombra, 5 * (zr - zq) / tm)
          if (sombra <= 0) break
        }
        sombra = Math.min(1, Math.max(0, sombra))
        sombra = sombra * sombra * (3 - 2 * sombra)

        const cav = h[i] - hb[i]
        const ao = Math.min(1, Math.max(0.55, 0.92 + cav * 2.2))

        const ndh = Math.max(0, nx * hx + ny * hy + nz * hz)
        // Satinado, no espejo: un brillo ancho y suave más un toque de humedad.
        const brillo = (Math.pow(ndh, 40) * 0.1 + Math.pow(ndh, 8) * 0.05) * (0.3 + 0.7 * sombra)

        difuso[i] = dif * sombra
        ambiente[i] = ao * (0.55 + 0.45 * nz)
        especular[i] = brillo * ao
        sub[i] = ao * (1 - dif * sombra)
      }
    }

    // Variación de tono muy leve, como la mezcla natural de un helado: ±4 % de luz.
    const variacion = new Float32Array(W * H)
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) variacion[y * W + x] = 1 + 0.04 * fbm(x * px * 1.3 + 40, y * px * 1.3 - 20, 3)
    }

    // Para los sabores de varios colores (el napolitano): dónde cae cada píxel de izquierda a
    // derecha, deformado con ruido para que las costuras entre bandas ondulen como en un
    // bloque real y no sean rayas de regla.
    const bandaU = new Float32Array(W * H)
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) bandaU[y * W + x] = x / W + 0.07 * fbm(x * px * 1.6 + 70, y * px * 1.6 - 15, 3)
    }

    estado = { ancho, alto, superm, W, H, difuso, ambiente, especular, sub, variacion, bandaU }
  }

  const aLineal = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
  const aSrgb = c => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055)
  /** Hombro suave: respeta el color hasta 0.8 y comprime solo los brillos. */
  const hombro = c => (c < 0.8 ? c : 0.8 + 0.2 * (1 - Math.exp(-(c - 0.8) / 0.2)))

  /** Ancho de la costura entre bandas, en fracciones de banda. */
  const COSTURA = 0.04

  /**
   * La imagen de un sabor: los términos de luz de `preparar()` con su color. `colores` es un
   * hex o una lista; con varios, se pintan en bandas de izquierda a derecha.
   */
  function pintar(colores, calidad) {
    if (!estado) throw new Error('Falta preparar()')
    const { ancho, alto, superm, W, difuso, ambiente, especular, sub, variacion, bandaU } = estado
    const lista = typeof colores === 'string' ? [colores] : colores
    const n = lista.length
    const albedo = lista.map(hex => [1, 3, 5].map(k => aLineal(parseInt(hex.slice(k, k + 2), 16) / 255)))
    // La luz que entra al helado y sale tintada: más saturada que la superficie.
    const tinte = albedo.map(c => c.map(v => Math.pow(v, 1.7)))

    const lienzo = document.createElement('canvas')
    lienzo.width = ancho; lienzo.height = alto
    const ctx = lienzo.getContext('2d')
    const img = ctx.createImageData(ancho, alto)
    const granoRand = mulberry32(SEMILLA + 7)
    const muestras = superm * superm

    for (let y = 0; y < alto; y++) {
      for (let x = 0; x < ancho; x++) {
        let r = 0, g = 0, b = 0
        for (let sy = 0; sy < superm; sy++) {
          for (let sx = 0; sx < superm; sx++) {
            const i = (y * superm + sy) * W + (x * superm + sx)
            let ar = albedo[0][0], ag = albedo[0][1], ab = albedo[0][2]
            let sr = tinte[0][0], sg = tinte[0][1], sb = tinte[0][2]
            for (let k = 1; k < n; k++) {
              const m = suave(k - COSTURA, k + COSTURA, bandaU[i] * n)
              ar += (albedo[k][0] - ar) * m; ag += (albedo[k][1] - ag) * m; ab += (albedo[k][2] - ab) * m
              sr += (tinte[k][0] - sr) * m; sg += (tinte[k][1] - sg) * m; sb += (tinte[k][2] - sb) * m
            }
            const luz = (ambiente[i] * 0.5 + difuso[i] * 0.72) * variacion[i]
            // Sin esto, las sombras de los colores claros se iban a verde oliva.
            const s = sub[i] * 0.24
            const e = especular[i]
            r += hombro(ar * luz + sr * s + e * 1.0)
            g += hombro(ag * luz + sg * s + e * 0.98)
            b += hombro(ab * luz + sb * s + e * 0.95)
          }
        }
        // Viñeta muy leve y grano de película: lo que delata una foto y no un render.
        const u = x / ancho - 0.5, v = y / alto - 0.5
        const vin = 1 - 0.14 * (u * u + v * v) * 2
        const grano = (granoRand() + granoRand() - 1) * 0.012
        const o = (y * ancho + x) * 4
        img.data[o] = Math.round(255 * Math.min(1, Math.max(0, aSrgb((r / muestras) * vin) + grano)))
        img.data[o + 1] = Math.round(255 * Math.min(1, Math.max(0, aSrgb((g / muestras) * vin) + grano)))
        img.data[o + 2] = Math.round(255 * Math.min(1, Math.max(0, aSrgb((b / muestras) * vin) + grano)))
        img.data[o + 3] = 255
      }
    }
    ctx.putImageData(img, 0, 0)
    return lienzo.toDataURL('image/jpeg', calidad)
  }

  // ── Modo foto ──────────────────────────────────────────────────────────

  const fotos = {}

  /**
   * Carga una foto base (data URL), la recorta al centro a `ancho`×`alto` y guarda cuánto más
   * clara u oscura es cada zona respecto del tono normal de la superficie (la mediana). Ese
   * cociente es lo único que se conserva de la foto: su color se descarta.
   */
  /** Una foto (data URL) recortada al centro a `ancho`×`alto`, en un canvas. */
  async function recortarFoto(dataUrl, ancho, alto) {
    const img = new Image()
    img.src = dataUrl
    await img.decode()
    const escala = Math.max(ancho / img.naturalWidth, alto / img.naturalHeight)
    const sw = ancho / escala, sh = alto / escala
    const lienzo = document.createElement('canvas')
    lienzo.width = ancho; lienzo.height = alto
    const ctx = lienzo.getContext('2d')
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, 0, 0, ancho, alto)
    return { lienzo, ctx, img }
  }

  /**
   * La foto propia de un sabor, tal cual: solo el recorte a 3:2 y el tamaño de la serie. Para
   * los sabores que se ven mejor con su propia foto que recoloreados.
   */
  async function fotoTalCual(dataUrl, ancho, alto, calidad) {
    const { lienzo } = await recortarFoto(dataUrl, ancho, alto)
    return lienzo.toDataURL('image/jpeg', calidad)
  }

  async function prepararFoto(clave, dataUrl, ancho, alto) {
    const { ctx, img } = await recortarFoto(dataUrl, ancho, alto)
    const datos = ctx.getImageData(0, 0, ancho, alto).data

    const n = ancho * alto
    const luz = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      luz[i] = 0.2126 * aLineal(datos[i * 4] / 255) + 0.7152 * aLineal(datos[i * 4 + 1] / 255) + 0.0722 * aLineal(datos[i * 4 + 2] / 255)
    }
    const orden = Float32Array.from(luz).sort()
    const mediana = Math.max(1e-4, orden[Math.floor(n * 0.5)])
    const tope = orden[Math.floor(n * 0.995)] / mediana
    // Desde dónde un píxel cuenta como brillo de verdad: el 3 % más claro de la foto. Por
    // debajo, aunque esté arriba de la mediana, es superficie iluminada y conserva su color.
    const umbralBrillo = orden[Math.floor(n * 0.97)] / mediana
    const relativa = new Float32Array(n)
    for (let i = 0; i < n; i++) relativa[i] = luz[i] / mediana
    // Los brillos se deciden sobre la luminancia apenas suavizada: sobre la cruda, el grano de la
    // foto convertía cada brillo en una mancha blanca moteada.
    const relativaSuave = desenfocar(relativa, ancho, alto, 2)

    // Bandas para los sabores de varios colores. Sobre una foto, una costura casi recta se ve
    // como un corte de edición: aquí serpentea más y además sigue el relieve (los bordes
    // claros la empujan hacia un lado y las sombras hacia el otro), como tres helados juntos.
    const px = ALTO_MUNDO / alto
    const bandaU = new Float32Array(n)
    for (let y = 0; y < alto; y++) {
      for (let x = 0; x < ancho; x++) {
        const i = y * ancho + x
        bandaU[i] = x / ancho + 0.1 * fbm(x * px * 2.4 + 70, y * px * 2.4 - 15, 4) + 0.06 * (relativaSuave[i] - 1)
      }
    }

    const brilloDesde = Math.max(1.02, Math.min(umbralBrillo, tope - 0.01))
    fotos[clave] = { ancho, alto, relativa, relativaSuave, tope: Math.max(brilloDesde + 0.01, tope), brilloDesde, bandaU, mediana }
    return { ancho: img.naturalWidth, alto: img.naturalHeight, mediana: +mediana.toFixed(3), tope: +tope.toFixed(2), brilloDesde: +brilloDesde.toFixed(2) }
  }

  /**
   * Recolorea la foto `clave` con los colores de un sabor. El tono normal de la superficie sale
   * exactamente del color del sabor; las sombras, más oscuras y más saturadas (como la luz que
   * atraviesa el helado real, en vez de irse a gris); los brillos suben hacia blanco, así el
   * brillo húmedo sigue siendo blanco aun en el chocolate.
   */
  function pintarFoto(clave, colores, calidad) {
    const f = fotos[clave]
    if (!f) throw new Error(`Falta prepararFoto('${clave}')`)
    const lista = typeof colores === 'string' ? [colores] : colores
    const nc = lista.length
    const albedo = lista.map(hex => [1, 3, 5].map(k => aLineal(parseInt(hex.slice(k, k + 2), 16) / 255)))

    const lienzo = document.createElement('canvas')
    lienzo.width = f.ancho; lienzo.height = f.alto
    const ctx = lienzo.getContext('2d')
    const img = ctx.createImageData(f.ancho, f.alto)
    // Un poco más de contraste que la foto: en un sabor oscuro las mismas diferencias de luz se
    // ven más planas que en el blanco de la base.
    const CONTRASTE = 1.25
    // Brillo satinado, no espejo: a lo más 65 % hacia blanco, con rampa larga, y menos en los
    // sabores oscuros, donde el mismo brillo se leía como puntitos de pintura blanca.
    const BRILLO = 0.65
    const canal = (a, r, brillo, intensidad) => {
      const v = r <= 1 ? Math.pow(a, 1 + 0.7 * (1 - r)) * r : hombro(a * r)
      return v + (1 - v) * BRILLO * intensidad * brillo
    }

    for (let i = 0, n = f.ancho * f.alto; i < n; i++) {
      let ar = albedo[0][0], ag = albedo[0][1], ab = albedo[0][2]
      for (let k = 1; k < nc; k++) {
        const m = suave(k - COSTURA, k + COSTURA, f.bandaU[i] * nc)
        ar += (albedo[k][0] - ar) * m; ag += (albedo[k][1] - ag) * m; ab += (albedo[k][2] - ab) * m
      }
      const r = Math.pow(f.relativa[i], CONTRASTE)
      const brillo = suave(f.brilloDesde, f.tope, f.relativaSuave[i])
      const intensidad = 0.3 + 0.7 * Math.sqrt(0.2126 * ar + 0.7152 * ag + 0.0722 * ab)
      img.data[i * 4] = Math.round(255 * Math.min(1, Math.max(0, aSrgb(canal(ar, r, brillo, intensidad)))))
      img.data[i * 4 + 1] = Math.round(255 * Math.min(1, Math.max(0, aSrgb(canal(ag, r, brillo, intensidad)))))
      img.data[i * 4 + 2] = Math.round(255 * Math.min(1, Math.max(0, aSrgb(canal(ab, r, brillo, intensidad)))))
      img.data[i * 4 + 3] = 255
    }
    ctx.putImageData(img, 0, 0)
    return lienzo.toDataURL('image/jpeg', calidad)
  }

  window.HeladoRender = { preparar, pintar, prepararFoto, pintarFoto, fotoTalCual }
})()
