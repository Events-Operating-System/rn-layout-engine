# Auditoría del módulo Layout — 2026-10-31

Alcance: revisión del código (`frontend/src`, `supabase/migrations`), de los datos de producción (solo lectura, en agregado) y un recorrido en el navegador con la cuenta QA armando un plano de boda. No se cambió código ni datos. En JBD solo se hicieron consultas de lectura.

---

## 1. Estado actual

### 1.1 Cómo está armado

| Pieza | Hoy | Dónde |
|---|---|---|
| Canvas | Konva (react-konva), 2D. Escala fija de 20 px por metro, área de grilla de 120 × 120 m (los elementos pueden salir de ella). Zoom con la rueda (×1,08 por paso, de 15 % a 600 %), pan con la herramienta mano o con espacio. | `components/canvas/LayoutCanvas.tsx` (1.920 líneas, un solo componente) |
| Elementos | `LayoutElement` en metros: x, y, ancho, alto, rotación, color, opacidad, bloqueado, notas, volteo. Formas: `rect`, `circle`, `oval`, `rounded-rect`, `tree`, `polygon`. Posición redondeada a 0,1 m. | `types/layout.ts` |
| Primitivas de dibujo | Línea, flecha y texto (`DrawingPrimitive`, en píxeles de mundo, no en metros). Snap de ángulo de 15° (45° con Shift). Lectura de largo y ángulo mientras se dibuja. | `LayoutCanvas.tsx`, `lib/drawingMath.ts` |
| Polígonos | Polígono libre de lados rectos (`points` en metros relativos a la caja). Área real con la fórmula del agrimensor (Shoelace). | `drawingMath.polygonAreaMeters` |
| Medir | Herramienta de distancia (2 puntos) y de área (clic en una forma). No deja nada guardado en el plano. | `LayoutCanvas.tsx` |
| Biblioteca | 39 assets fijos en 7 categorías (escenario, estructura, asientos, barrera, servicios, circulación, formas), más "Mis assets" (forma o grupo) guardados por usuario. | `panels/AssetLibraryPanel.tsx`, tabla `custom_assets` |
| Capas | No hay. Solo "traer al frente / enviar al fondo". | — |
| Selección | Una pieza, Shift+clic o marco. Mover, copiar, borrar y rotar en bloque, con una sola entrada de deshacer (máximo 50 pasos). Guías de alineación al arrastrar; no hay snap a grilla ni alinear/distribuir. | `hooks/useCanvasState.ts` |
| Cajetín | 10 casillas: PROYECTO, LUGAR, PAX, FECHA DEL PLANO, TELÉFONO / CLIENTE, FECHA EVENTO, VERSIÓN (vN · nota), CONTACTO, CORREO. CLIENTE viene del evento vinculado o se escribe a mano. | `FooterLegend.tsx`, `titleBlockColumns` |
| Versiones | `layouts.version_number` lo numera la base al guardar con cambios. Foto por versión en `layout_versions`. Panel para ver, exportar y restaurar. | migración `20261031150000` |
| Autoguardado | Borrador en `layout_drafts` (6 s de inactividad, o 30 s como máximo) con aviso de recuperación al abrir. Arranca recién después del primer Guardar. | `useLayoutAutosave.ts` |
| Export | PNG: captura de la vista actual más el cajetín. PDF: redibuja todos los elementos en blanco y negro a 40 px por metro y los mete en el PDF como **imagen**. Hoja del tamaño del contenido (no A4/A3), sin escala ni barra de escala. Nombre del archivo `<Proyecto> - vN`. | `exportPNG` / `exportPDF` |
| Eventos | Se crea desde `?event_id=`. El primer layout del evento se vincula solo; los siguientes, con "Vincular" en Eventos. Toma el nombre y el cliente del evento. | `layoutService` |
| Inventario | **Sin vínculo.** Ni este repo ni Inventarios se leen entre sí. | — |
| Permisos y multi-org | RLS por organización activa (`my_active_org_ids`). Escritura solo si la org está aprobada. `ModuleAccessGuard` exige el módulo `layout`. **No distingue roles**: cualquier miembro con el módulo puede editar y borrar, incluido un Viewer. `custom_assets` es por usuario (no por org), sin trigger contra la suplantación de `created_by` (riesgo ya anotado en septiembre). | migraciones `20260810*`, `ModuleAccessGuard.tsx` |
| Idiomas | ES / EN / PT en la interfaz. Los exports y el cajetín quedan en español a propósito. | `LangContext.tsx` |

### 1.2 Qué dicen los datos de JBD (79 layouts, solo lectura)

- **36 activos y 43 archivados. Los 36 activos están vinculados a un evento.** De los 79, 35 son copias (`parent_layout_id`): antes de que existieran las versiones se usaba "Guardar como copia" como versión. Un evento llegó a tener 5 layouts.
- **Tamaño:** 80 elementos de promedio. Los más grandes tienen **913 y 844 elementos**. Hay 2 dibujos por plano en promedio (17 como máximo).
- **Sillas una por una.** No existe un asset "silla". Para dibujarlas se usa "Round Table 8" o "Circle" achicados a 0,50–0,65 m: **1.446 "sillas" así**. Dos layouts tienen **708 sillas cada uno**, puestas a mano.
- **Lo más usado:** mesas redondas (1.615 círculos de asientos), árbol (767, en 25 layouts), lounge (480), torres de truss 70×70 creadas a mano (451), bar (138 en 28 layouts), DJ (46), tabladillo (44), buffet (71).
- **Del catálogo que nunca se usó (12 de 39):** Escenario Secundario, Carpa 20×40, Carpa Marquesina, Backstage, Mesa Principal, Bloque de Sillas, Gradería, Valla, Primeros Auxilios, Salida, Salida de Emergencia y Caja Redondeada.
- **Assets propios (20):** torres y vigas de truss, motor, carrito de comida, baños de personal, guardarropa, pared de follaje, bar de 9 m, mesa alta, sala lounge, más 3 grupos (mesa alta, salas, mesa traslapada).
- **Nombres repetidos con otra forma:** LED / Led, Baños / SSHH / Restrooms, Árbol / arbol / Tree, Mesa Alta / M.Alta / M.A. Además, **210 elementos sin nombre**, entre ellos rectángulos de "escenario" de 52 × 38 m y 26 × 29 m que en realidad son el perímetro del local.
- **Medidas escritas a mano como texto:** "7m", "3.50m", "5m", "10m". No hay cotas que se queden guardadas en el plano.
- **Pistas de curvas:** un texto dice "Backing Led Circular". Hay 348 piezas con ángulos libres: lounges en disposición orgánica, camiones y vigas. Los polígonos de 8 a 14 vértices son barras en L/U y salas, no curvas.
- **Logística en el plano:** camiones (Aumark 7 t, Tunland, remolcador) dibujados como rectángulos con nombre.
- Nadie usa "bloquear" (0 piezas). Solo 50 elementos tienen notas.

### 1.3 Recorrido en el navegador (QA, plano de boda de 120 pax)

| Paso | Qué pasó | Impacto |
|---|---|---|
| Nuevo layout | **Arranca con 6 piezas de demo** (escenario, carpas, baños, puerta, barrera) que hay que borrar a mano en cada plano. | Alto: cada plano empieza ensuciado |
| Nombre | El campo dice "Nombre del cliente / evento", pero ahora es PROYECTO. | Bajo, confunde |
| Seleccionar todo | **Cmd+A selecciona el texto de la página**, no las piezas. | Medio |
| Zoom | Paso de ×1,08: para ver un local grande hay que girar la rueda muchas veces. **No hay "ajustar a pantalla" ni botones +/−.** | Medio |
| Mesa redonda 10 | Cae en el centro de la vista, encima de lo que haya. **No trae sillas.** El nombre queda en inglés ("Round Table 10") aunque la biblioteca está en español, y se corta ("Round…") en el canvas. | Alto |
| Cmd+D | Duplica desplazado +1 m en diagonal. Para 12 mesas en grilla hay que acomodarlas una por una. **No hay alinear, distribuir ni "repetir en grilla/fila".** | Alto |
| Selección múltiple | Solo ofrece orden, rotar grupo y guardar como asset. | Medio |
| PAX | La casilla PAX se escribe a mano; no cuenta los asientos dibujados. | Medio |
| Duplicar | Deshabilitado hasta el primer Guardar, sin explicar por qué en pantalla (solo en el tooltip). | Bajo |
| Export PDF | Un plano simple pesa **16 MB** (es una imagen, no vectores). En locales grandes el cajetín, que tiene alto fijo, queda chico respecto a la hoja. | Medio |

### 1.4 Qué funciona bien

- La base es sólida: metros reales, versiones numeradas por la base con historial, autoguardado con recuperación, RLS por organización con triggers que no confían en el cliente, cajetín unificado y el editor ya no se pierde al volver a la pestaña.
- El polígono libre y las medidas de distancia y área son exactos (`drawingMath` tiene tests y no depende de React).
- Los grupos como asset reutilizable sirven (JBD ya armó "Mesa traslapada redonda" y "TJ SALAS").
- La selección múltiple con un solo deshacer y el panel de propiedades con medidas numéricas.

### 1.5 Qué está lento o es frágil

- **`LayoutCanvas.tsx` tiene 1.920 líneas en un solo componente**: dibujo, medición, export, cajetín y teclado juntos. Cada herramienta nueva (curvas, cotas, capas) lo vuelve más riesgoso. Conviene separarlo antes de las curvas.
- **Rendimiento con 900+ piezas:** cada pieza es un `Group` de Konva con su texto, todo en una capa que escucha eventos y sin memorización. No lo medí con 900 piezas (QA no tiene un plano así). El riesgo existe y se resuelve con capas separadas, `listening=false` en lo bloqueado y caché de nodos.
- **El PDF es una imagen:** archivos pesados, líneas que se pixelan al hacer zoom, texto que no se puede seleccionar y sin escala real para imprimir.
- **Dos sistemas de coordenadas:** los elementos van en metros y los dibujos (línea, flecha, texto) en píxeles de mundo. Cualquier cambio de escala o el 3D tiene que convertirlos.
- **Permisos:** un Viewer puede editar y borrar planos (la RLS solo mira la membresía). `custom_assets` es por usuario y permite suplantar `created_by`.
- `DECISION_LOG.md` excluye Three.js de forma explícita ("este proyecto es solo 2D"), y `AGENTS.md` lo repite. El 3D necesita una decisión nueva (ver §3).

### 1.6 Qué confunde al usuario

- Las piezas de demo en cada plano nuevo.
- Los nombres en inglés en el canvas con la interfaz en español.
- No hay silla, así que se reutilizan mesas achicadas y eso ensucia el conteo y cualquier inventario futuro.
- Medidas como texto suelto: si se mueve algo, la medida queda mal.
- El encabezado dice "RN Layout Engine" con el sello "MVP", y el cajetín dice "EventOS Layout".

---

## 2. Curvas

### 2.1 Qué dibujar

| Herramienta | Uso real | Cómo se dibuja |
|---|---|---|
| **Arco por 3 puntos** | Backing LED circular, frente de escenario curvo, fila curva de sillas | Inicio, fin y un punto por donde pasa (estándar de CAD) |
| **Línea curva (Bézier)** | Recorridos, caminos de jardín, flechas de flujo curvas | Clic para agregar puntos; arrastrar mientras se hace clic saca las manijas |
| **Círculo y elipse con radio** | Pista redonda, carpa circular, mesa imperial ovalada | Ya existen (`circle`/`oval`), pero se editan como caja. Falta escribir el radio y ver diámetro y área |
| **Polígono con lados curvos** | Escenario con frente semicircular, barra en U redondeada, pista de baile curva, carpa de jaima | Cualquier lado del polígono actual se puede convertir en arco o en Bézier |
| **Repetir a lo largo de una curva** | Sillas de ceremonia en arco, mesas alrededor de la pista | Elegir una pieza, un camino y N copias o una separación |

### 2.2 Modelo de datos (compatible con lo actual)

Recomendación: extender `polygon` en lugar de crear un tipo aparte.

```ts
// LayoutElement (shape === 'polygon' | 'path')
points: number[]            // vértices en metros, igual que hoy
segments?: Segment[]        // opcional; sin él = todos rectos (layouts actuales intactos)
closed?: boolean            // polygon = true (área); path = false (línea curva)

type Segment =
  | { kind: 'line' }
  | { kind: 'arc'; bulge: number }                    // tan(θ/4), estilo DXF: radio exacto, compacto
  | { kind: 'bezier'; c1: [number, number]; c2: [number, number] }  // manijas en metros
```

- **El arco con `bulge`** (el mismo formato de AutoCAD/DXF) guarda un solo número por lado. De él salen el radio, el centro y el ángulo exactos, y se exporta a DXF sin pérdida.
- **La Bézier cúbica** es para formas libres.
- Las líneas y flechas curvas pasan a ser `path` con `closed=false`. Conviene aprovechar para pasarlas a metros y terminar con los dos sistemas de coordenadas.

### 2.3 Edición

- Al seleccionar se ven los vértices (cuadrados) y las manijas (círculos) del lado activo.
- Doble clic en un lado agrega un vértice. Supr sobre un vértice lo quita.
- Clic derecho o un botón en el panel: "Convertir lado en recto / arco / curva".
- En las Bézier, Alt suelta la simetría de las manijas.
- En el panel de propiedades: radio y ángulo del arco (editables), largo del lado, área total.
- Se mantienen el snap de ángulo de 15° / 45° y las guías de alineación.

### 2.4 Medición (encaja en `drawingMath.ts`, sin React)

| Función nueva | Qué calcula | Precisión |
|---|---|---|
| `arcFromBulge(p1, p2, bulge)` | Centro, radio, ángulo de inicio y barrido | Exacta |
| `bulgeFromThreePoints(a, b, c)` | El arco por 3 puntos | Exacta |
| `segmentLength(seg)` | Arco: r·θ. Bézier: subdivisión adaptativa con tolerancia de 1 cm | Error < 1 cm |
| `flattenPath(points, segments, tol)` | Polilínea para dibujar en el PDF, hacer hit-testing y extruir en 3D | Configurable |
| `pathAreaMeters(...)` | Área cerrada: Shoelace sobre los vértices más el área exacta de cada segmento circular | Exacta para arcos; < 0,1 % para Bézier |

`elementAreaMeters` y la herramienta Medir pasan a usar `pathAreaMeters` cuando hay `segments`. Así el panel y Medir siguen dando siempre el mismo número, como hoy.

### 2.5 Dibujo y export

- **Canvas:** `Konva.Shape` con `sceneFunc` usando `ctx.arc` y `ctx.bezierCurveTo` (o `Konva.Path` con datos SVG). No hay que usar `Line` con `tension`: queda bonito, pero no respeta puntos de control exactos.
- **PNG:** sale solo, porque es una captura de la vista.
- **PDF:** hoy redibuja cada forma a mano en `exportPDF`, así que hay que agregar el caso de las curvas ahí. Si antes se pasa el PDF a vectores (§4), las curvas salen nítidas.
- **3D:** se extruye la polilínea de `flattenPath`.
- **DXF** (opcional, más adelante): los arcos salen como `bulge`, sin aproximar.

### 2.6 Esfuerzo

- Unas 3–4 sesiones: modelo y matemática con tests (1), dibujo y edición de vértices y manijas (1–2), panel y export PDF (1).
- "Repetir a lo largo de una curva" se suma a la herramienta de arreglos (§4, punto 2).
- Antes conviene separar `LayoutCanvas.tsx` en módulos (dibujo, medición, export, edición), en 1 sesión.

---

## 3. Vistas 3D desde el plano

### Opción A — 3D real en el navegador (Three.js con react-three-fiber)

**Qué hace:**
- Levanta el plano tal cual: cada pieza se extruye con su huella real (rectángulo, círculo, polígono o curva) y una altura según su tipo.
- Se puede girar (órbita), recorrer en primera persona a la altura de los ojos y sacar capturas en PNG.
- Es exacto: las mismas medidas del plano. Sirve para producción (alturas de truss, visuales desde la mesa principal, despeje de pantallas).

**Cómo:**
- Una pestaña "3D" en el editor que carga el código 3D solo cuando se abre (no pesa en el 2D).
- Alturas por defecto por tipo, editables por pieza (campo `height3d`):

  | Pieza | Altura por defecto |
  |---|---|
  | Escenario / tabladillo | 0,6–1,2 m |
  | Mesa | 0,75 m |
  | Silla | 0,9 m |
  | Bar | 1,1 m |
  | Pantalla LED | 3 m (base de 1 m) |
  | Torre de truss | 4–6 m |
  | Carpa | 3 m de lateral más techo a dos aguas |
  | Árbol | Cilindro con copa |

- **Fase 1, formas paramétricas:** cajas, cilindros y extrusiones de la huella. Con colores de categoría ya se lee bien.
- **Fase 2, modelos GLTF** para las piezas más usadas (silla, mesa redonda, carpa, escenario, árbol, truss), de bibliotecas libres CC0 (Kenney, Poly Haven) o de un pack pagado una sola vez.
- Las 700+ sillas se dibujan con `InstancedMesh` (una sola llamada de dibujo), así que el rendimiento no es problema.

**Números:**

| | |
|---|---|
| Esfuerzo | Fase 1: 5–7 sesiones (vista, extrusión, curvas, cámara de órbita y de recorrido, captura). Fase 2: 3–4 sesiones más (modelos, materiales, luz). |
| Costo mensual | **US$ 0** (corre en el navegador del usuario, sin servidor). Modelos: gratis (CC0) o un pago único de unos US$ 50–300 si se compra un pack. |
| Riesgo | Bajo a medio. Exige una nueva decisión de arquitectura: hoy el `DECISION_LOG` y `AGENTS.md` prohíben Three.js. Celulares viejos con poca GPU (se mitiga con calidad automática). Los dibujos en píxeles hay que convertirlos (se resuelve con §2.2). |

### Opción B — Render con IA (imagen para vender)

**Qué hace:** genera una imagen fotorrealista ("boda en jardín de noche, mesas con mantel blanco, luces cálidas") a partir del plano o del 3D. Es vistosa y menos exacta: la IA puede agregar, mover o quitar mesas.

**Cómo:**
- Una función en Supabase (Edge Function) guarda la clave del proveedor y llama a un modelo de imagen.
- **Entrada desde el 2D:** solo el plano visto desde arriba más un texto. Poco control, porque la IA "inventa" la perspectiva.
- **Entrada desde el 3D (mucho mejor):** captura de la vista 3D más un mapa de profundidad, con control estructural (tipo ControlNet de profundidad o bordes), para que respete dónde está cada cosa.
- Cada imagen se marca como "Imagen ilustrativa".

**Números** (precios aproximados a hoy; verificar al decidir):

| | |
|---|---|
| Esfuerzo | 2–3 sesiones encima de A (función, cola de trabajos, galería por layout, límite por organización). |
| Costo por imagen | US$ 0,01–0,05 con modelos abiertos alojados (Replicate, fal.ai); US$ 0,04–0,20 con APIs comerciales de imagen. |
| Costo mensual estimado | Con 300–500 renders al mes: **US$ 10–100**. Hay que poner un tope por organización. |
| Riesgo | Medio. El cliente puede tomar la imagen como compromiso ("me mostraron flores azules"), los resultados son variables y depende de un proveedor externo. |

### Recomendación

- **Empezar por A, Fase 1** (formas paramétricas): costo mensual cero, sirve a producción y a venta, y reutiliza todo el plano.
- **B se construye encima de A, sí.** La captura y la profundidad del 3D son la mejor guía para la IA: sin el 3D, B queda muy inexacto.
- Orden: curvas (para que el 3D no nazca sin ellas) → 3D Fase 1 → render IA → modelos GLTF si la venta lo pide.

---

## 4. Mejoras generales (por tiempo que le ahorra a un productor)

1. **Mesas con sillas y conteo de PAX automático.**
   - Asset "Silla" y mesas que traen sus sillas alrededor (redonda 8/10/12, rectangular, imperial), editables como grupo.
   - PAX del cajetín calculado con los asientos dibujados (sobrescribible).
   - *Evidencia:* 1.446 sillas hechas con mesas achicadas, 708 por plano.
2. **Arreglos: repetir en grilla, fila o arco, más alinear y distribuir.**
   - N copias con separación en metros. Alinear a izquierda, centro y arriba; distribuir el espacio por igual.
   - *Evidencia:* planos de 900 piezas hechos con Cmd+D y moviendo pieza por pieza.
3. **Plano nuevo en blanco y plantillas.**
   - Quitar las 6 piezas de demo. Plantillas por organización: boda 100/200, corporativo en auditorio, cóctel.
4. **Plano del local de fondo.**
   - Subir una imagen o PDF del local, calibrar la escala marcando una medida conocida, bajar la opacidad y bloquearlo. Hoy el perímetro se dibuja con rectángulos sin nombre de 52 × 38 m.
5. **Cotas que se quedan en el plano.**
   - Herramienta "cota": se ata a dos puntos o piezas y se actualiza sola al moverlas.
   - *Evidencia:* textos "7m", "3.50m" escritos a mano.
6. **Capas.**
   - Local / Estructura y truss / Mobiliario / Técnica (LED, sonido) / Logística (camiones) / Notas. Cada una se puede mostrar, ocultar o bloquear.
   - Exportar por capas: plano técnico para montaje y plano limpio para el cliente.
7. **Biblioteca por organización y nombres en español.**
   - Hoy "Mis assets" es por usuario: compartirlo por org, con categorías propias (truss, vehículos).
   - Mostrar los nombres traducidos en el canvas.
   - Ofrecer unificar duplicados (LED/Led, Baños/SSHH).
8. **Lista de materiales e Inventarios.**
   - Contar piezas por asset ("80 sillas, 10 mesas redondas 10, 12 torres 70×70").
   - Paso siguiente: mapear asset ↔ ítem de inventario y reservar desde el plano. Toca Inventarios y Eventos, que hoy no se conectan con Layout.
9. **PDF profesional.**
   - Hoja estándar (A4, A3, A1) con escala real (1:100, 1:200), barra de escala, norte, leyenda con conteo y cajetín proporcional.
   - Vectorial (texto y líneas nítidos, pocos KB en lugar de 16 MB).
10. **Navegación.** Ajustar a pantalla, botones +/−, zoom a la selección, Cmd+A para seleccionar todas las piezas, snap a grilla configurable (0,1 / 0,5 / 1 m).
11. **Permisos por rol.** Que Viewer solo lea (RLS más interfaz). Cerrar la suplantación de `created_by` en `custom_assets`.
12. **Rendimiento con planos grandes.** Separar capas de Konva, `listening=false` en lo bloqueado o de fondo, memorizar las piezas, y medir con un plano de 1.000 piezas.
13. **Prolijidad.**
    - Encabezado "EventOS Layout" (sin "MVP").
    - Placeholder "Nombre del proyecto".
    - Explicar en pantalla por qué "Duplicar" está gris.
    - Colocar las piezas nuevas en un lugar libre de la vista.

---

## 5. Plan de trabajo

| # | Bloque | Contenido | Esfuerzo | Qué necesito que decidas | Mi recomendación |
|---|---|---|---|---|---|
| 0 | **Arreglos rápidos** | Plano en blanco, nombres en español en el canvas, ajustar a pantalla y +/−, Cmd+A, placeholder, encabezado, piezas nuevas en lugar libre | 1 sesión | ¿Plantillas ya ahora o después? | Plano en blanco ya; plantillas en el bloque 1 |
| 1 | **Mesas, sillas y arreglos** | Asset silla, mesas con sillas, PAX automático, repetir en grilla/fila, alinear y distribuir | 2–3 sesiones | Medidas por defecto de silla y mesas; ¿PAX automático o solo sugerido? | Silla 0,45 m; PAX automático con opción de sobrescribir |
| 2 | **Permisos** | Viewer solo lectura; `custom_assets` seguro y por org | 1 sesión | ¿Qué roles editan Layout? | Owner/Admin/Editor editan; Viewer solo mira |
| 3 | **Plano del local y cotas** | Imagen/PDF de fondo con calibración; cotas atadas; snap a grilla | 2 sesiones | ¿Formatos de fondo? | Imagen y PDF ahora; DWG/DXF más adelante |
| 4 | **Capas** | Capas fijas con mostrar/ocultar/bloquear; export por capa | 1–2 sesiones | ¿Capas fijas o que cada org cree las suyas? | Fijas al inicio (6), editables después |
| 5 | **Separar el canvas** | Partir `LayoutCanvas.tsx` en módulos; dibujos a metros | 1 sesión | — | Hacerlo justo antes de curvas |
| 6 | **Curvas** | Arco por 3 puntos, Bézier, lados curvos en polígonos, radio y área, repetir en arco, export | 3–4 sesiones | ¿Arcos primero o Bézier primero? | Arcos primero (escenarios y backings son arcos); Bézier después |
| 7 | **PDF profesional** | A4/A3/A1, escala, barra, norte, leyenda con conteo, vectorial | 2 sesiones | Tamaños y escalas por defecto | A3 apaisado 1:200 por defecto |
| 8 | **3D Fase 1 (opción A)** | Vista 3D con formas paramétricas, órbita, recorrido, captura | 5–7 sesiones | **Levantar la exclusión de Three.js en `DECISION_LOG`/`AGENTS.md`**; alturas por defecto | Aprobar; pestaña 3D cargada aparte |
| 9 | **Biblioteca por org y lista de materiales** | Assets compartidos por org, unificar nombres, conteo por asset | 2 sesiones | ¿Quién administra la biblioteca de la org? | Admin y Editor |
| 10 | **Render con IA (opción B)** | Edge Function, render desde el 3D, galería, tope mensual | 2–3 sesiones | Proveedor y presupuesto mensual | Empezar con un modelo abierto alojado y un tope de US$ 50/mes |
| 11 | **Inventarios** | Mapear asset ↔ ítem de inventario y reservar desde el plano | 3–4 sesiones (entre repos) | Cómo se mapea; si reserva o solo sugiere | Primero que solo sugiera (no reserve) |
| 12 | **3D Fase 2** | Modelos GLTF, materiales, luz | 3–4 sesiones | ¿Comprar un pack o usar modelos libres? | Libres (CC0) primero |

**Orden sugerido:** 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12.
- Los bloques 0 a 2 son los que más tiempo ahorran desde el día uno, y el 2 cierra un riesgo de seguridad.
- Las curvas van antes del 3D para que el 3D nazca completo.

---

## Anexo — cómo se obtuvo

- **Código:** `frontend/src` al commit `89c254a` y las migraciones en `supabase/migrations`.
- **Datos:** consultas de solo lectura y en agregado (conteos por nombre, forma, categoría, rotación, vértices y dibujos) sobre `public.layouts`, `custom_assets` y `eventos.events` del proyecto `rn-layout-engine-v2`. Ningún UPDATE ni INSERT en JBD.
- **Navegador:** sitio de producción con la cuenta QA (`jbambaren@mettal.io`, org "QA Superadmin — Aprobar"). El plano de prueba no se guardó. La sesión se cerró al terminar.
- **No medido:** el rendimiento real con 900+ piezas (QA no tiene un plano de ese tamaño). Queda como tarea del punto 12 de §4.
