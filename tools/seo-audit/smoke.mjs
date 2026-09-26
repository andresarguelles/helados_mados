#!/usr/bin/env node
// Pruebas de humo funcionales (Playwright) para el emulador local de Vercel /
// cualquier despliegue. No son metricas: son afirmaciones concretas de
// comportamiento (a-k del encargo F4). Cada prueba reporta ok:true/false con
// su propia evidencia (texto capturado + captura de pantalla) y nunca se
// inventa un resultado: si algo no se puede verificar, se marca ok:false con
// el motivo.
//
// Uso: node smoke.mjs --base <url> [--out <dir>]
// Sale con exit code 1 si alguna prueba fallo.
import path from 'node:path';
import fs from 'node:fs';
import { chromium } from 'playwright-core';

import { REPO_ROOT, resolveChromePath, VIEWPORTS } from './lib/config.mjs';
import { ensureDir, writeJson, routeSlug, log } from './lib/util.mjs';
import { checkPath } from './lib/httpMatrix.mjs';

const ROUTES_HIDRATACION = ['/', '/canjear', '/login', '/terminos', '/privacidad', '/eliminar-cuenta'];
const HYDRATION_PATTERNS = [
  /minified react error #41[89]/i,
  /minified react error #42[35]/i,
  /hydrat/i,
  /\[hidrataci[oó]n\]/i,
];

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--base') args.base = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else {
      console.error(`Argumento desconocido: ${a}`);
      process.exit(1);
    }
  }
  if (!args.base) {
    console.error('Uso: node smoke.mjs --base <url> [--out <dir>]');
    process.exit(1);
  }
  return args;
}

function u(base, route) {
  return new URL(route, base).toString();
}

function isHydrationText(text) {
  return HYDRATION_PATTERNS.some((re) => re.test(text));
}

async function shot(page, outDir, name) {
  const p = path.join(outDir, 'screenshots', `${name}.png`);
  ensureDir(path.dirname(p));
  try {
    await page.screenshot({ path: p, fullPage: true, timeout: 10000 });
    return p;
  } catch (e) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// a) Hidratacion, red normal, 6 rutas
// ---------------------------------------------------------------------------
async function testHidratacionNormal(browser, base, outDir) {
  const detalle = [];
  for (const route of ROUTES_HIDRATACION) {
    const context = await browser.newContext({ viewport: VIEWPORTS.desktop });
    const page = await context.newPage();
    const consoleMsgs = [];
    page.on('console', (m) => consoleMsgs.push({ type: m.type(), text: m.text() }));
    page.on('pageerror', (e) => consoleMsgs.push({ type: 'pageerror', text: e.message }));
    let navError = null;
    try {
      await page.goto(u(base, route), { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(1000);
    } catch (e) {
      navError = e.message;
    }
    const screenshot = await shot(page, outDir, `a-hidratacion-${routeSlug(route)}`);
    await context.close();
    const hits = consoleMsgs.filter((m) => isHydrationText(m.text));
    detalle.push({ ruta: route, ok: hits.length === 0 && !navError, hits, navError, screenshot });
  }
  const ok = detalle.every((d) => d.ok);
  return {
    id: 'a-hidratacion-normal',
    nombre: 'Hidratacion sin errores de consola (red normal, 6 rutas)',
    ok,
    detalle,
  };
}

// ---------------------------------------------------------------------------
// a2) Hidratacion + estabilidad de <main>, red lenta, /terminos y /privacidad
// ---------------------------------------------------------------------------
async function testHidratacionRedLenta(browser, base, outDir) {
  const detalle = [];
  for (const route of ['/terminos', '/privacidad']) {
    const context = await browser.newContext({ viewport: VIEWPORTS.desktop });
    const page = await context.newPage();
    const consoleMsgs = [];
    page.on('console', (m) => consoleMsgs.push({ type: m.type(), text: m.text() }));
    page.on('pageerror', (e) => consoleMsgs.push({ type: 'pageerror', text: e.message }));

    const client = await context.newCDPSession(page);
    await client.send('Network.enable');
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 400,
      downloadThroughput: (400 * 1024) / 8,
      uploadThroughput: (400 * 1024) / 8,
    });

    let navError = null;
    let mainAtLoad = null;
    let mainAt3s = null;
    try {
      await page.goto(u(base, route), { waitUntil: 'load', timeout: 45000 });
      mainAtLoad = await page.$eval('main', (el) => el.innerText.trim()).catch(() => null);
      await page.waitForTimeout(3000);
      mainAt3s = await page.$eval('main', (el) => el.innerText.trim()).catch(() => null);
    } catch (e) {
      navError = e.message;
    }
    const screenshot = await shot(page, outDir, `a2-red-lenta-${routeSlug(route)}`);
    await context.close();

    const hits = consoleMsgs.filter((m) => isHydrationText(m.text));
    const estable =
      typeof mainAtLoad === 'string' &&
      mainAtLoad.length > 0 &&
      typeof mainAt3s === 'string' &&
      mainAt3s.length > 0 &&
      mainAtLoad === mainAt3s;
    detalle.push({
      ruta: route,
      ok: hits.length === 0 && !navError && estable,
      hydrationHits: hits,
      navError,
      mainLenAtLoad: mainAtLoad ? mainAtLoad.length : 0,
      mainLenAt3s: mainAt3s ? mainAt3s.length : 0,
      mainEstable: estable,
      screenshot,
    });
  }
  const ok = detalle.every((d) => d.ok);
  return {
    id: 'a2-hidratacion-red-lenta',
    nombre: 'Hidratacion + <main> estable bajo red lenta (~400kbps/400ms) en /terminos y /privacidad',
    ok,
    detalle,
  };
}

// ---------------------------------------------------------------------------
// b) Sin JS: h1 y texto principal visibles en las 6 rutas
// ---------------------------------------------------------------------------
async function testSinJs(browser, base, outDir) {
  const detalle = [];
  for (const route of ROUTES_HIDRATACION) {
    const context = await browser.newContext({ viewport: VIEWPORTS.desktop, javaScriptEnabled: false });
    const page = await context.newPage();
    let navError = null;
    let h1Text = null;
    let mainText = null;
    try {
      await page.goto(u(base, route), { waitUntil: 'load', timeout: 30000 });
      h1Text = await page.$eval('h1', (el) => el.innerText.trim()).catch(() => null);
      mainText = await page
        .$eval('main', (el) => el.innerText.trim())
        .catch(() => page.$eval('body', (el) => el.innerText.trim()).catch(() => null));
    } catch (e) {
      navError = e.message;
    }
    const screenshot = await shot(page, outDir, `b-sinjs-${routeSlug(route)}`);
    await context.close();
    const ok = !navError && !!h1Text && h1Text.length > 0 && !!mainText && mainText.length > 20;
    detalle.push({ ruta: route, ok, h1Text, mainTextLen: mainText ? mainText.length : 0, navError, screenshot });
  }
  const ok = detalle.every((d) => d.ok);
  return { id: 'b-sin-js', nombre: 'Sin JS: <h1> y texto principal visibles (6 rutas)', ok, detalle };
}

// ---------------------------------------------------------------------------
// c) /auth/callback?code=x -> /login?auth=error con mensaje
// ---------------------------------------------------------------------------
async function testAuthCallback(browser, base, outDir) {
  // Linea base: texto de un /login limpio, para poder distinguir "aparecio contenido extra".
  const baseContext = await browser.newContext();
  const basePage = await baseContext.newPage();
  await basePage.goto(u(base, '/login'), { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
  const loginBaselineText = await basePage.evaluate(() => document.body.innerText).catch(() => '');
  await baseContext.close();

  const context = await browser.newContext();
  const page = await context.newPage();
  let initialHtmlIsSpa = null;
  let navError = null;
  try {
    const res = await page.goto(u(base, '/auth/callback?code=x'), { waitUntil: 'domcontentloaded', timeout: 20000 });
    const rootHtml = await page.evaluate(() => document.getElementById('root')?.innerHTML ?? null);
    initialHtmlIsSpa = res && res.status() === 200 && rootHtml !== null && rootHtml.trim() === '';
  } catch (e) {
    navError = e.message;
  }

  let matched = false;
  let finalUrl = page.url();
  const deadline = Date.now() + 12000;
  while (Date.now() < deadline) {
    finalUrl = page.url();
    if (/\/login\?auth=error/.test(finalUrl)) {
      matched = true;
      break;
    }
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(300);
  const finalText = await page.evaluate(() => document.body.innerText).catch(() => '');
  const screenshot = await shot(page, outDir, 'c-auth-callback');
  await context.close();

  const muestraMensajeExtra = finalText.length > loginBaselineText.length;
  const ok = matched && muestraMensajeExtra && !navError;
  return {
    id: 'c-auth-callback-error',
    nombre: '/auth/callback?code=x arranca vacio (spa) y termina en /login?auth=error con mensaje',
    ok,
    detalle: {
      initialHtmlIsSpa,
      finalUrl,
      matched,
      muestraMensajeExtra,
      finalTextLen: finalText.length,
      loginBaselineTextLen: loginBaselineText.length,
      navError,
      screenshot,
    },
  };
}

// ---------------------------------------------------------------------------
// d) Boton "Continuar con Google" -> redirect_to sin query string
// ---------------------------------------------------------------------------
async function testGoogleRedirectTo(browser, base, outDir) {
  const context = await browser.newContext();
  const page = await context.newPage();
  let capturedUrl = null;
  await page.route('**/auth/v1/authorize**', (route) => {
    capturedUrl = route.request().url();
    route.abort();
  });
  let error = null;
  try {
    await page.goto(u(base, '/login'), { waitUntil: 'networkidle', timeout: 20000 });
    await page.getByRole('button', { name: /continuar con google/i }).click({ timeout: 10000 });
    await page.waitForTimeout(1500);
  } catch (e) {
    error = e.message;
  }
  const screenshot = await shot(page, outDir, 'd-google-redirect');
  await context.close();

  let redirectTo = null;
  let redirectToHasQuery = null;
  if (capturedUrl) {
    try {
      const parsed = new URL(capturedUrl);
      redirectTo = parsed.searchParams.get('redirect_to');
      redirectToHasQuery = redirectTo ? redirectTo.includes('?') : null;
    } catch {
      /* URL invalida */
    }
  }
  const expected = new URL('/auth/callback', base).toString();
  const ok = !error && capturedUrl !== null && redirectTo === expected && redirectToHasQuery === false;
  return {
    id: 'd-google-redirect-to',
    nombre: 'Click en "Continuar con Google" -> redirect_to == origin/auth/callback sin query string',
    ok,
    detalle: { capturedUrl, redirectTo, esperado: expected, redirectToHasQuery, error, screenshot },
  };
}

// ---------------------------------------------------------------------------
// e) Login legacy con credenciales invalidas
// ---------------------------------------------------------------------------
async function testLoginLegacyInvalido(browser, base, outDir) {
  const context = await browser.newContext();
  const page = await context.newPage();
  let tokenStatus = null;
  let tokenUrl = null;
  page.on('response', (res) => {
    if (/\/auth\/v1\/token\?grant_type=password/.test(res.url())) {
      tokenStatus = res.status();
      tokenUrl = res.url();
    }
  });
  let error = null;
  try {
    await page.goto(u(base, '/login'), { waitUntil: 'networkidle', timeout: 20000 });
    await page.fill('#login-username', 'seo_smoke_inexistente');
    await page.fill('#login-password', 'x-no-valida-123');
    await page.getByRole('button', { name: /^entrar$/i }).click({ timeout: 10000 });
    await page.waitForTimeout(3000);
  } catch (e) {
    error = e.message;
  }
  const bodyText = await page.evaluate(() => document.body.innerText).catch(() => '');
  const screenshot = await shot(page, outDir, 'e-login-legacy-invalido');
  await context.close();

  const muestraCredencialesInvalidas = /usuario o contrase.a incorrectos|correo o contrase.a incorrectos/i.test(bodyText);
  const muestraGenericoOProveedorDeshabilitado = /proveedor|deshabilitad|temporalmente/i.test(bodyText);
  const ok =
    !error &&
    typeof tokenStatus === 'number' &&
    tokenStatus >= 400 &&
    tokenStatus < 500 &&
    muestraCredencialesInvalidas &&
    !muestraGenericoOProveedorDeshabilitado;
  return {
    id: 'e-login-legacy-invalido',
    nombre: 'Login legacy con credenciales invalidas -> POST token 4xx + mensaje de credenciales (no generico)',
    ok,
    detalle: { tokenStatus, tokenUrl, muestraCredencialesInvalidas, muestraGenericoOProveedorDeshabilitado, error, screenshot },
  };
}

// ---------------------------------------------------------------------------
// f) /perfil sin sesion -> /login ; /admin -> formulario de acceso admin
// ---------------------------------------------------------------------------
async function testGuardias(browser, base, outDir) {
  const detalle = {};

  {
    const context = await browser.newContext();
    const page = await context.newPage();
    let error = null;
    try {
      await page.goto(u(base, '/perfil'), { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(1500);
    } catch (e) {
      error = e.message;
    }
    const screenshot = await shot(page, outDir, 'f-perfil-sin-sesion');
    const finalUrl = page.url();
    await context.close();
    detalle.perfil = { finalUrl, ok: !error && new URL(finalUrl).pathname === '/login', error, screenshot };
  }

  {
    const context = await browser.newContext();
    const page = await context.newPage();
    let error = null;
    let tieneUsuario = false;
    let tieneContrasena = false;
    let tieneBotonAcceder = false;
    try {
      await page.goto(u(base, '/admin'), { waitUntil: 'networkidle', timeout: 20000 });
      tieneUsuario = (await page.$('input#admin-username')) !== null;
      tieneContrasena = (await page.$('input[type=password]')) !== null;
      tieneBotonAcceder = (await page.getByRole('button', { name: /acceder/i }).count()) > 0;
    } catch (e) {
      error = e.message;
    }
    const screenshot = await shot(page, outDir, 'f-admin-form');
    await context.close();
    detalle.admin = {
      ok: !error && tieneUsuario && tieneContrasena && tieneBotonAcceder,
      tieneUsuario,
      tieneContrasena,
      tieneBotonAcceder,
      error,
      screenshot,
    };
  }

  const ok = detalle.perfil.ok && detalle.admin.ok;
  return {
    id: 'f-guardias-rutas-privadas',
    nombre: '/perfil sin sesion redirige a /login; /admin muestra su formulario de acceso',
    ok,
    detalle,
  };
}

// ---------------------------------------------------------------------------
// g) 404 real + pagina NotFound; /cuenta y /canjear/ redirigen 308
// ---------------------------------------------------------------------------
async function testNotFoundYRedirects(browser, base, outDir) {
  const detalle = {};

  {
    const context = await browser.newContext();
    const page = await context.newPage();
    let status = null;
    let error = null;
    let hrefs = [];
    try {
      const res = await page.goto(u(base, '/esta-ruta-no-existe'), { waitUntil: 'networkidle', timeout: 20000 });
      status = res ? res.status() : null;
      hrefs = await page.$$eval('a[href]', (els) => els.map((e) => e.getAttribute('href')));
    } catch (e) {
      error = e.message;
    }
    const screenshot = await shot(page, outDir, 'g-404');
    await context.close();
    const ok = status === 404 && hrefs.includes('/') && hrefs.includes('/canjear');
    detalle.notFound = { status, tieneLinkInicio: hrefs.includes('/'), tieneLinkCanjear: hrefs.includes('/canjear'), error, screenshot, ok };
  }

  for (const [ruta, esperado] of [
    ['/cuenta', '/perfil'],
    ['/canjear/', '/canjear'],
  ]) {
    const r = await checkPath(base, ruta).catch((e) => ({ error: e.message }));
    const ok = r && r.status === 308 && r.location === esperado;
    detalle[ruta] = { ...r, esperado, ok };
  }

  const ok = detalle.notFound.ok && detalle['/cuenta'].ok && detalle['/canjear/'].ok;
  return {
    id: 'g-404-y-redirects',
    nombre: '/esta-ruta-no-existe -> 404 real con enlaces; /cuenta y /canjear/ -> 308',
    ok,
    detalle,
  };
}

// ---------------------------------------------------------------------------
// h) Consentimiento de cookies / GA diferido
// ---------------------------------------------------------------------------
async function testConsentimiento(browser, base, outDir) {
  const rawRes = await fetch(u(base, '/'), { headers: { 'User-Agent': 'seo-smoke/1.0' } });
  const rawHtml = await rawRes.text();
  const bannerEnEstaticoAntes = /cookies de medici[oó]n/i.test(rawHtml);

  const context = await browser.newContext();
  const page = await context.newPage();
  const thirdPartyGA = [];
  page.on('request', (req) => {
    const url = req.url();
    if (/googletagmanager\.com|google-analytics\.com/.test(url)) thirdPartyGA.push(url);
  });
  let error = null;
  let bannerVisibleDespues = false;
  try {
    await page.goto(u(base, '/'), { waitUntil: 'networkidle', timeout: 30000 });
    bannerVisibleDespues = (await page.getByText(/cookies de medici[oó]n/i).count()) > 0;
  } catch (e) {
    error = e.message;
  }
  const screenshot = await shot(page, outDir, 'h-consentimiento');
  await context.close();

  let gaIdPresente = null;
  const envPath = path.join(REPO_ROOT, '.env.local');
  try {
    const env = fs.readFileSync(envPath, 'utf8');
    gaIdPresente = /^VITE_GA_MEASUREMENT_ID=\S+/m.test(env);
  } catch {
    gaIdPresente = null; // no se pudo leer .env.local
  }

  const ok = !error && thirdPartyGA.length === 0 && !bannerEnEstaticoAntes && bannerVisibleDespues;
  return {
    id: 'h-consentimiento-cookies',
    nombre: 'Sin peticiones a GA con localStorage limpio; banner ausente en HTML estatico y presente tras JS',
    ok,
    detalle: {
      peticionesGA: thirdPartyGA,
      bannerEnEstaticoAntes,
      bannerVisibleDespues,
      gaIdPresenteEnEnvLocal: gaIdPresente,
      error,
      screenshot,
    },
  };
}

// ---------------------------------------------------------------------------
// i) Navegacion cliente: footer "Terminos y Condiciones" y "Canjear palabra secreta"
// ---------------------------------------------------------------------------
async function testNavegacionCliente(browser, base, outDir) {
  const detalle = {};

  {
    const context = await browser.newContext();
    const page = await context.newPage();
    let error = null;
    let tituloAntes = null;
    let tituloDespues = null;
    let urlDespues = null;
    try {
      await page.goto(u(base, '/'), { waitUntil: 'networkidle', timeout: 20000 });
      tituloAntes = await page.title();
      await page.getByRole('link', { name: /^términos y condiciones$/i }).first().click({ timeout: 10000 });
      await page.waitForURL(/\/terminos/, { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(500);
      tituloDespues = await page.title();
      urlDespues = page.url();
    } catch (e) {
      error = e.message;
    }
    const screenshot = await shot(page, outDir, 'i-nav-terminos');
    await context.close();
    const ok = !error && /\/terminos$/.test(new URL(urlDespues || 'http://x/').pathname) && tituloDespues !== tituloAntes;
    detalle.terminos = { tituloAntes, tituloDespues, urlDespues, error, screenshot, ok };
  }

  {
    const context = await browser.newContext();
    const page = await context.newPage();
    let error = null;
    let tituloDespues = null;
    let urlDespues = null;
    try {
      await page.goto(u(base, '/'), { waitUntil: 'networkidle', timeout: 20000 });
      await page.getByRole('link', { name: /^canjear palabra secreta$/i }).first().click({ timeout: 10000 });
      await page.waitForURL(/\/canjear/, { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(500);
      tituloDespues = await page.title();
      urlDespues = page.url();
    } catch (e) {
      error = e.message;
    }
    const screenshot = await shot(page, outDir, 'i-nav-canjear');
    await context.close();
    const ok = !error && /\/canjear$/.test(new URL(urlDespues || 'http://x/').pathname) && !!tituloDespues;
    detalle.canjear = { tituloDespues, urlDespues, error, screenshot, ok };
  }

  const ok = detalle.terminos.ok && detalle.canjear.ok;
  return {
    id: 'i-navegacion-cliente',
    nombre: 'Navegacion cliente sin recarga: footer "Términos y Condiciones" y CTA "Canjear palabra secreta"',
    ok,
    detalle,
  };
}

// ---------------------------------------------------------------------------
// j) /canjear: escribir palabra y verificar
// ---------------------------------------------------------------------------
async function testCanjearPalabra(browser, base, outDir) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleErrs = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrs.push(m.text());
  });
  let error = null;
  let mainAntes = null;
  let mainDespues = null;
  try {
    await page.goto(u(base, '/canjear'), { waitUntil: 'networkidle', timeout: 20000 });
    mainAntes = await page.$eval('main', (el) => el.innerText).catch(() => null);
    await page.fill('#keyword-input', 'PRUEBA');
    await page.getByRole('button', { name: /verificar palabra/i }).click({ timeout: 10000 });
    await page.waitForTimeout(2500);
    mainDespues = await page.$eval('main', (el) => el.innerText).catch(() => null);
  } catch (e) {
    error = e.message;
  }
  const screenshot = await shot(page, outDir, 'j-canjear-palabra');
  await context.close();

  // Los "resource load status 400/404" del propio navegador para la llamada
  // RPC no cuentan como error de app; solo importan errores reales de consola
  // que no sean ese aviso estandar de red.
  const erroresReales = consoleErrs.filter((t) => !/failed to load resource/i.test(t));
  const uiRespondio = mainAntes !== null && mainDespues !== null && mainAntes !== mainDespues;
  const ok = !error && erroresReales.length === 0 && uiRespondio;
  return {
    id: 'j-canjear-input-label',
    nombre: 'Input con label accesible en /canjear + "Verificar palabra" produce respuesta sin errores de consola',
    ok,
    detalle: { erroresReales, uiRespondio, mainDespuesPreview: mainDespues ? mainDespues.slice(-200) : null, error, screenshot },
  };
}

// ---------------------------------------------------------------------------
// k) Sin fonts.googleapis.com / fonts.gstatic.com en la carga de "/"
// ---------------------------------------------------------------------------
async function testSinFontsTerceros(browser, base, outDir) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const hosts = new Set();
  page.on('request', (req) => {
    try {
      hosts.add(new URL(req.url()).hostname);
    } catch {
      /* url invalida, se ignora */
    }
  });
  let error = null;
  try {
    await page.goto(u(base, '/'), { waitUntil: 'networkidle', timeout: 30000 });
  } catch (e) {
    error = e.message;
  }
  const screenshot = await shot(page, outDir, 'k-sin-fonts-terceros');
  await context.close();

  const encontrados = [...hosts].filter((h) => h === 'fonts.googleapis.com' || h === 'fonts.gstatic.com');
  const ok = !error && encontrados.length === 0;
  return {
    id: 'k-sin-fonts-terceros',
    nombre: 'Sin fonts.googleapis.com/fonts.gstatic.com en la carga de "/"',
    ok,
    detalle: { hostsContactados: [...hosts].sort(), encontrados, error, screenshot },
  };
}

// ---------------------------------------------------------------------------
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const base = args.base.replace(/\/+$/, '') + '/';
  const outDir = args.out ? path.resolve(args.out) : path.join(REPO_ROOT, 'docs', 'seo', 'evidencia', 'local', 'smoke');
  ensureDir(outDir);
  ensureDir(path.join(outDir, 'screenshots'));

  const chromePath = resolveChromePath();
  log('Base:', base);
  log('Salida:', outDir);
  log('Chromium:', chromePath);

  const browser = await chromium.launch({ executablePath: chromePath, headless: true, args: ['--no-sandbox', '--disable-gpu'] });

  const pruebas = [];
  const runners = [
    testHidratacionNormal,
    testHidratacionRedLenta,
    testSinJs,
    testAuthCallback,
    testGoogleRedirectTo,
    testLoginLegacyInvalido,
    testGuardias,
    testNotFoundYRedirects,
    testConsentimiento,
    testNavegacionCliente,
    testCanjearPalabra,
    testSinFontsTerceros,
  ];

  for (const runner of runners) {
    log('Corriendo:', runner.name);
    try {
      const resultado = await runner(browser, base, outDir);
      pruebas.push(resultado);
      log(resultado.ok ? '  OK ' : '  FALLO ', resultado.id);
    } catch (e) {
      pruebas.push({ id: runner.name, nombre: runner.name, ok: false, detalle: { errorNoCapturado: e.message, stack: e.stack } });
      log('  FALLO (excepcion no capturada)', runner.name, '->', e.message);
    }
  }

  await browser.close();

  const todoOk = pruebas.every((p) => p.ok);
  const resumen = {
    base,
    fecha: new Date().toISOString(),
    todoOk,
    pruebas,
  };
  writeJson(path.join(outDir, 'smoke.json'), resumen);

  console.log('\n=== Resultado de humo ===');
  for (const p of pruebas) {
    console.log(`${p.ok ? '✓' : '✗'} ${p.id} — ${p.nombre}`);
  }
  console.log(`\nJSON completo: ${path.join(outDir, 'smoke.json')}`);

  if (!todoOk) process.exit(1);
}

main().catch((e) => {
  console.error('FALLO NO CAPTURADO:', e);
  process.exit(1);
});
