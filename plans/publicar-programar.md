# Plan: publicar y programar desde el front

**Estado:** decisiones tomadas el 17/11/2026; falta el "aprobado" para empezar a construir.
**Épica en Notion:** «ÉPICA: Publicar y programar en Instagram y TikTok», S1, P0. Tickets del front: «Frontend · Publicar 0 a 8» (Agustin).
**Rama:** `feature/publicar-programar`, sale de `origin/develop` (`4613209`, ya trae el login con Clerk). Un PR por fase contra `develop`.
**Alcance decidido:** primero solo las cuentas de enginex (@enginex.labs y @social.enginex) para automatizar la subida de reels y carruseles. Los pilotos vienen después.

## Punto de partida (verificado el 17/11)

- **El backend ya está hecho.** Nahuel mergeó `feature/publicar-programar` en `develop` del backend (PR #4, 384 tests). Todo queda detrás de `PUBLICACION_HABILITADA`, apagada por defecto: con la bandera apagada todas las rutas dan 404 y `programadas` del calendario sale `[]`.
- **El contrato existe:** `backend-social-engine/project-docs/CONTRATO-API.md`, sección «Publicar y programar», y los esquemas en `app/api/esquemas_publicacion.py`. Este plan copia esos nombres. Si algo difiere, manda el backend.
- **El Notion está atrasado.** Los tickets «Backend · Publicar 1 a 9» siguen en Backlog, pero el código está en `develop`. La Tarea 0 (probar en vivo contra Zernio) **no se ejecutó**: los formatos de Zernio salen de la documentación y los fixtures son sintéticos.
- **Hay que arreglar cosas en el backend antes de prender la bandera** (`PENDIENTES-PUBLICACION.md`):
  - un defecto en el job diario: con 2 o más piezas pendientes concilia solo una por día;
  - la verificación en vivo;
  - varios menores, entre ellos el largo máximo del texto y que «reintentar» sobre «No se publicó» contradice el contrato.

  Nada de eso bloquea el front: se trabaja contra el mock.
- **Front:** `Red = 'instagram'` y no existe el tipo `Programada`. Sonner ya está instalado (sirve para los avisos). React Hook Form y Zod todavía no están instalados.
- **Login:** el front y el backend ya pasaron a Clerk. El contrato y la página «Stack social engine» todavía dicen Supabase (no afecta a este plan).

## Contrato que consume el front (resumen)

| Ruta | Uso en el front |
| --- | --- |
| `GET /api/redes` → `[{id, red, username, salud}]` | Selector de red. No dice si la red tiene permiso de publicar: eso aparece como 409 «reconectar» al publicar. |
| `GET /api/redes/{id}/opciones-tiktok?tipo=video\|fotos` → `{privacidades, duracionMaximaSegundos, puedePublicarMas, comentariosDeshabilitados, duetDeshabilitado, stitchDeshabilitado}` | Formulario de TikTok. La forma no se verificó en vivo. |
| `POST /api/medios` `{nombre, contentType, tamanio}` → `{uploadUrl, publicUrl}` | Subida: `PUT` del archivo a `uploadUrl` y se guarda `publicUrl` en `medios[].url`. Tipos: jpeg, png, webp, mp4 y mov; hasta 5 GB. |
| `POST /api/programadas` `{id, redId, accion, tipo, texto?, medios, programadaPara?, opciones?}` | `accion`: `borrador`, `programar` o `publicar_ahora`. `id` = uuid v4 **por envío del formulario**: un doble clic o un reintento repite el mismo `id` y nunca publica dos veces. 201 nueva, 200 ya existía. |
| `GET /api/programadas?mes=` / `GET /api/programadas` (sin mes) | Con `mes`, las piezas del mes. Sin `mes`, los borradores sin fecha. |
| `GET/PATCH/DELETE /api/programadas/{id}` | En `PATCH`, `accion` puede ser `guardar` (por defecto), `programar` o `publicar_ahora`. **Reprogramar = `guardar` con otra `programadaPara`** (`programar` sobre una programada da 409). `DELETE` cancela una programada o borra un borrador. |
| `POST /api/programadas/{id}/reintentar` | Solo para una `fallida`. |
| `GET /api/calendario` + campo `programadas` | Borradores con fecha, programadas, publicando, fallidas y publicadas que no salen en `publicadas` (Stories, TikTok o sin alcance todavía). No cuentan en `resumen`. |

**`Programada`:** `{tipo: 'programada', id, red: 'instagram'|'tiktok', redId, estado, formato, texto, medios: [{url, tipo: 'imagen'|'video'}], fecha|null, error, urlPublicada, itemId}`.
- `estado`: `borrador`, `programada`, `publicando`, `publicada`, `fallida` o `cancelada`.
- `formato`: `foto`, `carrusel`, `reel`, `historia`, `video` o `fotos`. Va en minúscula y no es el mismo `Formato` de `Publicada` (`'Reel' | 'Carrusel' | 'Foto'`).

**Opciones de TikTok** (camelCase): `privacyLevel`, `allowComment`, `allowDuet`, `allowStitch`, `contentPreviewConfirmed`, `expressConsentGiven`, más `commercialContentType` y `videoCoverTimestampMs` opcionales.

**Errores:**

| Código | Situación | Qué hace el front |
| --- | --- | --- |
| 422 | `{detalle: 'Pedido inválido', problemas: [...]}` | Muestra cada problema en el formulario. |
| 409 «reconectar» | Falta un permiso o venció la conexión | Avisa que hay que reconectar la red. |
| 409 «Se está procesando…» | Otro pedido tiene la pieza | Reintenta solo una vez y si no, muestra el mensaje. |
| 409 «Id en uso» | El `id` lo usa otro comercio | Genera otro `id` y repite el envío. |
| 409 | El estado no admite la acción | Muestra el mensaje. |
| 503 | Zernio no disponible o sin saldo | Mensaje genérico, sin detalle. |

**Estados especiales:**
- `fallida` con `error: 'estado_desconocido'` es **«Confirmando…»**: sin botones de reintentar ni cancelar, se resuelve sola.
- `fallida` con `error: 'No se publicó'` es **final**: se ofrece «Crear de nuevo», que copia la pieza con un `id` nuevo.

## Decisiones (tomadas el 17/11)

1. **Dónde se publica:** botón «Nueva publicación» en la barra del calendario, más «Programar acá» al tocar un día vacío. El compositor abre en el mismo panel lateral que el detalle (`?nueva=1` o `?item=`), así es usable en el celular.
2. **TikTok entra completo en el MVP:** el front lo implementa (video y fotos) y entra en las pruebas de punta a punta. Un video de TikTok queda **público** al publicarse, así que en la Fase 8 se publica con una pieza pensada para publicarse de verdad en @enginex.labs. Hasta que Nahuel haga la Tarea 0, la Fase 2 depende de la forma no verificada de `creator-info`.
3. **Formato en `publicadas`: opción A.** `Publicada` trae `red` y dos formatos nuevos, «Video» (TikTok) e «Historia» (Instagram), y el resumen no los mezcla con Reels. Lo hace Nahuel en «Backend · Formato correcto en el calendario». La causa probable es `formato_de` en `app/api/calendario.py`: todo video sin `media_product_type == "STORY"` cae en «Reel». En el front, `Formato` pasa a `'Reel' | 'Carrusel' | 'Foto' | 'Video' | 'Historia'` y `Red` suma `'tiktok'` en la Fase 1. El mock ya los usa, aunque el backend todavía no.
4. **Subida directa a Zernio, por ahora:** se acepta la excepción a «el front solo habla con la API propia» solo para el `PUT` del archivo, y queda escrita en `AGENTS.md` en la Fase 1. La decisión de largo plazo (almacenamiento propio, proxy o subida reanudable) es otro ticket para Ambos: «Decidir cómo se suben los archivos a largo plazo». **Riesgo nuevo:** no se verificó que el almacenamiento de Zernio acepte `PUT` desde nuestro dominio (CORS). Si no lo acepta, la subida no funciona; se prueba apenas haya una key de prueba (Fase 3).
5. **Bandera del front:** `VITE_PUBLICACION_HABILITADA=true` muestra los botones de publicar. Si la API responde 404 en `/api/redes`, el front esconde todo igual, por si la bandera del backend está apagada.

## Fases (= tickets de Notion)

### Fase 0 · Acordar el contrato con Nahuel (Frontend · Publicar 0, Ambos)
Antes de escribir código:
- Contarle a Nahuel las decisiones 2, 3 y 4 y repasar la sección 4 de `PENDIENTES-PUBLICACION.md`.
- Pedirle que en la Tarea 0 verifique el CORS del `PUT` a la URL firmada desde `http://localhost:5173` y desde el dominio de Vercel.
- Confirmar el largo máximo del texto (2.200) y el mensaje exacto del 409 «reconectar», para distinguirlo de los otros 409. Hoy los tres 409 solo se distinguen por el texto de `detalle`, así que propongo pedir un campo `codigo` (`reconectar`, `procesando`, `id_en_uso`, `estado`).
- Pedirle que cierre los pendientes de antes de prender la bandera en su lado.

**Cierra cuando:** las decisiones quedan escritas en el ticket y Nahuel confirma que el contrato no cambia, o anota los cambios.

### Fase 1 · Tipos, cliente y mock (Frontend · Publicar 1)
- `src/domain/types.ts`:
  - `Red = 'instagram' | 'tiktok'`;
  - `Programada`, `EstadoProgramada`, `TipoPieza`, `Medio`, `OpcionesTikTok`, `RedConectada`;
  - `CalendarioMes.programadas: Programada[]`, que es opcional al leer: si no llega, se toma `[]`.
- `src/api/http.ts`: `apiFetch` pasa a admitir un cuerpo JSON y respuestas sin cuerpo (204), y conserva `problemas` en `ApiError`.
- `src/api/publicacion.ts`: queries (`redes`, `opcionesTiktok`, `programadas(mes)`, `borradoresSinFecha`, `programada(id)`) y mutaciones (`crear`, `editar`, `borrar`, `reintentar`, `pedirSubida`). Las mutaciones invalidan `['calendario', mes]` y `['programadas', …]`.
- `src/mocks/handlers/publicacion.ts`: las 9 rutas con datos en memoria y las mismas reglas del backend. Devuelven 422 con `problemas`, el 409 de cada caso, el 404 con la bandera apagada, el 200 idempotente con el mismo `id` y una pieza en «Confirmando…».
- Bandera: `src/app/publicacion.ts` con `PUBLICACION_HABILITADA`.
- Tests:
  - el `id` se repite en un reintento;
  - el mapeo de errores;
  - el mock con cada regla;
  - el calendario sin el campo `programadas`.

**Cierra cuando:** pasan test, lint, format y build, y con la bandera apagada la app se ve igual que hoy.

### Fase 2 · Redes y opciones de TikTok (Frontend · Publicar 2) · CU1
- Selector de red con avatar y `username`. Una red con `salud` distinta de sana muestra un aviso y deja intentar igual: el 409 es la fuente de verdad.
- Con TikTok, pide `opciones-tiktok?tipo=` según el tipo elegido y arma:
  - las privacidades permitidas (sin valor por defecto: TikTok exige que lo elija el usuario);
  - comentarios, duet y stitch, deshabilitados si la cuenta los tiene apagados;
  - las dos casillas de consentimiento obligatorias;
  - el aviso si `puedePublicarMas` es falso.

**Cierra cuando:** funciona contra el mock y queda revisado en escritorio y a 390 px.

### Fase 3 · Subir imagen o video (Frontend · Publicar 3) · CU2
- Valida el tipo (jpeg, png, webp, mp4, mov) y el tamaño (5 GB) antes de pedir la subida.
- `POST /api/medios`, luego `PUT` a `uploadUrl` con `XMLHttpRequest` para tener la barra de progreso, con opciones de cancelar y reintentar.
- Vista previa local, quitar y ordenar los archivos del carrusel (con botones subir y bajar, que funcionan con teclado y en el celular; el arrastre queda opcional).
- El `PUT` va a Zernio, nunca a nuestra API, y no lleva el token.

**Cierra cuando:** en el mock se suben, se ordenan y se quitan archivos, y un `PUT` fallido se puede reintentar.

### Fase 4 · Compositor (Frontend · Publicar 4) · CU3, CU4, CU5
- Se instalan React Hook Form y Zod (ya están en el stack).
- Tipos por red:
  - Instagram: foto, carrusel, reel o historia;
  - TikTok: video o fotos.
- Reglas que se avisan en el front (las que mandan son las del backend):

| Regla | Límite |
| --- | --- |
| Historia | Sin texto |
| Carrusel | De 2 a 20 medios |
| Reel | 1 video |
| Fotos de TikTok | De 1 a 35 |
| Texto | Hasta 2.200 caracteres |
| Fecha | Entre 5 minutos y 180 días |

- Los 422 se muestran como lista arriba del formulario y, cuando el texto permite ubicarlo, en el campo.
- Fecha y hora en Buenos Aires con `src/lib/fecha.ts`, enviada en UTC.
- Tres botones: «Guardar borrador», «Programar» y «Publicar ahora». Publicar ahora pide confirmación, porque es irreversible.
- `id` = `crypto.randomUUID()` al abrir el envío. Se conserva si el pedido falla por red o 5xx y se renueva solo con «Id en uso» o al empezar una pieza nueva.

**Cierra cuando:**
- las tres acciones funcionan contra el mock;
- un doble clic crea una sola pieza;
- queda revisado en escritorio y a 390 px, en claro y oscuro.

### Fase 5 · Calendario con programadas (Frontend · Publicar 5) · CU6
- La grilla y la agenda muestran `programadas` con un chip de estado (borrador, programada, publicando, confirmando, fallida o publicada) y el ícono de la red (falta `IconoTiktok`).
- Las programadas se distinguen visualmente de las publicadas y de las ideas, y se suma un filtro `ocultar=programada`.
- Los borradores sin fecha van en una lista aparte («Sin fecha»).
- El resumen del mes no cambia.
- Se saca la regla «sin estado Programada» de la Fase 4 original. El drag & drop sigue fuera.

**Cierra cuando:** queda revisado en escritorio y a 390 px, en claro y oscuro, con un mes que mezcla los tres tipos.

### Fase 6 · Detalle y acciones (Frontend · Publicar 6) · CU7 a CU10 y CU12
- `DetallePanel` abre una `Programada` con `?item=`. Para distinguirla de una publicada se usa `tipo` o se busca primero en `programadas`.
- Acciones según el estado:

| Estado | Acciones |
| --- | --- |
| Borrador | Editar, programar, publicar ahora, borrar |
| Programada | Editar, reprogramar, cancelar |
| Publicando o «Confirmando…» | Solo lectura |
| Fallida | Reintentar, con el motivo visible |
| «No se publicó» | Crear de nuevo |
| Publicada | Ver en la red (`urlPublicada`) y las métricas si tiene `itemId` |

- Los 409 de «se está procesando» o de cambio de estado vuelven a leer la pieza y conservan lo que el usuario escribió.

**Cierra cuando:** cada transición funciona contra el mock y queda revisado en escritorio y a 390 px.

### Fase 7 · Estado y avisos (Frontend · Publicar 7) · CU11, CU13
- Sin webhook hacia el navegador: TanStack Query vuelve a pedir cada 30 s **solo** mientras haya piezas `publicando`, en «Confirmando…» o programadas en los próximos 10 minutos, y también al volver a la pestaña.
- Avisos con Sonner al detectar un cambio a `publicada` o `fallida`. Se recuerdan en `sessionStorage` para no repetirlos al recargar.
- Una publicada con `itemId` enlaza al detalle de la publicación, con sus métricas.

**Cierra cuando:** en el mock una pieza pasa de programada a publicada y a fallida, y el aviso sale una sola vez.

### Fase 8 · Punta a punta (Frontend · Publicar 8)
- Depende de que Nahuel haga la Tarea 0, cierre los pendientes de antes de la bandera y escriba `PROBAR-PUBLICACION.md` (ya existe en `develop`).
- Backend local con `PUBLICACION_HABILITADA=true` y la cuenta de prueba. **Solo @enginex.labs y @social.enginex.**
- Se prueba:
  - una imagen programada, reprogramada y cancelada (y que no aparezca en el panel de Zernio);
  - un carrusel y un reel programados;
  - una historia publicada que pasa a publicada con su URL;
  - en TikTok, un video y un carrusel de fotos con las opciones de privacidad y consentimiento (quedan públicos: piezas reales de enginex, no de prueba).
- Probado en iOS y Android reales.
- Queda el primer uso real: subir un reel y un carrusel de enginex con la app.

**Cierra cuando:** todo eso pasa y las diferencias con el contrato quedan avisadas a Nahuel.

## Riesgos

- **Contrato sin verificar en vivo:** `creator-info` y algunos nombres de Zernio pueden cambiar con la Tarea 0. Afecta sobre todo a la Fase 2.
- **Subida de archivos grandes desde el celular:** un reel de 200 MB por datos móviles. Barra de progreso y cancelar; sin subida por partes en esta épica.
- **CORS del almacenamiento de Zernio:** si no acepta el `PUT` desde nuestro dominio, la subida directa no funciona y hay que adelantar la decisión de largo plazo (proxy o almacenamiento propio).
- **TikTok publica en público:** cada prueba real queda visible. Se publica solo contenido real de enginex.
- **Bandera del backend apagada en producción:** el front tiene que verse igual que hoy. Se cubre con un test.

## Verificación de cada fase

`npm test`, `npm run lint`, `npm run format:check` y `npm run build`, más la revisión en el navegador a 390 px y en escritorio, en claro y oscuro. Ninguna fase se da por lista sin eso.
