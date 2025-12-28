'use strict';

import { onObjectFinalized } from "firebase-functions/v2/storage";
import { logger } from "firebase-functions";
import csv from 'csv-parser';
import { storage } from "./firebaseAdmin"; // Importa la instancia de Storage centralizada

/**
 * Procesa archivos CSV de pagos subidos a Cloud Storage.
 */
export const processPaymentFile = onObjectFinalized({ region: "southamerica-east1", bucket: "programas-lr-storage" }, async (event) => {
  const { bucket: fileBucket, name: filePath, contentType } = event.data;

  // 1. Validar que sea un archivo CSV en la carpeta correcta
  if (!contentType || !contentType.startsWith('text/csv') || !filePath || !filePath.startsWith('uploads/')) {
    logger.log('Archivo no es CSV o no está en /uploads. Se ignora.', { filePath, contentType });
    return;
  }

  logger.log(`Iniciando el procesamiento de: ${filePath}`);

  const bucket = storage.bucket(fileBucket);
  const file = bucket.file(filePath);

  // 2. Crear un stream de lectura y procesar el CSV
  return new Promise((resolve, reject) => {
    const results: any[] = [];
    
    file.createReadStream()
      .pipe(csv())
      .on('data', (data) => {
        logger.info("Fila de CSV leída:", data);
        results.push(data);
      })
      .on('end', () => {
        logger.log(`Procesamiento de ${filePath} completado. ${results.length} filas leídas.`);
        // Aquí se podría añadir la lógica para escribir en Firestore.
        resolve(true);
      })
      .on('error', (error) => {
        logger.error(`Error al procesar el archivo ${filePath}:`, error);
        reject(new Error('Fallo el procesamiento del CSV.'));
      });
  });
});
