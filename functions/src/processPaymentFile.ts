'use strict';

import { onObjectFinalized, StorageEvent } from "firebase-functions/v2/storage";
import { logger } from "firebase-functions";
const csv = require('csv-parser');
import { storage } from "./firebaseAdmin";

/**
 * Procesa archivos CSV de pagos subidos a Cloud Storage.
 */
export const processPaymentFile = onObjectFinalized({ region: "southamerica-east1", bucket: "gestion-de-programas-lr.firebasestorage.app" }, async (event: StorageEvent) => {
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
      .on('end', () => {
        logger.log(`Procesamiento de ${filePath} completado. ${results.length} filas leídas.`);
        // Aquí iría la lógica para guardar los `results` en Firestore.
        resolve();
      })
      .on('error', (error: Error) => {
        logger.error(`Error al procesar el archivo ${filePath}:`, error);
        reject(new Error('Fallo el procesamiento del CSV.'));
      });
  });
});
