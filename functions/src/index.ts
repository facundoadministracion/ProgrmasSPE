'use strict';

/**
 * Este archivo es el punto de entrada principal para todas las Cloud Functions.
 * Su única responsabilidad es importar las funciones desde sus respectivos
 * archivos y exportarlas para que Firebase pueda desplegarlas.
 *
 * La inicialización del SDK de Admin se realiza en './firebaseAdmin.ts'
 * y cada función importa los servicios que necesita desde allí.
 */

// Importa las funciones individuales
import { deleteParticipant } from './deleteParticipant';
import { revertPaymentBatch } from './revertPaymentBatch';
import { processPaymentFile } from './processPaymentFile';
import { backfillPaymentHistory } from './backfillPaymentHistory'; // <- Importa la nueva función

// Exporta las funciones para que Firebase las detecte
export {
  deleteParticipant,
  revertPaymentBatch,
  processPaymentFile,
  backfillPaymentHistory, // <- Exporta la nueva función
};
