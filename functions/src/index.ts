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
import { simpleTestFunction } from './simpleTest'; // <-- Importa la función de prueba

// Exporta las funciones para que Firebase las detecte
export {
  deleteParticipant,
  revertPaymentBatch,
  processPaymentFile,
  simpleTestFunction, // <-- Exporta la función de prueba
};
