# AGENTS.md

Frontend de **social engine** (engineX): calendario de publicaciones e ideas y chat con el agente de IA (Fidel, nombre provisorio) para Instagram/TikTok de un comercio.

## Estructura

- `src/`: app React (un solo dashboard: calendario + Fidel en barra lateral izquierda en escritorio y hoja con botón flotante en móvil; `features/chat/FidelProvider.tsx` guarda la conversación; `main.tsx`, `index.css` con los tokens de engineX, `lib/utils.ts`, `test/setup.ts`).
- `public/fonts/`: Plus Jakarta Sans y JetBrains Mono (copiadas de https://engine.nlabs.com.ar/).
- `prototipos/`: HTML de referencia (calendario, pizarrón). No forman parte del build.
- `src/features/contexto/`: cuestionario de contexto y perfil de marca (ver «Cuestionario y perfil de marca»).
- `plans/`: planes de trabajo (`plans/frontend-calendario.md`, `plans/cuestionario-contexto.md`, aprobados).
- `.github/workflows/ci.yml`: lint, format, test y build en cada PR.
- `vercel.json`: build `npm run build`, salida `dist`, SPA fallback.

## Comandos (npm, Node 24)

- Instalar: `npm ci` (o `npm install`)
- Desarrollo: `npm run dev`
- Test: `npm test` (Vitest, una pasada) / `npm run test:watch`
- Lint: `npm run lint` (oxlint)
- Formato: `npm run format:check` / `npm run format`
- Build: `npm run build` (`tsc -b && vite build`)

## Stack (decisión 0004 en `social-engine/decisiones/`)

Vite + React + TypeScript (estricto), Tailwind v4 + shadcn/ui (`components.json`, alias `@/`), TanStack Router/Query, openapi-typescript + openapi-fetch, Clerk (`@clerk/react`, login), React Hook Form + Zod, Vitest + Testing Library, MSW para mock. Backend aparte (Python + FastAPI, Nahuel). Instalados hoy: Tailwind, TanStack Router/Query, MSW, Vitest/Testing Library, clsx/tailwind-merge/cva/lucide. React Hook Form + Zod (con `@hookform/resolvers`) se usan en la bienvenida (`features/registro/Bienvenida.tsx`) y en los formularios del cuestionario y del perfil (`features/contexto/`). Pendientes (se suman cuando se usen): openapi-typescript/openapi-fetch (cuando exista el esquema).

## Datos y mocks

- Sin `VITE_API_URL` la app usa datos de ejemplo (MSW, también en el build de producción: así funciona el demo en Vercel). Con `VITE_API_URL` (admite prefijo, p. ej. `https://api.x.com/v1`) habla con el backend real.
- **Correr contra el backend local** (`.env.example` lista las variables; copiarlo a `.env.local`):
  1. Backend (`backend-social-engine`, rama `develop`): `docker compose up -d db`, `alembic upgrade head`, `uvicorn app.main:app --port 8000`, con `CLERK_ISSUER` (la URL de la Frontend API de Clerk) y `CORS_ORIGINS=http://localhost:5173` en su `.env`.
  2. Usuario: en el panel de Clerk (Users) crear o invitar al usuario y copiar su id (`user_...`).
  3. Alta del comercio y su cuenta de Zernio con `python -m app.admin crear-comercio --usuario user_...` y `cargar-cuenta` (la key de Zernio se pide por teclado).
  4. `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_API_URL=http://localhost:8000` y `VITE_MOCK_CHAT=true` en `.env.local`, y `npm run dev`. Se inicia sesión con ese usuario.
- **Login (Clerk):** obligatorio siempre; sin `VITE_CLERK_PUBLISHABLE_KEY` la app muestra un aviso de configuración. Hoy los usuarios entran por invitación (modo Invite-only en el panel de Clerk). `VITE_REGISTRO` (`invitacion` por defecto, `lista_de_espera`, `abierto`; ver `.env.example`) agrega en la pantalla de ingreso el `<Waitlist />` o el `<SignUp />` de Clerk; tiene que coincidir con el modo del panel, que el front no cambia (decisión «lista de espera» del 18/11: el panel de la instancia de desarrollo está en `sign_up_mode: waitlist` desde el 19/11, y hay que poner `VITE_REGISTRO=lista_de_espera` en `.env.local` y en las variables del despliegue; sin eso el ingreso no muestra «Anotate»). `src/app/Acceso.tsx` pone el proveedor y la pantalla de ingreso (con los tokens de engineX y la traducción `esMX`); sin sesión no se monta ni la API ni el router. Los tests usan un doble de `@clerk/react` (`src/test/clerk.tsx`).
- Token: `src/api/auth.ts` es el único punto que lo obtiene; `Acceso` le registra el `getToken()` de Clerk. Dura 60 s y Clerk lo renueva: nunca se guarda. `apiFetch` y `streamChat` mandan `Authorization: Bearer`. Un 401 de la API cierra la sesión y vuelve al ingreso, y se vacía la caché de consultas para que el próximo usuario no vea datos del anterior.
- **Publicar y programar** (`plans/publicar-programar.md`): detrás de `VITE_PUBLICACION_HABILITADA=true` (ver `.env.example`); apagada, la app se ve igual que antes. Si el backend responde 404 en `GET /api/redes` (su `PUBLICACION_HABILITADA` apagada), el front esconde todo igual (`usePublicacionDisponible`). Contrato: `backend-social-engine/project-docs/CONTRATO-API.md`, sección «Publicar y programar». Capas: `domain/publicacion.ts` (reglas y estados), `api/publicacion.ts` (consultas y mutaciones), `mocks/programadas.ts` (el backend en memoria, con los mismos estados, reglas y mensajes). Al crear, el `id` es un uuid v4 por envío del formulario: un reintento repite el mismo `id` y nunca publica dos veces. Los 409 se distinguen con `tipoDeConflicto` (`api/errores.ts`).
- **Alta nueva (registro abierto)** (`plans/registro-abierto.md`, fases 1 y 4 del front): después del login, `src/app/Entrada.tsx` (dentro de `Acceso`, rodea al router en `main.tsx`) pide `GET /api/yo` antes de montar el calendario: sin comercio → bienvenida (solo el nombre, `POST /api/comercio`); `en_preparacion` → «Estamos preparando tu cuenta, te avisamos por mail» (con «Revisar de nuevo»); `sin_redes` → «Conectá tus redes»; `activo` → el calendario de siempre. El 403 «Tu usuario todavía no tiene un comercio asignado» ya no es lo primero que ve un usuario nuevo. Capas: `api/registro.ts` (consultas y mutaciones), `features/registro/` (`Bienvenida`, `EnPreparacion`, `ConectarRedes`, `PantallaEntrada`, `retorno.ts`), `mocks/registro.ts` + `mocks/handlers/registro.ts` (el backend en memoria con los mismos estados, códigos y mensajes). Endpoints: `GET /api/yo`, `POST /api/comercio`, `GET /api/conexion/redes`, `POST /api/conexion/redes/{plataforma}` (`{ authUrl }`; el front redirige ahí con `lib/navegar.ts`), `POST /api/conexion/redes/sincronizar`.
  - **Conectar y reconectar redes:** el mismo `ConectarRedes` (una red en `hay_que_reconectar` ofrece «Reconectar»). Como el contrato no deja pasarle datos a Zernio, antes de salir se anota en `sessionStorage` que hay una conexión en curso; al volver, `Entrada` lo detecta (o un `error` en la URL), llama a `sincronizar`, muestra el resultado (también si el usuario canceló) y deja seguir al calendario. Qué parámetros agrega Zernio a la vuelta **no está verificado** (solo se reconoce `error`).
  - **Punto de extensión (cuestionario):** `src/app/pasosDeEntrada.ts`. Un paso es un componente envoltorio `({ comercio, children })` que muestra su pantalla mientras falte algo y devuelve `children` cuando no; se suma a `PASOS_DE_ENTRADA`. Orden: bienvenida → pasos extra → pantalla según estado → calendario.
  - **Mock de la entrada:** sin `VITE_API_URL`, `VITE_MOCK_ESTADO` (`sin_comercio`, `en_preparacion`, `sin_redes`, `activo`; por defecto `activo`) fija desde dónde arranca. En los tests: `fijarRegistro(...)`, `cargarCuentaDeZernio()`, `marcarParaReconectar(...)` de `mocks/registro.ts`.
  - **Correr los tests con un `.env.local` que apunta al backend:** `VITE_API_URL` y `VITE_PUBLICACION_HABILITADA` del `.env.local` sacan a los tests del modo mock. Correr con `VITE_API_URL= VITE_PUBLICACION_HABILITADA= npm test`.
- **Cuestionario y perfil de marca** (`plans/cuestionario-contexto.md`, fases 3 a 5; contrato en `CONTRATO-API.md` del backend): `GET/PUT /api/contexto` y `GET/PUT /api/perfil-marca` + `POST /api/perfil-marca/generar`. Capas: `domain/contexto.ts` y `domain/perfilMarca.ts` (tipos, orden de preguntas, esquema Zod armado **desde el catálogo**: el front no hardcodea preguntas), `api/contexto.ts` (consultas y mutaciones; claves `['contexto']` y `['perfil-marca']`), `mocks/contexto.ts` + `mocks/handlers/contexto.ts` (backend en memoria con las 9 preguntas, las mismas validaciones y el límite de 3 generaciones por día; `configurarPerfilMock` arma escenarios). Se reinicia en cada test (`reiniciarContexto`).
  - Entradas para enganchar (el cuestionario ya está enganchado a la entrada, ver abajo; `<PerfilMarca />` se ofrece desde «Perfil de marca»): `<Cuestionario onTerminar={(estado) => …} />` (una pregunta por pantalla; **todas obligatorias**, el front ignora `obligatoria` del catálogo y no hay «Saltear»; mientras guarda muestra `PantallaGuardando` con la ruedita `components/ui/Ruedita.tsx`), `<PerfilMarca />` (la sección «Esto es lo que vimos en tus publicaciones», para ofrecerla cuando haya redes) y `<PerfilNegocio />`, la ruta `/perfil` («Perfil de marca»: respuestas editables + perfil), con acceso desde el menú del usuario (`UserButton.Action` en `Layout.tsx`).
  - Un 422 de `PUT /api/contexto` trae `problemas: { [id]: mensaje }`: `ApiError.problemasPorCampo` lo conserva y cada mensaje se muestra en su pregunta.
  - **Borrador:** el cuestionario guarda lo escrito y el paso en `sessionStorage` (`contexto:borrador`, con try/catch, descartado si cambia `version`), no en un PUT parcial: recargar no pierde nada y el servidor no recibe respuestas a medias. Se borra al guardar; `borrarBorrador()` (`features/contexto/borrador.ts`) conviene llamarlo al cerrar sesión.
  - **En la entrada (Fase 5):** `/api/yo` trae `comercio.contexto` (`pendiente | completo | salteado`). `features/contexto/PasoCuestionario.tsx` es el único paso de `PASOS_DE_ENTRADA`: si está `pendiente` muestra el cuestionario (después de la bienvenida, antes de «en preparación»), al terminar invalida `['yo']` y mantiene la pantalla de carga hasta que llega el estado nuevo, y recién ahí deja seguir. `Acceso` llama a `borrarBorrador()` al cerrar sesión. El mock de `/api/yo` toma `contexto` del mock del cuestionario (arranca `pendiente`) y, como el backend, cuenta como `activo` a un comercio con cualquier red (aunque pida reconectar).
  - «Otro» (`permiteOtro`): la respuesta es el texto escrito (un string que no está en `opciones`). Solo lo interpretado del perfil (`temas`, `tono`, `estiloVisual`, `publico`) se edita; lo calculado son cifras del backend.
  - Perfil generándose: `refetchInterval` de TanStack Query cada 3 s solo mientras `estado === 'generando'` (se corta al terminar, al desmontar o con la pestaña oculta).
- Errores de la API: 401 ("tu sesión venció") y 403 ("tu usuario todavía no tiene un comercio asignado") no se reintentan ni ofrecen "Reintentar". `analisis` llega vacío hasta S3 y `ideas` vacías hasta S4; la UI lo tolera.
- Contrato de chat (SSE): `POST /api/chat` con `{ mensajes: [{rol, texto}], itemId? }`; responde `text/event-stream` con `data: {"delta":"..."}` y `data: [DONE]`; errores a mitad de stream con `event: error`.

## Convenciones

- Idioma de UI y commits: español (voseo en la UI). Lenguaje neutro: quien usa la app puede ser un CM, un comercio o un emprendimiento, así que los textos visibles no dicen «comercio» ni «negocio».
- Identidad visual: la de https://engine.nlabs.com.ar/ (tokens en `src/index.css`, oscuro por defecto, claro con `data-theme="light"` o `prefers-color-scheme`). Usar clases Tailwind con esos tokens (`bg-surface`, `text-muted`, `bg-accent`...), no colores sueltos.
- Fechas en UTC en datos, hora de Buenos Aires en pantalla.
- El front solo habla con la API propia, nunca con Zernio ni el modelo. **Única excepción:** al subir un archivo para publicar, el navegador hace un `PUT` a la `uploadUrl` firmada que devuelve `POST /api/medios` (sin token ni key de Zernio, que nunca salen del servidor). Decidido el 17/11 para el MVP; la decisión de largo plazo está en Notion («Decidir cómo se suben los archivos a largo plazo»).
- Ramas: prefijo convencional (`feature/...`, `fix/...`, `docs/...`); rama principal `main`. Un PR por fase del plan.
- Si falla un test, arreglar la implementación, no el test (salvo que esté mal).

## Zonas delicadas

- Deploy en Vercel desde `main`: antes servía `index.html` estático; ahora debe servir el build de Vite (`dist`). Verificar el deploy de preview antes de mergear la fase 1.
- No mergear ni desplegar sin confirmación del usuario.
