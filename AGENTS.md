# AGENTS.md

Frontend de **social engine** (engineX): calendario de publicaciones e ideas para Instagram/TikTok de un comercio.

## Estado actual (verificado)
- El repo solo contiene HTML estáticos: `index.html` y `social-engine-pizarron.html` (idénticos, demo del pizarrón, desplegada en Vercel) y `README.md`.
- No hay `package.json`, tests, linter, CI ni plantilla de PR. No hay comandos de instalar/test/lint/build todavía.
- Base de diseño a implementar: `Calendario social engine.html` (prototipo, fuera del repo por ahora). Plan en `plans/frontend-calendario.md`. Gestor de paquetes: npm. Los HTML actuales pasarán a `prototipos/`. Identidad visual: la de https://engine.nlabs.com.ar/ (no la del prototipo).

## Stack objetivo (Notion: "Stack social engine")
Vite + React + TypeScript, TanStack Router/Query, openapi-typescript + openapi-fetch, supabase-js, Tailwind + shadcn/ui, React Hook Form + Zod, Vitest + Testing Library. Backend aparte (Python + FastAPI, Nahuel).

## Convenciones
- Idioma de UI y commits: español (voseo en textos de UI, como en el prototipo).
- Fechas en UTC en datos, hora de Buenos Aires en pantalla.
- El front solo habla con la API propia, nunca con Zernio ni el modelo.
- Ramas: prefijo convencional (`feature/...`, `fix/...`, `docs/...`, etc.); rama principal `main`.
- Agente de IA del chat: **Fidel** (nombre provisorio).

## Zonas delicadas
- Deploy en Vercel desde `main` (commit "correcion para vercel"): no mover `index.html` sin revisar el deploy.
- No mergear ni desplegar sin confirmación del usuario.

## Reglas
- Actualizar este archivo con los comandos reales cuando exista el andamiaje (fase 1 del plan).
