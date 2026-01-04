'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.simpleTestFunction = void 0;
const storage_1 = require("firebase-functions/v2/storage");
const firebase_functions_1 = require("firebase-functions");
/**
 * Una función de prueba simple que se activa al subir cualquier archivo.
 * Su único propósito es registrar que se ha subido un archivo.
 */
exports.simpleTestFunction = (0, storage_1.onObjectFinalized)({ region: "southamerica-east1", bucket: "gestion-de-programas-lr.appspot.com" }, async (event) => {
    const { name: filePath } = event.data;
    firebase_functions_1.logger.info(`[PRUEBA AISLADA] ¡Archivo detectado con éxito!: ${filePath}`);
    return;
});
//# sourceMappingURL=simpleTest.js.map