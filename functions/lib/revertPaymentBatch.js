'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.revertPaymentBatch = void 0;
const https_1 = require("firebase-functions/v2/https");
const firebase_functions_1 = require("firebase-functions");
const firebaseAdmin_1 = require("./firebaseAdmin");
const monthMapping = {
    "enero": "1", "febrero": "2", "marzo": "3", "abril": "4", "mayo": "5", "junio": "6",
    "julio": "7", "agosto": "8", "septiembre": "9", "octubre": "10", "noviembre": "11", "diciembre": "12"
};
exports.revertPaymentBatch = (0, https_1.onCall)({ timeoutSeconds: 540 }, async (request) => {    firebase_functions_1.logger.log("Iniciando la reversión de lote con los siguientes datos:", request.data);
    const { programa, mes, anio } = request.data;
    if (!programa || !mes || !anio) {
        firebase_functions_1.logger.error("Datos de entrada inválidos.", { programa, mes, anio });
        throw new https_1.HttpsError("invalid-argument", "Los parámetros 'programa', 'mes' y 'anio' son requeridos.");
    }
    const monthNumber = monthMapping[mes.toLowerCase()];
    if (!monthNumber) {
        firebase_functions_1.logger.error(`El nombre del mes es inválido: ${mes}`);
        throw new https_1.HttpsError("invalid-argument", `El nombre del mes es inválido: ${mes}`);
    }
    try {
        const firestoreBatch = firebaseAdmin_1.db.batch();
        let deletedCount = 0;
        // 1. Revertir los pagos individuales en 'pagosRegistrados'
        const pagosRef = firebaseAdmin_1.db.collection("pagosRegistrados");
        const pagosSnapshot = await pagosRef
            .where("programaLiquidado", "==", programa)
            .where("mesLiquidacion", "==", monthNumber)
            .where("anoLiquidacion", "==", String(anio)) // Asegurarse de que el año sea string
            .get();
        if (!pagosSnapshot.empty) {
            pagosSnapshot.forEach(doc => {
                firestoreBatch.delete(doc.ref);
                deletedCount++;
            });
        }
        // 2. Eliminar la entrada de resumen en 'paymentHistory'
        const historyRef = firebaseAdmin_1.db.collection("paymentHistory");
        const historySnapshot = await historyRef
            .where("programa", "==", programa)
            .where("mesLiquidacion", "==", monthNumber)
            .where("anoLiquidacion", "==", String(anio)) // Asegurarse de que el año sea string
            .limit(1) // Solo debería haber uno, pero por seguridad
            .get();
        if (!historySnapshot.empty) {
            const historyDoc = historySnapshot.docs[0];
            firestoreBatch.delete(historyDoc.ref);
            firebase_functions_1.logger.log(`Documento de historial [${historyDoc.id}] añadido al lote para eliminación.`);
        }
        else {
            firebase_functions_1.logger.warn("No se encontró un documento coincidente en 'paymentHistory' para eliminar.");
        }
        await firestoreBatch.commit();
        firebase_functions_1.logger.log(`Lote de eliminación completado. Se eliminaron ${deletedCount} documentos de pago y la entrada del historial.`);
        return { status: "success", message: `Se eliminaron ${deletedCount} registros de pago y la entrada del historial.` };
    }
    catch (error) {
        firebase_functions_1.logger.error("Error al ejecutar la reversión del lote:", error);
        throw new https_1.HttpsError("internal", "Ocurrió un error inesperado durante la eliminación del lote.", error);
    }
});
//# sourceMappingURL=revertPaymentBatch.js.map