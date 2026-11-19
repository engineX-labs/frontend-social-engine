# Plan: pulido de UI/UX del MVP para mostrar a los primeros leads

Estado: aprobado (por el usuario, con `motion`, resumen del mes, etiqueta Demo y `sonner`; un solo PR contra `develop`)

Rama: `feature/pulido-ui` (desde `develop`, que ya tiene las fases 1 a 6).

## Objetivo

Que un lead abra el demo en su celular o en una llamada y en 5 segundos entienda qué hace social engine y sienta que es un producto terminado. Hoy la app funciona, pero se ve como un prototipo correcto: plana, sin jerarquía y casi sin movimiento.

Es un pulido, no un rediseño: se mantienen la identidad de engine.nlabs.com.ar (tokens, tipografías, tono), las funciones y el alcance del MVP (sin programar ni publicar).

## Diagnóstico (auditoría sobre `develop`, escritorio y 390px, modo oscuro)

1. **El valor está escondido.** La primera pantalla es una grilla casi vacía. Lo que vende (qué funcionó, cuánto, a qué hora conviene publicar) recién aparece al abrir una publicación. La API ya entrega esos datos (`resumen`), pero no se muestran.
2. **Jerarquía plana.** Título, navegación, filtros y banner pesan lo mismo. Los chips del calendario son de 11px con miniaturas de 20px: lo más importante de la pantalla es lo más chico.
3. **Lenguaje de prototipo.** Hay bordes punteados naranjas en 8 componentes (banner, chips, filtros, etiquetas, copy). Usado en todos lados, deja de significar "sugerencia de Fidel" y ensucia.
4. **Fidel no tiene presencia.** Es un ícono de chispas y una "F" en un círculo. El agente es el diferencial del producto y no se siente como un personaje.
5. **Casi sin movimiento.** Solo 8 usos de transición en todo el front. El mes cambia de golpe, los datos aparecen de golpe, los números no cuentan, no hay respuesta al tocar.
6. **Estados pobres.** La carga es un spinner con texto; no hay esqueletos. Las celdas fuera del mes quedan vacías y sin número.
7. **Falta contexto de cuenta.** No se ve de qué comercio ni de qué red son los datos, ni que es un demo.
8. **El demo se va a vencer.** Los datos de ejemplo están fijos en noviembre de 2026: en unas semanas el calendario abre en un mes vacío.
9. **Sin metadatos para compartir.** El enlace no tiene descripción ni imagen de vista previa, y el favicon es el de la plantilla de Vite.

## Qué se hace

### Bloque A · Sistema visual (base de todo lo demás)

- **Elevación y superficies:** tres niveles reales (fondo, tarjeta, flotante) con la sombra y el glass que ya define la web. Barra superior y navegación inferior en glass con blur.
- **Regla del punteado:** el borde punteado queda solo para "idea de Fidel sin publicar" en el calendario. Banner, filtros, etiquetas y bloque de copy pasan a superficies sólidas con acento.
- **Escala tipográfica y de espaciado** fijas (hoy hay tamaños sueltos como 11px, 11.5px, 15px, 17px). Números tabulares en todas las métricas.
- **Tokens de motion:** duraciones y curvas compartidas, más un spring para paneles. Todo respeta `prefers-reduced-motion`.
- **Componentes base:** botón (primario, secundario, fantasma, ícono) con hover, foco, presionado y deshabilitado; tarjeta; esqueleto; avatar de Fidel.
- **Identidad de Fidel:** avatar con el gradiente de marca (naranja, magenta, violeta) y un estado "pensando". El gradiente se usa solo para Fidel: así se reconoce al instante qué viene del agente.

### Bloque B · Calendario (la pantalla que ve el lead)

- **Resumen del mes arriba de la grilla:** tres o cuatro cifras (publicaciones, mediana de alcance, mejor publicación, mejor horario) con conteo animado. Usa datos que la API ya devuelve.
- **Tarjeta de Fidel** en lugar del banner punteado: avatar, una frase con la recomendación y dos acciones. En móvil sube arriba de la agenda (hoy queda al final).
- **Celdas con más contenido:** miniatura más grande, hora y formato legibles, e indicador de rendimiento en las publicadas (sobre, en o bajo tu mediana) para que el calendario se lea como un mapa de qué funcionó.
- **Ideas con portada propia:** un marcador con el gradiente de Fidel en vez del hueco vacío.
- **Días fuera del mes** con número atenuado; **hoy** y **día seleccionado** bien diferenciados; hover en celda.
- **Cambio de mes animado** (desliza según la dirección) y aparición escalonada de los chips.
- **Esqueleto de grilla** al cargar, en vez del spinner.
- **Móvil:** franja semanal más compacta, puntos con más contraste, tarjetas de agenda más grandes y deslizar a los lados para cambiar de mes.
- **Chip de cuenta** en la barra superior (comercio y red) con etiqueta "Demo" mientras se usen datos de ejemplo.

### Bloque C · Panel de detalle

- **Entrada con spring** y, en móvil, **arrastrar hacia abajo para cerrar** con manija visible.
- **Portada protagonista:** más grande, con la miniatura del calendario creciendo hacia el panel cuando el navegador lo permite (View Transitions) y fundido como alternativa.
- **Resultado como titular:** la cifra principal grande con el indicador contra la mediana; las barras de comparación se llenan al abrir.
- **Análisis de Fidel** con su avatar y tratamiento propio, separado visualmente de los datos.
- **Idea:** el copy propuesto como tarjeta de cita; "Otra propuesta" hace un cruce suave entre textos; "Copiar" confirma con un cambio de ícono y un aviso breve.

### Bloque D · Chat con Fidel

- **Bienvenida con presencia:** avatar animado, saludo y sugerencias como tarjetas con ícono (no solo píldoras de texto).
- **Mensajes:** burbuja del usuario con acento; respuestas de Fidel sin burbuja, con avatar, para que se lean como texto y no como chat genérico. Entrada suave de cada mensaje.
- **Streaming:** cursor mientras escribe y estado "pensando" antes del primer texto.
- **Tarjetas de publicación en las respuestas:** cuando Fidel cita una publicación, se muestra como tarjeta con miniatura y cifra (hoy es un enlace de texto).
- **Composer:** elevado en glass, botón de enviar que cambia a detener, y crecimiento suave del campo.

### Bloque E · Presentación del demo

- **Datos de ejemplo relativos a la fecha actual**, para que el demo siempre abra con contenido reciente y próximas ideas.
- **Metadatos:** título, descripción, imagen de vista previa para compartir, favicon e ícono de la marca, `theme-color` y manifiesto básico para agregar a la pantalla de inicio.
- **Primera carga:** pantalla de arranque con la marca en vez de un blanco mientras inician los datos.
- **Modo claro a la par:** revisar cada pantalla en claro y medir contraste (AA) en ambos temas.
- **Pendientes heredados de la fase 7:** prueba en celular real (teclado de iOS, `dvh`, gestos) y panel en móvil.

### Bloque F · Fidel como barra lateral (agregado antes de entregar)

Pedido: un solo dashboard (el calendario) y Fidel en una barra lateral a la izquierda que se abre y se pliega, en vez de una sección aparte con botón arriba.

- **Un solo dashboard:** se va la navegación «Calendario / Fidel» de la barra superior y la barra inferior del móvil. La ruta `/chat` deja de existir como pantalla: redirige a `/` con el chat abierto (los enlaces viejos siguen andando).
- **Escritorio (≥1024px):** barra lateral izquierda con el chat completo.
  - **Plegada:** un riel angosto (~64px) con el avatar de Fidel y su estado. Un clic, o el atajo de teclado, la abre.
  - **Abierta:** el ancho se ajusta arrastrando el borde (mín. ~320px, máx. ~560px), con alternativa de teclado: flechas sobre el borde y doble clic para el ancho por defecto.
  - **Memoria:** se recuerda en este navegador si estaba abierta o plegada y su ancho.
  - **Animación:** al abrir o plegar, el calendario se reacomoda con una transición suave; respeta «reducir movimiento».
- **Móvil (<1024px):** botón flotante con el avatar de Fidel. Abre el chat como hoja desde abajo, casi a pantalla completa, y se cierra deslizando o con Escape, igual que el panel de detalle.
- **La conversación no se pierde** al plegar o cerrar: vive en la barra, no en una pantalla.
- **Contexto:**
  - «Preguntarle a Fidel» (panel de detalle) y «Hablar con Fidel» (tarjeta de Fidel) abren la barra con la publicación como contexto. El chip «Preguntando sobre…» queda igual.
  - Las tarjetas de publicación del chat abren el detalle en el calendario de al lado.
- **Convivencia con el detalle:** con pantalla ancha (≥1440px) entran chat, calendario y detalle. Entre 1024 y 1440px el detalle se abre encima del calendario con fondo oscuro y el chat se queda donde está.
- **Calendario:** se adapta al ancho que le queda. Con el chat abierto y poco espacio, la grilla mantiene los chips mientras entren; si no entran, pasa a la vista de puntos y agenda.
- **Tests:**
  - Se adaptan los del chat (hoy montan `/chat`) sin cambiar su intención.
  - Se suman: abrir y plegar, ajuste de ancho con teclado, contexto desde el detalle y redirección de `/chat`.

## Decisiones (aprobadas las cuatro)

1. **Librería de animación:** sumar `motion` (Framer Motion) para el spring del panel, arrastrar para cerrar, cambio de mes y cruces. El resto, con CSS. Alternativa: solo CSS, sin gestos de arrastre.
2. **Resumen del mes:** es UI nueva sobre datos existentes. Si preferís no sumar pantalla, lo dejo fuera y solo pulo lo que hay.
3. **Etiqueta "Demo"** visible mientras no haya backend: es honesto con el lead y evita que confunda datos de ejemplo con los suyos.
4. **Toasts:** agregar `sonner` para los avisos breves (copiado, error).

## Cómo se trabaja

- Bloque A primero y solo (todo depende de él). Después B, C y D en paralelo con agentes, cada uno en su carpeta, igual que en las fases 4 a 6. Bloque E al final, sobre la integración.
- Un solo PR integrado (`feature/pulido-ui`) contra `develop`, con commits por bloque.

## Verificación

- `npm run lint`, `npm run format:check`, `npm test` y `npm run build` en verde en cada bloque. Los tests existentes (65) deben seguir pasando sin cambiar su intención; se suman tests para resumen del mes, datos relativos y gestos con alternativa de teclado.
- Una ronda de capturas por bloque: escritorio y 390px, claro y oscuro. Como máximo una segunda ronda de corrección.
- Detector de diseño de Impeccable una vez al final.
- Contraste medido con números, no a ojo.
- Lo que no pueda verificar (celular real, iOS) lo informo como pendiente tuyo.

## Riesgos

- **Peso:** `motion` suma unos 30 a 40 kB comprimidos; se carga solo donde se usa.
- **View Transitions** no está en todos los navegadores: siempre con alternativa de fundido.
- **Tests frágiles:** cambios de marcado pueden romper tests que buscan por texto; se corrige la implementación o el selector, no la intención del test.
- **Rendimiento en celulares de gama baja:** blur y animaciones se limitan a `transform` y `opacity`.

## Fuera de alcance

Programar o publicar contenido, login, backend real, onboarding, landing nueva, pizarrón, cambios de paleta o tipografía de marca.
