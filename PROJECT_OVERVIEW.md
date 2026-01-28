
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

-   **Tabla Agregada**: Muestra un resumen por departamento con el número total de participantes y el monto total desembolsado, calculado a partir de los pagos acumulados y el monto vigente del programa.
-   **Filtros Combinables**: Permite un análisis granular gracias a un panel de filtros intuitivo. Se puede filtrar por:
    -   **Departamento**: Un menú desplegable que utiliza la lista oficial y centralizada de departamentos de la aplicación, ordenada alfabéticamente para facilitar su uso.
    -   **Programa**: Para aislar los datos de un programa específico.
    -   **Mes y Año**: Basado en la fecha del último pago registrado.
    -   Un botón **"Limpiar"** permite resetear todos los filtros a su estado inicial.
-   **Detalle de Participantes**: Debajo del informe principal, un botón "Ver Detalle de Participantes" despliega una tabla con la lista completa de las personas que coinciden con los filtros aplicados. Esta tabla incluye el nombre, DNI, programa y un botón de acción para **"Gestionar Legajo"**, que lleva directamente al perfil del participante.

#### 7.1.1. Reporte Imprimible

Para facilitar la exportación y el archivado de la información, se ha implementado una funcionalidad de impresión profesional.

-   **Activación**: Un botón "Imprimir" (con un icono de impresora) se activa en la interfaz principal del informe una vez que se han generado datos.
-   **Vista Previa**: Al hacer clic, se abre una vista previa modal que aísla el contenido del reporte, optimizándolo para su impresión. Esta vista está gestionada por el componente `src/components/app/PrintableReport.tsx`.
-   **Título Dinámico**: El título del reporte en la vista previa se ajusta automáticamente según los filtros aplicados (ej: "Informe de Distribución Geográfica de los Programas de Empleo en Capital").
-   **Tabla Dinámica**: La estructura de la tabla se adapta de forma inteligente:
    -   **Si se seleccionan "Todos" los programas**: La tabla discrimina la cantidad de participantes por cada programa principal (`Tutorías`, `Empleo Joven`, `Tecnoempleo`), mostrando estas como columnas individuales, además de una columna `TOTAL` y el porcentaje de participación.
    -   **Si se filtra un programa específico**: La tabla se simplifica, mostrando solo las columnas `Departamento`, `Total Participantes` y `% Part.`.
-   **Estilo Profesional**: La vista de impresión está diseñada para ser limpia, omitiendo botones de navegación y otros elementos de la UI que no son relevantes para un reporte en papel.
-   **Resolución de Conflictos (Git)**: Durante su desarrollo, se resolvió un conflicto complejo con Git donde un nuevo archivo (`Reports.tsx`) no era detectado por el sistema de `build`, causando fallos en el despliegue (`Module not found`). La solución implicó forzar un `reset` del `staging area` de Git para resincronizar el estado del repositorio.

---
