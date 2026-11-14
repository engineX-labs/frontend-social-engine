# Plan: Frontend de social engine (calendario MVP)

Estado: aprobado (v2, aprobado por el usuario en el chat)

## Contexto
- Base: `Calendario social engine.html` (prototipo vanilla JS, 1 archivo) y `index.html` / `social-engine-pizarron.html` (demo anterior del pizarrón, idénticos entre sí, desplegados en Vercel).
- Stack (Notion, "Stack social engine"): Vite + React + TypeScript, TanStack Router + Query, openapi-typescript + openapi-fetch, supabase-js (login), Tailwind + shadcn/ui, React Hook Form + Zod, calendario con CSS grid propio, chat por SSE, Vitest + Testing Library. Hosting: Vercel o Cloudflare Pages (pendiente).
- Tarea Notion: "Web(ui/ux): vista de posts, chat e ideas" (S4, P0, responsable Agustin, criterio: usable desde el celular).

## Decisiones tomadas
1. **Alcance MVP**: el calendario muestra publicadas + ideas sugeridas. Sin estado «Programada», sin drag & drop, sin crear/programar publicaciones (fuera del MVP según roadmap). El código se estructura para poder sumarlo después.
2. **Datos**: capa de API propia con tipos manuales + MSW con los datos de ejemplo del prototipo. Se migra a `openapi-typescript` cuando Nahuel publique el esquema.
3. **Login**: fuera de esta primera entrega (fase posterior, tarea "Auth + onboarding").
4. **Gestor de paquetes**: npm (con `package-lock.json`).
5. **Prototipos**: `index.html` y `social-engine-pizarron.html` se mueven a `prototipos/`; el HTML del calendario se guarda ahí también como referencia.
6. **El prototipo es una referencia, no una especificación**: actúo como diseñador, reordeno layout, jerarquía y flujos donde mejore la experiencia (mobile-first). Cada cambio relevante respecto al prototipo se documenta en el PR.
7. **Chat con el agente de IA** entra en esta entrega (el prototipo no lo tiene): UI completa con streaming SSE contra un mock MSW; el backend real se conecta después.
8. **Identidad visual = la web https://engine.nlabs.com.ar/** (no la paleta del prototipo).

## Sistema visual (extraído del CSS de engine.nlabs.com.ar)
- **Colores**: carbon `#0e1116`, paper `#f4f4f2`, stone `#d9dbd6`, ignite `#ff5b2e` (acento). Oscuro por defecto: surface `#0e1116`, raised `#161a21`, inset `#0a0c10`, line `#262c36`, line-strong `#636c7b`, ink-muted `#9aa1ac`, accent-hover `#ff7a52`, accent-soft `#2a1610`, success `#5fd68a`, danger `#ff9eb0`. Claro: surface `#f4f4f2`, raised `#fff`, inset `#ecece8`, line `#dcddd8`, line-strong `#80847c`, ink `#0e1116`, ink-muted `#5b616b`, accent-hover `#e64a1f`, accent-ink `#b83510`, accent-soft `#ffe5dc`, success `#17793c`, danger `#b4123f`.
- **Gradiente de marca** (solo en detalles puntuales, p. ej. wordmark): `#ff5b2e → #e0307a → #7c5cff`; en claro, versión oscurecida para contraste.
- **Tipografía**: Plus Jakarta Sans 400–800 y JetBrains Mono (autoalojadas en la web; las autoalojo también en Vite).
- **Forma**: radios 6/10/16/24 px y pill; glass (blur 16px) para superficies flotantes; sombra de tarjeta solo en claro; espaciado en escala 4/8/12/16/24/32/48/64; easing `cubic-bezier(.2,.7,.2,1)`, duraciones .14/.16/.22s; foco con anillo ignite.
- **Tono**: español rioplatense (voseo), directo y breve. El asistente de la web se llama **Fidel**; el nombre del agente del chat se confirma antes de la fase 6.
- Se mapean como tokens de Tailwind/CSS variables con modo claro/oscuro (`data-theme`), respetando `prefers-color-scheme`.

## Qué se conserva del prototipo
Estructura de información, grilla mensual con chips, filtros por estado, vista agenda en móvil (<820px, puntos + lista del día), panel de detalle (lateral ≥820px, bottom sheet en móvil), análisis de publicadas (promedio, ranking, pill ×promedio), propuesta de copy y "por qué esta propuesta" para ideas, toggle de tema, accesibilidad (aria, foco, reduced-motion).

## Fases (cada una un PR chico)
1. **Andamiaje**: npm; Vite + React + TS (estricto), Tailwind con tokens de engineX, shadcn/ui, ESLint/Prettier, Vitest + Testing Library, GitHub Actions (lint, test, build), `vercel.json` si hace falta, `AGENTS.md`. Mover los HTML actuales a `prototipos/` y revisar el deploy de Vercel (build de Vite, salida `dist`, `vercel.json` si hace falta) antes de mergear.
2. **Dominio y datos**: tipos (`Post`, `Idea`, métricas), módulo puro de métricas (promedio/mediana, ranking, franja horaria, análisis) con tests; cliente API + handlers MSW con los datos de ejemplo. Nota: el stack pide **mediana propia** en el back; el prototipo usa promedio. Se muestra lo que entregue la API; en mock se usa mediana para alinear.
3. **Shell + rutas**: TanStack Router, layout con barra superior, tema claro/oscuro persistido, TanStack Query con estados de carga/error/vacío.
4. **Calendario**: grilla mensual (CSS grid, semana lunes–domingo), navegación de mes, "Hoy", filtros, chips, "+N más", vista móvil con puntos y agenda del día. Hora Buenos Aires (datos en UTC).
5. **Panel de detalle**: publicada (resultado, comparación con promedio, análisis) e idea (formato, día, hora sugerida, idea de portada, copy propuesto con "otra propuesta" y "por qué"). Foco/Escape/scrim, bottom sheet en móvil.
6. **Chat con el agente**: panel/ruta de chat (en escritorio, panel lateral junto al calendario; en móvil, pestaña inferior), lista de mensajes con streaming SSE vía `fetch`, estados (escribiendo, error, reintentar), sugerencias rápidas, y acciones que enlazan a publicaciones/ideas del calendario. Mock MSW que emite SSE. Tests del parser de stream y del componente.
7. **Pulido**: accesibilidad, teclado, prueba en celular real (criterio de hecho), rendimiento, revisión de diseño.
8. **Siguientes (fuera de este plan)**: conectar chat al backend real, auth Supabase, migración a tipos OpenAPI, vista pizarrón (React Flow opcional).

## Verificación por fase
`npm run lint`, `npm run test`, `npm run build` en verde; revisión visual contra el prototipo en escritorio y 390px; capturas en cada PR.

## Riesgos / abiertos
- Dónde corre el backend, aislamiento por comercio y hosting final del front (pendientes en Notion): no bloquean el front con mock.
- Diferencias de contrato con el backend (promedio vs mediana, campos de TikTok con marca de actualización).
- Navegación de la app: calendario + chat conviven; el diseño final de esa convivencia (panel vs. pestaña) se valida con capturas antes de implementar fases 4–6.
- Los tokens salen de la web pública; si el equipo tiene un archivo de tokens oficial, se usa ese.

## Fuera de alcance
Programar/generar contenido, drag & drop, login, cobro, Facebook, benchmark por rubro, multi-cliente.
