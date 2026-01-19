import * as admin from "firebase-admin";

// Inicializa Firebase Admin SDK
admin.initializeApp();

// Exporta la nueva función de corrección
export { fixOctober2025Payments } from "./fix-october-payments";

// Aquí puedes mantener otras funciones si las tienes
// export * from "./other-functions";
