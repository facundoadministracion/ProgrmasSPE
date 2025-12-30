import { initializeApp, getApps, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

let app: App;
let firestore: Firestore;

// Este patrón singleton evita que la app se reinicialice en cada recarga en caliente (hot-reload) durante el desarrollo.
if (getApps().length === 0) {
    // initializeApp() sin argumentos descubre las credenciales automáticamente desde el entorno.
    // Funciona en Cloud Functions, App Engine, y también localmente si has iniciado sesión
    // con el comando `gcloud auth application-default login`.
    app = initializeApp();
} else {
    // Usa la app ya inicializada.
    app = getApps()[0];
}

firestore = getFirestore(app);

// El código de la API route que escribí antes espera esta función.
// Proporciona la instancia de Firestore al código del servidor.
const getFirebaseAdmin = () => {
    return { firestore };
};

export { getFirebaseAdmin };
