'use strict';

import { onObjectFinalized, StorageEvent } from "firebase-functions/v2/storage";
import { logger } from "firebase-functions";
const csv = require('csv-parser');
import { storage, firestore } from "./firebaseAdmin"; // <-- MODIFICACIÓN

/**
 * Procesa archivos CSV de pagos subidos a Cloud Storage.
 */
export const processPaymentFile = onObjectFinalized(async (event: StorageEvent) => {
  const { bucket: fileBucket, name: filePath, contentType } = event.data;

  // 1. Validar que sea un archivo CSV en la carpeta correcta
  if (!contentType || !contentType.startsWith('text/csv') || !filePath || !filePath.startsWith('uploads/')) {
    logger.log('El archivo no es un CSV o no está en /uploads. Se ignora.', { filePath, contentType });
    return;
  }

  logger.log(`Iniciando el procesamiento de: ${filePath}`);

  const bucket = storage.bucket(fileBucket);
  const file = bucket.file(filePath);

  // 2. Crear un stream de lectura y procesar el CSV
  return new Promise<void>((resolve, reject) => {
    const results: Record<string, string>[] = [];
    
    file.createReadStream()
      .pipe(csv())
      .on('data', (data: Record<string, string>) => {
        logger.info("Fila de CSV leída:", data);
        results.push(data);
      })
      .on('end', async () => { // <-- MODIFICACIÓN: async
        logger.log(`Procesamiento de ${filePath} completado. ${results.length} filas leídas.`);
        
        // --- INICIO DE LA LÓGICA AÑADIDA ---
        if (results.length === 0) {
          logger.log("El archivo CSV está vacío, no hay nada que guardar.");
          resolve();
          return;
        }

        const batch = firestore.batch();

        results.forEach((row) => {
          // Asumimos que estas son las columnas. Ajusta si es necesario.
          const { participanteId, monto, fechaPago, programa, nroComprobante } = row;
          
          if (!participanteId || !monto || !fechaPago) {
            logger.warn("Fila ignorada por tener datos faltantes:", row);
            return; // Saltar esta fila
          }

          // Referencia al historial de pagos del participante
          const paymentRef = firestore.collection('participants').doc(participanteId).collection('paymentHistory').doc();
          
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
          logger.log(`${results.length} registros de pago guardados en Firestore correctamente.`);
          resolve();
        } catch (error) {
          logger.error("Error al ejecutar el lote de pagos:", error);
          reject(error);
        }
        // --- FIN DE LA LÓGICA AÑADIDA ---
      })
      .on('error', (error: Error) => {
        logger.error(`Error al procesar el archivo ${filePath}:`, error);
        reject(new Error('Fallo el procesamiento del CSV.'));
      });
  });
});
