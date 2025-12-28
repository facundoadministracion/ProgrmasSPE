'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.storage = exports.db = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const storage_1 = require("firebase-admin/storage");
/**
 * Inicializa el SDK de Firebase Admin una sola vez, especificando explícitamente
 * el bucket de almacenamiento correcto que hemos creado manualmente.
 */
(0, app_1.initializeApp)({
    storageBucket: 'programas-lr-storage'
});
exports.db = (0, firestore_1.getFirestore)();
exports.storage = (0, storage_1.getStorage)();
//# sourceMappingURL=firebaseAdmin.js.map