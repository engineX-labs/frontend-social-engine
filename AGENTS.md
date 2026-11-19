# AGENTS.md

Frontend de **social engine** (engineX): calendario de publicaciones e ideas y chat con el agente de IA (Fidel, nombre provisorio) para Instagram/TikTok de un comercio.

## Estructura

- `src/`: app React (un solo dashboard: calendario + Fidel en barra lateral izquierda en escritorio y hoja con botón flotante en móvil; `features/chat/FidelProvider.tsx` guarda la conversación; `main.tsx`, `index.css` con los tokens de engineX, `lib/utils.ts`, `test/setup.ts`).
- `public/fonts/`: Plus Jakarta Sans y JetBrains Mono (copiadas de https://engine.nlabs.com.ar/).
- `prototipos/`: HTML de referencia (calendario, pizarrón). No forman parte del build.
- `plans/`: planes de trabajo (`plans/frontend-calendario.md`, aprobado).
- `.github/workflows/ci.yml`: lint, format, test y build en cada PR.
- `vercel.json`: build `npm run build`, salida `dist`, SPA fallback.

## Comandos (npm, Node 24)

- Instalar: `npm ci` (o `npm install`)
- Desarrollo: `npm run dev`
- Test: `npm test` (Vitest, una pasada) / `npm run test:watch`
- Lint: `npm run lint` (oxlint)
- Formato: `npm run format:check` / `npm run format`
- Build: `npm run build` (`tsc -b && vite build`)

## Stack (Notion: "Stack social engine")

Vite + React + TypeScript (estricto), Tailwind v4 + shadcn/ui (`components.json`, alias `@/`), TanStack Router/Query, openapi-typescript + openapi-fetch, Clerk (`@clerk/react`, login), React Hook Form + Zod, Vitest + Testing Library, MSW para mock. Backend aparte (Python + FastAPI, Nahuel). Instalados hoy: Tailwind, TanStack Router/Query, MSW, Vitest/Testing Library, clsx/tailwind-merge/cva/lucide. Pendientes (se suman cuando se usen): openapi-typescript/openapi-fetch (cuando exista el esquema), supabase-js (login), React Hook Form + Zod (formularios).

## Datos y mocks

- Sin `VITE_API_URL` la app usa datos de ejemplo (MSW, también en el build de producción: así funciona el demo en Vercel). Con `VITE_API_URL` (admite prefijo, p. ej. `https://api.x.com/v1`) habla con el backend real.
- **Correr contra el backend local** (`.env.example` lista las variables; copiarlo a `.env.local`):
  1. Backend (`backend-social-engine`, rama `develop`): `docker compose up -d db`, `alembic upgrade head`, `uvicorn app.main:app --port 8000`, con `CLERK_ISSUER` (la URL de la Frontend API de Clerk) y `CORS_ORIGINS=http://localhost:5173` en su `.env`.
  2. Usuario: en el panel de Clerk (Users) crear o invitar al usuario y copiar su id (`user_...`).
  3. Alta del comercio y su cuenta de Zernio con `python -m app.admin crear-comercio --usuario user_...` y `cargar-cuenta` (la key de Zernio se pide por teclado).
  4. `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_API_URL=http://localhost:8000` y `VITE_MOCK_CHAT=true` en `.env.local`, y `npm run dev`. Se inicia sesión con ese usuario.
- **Login (Clerk):** obligatorio siempre; sin `VITE_CLERK_PUBLISHABLE_KEY` la app muestra un aviso de configuración. Los usuarios entran por invitación (modo Invite-only en el panel de Clerk), no hay registro público. `src/app/Acceso.tsx` pone el proveedor y la pantalla de ingreso (con los tokens de engineX y la traducción `esMX`); sin sesión no se monta ni la API ni el router. Los tests usan un doble de `@clerk/react` (`src/test/clerk.tsx`).
- Token: `src/api/auth.ts` es el único punto que lo obtiene; `Acceso` le registra el `getToken()` de Clerk. Dura 60 s y Clerk lo renueva: nunca se guarda. `apiFetch` y `streamChat` mandan `Authorization: Bearer`. Un 401 de la API cierra la sesión y vuelve al ingreso, y se vacía la caché de consultas para que el próximo usuario no vea datos del anterior.
- **Publicar y programar** (`plans/publicar-programar.md`): detrás de `VITE_PUBLICACION_HABILITADA=true` (ver `.env.example`); apagada, la app se ve igual que antes. Si el backend responde 404 en `GET /api/redes` (su `PUBLICACION_HABILITADA` apagada), el front esconde todo igual (`usePublicacionDisponible`). Contrato: `backend-social-engine/project-docs/CONTRATO-API.md`, sección «Publicar y programar». Capas: `domain/publicacion.ts` (reglas y estados), `api/publicacion.ts` (consultas y mutaciones), `mocks/programadas.ts` (el backend en memoria, con los mismos estados, reglas y mensajes). Al crear, el `id` es un uuid v4 por envío del formulario: un reintento repite el mismo `id` y nunca publica dos veces. Los 409 se distinguen con `tipoDeConflicto` (`api/errores.ts`).
- Errores de la API: 401 ("tu sesión venció") y 403 ("tu usuario todavía no tiene un comercio asignado") no se reintentan ni ofrecen "Reintentar". `analisis` llega vacío hasta S3 y `ideas` vacías hasta S4; la UI lo tolera.
- Contrato de chat (SSE): `POST /api/chat` con `{ mensajes: [{rol, texto}], itemId? }`; responde `text/event-stream` con `data: {"delta":"..."}` y `data: [DONE]`; errores a mitad de stream con `event: error`.

## Convenciones

- Idioma de UI y commits: español (voseo en la UI).
- Identidad visual: la de https://engine.nlabs.com.ar/ (tokens en `src/index.css`, oscuro por defecto, claro con `data-theme="light"` o `prefers-color-scheme`). Usar clases Tailwind con esos tokens (`bg-surface`, `text-muted`, `bg-accent`...), no colores sueltos.
- Fechas en UTC en datos, hora de Buenos Aires en pantalla.
- El front solo habla con la API propia, nunca con Zernio ni el modelo. **Única excepción:** al subir un archivo para publicar, el navegador hace un `PUT` a la `uploadUrl` firmada que devuelve `POST /api/medios` (sin token ni key de Zernio, que nunca salen del servidor). Decidido el 17/11 para el MVP; la decisión de largo plazo está en Notion («Decidir cómo se suben los archivos a largo plazo»).
- Ramas: prefijo convencional (`feature/...`, `fix/...`, `docs/...`); rama principal `main`. Un PR por fase del plan.
- Si falla un test, arreglar la implementación, no el test (salvo que esté mal).

## Zonas delicadas

- Deploy en Vercel desde `main`: antes servía `index.html` estático; ahora debe servir el build de Vite (`dist`). Verificar el deploy de preview antes de mergear la fase 1.
- No mergear ni desplegar sin confirmación del usuario.
