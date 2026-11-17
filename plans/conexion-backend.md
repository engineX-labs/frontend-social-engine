# Plan: conectar el front con el backend real

**Estado:** aprobado el 16/11. Decisiones: login opción A (`obtenerToken()` con token de desarrollo), chat simulado con `VITE_MOCK_CHAT`, y dos cuentas reales de Zernio para probar (piloto-01 y piloto-02, un comercio y un usuario de prueba cada una). Objetivo ampliado por el usuario: probar el flujo actual, sin chat, con cuentas reales y ver que Zernio responde.
**Rama:** `feature/conexion-backend` (sale de `develop`; el PR va contra `develop`).
**Responsable:** Agustin. **Backend:** rama `feature/esquema-datos` de Nahuel, sin tocarla.

## Objetivo

Que el calendario y el detalle muestren datos reales de `backend-social-engine` en lugar de los mocks de MSW, con el backend corriendo en local. El chat sigue con su mock hasta que exista `POST /api/chat` (S4).

**Cierra cuando:** con el backend local y un usuario vinculado a un comercio, `npm run dev` muestra las publicaciones reales del mes, el detalle abre, el 401 y el 403 se ven bien, el chat sigue funcionando con su mock, y pasan `npm test`, `npm run lint`, `npm run format:check` y `npm run build`.

## Punto de partida (verificado leyendo el código)

| Tema | Front (`develop`) | Backend (`feature/esquema-datos`) |
| --- | --- | --- |
| Endpoints | `useCalendario` → `GET /api/calendario?mes=`, `useItem` → `GET /api/items/{id}` | Los dos implementados, con tests |
| Forma de los datos | `src/domain/types.ts` | `app/api/esquemas.py`: coincide campo por campo (camelCase) |
| Resumen del mes | Viene dentro de `CalendarioMes.resumen` | Lo calcula `calcular_resumen` (misma lógica que `domain/metrics.ts`) |
| Errores | `apiFetch` lee `detalle` | Responde `{"detalle": ...}` |
| Login | **No hay**: `apiFetch` no manda token | Exige `Authorization: Bearer <JWT de Supabase>`; 401 sin token, 403 sin comercio, 503 sin `SUPABASE_JWT_SECRET` |
| Mocks | `VITE_API_URL` vacío → MSW para **todo** | — |
| Chat | `streamChat` → `POST /api/chat` | **No existe** (S4) |
| Lo que llega vacío | `analisis` se pinta tal cual; `ideas` siempre traía datos en el mock | `analisis` = `""` hasta S3; `ideas` = `[]` hasta S4; `portadaUrl` = `null` |

## Decisiones abiertas (necesito tu respuesta)

1. **Login.** El backend no deja pasar sin token y el front no tiene login (es el ticket "Auth + onboarding de usuario", P0, sin empezar).
   - **A (recomendada):** esta rama solo deja un punto único donde se obtiene el token (`obtenerToken()`), y para desarrollo lo saca de `VITE_DEV_TOKEN`, que solo se lee con `import.meta.env.DEV`. Un script genera ese token firmado con el secreto local. El login de Supabase lo implementa el ticket de Auth enchufándose en ese mismo punto.
   - **B:** sumar a esta rama el login mínimo con Supabase (`@supabase/supabase-js`, pantalla de ingreso, sesión). Más grande y se pisa con el ticket de Auth.
2. **Mocks con backend real.** Con `VITE_API_URL` definido se apaga MSW entero y el chat se rompe.
   - **Recomendado:** `VITE_MOCK_CHAT=true` arranca MSW solo con los handlers del chat y deja pasar el resto al backend.
3. **Datos para probar.** La base local arranca vacía.
   - **Recomendado:** cargar una de las 3 cuentas reales de prueba con `python -m app.admin cargar-cuenta` (pide la API key de Zernio por teclado; la tenés que tipear vos). La alternativa es un seed con los fixtures del backend, pero eso es código en el repo de Nahuel.

## Fases

### Fase 0 · Backend local (sin cambios de código)
1. Worktree del backend en `feature/esquema-datos`, `docker compose up -d db`, `alembic upgrade head`.
2. `.env` local: `DATABASE_URL`, `ZERNIO_KEYS_MASTER_KEY` (generada), `SUPABASE_JWT_SECRET` (uno local de prueba), `CORS_ORIGINS=http://localhost:5173`.
3. `uvicorn app.main:app --reload` y comprobar `GET /health`.
4. Alta: `crear-comercio --usuario <uuid de prueba>` y `cargar-cuenta` (decisión 3).
5. Comprobar con `curl` y el token de prueba que `/api/calendario?mes=` devuelve publicaciones.

### Fase 1 · Token en cada pedido
- `src/api/auth.ts`: `obtenerToken(): Promise<string | null>` (decisión 1).
- `apiFetch` y `streamChat` mandan `Authorization: Bearer` cuando hay token.
- Tests: con token se manda el header; sin token no.

### Fase 2 · Mocks por endpoint
- `main.tsx`: sin `VITE_API_URL` → MSW completo (igual que hoy); con `VITE_API_URL` y `VITE_MOCK_CHAT=true` → MSW solo con `chatHandlers`, `onUnhandledRequest: 'bypass'`.
- Test de qué handlers se cargan según el entorno.

### Fase 3 · Estados que el backend real va a disparar
- **401:** mensaje "Tu sesión venció, volvé a iniciar sesión" (sin login todavía, solo el mensaje).
- **403:** "Tu usuario todavía no tiene un comercio asignado".
- **Error de red o 503:** el estado de error que ya existe en `components/estados.tsx`.
- **`analisis` vacío:** no pintar el párrafo vacío en `DetallePublicada`; mostrar "El análisis llega pronto" o esconder la sección.
- **Mes sin publicaciones e `ideas` vacías:** revisar que la grilla, la agenda y `Resumen` no se rompan (resumen con `cantidad: 0`).
- **No reintentar 401/403** en React Query (hoy `retry: 1`).
- Tests con MSW para cada caso.

### Fase 4 · Prueba de punta a punta y documentación
- Front con `VITE_API_URL=http://localhost:8000` contra el backend local: mes actual, cambio de mes, detalle, chat (mock), modo claro y oscuro.
- Revisar la zona horaria: una publicación a las 23:30 de Buenos Aires tiene que caer en el día correcto.
- `.env.example` del front con `VITE_API_URL`, `VITE_MOCK_CHAT`, `VITE_DEV_TOKEN` y un comentario de seguridad.
- Sección "Correr contra el backend" en `AGENTS.md`.
- `npm test`, `lint`, `format:check`, `build`, y PR contra `develop` con evidencia (capturas).

**PRs:** la convención del repo es un PR por fase. Propuesta: uno para las fases 1 y 2 (infraestructura de pedidos) y otro para las fases 3 y 4 (estados y prueba de punta a punta), así cada uno se revisa en un rato.

## Fuera de alcance
- Login real con Supabase (salvo que elijas B en la decisión 1).
- Mergear `feature/esquema-datos` del backend o desplegar cualquiera de los dos (lo confirmás vos).
- `POST /api/chat`, `analisis` del LLM e ideas (S3 y S4, backend).
- Configurar Vercel con `VITE_API_URL` de producción.

## Riesgos
- **`VITE_DEV_TOKEN` en producción:** se lee solo si `import.meta.env.DEV`; Vite lo elimina del build. Igual va un test que lo verifica.
- **Rama del backend que cambia:** si Nahuel cambia el contrato antes de mergear, se ajustan los tipos. A futuro, `openapi-typescript` lo evita.
- **Datos reales de un tercero en capturas:** usar una cuenta de prueba propia para la evidencia del PR.
