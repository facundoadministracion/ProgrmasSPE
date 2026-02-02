
# Descripción General del Proyecto: Gestión de Programas LR

Este documento proporciona una visión completa de la arquitectura, configuración y procesos clave de la aplicación "Gestión de Programas LR". Sirve como punto de referencia centralizado para el desarrollo y el despliegue.

---

## 1. Arquitectura y Tecnologías

- **Frontend:** Aplicación web construida con **Next.js** y **React**.
- **Backend:** **Rutas de API de Next.js** para la lógica de negocio y **Cloud Functions** para tareas asíncronas o de mantenimiento.
- **Base de Datos:** **Cloud Firestore** para el almacenamiento de datos principal.
- **Autenticación:** **Firebase Authentication** para la gestión de usuarios.
- **Hosting:** **Firebase Hosting** para servir la aplicación Next.js y las funciones.
- **UI Framework:** **shadcn/ui** sobre **Tailwind CSS** para los componentes de la interfaz.

---

## 2. Estructura de Archivos Clave

- `src/app/`: Contiene la aplicación principal de Next.js (páginas, componentes y Rutas de API).
- `src/app/api/`: Específicamente, aquí residen los endpoints del backend construidos con Next.js.
- `functions/src/`: Contiene el código fuente de las Cloud Functions complementarias.
- `firebase.json`: Archivo de configuración principal de Firebase.
- `firestore.rules`: Reglas de seguridad para la base de datos Firestore.
- `storage.rules`: Reglas de seguridad para Cloud Storage.

---

## 3. Lógica de Backend Principal

### 3.1. Importación de Pagos (`/api/importar-pagos`)

Este es el proceso central para registrar pagos masivos en el sistema.

- **Endpoint:** `POST /api/importar-pagos`
- **Componente:** `src/app/api/importar-pagos/route.ts`
- **Activador:** Es una Ruta de API de Next.js que se invoca directamente desde la interfaz de usuario (`src/app/admin/importar-pagos/page.tsx`).
- **Flujo:**
    1. El administrador sube un archivo CSV a través del formulario en la página de importación.
    2. La interfaz envía este archivo mediante una petición `POST` al endpoint.
    3. El backend valida el archivo, las columnas (`dni`, `programa`, `mes`, `anio`, `monto`), y la consistencia de los datos.
    4. Realiza una transacción compleja en Firestore para:
        - Validar que todos los DNI de participantes existan en la base de datos.
        - Prevenir la duplicación de lotes de pago para el mismo período.
        - Registrar cada nuevo pago en la colección `pagosRegistrados`.
        - **Incrementar atómicamente el contador `pagosPorPrograma` en 1** para cada participante incluido en el archivo.
        - Actualizar el estado a "Requiere Atención" para los participantes que no están en el nuevo archivo (Bajas).

### 3.2. Otras Funciones y Endpoints

- **Cloud Functions (`functions/src`):**
    - `deleteParticipant`: Función `onCall` para eliminar participantes.
    - `revertPaymentBatch`: Función `onCall` para revertir un lote de pagos.
- **Endpoints de API de Next.js (`src/app/api`):**
    - `create-user`, `delete-user`, `update-user-role`: Gestión de usuarios.
    - `find-participant`, `correct-participant`: Búsqueda y corrección de datos de participantes.
    - `cleanup-by-program`: Tareas de limpieza de datos.

---

## 4. Proceso de Despliegue (¡MUY IMPORTANTE!)

El despliegue combina la aplicación Next.js y las Cloud Functions.

1.  **Realizar Cambios:** Modificar el código fuente en `src/` (frontend/API Routes) o en `functions/src/` (Cloud Functions).

2.  **Compilar las Funciones (Si es necesario):** **Si se ha realizado cualquier cambio en la carpeta `functions/src/`, es OBLIGATORIO compilar las funciones** desde su carpeta:
    ```bash
    cd functions
    npm run build
    cd ..
    ```
    Esto no es necesario si solo se han modificado archivos dentro de `src/app`.

3.  **Desplegar en Firebase:** Ejecutar el comando de despliegue desde la raíz del proyecto:
    ```bash
    firebase deploy
    ```

---

## 5. Arquitectura de Navegación (Sistema de Pestañas)

La aplicación utiliza un sistema de navegación interno basado en el estado de React.

- **Componente Central:** `src/app/MainAppClient.tsx`
- **Mecanismo:** Un estado `activeTab` controla qué vista se muestra. Los botones del menú lateral actualizan este estado con `setActiveTab`, y una función `renderMainContent` renderiza el componente correspondiente a la pestaña activa sin cambiar la URL del navegador.

---

## 6. Gestión de Legajos de Participantes

- **Orquestador:** `src/app/MainAppClient.tsx` (gestiona el estado `selectedParticipant`).
- **Vista de Detalle:** `src/components/app/ParticipantDetail.tsx` (muestra el perfil completo del participante).
- **Vista de Continuidad:** `src/components/app/ContinuityView.tsx` (lista filtrada de participantes que requieren acción).

---

## 7. Módulo de Informes

Este módulo está diseñado para ofrecer una visión analítica y agregada de los datos de los participantes, permitiendo a los administradores generar reportes y tomar decisiones informadas.

### 7.1. Informe de Distribución Geográfica

Es el primer reporte implementado en el módulo. Su objetivo es visualizar la distribución de los participantes y los recursos a través de los diferentes departamentos.

##### Características Clave:

-   **Tabla Agregada**: Muestra un resumen por departamento con el número total de participantes y el monto total desembolsado.
-   **Filtros Combinables**: Permite un análisis granular gracias a un panel de filtros intuitivo por Departamento, Programa, Mes y Año.
-   **Detalle de Participantes**: Un botón "Ver Detalle de Participantes" despliega una tabla con la lista completa de las personas que coinciden con los filtros aplicados.
-   **Exportación a CSV**: La vista de detalle incluye un botón para exportar la lista filtrada de participantes a un archivo CSV.

#### 7.1.1. Reporte Imprimible

Para facilitar la exportación y el archivado, se ha implementado una funcionalidad de impresión que se abre en una nueva pestaña del navegador.

-   **Activación**: Un botón "Imprimir" se activa una vez que se han generado datos.
-   **Nueva Ruta**: Al hacer clic, se abre la ruta `/print-report` en una nueva pestaña, pasando los datos a través de `sessionStorage` para aislar el entorno de impresión y garantizar la estabilidad.
-   **Normalización de Datos**: Se implementó una lógica de normalización de texto para corregir bugs históricos en el conteo de programas y departamentos, asegurando que las comparaciones no sean sensibles a tildes o mayúsculas/minúsculas.
-   **Lógica de Encabezado Robusta**: Para solucionar un bug persistente donde el título del informe impreso no se actualizaba con los filtros seleccionados (estado obsoleto), la lógica fue refactorizada. Ahora, el componente principal (`GeographicReport.tsx`) no pre-calcula ningún título. En su lugar, pasa el objeto de filtros crudo (`mes`, `año`, `programa`, `departamento`) al componente de impresión (`/print-report`). Este último se convierte en la **única fuente de verdad** y construye dinámicamente el encabezado del informe a partir de los filtros recibidos, garantizando que la información mostrada sea siempre precisa.

---

## 8. Lógica Central y Flujo de Datos: Participantes y Pagos

El núcleo de la aplicación gira en torno a dos colecciones fundamentales en Firestore: `participants` y `pagosRegistrados`. Entender su relación es clave para comprender cómo el sistema genera informes y rastrea la continuidad.

### 8.1. Colección `participants`

-   Funciona como el **registro maestro** de cada individuo en el sistema.
-   Cada documento representa a una persona única y contiene sus **datos demográficos**: nombre completo, DNI, departamento, datos de contacto, etc.
-   También almacena **información de estado**, como los programas en los que está inscrito y contadores como `pagosPorPrograma`, cruciales para el seguimiento.

### 8.2. Colección `pagosRegistrados`

-   Actúa como un **registro transaccional** de cada pago individual realizado.
-   Cada documento representa un pago a un participante para un período específico (`mes` y `año`).
-   Almacena el `dni` del participante, el `programa` por el cual se realizó el pago y el `montoPagado`.
-   En su funcionamiento normal, esta colección es de **solo adición**, lo que significa que se agregan nuevos documentos pero no se modifican, creando un historial inmutable de todas las transacciones financieras.

### 8.3. El Corazón del Sistema: Cómo se Generan los Informes

La verdadera potencia de la aplicación proviene de la combinación de estas dos colecciones, especialmente en el "Informe de Distribución Geográfica":

1.  **Consulta por Período**: El proceso se inicia cuando el administrador selecciona un mes y un año. El sistema consulta la colección `pagosRegistrados` para encontrar todos los documentos de pago que coincidan con ese período. **(¡Atención! Ver Sección 9.2 para una regla crítica sobre los tipos de dato en esta consulta).**

2.  **Extracción de Identificadores**: De los pagos resultantes, el sistema recopila una lista única de números de DNI de los participantes.

3.  **Enriquecimiento con Datos del Participante**: A continuación, la aplicación consulta la colección `participants` para recuperar los perfiles completos de todos los DNI recopilados en el paso anterior. Esto se realiza de manera eficiente en lotes para no afectar el rendimiento.

4.  **Fusión y Creación del Conjunto de Datos Final**: El sistema fusiona los datos del pago (como `montoPagado` y el `programa` específico de ese pago) con los datos maestros del participante (como `nombre` y `departamento`).

5.  **Renderizado de Informes**: Este conjunto de datos fusionado y en memoria se utiliza para generar todas las vistas:
    -   **Informe Agregado**: Los datos se agrupan por departamento para calcular el número total de participantes y el monto total pagado.
    -   **Informe Detallado**: La lista completa y detallada está disponible para ser visualizada y **exportada a CSV**, proporcionando una visión granular de cada individuo incluido en el informe.

Esta arquitectura separa eficazmente el **"quién"** (`participants`) del **"qué y cuándo"** (`pagosRegistrados`), permitiendo una reportería flexible y potente mientras se mantiene una estructura de datos clara y auditable.

---

## 9. Convenciones y Nomenclaturas de Datos

Esta sección define las nomenclaturas estándar para valores de datos clave en toda la aplicación, asegurando consistencia y previniendo errores de normalización.

### 9.1. Nombres de Departamentos

Para evitar problemas con caracteres especiales y garantizar comparaciones de texto fiables, los nombres de los departamentos se almacenan y utilizan **sin acentos**. La lista oficial de nombres de departamentos es la siguiente, y se encuentra definida en `src/lib/constants.ts`:

- "Angel Vicente Peñaloza"
- "Arauco"
- "Capital"
- "Castro Barros"
- "Chamical"
- "Chilecito"
- "Facundo Quiroga"
- "Famatina"
- "Felipe Varela"
- "General Belgrano"
- "General Lamadrid"
- "General Ocampo"
- "General San Martin"
- "Independencia"
- "Rosario Vera Peñaloza"
- "San Blas de los Sauces"
- "Sanagasta"
- "Vinchina"

### 9.2. Campos de Período en `pagosRegistrados` (¡REGLA CRÍTICA!)

- **`mes`**: Almacenado como `string`. Ejemplo: "5", "11".
- **`año`**: Almacenado como `string`. Ejemplo: "2023", "2024".
- **Regla Fundamental**: Cualquier consulta a la colección `pagosRegistrados` que filtre por estos campos **DEBE** utilizar valores de tipo `string`. No se debe realizar ninguna conversión a `Number` antes de la consulta (ej: `where('mes', '==', Number(valor))`), ya que esto resultará en un **fallo silencioso** donde la consulta no devuelve datos ni errores, haciendo que los informes aparezcan vacíos.
