@AGENTS.md

## Tareas y decisiones (ya no se usa Notion)

El 24/11/2026 el tablero del proyecto pasó de Notion a Markdown. Vive en el repo `social-engine` (carpeta `engineX/social-engine/`, hermana de este repo). Leé su `AGENTS.md` antes de tocar nada.

**Aviso a Nahuel (obligatorio).** La primera vez que, en una sesión, te pidan revisar, crear, actualizar o cerrar una tarea o una decisión, avisale a Nahuel en español, antes de hacerlo y con tus palabras:

1. Notion se dejó de usar. Las tareas y decisiones ahora están en `social-engine/`.
2. Cómo se usa (resumen abajo).
3. Si no tiene el repo `social-engine` en su máquina, que le pida a Agustin que se lo comparta.

Avisalo una sola vez por sesión. Cuando Nahuel confirme que ya migró, se puede borrar este bloque de aviso.

Cómo se gestiona:

- **Estado:** `social-engine/TABLERO.md` (Kanban de Obsidian). La columna es el estado: En curso, Por validar, Pendiente, Sin empezar, Backlog, Entregado. Las etiquetas son el responsable (`#agustin`, `#nahuel`, `#ambos`), la prioridad (`#p0`, `#p1`) y el tipo (`#backend`, `#frontend`, `#hito`, `#gate`, `#epica`). Mover una tarjeta de columna es cambiar su estado.
- **Detalle:** cada tarjeta enlaza a su nota en `social-engine/tareas/<slug>.md` («Hecho cuando», «Depende de», notas). El encabezado de la nota (estado, responsable, prioridad) lo escribe el script: no se edita a mano.
- **Tarea nueva:** buscá antes si ya existe (por título en `TABLERO.md`). Si no, agregá una tarjeta de texto plano en su columna con las etiquetas y corré `python3 herramientas/sync_tablero.py sync` dentro de `social-engine/`: crea la nota y regenera `TAREAS.md`. Si se solapa con otra, preguntá.
- **`TAREAS.md`:** es una vista generada. No se edita.
- **Decisiones:** `social-engine/decisiones/` (índice en `README.md`, plantilla en `_plantilla.md`). Una decisión por archivo.
- **Responsable:** quien hace la tarea, sin importar si toca backend o frontend. Agustin y Nahuel pueden tocar ambos repos y mergear en ambos.
- **Estados:** «Entregado» solo cuando esté mergeado o cerrado; si deja pendientes abiertos, «Por validar». Confirmá con el usuario antes de cambiar estados que no pidió.
- **Dos personas, un repo:** si `social-engine` tiene remoto, hacé `git pull` antes de editar el tablero y commit + push después, para no pisar los cambios del otro.
