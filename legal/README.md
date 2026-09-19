# Documentos legales — fuente única

Los archivos `.md` de esta carpeta son **la única fuente editable** del texto legal de
Helados Mados. De aquí salen, por generación, las tres cosas que el usuario ve:

- la web (`src/content/legal/generated/*.ts`)
- la app Android (`app/src/main/java/com/heladosmados/app/legal/generated/LegalContent.kt`)
- el `legal.lock.json` que prueba que las dos muestran exactamente lo mismo

**Nunca edites un archivo dentro de un directorio `generated/`.** Cambia el `.md`, sube la
version y corre `npm run legal:build`. Si editas el generado, el build del otro repo falla.

## Por que Markdown y no JSON

Ninguna de las dos plataformas puede renderizar Markdown (la web no tiene `react-markdown`
ni `@tailwindcss/typography`; en Android `libs.versions.toml` esta congelado). El Markdown
no se renderiza: se **compila** a un AST que los dos lados pintan con su propio codigo.

Se escribe en Markdown por una sola razon: que el `git diff` de un cambio legal se lea
linea a linea de prosa. Cuando el texto es el instrumento que obliga, poder leer el cambio
es la propiedad que mas importa.

## Gramatica permitida

Es un subconjunto **cerrado**. Cualquier cosa fuera de el hace fallar el generador con el
numero de linea. No es una convencion: es una validacion.

### Frontmatter (obligatorio, al inicio)

```
---
id: terminos
titulo: Terminos y Condiciones
icono: Shield
version: 2.0.0
actualizado: 2026-09-18
---
```

- `id` — minusculas y guiones. Es el destino de los enlaces `legal:<id>`.
- `icono` — debe existir en `MadosIcons` del repo Android. El generador lo valida contra
  el archivo real; si pides uno que no existe, muere antes de emitir nada.
- `version` — semver. **MAYOR** = cambia el tratamiento de datos y dispara re-aceptacion.
  **MENOR** = nueva finalidad o seccion. **PARCHE** = redaccion.
- `actualizado` — `AAAA-MM-DD`.

### Secciones

```
## Titulo de la seccion {#ancla icono=Users}
```

Solo `##`. Ni `#` (el titulo sale del frontmatter) ni `###` (no hay subniveles: la web y
Android tendrian que inventar dos jerarquias visuales distintas). El `{#ancla}` es
obligatorio, unico dentro del documento y estable — es una URL que alguien puede citar.

Una seccion puede llevar `rol=simplificado`: se emite ademas en un modulo aparte para
mostrarla en el punto de recoleccion de datos. Debe haber exactamente una, en `privacidad.md`.

### Bloques

- **Parrafo** — lineas seguidas, separadas por una linea en blanco.
- **Lista** — lineas que empiezan por `- `. Sin anidar.

### Inline

- `**negrita**`
- `[texto](https://...)`, `[texto](mailto:...)` y `[texto](legal:<id>)` para enlazar el
  otro documento. El generador comprueba que el `<id>` existe.

### Alcance por plataforma

```
:::alcance android
La aplicacion solicita permiso de camara unicamente para el escaner del personal.
:::
```

Valores: `web`, `android`, `ambas` (por defecto).

**`alcance` pinta una pastilla visible; NUNCA oculta nada.** Un parrafo marcado `web` se
muestra tambien en Android, con la etiqueta «SOLO EN EL SITIO WEB», y al reves. Es
deliberado y es el corazon del diseno:

1. Es lo que se pidio: que nadie pueda decir que acepto algo que el otro no vio.
2. Si se pudiera ocultar, el hash dejaria de probar que los documentos son iguales — solo
   probaria que coinciden en las partes que cada plataforma decide mostrar.
3. La deriva volveria en silencio: anadir `alcance: web` a una seccion la borraria de
   Android sin que nada fallara.

El generador **rechaza** cualquier sintaxis de ocultacion (`:::solo`, `oculto=`, `hide:`).
La imposibilidad de divergir es una propiedad del formato, no una promesa.

### Prohibido

`#`, `###`+, `>`, tablas, HTML, `*cursiva*`, imagenes, bloques de codigo, listas anidadas
y listas numeradas. Si algo de eso hace falta, se discute y se amplia la gramatica en los
dos renderers a la vez — nunca en uno solo.

## Al publicar una version nueva

1. Edita el `.md` y **sube `version`**. El generador se niega a emitir si el AST cambio y
   la version no.
2. `npm run legal:build` — regenera los dos repos y el lock.
3. Pega en una migracion el `insert into legal_versions` que imprime el generador. Sin esa
   fila, el servidor rechaza registrar la aceptacion de esta version.
4. Commitea **los dos repos**. Si solo commiteas uno, `npm run legal:check -- --cross` lo
   detecta, pero nada puede impedirlo salvo el hook de pre-commit.
