
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

