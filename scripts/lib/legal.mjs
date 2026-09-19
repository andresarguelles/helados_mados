/**
 * Compilador del texto legal: Markdown restringido -> AST -> TypeScript + Kotlin.
 *
 * `legal/*.md` es la unica fuente editable. De aqui salen los artefactos que pintan
 * la web y la app Android, y el `legal.lock.json` que prueba que muestran lo mismo.
 *
 * La gramatica esta especificada en `legal/README.md` y es un subconjunto CERRADO:
 * todo lo que no esta permitido hace fallar la compilacion con el numero de linea.
 * Eso es deliberado — un documento legal no puede depender de que el renderer de cada
 * plataforma adivine lo mismo ante una construccion rara.
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, die } from './db.mjs'

// LEGAL_DIR solo existe para poder probar el compilador contra un fixture aislado
// sin tocar los documentos de verdad. En uso normal no se define.
export const DIR_LEGAL = process.env.LEGAL_DIR
  ? path.resolve(process.env.LEGAL_DIR)
  : path.join(ROOT, 'legal')
export const LOCK = 'legal.lock.json'

export const SALIDA_TS = 'src/content/legal/generated/legalContent.ts'
export const SALIDA_TS_SIMPLE = 'src/content/legal/generated/legalSimplificado.ts'
export const SALIDA_KT = 'app/src/main/java/com/heladosmados/app/legal/generated/LegalContent.kt'

const CABECERA = [
  '// GENERADO por scripts/legal-build.mjs desde legal/*.md del repo web.',
  '// NO EDITAR A MANO: el build del otro repo falla si este archivo y el .md difieren.',
  '// Para cambiar el texto: edita legal/<doc>.md, sube `version`, y corre `npm run legal:build`.',
].join('\n')

export const sha256 = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex')

// ─── Gramatica ──────────────────────────────────────────────────────────────

const ALCANCES = new Set(['web', 'android', 'ambas'])
const CLAVES_FRONTMATTER = ['id', 'titulo', 'icono', 'version', 'actualizado']

/** Construcciones fuera del subconjunto. El mensaje dice que hacer, no solo que fallo. */
const PROHIBIDO = [
  [/^#(?!#)/, 'el titulo del documento sale del frontmatter, no de un "#"'],
  [/^###/, 'no hay subsecciones: la web y Android tendrian que inventar dos jerarquias distintas'],
  [/^\s*>/, 'no se permiten citas'],
  [/^\s*\|/, 'no se permiten tablas'],
  [/^\s*`{3}/, 'no se permiten bloques de codigo'],
  [/^\s*!\[/, 'no se permiten imagenes'],
  [/^\s*\d+\.\s/, 'no se permiten listas numeradas: usa "- "'],
  [/^\s+-\s/, 'no se permiten listas anidadas'],
  [/<[a-zA-Z/]/, 'no se permite HTML'],
]

/** Intentos de ocultar contenido en una plataforma. Es el fallo que este diseno existe para impedir. */
const OCULTACION = /\b(oculto|hide|only)\s*[:=]|:::solo\b/i

// ─── Parser ─────────────────────────────────────────────────────────────────

const mal = (archivo, linea, msg) => die(`${archivo}:${linea}\n\n  ${msg}`)

function parseFrontmatter(lineas, archivo) {
  if (lineas[0]?.trim() !== '---') {
    mal(archivo, 1, 'falta el frontmatter. El archivo debe empezar con una linea "---".')
  }
  const meta = {}
  let i = 1
  for (; i < lineas.length; i++) {
    const linea = lineas[i]
    if (linea.trim() === '---') break
    const m = linea.match(/^([a-z]+):\s*(.+?)\s*$/)
    if (!m) mal(archivo, i + 1, `no entiendo esta linea del frontmatter: "${linea}"`)
    if (!CLAVES_FRONTMATTER.includes(m[1])) {
      mal(archivo, i + 1, `clave "${m[1]}" desconocida. Permitidas: ${CLAVES_FRONTMATTER.join(', ')}`)
    }
    meta[m[1]] = m[2]
  }
  if (i >= lineas.length) mal(archivo, 1, 'el frontmatter no se cierra con "---".')

  for (const clave of CLAVES_FRONTMATTER) {
    if (!meta[clave]) mal(archivo, 1, `falta "${clave}" en el frontmatter.`)
  }
  if (!/^[a-z][a-z-]*$/.test(meta.id)) {
    mal(archivo, 1, `"id: ${meta.id}" debe ser minusculas y guiones (es el destino de los enlaces legal:).`)
  }
  if (!/^\d+\.\d+\.\d+$/.test(meta.version)) {
    mal(archivo, 1, `"version: ${meta.version}" debe ser semver, por ejemplo 2.0.0`)
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.actualizado)) {
    mal(archivo, 1, `"actualizado: ${meta.actualizado}" debe tener la forma AAAA-MM-DD`)
  }
  return { meta, fin: i + 1 }
}

/** `**negrita**` y `[texto](destino)`. Cualquier otro marcador es un error. */
function parseSpans(texto, archivo, linea) {
  const spans = []
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g
  let ultimo = 0
  let m
  const plano = (v) => {
    if (v.includes('*')) {
      mal(archivo, linea, 'asterisco suelto: la cursiva no esta permitida y la negrita se escribe **asi**.')
    }
    spans.push({ t: 'texto', v })
  }
  while ((m = re.exec(texto))) {
    if (m.index > ultimo) plano(texto.slice(ultimo, m.index))
    if (m[1] !== undefined) {
      spans.push({ t: 'fuerte', v: m[1] })
    } else {
      const href = m[3].trim()
      if (href.startsWith('legal:')) {
        spans.push({ t: 'enlaceLegal', v: m[2], doc: href.slice('legal:'.length) })
      } else if (/^(https:\/\/|mailto:)/.test(href)) {
        spans.push({ t: 'enlace', v: m[2], href })
      } else {
        mal(
          archivo,
          linea,
          `destino "${href}" no permitido.\n  Solo https://, mailto: y legal:<id> (para enlazar el otro documento).`
        )
      }
    }
    ultimo = m.index + m[0].length
  }
  if (ultimo < texto.length) plano(texto.slice(ultimo))
  // Nunca devolver una lista vacia: un bloque sin spans reventaria los renderers.
  return spans.length ? spans : [{ t: 'texto', v: texto }]
}

/** `aviso-corto` -> `AVISO_CORTO`. Los ids admiten guion; los identificadores no. */
const simbolo = (id) => id.replace(/-/g, '_').toUpperCase()

export function parseDoc(archivo) {
  const crudo = fs.readFileSync(path.join(DIR_LEGAL, archivo), 'utf8')
  const lineas = crudo.split(/\r?\n/)
  const { meta, fin } = parseFrontmatter(lineas, archivo)

  const secciones = []
  let alcance = 'ambas'
  let parrafo = null
  let lista = null

  const seccionActual = (linea) => {
    if (!secciones.length) {
      mal(archivo, linea, 'hay texto antes de la primera seccion. Todo debe ir bajo un "## Titulo {#ancla}".')
    }
    return secciones[secciones.length - 1]
  }
  const cerrarParrafo = () => {
    if (!parrafo) return
    seccionActual(parrafo.linea).bloques.push({
      tipo: 'parrafo',
      alcance: parrafo.alcance,
      spans: parseSpans(parrafo.lineas.join(' '), archivo, parrafo.linea),
    })
    parrafo = null
  }
  const cerrarLista = () => {
    if (!lista) return
    seccionActual(lista.linea).bloques.push({
      tipo: 'lista',
      alcance: lista.alcance,
      items: lista.items.map((it) => parseSpans(it.texto, archivo, it.linea)),
    })
    lista = null
  }
  const cerrarBloques = () => {
    cerrarParrafo()
    cerrarLista()
  }

  for (let i = fin; i < lineas.length; i++) {
    const linea = lineas[i]
    const n = i + 1
    const t = linea.trim()

    if (OCULTACION.test(t)) {
      mal(
        archivo,
        n,
        'no existe forma de ocultar contenido en una plataforma, y es a proposito.\n' +
          '  Usa ":::alcance web|android": el bloque se muestra en LAS DOS con una etiqueta.\n' +
          '  Si se pudiera ocultar, el hash dejaria de probar que los dos documentos son iguales.'
      )
    }

    if (t === '') {
      cerrarBloques()
      continue
    }

    if (t.startsWith(':::')) {
      cerrarBloques()
      if (t === ':::') {
        if (alcance === 'ambas') mal(archivo, n, 'cierras un bloque de alcance que no esta abierto.')
        alcance = 'ambas'
        continue
      }
      const m = t.match(/^:::alcance\s+([a-z]+)$/)
      if (!m) mal(archivo, n, `directiva mal formada: "${t}". La unica forma es ":::alcance web".`)
      if (!ALCANCES.has(m[1])) {
        mal(archivo, n, `alcance "${m[1]}" desconocido. Valores: ${[...ALCANCES].join(', ')}`)
      }
      if (alcance !== 'ambas') mal(archivo, n, 'no se pueden anidar bloques de alcance.')
      alcance = m[1]
      continue
    }

    if (t.startsWith('## ')) {
      cerrarBloques()
      if (alcance !== 'ambas') mal(archivo, n, 'una seccion no puede empezar dentro de un bloque de alcance.')
      const m = t.match(/^##\s+(.+?)\s*\{#([a-z][a-z0-9-]*)((?:\s+[a-z]+=[A-Za-z0-9]+)*)\s*\}$/)
      if (!m) {
        mal(
          archivo,
          n,
          'cabecera mal formada.\n  La forma es:  ## Titulo de la seccion {#ancla icono=Users}\n' +
            '  El ancla es obligatoria: es una URL que alguien puede citar.'
        )
      }
      const attrs = {}
      for (const par of m[3].trim().split(/\s+/).filter(Boolean)) {
        const [k, v] = par.split('=')
        if (k !== 'icono' && k !== 'rol') mal(archivo, n, `atributo "${k}" desconocido. Solo icono= y rol=`)
        attrs[k] = v
      }
      if (!attrs.icono) mal(archivo, n, 'falta icono= en la cabecera de la seccion.')
      if (attrs.rol && attrs.rol !== 'simplificado') {
        mal(archivo, n, `rol "${attrs.rol}" desconocido. El unico rol es "simplificado".`)
      }
      if (secciones.some((s) => s.id === m[2])) {
        mal(archivo, n, `el ancla "#${m[2]}" ya existe en este documento. Deben ser unicas.`)
      }
      secciones.push({ id: m[2], titulo: m[1], icono: attrs.icono, rol: attrs.rol || null, bloques: [] })
      continue
    }

    for (const [re, motivo] of PROHIBIDO) {
      if (re.test(linea)) mal(archivo, n, `${motivo}.`)
    }

    if (t.startsWith('- ')) {
      cerrarParrafo()
      if (!lista) lista = { items: [], linea: n, alcance }
      lista.items.push({ texto: t.slice(2).trim(), linea: n })
      continue
    }

    cerrarLista()
    if (!parrafo) parrafo = { lineas: [], linea: n, alcance }
    parrafo.lineas.push(t)
  }
  cerrarBloques()

  if (alcance !== 'ambas') die(`${archivo}: un bloque ":::alcance" se quedo sin cerrar.`)
  if (!secciones.length) die(`${archivo}: el documento no tiene ninguna seccion.`)
  for (const s of secciones) {
    if (!s.bloques.length) die(`${archivo}: la seccion "#${s.id}" no tiene contenido.`)
  }

  return { ...meta, secciones }
}

// ─── Hash ───────────────────────────────────────────────────────────────────

/**
 * Serializacion canonica en tuplas, no en objetos: el hash no puede depender del orden
 * en que este script construya sus claves. Reindentar un parrafo no cambia el hash;
 * cambiar una palabra, un icono o un ancla si.
 */
function canonico(doc) {
  const span = (s) => [s.t, s.v, s.href || s.doc || '']
  const bloque = (b) =>
    b.tipo === 'parrafo'
      ? ['p', b.alcance, b.spans.map(span)]
      : ['l', b.alcance, b.items.map((i) => i.map(span))]
  return JSON.stringify([
    doc.id,
    doc.titulo,
    doc.icono,
    doc.version,
    doc.actualizado,
    doc.secciones.map((s) => [s.id, s.titulo, s.icono, s.rol || '', s.bloques.map(bloque)]),
  ])
}

export const hashDoc = (doc) => sha256(canonico(doc))
export const bundleHash = (docs) => sha256(docs.map((d) => `${d.id}:${d.astHash}`).join('|'))

// ─── Validacion del conjunto ────────────────────────────────────────────────

export function validarConjunto(docs, iconosAndroid) {
  const ids = new Set(docs.map((d) => d.id))
  let simplificados = 0

  for (const doc of docs) {
    if (!iconosAndroid.has(doc.icono)) {
      die(`icono "${doc.icono}" del frontmatter de ${doc.id}.md no existe en MadosIcons.`)
    }
    for (const sec of doc.secciones) {
      if (sec.rol === 'simplificado') {
        simplificados++
        if (doc.id !== 'privacidad') {
          die(`la seccion "rol=simplificado" debe estar en privacidad.md, no en ${doc.id}.md`)
        }
      }
      if (!iconosAndroid.has(sec.icono)) {
        die(
          `icono "${sec.icono}" (seccion #${sec.id} de ${doc.id}.md) no existe en MadosIcons.\n\n` +
            `  Disponibles: ${[...iconosAndroid].sort().join(' ')}`
        )
      }
      for (const b of sec.bloques) {
        const spans = b.tipo === 'parrafo' ? b.spans : b.items.flat()
        for (const s of spans) {
          if (s.t === 'enlaceLegal' && !ids.has(s.doc)) {
            die(`enlace "legal:${s.doc}" en ${doc.id}.md#${sec.id} apunta a un documento que no existe.`)
          }
        }
      }
    }
  }
  if (simplificados !== 1) {
    die(`debe haber exactamente una seccion con rol=simplificado; encontre ${simplificados}.`)
  }
}

/** Los iconos que Android tiene de verdad. Fallar aqui es mejor que fallar al compilar Kotlin. */
export function leerIconosAndroid(repoAndroid) {
  const archivo = path.join(
    repoAndroid,
    'core/design/src/main/java/com/heladosmados/design/icon/MadosIcons.kt'
  )
  if (!fs.existsSync(archivo)) die(`no encuentro MadosIcons.kt en ${archivo}`)
  const nombres = [...fs.readFileSync(archivo, 'utf8').matchAll(/^\s*val\s+([A-Za-z0-9]+)/gm)].map((m) => m[1])
  if (!nombres.length) die('MadosIcons.kt no expone ningun icono; cambio su formato?')
  return new Set(nombres)
}

// ─── Localizacion del repo Android ──────────────────────────────────────────

const esRepoAndroid = (dir) =>
  fs.existsSync(path.join(dir, 'settings.gradle.kts')) &&
  fs.existsSync(path.join(dir, 'app/src/main/java/com/heladosmados'))

function leerLegalrc() {
  const f = path.join(ROOT, '.legalrc.json')
  if (!fs.existsSync(f)) return null
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8')).androidRepo || null
  } catch {
    die('.legalrc.json no es JSON valido.')
  }
}

export function resolverRepoAndroid(desdeCli) {
  const candidatos = [
    [desdeCli, 'el argumento --android'],
    [process.env.MADOS_ANDROID_REPO, 'la variable MADOS_ANDROID_REPO'],
    [leerLegalrc(), '.legalrc.json'],
    ['../helados_mados_android', 'la ruta por defecto'],
  ].filter(([v]) => v)

  for (const [valor, origen] of candidatos) {
    const abs = path.resolve(ROOT, valor)
    if (esRepoAndroid(abs)) return { ruta: abs, origen }
  }
  return null
}

export const NO_ENCUENTRO_ANDROID =
  'No encuentro el repo de Android.\n\n' +
  '  Indicalo de una de estas formas (gana la primera que exista):\n\n' +
  '    1. npm run legal:build -- --android ../ruta/al/repo\n' +
  '    2. MADOS_ANDROID_REPO=../ruta/al/repo\n' +
  '    3. .legalrc.json en la raiz:  { "androidRepo": "../helados_mados_android" }\n' +
  '    4. clonarlo como carpeta hermana: ../helados_mados_android'

// ─── Emisores ───────────────────────────────────────────────────────────────

const ts = (v) => JSON.stringify(v)

function spansTs(spans) {
  return spans
    .map((s) => {
      if (s.t === 'texto') return `{ t: 'texto', v: ${ts(s.v)} }`
      if (s.t === 'fuerte') return `{ t: 'fuerte', v: ${ts(s.v)} }`
      if (s.t === 'enlace') return `{ t: 'enlace', v: ${ts(s.v)}, href: ${ts(s.href)} }`
      return `{ t: 'enlaceLegal', v: ${ts(s.v)}, doc: ${ts(s.doc)} }`
    })
    .join(', ')
}

function bloquesTs(bloques, sangria) {
  return bloques
    .map((b) =>
      b.tipo === 'parrafo'
        ? `${sangria}{ tipo: 'parrafo', alcance: '${b.alcance}', spans: [${spansTs(b.spans)}] },`
        : `${sangria}{\n` +
          `${sangria}  tipo: 'lista', alcance: '${b.alcance}',\n` +
          `${sangria}  items: [\n` +
          b.items.map((i) => `${sangria}    [${spansTs(i)}],`).join('\n') +
          `\n${sangria}  ],\n${sangria}},`
    )
    .join('\n')
}

function seccionTs(sec, sangria) {
  return (
    `${sangria}{\n` +
    `${sangria}  id: ${ts(sec.id)},\n` +
    `${sangria}  titulo: ${ts(sec.titulo)},\n` +
    `${sangria}  icono: ${sec.icono},\n` +
    `${sangria}  rol: ${ts(sec.rol)},\n` +
    `${sangria}  bloques: [\n${bloquesTs(sec.bloques, sangria + '    ')}\n${sangria}  ],\n` +
    `${sangria}}`
  )
}

export function emitirTs(docs) {
  const iconos = [...new Set(docs.flatMap((d) => [d.icono, ...d.secciones.map((s) => s.icono)]))].sort()
  const cuerpo = docs
    .map(
      (d) =>
        `  ${d.id}: {\n` +
        `    id: ${ts(d.id)},\n` +
        `    titulo: ${ts(d.titulo)},\n` +
        `    icono: ${d.icono},\n` +
        `    version: ${ts(d.version)},\n` +
        `    actualizado: ${ts(d.actualizado)},\n` +
        `    astHash: ${ts(d.astHash)},\n` +
        `    secciones: [\n${d.secciones.map((s) => seccionTs(s, '      ') + ',').join('\n')}\n    ],\n` +
        `  },`
    )
    .join('\n')

  return (
    `${CABECERA}\n\n` +
    `import { ${iconos.join(', ')} } from 'lucide-react'\n\n` +
    `import type { LegalDoc } from '../model'\n\n` +
    `export const LEGAL_DOCS: Record<string, LegalDoc> = {\n${cuerpo}\n}\n\n` +
    docs.map((d) => `export const ${simbolo(d.id)} = LEGAL_DOCS.${d.id}\n`).join('') +
    `\nexport const LEGAL_BUNDLE_HASH = ${ts(bundleHash(docs))}\n`
  )
}

export function emitirTsSimplificado(docs) {
  const doc = docs.find((d) => d.secciones.some((s) => s.rol === 'simplificado'))
  const sec = doc.secciones.find((s) => s.rol === 'simplificado')
  return (
    `${CABECERA}\n` +
    `//\n` +
    `// Modulo aparte a proposito: /bienvenida muestra el aviso simplificado y no debe\n` +
    `// arrastrar los dos documentos completos al bundle inicial.\n\n` +
    `import { ${sec.icono} } from 'lucide-react'\n\n` +
    `import type { LegalSeccion } from '../model'\n\n` +
    `export const AVISO_SIMPLIFICADO: LegalSeccion =\n${seccionTs(sec, '  ')}\n\n` +
    `export const AVISO_SIMPLIFICADO_DOC = ${ts(doc.id)}\n`
  )
}

const kt = (v) => '"' + v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$/g, '\\$') + '"'

function spansKt(spans) {
  return spans
    .map((s) => {
      if (s.t === 'texto') return `T(${kt(s.v)})`
      if (s.t === 'fuerte') return `F(${kt(s.v)})`
      if (s.t === 'enlace') return `A(${kt(s.v)}, ${kt(s.href)})`
      return `G(${kt(s.v)}, ${kt(s.doc)})`
    })
    .join(', ')
}

function seccionKt(sec) {
  const bloques = sec.bloques
    .map((b) =>
      b.tipo === 'parrafo'
        ? `      P(LegalAlcance.${b.alcance.toUpperCase()}, ${spansKt(b.spans)}),`
        : `      L(\n        LegalAlcance.${b.alcance.toUpperCase()},\n` +
          b.items.map((i) => `        listOf(${spansKt(i)}),`).join('\n') +
          `\n      ),`
    )
    .join('\n')
  return (
    `  LegalSeccion(\n` +
    `    id = ${kt(sec.id)},\n` +
    `    titulo = ${kt(sec.titulo)},\n` +
    `    icono = MadosIcons.${sec.icono},\n` +
    `    rol = ${sec.rol ? kt(sec.rol) : 'null'},\n` +
    `    bloques = listOf(\n${bloques}\n    ),\n` +
    `  )`
  )
}

export function emitirKotlin(docs) {
  // Una funcion privada por seccion: un unico inicializador con todo el texto se acerca
  // al limite de 64 KB de bytecode por metodo de la JVM.
  const funciones = []
  const refs = {}
  for (const d of docs) {
    refs[d.id] = []
    d.secciones.forEach((sec, i) => {
      const nombre = `${d.id.replace(/-/g, '_')}S${i}`
      funciones.push(`private fun ${nombre}(): LegalSeccion =\n${seccionKt(sec)}\n`)
      refs[d.id].push(`${nombre}()`)
    })
  }

  const documentos = docs
    .map(
      (d) =>
        `val ${simbolo(d.id)}: LegalDoc = LegalDoc(\n` +
        `  id = ${kt(d.id)},\n` +
        `  titulo = ${kt(d.titulo)},\n` +
        `  icono = MadosIcons.${d.icono},\n` +
        `  version = ${kt(d.version)},\n` +
        `  actualizado = ${kt(d.actualizado)},\n` +
        `  astHash = ${kt(d.astHash)},\n` +
        `  secciones = listOf(\n${refs[d.id].map((r) => `    ${r},`).join('\n')}\n  ),\n` +
        `)\n`
    )
    .join('\n')

  const docSimple = docs.find((d) => d.secciones.some((s) => s.rol === 'simplificado'))
  const iSimple = docSimple.secciones.findIndex((s) => s.rol === 'simplificado')

  return (
    `${CABECERA}\n\n` +
    `package com.heladosmados.app.legal.generated\n\n` +
    `import com.heladosmados.app.legal.LegalAlcance\n` +
    `import com.heladosmados.app.legal.LegalDoc\n` +
    `import com.heladosmados.app.legal.LegalSeccion\n` +
    `import com.heladosmados.app.legal.LegalSpan.Enlace as A\n` +
    `import com.heladosmados.app.legal.LegalSpan.EnlaceLegal as G\n` +
    `import com.heladosmados.app.legal.LegalSpan.Fuerte as F\n` +
    `import com.heladosmados.app.legal.LegalSpan.Texto as T\n` +
    `import com.heladosmados.app.legal.lista as L\n` +
    `import com.heladosmados.app.legal.parrafo as P\n` +
    `import com.heladosmados.design.icon.MadosIcons\n\n` +
    funciones.join('\n') +
    '\n' +
    documentos +
    `\nval LEGAL_DOCS: Map<String, LegalDoc> = mapOf(\n` +
    docs.map((d) => `  ${kt(d.id)} to ${simbolo(d.id)},`).join('\n') +
    `\n)\n\n` +
    `val AVISO_SIMPLIFICADO: LegalSeccion = ${simbolo(docSimple.id)}.secciones[${iSimple}]\n\n` +
    `const val LEGAL_BUNDLE_HASH: String = ${kt(bundleHash(docs))}\n`
  )
}

// ─── Lock ───────────────────────────────────────────────────────────────────

/**
 * El lock guarda los hashes de los artefactos de LOS DOS repos. Por eso el build de
 * Vercel, que nunca ve el repo Android, sigue pudiendo verificar que nadie edito a mano
 * el Kotlin generado.
 *
 * Sin marcas de tiempo ni rutas absolutas: tiene que ser reproducible, o deja de poder
 * compararse byte a byte entre los dos repos.
 */
export function construirLock(docs, artefactos) {
  return (
    JSON.stringify(
      {
        generador: 1,
        docs: Object.fromEntries(
          docs.map((d) => [
            d.id,
            {
              version: d.version,
              actualizado: d.actualizado,
              astHash: d.astHash,
              secciones: d.secciones.length,
              bloques: d.secciones.reduce((n, s) => n + s.bloques.length, 0),
            },
          ])
        ),
        bundleHash: bundleHash(docs),
        artefactos,
      },
      null,
      2
    ) + '\n'
  )
}

export function cargarDocs() {
  if (!fs.existsSync(DIR_LEGAL)) die(`no existe el directorio ${DIR_LEGAL}`)
  const archivos = fs
    .readdirSync(DIR_LEGAL)
    .filter((f) => f.endsWith('.md') && f !== 'README.md')
    .sort()
  if (!archivos.length) {
    die('no hay ningun documento en legal/. Esperaba terminos.md y privacidad.md')
  }
  return archivos.map((f) => {
    const doc = parseDoc(f)
    if (`${doc.id}.md` !== f) {
      die(`${f}: el frontmatter dice "id: ${doc.id}", asi que el archivo deberia llamarse ${doc.id}.md`)
    }
    return { ...doc, astHash: hashDoc(doc) }
  })
}

/** El `insert` que hay que pegar en una migracion para que el servidor acepte esta version. */
export function sqlVersiones(docs) {
  const filas = docs.map((d) => `  ('${d.id}', '${d.version}', '${d.astHash}')`).join(',\n')
  return (
    'insert into public.legal_versions (doc_id, version, ast_hash) values\n' +
    filas +
    '\non conflict (doc_id, version) do nothing;'
  )
}
