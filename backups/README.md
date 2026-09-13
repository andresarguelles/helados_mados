# Respaldos de la base de datos

Volcados lógicos (`pg_dump`) del proyecto Supabase. **Los archivos `.sql` de esta
carpeta están en `.gitignore` y no deben commitearse nunca**: contienen los datos
personales y los hashes de contraseña de todas las cuentas.

## Generar un respaldo

```bash
npm run db:backup
```

Deja una carpeta `backups/<YYYY-MM-DD_HHmm>/` con cuatro archivos, y falla
ruidosamente (sin dejar carpeta a medias) si algo no cuadra.

### Configuración, solo la primera vez

1. Dashboard de Supabase → **Connect** (o Settings → Database) → pestaña
   **Session pooler**, puerto **5432**.
   No uses el Transaction pooler (6543): `pg_dump` necesita conexión de sesión.
2. Crea `.env.backup.local` en la raíz del proyecto:

   ```
   SUPABASE_DB_URL=postgresql://postgres.<ref>:<password>@<host>.pooler.supabase.com:5432/postgres
   ```

   Ese nombre ya está cubierto por `.gitignore` (`.env.*` y `*.local`).

Necesitas las herramientas de cliente de PostgreSQL 17+ (`pg_dump` y `psql`) en
el `PATH`. El script descompone la URL en variables `PG*` del proceso hijo, así
que la contraseña nunca aparece en `argv` ni en la salida.

Esa plomería vive en `scripts/lib/db.mjs` y la comparten todos los scripts que
hablan directo con Postgres.

## Reiniciar una cuenta de prueba

```bash
npm run db:reset-user -- andresarguelles
node scripts/reset-test-account.mjs andresarguelles marvinroldan   # equivalente, sin el --
```

Devuelve una cuenta al estado **legacy**: sin Google vinculado, sin datos de
perfil, y con los puntos que le corresponden solo por sus cupones. Sirve para
repetir la prueba de vinculación de punta a punta tantas veces como haga falta.

Vincular e iniciar sesión con Google deja rastro en cuatro sitios, y el script
limpia los cuatro — borrar solo la identidad deja la cuenta en un estado a medias
que no representa a un legacy de verdad:

| dónde | qué queda al vincular |
| --- | --- |
| `auth.identities` | la fila del proveedor `google` |
| `auth.users.raw_app_meta_data` | `google` dentro de `providers[]` |
| `auth.users.raw_user_meta_data` | los claims de Google, que además **pisan** `sub` y `email` |
| `public.profiles` | correo, foto, nombre, banderas de bono y los puntos de bono |

Detalles que conviene conocer antes de usarlo:

- **Hay que nombrar las cuentas.** No existe un modo "todas": sin argumentos se
  niega a hacer nada.
- **Pide confirmación** mostrando antes el estado actual y el estado final. Usa
  `--yes` solo en automatizaciones.
- **Los puntos se recalculan desde los cupones** (digital = 1, físico = 10), no
  restando los bonos. Es más robusto —se autocorrige si una prueba quedó a
  medias— pero descarta cualquier ajuste manual de puntos hecho en el dashboard.
- **Invalida las sesiones** de esa cuenta, pero el token que el navegador ya
  tiene sigue siendo válido hasta que caduque: hay que cerrar sesión a mano.
- **Google recuerda la autorización.** Para volver a ver la pantalla de
  consentimiento hay que quitar el acceso en
  [myaccount.google.com/permissions](https://myaccount.google.com/permissions).

Conviene correr `npm run db:backup` antes del primer reseteo de una sesión de
pruebas.

## Qué hay en cada carpeta

| archivo | contenido |
|---|---|
| `01_schema.sql` | Esquema de `public` + `supabase_migrations`, con privilegios (los `GRANT`/`REVOKE` sobre las RPCs son parte del modelo de seguridad). Sirve sobre todo para diffear contra `supabase/migrations/`. |
| `02_data_public.sql` | Datos de `profiles`, `dynamics`, `coupons`, `ip_redemption_logs` y el historial de migraciones. |
| `03_data_auth.sql` | `auth.users` y `auth.identities` — las cuentas, con sus hashes de contraseña. |
| `manifest.json` | Fecha, proyecto, versiones de Postgres/`pg_dump`, conteo por tabla y SHA-256 de cada archivo. |

Se excluyen a propósito `auth.sessions`, `auth.refresh_tokens`, `auth.flow_state`
y `auth.audit_log_entries`: son estado efímero de sesión.

## Qué NO cubre este respaldo

Un `pg_dump` solo cubre la base de datos. Hay que guardar aparte:

- **`IP_HASH_PEPPER`** — el secreto de la edge function `redeem-keyword`. Vive en
  los *Function secrets* de Supabase y hay una copia local en **`.env.secret`**
  (en la raíz del proyecto, ignorado por git). Sin él, tras una restauración los
  hashes de IP nuevos no coincidirían con los guardados en `ip_redemption_logs` y
  el límite de 3 canjes por IP se reiniciaría de facto.

  > `.env.secret` es una copia de conveniencia, **no un respaldo**: existe en un
  > solo disco y desaparece con la carpeta del proyecto. Guarda el valor también
  > en un gestor de contraseñas. Al copiarlo de vuelta a Supabase, pega el valor
  > exacto sin espacios alrededor — un espacio de más cambia el hash y rompe el
  > histórico de `ip_redemption_logs` en silencio.
- Configuración de Auth (providers, plantillas de correo) y API keys del proyecto.
- Los roles de Postgres y sus contraseñas: `pg_dumpall --roles-only` requiere
  superusuario, que Supabase no concede.

El código de la edge function sí está versionado, en
[`supabase/functions/redeem-keyword/index.ts`](../supabase/functions/redeem-keyword/index.ts).

## Restaurar sobre un proyecto nuevo

El orden importa.

1. **Aplica las migraciones del repo** (`supabase/migrations/`, en orden de
   nombre de archivo). Esto es obligatorio *antes* de cargar datos: `public`
   depende de `citext` y `btree_gist`, que viven en el esquema `extensions` y no
   están incluidos en `01_schema.sql`.
2. Desactiva el trigger que crea perfiles, o el `COPY` de `profiles` chocará con
   las filas que el propio trigger genere al insertar los usuarios:

   ```sql
   alter table auth.users disable trigger on_auth_user_created;
   ```
3. Carga los datos, primero las cuentas y después lo demás:

   ```bash
   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f 03_data_auth.sql
   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f 02_data_public.sql
   ```
4. Reactiva el trigger y restaura el secreto `IP_HASH_PEPPER`:

   ```sql
   alter table auth.users enable trigger on_auth_user_created;
   ```

> Este procedimiento está derivado del modelo de datos, **no ejecutado de punta a
> punta**. Si necesitas certeza, valídalo primero sobre una branch de Supabase
> (infraestructura facturable) y no directamente sobre producción.
