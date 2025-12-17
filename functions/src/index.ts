'use strict';

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Elimina un participante y todos sus datos asociados (pagos, novedades)
 * de forma atómica.
 */
export const deleteParticipant = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "La función solo puede ser utilizada por un usuario autenticado."
      );
    }

    const userRole = context.auth.token.role;
    if (userRole !== "admin") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Acción no permitida. Se requiere rol de administrador."
      );
    }

    const participantId = data.participantId;
    if (!participantId || typeof participantId !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "El ID del participante es inválido o no fue proporcionado."
      );
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

      console.log(`Borrado exitoso del participante ${participantId} por el usuario ${context.auth.uid}. Se eliminaron ${paymentsSnapshot.size} pagos y ${novedadesSnapshot.size} novedades.`);

      return {
        status: "success",
        message: `El legajo de ${participantId} y todos sus datos asociados fueron eliminados.`,
      };

    } catch (error) {
      console.error("Error en la transacción de borrado:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Ocurrió un error inesperado al intentar eliminar los datos del participante."
      );
    }
  });
