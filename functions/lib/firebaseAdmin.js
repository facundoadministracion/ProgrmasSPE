'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.storage = exports.db = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const storage_1 = require("firebase-admin/storage");
// Comprueba si la app de Admin ya está inicializada para evitar errores.
if ((0, app_1.getApps)().length === 0) {
    // Apunta al bucket de almacenamiento correcto y autogenerado por Firebase.
    (0, app_1.initializeApp)({
        storageBucket: 'gestion-de-programas-lr.firebasestorage.app'
    });
}
// Exporta los servicios de Firestore y Storage ya inicializados.
exports.db = (0, firestore_1.getFirestore)();
exports.storage = (0, storage_1.getStorage)();
//# sourceMappingURL=firebaseAdmin.js.map