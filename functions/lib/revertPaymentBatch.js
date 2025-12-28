'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.revertPaymentBatch = void 0;
const https_1 = require("firebase-functions/v2/https");
const firebase_functions_1 = require("firebase-functions");
const firebaseAdmin_1 = require("./firebaseAdmin"); // Importa la instancia de DB centralizada
const monthMapping = {
    "enero": "1", "febrero": "2", "marzo": "3", "abril": "4", "mayo": "5", "junio": "6",
    "julio": "7", "agosto": "8", "septiembre": "9", "octubre": "10", "noviembre": "11", "diciembre": "12"
};
/**
 * Cloud Function (Callable) para revertir un lote de pagos.
 */
exports.revertPaymentBatch = (0, https_1.onCall)({ region: "southamerica-east1", timeoutSeconds: 540 }, async (request) => {
    firebase_functions_1.logger.log("Iniciando la reversión de lote con los siguientes datos:", request.data);
    const { programa, mes, anio } = request.data;
    // 1. Validación de Entrada
    if (!programa || !mes || !anio) {
        firebase_functions_1.logger.error("Datos de entrada inválidos.", { programa, mes, anio });
        throw new https_1.HttpsError("invalid-argument", "Los parámetros 'programa', 'mes' y 'anio' son requeridos.");
    }
    const monthNumber = monthMapping[mes.toLowerCase()];
    if (!monthNumber) {
        firebase_functions_1.logger.error(`El nombre del mes es inválido: ${mes}`);
        throw new https_1.HttpsError("invalid-argument", `El nombre del mes es inválido: ${mes}`);
    }
    // 2. Lógica Principal
    try {
        const batch = firebaseAdmin_1.db.batch();
        let deletedCount = 0;
        const pagosRef = firebaseAdmin_1.db.collection("pagosRegistrados");
        const querySnapshot = await pagosRef
            .where("programaLiquidado", "==", programa)
            .where("mesLiquidacion", "==", monthNumber)
            .where("anoLiquidacion", "==", anio)
            .get();
        if (querySnapshot.empty) {
            firebase_functions_1.logger.log("No se encontraron pagos para los criterios especificados. Nada que eliminar.");
            return { status: "no-op", message: "No se encontraron pagos que coincidieran con los criterios para eliminar." };
        }
        querySnapshot.forEach(doc => {
            batch.delete(doc.ref);
            deletedCount++;
        });
        await batch.commit();
        firebase_functions_1.logger.log(`Se eliminaron ${deletedCount} documentos de pago exitosamente.`);
        return { status: "success", message: `Se eliminaron ${deletedCount} registros de pago.` };
    }
    catch (error) {
        firebase_functions_1.logger.error("Error al ejecutar la reversión del lote:", error);
        throw new https_1.HttpsError("internal", "Ocurrió un error inesperado durante la eliminación de los pagos.", error);
    }
});
//# sourceMappingURL=revertPaymentBatch.js.map