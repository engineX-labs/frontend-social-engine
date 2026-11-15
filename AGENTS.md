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

Vite + React + TypeScript (estricto), Tailwind v4 + shadcn/ui (`components.json`, alias `@/`), TanStack Router/Query, openapi-typescript + openapi-fetch, supabase-js, React Hook Form + Zod, Vitest + Testing Library, MSW para mock. Backend aparte (Python + FastAPI, Nahuel). Instalados hoy: Tailwind, TanStack Router/Query, MSW, Vitest/Testing Library, clsx/tailwind-merge/cva/lucide. Pendientes (se suman cuando se usen): openapi-typescript/openapi-fetch (cuando exista el esquema), supabase-js (login), React Hook Form + Zod (formularios).

## Datos y mocks

- Sin `VITE_API_URL` la app usa datos de ejemplo (MSW, también en el build de producción: así funciona el demo en Vercel). Con `VITE_API_URL` (admite prefijo, p. ej. `https://api.x.com/v1`) habla con el backend real.
- Contrato de chat (SSE): `POST /api/chat` con `{ mensajes: [{rol, texto}], itemId? }`; responde `text/event-stream` con `data: {"delta":"..."}` y `data: [DONE]`; errores a mitad de stream con `event: error`.

## Convenciones

- Idioma de UI y commits: español (voseo en la UI).
- Identidad visual: la de https://engine.nlabs.com.ar/ (tokens en `src/index.css`, oscuro por defecto, claro con `data-theme="light"` o `prefers-color-scheme`). Usar clases Tailwind con esos tokens (`bg-surface`, `text-muted`, `bg-accent`...), no colores sueltos.
- Fechas en UTC en datos, hora de Buenos Aires en pantalla.
- El front solo habla con la API propia, nunca con Zernio ni el modelo.
- Ramas: prefijo convencional (`feature/...`, `fix/...`, `docs/...`); rama principal `main`. Un PR por fase del plan.
- Si falla un test, arreglar la implementación, no el test (salvo que esté mal).

## Zonas delicadas

- Deploy en Vercel desde `main`: antes servía `index.html` estático; ahora debe servir el build de Vite (`dist`). Verificar el deploy de preview antes de mergear la fase 1.
- No mergear ni desplegar sin confirmación del usuario.
