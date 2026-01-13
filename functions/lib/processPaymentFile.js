'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.processPaymentFile = void 0;
const storage_1 = require("firebase-functions/v2/storage");
const firebase_functions_1 = require("firebase-functions");
const csv = require('csv-parser');
const firebaseAdmin_1 = require("./firebaseAdmin"); // <-- MODIFICACIÓN
/**
 * Procesa archivos CSV de pagos subidos a Cloud Storage.
 */
exports.processPaymentFile = (0, storage_1.onObjectFinalized)(async (event) => {    const { bucket: fileBucket, name: filePath, contentType } = event.data;
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
            .on('end', async () => {
            firebase_functions_1.logger.log(`Procesamiento de ${filePath} completado. ${results.length} filas leídas.`);
            // --- INICIO DE LA LÓGICA AÑADIDA ---
            if (results.length === 0) {
                firebase_functions_1.logger.log("El archivo CSV está vacío, no hay nada que guardar.");
                resolve();
                return;
            }
            const batch = firebaseAdmin_1.firestore.batch();
            results.forEach((row) => {
                // Asumimos que estas son las columnas. Ajusta si es necesario.
                const { participanteId, monto, fechaPago, programa, nroComprobante } = row;
                if (!participanteId || !monto || !fechaPago) {
                    firebase_functions_1.logger.warn("Fila ignorada por tener datos faltantes:", row);
                    return; // Saltar esta fila
                }
                // Referencia al historial de pagos del participante
                const paymentRef = firebaseAdmin_1.firestore.collection('participants').doc(participanteId).collection('paymentHistory').doc();
                batch.set(paymentRef, {
                    amount: parseFloat(monto), // Convertir a número
                    paymentDate: new Date(fechaPago), // Convertir a fecha
                    program: programa || null,
                    receiptNumber: nroComprobante || null,
                    uploadTimestamp: new Date() // Añadir marca de tiempo de la subida
                });
            });
            try {
                await batch.commit();
                firebase_functions_1.logger.log(`${results.length} registros de pago guardados en Firestore correctamente.`);
                resolve();
            }
            catch (error) {
                firebase_functions_1.logger.error("Error al ejecutar el lote de pagos:", error);
                reject(error);
            }
            // --- FIN DE LA LÓGICA AÑADIDA ---
        })
            .on('error', (error) => {
            firebase_functions_1.logger.error(`Error al procesar el archivo ${filePath}:`, error);
            reject(new Error('Fallo el procesamiento del CSV.'));
        });
    });
});
//# sourceMappingURL=processPaymentFile.js.map