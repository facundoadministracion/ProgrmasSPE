
'use strict';

import { HttpsError, onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { db } from "./firebaseAdmin";

const monthMapping: { [key: string]: string } = {
  "enero": "1", "febrero": "2", "marzo": "3", "abril": "4", "mayo": "5", "junio": "6",
  "julio": "7", "agosto": "8", "septiembre": "9", "octubre": "10", "noviembre": "11", "diciembre": "12"
};

export const revertPaymentBatch = onCall({ region: "southamerica-east1", timeoutSeconds: 540 }, async (request) => {
  logger.log("Iniciando la reversión de lote con los siguientes datos:", request.data);

  const { programa, mes, anio } = request.data;

  if (!programa || !mes || !anio) {
    logger.error("Datos de entrada inválidos.", { programa, mes, anio });
    throw new HttpsError("invalid-argument", "Los parámetros 'programa', 'mes' y 'anio' son requeridos.");
  }

  const monthNumber = monthMapping[mes.toLowerCase()];
  if (!monthNumber) {
    logger.error(`El nombre del mes es inválido: ${mes}`);
    throw new HttpsError("invalid-argument", `El nombre del mes es inválido: ${mes}`);
  }

  try {
    const firestoreBatch = db.batch();
    let deletedCount = 0;

    // 1. Revertir los pagos individuales en 'pagosRegistrados'
    const pagosRef = db.collection("pagosRegistrados");
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
    const historyRef = db.collection("paymentHistory");
    const historySnapshot = await historyRef
      .where("programa", "==", programa)
      .where("mesLiquidacion", "==", monthNumber)
      .where("anoLiquidacion", "==", String(anio)) // Asegurarse de que el año sea string
      .limit(1) // Solo debería haber uno, pero por seguridad
      .get();

    if (!historySnapshot.empty) {
      const historyDoc = historySnapshot.docs[0];
      firestoreBatch.delete(historyDoc.ref);
      logger.log(`Documento de historial [${historyDoc.id}] añadido al lote para eliminación.`);
    } else {
      logger.warn("No se encontró un documento coincidente en 'paymentHistory' para eliminar.");
    }

    await firestoreBatch.commit();

    logger.log(`Lote de eliminación completado. Se eliminaron ${deletedCount} documentos de pago y la entrada del historial.`);
    return { status: "success", message: `Se eliminaron ${deletedCount} registros de pago y la entrada del historial.` };

  } catch (error) {
    logger.error("Error al ejecutar la reversión del lote:", error);
    throw new HttpsError("internal", "Ocurrió un error inesperado durante la eliminación del lote.", error);
  }
});
