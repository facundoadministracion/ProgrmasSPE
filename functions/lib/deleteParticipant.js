'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteParticipant = void 0;
const https_1 = require("firebase-functions/v2/https");
const firebase_functions_1 = require("firebase-functions");
const firebaseAdmin_1 = require("./firebaseAdmin"); // Importa la instancia de DB centralizada
/**
 * Elimina un participante y todos sus datos asociados (pagos, novedades)
 * de forma atómica y segura.
 */
exports.deleteParticipant = (0, https_1.onCall)({ region: "southamerica-east1" }, async (request) => {
    // 1. Verificación de Autenticación y Rol
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "La función solo puede ser utilizada por un usuario autenticado.");
    }
    if (request.auth.token.role !== "admin") {
        throw new https_1.HttpsError("permission-denied", "Acción no permitida. Se requiere rol de administrador.");
    }
    // 2. Validación del ID del Participante
    const participantId = request.data.participantId;
    if (!participantId || typeof participantId !== "string") {
        throw new https_1.HttpsError("invalid-argument", "El ID del participante es inválido o no fue proporcionado.");
    }
    firebase_functions_1.logger.log(`Intento de borrado para el participante ${participantId} por el admin ${request.auth.uid}.`);
    // 3. Lógica de Borrado Atómico
    try {
        const batch = firebaseAdmin_1.db.batch();
        const paymentsRef = firebaseAdmin_1.db.collection("pagosRegistrados");
        const novedadesRef = firebaseAdmin_1.db.collection("novedades");
        const participantRef = firebaseAdmin_1.db.collection("participants").doc(participantId);
        // Borrar pagos
        const paymentsQuery = paymentsRef.where("participantId", "==", participantId);
        const paymentsSnapshot = await paymentsQuery.get();
        paymentsSnapshot.forEach((doc) => batch.delete(doc.ref));
        // Borrar novedades
        const novedadesQuery = novedadesRef.where("participantId", "==", participantId);
        const novedadesSnapshot = await novedadesQuery.get();
        novedadesSnapshot.forEach((doc) => batch.delete(doc.ref));
        // Borrar participante
        batch.delete(participantRef);
        await batch.commit();
        firebase_functions_1.logger.log(`Borrado exitoso: ${participantId}. Se eliminaron ${paymentsSnapshot.size} pagos y ${novedadesSnapshot.size} novedades.`);
        return {
            status: "success",
            message: `El legajo de ${participantId} y todos sus datos asociados fueron eliminados.`,
        };
    }
    catch (error) {
        firebase_functions_1.logger.error(`Fallo en la transacción de borrado para el participante ${participantId}:`, error);
        throw new https_1.HttpsError("internal", "Ocurrió un error inesperado al intentar eliminar los datos del participante.");
    }
});
//# sourceMappingURL=deleteParticipant.js.map