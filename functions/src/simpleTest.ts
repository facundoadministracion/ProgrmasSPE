'use strict';

import { onObjectFinalized, StorageEvent } from "firebase-functions/v2/storage";
import { logger } from "firebase-functions";

/**
 * Una función de prueba simple que se activa al subir cualquier archivo.
 * Su único propósito es registrar que se ha subido un archivo.
 */
export const simpleTestFunction = onObjectFinalized({ region: "southamerica-east1", bucket: "gestion-de-programas-lr.appspot.com" }, async (event: StorageEvent) => {
  const { name: filePath } = event.data;
  logger.info(`[PRUEBA AISLADA] ¡Archivo detectado con éxito!: ${filePath}`);
  return;
});
