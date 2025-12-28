'use strict';

import { HttpsError, onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { db } from "./firebaseAdmin"; // Importa la instancia de DB centralizada

/**
 * Elimina un participante y todos sus datos asociados (pagos, novedades)
 * de forma atómica y segura.
 */
export const deleteParticipant = onCall({ region: "southamerica-east1" }, async (request) => {
  // 1. Verificación de Autenticación y Rol
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "La función solo puede ser utilizada por un usuario autenticado.");
  }
  if (request.auth.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Acción no permitida. Se requiere rol de administrador.");
  }

  // 2. Validación del ID del Participante
  const participantId = request.data.participantId;
  if (!participantId || typeof participantId !== "string") {
    throw new HttpsError("invalid-argument", "El ID del participante es inválido o no fue proporcionado.");
  }

  logger.log(`Intento de borrado para el participante ${participantId} por el admin ${request.auth.uid}.`);

  // 3. Lógica de Borrado Atómico
  try {
    const batch = db.batch();

    const paymentsRef = db.collection("pagosRegistrados");
    const novedadesRef = db.collection("novedades");
    const participantRef = db.collection("participants").doc(participantId);

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

    logger.log(`Borrado exitoso: ${participantId}. Se eliminaron ${paymentsSnapshot.size} pagos y ${novedadesSnapshot.size} novedades.`);

    return {
      status: "success",
      message: `El legajo de ${participantId} y todos sus datos asociados fueron eliminados.`,
    };

  } catch (error) {
    logger.error(`Fallo en la transacción de borrado para el participante ${participantId}:`, error);
    throw new HttpsError("internal", "Ocurrió un error inesperado al intentar eliminar los datos del participante.");
  }
});
