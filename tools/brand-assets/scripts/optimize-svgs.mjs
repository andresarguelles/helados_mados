#!/usr/bin/env node
/**
 * Optimiza los SVG de marca "in situ" (public/*.svg) con svgo, usando el preset por defecto
 * pero sin `removeViewBox` (A4 dimensiona las `<img>` a partir del `viewBox`, así que moverlo
 * o quitarlo rompería su cálculo) y sin `removeTitle` (el `<title>` es el nombre accesible del
 * SVG para lectores de pantalla en los sitios donde se usa como icono suelto).
 *
 * No sobreescribe nada sin que antes `svg-fidelity.mjs` haya comparado el resultado contra el
 * original a nivel de píxel — por eso este script escribe primero a `out/` y dice explícitamente
 * que falta correr `npm run svg-fidelity` antes de dar por buena la optimización.
 */
import { optimize } from 'svgo'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..')
const PUBLIC = path.join(ROOT, 'public')
const OUT = path.join(import.meta.dirname, '..', 'out')

const FILES = ['mados-logo-full.svg', 'oficial_letter_logo.svg', 'astronauta_mados_nuevo.svg']

const svgoConfig = {
  multipass: true,
  js2svg: { indent: 2, pretty: false },
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          // A4 calcula width/height de cada <img> a partir del viewBox — quitarlo le rompería
          // el cálculo, y es justo lo que hace intocable esta bandera.
          removeViewBox: false,
          // El <title> es el nombre accesible del SVG cuando se usa suelto (favicon, isotipo).
          removeTitle: false,
        },
      },
    },
  ],
}

async function main() {
  await mkdir(OUT, { recursive: true })
  const rows = []
  for (const file of FILES) {
    const srcPath = path.join(PUBLIC, file)
    const original = await readFile(srcPath, 'utf8')
    const result = optimize(original, { ...svgoConfig, path: srcPath })
    const optimized = result.data

    // Copia del original preservada en out/ para que svg-fidelity.mjs compare antes/después
    // sin depender de `git diff` (este script puede correr varias veces seguidas).
    await writeFile(path.join(OUT, `${file}.before.svg`), original, 'utf8')
    await writeFile(path.join(OUT, `${file}.after.svg`), optimized, 'utf8')

    const beforeBytes = Buffer.byteLength(original, 'utf8')
    const afterBytes = Buffer.byteLength(optimized, 'utf8')
    rows.push({ file, beforeBytes, afterBytes })
    console.log(
      `${file}: ${(beforeBytes / 1024).toFixed(1)} KB → ${(afterBytes / 1024).toFixed(1)} KB ` +
        `(-${(100 - (afterBytes / beforeBytes) * 100).toFixed(1)}%)`
    )
  }

  console.log('\nEscrito en tools/brand-assets/out/*.before.svg / *.after.svg.')
  console.log('Corre `npm run svg-fidelity` para comparar píxel a píxel antes de aplicar con --write.')

  if (process.argv.includes('--write')) {
    for (const file of FILES) {
      const optimized = await readFile(path.join(OUT, `${file}.after.svg`), 'utf8')
      await writeFile(path.join(PUBLIC, file), optimized, 'utf8')
    }
    console.log('\n--write: aplicado sobre public/*.svg.')
  } else {
    console.log('(No se tocó public/*.svg todavía — usa --write tras revisar la fidelidad.)')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
