
# Descripción General del Proyecto: Gestión de Programas LR

Este documento proporciona una visión completa de la arquitectura, configuración y procesos clave de la aplicación "Gestión de Programas LR". Sirve como punto de referencia centralizado para el desarrollo y el despliegue.

---

## 1. Arquitectura y Tecnologías

- **Frontend:** Aplicación web construida con **Next.js** y **React**.
- **Backend:** Funciones serverless de **Firebase Functions** (Node.js con TypeScript).
- **Base de Datos:** **Cloud Firestore** para el almacenamiento de datos principal.
- **Autenticación:** **Firebase Authentication** para la gestión de usuarios.
- **Almacenamiento de Archivos:** **Cloud Storage for Firebase** para la subida de archivos (ej. CSV de pagos).
- **Hosting:** **Firebase Hosting** para servir la aplicación Next.js y las funciones.
- **UI Framework:** **shadcn/ui** sobre **Tailwind CSS** para los componentes de la interfaz.

---

## 2. Estructura de Archivos Clave

- `src/app/`: Contiene la aplicación principal de Next.js (páginas y componentes de React).
- `functions/src/`: Contiene el código fuente de las Cloud Functions personalizadas (archivos `.ts`).
- `functions/lib/`: **Directorio de salida de compilación.** Contiene el código JavaScript (`.js`) que se despliega realmente en Firebase. **Se genera a partir de `functions/src`**.
- `firebase.json`: Archivo de configuración principal de Firebase. Define el hosting, las funciones, las reglas de Firestore/Storage y la integración con el framework de Next.js.
- `firestore.rules`: Reglas de seguridad para la base de datos Firestore.
- `storage.rules`: Reglas de seguridad para Cloud Storage.
- `scripts/`: Contiene scripts de mantenimiento y corrección de datos. **No forman parte de la aplicación desplegada.**

---

## 3. Configuración de Firebase (`firebase.json`)

- **Región Principal:** La región para todos los servicios de Firebase es **`southamerica-east1`**. Es crucial que todos los componentes (funciones, storage, etc.) se desplieguen en esta misma región para evitar conflictos.
- **Hosting:**
  - El `source` está configurado en `.` para indicar que se usa un framework web (Next.js).
  - `frameworksBackend`: **Esta es una configuración CRÍTICA.** Se ha añadido para forzar a que la función autogenerada por Next.js se despliegue en la región correcta (`southamerica-east1`).
- **Functions:**
  - El `source` es `functions`, apuntando al directorio de las Cloud Functions.
  - El `runtime` es `nodejs20`.
  - La `region` está definida globalmente como `southamerica-east1`, pero **es una buena práctica especificarla también dentro de cada función en el código para mayor claridad**.

---

## 4. Cloud Functions

Las funciones están escritas en TypeScript (`.ts`) en `functions/src`.

- `processPaymentFile`: Se activa con la subida de archivos a Cloud Storage (`onObjectFinalized`). Procesa archivos CSV de pagos.
- `deleteParticipant`: Función `onCall` (invocable desde el cliente) para eliminar participantes y sus datos asociados.
- `revertPaymentBatch`: Función `onCall` para revertir un lote de pagos.
- `simpleTest`: Función de ejemplo.

**Importante:** Todas las funciones que interactúan con recursos de Firebase (como el bucket de Storage) deben tener su región explícitamente definida para coincidir con la del recurso (`southamerica-east1`).

---

## 5. Proceso de Despliegue (¡MUY IMPORTANTE!)

Este es el flujo de trabajo correcto para desplegar la aplicación. Omitir el segundo paso fue la causa de errores de despliegue recurrentes.

1.  **Realizar Cambios:** Modificar el código fuente en `src/` (frontend) o en `functions/src/` (backend).

2.  **Compilar las Funciones:** **Si se ha realizado cualquier cambio en la carpeta `functions/src/`, es OBLIGATORIO ejecutar este comando** desde la carpeta `functions`:
    ```bash
    cd functions
    npm run build
    cd ..
    ```
    Esto compila los archivos TypeScript (`.ts`) a JavaScript (`.js`) y los coloca en `functions/lib/`, que es lo que Firebase realmente despliega.

3.  **Desplegar en Firebase:** Ejecutar el comando de despliegue desde la raíz del proyecto:
    ```bash
    firebase deploy
    ```

Este archivo servirá como nuestra guía para futuras interacciones. ¡Excelente iniciativa!

---

## 6. Nuevas Funcionalidades y Tareas Pendientes

### Filtros Avanzados y Exportación en el Dashboard

*   **Objetivo:** Mejorar la usabilidad de las tarjetas del dashboard, específicamente la de "Requiere Continuidad".
*   **Funcionalidad:**
    1.  Al hacer clic en la tarjeta "Requiere Continuidad", se mostrará una vista detallada.
    2.  Dentro de esta vista, agregar cuadros resumen que agrupen a los participantes por programa y número de pagos (e.g., "Empleo Joven - 6 pagos", "Tecnoempleo - 12 pagos").
    3.  Implementar una función para exportar estas listas filtradas a un formato como CSV.

---

## 7. Gestión de Legajos de Participantes

Esta sección documenta la ubicación y el propósito de los componentes clave relacionados con la visualización y gestión de los perfiles de los participantes (legajos).

*   **Orquestador Principal:** `src/app/MainAppClient.tsx`
    *   **Función:** Este es el componente de nivel superior que gestiona el estado principal de la aplicación después del inicio de sesión. Controla qué vista se muestra en cada momento (Dashboard, Lista de Participantes, Perfil de Participante, etc.).
    *   **Lógica Clave:** Contiene el estado `selectedParticipant`, que determina si se debe mostrar la lista de participantes o el detalle de uno solo. Es el responsable de renderizar `ParticipantDetail` cuando se selecciona un participante.

*   **Vista de Detalle del Legajo:** `src/components/app/ParticipantDetail.tsx`
    *   **Función:** Este componente renderiza toda la información de un único participante, incluyendo sus datos personales, historial de pagos, historial de novedades y las acciones que se pueden realizar sobre él.
    *   **Acciones Implementadas:** Aquí se encuentra la lógica para editar el legajo, dar de baja, reactivar, realizar traspasos de programa y registrar la continuidad (a través del formulario de edición).

*   **Vista de Continuidad:** `src/components/app/ContinuityView.tsx`
    *   **Función:** Una vista especializada que muestra únicamente a los participantes que requieren una acción de continuidad (generalmente con 6 o 12 pagos). Facilita el acceso rápido a sus legajos.
    *   **Flujo:** Desde esta vista, al hacer clic en "Gestionar", se invoca la función que actualiza el estado `selectedParticipant` en `MainAppClient.tsx`, lo que a su vez provoca que se muestre el componente `ParticipantDetail` para ese participante.
