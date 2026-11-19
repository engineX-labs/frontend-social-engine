# Plan: registro de un comercio nuevo y conexión de redes desde la app

**Estado:** borrador para revisar (revisado el 18/11). No se escribe código hasta que diga "aprobado".
**Tickets de Notion:** "Registro: alta de un comercio sin pasos manuales" (P1, Backlog) y "Conectar redes vía OAuth de Zernio desde la PWA" (P0, En curso, vence el 20/11).
**Repos:** front (`frontend-social-engine`) y backend (`backend-social-engine`). Rama `feature/registro-abierto` en los dos, desde `develop` (ya tiene el login con Clerk, publicar y las migraciones hasta la `0008`).
**Se construye en paralelo con:** `plans/cuestionario-contexto.md`. Este plan **no lleva migración** (la `0009` es del cuestionario).

## Cómo es hoy

1. Nosotros invitamos el email desde Clerk (modo Invite-only).
2. El piloto crea su contraseña o entra con Google desde el mail.
3. Nosotros, con acceso al servidor, corremos `python -m app.admin crear-comercio` y `cargar-cuenta` (creamos su cuenta de Zernio y conectamos sus redes desde el panel de Zernio, con él presente).
4. Entre el paso 2 y el 3 ve "Tu usuario todavía no tiene un comercio asignado" (403).

## Objetivo

Que una persona nueva se registre, cree su comercio y conecte sus redes **desde la app**, y que el único paso manual que quede (si queda alguno) sea nuestro y no la bloquee con un error.

**Cierra cuando:** un email que nunca usó la app se registra, completa la bienvenida, ve su comercio creado y conecta Instagram o TikTok (o ve claramente que su cuenta está en preparación). Pasan los tests, el lint y el build de los dos repos.

## El límite real: Zernio

Cada comercio hoy tiene **su propia cuenta de Zernio** (plan gratis, 2 redes), creada a mano por nosotros con un email (`MODELO-CUENTAS-PILOTOS.md`). Zernio no ofrece crear cuentas por API, así que con este modelo el alta no puede ser 100 % automática. Hay dos caminos:

| | A · Una cuenta de Zernio por comercio (hoy) | B · Una cuenta paga con un perfil por comercio (plan B ya documentado) |
| --- | --- | --- |
| Alta | El comercio queda **"en preparación"** hasta que creamos su cuenta de Zernio y cargamos la key | **Automática**: `POST /v1/profiles` con `externalId` = id del comercio |
| Conectar redes | Desde la app con `GET /v1/connect/{plataforma}` usando la key del comercio | Igual, con `profileId` |
| Costo | Gratis | Plan pago de Zernio |
| Aislamiento | Zernio + nuestra app | Solo nuestra app (filtro por `profileId`) |
| Cambio en el backend | Ninguno en el modelo | `zernio_cuentas` compartida y `zernio_profile_id` en `redes_conectadas` |

**Recomendación:** **A** para los pilotos (no cambia costos ni el modelo), con el código del alta y de la conexión escrito para que pasar a B sea cambiar solo de dónde salen la key y el perfil.

## Decisiones

**Tomada (18/11):** el cuestionario de contexto va en su propio plan. La bienvenida de este plan pide **solo el nombre del comercio**; el cuestionario se engancha después (Fase 5 del otro plan).

**A tomar (Agustin, con Nahuel donde dice):**

1. **Modo de registro en Clerk:**
   - **a. Lista de espera** (recomendado para los pilotos): cualquiera se anota, nosotros aprobamos desde el panel y Clerk le manda el acceso. Sin spam ni altas que no podemos atender. *(Verificar en la documentación de Clerk que el modo `waitlist` está disponible en nuestro plan.)*
   - b. Abierto: cualquiera se registra y entra.
   - c. Seguir solo con invitación y resolver únicamente la bienvenida y la conexión de redes.
2. **Zernio: A o B** (tabla de arriba). Decisión de los dos, porque toca el modelo de Nahuel y los costos.
3. **Cómo nos enteramos de un alta nueva:**
   - **a. Comando `python -m app.admin pendientes`** que lista los comercios en preparación, con el comando de alta listo para copiar (recomendado ahora: no suma dependencias).
   - b. Email a Nahuel y Agustin con Resend (está en el stack pero todavía no está integrado; suma una cuenta, una key y un dominio verificado).

## Fases (con las decisiones recomendadas: 1a, 2A, 3a)

El orden cambia respecto del borrador anterior: **la conexión de redes va primero** porque es P0 y vence el 20/11, y funciona sola para los comercios que ya existen (como "Prueba 02").

### Fase 1 · Conectar redes desde la app (P0)
- **Backend:**
  - `GET /api/conexion/redes` → las redes del comercio con su estado (`conectada`, `hay_que_reconectar`) y las plataformas que faltan. **No** va detrás de `PUBLICACION_HABILITADA` (hoy `/api/redes` sí lo está y daría 404 a cualquier piloto).
  - `POST /api/conexion/redes/{plataforma}` → `{ authUrl }`. Llama a `GET /v1/connect/{plataforma}` con la key del comercio, `redirect_url` = la app y `reconnectAccountId` si es una reconexión.
  - `POST /api/conexion/redes/sincronizar` → al volver del OAuth, lee `GET /v1/accounts` en Zernio y registra en `redes_conectadas` las cuentas nuevas (reusa la lógica de `cargar-cuenta`). Si hay redes nuevas, lanza `primer_sync` en segundo plano.
  - **No depende del webhook** `account.connected`: necesita el backend desplegado con URL pública, que todavía no está. Si después se suma, hace lo mismo que `sincronizar` (idempotente).
- **Front:** pantalla "Conectá tus redes" con "Conectar Instagram" y "Conectar TikTok", la vuelta del OAuth (llama a `sincronizar` y muestra el resultado) y el estado de cada red. El mismo componente sirve para reconectar cuando una red está en error.
- **Tests:** registrar cuentas nuevas sin duplicar las existentes, plataforma no soportada (400), key de Zernio inválida, un comercio no puede sincronizar redes de otro y la vuelta del OAuth con error o cancelada.
- **Verificación:** con "Prueba 02", reconectar una de sus redes desde la app y verla en el calendario después del sync. **A verificar en la Fase 1:** qué parámetros manda Zernio en la vuelta al `redirect_url` y si una cuenta de Instagram ya conectada a una cuenta de Zernio se puede conectar a otra (afecta cómo se prueba el alta de punta a punta con nuestras cuentas, nunca con las de un piloto).

### Fase 2 · Clerk (en el panel, con la CLI)
- Cambiar el modo de registro según la decisión 1 (dry-run antes de aplicar).
- Pantalla de ingreso: mostrar "Anotate" o "Crear cuenta" según el modo; el `<Waitlist />` o `<SignUp />` de Clerk con la apariencia de engineX y en español.
- **Verificación:** un email nuevo se anota; al aprobarlo, recibe el acceso y entra. *(Probar primero que el mail llegue: en la prueba del login no llegaron las invitaciones.)*

### Fase 3 · Backend: el usuario y su comercio
- `app/auth.py`: separar `usuario_actual` (token válido, sin exigir comercio) de `comercio_actual` (que sigue igual y lo usa). Solo las rutas nuevas de esta fase usan `usuario_actual`.
- `GET /api/yo` → `{ comercio: null | { id, nombre, estado } }`, con `estado` = `en_preparacion` (sin cuenta de Zernio), `sin_redes` o `activo`. Se calcula de las tablas que existen; no hace falta migración.
- `POST /api/comercio` → crea el comercio del usuario con `{ nombre }`. Idempotente: un segundo pedido devuelve el mismo, también si llegan dos a la vez (`auth_user_id` ya es único en la base).
- `python -m app.admin pendientes` (decisión 3a). `cargar-cuenta` sigue igual: es lo que pasa el comercio de `en_preparacion` a `sin_redes`.
- **Tests:** usuario sin comercio da `null`; crear dos veces (también en paralelo) devuelve el mismo; el usuario A no ve ni crea sobre el comercio de B; el resto de las rutas sigue dando 403 sin comercio; los tres estados.

### Fase 4 · Front: pantalla de entrada en lugar del 403
- Después del login, la app pide `/api/yo` antes de montar el calendario (`src/app/Entrada.tsx`, dentro de `Acceso`):
  - sin comercio → **bienvenida**: nombre del comercio → `POST /api/comercio`;
  - `en_preparacion` → "Estamos preparando tu cuenta, te avisamos por mail" (sin calendario vacío ni errores);
  - `sin_redes` → "Conectá tus redes" (Fase 1);
  - `activo` → el calendario de siempre.
- `Entrada.tsx` deja un lugar explícito para el paso del cuestionario, que suma el otro plan en su Fase 5.
- Mock MSW para los cuatro estados y tests de cada pantalla.
- **Verificación:** en `npm run dev`, un usuario nuevo ve la bienvenida y no el aviso de 403.

### Fase 5 · Prueba de punta a punta y documentación
- Un email nuevo: se anota → lo aprobamos → entra → bienvenida → "en preparación" → cargamos su cuenta de Zernio → conecta su red → ve el calendario.
- `AGENTS.md` del front y `CONTRATO-API.md` y `MODELO-CUENTAS-PILOTOS.md` del backend: el alta nueva.
- PRs contra `develop` en los dos repos, con evidencia. La Fase 1 puede ir en un PR propio antes que el resto, por la fecha del ticket P0.

## Fuera de alcance
- Cobro, planes y prueba gratis.
- Varios usuarios por comercio (equipos) y varios comercios por usuario.
- Instancia de producción de Clerk (necesita dominio propio; va con el despliegue).
- Pasar a la opción B de Zernio (si se decide, es un plan propio con Nahuel).
- El cuestionario de contexto y el perfil de marca (plan propio).
- El webhook `account.connected` (necesita el backend desplegado).

## Riesgos
- **Mails de Clerk que no llegan:** ya pasó con las invitaciones. Sin eso, nadie puede registrarse. Se prueba primero (Fase 2).
- **Altas que no podemos atender:** con la opción A cada alta nos cuesta crear una cuenta de Zernio a mano. La lista de espera lo controla.
- **Condiciones de Zernio:** muchas cuentas gratis de un mismo dueño pueden violar sus términos a escala (`ZERNIO-COSTOS-Y-CONDICIONES.md`). Con más de los 10 pilotos, revisar la opción B.
- **Probar la conexión sin cuentas de pilotos:** solo tenemos @enginex.labs y @social.enginex, ya conectadas a "Prueba 02". Si Zernio no deja conectarlas a una segunda cuenta, la prueba de alta nueva se hace con reconexión o con una cuenta de prueba nueva.
- **Construcción en paralelo con el cuestionario:** comparten `app/main.py` (registrar rutas) y `Entrada.tsx`. El cuestionario se engancha en la Fase 5 de su plan, sobre esta rama ya mergeada o rebasada.
