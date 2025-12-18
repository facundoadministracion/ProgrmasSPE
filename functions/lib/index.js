'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteParticipant = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger_1 = require("firebase-functions/logger");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
/**
 * Elimina un participante y todos sus datos asociados (pagos, novedades)
 * de forma atómica.
 */
exports.deleteParticipant = (0, https_1.onCall)({ region: "southamerica-east1" }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "La función solo puede ser utilizada por un usuario autenticado.");
    }
    const userRole = request.auth.token.role;
    if (userRole !== "admin") {
        throw new https_1.HttpsError("permission-denied", "Acción no permitida. Se requiere rol de administrador.");
    }
    const participantId = request.data.participantId;
    if (!participantId || typeof participantId !== "string") {
        throw new https_1.HttpsError("invalid-argument", "El ID del participante es inválido o no fue proporcionado.");
    }
    try {
        const batch = db.batch();
        const paymentsRef = db.collection("pagosRegistrados");
        const novedadesRef = db.collection("novedades");
        const participantRef = db.collection("participants").doc(participantId);
        const paymentsQuery = paymentsRef.where("participantId", "==", participantId);
        const paymentsSnapshot = await paymentsQuery.get();
        paymentsSnapshot.forEach((doc) => {
            batch.delete(doc.ref);
        });
        const novedadesQuery = novedadesRef.where("participantId", "==", participantId);
        const novedadesSnapshot = await novedadesQuery.get();
        novedadesSnapshot.forEach((doc) => {
            batch.delete(doc.ref);
        });
        batch.delete(participantRef);
        await batch.commit();
        (0, logger_1.log)(`Borrado exitoso del participante ${participantId} por el usuario ${request.auth.uid}. Se eliminaron ${paymentsSnapshot.size} pagos y ${novedadesSnapshot.size} novedades.`);
        return {
            status: "success",
            message: `El legajo de ${participantId} y todos sus datos asociados fueron eliminados.`,
        };
    }
    catch (error) {
        (0, logger_1.log)("Error en la transacción de borrado:", error);
        throw new https_1.HttpsError("internal", "Ocurrió un error inesperado al intentar eliminar los datos del participante.");
    }
});
//# sourceMappingURL=index.js.map