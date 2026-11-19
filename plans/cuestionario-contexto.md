# Plan: cuestionario de contexto y perfil de marca automático

**Estado:** borrador para revisar. No se escribe código hasta que diga "aprobado".
**Ticket de Notion:** "Cuestionario de contexto en el primer inicio de sesión" (P1, Backlog).
**Repos:** front (`frontend-social-engine`) y backend (`backend-social-engine`). Rama `feature/cuestionario-contexto` en los dos, desde `develop`.
**Se construye en paralelo con:** `plans/registro-abierto.md`. Los dos se tocan en un solo punto, la pantalla que decide qué ve el usuario al entrar (Fase 5).

## Objetivo

Que Fidel y los informes conozcan el negocio desde el primer día sin preguntarle al usuario lo que ya se puede leer de sus redes:

1. **Cuestionario corto:** lo que solo sabe el dueño (objetivo, qué vende, a quién le habla, qué puede producir, tono).
2. **Perfil de marca automático:** con las publicaciones ya sincronizadas, el sistema arma un borrador (formatos, frecuencia, horarios, temas, tono, estilo visual) que el usuario confirma o corrige.

**Cierra cuando:**
- Un comercio nuevo completa (o saltea) el cuestionario y sus respuestas quedan guardadas por comercio.
- Con redes conectadas y al menos 6 publicaciones, se genera el perfil de marca y el usuario lo confirma o lo edita.
- Las dos cosas se pueden editar después desde "Perfil del negocio".
- Una función del backend, `contexto_del_comercio(comercio_id)`, devuelve todo eso listo para el modelo. La van a usar el chat (S4) y el informe (S3), que todavía no existen.
- Pasan los tests, el lint y el build de los dos repos.

> El criterio del ticket ("el agente las usa en sus conversaciones") no se puede cumplir entero todavía: el chat con el modelo es de la S4 y hoy el front usa un mock. Este plan deja el contexto listo y probado para que el chat solo tenga que leerlo.

## Decisiones tomadas (18/11)

- Plan separado del de registro.
- Las preguntas son un borrador: se validan después con 2 o 3 comercios. Por eso **se definen en un solo lugar (el backend)** y cambiarlas no exige migraciones ni tocar el front.
- El perfil automático entra ahora.

## Las preguntas (borrador, a validar con comercios)

| # | Pregunta | Tipo | Obligatoria | Para qué |
|---|---|---|---|---|
| 1 | Rubro | opción (lista) + "otro" | sí | Comparaciones y la taxonomía de la S2 |
| 2 | Objetivo principal | opción: que vengan al local · pedidos o reservas por WhatsApp · vender online · ganar seguidores · que conozcan la marca | sí | Define qué métrica cuenta como éxito en el informe |
| 3 | Qué vendés y tu producto o servicio estrella | texto corto (200) | no | Ideas concretas |
| 4 | Zona o ciudad | texto corto | no | Horarios, fechas y comparaciones locales |
| 5 | A quién le hablás | texto corto (200) | no | Tono y temas |
| 6 | Quién publica | opción: yo · alguien del equipo · una agencia o CM | no | Ideas realizables |
| 7 | Qué podés producir | varias opciones: fotos de producto · videos con alguien hablando a cámara · videos del proceso · carruseles con texto · nada de video | no | No recomendar formatos imposibles |
| 8 | Tono | opción: cercano · profesional · divertido · otro | no | Fidel y los textos |
| 9 | Temas o palabras a evitar | texto corto (200) | no | Límites para el modelo |

Rubro y objetivo son obligatorios porque el código los usa para calcular. El resto se puede saltear y completar después.

## Cómo se guarda (backend)

**Migración `0009`** (registro no lleva migración, así que no chocan). Tres tablas, todas con `comercio_id`:

- **`contextos_comercio`** (una fila por comercio): `comercio_id` (PK), `rubro`, `objetivo` (columnas propias porque el código filtra y calcula con ellas), `respuestas` (jsonb con el resto), `version_cuestionario`, `estado` (`pendiente`, `completo`, `salteado`), `actualizado_en`.
- **`perfiles_marca`** (historial, el vigente es el último): `id`, `comercio_id`, `estado` (`generando`, `listo`, `error`, `sin_datos`), `datos` (jsonb: lo calculado y lo que escribió el modelo, separado), `confirmado` (jsonb con las correcciones del usuario, o NULL), `confirmado_en`, `publicaciones_usadas`, `modelo`, `error`, `creado_en`.
- **`llm_usos`**: `id`, `comercio_id`, `tarea` (`perfil_marca` por ahora), `modelo`, `tokens_entrada`, `tokens_salida`, `creado_en`. Es el "registro de uso" del stack: sirve para medir el costo por usuario de la S5.

El catálogo de preguntas vive en `app/contexto/preguntas.py` con su número de versión. El backend valida las respuestas contra ese catálogo; el front lo pide y lo dibuja.

## El perfil de marca automático

Sigue la regla del stack: **el código calcula y el modelo solo redacta.**

- **Lo calcula el código** (Python, con tests y sin modelo), sobre las publicaciones de los últimos 90 días: reparto por formato, frecuencia por semana, días y horas habituales, largo de los textos, hashtags más usados y qué formato rindió mejor contra la mediana propia.
- **Lo interpreta el modelo** (Gemini con el SDK de OpenAI, como define el stack), a partir de los textos de las publicaciones y hasta 9 portadas: temas recurrentes, tono, estilo visual y a quién parece hablarle. La respuesta es JSON y se valida con Pydantic. **El modelo no devuelve números:** si escribe una cifra, se descarta ese campo.
- **Cuándo corre:** al terminar el primer sync de un comercio (cuando conecta sus redes o cuando se carga su cuenta) y cuando el usuario toca "Volver a generar". Corre en segundo plano y el front consulta el estado.
- **Pocos datos:** con menos de 6 publicaciones queda `sin_datos` y la app dice que lo va a armar cuando haya más. El cuestionario funciona igual.
- **Portadas que vencen:** las imágenes se descargan al generar. Si una URL ya venció, se saltea esa portada (el ticket "Probar las portadas... y medir si las URLs vencen" sigue abierto).

## Endpoints (contrato nuevo en `CONTRATO-API.md`)

Todos exigen comercio (`comercio_actual`) y no dependen de `PUBLICACION_HABILITADA`.

- `GET /api/contexto` → `{ version, preguntas: [...], respuestas: {...}, estado }`
- `PUT /api/contexto` → guarda respuestas parciales o completas (`estado` = `completo` o `salteado`). Valida contra el catálogo y responde 422 con `problemas` por pregunta.
- `GET /api/perfil-marca` → `{ estado, calculado, interpretado, confirmado, generadoEn }`
- `POST /api/perfil-marca/generar` → 202. Si ya hay uno `generando`, devuelve ese y no lanza otro. Límite: 3 por día por comercio, para cuidar el costo.
- `PUT /api/perfil-marca` → guarda la versión confirmada o corregida por el usuario.

Y `contexto_del_comercio(comercio_id) -> str` en `app/contexto/para_modelo.py`: un texto corto y estable con las respuestas y el perfil (lo confirmado manda sobre el borrador), para el chat y el informe.

## Fases

### Fase 0 · Llave y modelo
- Clave de Gemini en el `.env` del backend (`LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODELO`). La pide Claude con un pedido seguro durante la construcción; nunca va al repo ni a los logs.
- Confirmar en la documentación de Gemini el modelo con imágenes y salida JSON, y su precio. Usar la API paga: en la gratuita Google puede usar los datos para entrenar, y son datos de los comercios.
- **Verificación:** una llamada de prueba con una portada de @social.enginex devuelve JSON válido.

### Fase 1 · Backend: cuestionario
- Migración `0009` con las tres tablas, modelos y funciones en la capa de acceso (`Datos`) con `comercio_id` obligatorio.
- Catálogo `preguntas.py`, `GET` y `PUT /api/contexto`.
- **Tests:** guardar y leer, validación por pregunta, obligatorias, saltear, y el test de acceso cruzado (A no lee ni escribe el contexto de B).

### Fase 2 · Backend: perfil de marca
- `app/llm/cliente.py`: cliente único del modelo (SDK de OpenAI con la URL de Gemini) que registra cada uso en `llm_usos`. El informe de la S3 lo va a reusar: se acuerda con Nahuel antes de mergear.
- `app/contexto/perfil.py`: cálculo propio y llamada al modelo. Se dispara al final de `primer_sync` y desde los endpoints.
- `contexto_del_comercio()`.
- **Tests:** el cálculo con publicaciones de ejemplo, el modelo simulado (JSON válido, JSON roto, números descartados, error de red, `sin_datos`), el límite diario, no lanzar dos a la vez y el acceso cruzado. Ningún test llama al modelo real.

### Fase 3 · Front: cuestionario
- `src/features/contexto/`: el cuestionario por pasos (2 obligatorias primero, el resto salteable), dibujado desde el catálogo que manda el backend. React Hook Form + Zod (se instalan ahora, ya estaban previstos en el stack).
- `api/contexto.ts` y mock MSW con el mismo catálogo y las mismas validaciones.
- **Tests:** completar, saltear, errores 422 por pregunta y recargar sin perder lo escrito.

### Fase 4 · Front: perfil de marca y "Perfil del negocio"
- Pantalla del perfil: "Esto es lo que vimos en tus publicaciones" con lo calculado (cifras) y lo interpretado (texto), cada parte editable, y los botones "Confirmar" y "Volver a generar". Estados generando, listo, error y `sin_datos`.
- "Perfil del negocio", desde el menú del usuario: respuestas y perfil editables.
- **Tests:** cada estado, editar y confirmar, y la consulta del estado mientras se genera.

### Fase 5 · Integración con el registro, prueba y documentación
- Depende de que el registro tenga su pantalla de entrada (`/api/yo` y los estados). Suma a `/api/yo` el campo `contexto` (`pendiente`, `completo`, `salteado`). Si es `pendiente`, se muestra el cuestionario después de la bienvenida. El perfil se ofrece cuando ya hay redes y publicaciones.
- Prueba de punta a punta con el comercio "Prueba 02" (@social.enginex y @enginex.labs): cuestionario, perfil generado con datos reales, confirmar, editar desde el perfil.
- Documentación: `CONTRATO-API.md`, `AGENTS.md` del front y del backend.
- PRs contra `develop` en los dos repos, con evidencia.

## Fuera de alcance
- Que Fidel o el informe usen el contexto: eso entra con el chat (S4) y el informe (S3). Acá queda la función lista.
- Analizar los videos (solo portadas y textos), vectores o embeddings.
- Preguntas de a poco con el tiempo (fechas clave, promociones, cuentas de referencia).
- Comparar contra otros comercios del mismo rubro.

## Riesgos
- **Costo del modelo:** con imágenes cada perfil cuesta más que una llamada de texto. Se mide en `llm_usos`, se limita a 3 por día por comercio y se usan como mucho 9 portadas.
- **Datos de los comercios a un tercero:** textos e imágenes van a Google. Usar la API paga y mencionarlo a los pilotos.
- **El modelo inventa:** solo escribe campos de texto, los números salen del código y todo lo puede corregir el usuario antes de que se use.
- **Preguntas que cambian tras validarlas:** el catálogo versionado lo absorbe. Las respuestas viejas quedan con su versión.
- **Choque con el informe de la S3 (Nahuel):** el cliente del modelo y `llm_usos` son compartidos. Se acuerdan con él antes de mergear la Fase 2.
- **Construcción en paralelo con el registro:** solo comparten `app/main.py` (registrar las rutas) y la pantalla de entrada del front, que se integra en la Fase 5, cuando el registro ya esté mergeado o en su rama.
