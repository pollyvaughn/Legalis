# Guía rápida para el parcial: frontend de Legalis

Esta guía sirve para ubicar rápidamente pantallas y hacer cambios visuales o de navegación pequeños en el frontend. Está pensada para cambios como editar textos, estilos, orden de componentes o destinos de enlaces, sin modificar la lógica de negocio.

> Los números de línea son referencias orientativas: pueden cambiar si se edita el código. En VS Code o Cursor, usá `Cmd+Shift+F` (Mac) o `Ctrl+Shift+F` (Windows/Linux) para buscar por texto, componente o ruta.

## 1. Estructura del proyecto

El repositorio tiene dos partes principales:

- `frontend/`: aplicación React, sus pantallas y estilos.
- `backend/`: API y lógica del servidor. Para un cambio puramente visual, normalmente no hace falta tocarlo.

Dentro de `frontend/src/`:

| Carpeta/archivo | Para qué sirve |
|---|---|
| [`App.jsx`](frontend/src/App.jsx) | Declara las URL y qué página se muestra en cada ruta. |
| [`pages/`](frontend/src/pages/) | Pantallas completas: listados, detalles, login, calendario y más. |
| [`components/`](frontend/src/components/) | Piezas reutilizables o secciones de pantallas, como menús, modales y botones. |
| [`components/layout/`](frontend/src/components/layout/) | Estructura común de la aplicación autenticada: menú lateral y área de contenido. |
| [`components/ui/`](frontend/src/components/ui/) | Componentes visuales reutilizables, como botones, campos, insignias y modales. |
| [`constants/`](frontend/src/constants/) | Opciones y etiquetas compartidas, por ejemplo estados, fueros y tipos. |
| [`context/`](frontend/src/context/) y [`hooks/`](frontend/src/hooks/) | Estado compartido y funciones reutilizables de React. |
| [`api/`](frontend/src/api/) y [`services/`](frontend/src/services/) | Comunicación con el backend. No suelen ser el lugar para un cambio solo estético. |
| [`utils/`](frontend/src/utils/) | Funciones auxiliares, por ejemplo formato de fechas o moneda. |
| [`index.css`](frontend/src/index.css) | Importa Tailwind; la mayoría de los estilos están escritos como clases en JSX. |

El frontend usa React, Vite y Tailwind CSS. Tailwind se importa desde `src/index.css` y se integra en `vite.config.js`.

## 2. Mapa de rutas y pantallas

Las rutas se declaran en [`frontend/src/App.jsx`](frontend/src/App.jsx). Casi todas están protegidas y usan el diseño general de la aplicación.

| Lo que ves en pantalla | URL | Archivo principal |
|---|---|---|
| Inicio de sesión | `/login` | [`LoginPage.jsx`](frontend/src/pages/LoginPage.jsx) |
| Dashboard “próximamente” | `/dashboard` | [`ProximamentePage.jsx`](frontend/src/pages/comunes/ProximamentePage.jsx) |
| Listado de expedientes | `/expedientes` | [`ExpedientesListPage.jsx`](frontend/src/pages/expedientes/ExpedientesListPage.jsx) |
| Detalle de un expediente | `/expedientes/:id` | [`ExpedienteDetailPage.jsx`](frontend/src/pages/expedientes/ExpedienteDetailPage.jsx) |
| Listado de clientes | `/clientes` | [`ClientesListPage.jsx`](frontend/src/pages/clientes/ClientesListPage.jsx) |
| Detalle de un cliente | `/clientes/:id` | [`ClienteDetailPage.jsx`](frontend/src/pages/clientes/ClienteDetailPage.jsx) |
| Escritos forenses | `/plantillas` | [`PlantillasPage.jsx`](frontend/src/pages/plantillas/PlantillasPage.jsx) |
| Asesorías y trámites | `/asesorias` | [`AsesoriasPage.jsx`](frontend/src/pages/asesorias/AsesoriasPage.jsx) |
| Catálogo de trámites | `/asesorias/catalogo` | [`CatalogoTramitesPage.jsx`](frontend/src/pages/asesorias/CatalogoTramitesPage.jsx) |
| Calendario y plazos | `/calendario` | [`CalendarioPlazosPage.jsx`](frontend/src/pages/calendario/CalendarioPlazosPage.jsx) |
| Catálogo de tipos de plazo | `/calendario/tipos-plazo` | [`CatalogoTiposPlazoPage.jsx`](frontend/src/pages/calendario/CatalogoTiposPlazoPage.jsx) |
| Catálogo de días no hábiles | `/calendario/dias-no-habiles` | [`CatalogoDiasNoHabilesPage.jsx`](frontend/src/pages/calendario/CatalogoDiasNoHabilesPage.jsx) |
| Resumen de honorarios y gastos | `/honorarios` | [`HonorariosResumenPage.jsx`](frontend/src/pages/honorarios/HonorariosResumenPage.jsx) |
| Cobros “próximamente” | `/cobros` | [`ProximamentePage.jsx`](frontend/src/pages/comunes/ProximamentePage.jsx) |
| Cambio de contraseña | `/cambiar-password` | [`CambiarPasswordPage.jsx`](frontend/src/pages/CambiarPasswordPage.jsx) |
| Perfil | `/perfil` | [`PerfilPage.jsx`](frontend/src/pages/PerfilPage.jsx) |
| Gestión de usuarios | `/usuarios` | [`UsuariosPage.jsx`](frontend/src/pages/usuarios/UsuariosPage.jsx) |
| Auditoría | `/auditoria` | [`AuditoriaPage.jsx`](frontend/src/pages/auditoria/AuditoriaPage.jsx) |

Las rutas desconocidas redirigen a `/expedientes`, al final de `App.jsx`.

### Diseño común

- [`AppLayout.jsx`](frontend/src/components/layout/AppLayout.jsx): coloca el menú lateral, el encabezado con fecha y el área donde aparece la página.
- [`Sidebar.jsx`](frontend/src/components/layout/Sidebar.jsx): define la navegación lateral, el perfil y el botón de cerrar sesión.
- [`RutaProtegida.jsx`](frontend/src/components/RutaProtegida.jsx): protege rutas según la sesión y, en algunas pantallas, según el rol.

## 3. Cambios habituales y dónde hacerlos

### Estilos de títulos, botones y contenedores

Los estilos suelen ser clases Tailwind directamente en `className`.

- **Título de una pantalla:** buscá el `<h1>` dentro de la página. Por ejemplo, el título «Expedientes» está en `ExpedientesListPage.jsx`, cerca del encabezado.
- **Botón reutilizable:** [`Button.jsx`](frontend/src/components/ui/Button.jsx) define las clases compartidas. Sus variantes están en el objeto `VARIANTES`; los tamaños, en `TAMANOS`.
- **Botón particular de una pantalla:** algunas pantallas usan `<button>` directo y clases propias. Los botones de filtro del calendario son un ejemplo en `CalendarioPlazosPage.jsx`.
- **Contenedor general:** el fondo, menú y área de contenido están en `AppLayout.jsx`.
- **CSS global:** `index.css` importa Tailwind. Para un cambio de una pantalla, buscá primero las clases en el componente JSX correspondiente.

### Reordenar elementos

En JSX, los elementos hermanos se muestran en el mismo orden en que aparecen en el código. Para mover uno:

1. Buscá ambos elementos en el mismo contenedor.
2. Seleccioná el bloque JSX completo del elemento.
3. Movelo antes o después del otro bloque.
4. Conservá sus propiedades y revisá el resultado en el navegador.

Ejemplos:

- En `ExpedientesListPage.jsx`, el encabezado contiene el título y el grupo de botones.
- En `ExpedienteDetailPage.jsx`, las secciones de partes, documentos, actuaciones y plazos aparecen una después de otra. Mové el `div` o componente de la sección completa.
- Para reordenar el menú lateral, cambiá el orden de los objetos de `NAV_ITEMS` en `Sidebar.jsx`.

### Cambiar destinos de botones y enlaces

El proyecto usa React Router:

- `<Link to="/ruta">` y `<NavLink to="/ruta">` son enlaces internos.
- `useNavigate()` junto a `navigate('/ruta')` cambia de ruta desde una acción.
- La relación entre ruta y página se define en `App.jsx`.

Ejemplos para buscar:

- `navigate('/asesorias/catalogo')` en `AsesoriasPage.jsx`.
- `to={`/expedientes/${expediente.id}`}` en `ExpedientesListPage.jsx`.
- `to="/expedientes"` en el enlace «Volver a expedientes» de `ExpedienteDetailPage.jsx`.

Si la ruta destino no existe, cambiar solo el enlace no crea una pantalla: hay que revisar también `App.jsx`.

### Cambiar textos y etiquetas

Buscá el texto visible exacto con la búsqueda global del editor. Por ejemplo, «Calendario & Plazos» está en el `<h1>` de `CalendarioPlazosPage.jsx`.

Algunos textos son dinámicos:

- Una interpolación como `{cliente.nombre}` muestra el valor de una variable.
- Una expresión como `{exportando ? 'Generando...' : 'Exportar PDF'}` cambia el texto según el estado.
- Las opciones o etiquetas compartidas pueden estar en `constants/`.

Si no aparece el texto exacto en una búsqueda, buscá el nombre de la variable o componente que lo muestra.

### Ocultar o mostrar elementos

- **Solo visualmente:** se puede agregar la clase Tailwind `hidden` al `className` para ocultar un elemento mientras se conserve el código.
- **Condición de React:** `{condicion && (...)}` muestra el bloque cuando la condición es verdadera.
- **Estado de un modal:** `{mostrarModal && (...)}` lo muestra cuando la variable de estado vale `true`.
- **Menú por rol:** `NAV_ITEMS.filter(...)` filtra los enlaces disponibles en `Sidebar.jsx`.

No quites condiciones como `esAbogado` para un cambio puramente visual: pueden controlar permisos, no solo apariencia.

### Botones con estilos establecidos y botones propios

El componente reutilizable [`Button.jsx`](frontend/src/components/ui/Button.jsx) define cuatro variantes:

| Variante | Uso típico | Clases de color |
|---|---|---|
| `primary` | Acción principal, por ejemplo guardar o crear. Es la variante predeterminada. | Fondo gris muy oscuro, texto blanco y hover oscuro. |
| `secondary` | Acción secundaria, por ejemplo cancelar. | Fondo gris claro y texto gris. |
| `danger` | Acción destructiva, por ejemplo eliminar. | Fondo rojo y texto blanco. |
| `ghost` | Acción discreta, por ejemplo editar en una tabla. | Sin fondo sólido; fondo claro al pasar el cursor. |

Los tamaños son `sm`, `md` y `lg`, y controlan principalmente relleno y tamaño del texto. Por ejemplo:

```jsx
<Button>Guardar</Button>
<Button variant="secondary">Cancelar</Button>
<Button variant="danger" size="sm">Eliminar</Button>
```

`danger` define el aspecto, no la operación: lo que hace el botón depende de su `onClick`.

**Ejemplo de estilo propio:** los botones `BotonFiltro` del calendario no usan el componente compartido `Button`; su estilo está escrito directamente en `CalendarioPlazosPage.jsx` y cambia según estén activos. Si el pedido es cambiar solo ese filtro, editá ahí. Si es cambiar todos los botones `danger`, editá `Button.jsx`.

### Otros detalles que pueden aparecer en un parcial

- **Tablas:** encabezados con `<th>` y filas con `<td>`; buscá el texto del encabezado para encontrar la tabla.
- **Modales:** suelen ser componentes bajo `components/` o `components/ui/`; buscá el texto del título o botón del modal.
- **Iconos:** el proyecto usa `lucide-react`. Buscá el nombre del componente de icono, por ejemplo `Calendar` o `Briefcase`, en el JSX.
- **Listas repetidas:** si un texto o botón aparece en un `.map(...)`, puede que tengas que modificar el JSX del elemento repetido, no un elemento escrito una sola vez.
- **Valores del backend:** si el contenido viene de datos, el JSX lo muestra mediante una variable. Para un cambio puramente visual, usualmente basta con cambiar la etiqueta visible sin tocar la petición a la API.

## 4. Clases Tailwind frecuentes

### Texto

| Clase | Efecto |
|---|---|
| `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl` | Tamaño del texto, de pequeño a grande. |
| `font-medium`, `font-semibold`, `font-bold` | Grosor de la letra. |
| `text-gray-900`, `text-gray-600`, `text-gray-400` | Color del texto; `900` es oscuro y `400` es claro. |
| `text-center`, `text-left`, `text-right` | Alineación del texto. |

Por ejemplo, `text-2xl font-semibold text-gray-900` significa texto grande, seminegrita y gris oscuro.

### Colores y estados

| Clase | Efecto |
|---|---|
| `bg-white` | Fondo blanco. |
| `bg-gray-50`, `bg-gray-100` | Fondo gris claro. |
| `bg-gray-900` | Fondo oscuro, casi negro. |
| `text-white` | Texto blanco. |
| `border-gray-200` | Borde gris claro. |
| `hover:bg-gray-100` | Fondo al pasar el cursor. |
| `hover:text-gray-900` | Texto al pasar el cursor. |
| `disabled:opacity-50` | Reduce la opacidad cuando el control está deshabilitado. |

Los prefijos `hover:` y `disabled:` indican cuándo se aplica la clase.

### Espaciado

`m` indica margen, `p` indica relleno interno, y el sufijo indica el lado:

| Clase | Efecto |
|---|---|
| `m-4`, `p-4` | Margen o relleno en todos los lados. |
| `mt-4`, `mb-6` | Margen superior o inferior. |
| `px-4`, `py-2` | Relleno horizontal o vertical. |
| `gap-2` | Espacio entre elementos de un contenedor `flex` o `grid`. |

En general, un número mayor da más espacio.

### Distribución, bordes y forma

| Clase | Efecto |
|---|---|
| `flex` | Distribuye los hijos en una fila por defecto. |
| `flex-col` | Coloca los hijos en columna. |
| `items-center` | Alinea los elementos al centro en el eje transversal. |
| `justify-between` | Reparte los elementos hacia los extremos. |
| `justify-end` | Alinea los elementos al final. |
| `border` | Agrega un borde. |
| `rounded-lg`, `rounded-xl` | Redondea las esquinas; `xl` suele ser más redondeado. |
| `rounded-full` | Forma de píldora o círculo. |
| `shadow-sm` | Agrega una sombra pequeña. |

Ejemplo: `flex items-center justify-between` pone elementos en una fila, los centra y reparte hacia los extremos.

### Diseño adaptable

Un prefijo como `md:` aplica la clase desde un tamaño de pantalla mediano en adelante. Por ejemplo, `grid grid-cols-2 md:grid-cols-4` usa dos columnas y pasa a cuatro en pantallas medianas.

### Atajo para reconocer clases

- Texto: `text-*`, `font-*`
- Fondo: `bg-*`
- Borde: `border-*`
- Espacio: `m*`, `p*`, `gap-*`
- Alineación: `flex`, `items-*`, `justify-*`
- Forma: `rounded-*`, `shadow-*`
- Interacción: `hover:*`, `disabled:*`
- Adaptabilidad: `sm:*`, `md:*`, `lg:*`

## 5. Inspección rápida con DevTools

1. Abrí en el navegador la pantalla que te pidieron cambiar.
2. Hacé clic derecho sobre el elemento y elegí **Inspeccionar**. También podés abrir DevTools con `F12` o `Cmd+Option+I` en Mac y activar el selector de elemento.
3. En la pestaña **Elements**, confirmá que seleccionaste el texto, botón o contenedor correcto.
4. Mirá el texto y las clases del atributo `class`. Por ejemplo, podrías ver `text-2xl font-semibold text-gray-900`.
5. En VS Code o Cursor, abrí la búsqueda global (`Cmd+Shift+F` en Mac) y buscá primero el texto visible. Si no aparece, buscá una clase distintiva o el nombre del componente.
6. Editá el archivo fuente en `frontend/src`. Los cambios hechos directamente desde DevTools son temporales y no se guardan en el código.
7. Volvé al navegador y verificá el resultado. Vite suele actualizar la pantalla automáticamente.

### Búsquedas globales útiles

- Texto exacto: `Expedientes`, `+ Nuevo cliente`, `Volver a expedientes`.
- Título típico: `text-2xl font-semibold text-gray-900`.
- Menú lateral: `NAV_ITEMS` o el texto de la etiqueta.
- Navegación: `/clientes`, `/expedientes/`, `navigate(`, `to=`.
- Componentes de detalle: `PartesSeccion`, `PlazosSeccion`, `ActuacionesSeccion`.
- Botones compartidos: `variant="danger"`, `variant="secondary"` o `Button`.

## 6. Ranking de cambios: más fácil a más difícil

| Nivel | Cambio | Qué hacer |
|---|---|---|
| 1 — Muy fácil | Cambiar un texto fijo | Buscar el texto exacto en la página y reemplazarlo. |
| 2 — Fácil | Cambiar color, tamaño o espacio local | Modificar una clase Tailwind en el elemento correcto. |
| 3 — Fácil, con alcance amplio | Cambiar una variante compartida de botón | Editar `Button.jsx`; revisar que el cambio no afecte botones de otras pantallas. |
| 4 — Intermedio | Reordenar botones, títulos o secciones | Mover el bloque JSX completo dentro de su contenedor. |
| 5 — Intermedio | Cambiar el destino de un enlace | Cambiar `to` o `navigate`; confirmar que exista la ruta. |
| 6 — Intermedio/avanzado | Ocultar o mostrar algo | Distinguir entre estilo (`hidden`) y condición de React; cuidar condiciones de permisos. |
| 7 — Avanzado | Cambiar una ruta o pantalla completa | Revisar tanto la navegación como el mapeo de rutas en `App.jsx`. |
| 8 — Evitar si no lo piden | Cambiar permisos, datos o lógica | Puede afectar el negocio o el acceso; no es un cambio meramente visual. |

## 7. Cinco ejercicios de autoevaluación

### 1. «Cambiá el título de Expedientes a “Casos”.»

1. Abrí `frontend/src/pages/expedientes/ExpedientesListPage.jsx`.
2. Buscá `<h1>` o el texto `Expedientes`.
3. Cambiá el texto visible y guardá.
4. Confirmá que no hayas cambiado etiquetas de filtros o rutas por error.

### 2. «Hacé que “Volver a expedientes” lleve a Clientes.»

1. Abrí `frontend/src/pages/expedientes/ExpedienteDetailPage.jsx`.
2. Buscá el texto `Volver a expedientes` y encontrá el `<Link>` cercano.
3. Cambiá su `to` a `/clientes`.
4. Confirmá en `App.jsx` que la ruta `/clientes` exista y probá el enlace.

### 3. «Mové los botones antes del título en el listado de expedientes.»

1. Abrí `frontend/src/pages/expedientes/ExpedientesListPage.jsx`.
2. Buscá el encabezado que contiene el `<h1>` y el grupo de botones.
3. Mové el bloque JSX completo de botones antes del bloque del título, dentro del mismo contenedor.
4. Probá la pantalla; revisá las clases de `flex` si cambia el espaciado o la alineación.

### 4. «Ocultá temporalmente el botón “Nuevo cliente”.»

1. Abrí `frontend/src/pages/clientes/ClientesListPage.jsx`.
2. Buscá el texto `+ Nuevo cliente`.
3. Agregá `hidden` al `className` del botón, o usá la forma temporal que indique el profesor.
4. No quites la condición `esAbogado &&`: controla quién puede ver la acción.

### 5. «Colocá Calendario antes de Asesorías en el menú.»

1. Abrí `frontend/src/components/layout/Sidebar.jsx`.
2. Buscá `NAV_ITEMS`.
3. Mové el objeto de Calendario antes del objeto de Asesorías.
4. Conservá las propiedades `label`, `to`, `icon` y `disponible`; guardá y revisá el menú.

## 8. Comprobación final

Antes de dar por terminado un cambio:

1. Confirmá que editaste la página o componente correcto.
2. Verificá en el navegador el texto, estilo, orden o destino pedido.
3. Comprobá que botones y enlaces todavía funcionen.
4. Si cambiaste un componente compartido, mirá al menos otra pantalla que también lo use.
5. No cambies permisos, lógica de negocio o llamadas al backend si el pedido era únicamente visual.
