# Plan: login con Clerk

**Estado:** borrador para revisar. No se escribe código hasta que diga "aprobado".
**Ticket de Notion:** "Auth + onboarding de usuario" (P0, Agustin, en curso, fin 18/11). Se actualiza cuando el plan quede aprobado.
**Decisión (Agustin, 17/11):** se usa Clerk en lugar de Supabase Auth, al menos hasta validarlo con los pilotos. Si la interfaz no convence, se cambia.
**Ramas:** `feature/login-clerk` en el front (sale de `develop`, ya con el PR #3) y una rama del backend (decisión 1).

## Objetivo

Que un piloto invitado pueda iniciar sesión con Clerk y ver el calendario con sus datos reales, y que el backend acepte solo tokens válidos de Clerk.

**Cierra cuando:** con una instancia de desarrollo de Clerk, un usuario invitado inicia sesión, se lo vincula a su comercio con `python -m app.admin`, y ve su calendario. Sin sesión se ve la pantalla de ingreso. Un token vencido, de otro origen o con otro algoritmo da 401. Pasan los tests, el lint y el build de los dos repos.

## Qué dice la documentación de Clerk (leída el 17/11)

| Tema | Dato |
| --- | --- |
| Paquete del front | `@clerk/react`, con `<ClerkProvider>` envolviendo la app y la variable `VITE_CLERK_PUBLISHABLE_KEY` |
| Componentes | `<Show when="signed-in">` y `<Show when="signed-out">`, `SignInButton`, `SignUpButton`, `UserButton`. `<SignedIn>`/`<SignedOut>` y `@clerk/clerk-react` son de la generación anterior (Core 2) |
| Token para el backend | `useAuth().getToken()` devuelve `Promise<string \| null>`. El token dura **60 segundos** y el SDK lo renueva solo cada 50 s |
| Verificación sin JS | Firma **RS256**. Claves en `<Frontend API>/.well-known/jwks.json`, en `https://api.clerk.com/v1/jwks`, o como clave pública PEM del panel (verificación sin red). Chequear `exp`, `nbf` y que `azp` sea un origen permitido; `sts = pending` se puede rechazar |
| Usuario | `sub` es el id del usuario, con formato de texto (`user_123` en la documentación), **no UUID**. El email no viene en el token por defecto |
| Python | `clerk-backend-api` tiene `authenticate_request` (usa la clave secreta). No hace falta: PyJWT, que el backend ya usa, alcanza para verificar RS256 con la clave pública |
| Acceso | Modo **Invite-only** (`restricted`): solo entran usuarios invitados o creados a mano. La lista de emails permitidos es paga en producción |
| Requisitos | Node 20.9 o más (el repo usa Node 24). No exponer nunca `CLERK_SECRET_KEY` en el front |

## Decisiones (tomadas por Agustin el 17/11)

1. **Backend:** opción A. Lo hago yo en `feature/login-clerk` del backend, que sale de `feature/esquema-datos`. Agustin revisa el PR.
2. **Demo de Vercel:** no hace falta conservarla (era solo para que Nahuel validara la UI). El login es **obligatorio siempre**. Sin `VITE_CLERK_PUBLISHABLE_KEY` la app muestra un aviso de configuración claro en lugar de romperse. Los tests siguen usando los datos de ejemplo (MSW).
3. **Métodos de ingreso:** **email y contraseña**, con código por email para recuperarla. Google queda para después.

**Pendiente de verificar al implementar:** si Clerk tiene traducción al español (`@clerk/localizations`). Si no la tiene, la pantalla de ingreso queda en inglés hasta que se cambie la interfaz.

## Fases

### Fase 0 · Aplicación de Clerk (la hacés vos, con mi guía)
- Aplicación ya creada en el panel: `app_3MElztvsNcsmqCXDhUCh67pqO5O` (tipo Consumidor, React).
- En el panel: ingreso con **email y contraseña** y modo **Invite-only**. Invitar tu email para la prueba.
- En **tu terminal** (yo no puedo completar el login por navegador): `npx -y clerk@latest auth login`.
- Pasarme dos datos para el backend, ninguno secreto: la URL de la Frontend API y la clave pública PEM del token. La clave secreta no hace falta. La clave pública del front la escribe `init`.
- El MCP de Clerk no aparece en esta sesión; no hace falta.

### Fase 1 · Front: proveedor y pantalla de ingreso
- `npx -y clerk@latest init --app app_3MElztvsNcsmqCXDhUCh67pqO5O --no-skills` en la raíz del front: instala `@clerk/react`, configura el proveedor y escribe la clave de desarrollo. Después reviso el diff archivo por archivo y ajusto lo que no encaje con el plan. Si `init` no completa algo, sigo el quickstart de React. No leo ni imprimo los archivos de entorno.
- `--no-skills`: no instala las skills de Clerk en tu máquina (no hacen falta para esto).
- `main.tsx`: `<ClerkProvider>` siempre; sin clave, aviso de configuración (decisión 2).
- Sin sesión: pantalla de ingreso con `<SignIn />` y la identidad de engineX (`appearance`, y el tema `shadcn` de `@clerk/ui` porque el repo usa shadcn). Con sesión: el calendario de siempre y `<UserButton />` en la barra superior.
- **Verificación:** en `npm run dev` sin sesión aparece la pantalla de ingreso; al entrar, el calendario.

### Fase 2 · Front: el token en cada pedido
- `src/api/auth.ts` sigue siendo el único punto. Un componente dentro del proveedor le registra `getToken()` de Clerk, y `obtenerToken()` lo llama. Así `apiFetch` y el chat no cambian.
- Se elimina el token de desarrollo (`VITE_DEV_TOKEN` y `scripts/token-dev.mjs`): firmaba HS256 de Supabase y el backend ya no lo va a aceptar.
- Con 401, cerrar la sesión de Clerk y volver a la pantalla de ingreso.
- **Tests:** con sesión se manda el token; sin sesión, no; un 401 lleva al ingreso.

### Fase 3 · Backend (decisión 1: lo hago yo, PR que revisa Agustin)
- `app/auth.py`: verificar RS256 con las claves públicas de `<CLERK_ISSUER>/.well-known/jwks.json` (cacheadas; **cambio respecto del plan original**, que decía clave PEM fija: así una rotación de claves de Clerk no exige tocar el servidor, y se configura con una sola variable pública), exigir `exp` y `nbf`, `azp` dentro de los orígenes permitidos (los de `CORS_ORIGINS`) y rechazar `sts = pending`. Se va `SUPABASE_JWT_SECRET`.
- Migración `0005`: `comercios.auth_user_id` pasa de UUID a texto. Va después de `0004_portada_url` (Nahuel, ya en `develop`).
- `python -m app.admin`: `--usuario` acepta el id de Clerk (`user_...`).
- **Tests:** un par de claves RSA de prueba; casos de token válido, vencido, de otro `azp`, firmado con otro algoritmo, `pending`, y usuario sin comercio (403).
- Actualizar `CONTRATO-API.md` (decisión 2 del contrato: el login pasa a ser Clerk).

### Fase 4 · Alta de un piloto y prueba de punta a punta
- El flujo queda así: invitar al piloto desde Clerk → el piloto crea su contraseña → `python -m app.admin crear-comercio --usuario user_...` (o `vincular-usuario`) → el piloto ve su calendario.
- Probar con tu usuario contra el backend local y la cuenta piloto-01 cargada.
- **Verificación:** calendario con datos reales; cerrar sesión vuelve al ingreso; un usuario invitado sin comercio ve el aviso del 403.

### Fase 5 · Documentación y PR
- `.env.example` y `AGENTS.md` del front: `VITE_CLERK_PUBLISHABLE_KEY` en lugar del token de desarrollo.
- Roadmap del VPS (`plans/base-de-datos-vps.md` del backend): la Fase 4 pasa de Supabase a Clerk.
- Página "Stack social engine" de Notion: login con Clerk en lugar de supabase-js.
- PRs contra `develop` en los dos repos, con evidencia. Agustin revisa los dos. (`develop` del backend ya incluye el esquema y las portadas; `feature/esquema-datos` quedó atrás.)

## Fuera de alcance
- El cuestionario del primer inicio de sesión (ticket propio, P1).
- Vincular el comercio automáticamente por email: en el piloto sigue siendo manual.
- La instancia de producción de Clerk: necesita un dominio propio y se hace con el despliegue.
- Organizaciones y equipos, login con Google, y 2FA.

## Riesgos
- **Token de 60 segundos:** si `obtenerToken()` guardara el token, vencería enseguida. Siempre se le pide a Clerk, que lo cachea y renueva.
- **Ids de texto:** cualquier parte del backend que asuma UUID para el usuario falla. Lo cubren la migración y los tests.
- **Dos migraciones en paralelo** (esta y la de portadas): coordinar el orden con Nahuel.
- **Interfaz en inglés** si no hay traducción (decisión 4).
- **Dependencia de un tercero:** asumida para validar. El login queda aislado en `src/api/auth.ts` y `app/auth.py` para poder cambiarlo.
