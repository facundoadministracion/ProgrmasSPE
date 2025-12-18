'use strict';

import {HttpsError, onCall} from "firebase-functions/v2/https";
import {log} from "firebase-functions/logger";
import {initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();

/**
 * Elimina un participante y todos sus datos asociados (pagos, novedades)
 * de forma atómica.
 */
export const deleteParticipant = onCall({region: "southamerica-east1"}, async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "La función solo puede ser utilizada por un usuario autenticado."
      );
    }

    const userRole = request.auth.token.role;
    if (userRole !== "admin") {
      throw new HttpsError(
        "permission-denied",
        "Acción no permitida. Se requiere rol de administrador."
      );
    }

    const participantId = request.data.participantId;
    if (!participantId || typeof participantId !== "string") {
      throw new HttpsError(
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

      log(`Borrado exitoso del participante ${participantId} por el usuario ${request.auth.uid}. Se eliminaron ${paymentsSnapshot.size} pagos y ${novedadesSnapshot.size} novedades.`);

      return {
        status: "success",
        message: `El legajo de ${participantId} y todos sus datos asociados fueron eliminados.`,
      };

    } catch (error) {
      log("Error en la transacción de borrado:", error);
      throw new HttpsError(
        "internal",
        "Ocurrió un error inesperado al intentar eliminar los datos del participante."
      );
    }
  });