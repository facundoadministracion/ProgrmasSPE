'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.processPaymentFile = void 0;
const storage_1 = require("firebase-functions/v2/storage");
const firebase_functions_1 = require("firebase-functions");
const csv = require('csv-parser');
const firebaseAdmin_1 = require("./firebaseAdmin");
/**
 * Procesa archivos CSV de pagos subidos a Cloud Storage.
 */
exports.processPaymentFile = (0, storage_1.onObjectFinalized)({ region: "southamerica-east1", bucket: "gestion-de-programas-lr.firebasestorage.app" }, async (event) => {
    const { bucket: fileBucket, name: filePath, contentType } = event.data;
    // 1. Validar que sea un archivo CSV en la carpeta correcta
    if (!contentType || !contentType.startsWith('text/csv') || !filePath || !filePath.startsWith('uploads/')) {
        firebase_functions_1.logger.log('El archivo no es un CSV o no está en /uploads. Se ignora.', { filePath, contentType });
        return;
    }
    firebase_functions_1.logger.log(`Iniciando el procesamiento de: ${filePath}`);
    const bucket = firebaseAdmin_1.storage.bucket(fileBucket);
    const file = bucket.file(filePath);
    // 2. Crear un stream de lectura y procesar el CSV
    return new Promise((resolve, reject) => {
        const results = [];
        file.createReadStream()
            .pipe(csv())
            .on('data', (data) => {
            firebase_functions_1.logger.info("Fila de CSV leída:", data);
            results.push(data);
        })
            .on('end', () => {
            firebase_functions_1.logger.log(`Procesamiento de ${filePath} completado. ${results.length} filas leídas.`);
            // Aquí iría la lógica para guardar los `results` en Firestore.
            resolve();
        })
            .on('error', (error) => {
            firebase_functions_1.logger.error(`Error al procesar el archivo ${filePath}:`, error);
            reject(new Error('Fallo el procesamiento del CSV.'));
        });
    });
});
//# sourceMappingURL=processPaymentFile.js.map