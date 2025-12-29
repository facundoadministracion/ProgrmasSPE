'use strict';

import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { Timestamp } from "firebase-admin/firestore"; // Importar Timestamp explícitamente
import { db } from "./firebaseAdmin"; // <- ¡Importante! Usar la instancia centralizada de la BD
import { REGION } from "./constants";

/**
 * Reconstruye el historial de liquidaciones (paymentHistory) a partir de los
 * sub-documentos de pagos existentes en los legajos.
 * Es una función que se llama manualmente y requiere autenticación.
 */
export const backfillPaymentHistory = onCall({ region: REGION }, async (request: CallableRequest) => {

    // 1. Validar autenticación
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "El usuario debe estar autenticado para ejecutar esta operación."
      );
    }

    try {
      // 2. Obtener todos los documentos de la subcolección "payments"
      const paymentsSnapshot = await db.collectionGroup("payments").get();

      if (paymentsSnapshot.empty) {
        return { message: "No se encontraron pagos individuales en los legajos para procesar." };
      }

      // 3. Agrupar los pagos por lote (programa, mes, año)
      const groupedPayments: {
        [key: string]: { 
            count: number, 
            programa: string, 
            mes: string, 
            ano: string, 
            fechaCarga: Timestamp // Usar el tipo Timestamp importado
        }
      } = {};

      paymentsSnapshot.forEach(doc => {
        const paymentData = doc.data();
        const { fechaCarga, programa, mesLiquidacion, anoLiquidacion } = paymentData;

        // Validar que los campos necesarios existan
        if (fechaCarga && programa && mesLiquidacion && anoLiquidacion) {
          const key = `${programa}-${mesLiquidacion}-${anoLiquidacion}`;

          if (!groupedPayments[key]) {
            groupedPayments[key] = {
              count: 0,
              programa: programa,
              mes: mesLiquidacion,
              ano: anoLiquidacion,
              fechaCarga: fechaCarga as Timestamp, // Asegurar el tipo
            };
          }
          groupedPayments[key].count += 1;
        }
      });

      // 4. Crear los nuevos documentos de historial en un batch
      const batch = db.batch();
      const historyCollectionRef = db.collection("paymentHistory");

      for (const key in groupedPayments) {
          const group = groupedPayments[key];
          const newHistoryRef = historyCollectionRef.doc(); // Firestore genera el ID

          batch.set(newHistoryRef, {
              id: newHistoryRef.id, // Guardar el ID generado
              programa: group.programa,
              mesLiquidacion: group.mes,
              anoLiquidacion: group.ano,
              cantidadPagos: group.count,
              fechaCarga: group.fechaCarga,
          });
      }

      await batch.commit();

      const numCreated = Object.keys(groupedPayments).length;
      console.log(`Se crearon ${numCreated} registros de historial.`);
      return { message: `¡Éxito! Se han reconstruido ${numCreated} registros en el historial de liquidaciones.` };

    } catch (error: any) {
      console.error("Error en backfillPaymentHistory:", error);
      throw new HttpsError("internal", "Ocurrió un error inesperado al reconstruir el historial.", error.message);
    }
  });
