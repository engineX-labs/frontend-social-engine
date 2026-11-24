# Plan: cuestionario obligatorio y pantalla de carga al terminar

**Estado:** borrador para revisar. No se escribe código hasta que diga "aprobado".
**Repo:** `frontend-cuestionario` (solo front). Rama nueva `feature/cuestionario-obligatorio` desde la actual.
**Continúa:** `plans/cuestionario-contexto.md` (Fase 5, cuestionario en la entrada).

## Objetivo

Dos ajustes al cuestionario de la entrada (`features/contexto/Cuestionario.tsx`), el resto queda igual:

1. **No se puede omitir.** Las respuestas son información útil: hay que contestar todas.
2. **Al terminar, se ve un indicador de carga** (la ruedita) en vez de quedar la pantalla estática.

## Qué pasa hoy

- Cada pregunta no obligatoria tiene «Saltear», y desde la pregunta que sigue a las obligatorias aparece «Saltear el resto» (manda `saltear: true`).
- La obligatoriedad viene del backend (`pregunta.obligatoria`); hoy solo rubro y objetivo lo son.
- Al apretar «Terminar» solo cambia el texto del botón a «Guardando…». Cuando guarda, `PasoCuestionario` invalida `['yo']` y muestra `children` mientras llega la respuesta nueva: no hay nada que indique que algo está pasando.

## Propuesta

### 1. Obligatorio en el front (sin tocar el backend)

- En `Cuestionario.tsx`: quitar los botones «Saltear» y «Saltear el resto», `saltearEsta()` y el envío con `saltear: true`. Queda Atrás / Siguiente / Terminar.
- Tratar **todas** las preguntas como obligatorias dentro del cuestionario: el esquema de validación (`esquemaDeRespuestas`, en `domain/contexto.ts`) recibe una opción `todasObligatorias` que el cuestionario activa. Una pregunta vacía muestra el error de siempre y no deja avanzar.
- Textos: la etiqueta «Opcional» de `CampoPregunta` no se muestra en el cuestionario; el encabezado «· hace falta para empezar» deja de tener sentido y se saca. El orden (obligatorias primero) se mantiene.
- Para «Otro» (`permiteOtro`) hay que escribir el texto; para opción múltiple, elegir al menos una.

**Por qué solo front:** el catálogo sigue mandando `obligatoria` como antes y el backend sigue aceptando `saltear`, así que no hay migración ni cambio de contrato. Si más adelante se prefiere que lo decida el backend (marcar todas como `obligatoria: true`), el front ya lo respetaría sin más cambios.

### 2. Pantalla de carga al terminar

- Componente nuevo `components/ui/Ruedita.tsx` (spinner accesible: `role="status"`, `aria-label`, respeta `prefers-reduced-motion`) con una animación `girar` en `index.css`, con los tokens de engineX.
- En `Cuestionario.tsx`, mientras `guardar.isPending`: el formulario se reemplaza por la marca + la ruedita + «Guardando tus respuestas…» (los botones quedan deshabilitados como hoy).
- En `PasoCuestionario.tsx`: tras guardar, se mantiene esa misma pantalla hasta que `['yo']` se vuelve a pedir y llega (`await invalidateQueries`), y recién ahí deja seguir. Así no hay salto a una pantalla vacía o intermedia.
- Si el guardado falla (422 u otro error) vuelve el formulario con el error, como hoy.

### 3. Lenguaje neutro en los textos

Quien usa la app puede ser un CM, un comercio o un emprendimiento: ningún texto de la UI debe hablarle a «comercios» ni a «negocios». Los textos nuevos (pantalla de carga, errores) salen neutros, y se revisan los que ya existen en el cuestionario y su entrada:

| Dónde | Hoy | Propuesta |
|---|---|---|
| `mocks/contexto.ts` (pregunta de rubro; el texto real lo define el backend) | «¿Cuál es el rubro de tu negocio?» | «¿Cuál es el rubro?» |
| `features/registro/Bienvenida.tsx` (mensaje de error) | «Escribí el nombre de tu comercio.» | «Escribí el nombre.» |
| `features/registro/Bienvenida.tsx` (etiqueta del campo) | «Nombre del comercio» | neutra (p. ej. «Nombre de la marca o proyecto») |
| `features/contexto/PerfilNegocio.tsx` y menú en `Layout.tsx` | «Perfil del negocio» | «Perfil de marca» |

Los nombres internos (`comercio` en el código y la API) no cambian: es solo texto visible. Si el backend manda preguntas con esa palabra, hay que avisarle para que las ajuste, porque el front las dibuja tal cual.

## Archivos

- `src/features/contexto/Cuestionario.tsx`, `PasoCuestionario.tsx`, `CampoPregunta.tsx` (etiqueta)
- `src/domain/contexto.ts` (opción `todasObligatorias`)
- `src/components/ui/Ruedita.tsx` (nuevo), `src/index.css` (animación)
- Tests: `Cuestionario.test.tsx` (ya no hay «Saltear»; no avanza con una respuesta vacía; muestra la ruedita al guardar y vuelve con error si falla), test de `Ruedita`, `PasoCuestionario` (mantiene la carga hasta que `yo` se actualiza).
- `AGENTS.md`: actualizar la descripción del cuestionario («Saltear» ya no existe).

## Fuera de alcance

- Cambios en el backend ni en el contrato de la API (salvo avisarle de los textos con «negocio»/«comercio» del catálogo).
- La sección «Perfil del negocio» (`/perfil`): ahí se editan respuestas ya guardadas y vaciar una opcional sigue permitido.
- El estado `salteado` del contexto queda en el contrato (comercios que ya saltearon antes); no se borra.

## Preguntas para vos

1. **Comercios que ya salteaban:** los que quedaron en `salteado` hoy no vuelven a ver el cuestionario. ¿Está bien, o querés que se les pida completarlo (eso sí requeriría tocar el backend)?
2. **Perfil del negocio:** ¿dejamos que ahí se pueda vaciar una respuesta opcional, o también las hacemos obligatorias?
3. **Nombres neutros:** ¿te sirve «Perfil de marca» para reemplazar «Perfil del negocio»? (hoy el perfil automático ya se llama «perfil de marca» en el código).
4. **Texto de la pantalla de carga:** propongo «Guardando tus respuestas…». ¿Lo cambiamos?

## Verificación

`npm test`, `npm run lint`, `npm run format:check`, `npm run build`, y recorrer el flujo en el navegador con el mock (`npm run dev`): contestar todo, ver la ruedita al terminar y el paso siguiente.
